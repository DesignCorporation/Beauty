import express, { type NextFunction, type Response, type Router } from 'express'
import { z } from 'zod'
import { Prisma, tenantPrisma, prisma } from '@beauty-platform/database'
import { assertAuth } from '@beauty/shared'
import multer from 'multer'
import { parse as parseCsv } from 'csv-parse/sync'
import { randomUUID } from 'crypto'
type ExcelJSModule = typeof import('exceljs')
import type { TenantRequest } from '../middleware/tenant'

const router: Router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
})

const wrapTenantRoute =
  (handler: (req: TenantRequest, res: Response) => Promise<void | Response>) =>
  async (req: express.Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req as TenantRequest, res)
    } catch (error) {
      next(error)
    }
  }

const AUTH_REQUIRED_ERROR = 'Authentication required'

const requireTenantContext = (
  req: TenantRequest,
  res: Response
): { tenantId: string; tenantClient: ReturnType<typeof tenantPrisma> } | null => {
  try {
    const auth = assertAuth(req)
    const tenantId = req.tenantId ?? auth.tenantId

    if (!tenantId) {
      res.status(403).json({
        success: false,
        error: 'Tenant context is required'
      })
      return null
    }

    return { tenantId, tenantClient: tenantPrisma(tenantId) }
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_REQUIRED_ERROR) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
      return null
    }
    throw error
  }
}

type ClientWithCount = Prisma.ClientGetPayload<{
  include: {
    _count: {
      select: {
        appointments: true;
      };
    };
  };
}>;

const optionalEmail = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  },
  z
    .string({ invalid_type_error: 'Invalid email' })
    .email('Invalid email')
    .optional()
);

const optionalPhone = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  },
  z
    .string()
    .min(5, 'Phone must be at least 5 characters')
    .optional()
);

const optionalNotes = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  },
  z.string().optional()
);

const optionalBirthday = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  },
  z.string().optional()
);

// Validation schemas
const CreateClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required'),
  email: optionalEmail,
  phone: optionalPhone,
  notes: optionalNotes,
  birthday: optionalBirthday
});

const UpdateClientSchema = CreateClientSchema.partial();

type ClientProfileInfo = {
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  birthdate?: Date | null;
};

const mapClientResponse = (client: ClientWithCount, profile?: ClientProfileInfo | null) => {
  const { _count, ...clientData } = client;

  return {
    ...clientData,
    appointmentsCount: _count.appointments,
    avatar: profile?.avatar ?? null,
    profileFirstName: profile?.firstName ?? null,
    profileLastName: profile?.lastName ?? null,
    isPortalClient: Boolean(profile)
  };
};

const splitFullName = (fullName?: string | null) => {
  if (!fullName) {
    return { firstName: undefined, lastName: undefined };
  }

  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: undefined, lastName: undefined };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: undefined };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
};

const CLIENT_EXPORT_COLUMNS = [
  { key: 'clientId', header: 'Client ID', width: 26 },
  { key: 'fullName', header: 'Full Name', width: 28 },
  { key: 'firstName', header: 'First Name', width: 20 },
  { key: 'lastName', header: 'Last Name', width: 24 },
  { key: 'email', header: 'Email', width: 28 },
  { key: 'phone', header: 'Phone', width: 18 },
  { key: 'birthdate', header: 'Birthdate (YYYY-MM-DD)', width: 20 },
  { key: 'status', header: 'Status', width: 16 },
  { key: 'tags', header: 'Tags', width: 20 },
  { key: 'notes', header: 'Notes', width: 36 },
  { key: 'appointmentsCount', header: 'Appointments Count', width: 20 },
  { key: 'createdAt', header: 'Created At (ISO)', width: 24 }
] as const

type ClientExportRow = Record<(typeof CLIENT_EXPORT_COLUMNS)[number]['key'], string>

const CSV_BOM = '\uFEFF'
const CSV_BATCH_SIZE = 1000
const PREVIEW_TTL_MS = 15 * 60 * 1000
const MAX_PREVIEW_ROWS = 100

type ImportIssueLevel = 'error' | 'warning'

interface ImportRowIssue {
  level: ImportIssueLevel
  code: string
  message: string
}

interface ClientImportRow {
  id: string
  rowNumber: number
  fullName: string
  firstName?: string
  lastName?: string
  email?: string
  normalizedEmail?: string
  phone?: string
  normalizedPhone?: string
  birthdate?: string
  notes?: string
  tags: string[]
  status: 'READY' | 'WARNING' | 'ERROR'
  issues: ImportRowIssue[]
  duplicateInFile?: boolean
  duplicateInTenant?: boolean
}

interface ClientImportPreviewStoreItem {
  tenantId: string
  createdAt: number
  rows: ClientImportRow[]
  fileName: string
  detectedColumns: ColumnMapping
}

const IMPORT_PREVIEW_STORE = new Map<string, ClientImportPreviewStoreItem>()

const formatDate = (value?: Date | string | null): string => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const formatDateTime = (value?: Date | string | null): string => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

const escapeCsvValue = (raw?: string | null): string => {
  if (!raw) return ''
  const value = raw.replace(/\r?\n/g, ' ').trim()
  if (/[";,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const buildClientExportRow = (
  client: ClientWithCount,
  profile?: ClientProfileInfo | null
): ClientExportRow => {
  const fallbackNameParts = splitFullName(client.name)
  const derivedFirstName = profile?.firstName ?? fallbackNameParts.firstName ?? ''
  const derivedLastName = profile?.lastName ?? fallbackNameParts.lastName ?? ''
  const birthdate = profile?.birthdate ?? client.birthday ?? null

  return {
    clientId: client.id,
    fullName: client.name || '',
    firstName: derivedFirstName,
    lastName: derivedLastName,
    email: client.email ?? '',
    phone: client.phone ?? '',
    birthdate: formatDate(birthdate),
    status: client.status,
    tags: '', // Placeholder for future tag support
    notes: client.notes ?? '',
    appointmentsCount: String(client._count.appointments ?? 0),
    createdAt: formatDateTime(client.createdAt)
  }
}

let excelJsInstance: ExcelJSModule | null = null
type ExcelWorkbook = import('exceljs').Workbook
type ExcelWorksheet = import('exceljs').Worksheet

const loadExcelJS = async (): Promise<ExcelJSModule> => {
  if (excelJsInstance) return excelJsInstance
  const mod = await import('exceljs')
  const resolved = (mod as unknown as { default?: ExcelJSModule }).default ?? (mod as unknown as ExcelJSModule)
  excelJsInstance = resolved
  return resolved
}

const normalizeHeaderKey = (value?: string | null): string => {
  return (value ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, '')
    .replace(/[^a-z0-9а-яё]/gi, '')
}

const COLUMN_ALIASES: Record<string, string[]> = {
  fullName: ['name', 'fullname', 'clientname', 'fio', 'имя', 'фио', 'клиент', 'имяклиента'],
  firstName: ['firstname', 'first', 'givenname', 'имя'],
  lastName: ['lastname', 'surname', 'familyname', 'фамилия'],
  email: ['email', 'mail', 'почта', 'электроннаяпочта'],
  phone: ['phone', 'mobile', 'tel', 'telephone', 'телефон', 'номер'],
  birthdate: ['birthdate', 'birthday', 'dob', 'датарождения', 'деньрождения'],
  notes: ['notes', 'comment', 'comments', 'заметки', 'комментарий'],
  tags: ['tags', 'labels', 'теги']
}

type ColumnMapping = {
  fullName?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  birthdate?: string | null
  notes?: string | null
  tags?: string | null
}

const determineColumnMapping = (headerKeys: string[]): ColumnMapping => {
  const uniqueNormalized = headerKeys.map((key) => normalizeHeaderKey(key))

  const findColumn = (aliases: string[]): string | null => {
    const normalizedAliases = aliases.map(normalizeHeaderKey)
    const index = uniqueNormalized.findIndex((header) => normalizedAliases.includes(header))
    if (index >= 0) {
      return headerKeys[index]
    }
    return null
  }

  return {
    fullName: findColumn(COLUMN_ALIASES.fullName),
    firstName: findColumn(COLUMN_ALIASES.firstName),
    lastName: findColumn(COLUMN_ALIASES.lastName),
    email: findColumn(COLUMN_ALIASES.email),
    phone: findColumn(COLUMN_ALIASES.phone),
    birthdate: findColumn(COLUMN_ALIASES.birthdate),
    notes: findColumn(COLUMN_ALIASES.notes),
    tags: findColumn(COLUMN_ALIASES.tags)
  }
}

const normalizePhone = (value?: string | null): string | null => {
  if (!value) return null
  const digits = value.replace(/[^\d+]/g, '')
  if (!digits) return null
  if (digits.startsWith('+')) {
    return `+${digits.slice(1).replace(/\D/g, '')}`
  }
  return digits.replace(/\D/g, '')
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const cleanupPreviewStore = () => {
  const now = Date.now()
  for (const [key, value] of IMPORT_PREVIEW_STORE.entries()) {
    if (now - value.createdAt > PREVIEW_TTL_MS) {
      IMPORT_PREVIEW_STORE.delete(key)
    }
  }
}

const toNodeBuffer = (value: Buffer | ArrayBufferLike): Buffer => {
  return Buffer.isBuffer(value) ? value : Buffer.from(value)
}

const parseDateInput = (value?: string | null): Date | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date
}

type ParsedRow = {
  rowNumber: number
  values: Record<string, string>
}

type ParsedFileData = {
  normalizedHeaders: string[]
  headerDisplayMap: Map<string, string>
  rows: ParsedRow[]
}

const coerceCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'object' && value !== null) {
    if (typeof (value as any).text === 'string') {
      return (value as any).text
    }
    if (typeof (value as any).result === 'string') {
      return (value as any).result
    }
    if ('richText' in (value as any) && Array.isArray((value as any).richText)) {
      return (value as any).richText.map((item: any) => item.text ?? '').join('')
    }
  }
  return String(value)
}

const parseCsvBuffer = (input: Buffer | ArrayBufferLike): ParsedFileData => {
  const text = toNodeBuffer(input).toString('utf8')
  const records = parseCsv(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Record<string, string>[]

  const headerDisplayMap = new Map<string, string>()
  const rows: ParsedRow[] = records.map((record, index) => {
    const normalizedValues: Record<string, string> = {}
    Object.entries(record).forEach(([key, raw]) => {
      const normalizedKey = normalizeHeaderKey(key)
      if (!normalizedKey) {
        return
      }
      if (!headerDisplayMap.has(normalizedKey)) {
        headerDisplayMap.set(normalizedKey, key)
      }
      normalizedValues[normalizedKey] = coerceCellValue(raw)
    })
    return {
      rowNumber: index + 2,
      values: normalizedValues
    }
  })

  return {
    normalizedHeaders: Array.from(headerDisplayMap.keys()),
    headerDisplayMap,
    rows
  }
}

const parseXlsxBuffer = async (input: Buffer | ArrayBufferLike): Promise<ParsedFileData> => {
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(toNodeBuffer(input) as any)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    return {
      normalizedHeaders: [],
      headerDisplayMap: new Map(),
      rows: []
    }
  }

  const headerDisplayMap = new Map<string, string>()
  const headerColumns: Array<{ normalized: string; columnIndex: number }> = []
  const headerRow = worksheet.getRow(1)

  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const headerValue = coerceCellValue(cell.value)
    const normalizedKey = normalizeHeaderKey(headerValue)
    if (!normalizedKey) return
    if (!headerDisplayMap.has(normalizedKey)) {
      headerDisplayMap.set(normalizedKey, headerValue || `column_${colNumber}`)
      headerColumns.push({
        normalized: normalizedKey,
        columnIndex: colNumber
      })
    }
  })

  const rows: ParsedRow[] = []
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const excelRow = worksheet.getRow(rowNumber)
    if (!excelRow || excelRow.cellCount === 0) {
      continue
    }
    const normalizedValues: Record<string, string> = {}
    let hasValue = false

    headerColumns.forEach(({ normalized, columnIndex }) => {
      const cell = excelRow.getCell(columnIndex)
      const value = coerceCellValue(cell.value)
      if (value && value.trim().length > 0) {
        hasValue = true
      }
      normalizedValues[normalized] = value
    })

    if (!hasValue) {
      continue
    }

    rows.push({
      rowNumber,
      values: normalizedValues
    })
  }

  return {
    normalizedHeaders: Array.from(headerDisplayMap.keys()),
    headerDisplayMap,
    rows
  }
}

// GET /api/clients - Получить всех клиентов салона
router.get(
  '/',
  wrapTenantRoute(async (req, res) => {
  try {
    const context = requireTenantContext(req, res)
    if (!context) {
      return
    }
    const { tenantId, tenantClient } = context

    const pageRaw = Number((req.query.page as string) ?? 1)
    const limitRaw = Number((req.query.limit as string) ?? 50)
    const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw
    const limit = Number.isNaN(limitRaw) ? 50 : Math.min(Math.max(limitRaw, 1), 100)
    const offset = (page - 1) * limit
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined

    const where: Prisma.ClientWhereInput = {
      tenantId,
      status: 'ACTIVE'
    }

    if (search && search.length > 0) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ]
    }

    const [clientsRaw, totalCount] = await Promise.all([
      tenantClient.client.findMany({
        where,
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: {
              appointments: true
            }
          }
        }
      }),
      tenantClient.client.count({ where })
    ]) as [ClientWithCount[], number]

    const emails = clientsRaw
      .map((client) => client.email)
      .filter((email): email is string => Boolean(email))

    let profileMap = new Map<string, ClientProfileInfo>();
    if (emails.length > 0) {
      const profiles = await tenantPrisma(null).clientProfile.findMany({
        where: { email: { in: emails } },
        select: { email: true, firstName: true, lastName: true, avatar: true, birthdate: true }
      })
      profileMap = new Map(profiles.map((profile) => [profile.email, profile]))
    }

    const clients = clientsRaw.map((client) => {
      const profile = client.email ? profileMap.get(client.email) : undefined
      return mapClientResponse(client, profile)
    })
    
    res.json({
      success: true,
      data: clients,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
    return

  } catch (error) {
    console.error('Error fetching clients:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clients'
    })
    return
  }
  })
)

// GET /api/clients/check-email - Проверить существование ClientProfile (для Walk-in Flow)
router.get('/check-email', async (req, res) => {
  try {
    const rawEmail = req.query.email

    if (typeof rawEmail !== 'string' || rawEmail.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Email is required'
      })
      return
    }

    const email = rawEmail.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format'
      })
      return
    }

    const clientProfile = await tenantPrisma(null).clientProfile.findUnique({
      where: { email },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        phoneVerified: true,
        birthdate: true,
        avatar: true
      }
    })

    res.json({
      success: true,
      exists: Boolean(clientProfile),
      clientProfile
    })
    return
  } catch (error) {
    console.error('Error checking email:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check email'
    })
  }
})

router.get(
  '/export',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = requireTenantContext(req, res)
      if (!context) {
        return
      }
      const { tenantClient, tenantId } = context

      const rawFormat = typeof req.query.format === 'string' ? req.query.format.toLowerCase() : 'csv'
      const format = rawFormat === 'xlsx' ? 'xlsx' : 'csv'
      const fileBase = `clients-${new Date().toISOString().replace(/[:.]/g, '-')}`
      const where: Prisma.ClientWhereInput = { tenantId }

      let workbook: ExcelWorkbook | undefined
      let worksheet: ExcelWorksheet | undefined

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.csv"`)
        res.write(CSV_BOM)
        const headerLine = CLIENT_EXPORT_COLUMNS.map((column) => escapeCsvValue(column.header)).join(',')
        res.write(`${headerLine}\n`)
      } else {
        try {
          const ExcelJS = await loadExcelJS()
          res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          )
          res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.xlsx"`)
          workbook = new ExcelJS.Workbook()
          workbook.creator = 'Beauty Platform CRM'
          workbook.created = new Date()
          worksheet = workbook.addWorksheet('Clients')
          worksheet.columns = CLIENT_EXPORT_COLUMNS.map((column) => ({
            header: column.header,
            key: column.key,
            width: column.width
          }))
        } catch (excelError) {
          console.error('Excel export unavailable:', excelError)
          res.status(500).json({
            success: false,
            error: 'XLSX export is temporarily unavailable'
          })
          return
        }
      }

      let page = 0

      while (true) {
        const clientsBatch = await tenantClient.client.findMany({
          where,
          orderBy: { id: 'asc' },
          skip: page * CSV_BATCH_SIZE,
          take: CSV_BATCH_SIZE,
          include: {
            _count: {
              select: {
                appointments: true
              }
            }
          }
        }) as ClientWithCount[]

        if (clientsBatch.length === 0) {
          break
        }

        const emails = clientsBatch
          .map((client) => client.email)
          .filter((email): email is string => Boolean(email))

        let profileMap = new Map<string, ClientProfileInfo>()
        if (emails.length > 0) {
          const profiles = await tenantPrisma(null).clientProfile.findMany({
            where: { email: { in: emails } },
            select: {
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              birthdate: true
            }
          })
          profileMap = new Map(profiles.map((profile) => [profile.email, profile]))
        }

        for (const client of clientsBatch) {
          const profile = client.email ? profileMap.get(client.email) : undefined
          const row = buildClientExportRow(client, profile)

          if (format === 'csv') {
            const csvLine = CLIENT_EXPORT_COLUMNS.map((column) =>
              escapeCsvValue(row[column.key])
            ).join(',')
            res.write(`${csvLine}\n`)
          } else if (worksheet) {
            worksheet.addRow(row)
          }
        }

        page += 1
      }

      if (format === 'csv') {
        res.end()
        return
      }

      if (workbook) {
        await workbook.xlsx.write(res)
        res.end()
      }
    } catch (error) {
      console.error('Error exporting clients:', error)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to export clients'
        })
      } else {
        res.end()
      }
    }
  })
)

router.post(
  '/import/preview',
  upload.single('file'),
  wrapTenantRoute(async (req, res) => {
    cleanupPreviewStore()
    try {
      const context = requireTenantContext(req, res)
      if (!context) {
        return
      }
      const { tenantId, tenantClient } = context

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'FILE_REQUIRED'
        })
        return
      }

      const originalName = req.file.originalname || 'import'
      const extension = originalName.split('.').pop()?.toLowerCase() ?? ''
      const fileBuffer = req.file.buffer as Buffer
      let parsedData: ParsedFileData

      if (extension === 'csv') {
        parsedData = parseCsvBuffer(fileBuffer)
      } else if (extension === 'xlsx') {
        parsedData = await parseXlsxBuffer(fileBuffer)
      } else {
        res.status(400).json({
          success: false,
          error: 'UNSUPPORTED_FORMAT'
        })
        return
      }

      if (!parsedData.rows.length) {
        res.status(400).json({
          success: false,
          error: 'FILE_EMPTY'
        })
        return
      }

      const columnMapping = determineColumnMapping(parsedData.normalizedHeaders)

      if (!columnMapping.fullName && !columnMapping.firstName && !columnMapping.lastName) {
        res.status(400).json({
          success: false,
          error: 'NAME_COLUMN_REQUIRED'
        })
        return
      }

      const emailsForLookup = new Set<string>()
      const phonesForLookup = new Set<string>()
      const rawPhonesForLookup = new Set<string>()

      parsedData.rows.forEach((row) => {
        const emailRaw = columnMapping.email ? row.values[columnMapping.email] : ''
        if (emailRaw) {
          const normalizedEmail = emailRaw.toLowerCase()
          emailsForLookup.add(normalizedEmail)
        }

        const phoneRaw = columnMapping.phone ? row.values[columnMapping.phone] : ''
        if (phoneRaw) {
          rawPhonesForLookup.add(phoneRaw.trim())
          const normalizedPhone = normalizePhone(phoneRaw)
          if (normalizedPhone) {
            phonesForLookup.add(normalizedPhone)
          }
        }
      })

      const findConditions: Prisma.ClientWhereInput[] = []
      if (emailsForLookup.size > 0) {
        findConditions.push({
          email: {
            in: Array.from(emailsForLookup)
          }
        })
      }
      if (rawPhonesForLookup.size > 0) {
        findConditions.push({
          phone: {
            in: Array.from(rawPhonesForLookup)
          }
        })
      }

      let existingClients: Array<{ email: string | null; phone: string | null }> = []
      if (findConditions.length > 0) {
        existingClients = await tenantClient.client.findMany({
          where: {
            tenantId,
            OR: findConditions
          },
          select: {
            email: true,
            phone: true
          }
        })
      }

      const existingEmails = new Set(
        existingClients.map((client) => client.email?.toLowerCase()).filter(Boolean) as string[]
      )
      const existingPhones = new Set(
        existingClients
          .map((client) => normalizePhone(client.phone))
          .filter((value): value is string => Boolean(value))
      )

      const seenEmails = new Map<string, number>()
      const seenPhones = new Map<string, number>()
      const previewRows: ClientImportRow[] = []

      const rowsForProcessing = parsedData.rows

      for (const row of rowsForProcessing) {
        const rowId = randomUUID()
        const firstNameRaw = columnMapping.firstName ? row.values[columnMapping.firstName] ?? '' : ''
        const lastNameRaw = columnMapping.lastName ? row.values[columnMapping.lastName] ?? '' : ''
        const fullNameRaw = columnMapping.fullName ? row.values[columnMapping.fullName] ?? '' : ''
        const emailRaw = columnMapping.email ? row.values[columnMapping.email] ?? '' : ''
        const phoneRaw = columnMapping.phone ? row.values[columnMapping.phone] ?? '' : ''
        const notesRaw = columnMapping.notes ? row.values[columnMapping.notes] ?? '' : ''
        const birthdateRaw = columnMapping.birthdate ? row.values[columnMapping.birthdate] ?? '' : ''
        const tagsRaw = columnMapping.tags ? row.values[columnMapping.tags] ?? '' : ''

        const trimmedFullName = fullNameRaw.trim()
        const trimmedFirstName = firstNameRaw.trim()
        const trimmedLastName = lastNameRaw.trim()
        const fallbackFullName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(' ').trim()
        const resolvedFullName = trimmedFullName || fallbackFullName

        const trimmedEmail = emailRaw.trim()
        const normalizedEmail = trimmedEmail ? trimmedEmail.toLowerCase() : null
        const trimmedPhone = phoneRaw.trim()
        const normalizedPhone = normalizePhone(trimmedPhone)
        const normalizedBirthdate = birthdateRaw ? formatDate(birthdateRaw) : undefined
        const tags = tagsRaw
          .split(/[,;]/)
          .map((tag) => tag.trim())
          .filter(Boolean)

        const issues: ImportRowIssue[] = []
        const addIssue = (level: ImportIssueLevel, code: string, message: string) => {
          issues.push({ level, code, message })
        }

        if (!resolvedFullName) {
          addIssue('error', 'missing_name', 'Не указано имя клиента')
        }

        if (normalizedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
          addIssue('error', 'invalid_email', 'Некорректный email')
        }

        if (trimmedEmail && !normalizedEmail) {
          addIssue('error', 'invalid_email', 'Некорректный email')
        }

        if (trimmedPhone && !normalizedPhone) {
          addIssue('error', 'invalid_phone', 'Некорректный номер телефона')
        }

        if (!normalizedEmail && !normalizedPhone) {
          addIssue('warning', 'missing_contacts', 'Добавьте email или номер телефона')
        }

        let duplicateInFile = false
        let duplicateInTenant = false

        if (normalizedEmail) {
          if (seenEmails.has(normalizedEmail)) {
            duplicateInFile = true
            addIssue('error', 'duplicate_email_in_file', 'Email уже встречается в файле')
          } else {
            seenEmails.set(normalizedEmail, row.rowNumber)
          }

          if (existingEmails.has(normalizedEmail)) {
            duplicateInTenant = true
            addIssue('warning', 'duplicate_email_in_tenant', 'Email уже существует в базе салона')
          }
        }

        if (normalizedPhone) {
          if (seenPhones.has(normalizedPhone)) {
            duplicateInFile = true
            addIssue('error', 'duplicate_phone_in_file', 'Телефон уже встречается в файле')
          } else {
            seenPhones.set(normalizedPhone, row.rowNumber)
          }

          if (existingPhones.has(normalizedPhone)) {
            duplicateInTenant = true
            addIssue('warning', 'duplicate_phone_in_tenant', 'Телефон уже существует в базе салона')
          }
        }

        let status: ClientImportRow['status'] = 'READY'
        if (issues.some((issue) => issue.level === 'error')) {
          status = 'ERROR'
        } else if (issues.some((issue) => issue.level === 'warning')) {
          status = 'WARNING'
        }

        previewRows.push({
          id: rowId,
          rowNumber: row.rowNumber,
          fullName: resolvedFullName,
          firstName: trimmedFirstName || undefined,
          lastName: trimmedLastName || undefined,
          email: trimmedEmail || undefined,
          normalizedEmail: normalizedEmail || undefined,
          phone: trimmedPhone || undefined,
          normalizedPhone: normalizedPhone || undefined,
          birthdate: normalizedBirthdate,
          notes: notesRaw.trim() || undefined,
          tags,
          status,
          issues,
          duplicateInFile,
          duplicateInTenant
        })
      }

      const summary = {
        total: previewRows.length,
        ready: previewRows.filter((row) => row.status === 'READY').length,
        warnings: previewRows.filter((row) => row.status === 'WARNING').length,
        errors: previewRows.filter((row) => row.status === 'ERROR').length,
        duplicateInTenant: previewRows.filter((row) => row.duplicateInTenant).length
      }

      const previewId = randomUUID()
      IMPORT_PREVIEW_STORE.set(previewId, {
        tenantId,
        createdAt: Date.now(),
        rows: previewRows,
        fileName: originalName,
        detectedColumns: columnMapping
      })

      const mappingDisplay = Object.entries(columnMapping).reduce<Record<string, string | null>>(
        (acc, [key, value]) => {
          if (!value) {
            acc[key] = null
            return acc
          }
          acc[key] = parsedData.headerDisplayMap.get(value) ?? value
          return acc
        },
        {}
      )

      const rowsSample = previewRows.slice(0, MAX_PREVIEW_ROWS).map((row) => ({
        id: row.id,
        rowNumber: row.rowNumber,
        fullName: row.fullName,
        firstName: row.firstName ?? null,
        lastName: row.lastName ?? null,
        email: row.email ?? null,
        phone: row.phone ?? null,
        birthdate: row.birthdate ?? null,
        notes: row.notes ?? null,
        tags: row.tags,
        status: row.status,
        issues: row.issues,
        duplicateInFile: row.duplicateInFile ?? false,
        duplicateInTenant: row.duplicateInTenant ?? false
      }))

      res.json({
        success: true,
        previewId,
        fileName: originalName,
        summary,
        rows: rowsSample,
        totalRows: previewRows.length,
        sampleSize: rowsSample.length,
        detectedColumns: mappingDisplay,
        availableColumns: Array.from(parsedData.headerDisplayMap.values()),
        hasMoreRows: previewRows.length > rowsSample.length
      })
    } catch (error) {
      console.error('Error generating import preview:', error)
      res.status(500).json({
        success: false,
        error: 'IMPORT_PREVIEW_FAILED'
      })
    }
  })
)

const CommitImportSchema = z.object({
  previewId: z.string().uuid(),
  rowIds: z.array(z.string().uuid()).optional(),
  includeWarnings: z.boolean().optional()
})

router.post(
  '/import/commit',
  wrapTenantRoute(async (req, res) => {
    cleanupPreviewStore()
    try {
      const context = requireTenantContext(req, res)
      if (!context) {
        return
      }
      const { tenantId, tenantClient } = context
      const payload = CommitImportSchema.parse(req.body ?? {})
      const preview = IMPORT_PREVIEW_STORE.get(payload.previewId)

      if (!preview || preview.tenantId !== tenantId) {
        res.status(404).json({
          success: false,
          error: 'PREVIEW_NOT_FOUND'
        })
        return
      }

      const includeWarnings = payload.includeWarnings === true
      const rowIdFilter = payload.rowIds ? new Set(payload.rowIds) : null

      const candidateRows = preview.rows.filter((row) => {
        if (rowIdFilter && !rowIdFilter.has(row.id)) {
          return false
        }
        if (row.status === 'ERROR') {
          return false
        }
        if (row.status === 'READY') {
          return true
        }
        if (row.status === 'WARNING' && includeWarnings) {
          return true
        }
        return false
      })

      if (candidateRows.length === 0) {
        res.status(400).json({
          success: false,
          error: 'NO_ROWS_SELECTED'
        })
        return
      }

      const emails = new Set<string>()
      const phones = new Set<string>()
      candidateRows.forEach((row) => {
        if (row.normalizedEmail) {
          emails.add(row.normalizedEmail)
        } else if (row.email) {
          emails.add(row.email.toLowerCase())
        }

        if (row.normalizedPhone) {
          phones.add(row.normalizedPhone)
        }
      })

      const lookupConditions: Prisma.ClientWhereInput[] = []
      if (emails.size > 0) {
        lookupConditions.push({
          email: {
            in: Array.from(emails)
          }
        })
      }
      if (phones.size > 0) {
        lookupConditions.push({
          phone: {
            in: Array.from(phones)
          }
        })
      }

      let existingClients: Array<{ email: string | null; phone: string | null }> = []
      if (lookupConditions.length > 0) {
        existingClients = await tenantClient.client.findMany({
          where: {
            tenantId,
            OR: lookupConditions
          },
          select: {
            email: true,
            phone: true
          }
        })
      }

      const existingEmails = new Set(
        existingClients.map((client) => client.email?.toLowerCase()).filter(Boolean) as string[]
      )

      const existingPhones = new Set(
        existingClients
          .map((client) => normalizePhone(client.phone))
          .filter((value): value is string => Boolean(value))
      )

      const usedEmails = new Set<string>()
      const usedPhones = new Set<string>()

      const results: Array<{ rowId: string; status: 'IMPORTED' | 'SKIPPED'; reason?: string }> = []
      let importedCount = 0
      let skippedCount = 0

      for (const row of candidateRows) {
        const normalizedEmail = row.normalizedEmail ?? row.email?.toLowerCase() ?? null
        const normalizedPhone = row.normalizedPhone ?? normalizePhone(row.phone) ?? null
        const fullName = row.fullName || [row.firstName, row.lastName].filter(Boolean).join(' ').trim()

        if (!fullName) {
          skippedCount++
          results.push({
            rowId: row.id,
            status: 'SKIPPED',
            reason: 'NAME_REQUIRED'
          })
          continue
        }

        if (normalizedEmail && (existingEmails.has(normalizedEmail) || usedEmails.has(normalizedEmail))) {
          skippedCount++
          results.push({
            rowId: row.id,
            status: 'SKIPPED',
            reason: 'DUPLICATE_EMAIL'
          })
          continue
        }

        if (normalizedPhone && (existingPhones.has(normalizedPhone) || usedPhones.has(normalizedPhone))) {
          skippedCount++
          results.push({
            rowId: row.id,
            status: 'SKIPPED',
            reason: 'DUPLICATE_PHONE'
          })
          continue
        }

        const createData: Prisma.ClientUncheckedCreateInput = {
          tenantId,
          name: fullName,
          status: 'ACTIVE'
        }

        if (normalizedEmail) {
          createData.email = normalizedEmail
        }
        if (normalizedPhone) {
          createData.phone = normalizedPhone
        }
        if (row.notes) {
          createData.notes = row.notes
        }
        const birthdate = parseDateInput(row.birthdate)
        if (birthdate) {
          createData.birthday = birthdate
        }

        try {
          await tenantClient.client.create({
            data: createData
          })
          importedCount++
          if (normalizedEmail) {
            usedEmails.add(normalizedEmail)
          }
          if (normalizedPhone) {
            usedPhones.add(normalizedPhone)
          }
          results.push({
            rowId: row.id,
            status: 'IMPORTED'
          })
        } catch (error: any) {
          console.error('Failed to import client row:', error)
          skippedCount++

          let reason = 'UNKNOWN_ERROR'
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            reason = 'DUPLICATE_CONSTRAINT'
          }

          results.push({
            rowId: row.id,
            status: 'SKIPPED',
            reason
          })
        }
      }

      const summary = {
        total: candidateRows.length,
        imported: importedCount,
        skipped: skippedCount
      }

      res.json({
        success: true,
        summary,
        results
      })
    } catch (error) {
      console.error('Error committing client import:', error)
      res.status(500).json({
        success: false,
        error: 'IMPORT_COMMIT_FAILED'
      })
    }
  })
)

// GET /api/clients/:id - Получить клиента по ID
router.get(
  '/:id',
  wrapTenantRoute(async (req, res) => {
  try {
    const context = requireTenantContext(req, res)
    if (!context) {
      return
    }
    const { tenantId, tenantClient } = context

    const client = await tenantClient.client.findFirst({
      where: {
        id: req.params.id,
        tenantId
      },
      include: {
        appointments: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { date: 'desc' },
          take: 10,
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            status: true,
            notes: true,
            service: { select: { name: true, price: true } },
            assignedTo: { select: { firstName: true, lastName: true } }
          }
        },
        _count: {
          select: { appointments: true }
        }
      }
    }) as ClientWithCount | null;
    
    if (!client) {
      res.status(404).json({
        success: false,
        error: 'Client not found'
      })
      return
    }

    const profile = client.email
      ? await tenantPrisma(null).clientProfile.findUnique({
          where: { email: client.email },
          select: { email: true, firstName: true, lastName: true, avatar: true, birthdate: true }
        })
      : null;

    res.json({
      success: true,
      data: mapClientResponse(client, profile)
    })
    return
    
  } catch (error) {
    console.error('Error fetching client:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client'
    })
    return
  }
  })
)

// POST /api/clients - Создать нового клиента
router.post(
  '/',
  wrapTenantRoute(async (req, res) => {
  try {
    const context = requireTenantContext(req, res)
    if (!context) {
      return
    }
    const { tenantId, tenantClient } = context

    const validatedData = CreateClientSchema.parse(req.body)
    
    // Проверяем уникальность email в рамках салона
    if (validatedData.email) {
      const existingClient = await tenantClient.client.findFirst({
        where: {
          tenantId,
          email: validatedData.email
        }
      })

      if (existingClient) {
        res.status(400).json({
          success: false,
          error: 'Client with this email already exists'
        })
        return
      }
    }

    if (validatedData.phone) {
      const existingPhone = await tenantClient.client.findFirst({
        where: {
          tenantId,
          phone: validatedData.phone
        }
      })
      
      if (existingPhone) {
        res.status(400).json({
          success: false,
          error: 'Client with this phone already exists'
        })
        return
      }
    }

    const birthday = validatedData.birthday
      ? new Date(validatedData.birthday)
      : undefined

    const clientData: Prisma.ClientUncheckedCreateInput = {
      tenantId,
      name: validatedData.name,
      status: 'ACTIVE'
    }

    if (validatedData.email) {
      clientData.email = validatedData.email
    }
    if (validatedData.phone) {
      clientData.phone = validatedData.phone
    }
    if (validatedData.notes !== undefined) {
      clientData.notes = validatedData.notes ?? null
    }
    if (birthday) {
      clientData.birthday = birthday
    }

    const client = await tenantClient.client.create({
      data: clientData,
      include: {
        _count: {
          select: { appointments: true }
        }
      }
    }) as ClientWithCount
    
    const profile = client.email
      ? await tenantPrisma(null).clientProfile.findUnique({
          where: { email: client.email },
          select: { email: true, firstName: true, lastName: true, avatar: true, birthdate: true }
        })
      : null;

    res.status(201).json({
      success: true,
      data: mapClientResponse(client, profile),
      message: 'Client created successfully'
    })
    return
    
  } catch (error) {
    console.error('Error creating client:', error)
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      })
      return
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create client'
    })
    return
  }
  })
)

// PUT /api/clients/:id - Обновить клиента
router.put(
  '/:id',
  wrapTenantRoute(async (req, res) => {
  try {
    const context = requireTenantContext(req, res)
    if (!context) {
      return
    }
    const { tenantId, tenantClient } = context

    const validatedData = UpdateClientSchema.parse(req.body)

    const existingClient = await tenantClient.client.findFirst({
      where: {
        id: req.params.id,
        tenantId
      }
    })

    if (!existingClient) {
      res.status(404).json({
        success: false,
        error: 'Client not found'
      })
      return
    }

    const linkedProfile = existingClient.email
      ? await tenantPrisma(null).clientProfile.findUnique({
          where: { email: existingClient.email }
        })
      : null

    if (validatedData.email && validatedData.email !== existingClient.email) {
      const emailExists = await tenantClient.client.findFirst({
        where: {
          tenantId,
          email: validatedData.email,
          id: { not: req.params.id }
        }
      })

      if (emailExists) {
        res.status(400).json({
          success: false,
          error: 'Client with this email already exists'
        })
        return
      }

      if (linkedProfile) {
        res.status(400).json({
          success: false,
          error: 'Email управляется через Client Portal. Попросите клиента обновить его в личном кабинете.',
          code: 'EMAIL_MANAGED_BY_PORTAL'
        })
        return
      }
    }

    if (validatedData.phone && validatedData.phone !== existingClient.phone) {
      const phoneExists = await tenantClient.client.findFirst({
        where: {
          tenantId,
          phone: validatedData.phone,
          id: { not: req.params.id }
        }
      })

      if (phoneExists) {
        res.status(400).json({
          success: false,
          error: 'Client with this phone already exists'
        })
        return
      }
    }

    const updateData: Prisma.ClientUpdateInput = {}

    if (linkedProfile) {
      if (Object.prototype.hasOwnProperty.call(req.body, 'notes')) {
        updateData.notes = validatedData.notes ?? null
      }
    } else {
      if (Object.prototype.hasOwnProperty.call(req.body, 'name') && validatedData.name !== undefined) {
        updateData.name = validatedData.name
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'email') && validatedData.email !== undefined) {
        updateData.email = validatedData.email ?? null
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'phone') && validatedData.phone !== undefined) {
        updateData.phone = validatedData.phone ?? null
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'notes')) {
        updateData.notes = validatedData.notes ?? null
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'birthday') && validatedData.birthday !== undefined) {
        updateData.birthday = validatedData.birthday ? new Date(validatedData.birthday) : null
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        error: linkedProfile
          ? 'Для клиентов Client Portal можно изменять только заметки.'
          : 'Нет данных для обновления.'
      })
      return
    }

    const client = await tenantClient.client.update({
      where: { id: req.params.id, tenantId },
      data: updateData,
      include: {
        _count: {
          select: { appointments: true }
        }
      }
    }) as ClientWithCount

    if (linkedProfile) {
      const targetName = validatedData.name ?? existingClient.name
      const { firstName, lastName } = splitFullName(targetName)

      const profileUpdate: Prisma.ClientProfileUpdateInput = {}

      if (firstName) {
        profileUpdate.firstName = firstName
      }
      if (lastName) {
        profileUpdate.lastName = lastName
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
        profileUpdate.phone = validatedData.phone ?? null
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'birthday')) {
        profileUpdate.birthdate = validatedData.birthday ? new Date(validatedData.birthday) : null
      }

      if (Object.keys(profileUpdate).length > 0) {
        await tenantPrisma(null).clientProfile.update({
          where: { email: linkedProfile.email },
          data: profileUpdate
        })
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'notes')) {
        await prisma.clientSalonRelation.updateMany({
          where: {
            tenantId,
            clientEmail: linkedProfile.email
          },
          data: {
            salonNotes: validatedData.notes ?? null
          }
        })
      }
    }

    const updatedProfile = client.email
      ? await tenantPrisma(null).clientProfile.findUnique({
          where: { email: client.email },
          select: { email: true, firstName: true, lastName: true, avatar: true, birthdate: true }
        })
      : null

    res.json({
      success: true,
      data: mapClientResponse(client, updatedProfile),
      message: 'Client updated successfully'
    })
    return
  } catch (error) {
    console.error('Error updating client:', error)

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      })
      return
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update client'
    })
    return
  }
  })
)

// DELETE /api/clients/:id - Удалить клиента (soft delete)
router.delete(
  '/:id',
  wrapTenantRoute(async (req, res) => {
  try {
    const context = requireTenantContext(req, res)
    if (!context) {
      return
    }
    const { tenantId, tenantClient } = context

    const existingClient = await tenantClient.client.findFirst({
      where: {
        id: req.params.id,
        tenantId
      }
    })

    if (!existingClient) {
      res.status(404).json({
        success: false,
        error: 'Client not found'
      })
      return
    }

    // Soft delete - меняем статус на INACTIVE
    await tenantClient.client.update({
      where: { id: req.params.id, tenantId },
      data: { status: 'INACTIVE' }
    })

    res.json({
      success: true,
      message: 'Client deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting client:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete client'
    })
    return
  }
  })
)

// GET /api/clients/check-email - Проверить существование ClientProfile (для Walk-in Flow)
export default router;
