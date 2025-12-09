export type ServiceStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ARCHIVED';

export interface ServiceCategorySummary {
  id: string;
  name: string;
  icon?: string | null;
  order: number;
  isDefault: boolean;
  isActive?: boolean;
}

export interface ServiceSubcategorySummary {
  id: string;
  name: string;
  order: number;
  isDefault: boolean;
  isActive?: boolean;
  categoryId?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  status: ServiceStatus;
  isDefault: boolean;
  isActive: boolean;
  categoryId: string | null;
  subcategoryId: string | null;
  category?: ServiceCategorySummary | null;
  subcategory?: ServiceSubcategorySummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryServiceSummary {
  id: string;
  name: string;
  duration: number;
  price: number;
  isDefault: boolean;
  isActive: boolean;
  subcategoryId: string | null;
}

export interface ServiceSubcategory {
  id: string;
  name: string;
  order: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon?: string | null;
  order: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subcategories: ServiceSubcategory[];
  services: CategoryServiceSummary[];
}

export interface ServiceCategoryInput {
  name: string;
  icon?: string;
  isActive?: boolean;
}

export interface ServiceCategoryUpdateInput extends Partial<ServiceCategoryInput> {
  order?: number;
}

export interface ServiceSubcategoryInput {
  categoryId: string;
  name: string;
  isActive?: boolean;
}

export interface ServiceSubcategoryUpdateInput extends Partial<Omit<ServiceSubcategoryInput, 'categoryId'>> {
  order?: number;
}

export interface ReorderItem {
  id: string;
  order: number;
}

export interface ServiceFormInput {
  name: string;
  description?: string;
  duration: number;
  price: number;
  categoryId?: string | null;
  subcategoryId?: string | null;
  isActive?: boolean;
}
