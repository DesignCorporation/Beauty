"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SALON_SERVICE_PRESETS = exports.SALON_CATEGORY_PRESETS = void 0;
exports.seedDefaultCategories = seedDefaultCategories;
exports.seedDefaultServices = seedDefaultServices;
exports.SALON_CATEGORY_PRESETS = {
    HAIR: [
        {
            name: 'Стрижки',
            icon: 'scissors',
            subcategories: ['Женские стрижки', 'Мужские стрижки', 'Детские стрижки']
        },
        {
            name: 'Окрашивание',
            icon: 'palette',
            subcategories: ['Полное окрашивание', 'Мелирование', 'Тонирование']
        },
        {
            name: 'Уход и укладка',
            icon: 'brush',
            subcategories: ['Уход', 'Укладка', 'Экспресс услуги']
        }
    ],
    BARBERSHOP: [
        {
            name: 'Стрижки',
            icon: 'beard',
            subcategories: ['Classic', 'Fade', 'Дизайнерские']
        },
        {
            name: 'Борода и усы',
            icon: 'mustache',
            subcategories: ['Коррекция', 'Бритьё', 'Уход']
        },
        {
            name: 'Барбер-уход',
            icon: 'sparkles',
            subcategories: ['Уход за волосами', 'Массаж головы']
        }
    ],
    NAILS: [
        {
            name: 'Маникюр',
            icon: 'sparkles',
            subcategories: ['Классический', 'Гель-лак', 'Аппаратный', 'Снятие']
        },
        {
            name: 'Педикюр',
            icon: 'footprints',
            subcategories: ['Классический', 'Spa педикюр', 'Аппаратный']
        },
        {
            name: 'Дизайн и наращивание',
            icon: 'palette',
            subcategories: ['Дизайн', 'Наращивание', 'Коррекция']
        }
    ],
    MASSAGE: [
        {
            name: 'Массаж',
            icon: 'hand',
            subcategories: ['Расслабляющий', 'Спортивный', 'Терапевтический']
        },
        {
            name: 'Wellness',
            icon: 'flower',
            subcategories: ['SPA ритуалы', 'Стоун терапия', 'Ароматерапия']
        }
    ],
    PET_GROOMING: [
        {
            name: 'Груминг собак',
            icon: 'paw',
            subcategories: ['Полный груминг', 'Экспресс', 'Гигиенический']
        },
        {
            name: 'Груминг кошек',
            icon: 'cat',
            subcategories: ['Полный груминг', 'Экспресс', 'Львиная стрижка']
        },
        {
            name: 'Спец услуги',
            icon: 'sparkles',
            subcategories: ['Десшеддинг', 'Чистка зубов', 'Лечебный уход']
        }
    ],
    WELLNESS: [
        {
            name: 'Spa процедуры',
            icon: 'leaf',
            subcategories: ['Скрабы и обертывания', 'Термотерапия', 'Релакс']
        },
        {
            name: 'Восстановление',
            icon: 'droplets',
            subcategories: ['Растяжка', 'Лимфодренаж', 'Дыхательные практики']
        }
    ],
    COSMETOLOGY: [
        {
            name: 'Уход за кожей',
            icon: 'sparkles',
            subcategories: ['Чистка', 'Пилинги', 'Уходовые протоколы']
        },
        {
            name: 'Инъекции',
            icon: 'syringe',
            subcategories: ['Ботулинотерапия', 'Филлеры', 'Мезотерапия']
        },
        {
            name: 'Аппаратные методики',
            icon: 'activity',
            subcategories: ['Лазер', 'RF лифтинг', 'Микротоки']
        }
    ],
    BROW_LASH: [
        {
            name: 'Брови',
            icon: 'sparkles',
            subcategories: ['Коррекция', 'Окрашивание', 'Ламинирование']
        },
        {
            name: 'Ресницы',
            icon: 'eye',
            subcategories: ['Классика', 'Объём', 'Ламинирование']
        },
        {
            name: 'Макияж',
            icon: 'brush',
            subcategories: ['Дневной', 'Вечерний', 'Свадебный']
        }
    ],
    MIXED: []
};
exports.SALON_SERVICE_PRESETS = {
    HAIR: [
        {
            category: 'Стрижки',
            subcategory: 'Женские стрижки',
            services: [
                { key: 'hair/women/classic', name: 'Женская стрижка', duration: 60, price: 2500 },
                { key: 'hair/women/style', name: 'Стрижка + укладка', duration: 75, price: 3200 }
            ]
        },
        {
            category: 'Стрижки',
            subcategory: 'Мужские стрижки',
            services: [
                { key: 'hair/men/classic', name: 'Мужская стрижка', duration: 45, price: 2000 },
                { key: 'hair/men/fade', name: 'Fade стрижка', duration: 45, price: 2200 }
            ]
        },
        {
            category: 'Окрашивание',
            subcategory: 'Полное окрашивание',
            services: [
                { key: 'hair/color/full', name: 'Полное окрашивание', duration: 120, price: 5200 },
                { key: 'hair/color/balayage', name: 'Балаяж', duration: 150, price: 6800 }
            ]
        }
    ],
    BARBERSHOP: [
        {
            category: 'Стрижки',
            subcategory: 'Fade',
            services: [
                { key: 'barber/cut/fade', name: 'Skin Fade', duration: 45, price: 180 },
                { key: 'barber/cut/taper', name: 'Taper Fade', duration: 45, price: 170 }
            ]
        },
        {
            category: 'Борода и усы',
            subcategory: 'Коррекция',
            services: [
                { key: 'barber/beard/trim', name: 'Коррекция бороды', duration: 30, price: 120 },
                { key: 'barber/beard/hot-towel', name: 'Королевское бритьё', duration: 35, price: 140 }
            ]
        }
    ],
    NAILS: [
        {
            category: 'Маникюр',
            subcategory: 'Гель-лак',
            services: [
                { key: 'nails/manicure/gel', name: 'Гелевый маникюр', duration: 75, price: 180 },
                { key: 'nails/manicure/correction', name: 'Коррекция геля', duration: 60, price: 160 }
            ]
        },
        {
            category: 'Дизайн и наращивание',
            subcategory: 'Наращивание',
            services: [
                { key: 'nails/extensions/classic', name: 'Наращивание ногтей', duration: 120, price: 260 },
                { key: 'nails/extensions/removal', name: 'Снятие наращивания', duration: 45, price: 90 }
            ]
        }
    ],
    MASSAGE: [
        {
            category: 'Массаж',
            subcategory: 'Расслабляющий',
            services: [
                { key: 'massage/relax/swedish', name: 'Шведский массаж', duration: 60, price: 240 },
                { key: 'massage/relax/hot-stone', name: 'Массаж горячими камнями', duration: 75, price: 320 }
            ]
        },
        {
            category: 'Wellness',
            subcategory: 'SPA ритуалы',
            services: [
                { key: 'massage/spa/ritual', name: 'SPA-ритуал восстановления', duration: 90, price: 360 }
            ]
        }
    ],
    PET_GROOMING: [
        {
            category: 'Груминг собак',
            subcategory: 'Полный груминг',
            services: [
                { key: 'pet/dog/full', name: 'Полный груминг (собака)', duration: 120, price: 320 },
                { key: 'pet/dog/bath', name: 'Купание и сушка', duration: 60, price: 150 }
            ]
        },
        {
            category: 'Спец услуги',
            subcategory: 'Чистка зубов',
            services: [
                { key: 'pet/special/dental', name: 'Чистка зубов', duration: 30, price: 90 }
            ]
        }
    ],
    WELLNESS: [
        {
            category: 'Spa процедуры',
            subcategory: 'Скрабы и обертывания',
            services: [
                { key: 'wellness/spa/scrub', name: 'SPA-скраб + массаж', duration: 90, price: 420 }
            ]
        },
        {
            category: 'Восстановление',
            subcategory: 'Релакс',
            services: [
                { key: 'wellness/relax/sound', name: 'Саунд-батисессия', duration: 60, price: 260 }
            ]
        }
    ],
    COSMETOLOGY: [
        {
            category: 'Уход за кожей',
            subcategory: 'Уходовые протоколы',
            services: [
                { key: 'cosmetology/care/protocol', name: 'Уходовая процедура', duration: 75, price: 340 },
                { key: 'cosmetology/care/peeling', name: 'Пилинг', duration: 40, price: 210 }
            ]
        },
        {
            category: 'Инъекции',
            subcategory: 'Ботулинотерапия',
            services: [
                { key: 'cosmetology/inject/botox', name: 'Ботокс зона лба', duration: 30, price: 480 }
            ]
        }
    ],
    BROW_LASH: [
        {
            category: 'Брови',
            subcategory: 'Ламинирование',
            services: [
                { key: 'brow/lamination/basic', name: 'Ламинирование бровей', duration: 50, price: 160 }
            ]
        },
        {
            category: 'Ресницы',
            subcategory: 'Объём',
            services: [
                { key: 'lash/volume/classic', name: 'Наращивание ресниц (объём)', duration: 120, price: 280 }
            ]
        }
    ],
    MIXED: []
};
const buildServiceKey = (category, subcategory, key) => `${category}::${subcategory}::${key}`;
async function seedDefaultCategories(prisma, tenantId, salonType) {
    const presets = exports.SALON_CATEGORY_PRESETS[salonType] ?? [];
    for (const [order, preset] of presets.entries()) {
        const category = await prisma.serviceCategory.upsert({
            where: {
                tenantId_name: {
                    tenantId,
                    name: preset.name
                }
            },
            create: {
                tenantId,
                name: preset.name,
                icon: preset.icon ?? null,
                order,
                isDefault: true,
                isActive: true
            },
            update: (() => {
                const updateData = { order };
                if (preset.icon !== undefined) {
                    updateData.icon = preset.icon ?? null;
                }
                return updateData;
            })()
        });
        for (const [subOrder, subName] of preset.subcategories.entries()) {
            await prisma.serviceSubcategory.upsert({
                where: {
                    categoryId_name: {
                        categoryId: category.id,
                        name: subName
                    }
                },
                create: {
                    categoryId: category.id,
                    name: subName,
                    order: subOrder,
                    isDefault: true,
                    isActive: true
                },
                update: {
                    order: subOrder,
                    isActive: true
                }
            });
        }
    }
}
async function seedDefaultServices(prisma, tenantId, salonType, options) {
    const presets = exports.SALON_SERVICE_PRESETS[salonType] ?? [];
    if (presets.length === 0) {
        return;
    }
    const activeKeys = options?.activeServiceKeys ?? [];
    const categories = await prisma.serviceCategory.findMany({
        where: { tenantId },
        include: { subcategories: true }
    });
    const categoryMap = new Map(categories.map(category => [category.name, category]));
    for (const preset of presets) {
        const category = categoryMap.get(preset.category);
        if (!category) {
            continue;
        }
        const subcategory = category.subcategories.find(sub => sub.name === preset.subcategory);
        if (!subcategory) {
            continue;
        }
        for (const svc of preset.services) {
            const key = buildServiceKey(preset.category, preset.subcategory, svc.key);
            const isActive = activeKeys.length === 0 ? true : activeKeys.includes(key);
            const existing = await prisma.service.findFirst({
                where: {
                    tenantId,
                    name: svc.name
                }
            });
            if (existing) {
                const updateData = {
                    duration: svc.duration,
                    price: svc.price,
                    categoryId: category.id,
                    subcategoryId: subcategory.id,
                    isDefault: true,
                    isActive
                };
                if (svc.description !== undefined) {
                    updateData.description = svc.description ?? null;
                }
                await prisma.service.update({
                    where: { id: existing.id },
                    data: updateData
                });
            }
            else {
                await prisma.service.create({
                    data: {
                        tenantId,
                        name: svc.name,
                        description: svc.description ?? null,
                        duration: svc.duration,
                        price: svc.price,
                        status: 'ACTIVE',
                        isDefault: true,
                        isActive,
                        categoryId: category.id,
                        subcategoryId: subcategory.id
                    }
                });
            }
        }
    }
}
