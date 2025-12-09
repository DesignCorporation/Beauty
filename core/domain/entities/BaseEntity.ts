/**
 * @fileoverview Base Domain Entity
 * @description Базовый класс для всех доменных сущностей
 */

import { randomUUID } from 'crypto';

/**
 * BaseEntity - Базовый класс для всех доменных сущностей
 * Обеспечивает основную функциональность: ID, сравнение, валидация
 */
export abstract class BaseEntity {
  protected readonly _id: string;

  protected constructor(id: string) {
    this._id = id;
  }

  public get id(): string {
    return this._id;
  }

  /**
   * Генерирует уникальный ID для новой сущности
   */
  protected static generateId(): string {
    return randomUUID();
  }

  /**
   * Сравнивает две сущности по ID
   */
  public equals(entity?: BaseEntity): boolean {
    if (entity === null || entity === undefined) {
      return false;
    }

    if (this === entity) {
      return true;
    }

    if (!(entity instanceof BaseEntity)) {
      return false;
    }

    return this._id === entity._id;
  }

  /**
   * Возвращает строковое представление сущности
   */
  public toString(): string {
    return `${this.constructor.name}(${this._id})`;
  }
}