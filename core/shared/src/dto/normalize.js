"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeOptional = normalizeOptional;
exports.normalizeOptionalArray = normalizeOptionalArray;
exports.buildOptional = buildOptional;
exports.pickDefined = pickDefined;
exports.normalizeObject = normalizeObject;
exports.createNormalizedDTO = createNormalizedDTO;
exports.isValidString = isValidString;
exports.getStringOrUndefined = getStringOrUndefined;
/**
 * Преобразует null → undefined для опциональных значений.
 */
function normalizeOptional(value) {
    return value === null ? undefined : value;
}
/**
 * Нормализует массив опциональных значений.
 * Удаляет null/undefined, возвращает undefined при пустом результате.
 */
function normalizeOptionalArray(values) {
    if (!values) {
        return undefined;
    }
    const filtered = values.filter((item) => item !== null && item !== undefined);
    return filtered.length > 0 ? filtered : undefined;
}
/**
 * Утилита для условительного построения объекта.
 */
function buildOptional(key, value) {
    const result = {};
    if (value !== null && value !== undefined) {
        result[key] = value;
    }
    return result;
}
/**
 * Возвращает объект только с определёнными свойствами.
 */
function pickDefined(source, keys) {
    const result = {};
    for (const key of keys) {
        const value = source[key];
        if (value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}
/**
 * Удаляет null/undefined значения из объекта.
 */
function normalizeObject(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}
/**
 * Создаёт DTO, преобразуя null → undefined и исключая undefined.
 */
function createNormalizedDTO(data) {
    const normalizedEntries = Object.entries(data).map(([key, value]) => [
        key,
        value === null ? undefined : value
    ]);
    const result = {};
    for (const [key, value] of normalizedEntries) {
        if (value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}
function isValidString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
function getStringOrUndefined(value) {
    return isValidString(value) ? value : undefined;
}
