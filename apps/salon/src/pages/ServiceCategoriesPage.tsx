import { useCallback, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  PageContainer,
  Switch,
} from '@beauty-platform/ui'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import {
  Edit3,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  Tag,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCategories } from '../hooks/useCategories'
import type { ServiceCategory, ServiceSubcategory } from '../types/services'
import {
  CategoryForm,
  type CategoryFormValues,
} from '../components/service-categories/CategoryForm'
import {
  SubcategoryForm,
  type SubcategoryFormValues,
} from '../components/service-categories/SubcategoryForm'

interface CategoryDialogState {
  open: boolean
  mode: 'create' | 'edit'
  category: ServiceCategory | null
}

interface SubcategoryDialogState {
  open: boolean
  mode: 'create' | 'edit'
  category: ServiceCategory | null
  subcategory: ServiceSubcategory | null
}

const initialCategoryDialog: CategoryDialogState = {
  open: false,
  mode: 'create',
  category: null,
}

const initialSubcategoryDialog: SubcategoryDialogState = {
  open: false,
  mode: 'create',
  category: null,
  subcategory: null,
}

export default function ServiceCategoriesPage(): JSX.Element {
  const { t } = useTranslation()
  const {
    categories,
    loading,
    error,
    setCategories,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    reorderSubcategories,
  } = useCategories()

  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState>(initialCategoryDialog)
  const [subcategoryDialog, setSubcategoryDialog] =
    useState<SubcategoryDialogState>(initialSubcategoryDialog)
  const [savingCategory, setSavingCategory] = useState(false)
  const [savingSubcategory, setSavingSubcategory] = useState(false)
  const [pendingCategories, setPendingCategories] = useState<Record<string, boolean>>({})
  const [pendingSubcategories, setPendingSubcategories] = useState<Record<string, boolean>>({})

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        if (a.order === b.order) {
          return a.name.localeCompare(b.name)
        }
        return a.order - b.order
      }),
    [categories]
  )

  const openCreateCategoryDialog = () => {
    setCategoryDialog({ open: true, mode: 'create', category: null })
  }

  const openEditCategoryDialog = (category: ServiceCategory) => {
    setCategoryDialog({ open: true, mode: 'edit', category })
  }

  const closeCategoryDialog = () => {
    if (savingCategory) return
    setCategoryDialog(initialCategoryDialog)
  }

  const openCreateSubcategoryDialog = (category: ServiceCategory) => {
    setSubcategoryDialog({ open: true, mode: 'create', category, subcategory: null })
  }

  const openEditSubcategoryDialog = (category: ServiceCategory, subcategory: ServiceSubcategory) => {
    setSubcategoryDialog({ open: true, mode: 'edit', category, subcategory })
  }

  const closeSubcategoryDialog = () => {
    if (savingSubcategory) return
    setSubcategoryDialog(initialSubcategoryDialog)
  }

  const handleCategorySubmit = async (values: CategoryFormValues) => {
    setSavingCategory(true)
    try {
      if (categoryDialog.mode === 'edit' && categoryDialog.category) {
        await updateCategory(categoryDialog.category.id, values)
        toast.success(t('serviceCategories.toast.categoryUpdated', { name: values.name }))
      } else {
        await createCategory(values)
        toast.success(t('serviceCategories.toast.categoryCreated', { name: values.name }))
      }
      setCategoryDialog(initialCategoryDialog)
    } catch (err) {
      console.error('Error saving category', err)
      toast.error(t('serviceCategories.toast.categorySaveError'))
      throw err instanceof Error ? err : new Error('Failed to save category')
    } finally {
      setSavingCategory(false)
    }
  }

  const handleSubcategorySubmit = async (values: SubcategoryFormValues) => {
    if (!subcategoryDialog.category) return

    setSavingSubcategory(true)
    try {
      if (subcategoryDialog.mode === 'edit' && subcategoryDialog.subcategory) {
        await updateSubcategory(subcategoryDialog.subcategory.id, values)
        toast.success(t('serviceCategories.toast.subcategoryUpdated', { name: values.name }))
      } else {
        await createSubcategory({
          categoryId: subcategoryDialog.category.id,
          name: values.name,
          isActive: values.isActive,
        })
        toast.success(t('serviceCategories.toast.subcategoryCreated', { name: values.name }))
      }
      setSubcategoryDialog(initialSubcategoryDialog)
    } catch (err) {
      console.error('Error saving subcategory', err)
      toast.error(t('serviceCategories.toast.subcategorySaveError'))
      throw err instanceof Error ? err : new Error('Failed to save subcategory')
    } finally {
      setSavingSubcategory(false)
    }
  }

  const handleDeleteCategory = async (category: ServiceCategory) => {
    if (category.isDefault) return

    if (
      !window.confirm(t('serviceCategories.confirm.deleteCategory', { name: category.name }))
    ) {
      return
    }

    setPendingCategories(prev => ({ ...prev, [category.id]: true }))
    try {
      await deleteCategory(category.id)
      toast.success(t('serviceCategories.toast.categoryDeleted', { name: category.name }))
    } catch (err) {
      console.error('Error deleting category', err)
      toast.error(t('serviceCategories.toast.categoryDeleteError'))
    } finally {
      setPendingCategories(prev => {
        const updated = { ...prev }
        delete updated[category.id]
        return updated
      })
    }
  }

  const handleDeleteSubcategory = async (
    category: ServiceCategory,
    subcategory: ServiceSubcategory
  ) => {
    if (subcategory.isDefault) return

    if (
      !window.confirm(
        t('serviceCategories.confirm.deleteSubcategory', {
          name: subcategory.name,
          category: category.name,
        })
      )
    ) {
      return
    }

    setPendingSubcategories(prev => ({ ...prev, [subcategory.id]: true }))
    try {
      await deleteSubcategory(subcategory.id)
      toast.success(
        t('serviceCategories.toast.subcategoryDeleted', {
          name: subcategory.name,
        })
      )
    } catch (err) {
      console.error('Error deleting subcategory', err)
      toast.error(t('serviceCategories.toast.subcategoryDeleteError'))
    } finally {
      setPendingSubcategories(prev => {
        const updated = { ...prev }
        delete updated[subcategory.id]
        return updated
      })
    }
  }

  const toggleCategoryActive = async (category: ServiceCategory, nextValue: boolean) => {
    setPendingCategories(prev => ({ ...prev, [category.id]: true }))
    try {
      await updateCategory(category.id, { isActive: nextValue })
      toast.success(
        t(
          nextValue
            ? 'serviceCategories.toast.categoryEnabled'
            : 'serviceCategories.toast.categoryDisabled',
          { name: category.name }
        )
      )
    } catch (err) {
      console.error('Error toggling category', err)
      toast.error(t('serviceCategories.toast.categoryToggleError'))
    } finally {
      setPendingCategories(prev => {
        const updated = { ...prev }
        delete updated[category.id]
        return updated
      })
    }
  }

  const toggleSubcategoryActive = async (
    subcategory: ServiceSubcategory,
    nextValue: boolean
  ) => {
    setPendingSubcategories(prev => ({ ...prev, [subcategory.id]: true }))
    try {
      await updateSubcategory(subcategory.id, { isActive: nextValue })
      toast.success(
        t(
          nextValue
            ? 'serviceCategories.toast.subcategoryEnabled'
            : 'serviceCategories.toast.subcategoryDisabled',
          { name: subcategory.name }
        )
      )
    } catch (err) {
      console.error('Error toggling subcategory', err)
      toast.error(t('serviceCategories.toast.subcategoryToggleError'))
    } finally {
      setPendingSubcategories(prev => {
        const updated = { ...prev }
        delete updated[subcategory.id]
        return updated
      })
    }
  }

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, type } = result

      if (!destination) return
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return
      }

      if (type === 'CATEGORY') {
        const updated = Array.from(sortedCategories)
        const [moved] = updated.splice(source.index, 1)
        if (moved) {
          updated.splice(destination.index, 0, moved)
        }
        const withOrder = updated.map((category, index) => ({ ...category, order: index }))
        setCategories(withOrder)

        try {
          await reorderCategories(withOrder.map(category => ({ id: category.id, order: category.order })))
          toast.success(t('serviceCategories.toast.orderSaved'))
        } catch (err) {
          console.error('Error reordering categories', err)
          toast.error(t('serviceCategories.toast.orderError'))
          await fetchCategories()
        }
        return
      }

      if (type === 'SUBCATEGORY') {
        const sourceCategoryId = source.droppableId.replace('subcategory-', '')
        const destinationCategoryId = destination.droppableId.replace('subcategory-', '')

        if (sourceCategoryId !== destinationCategoryId) return

        const category = sortedCategories.find(item => item.id === sourceCategoryId)
        if (!category) return

        const subcategories = Array.from(category.subcategories)
        const [moved] = subcategories.splice(source.index, 1)
        if (moved) {
          subcategories.splice(destination.index, 0, moved)
        }
        const withOrder = subcategories.map((sub, index) => ({ ...sub, order: index }))

        setCategories(prev =>
          prev.map(item =>
            item.id === category.id ? { ...item, subcategories: withOrder } : item
          )
        )

        try {
          await reorderSubcategories(
            withOrder.map(subcategory => ({ id: subcategory.id, order: subcategory.order }))
          )
          toast.success(t('serviceCategories.toast.subcategoryOrderSaved'))
        } catch (err) {
          console.error('Error reordering subcategories', err)
          toast.error(t('serviceCategories.toast.subcategoryOrderError'))
          await fetchCategories()
        }
      }
    },
    [
      sortedCategories,
      fetchCategories,
      reorderCategories,
      reorderSubcategories,
      setCategories,
      t,
    ]
  )

  const totalServiceCount = useMemo(
    () => categories.reduce((acc, category) => acc + category.services.length, 0),
    [categories]
  )

  return (
    <PageContainer variant="standard" className="space-y-6">
      <Card className="border-border">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Tag className="h-5 w-5 text-muted-foreground" />
              {t('serviceCategories.title')}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {t('serviceCategories.subtitle', { count: totalServiceCount })}
            </CardDescription>
          </div>
          <Button onClick={openCreateCategoryDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {t('serviceCategories.actions.addCategory')}
          </Button>
        </CardHeader>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && error && (
        <Card className="border-error/40 bg-error/10">
          <CardContent className="p-6 text-center text-sm text-error">{error}</CardContent>
        </Card>
      )}

      {!loading && !error && (
        <DragDropContext onDragEnd={(result) => void handleDragEnd(result)}>
          <Droppable droppableId="categories" type="CATEGORY">
            {provided => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-4"
              >
                {sortedCategories.map((category, index) => {
                  const servicesCount = category.services.length
                  const inactive = !category.isActive
                  const pending = pendingCategories[category.id]

                  return (
                    <Draggable key={category.id} draggableId={category.id} index={index}>
                      {dragProvided => (
                        <Card
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className="border-border"
                        >
                          <CardHeader className="space-y-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex flex-wrap items-start gap-3">
                                <button
                                  {...dragProvided.dragHandleProps}
                                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-muted/60 text-muted-foreground transition hover:text-foreground"
                                  aria-label={t('serviceCategories.drag.category')}
                                >
                                  <GripVertical className="h-4 w-4" />
                                </button>
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <CardTitle className="text-lg font-semibold text-foreground">
                                      {category.name}
                                    </CardTitle>
                                    {category.isDefault && (
                                      <Badge variant="secondary" className="text-xs uppercase">
                                        {t('serviceCategories.badges.defaultCategory')}
                                      </Badge>
                                    )}
                                    {inactive && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs uppercase border-warning text-warning"
                                      >
                                        {t('serviceCategories.badges.inactive')}
                                      </Badge>
                                    )}
                                  </div>
                                  <CardDescription className="text-xs text-muted-foreground">
                                    {t('serviceCategories.meta.servicesCount', {
                                      count: servicesCount,
                                    })}
                                  </CardDescription>
                                  {category.icon && (
                                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Sparkles className="h-3 w-3" />
                                      <span>{category.icon}</span>
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <label className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                                  <Switch
                                    checked={!inactive}
                                    onCheckedChange={value => void toggleCategoryActive(category, value)}
                                    disabled={pending}
                                    aria-label={t('serviceCategories.actions.toggleCategory')}
                                  />
                                  {inactive
                                    ? t('serviceCategories.status.disabled')
                                    : t('serviceCategories.status.active')}
                                </label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void openEditCategoryDialog(category)}
                                  disabled={pending}
                                >
                                  <Edit3 className="mr-2 h-4 w-4" />
                                  {t('serviceCategories.actions.edit')}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void openCreateSubcategoryDialog(category)}
                                  disabled={pending}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  {t('serviceCategories.actions.addSubcategory')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-error hover:text-error"
                                  onClick={() => void handleDeleteCategory(category)}
                                  disabled={category.isDefault || pending}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t('serviceCategories.actions.delete')}
                                </Button>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            <Droppable
                              droppableId={`subcategory-${category.id}`}
                              type="SUBCATEGORY"
                              direction="vertical"
                            >
                              {subProvided => (
                                <div
                                  ref={subProvided.innerRef}
                                  {...subProvided.droppableProps}
                                  className="space-y-3"
                                >
                                  {category.subcategories.map((subcategory, subIndex) => {
                                    const subPending = pendingSubcategories[subcategory.id]
                                    const subServicesCount = category.services.filter(
                                      service => service.subcategoryId === subcategory.id
                                    ).length

                                    return (
                                      <Draggable
                                        key={subcategory.id}
                                        draggableId={subcategory.id}
                                        index={subIndex}
                                      >
                                        {subDragProvided => (
                                          <div
                                            ref={subDragProvided.innerRef}
                                            {...subDragProvided.draggableProps}
                                            className="flex flex-col gap-3 rounded-md border border-border/70 bg-muted/40 p-3 md:flex-row md:items-center md:justify-between"
                                          >
                                            <div className="flex items-start gap-3">
                                              <button
                                                {...subDragProvided.dragHandleProps}
                                                className="mt-1 flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-muted text-muted-foreground transition hover:text-foreground"
                                                aria-label={t('serviceCategories.drag.subcategory')}
                                              >
                                                <GripVertical className="h-4 w-4" />
                                              </button>
                                              <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <p className="text-sm font-medium text-foreground">
                                                    {subcategory.name}
                                                  </p>
                                                  {subcategory.isDefault && (
                                                    <Badge
                                                      variant="secondary"
                                                      className="text-[10px] uppercase"
                                                    >
                                                      {t('serviceCategories.badges.defaultSubcategory')}
                                                    </Badge>
                                                  )}
                                                  {!subcategory.isActive && (
                                                    <Badge
                                                      variant="outline"
                                                      className="text-[10px] uppercase border-warning text-warning"
                                                    >
                                                      {t('serviceCategories.badges.inactive')}
                                                    </Badge>
                                                  )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                  {t('serviceCategories.meta.servicesCount', {
                                                    count: subServicesCount,
                                                  })}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <label className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs text-muted-foreground">
                                                <Switch
                                                  checked={subcategory.isActive}
                                                  onCheckedChange={value =>
                                                    void toggleSubcategoryActive(subcategory, value)
                                                  }
                                                  disabled={subPending}
                                                  aria-label={t(
                                                    'serviceCategories.actions.toggleSubcategory'
                                                  )}
                                                />
                                                {subcategory.isActive
                                                  ? t('serviceCategories.status.active')
                                                  : t('serviceCategories.status.disabled')}
                                              </label>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  void openEditSubcategoryDialog(category, subcategory)
                                                }
                                                disabled={subPending}
                                              >
                                                <Edit3 className="mr-2 h-4 w-4" />
                                                {t('serviceCategories.actions.edit')}
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-error hover:text-error"
                                                onClick={() =>
                                                  void handleDeleteSubcategory(category, subcategory)
                                                }
                                                disabled={subcategory.isDefault || subPending}
                                              >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {t('serviceCategories.actions.delete')}
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    )
                                  })}
                                  {subProvided.placeholder}
                                  {category.subcategories.length === 0 && (
                                    <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                                      {t('serviceCategories.empty.subcategories')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Droppable>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  )
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <Dialog open={categoryDialog.open} onOpenChange={open => (!open ? closeCategoryDialog() : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {categoryDialog.mode === 'edit'
                ? t('serviceCategories.dialog.editCategoryTitle')
                : t('serviceCategories.dialog.createCategoryTitle')}
            </DialogTitle>
            <DialogDescription>
              {categoryDialog.mode === 'edit'
                ? t('serviceCategories.dialog.editCategoryDescription')
                : t('serviceCategories.dialog.createCategoryDescription')}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            {...(categoryDialog.category
              ? {
                  defaultValues: {
                    name: categoryDialog.category.name,
                    icon: categoryDialog.category.icon ?? '',
                    isActive: categoryDialog.category.isActive,
                  },
                }
              : {})}
            loading={savingCategory}
            submitLabel={
              categoryDialog.mode === 'edit'
                ? t('serviceCategories.form.save')
                : t('serviceCategories.form.create')
            }
            onCancel={closeCategoryDialog}
            onSubmit={(e) => void handleCategorySubmit(e)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={subcategoryDialog.open}
        onOpenChange={open => (!open ? closeSubcategoryDialog() : null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {subcategoryDialog.mode === 'edit'
                ? t('serviceCategories.dialog.editSubcategoryTitle', {
                    category: subcategoryDialog.category?.name ?? '',
                  })
                : t('serviceCategories.dialog.createSubcategoryTitle', {
                    category: subcategoryDialog.category?.name ?? '',
                  })}
            </DialogTitle>
            <DialogDescription>
              {subcategoryDialog.mode === 'edit'
                ? t('serviceCategories.dialog.editSubcategoryDescription')
                : t('serviceCategories.dialog.createSubcategoryDescription')}
            </DialogDescription>
          </DialogHeader>
          <SubcategoryForm
            {...(subcategoryDialog.subcategory
              ? {
                  defaultValues: {
                    name: subcategoryDialog.subcategory.name,
                    isActive: subcategoryDialog.subcategory.isActive,
                  },
                }
              : {})}
            loading={savingSubcategory}
            submitLabel={
              subcategoryDialog.mode === 'edit'
                ? t('serviceCategories.form.save')
                : t('serviceCategories.form.create')
            }
            onCancel={closeSubcategoryDialog}
            onSubmit={(e) => void handleSubcategorySubmit(e)}
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
