import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../contexts/AuthContext';
import { CRMApiService } from '../services/crmApiNew';
import {
  ServiceCategory,
  ServiceCategoryInput,
  ServiceCategoryUpdateInput,
  ServiceSubcategory,
  ServiceSubcategoryInput,
  ServiceSubcategoryUpdateInput,
  ReorderItem,
} from '../types/services';

const sortCategories = (items: ServiceCategory[]) =>
  [...items].sort((a, b) => {
    if (a.order === b.order) {
      return a.name.localeCompare(b.name);
    }
    return a.order - b.order;
  });

const sortSubcategories = (items: ServiceSubcategory[]) =>
  [...items].sort((a, b) => {
    if (a.order === b.order) {
      return a.name.localeCompare(b.name);
    }
    return a.order - b.order;
  });

export const useCategories = (): {
  categories: ServiceCategory[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  createCategory: (payload: ServiceCategoryInput) => Promise<ServiceCategory>;
  updateCategory: (id: string, payload: ServiceCategoryUpdateInput) => Promise<ServiceCategory>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (items: ReorderItem[]) => Promise<void>;
  createSubcategory: (payload: ServiceSubcategoryInput) => Promise<ServiceSubcategory>;
  updateSubcategory: (id: string, payload: ServiceSubcategoryUpdateInput) => Promise<ServiceSubcategory>;
  deleteSubcategory: (id: string) => Promise<void>;
  reorderSubcategories: (items: ReorderItem[]) => Promise<void>;
  setCategories: (value: ServiceCategory[] | ((prev: ServiceCategory[]) => ServiceCategory[])) => void;
} => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { tenantId } = useTenant();

  const fetchCategories = useCallback(async (): Promise<void> => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await CRMApiService.getServiceCategories();

      if (!response.success) {
        throw new Error('Failed to fetch service categories');
      }

      setCategories(sortCategories(response.categories));
    } catch (err) {
      console.error('Error fetching service categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch service categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const createCategory = useCallback(
    async (payload: ServiceCategoryInput) => {
      if (!tenantId) throw new Error('No tenant ID');

      const response = await CRMApiService.createServiceCategory(payload);
      if (!response.success || !response.category) {
        throw new Error('Failed to create category');
      }

      const category = response.category;
      setCategories(prev => sortCategories([...prev, category]));
      return category;
    },
    [tenantId]
  );

  const updateCategory = useCallback(
    async (id: string, payload: ServiceCategoryUpdateInput) => {
      if (!tenantId) throw new Error('No tenant ID');

      const response = await CRMApiService.updateServiceCategory(id, payload);
      if (!response.success || !response.category) {
        throw new Error('Failed to update category');
      }

      const category = response.category;
      setCategories(prev =>
        sortCategories(prev.map(item => (item.id === id ? category : item)))
      );
      return category;
    },
    [tenantId]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');

      const response = await CRMApiService.deleteServiceCategory(id);
      if (!response.success) {
        throw new Error('Failed to delete category');
      }

      setCategories(prev => prev.filter(category => category.id !== id));
    },
    [tenantId]
  );

  const reorderCategories = useCallback(
    async (items: ReorderItem[]) => {
      if (!tenantId) throw new Error('No tenant ID');

      const response = await CRMApiService.reorderServiceCategories(items);
      if (!response.success) {
        throw new Error('Failed to reorder categories');
      }

      const orderMap = new Map(items.map(item => [item.id, item.order]));
      setCategories(prev =>
        sortCategories(
          prev.map(category =>
            orderMap.has(category.id)
              ? { ...category, order: orderMap.get(category.id)! }
              : category
          )
        )
      );
    },
    [tenantId]
  );

  const createSubcategory = useCallback(
    async (payload: ServiceSubcategoryInput) => {
      if (!tenantId) throw new Error('No tenant ID');

      const response = await CRMApiService.createServiceSubcategory(payload);
      if (!response.success || !response.subcategory) {
        throw new Error('Failed to create subcategory');
      }

      const subcategory = response.subcategory;
      setCategories(prev =>
        prev.map(category =>
          category.id === payload.categoryId
            ? {
                ...category,
                subcategories: sortSubcategories([...category.subcategories, subcategory]),
              }
            : category
        )
      );

      return subcategory;
    },
    [tenantId]
  );

  const updateSubcategory = useCallback(
    async (id: string, payload: ServiceSubcategoryUpdateInput) => {
      if (!tenantId) throw new Error('No tenant ID');

      const response = await CRMApiService.updateServiceSubcategory(id, payload);
      if (!response.success || !response.subcategory) {
        throw new Error('Failed to update subcategory');
      }

      const subcategory = response.subcategory;
      setCategories(prev =>
        prev.map(category => {
          const hasSubcategory = category.subcategories.some(item => item.id === id);
          if (!hasSubcategory) return category;

          return {
            ...category,
            subcategories: sortSubcategories(
              category.subcategories.map(item => (item.id === id ? subcategory : item))
            ),
          };
        })
      );

      return subcategory;
    },
    [tenantId]
  );

  const deleteSubcategory = useCallback(
    async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');

      const response = await CRMApiService.deleteServiceSubcategory(id);
      if (!response.success) {
        throw new Error('Failed to delete subcategory');
      }

      setCategories(prev =>
        prev.map(category => ({
          ...category,
          subcategories: category.subcategories.filter(item => item.id !== id),
        }))
      );
    },
    [tenantId]
  );

  const reorderSubcategories = useCallback(
    async (items: ReorderItem[]) => {
      if (!tenantId) throw new Error('No tenant ID');

      const response = await CRMApiService.reorderServiceSubcategories(items);
      if (!response.success) {
        throw new Error('Failed to reorder subcategories');
      }

      const orderMap = new Map(items.map(item => [item.id, item.order]));
      setCategories(prev =>
        prev.map(category => ({
          ...category,
          subcategories: sortSubcategories(
            category.subcategories.map(subcategory =>
              orderMap.has(subcategory.id)
                ? { ...subcategory, order: orderMap.get(subcategory.id)! }
                : subcategory
            )
          ),
        }))
      );
    },
    [tenantId]
  );

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    reorderSubcategories,
    setCategories,
  };
};
