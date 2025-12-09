/**
 * @fileoverview Domain Entities - Export barrel
 * @description Центральная точка экспорта всех доменных сущностей
 */

// Base entity
export { BaseEntity } from './BaseEntity';

// NOTE: Legacy domain entities removed. Use Prisma models instead.
// - Salon → Use Prisma Tenant model
// - Language → Use Prisma enums or LANGUAGE_METADATA
// - Money → Use Prisma Decimal type

// TODO: Add other entities as they are created
// export { Appointment } from './Appointment';
// export { Client } from './Client';  
// export { Staff } from './Staff';
// export { Service } from './Service';
// export { Payment } from './Payment';