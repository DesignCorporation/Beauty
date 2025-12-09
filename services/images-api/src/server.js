// ⛔⛔⛔ КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ - НЕ ТРОГАТЬ! ⛔⛔⛔
// ЭТОТ СЕРВИС РАБОТАЕТ ИДЕАЛЬНО! ЛЮБЫЕ ИЗМЕНЕНИЯ ЗАПРЕЩЕНЫ!
//
// 🔥 КРИТИЧНО: ПОРЯДОК Express роутов ИМЕЕТ ЗНАЧЕНИЕ!
// - /api/images/bulk ДОЛЖЕН быть ПЕРЕД /api/images/:id
// - Иначе Express думает что "bulk" это ID параметр
// - Это ломает массовое удаление изображений
//
// 🚫 НЕ ТРОГАТЬ:
// - Порядок роутов (строки ~375-427)
// - JSON persistence логику (saveDatabase/loadDatabase)
// - Автосканирование существующих файлов
// - Sharp оптимизацию настройки
//
// 💾 АРХИТЕКТУРА:
// - images_metadata.json: персистентное хранение метаданных
// - Автовосстановление: сканирует uploads/ при старте
// - Автосохранение: после каждой операции
// - Express proxy: Vite admin панель → порт 6026
//
// ✅ ПОЛНОСТЬЮ РАБОТАЕТ:
// - Загрузка с автооптимизацией (-63% токенов)
// - Редактирование названий и alt-text
// - Удаление одиночное и массовое
// - Стабильность при перезапусках
// ⛔⛔⛔ КОНЕЦ ПРЕДУПРЕЖДЕНИЯ ⛔⛔⛔

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const pathPosix = path.posix;
const fs = require('fs').promises;
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 6026;
const PUBLIC_URL_BASE = process.env.IMAGE_PUBLIC_URL_BASE || '/api/images/uploads';

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:6001', // Salon CRM
    'http://localhost:6002', // Admin Panel
    'http://localhost:6003', // Client Portal
    'https://dev-salon.beauty.designcorp.eu',
    'https://dev-admin.beauty.designcorp.eu',
    'https://dev-client.beauty.designcorp.eu',
    'https://salon.beauty.designcorp.eu',
    'https://admin.beauty.designcorp.eu',
    'https://client.beauty.designcorp.eu'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));
app.use(express.json());
app.use(cookieParser()); // Для чтения httpOnly cookies

// Создаем папки для изображений
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const THUMBNAILS_DIR = path.join(UPLOAD_DIR, 'thumbnails');
const OPTIMIZED_DIR = path.join(UPLOAD_DIR, 'optimized');

// Оптимизация изображений по типам
const IMAGE_OPTIMIZATION_PATH = path.join(__dirname, '../config/image-types.json');
let IMAGE_OPTIMIZATION = {
  salon_logo: {
    maxSize: 800,
    quality: 95,
    thumbnail: 150,
    preserveSVG: true,
    storage: {
      baseDir: 'salon',
      optimizedDir: 'salon/optimized',
      thumbnailsDir: 'salon/thumbnails'
    }
  }
};

async function loadImageConfig() {
  try {
    const raw = await fs.readFile(IMAGE_OPTIMIZATION_PATH, 'utf-8');
    IMAGE_OPTIMIZATION = JSON.parse(raw);
    console.log('🧩 Loaded image optimization config');
  } catch (error) {
    console.warn('⚠️ Failed to load image config; using defaults:', error.message);
  }
}

// Лимиты размера файлов по типам
function getSizeLimit(entityType) {
  const config = IMAGE_OPTIMIZATION[entityType] || IMAGE_OPTIMIZATION.misc;
  if (config?.maxFileSize) return config.maxFileSize;
  switch (entityType) {
    case 'staff_avatar':
    case 'salon_logo':
    case 'user_avatar':
      return 5 * 1024 * 1024;
    case 'client_avatar':
      return 3 * 1024 * 1024;
    default:
      return 10 * 1024 * 1024;
  }
}

function toTenantPath(...segments) {
  return pathPosix.join(...segments.filter(Boolean).map((segment) => segment.replace(/\\/g, '/')));
}

function buildPublicUrl(relativePath) {
  const sanitized = relativePath.replace(/\\/g, '/').replace(/^\//, '');
  return `${PUBLIC_URL_BASE}/${sanitized}`.replace(/\/+/g, '/');
}

function getTypeFromQuery(queryType) {
  if (!queryType) return 'salon_logo';
  return String(queryType);
}

function normalizeStoragePaths(storage = {}) {
  const baseDir = storage.baseDir || '';
  const optimizedDir = storage.optimizedDir || toTenantPath(baseDir, 'optimized');
  const thumbnailsDir = storage.thumbnailsDir || toTenantPath(baseDir, 'thumbnails');

  return {
    baseDir,
    optimizedDir,
    thumbnailsDir
  };
}

function getTypeConfig(entityType) {
  const config = IMAGE_OPTIMIZATION[entityType] || IMAGE_OPTIMIZATION.misc || {
    maxSize: 1200,
    quality: 90,
    thumbnail: 300
  };

  return {
    ...config,
    storage: normalizeStoragePaths(config.storage)
  };
}

async function ensureDirectories() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
    await fs.mkdir(OPTIMIZED_DIR, { recursive: true });
    console.log('📁 Upload directories created');
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

// Helper функция для получения tenant-specific пути
function getTenantUploadPath(tenantId, entityType, entityId = null) {
  const typeConfig = getTypeConfig(entityType);
  const storage = typeConfig.storage || { baseDir: '', optimizedDir: '', thumbnailsDir: '' };

  const baseSegments = [UPLOAD_DIR, tenantId];
  if (storage.baseDir) {
    baseSegments.push(...storage.baseDir.split('/'));
  }

  if (entityId && ['staff_avatar', 'client_avatar', 'user_avatar'].includes(entityType)) {
    baseSegments.push(entityId);
  }

  return path.join(...baseSegments);
}

// Helper для создания tenant-specific директорий
async function ensureTenantDirectories(tenantId, entityType, entityId = null) {
  try {
    const typeConfig = getTypeConfig(entityType);
    const tenantPath = getTenantUploadPath(tenantId, entityType, entityId);

    const optimizedRelative = typeConfig.storage.optimizedDir
      ? toTenantPath(tenantId, typeConfig.storage.optimizedDir)
      : toTenantPath(path.relative(UPLOAD_DIR, tenantPath), 'optimized');
    const thumbnailsRelative = typeConfig.storage.thumbnailsDir
      ? toTenantPath(tenantId, typeConfig.storage.thumbnailsDir)
      : toTenantPath(path.relative(UPLOAD_DIR, tenantPath), 'thumbnails');

    const optimizedPath = path.join(UPLOAD_DIR, optimizedRelative);
    const thumbnailsPath = path.join(UPLOAD_DIR, thumbnailsRelative);

    await fs.mkdir(tenantPath, { recursive: true });
    await fs.mkdir(optimizedPath, { recursive: true });
    await fs.mkdir(thumbnailsPath, { recursive: true });

    return {
      basePath: tenantPath,
      optimizedPath,
      thumbnailsPath,
      relativeBase: path.relative(UPLOAD_DIR, tenantPath).split(path.sep).join('/'),
      relativeOptimized: optimizedRelative,
      relativeThumbnails: thumbnailsRelative
    };
  } catch (error) {
    console.error('Error creating tenant directories:', error);
    throw error;
  }
}

// Настройка multer для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла. Разрешены: JPG, PNG, WebP, GIF, SVG'), false);
    }
  }
});

// База данных в памяти (в реальном проекте использовать PostgreSQL)
const imagesDB = new Map();
const DB_FILE = path.join(__dirname, '../images_metadata.json');

// Загрузка базы данных из JSON файла
async function loadDatabase() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    const images = JSON.parse(data);
    
    // Восстанавливаем Map из массива
    for (const image of images) {
      const normalized = normalizeRecord(image);
      if (normalized?.id) {
        imagesDB.set(normalized.id, normalized);
      }
    }
    
    console.log(`📋 Loaded ${images.length} images from database`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📋 Creating new images database');
      await scanAndIndexExistingImages();
    } else {
      console.error('Error loading database:', error);
    }
  }
}

// Сохранение базы данных в JSON файл
async function saveDatabase() {
  try {
    const images = Array.from(imagesDB.values());
    await fs.writeFile(DB_FILE, JSON.stringify(images, null, 2));
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Автосканирование существующих изображений
async function scanAndIndexExistingImages() {
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    const originalFiles = files.filter(file => file.includes('_original'));
    
    console.log(`🔍 Scanning ${originalFiles.length} existing images...`);
    
    for (const originalFile of originalFiles) {
      const id = originalFile.split('_original')[0];
      const ext = path.extname(originalFile);
      
      // Проверяем что изображение еще не в базе
      if (imagesDB.has(id)) continue;
      
      const originalPath = path.join(UPLOAD_DIR, originalFile);
      const optimizedPath = path.join(OPTIMIZED_DIR, `${id}_optimized.jpg`);
      const thumbnailPath = path.join(THUMBNAILS_DIR, `${id}_thumb.jpg`);
      
      try {
        // Читаем метаданные
        const stats = await fs.stat(originalPath);
        const buffer = await fs.readFile(originalPath);
        const image = sharp(buffer);
        const metadata = await image.metadata();
        
        // Парсим оригинальное имя файла
        const originalNamePart = originalFile.replace(`${id}_original`, '');
        const originalName = originalNamePart || `image_${id}${ext}`;
        const displayName = originalNamePart.replace(ext, '') || `Image ${id}`;
        
        // Создаем запись
        const imageRecord = {
          id,
          originalName: originalName,
          displayName: displayName,
          altText: '',
          filename: `${id}_optimized.jpg`,
          originalFilename: originalFile,
          thumbnailFilename: `${id}_thumb.jpg`,
          mimetype: `image/${ext.slice(1)}`,
          size: stats.size,
          optimizedSize: 0, // Будет вычислено позже
          dimensions: {
            width: metadata.width,
            height: metadata.height
          },
          tokenSavings: 70, // Примерная оценка
          uploadedAt: stats.birthtime || stats.mtime,
          url: buildPublicUrl(toTenantPath('optimized', `${id}_optimized.jpg`)),
          originalUrl: buildPublicUrl(originalFile),
          thumbnailUrl: buildPublicUrl(toTenantPath('thumbnails', `${id}_thumb.jpg`)),
          mimeType: 'image/jpeg',
          originalMimeType: `image/${ext.slice(1)}`,
          optimized: true,
          storage: {
            baseDir: '',
            optimizedDir: 'optimized',
            thumbnailsDir: 'thumbnails'
          },
          tenantId: null,
          type: 'legacy',
          entityId: null
        };
        
        // Проверяем размер оптимизированного файла
        try {
          const optimizedStats = await fs.stat(optimizedPath);
          imageRecord.optimizedSize = optimizedStats.size;
          imageRecord.tokenSavings = Math.round(((stats.size - optimizedStats.size) / stats.size) * 100);
        } catch (e) {
          // Оптимизированный файл не найден - создаем заново
          console.log(`🔄 Re-optimizing ${originalFile}...`);
          const optimizedBuffer = await image
            .resize(1092, 1092, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 90 })
            .toBuffer();
          await fs.writeFile(optimizedPath, optimizedBuffer);
          imageRecord.optimizedSize = optimizedBuffer.length;
          
          // Создаем thumbnail если нет
          const thumbnailBuffer = await image
            .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();
          await fs.writeFile(thumbnailPath, thumbnailBuffer);
        }
        
        imagesDB.set(id, normalizeRecord(imageRecord));
        console.log(`✅ Indexed: ${imageRecord.displayName} (${imageRecord.tokenSavings}% savings)`);
        
      } catch (error) {
        console.error(`❌ Error indexing ${originalFile}:`, error);
      }
    }
    
    await saveDatabase();
    console.log(`📋 Database updated with ${imagesDB.size} images`);
    
  } catch (error) {
    console.error('Error scanning existing images:', error);
  }
}

// Функция оптимизации и сохранения изображения с учетом tenant isolation
async function optimizeImage({ buffer, originalName, mimeType, tenantId, entityType, entityId = null }) {
  const id = uuidv4();
  const extFromName = path.extname(originalName).toLowerCase();
  const normalizedExt = extFromName || mimeTypeToExtension(mimeType);
  const baseName = path.basename(originalName, normalizedExt || undefined);
  const isSVG = mimeType === 'image/svg+xml' || normalizedExt === '.svg';

  const typeConfig = getTypeConfig(entityType);
  const tenantDirs = await ensureTenantDirectories(tenantId, entityType, entityId);

  const originalFilename = `${id}_original${normalizedExt || ''}`;
  const optimizedFilename = isSVG
    ? `${id}_optimized${normalizedExt || ''}`
    : `${id}_optimized${typeConfig.format === 'webp' ? '.webp' : '.jpg'}`;
  const thumbnailFilename = isSVG || !typeConfig.thumbnail
    ? null
    : `${id}_thumb.jpg`;

  const originalPath = path.join(tenantDirs.basePath, originalFilename);
  const optimizedPath = path.join(tenantDirs.optimizedPath, optimizedFilename);
  const thumbnailPath = thumbnailFilename
    ? path.join(tenantDirs.thumbnailsPath, thumbnailFilename)
    : null;

  await fs.writeFile(originalPath, buffer);

  let optimizedBuffer = buffer;
  let optimizedMimeType = mimeType;
  let optimizedSize = buffer.length;
  let optimizedMetadata = null;
  let originalMetadata = null;

  if (!isSVG) {
    const image = sharp(buffer);
    originalMetadata = await image.metadata();

    const maxSize = typeConfig.maxSize || 1200;
    const quality = typeConfig.quality || 90;

    let pipeline = image.clone();

    // Используем fitMode из конфига (по умолчанию 'inside' для сохранения пропорций)
    const fitMode = typeConfig.fitMode || 'inside';
    const resizeOptions = {
      fit: fitMode,
      withoutEnlargement: true
    };

    // Для 'cover' добавляем центрирование
    if (fitMode === 'cover') {
      resizeOptions.position = 'center';
    }

    pipeline = pipeline.resize(maxSize, maxSize, resizeOptions);

    if (typeConfig.format === 'webp') {
      optimizedBuffer = await pipeline.webp({ quality }).toBuffer();
      optimizedMimeType = 'image/webp';
    } else if (mimeType === 'image/png') {
      optimizedBuffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
      optimizedMimeType = 'image/png';
    } else {
      optimizedBuffer = await pipeline.jpeg({ quality }).toBuffer();
      optimizedMimeType = 'image/jpeg';
    }

    optimizedMetadata = await sharp(optimizedBuffer).metadata();
    optimizedSize = optimizedBuffer.length;

    if (thumbnailPath) {
      const thumbBuffer = await image
        .clone()
        .resize(typeConfig.thumbnail, typeConfig.thumbnail, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: Math.min(quality, 85) })
        .toBuffer();

      await fs.writeFile(thumbnailPath, thumbBuffer);
    }

    await fs.writeFile(optimizedPath, optimizedBuffer);
  } else {
    await fs.writeFile(optimizedPath, buffer);
  }

  const relativeOriginalPath = toTenantPath(tenantDirs.relativeBase, originalFilename);
  const relativeOptimizedPath = toTenantPath(tenantDirs.relativeOptimized, optimizedFilename);
  const relativeThumbnailPath = thumbnailFilename
    ? toTenantPath(tenantDirs.relativeThumbnails, thumbnailFilename)
    : null;

  const imageRecord = {
    id,
    tenantId,
    type: entityType,
    entityId: entityId || null,
    filename: optimizedFilename,
    originalName,
    originalFilename,
    thumbnailFilename,
    displayName: baseName || originalName,
    altText: '',
    size: buffer.length,
    optimizedSize,
    mimeType: optimizedMimeType,
    originalMimeType: mimeType,
    url: buildPublicUrl(relativeOptimizedPath),
    originalUrl: buildPublicUrl(relativeOriginalPath),
    thumbnailUrl: relativeThumbnailPath ? buildPublicUrl(relativeThumbnailPath) : null,
    uploadedAt: new Date().toISOString(),
    optimized: !isSVG,
    tokenSavings: buffer.length > 0
      ? Math.max(0, Math.round((1 - optimizedSize / buffer.length) * 100))
      : 0,
    dimensions: optimizedMetadata
      ? { width: optimizedMetadata.width, height: optimizedMetadata.height }
      : null,
    originalDimensions: originalMetadata
      ? { width: originalMetadata.width, height: originalMetadata.height }
      : null,
    storage: {
      baseDir: tenantDirs.relativeBase,
      optimizedDir: tenantDirs.relativeOptimized,
      thumbnailsDir: tenantDirs.relativeThumbnails
    }
  };

  const normalizedRecord = normalizeRecord(imageRecord);
  imagesDB.set(id, normalizedRecord);
  await saveDatabase();

  return normalizedRecord;
}

function mimeTypeToExtension(mimeType = '') {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/svg+xml':
      return '.svg';
    case 'image/gif':
      return '.gif';
    default:
      return '';
  }
}

function buildStoragePath(relativeDir, filename) {
  if (!relativeDir) {
    return path.join(UPLOAD_DIR, filename);
  }
  return path.join(UPLOAD_DIR, relativeDir, filename);
}

async function deleteImageFiles(image) {
  if (!image) return;

  const storage = image.storage || {};

  const originalPath = image.originalFilename
    ? buildStoragePath(storage.baseDir, image.originalFilename)
    : null;
  const optimizedPath = image.filename
    ? buildStoragePath(storage.optimizedDir, image.filename)
    : null;
  const thumbnailPath = image.thumbnailFilename
    ? buildStoragePath(storage.thumbnailsDir, image.thumbnailFilename)
    : null;

  const operations = [originalPath, optimizedPath, thumbnailPath]
    .filter(Boolean)
    .map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn('Failed to delete file', filePath, error.message);
        }
      }
    });

  await Promise.all(operations);
}

function serializeImage(image) {
  if (!image) return null;

  return {
    id: image.id,
    tenantId: image.tenantId,
    type: image.type,
    entityId: image.entityId,
    originalName: image.originalName,
    displayName: image.displayName,
    altText: image.altText,
    size: image.size,
    optimizedSize: image.optimizedSize,
    mimeType: image.mimeType,
    originalMimeType: image.originalMimeType,
    url: image.url,
    originalUrl: image.originalUrl,
    thumbnailUrl: image.thumbnailUrl,
    uploadedAt: image.uploadedAt,
    optimized: image.optimized,
    tokenSavings: image.tokenSavings,
    dimensions: image.dimensions,
    originalDimensions: image.originalDimensions
  };
}

async function removeExistingTenantImages(tenantId, entityType, entityId = null) {
  const toDelete = [];

  imagesDB.forEach((record, recordId) => {
    const matchesEntity = entityId ? record.entityId === entityId : true;
    if (record.tenantId === tenantId && record.type === entityType && matchesEntity) {
      toDelete.push({ record, recordId });
    }
  });

  for (const { record, recordId } of toDelete) {
    await deleteImageFiles(record);
    imagesDB.delete(recordId);
  }

  if (toDelete.length > 0) {
    await saveDatabase();
  }

  return toDelete.length;
}

function normalizeRecord(record) {
  if (!record) return null;

  const normalized = { ...record };

  normalized.tenantId = normalized.tenantId || null;
  normalized.type = normalized.type || 'legacy';
  normalized.entityId = normalized.entityId || null;

  if (normalized.tenantId === 'global-admin' && normalized.type === 'legacy') {
    normalized.type = 'admin_gallery';
  }

  if (!normalized.storage) {
    normalized.storage = {
      baseDir: '',
      optimizedDir: 'optimized',
      thumbnailsDir: 'thumbnails'
    };
  }

  if (!normalized.url && normalized.filename) {
    const rel = toTenantPath(normalized.storage.optimizedDir, normalized.filename);
    normalized.url = buildPublicUrl(rel);
  }

  if (!normalized.originalUrl && normalized.originalFilename) {
    const rel = toTenantPath(normalized.storage.baseDir, normalized.originalFilename);
    normalized.originalUrl = buildPublicUrl(rel);
  }

  if (!normalized.thumbnailUrl && normalized.thumbnailFilename) {
    const rel = toTenantPath(normalized.storage.thumbnailsDir, normalized.thumbnailFilename);
    normalized.thumbnailUrl = buildPublicUrl(rel);
  }

  if (typeof normalized.optimized === 'undefined') {
    normalized.optimized = true;
  }

  return normalized;
}

// Статические файлы
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/uploads/optimized', express.static(OPTIMIZED_DIR));
app.use('/uploads/thumbnails', express.static(THUMBNAILS_DIR));

// 🔓 PUBLIC: Статические файлы доступны БЕЗ аутентификации для Gateway
// Gateway перенаправляет /api/images/uploads/* на этот роут
app.use('/api/images/uploads', express.static(UPLOAD_DIR));

// API Endpoints

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'images-api',
    port: PORT,
    imagesCount: imagesDB.size
  });
});

// Загрузка изображений
app.use('/api/images', authMiddleware);

app.post('/api/images/upload', upload.array('images', 10), async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const entityType = getTypeFromQuery(req.query.type);
    const entityId = req.query.entityId ? String(req.query.entityId) : null;

    if (!IMAGE_OPTIMIZATION[entityType]) {
      return res.status(400).json({ error: `Unsupported image type: ${entityType}` });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Файлы не найдены' });
    }

    const results = [];
    const sizeLimit = getSizeLimit(entityType);

    if (entityType === 'salon_logo') {
      await removeExistingTenantImages(tenantId, 'salon_logo');
    }

    if (entityType === 'user_avatar' && entityId) {
      await removeExistingTenantImages(tenantId, 'user_avatar', entityId);
    }

    if (entityType === 'client_avatar' && entityId) {
      await removeExistingTenantImages(tenantId, 'client_avatar', entityId);
    }

    for (const file of req.files) {
      try {
        if (file.size > sizeLimit) {
          results.push({
            originalName: file.originalname,
            error: `Файл превышает допустимый размер (${Math.round(sizeLimit / (1024 * 1024))}MB)`
          });
          continue;
        }

        const imageRecord = await optimizeImage({
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          tenantId,
          entityType,
          entityId
        });

        results.push(serializeImage(imageRecord));

        console.log(`✅ Uploaded: ${file.originalname} → ${imageRecord.tokenSavings}% token savings`);
      } catch (error) {
        console.error(`❌ Error processing ${file.originalname}:`, error);
        results.push({
          originalName: file.originalname,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      uploaded: results.filter(r => !r.error).length,
      errors: results.filter(r => r.error).length,
      images: results
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Ошибка загрузки файлов' });
  }
});

app.delete('/api/images/entity', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const entityType = getTypeFromQuery(req.query.type);
    const entityId = req.query.entityId ? String(req.query.entityId) : null;

    if (!entityType || !IMAGE_OPTIMIZATION[entityType]) {
      return res.status(400).json({ error: 'Unsupported image type' });
    }

    if (!entityId) {
      return res.status(400).json({ error: 'entityId is required' });
    }

    const removed = await removeExistingTenantImages(tenantId, entityType, entityId);

    return res.json({
      success: true,
      removed
    });
  } catch (error) {
    console.error('Delete entity images error:', error);
    res.status(500).json({ error: 'Failed to delete entity images' });
  }
});

// Получение списка изображений
app.get('/api/images', (req, res) => {
  const tenantId = req.tenantId;

  if (!tenantId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';
  const filterType = req.query.type ? String(req.query.type) : null;

  let images = Array.from(imagesDB.values()).filter((image) => image.tenantId === tenantId);

  if (search) {
    images = images.filter((img) =>
      (img.originalName || '').toLowerCase().includes(String(search).toLowerCase())
    );
  }

  if (filterType) {
    images = images.filter((img) => img.type === filterType);
  }

  images.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

  const start = (page - 1) * limit;
  const paginatedImages = images.slice(start, start + limit).map(serializeImage);

  res.json({
    images: paginatedImages,
    pagination: {
      page,
      limit,
      total: images.length,
      pages: Math.ceil(images.length / limit)
    }
  });
});

// Массовое удаление изображений (ДОЛЖНО БЫТЬ РАНЬШЕ /:id!)
app.delete('/api/images/bulk', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { imageIds } = req.body;
    
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'Не указаны ID изображений' });
    }

    const results = [];
    
    for (const id of imageIds) {
      try {
        const image = imagesDB.get(id);
        if (!image) {
          results.push({ id, success: false, error: 'Не найдено' });
          continue;
        }

        if (image.tenantId !== tenantId) {
          results.push({ id, success: false, error: 'Недостаточно прав' });
          continue;
        }

        await deleteImageFiles(image);
        imagesDB.delete(id);
        results.push({ id, success: true, name: image.originalName });

        console.log(`🗑️ Bulk deleted: ${image.originalName}`);
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    
    // Сохраняем базу данных после массового удаления
    await saveDatabase();
    
    res.json({
      success: true,
      deleted: successful,
      errors: results.length - successful,
      results
    });
    
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Ошибка массового удаления' });
  }
});

// Удаление изображения
app.delete('/api/images/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const image = imagesDB.get(id);
    
    if (!image) {
      return res.status(404).json({ error: 'Изображение не найдено' });
    }

    if (!tenantId || image.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Недостаточно прав для удаления изображения' });
    }
    
    await deleteImageFiles(image);

    // Удаляем из базы
    imagesDB.delete(id);

    // 🔥 КРИТИЧНО: Сохраняем изменения в JSON файл!
    await saveDatabase();

    console.log(`🗑️ Deleted image: ${image.originalName}`);

    res.json({
      success: true,
      message: 'Изображение удалено',
      deletedImage: image.originalName
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Ошибка удаления изображения' });
  }
});

// Получение информации об изображении
app.get('/api/images/:id', (req, res) => {
  const tenantId = req.tenantId;
  const { id } = req.params;
  const image = imagesDB.get(id);
  
  if (!image) {
    return res.status(404).json({ error: 'Изображение не найдено' });
  }

  if (!tenantId || image.tenantId !== tenantId) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }
  
  res.json(serializeImage(image));
});

// Обновление метаданных изображения
app.put('/api/images/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { displayName, altText } = req.body;
    
    const image = imagesDB.get(id);
    if (!image) {
      return res.status(404).json({ error: 'Изображение не найдено' });
    }

    if (!tenantId || image.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    
    // Обновляем метаданные
    const updatedImage = {
      ...image,
      displayName: displayName?.trim() || image.displayName,
      altText: altText?.trim() || image.altText
    };
    
    imagesDB.set(id, updatedImage);
    
    // Сохраняем базу данных после обновления метаданных
    await saveDatabase();
    
    console.log(`📝 Updated metadata: ${image.originalName} → "${displayName}"`);
    
    res.json({
      success: true,
      image: serializeImage(updatedImage),
      message: 'Метаданные обновлены'
    });
    
  } catch (error) {
    console.error('Update metadata error:', error);
    res.status(500).json({ error: 'Ошибка обновления метаданных' });
  }
});

// Статистика
app.get('/api/images/stats', (req, res) => {
  const tenantId = req.tenantId;

  if (!tenantId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const images = Array.from(imagesDB.values()).filter((image) => image.tenantId === tenantId);
  
  const stats = {
    total: images.length,
    totalSize: images.reduce((sum, img) => sum + img.size, 0),
    totalOptimizedSize: images.reduce((sum, img) => sum + img.optimizedSize, 0),
    averageTokenSavings: images.length > 0 
      ? Math.round(images.reduce((sum, img) => sum + img.tokenSavings, 0) / images.length)
      : 0,
    totalTokenSavings: images.reduce((sum, img) => sum + img.tokenSavings, 0)
  };
  
  res.json(stats);
});

// Error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Файл слишком большой (макс. 10MB)' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Слишком много файлов (макс. 10)' });
    }
  }
  
  if (error.message === 'Неподдерживаемый тип файла') {
    return res.status(400).json({ error: error.message });
  }
  
  console.error('Unexpected error:', error);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint не найден' });
});

// Start server
async function startServer() {
  await loadImageConfig();
  await ensureDirectories();
  await loadDatabase();
  
  app.listen(PORT, () => {
    console.log(`🖼️  Images API running on port ${PORT}`);
    console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
    console.log(`🎯 Optimizing images for Claude token savings!`);
    console.log(`📋 Database loaded with ${imagesDB.size} images`);
  });
}

startServer().catch(console.error);
