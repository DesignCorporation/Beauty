/**
 * Преобразует null → undefined для опциональных значений.
 */
export function normalizeOptional<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value
}

/**
 * Нормализует массив опциональных значений.
 * Удаляет null/undefined, возвращает undefined при пустом результате.
 */
export function normalizeOptionalArray<T>(
  values: Array<T | null | undefined> | null | undefined
): T[] | undefined {
  if (!values) {
    return undefined
  }

  const filtered = values.filter((item): item is T => item !== null && item !== undefined)
  return filtered.length > 0 ? filtered : undefined
}

/**
 * Утилита для условительного построения объекта.
 */
export function buildOptional<TKey extends string, TValue>(
  key: TKey,
  value: TValue | null | undefined
): Partial<Record<TKey, TValue>> {
  const result: Partial<Record<TKey, TValue>> = {}

  if (value !== null && value !== undefined) {
    result[key] = value
  }

  return result
}

/**
 * Возвращает объект только с определёнными свойствами.
 */
export function pickDefined<
  T extends Record<string, any>,
  const K extends readonly (keyof T)[]
>(source: T, keys: K): Partial<Pick<T, K[number]>> {
  const result: Partial<Pick<T, K[number]>> = {}

  for (const key of keys) {
    const value = source[key]
    if (value !== undefined) {
      result[key] = value
    }
  }

  return result
}

/**
 * Удаляет null/undefined значения из объекта.
 */
export function normalizeObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key as keyof T] = value
    }
  }

  return result
}

/**
 * Создаёт DTO, преобразуя null → undefined и исключая undefined.
 */
export function createNormalizedDTO<T extends Record<string, any>>(data: T): Partial<T> {
  const normalizedEntries = Object.entries(data).map(([key, value]) => [
    key,
    value === null ? undefined : value
  ])

  const result: Partial<T> = {}
  for (const [key, value] of normalizedEntries) {
    if (value !== undefined) {
      result[key as keyof T] = value
    }
  }

  return result
}

export function isValidString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function getStringOrUndefined(value: string | null | undefined): string | undefined {
  return isValidString(value) ? value : undefined
}
