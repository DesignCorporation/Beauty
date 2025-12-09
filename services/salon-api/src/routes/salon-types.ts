import express, { type Router } from 'express';
import { SalonType } from '@prisma/client';
import { SALON_CATEGORY_PRESETS, SALON_SERVICE_PRESETS } from '@beauty-platform/database';

const router: Router = express.Router();

type SalonTypeMeta = {
  id: string;
  label: string;
  description: string;
  icon: string;
};

type ServicePresetPayload = {
  key: string;
  selectionKey: string;
  name: string;
  price: number;
  duration: number;
  default: boolean;
  categoryName: string;
  subcategoryName: string;
};

const SALON_TYPE_META: Record<SalonType, SalonTypeMeta> = {
  [SalonType.HAIR]: {
    id: 'HAIR_SALON',
    label: 'Hair Salon',
    description: 'Haircuts, coloring, styling',
    icon: 'haircut',
  },
  [SalonType.NAILS]: {
    id: 'NAIL_SALON',
    label: 'Nail Salon',
    description: 'Manicure, pedicure, nail design',
    icon: 'nail-polish',
  },
  [SalonType.MASSAGE]: {
    id: 'MASSAGE_SPA',
    label: 'Massage & SPA',
    description: 'Massage therapy and wellness rituals',
    icon: 'spa',
  },
  [SalonType.BARBERSHOP]: {
    id: 'BARBERSHOP',
    label: 'Barbershop',
    description: 'Men’s cuts, beard trimming, grooming',
    icon: 'beard',
  },
  [SalonType.PET_GROOMING]: {
    id: 'PET_GROOMING',
    label: 'Pet Grooming',
    description: 'Dog & cat grooming, specialty care',
    icon: 'paw',
  },
  [SalonType.WELLNESS]: {
    id: 'WELLNESS_CENTER',
    label: 'Wellness Center',
    description: 'Holistic wellness and recovery services',
    icon: 'lotus',
  },
  [SalonType.COSMETOLOGY]: {
    id: 'BEAUTY_CLINIC',
    label: 'Beauty Clinic',
    description: 'Cosmetology, injections and hardware care',
    icon: 'sparkles',
  },
  [SalonType.BROW_LASH]: {
    id: 'BROW_LASH_STUDIO',
    label: 'Brow & Lash Studio',
    description: 'Brows, lashes, and make-up services',
    icon: 'eye',
  },
  [SalonType.MIXED]: {
    id: 'CUSTOM',
    label: 'Custom Salon',
    description: 'Create a custom mix of categories and services',
    icon: 'sparkle',
  },
};

const SALON_TYPE_LOOKUP = new Map<string, SalonType>();

Object.entries(SALON_TYPE_META).forEach(([key, meta]) => {
  const type = key as SalonType;
  SALON_TYPE_LOOKUP.set(type.toLowerCase(), type);
  SALON_TYPE_LOOKUP.set(meta.id.toLowerCase(), type);
  SALON_TYPE_LOOKUP.set(meta.label.toLowerCase(), type);
});

const normalizeSalonType = (value: string): SalonType | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return SALON_TYPE_LOOKUP.get(normalized) ?? null;
};

const slugify = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(/[\/\s]+/g, '-')
    .replace(/-+/g, '-');

const buildSelectionKey = (serviceKey: string) =>
  `service_${serviceKey.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase()}`;

const buildInternalKey = (category: string, subcategory: string, serviceKey: string) =>
  `${category}::${subcategory}::${serviceKey}`;

router.get('/salon-types', (_req, res) => {
  try {
    const payload = Object.values(SalonType).map((type) => {
      const meta = SALON_TYPE_META[type];
      const defaultCategories = SALON_CATEGORY_PRESETS[type]?.length ?? 0;
      const defaultServices =
        SALON_SERVICE_PRESETS[type]?.reduce((sum, preset) => sum + preset.services.length, 0) ?? 0;

      return {
        id: meta.id,
        salonType: type,
        label: meta.label,
        description: meta.description,
        icon: meta.icon,
        defaultCategories,
        defaultServices,
      };
    });

    res.json({
      success: true,
      salonTypes: payload,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load salon types',
    });
  }
});

router.get('/service-presets/:salonType', (req, res) => {
  try {
    const normalized = normalizeSalonType(req.params.salonType);

    if (!normalized) {
      return res.status(404).json({
        success: false,
        error: 'Salon type not found',
      });
    }

    const presets = SALON_SERVICE_PRESETS[normalized] ?? [];
    const categoryPresets = SALON_CATEGORY_PRESETS[normalized] ?? [];
    const categoryIconMap = new Map(categoryPresets.map((preset) => [preset.name, preset.icon ?? null]));

    const categoryMap = new Map<
      string,
      {
        id: string;
        name: string;
        icon: string | null;
        services: ServicePresetPayload[];
        subcategories: Array<{
          id: string;
          name: string;
          services: ServicePresetPayload[];
        }>;
      }
    >();

    for (const preset of presets) {
      const categoryId = slugify(preset.category) || `category-${categoryMap.size + 1}`;
      const categoryIcon = categoryIconMap.get(preset.category) ?? null;

      if (!categoryMap.has(preset.category)) {
        categoryMap.set(preset.category, {
          id: categoryId,
          name: preset.category,
          icon: categoryIcon,
          services: [],
          subcategories: [],
        });
      }

      const categoryEntry = categoryMap.get(preset.category)!;
      const subcategoryId = slugify(preset.subcategory) || `subcategory-${categoryEntry.subcategories.length + 1}`;
      let subcategoryEntry = categoryEntry.subcategories.find((entry) => entry.name === preset.subcategory);

      if (!subcategoryEntry) {
        subcategoryEntry = {
          id: subcategoryId,
          name: preset.subcategory,
          services: [],
        };
        categoryEntry.subcategories.push(subcategoryEntry);
      }

      for (const service of preset.services) {
        const selectionKey = buildSelectionKey(service.key);
        const internalKey = buildInternalKey(preset.category, preset.subcategory, service.key);

        const servicePayload = {
          key: internalKey,
          selectionKey,
          name: service.name,
          price: Number(service.price),
          duration: service.duration,
          default: true,
          categoryName: preset.category,
          subcategoryName: preset.subcategory,
        };

        categoryEntry.services.push(servicePayload);
        subcategoryEntry.services.push(servicePayload);
      }
    }

    res.json({
      success: true,
      salonType: SALON_TYPE_META[normalized].id,
      categories: Array.from(categoryMap.values()),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load service presets',
    });
  }
  return undefined;
});

export default router;
