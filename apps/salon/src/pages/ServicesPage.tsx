import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  PageContainer,
  Switch,
  cn,
  SidebarTrigger,
} from '@beauty-platform/ui'
import { Plus, Search, Edit3, Trash2, Loader2, MoreVertical, Scissors } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCurrency } from '../currency'
import { useServices } from '../hooks/useServices'
import { useCategories } from '../hooks/useCategories'
import type { Service, ServiceCategory, ServiceSubcategory } from '../types/services'
import { PageHeader } from '../components/layout/PageHeader'

type Translate = ReturnType<typeof useTranslation>['t']

interface ServiceCardItemProps {
  service: Service
  formatPrice: (value: number) => string
  onEdit: () => void
  onDelete: () => void
  onToggle: (nextValue: boolean) => void
  isMutating: boolean
  t: Translate
}

interface GroupedCategory {
  category: ServiceCategory | null
  subcategories: Array<{ data: ServiceSubcategory; services: Service[] }>
  uncategorizedServices: Service[]
}

function ServiceCardItem({
  service,
  formatPrice,
  onEdit,
  onDelete,
  onToggle,
  isMutating,
  t,
}: ServiceCardItemProps) {
  return (
    <Card
      className={cn(
        'group relative flex h-full flex-col overflow-hidden border-0 border-t border-border bg-transparent shadow-none transition-colors hover:bg-muted/40 rounded-none',
        service.isActive ? '' : 'bg-muted/30'
      )}
    >
      <CardContent className="flex flex-1 flex-col space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-3">
            <Switch
              checked={service.isActive}
              disabled={isMutating}
              onCheckedChange={onToggle}
              aria-label={t('servicesPage.toggleAria', { name: service.name })}
            />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-medium text-foreground">{service.name}</p>
                {service.isDefault && <span className="sr-only">{t('servicesPage.badges.defaultService')}</span>}
                {!service.isActive && (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-warning" aria-hidden="true" />
                    <span className="sr-only">{t('servicesPage.badges.inactive')}</span>
                  </span>
                )}
              </div>
              {service.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">{service.description}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${service.name}`}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => void onEdit()}>
                <Edit3 className="mr-2 h-4 w-4" />
                {t('services.editService')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => void onDelete()}
                className="text-error focus:text-error"
                disabled={isMutating}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('services.deleteService')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="border-t border-border/60 pt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t('servicesPage.priceLabel')}</p>
            <p className="text-base font-medium text-foreground">{formatPrice(service.price)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t('servicesPage.durationLabel')}</p>
            <p className="text-base font-medium text-foreground">
              {service.duration} {t('servicesPage.minutesShort')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ServicesPage(): JSX.Element {
  const navigate = useNavigate()
  const { formatPrice } = useCurrency()
  const { services, loading: servicesLoading, error: servicesError, deleteService, updateService } = useServices()
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategories()
  const { t } = useTranslation()

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showOnlyActive, setShowOnlyActive] = useState(false)
  const [mutatingServices, setMutatingServices] = useState<Record<string, boolean>>({})

  const activeFilteredServices = useMemo(
    () => services.filter(service => (showOnlyActive ? service.isActive : true)),
    [services, showOnlyActive]
  )

  const servicesAfterSearch = useMemo(() => {
    if (!searchTerm.trim()) {
      return activeFilteredServices
    }
    const query = searchTerm.trim().toLowerCase()
    return activeFilteredServices.filter(service => {
      const nameMatch = service.name.toLowerCase().includes(query)
      const descriptionMatch = service.description?.toLowerCase().includes(query)
      return nameMatch || Boolean(descriptionMatch)
    })
  }, [activeFilteredServices, searchTerm])

  const filteredServices = useMemo(() => {
    if (categoryFilter === 'all') {
      return servicesAfterSearch
    }
    if (categoryFilter === 'uncategorized') {
      return servicesAfterSearch.filter(service => !service.categoryId)
    }
    return servicesAfterSearch.filter(service => service.categoryId === categoryFilter)
  }, [servicesAfterSearch, categoryFilter])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    activeFilteredServices.forEach(service => {
      const key = service.categoryId ?? 'uncategorized'
      counts[key] = (counts[key] ?? 0) + 1
    })
    return {
      total: activeFilteredServices.length,
      counts,
    }
  }, [activeFilteredServices])

  const groupedCategories = useMemo<GroupedCategory[]>(() => {
    const servicesByCategory = new Map<string | null, Service[]>()
    filteredServices.forEach(service => {
      const key = service.categoryId ?? null
      const existing = servicesByCategory.get(key)
      if (existing) {
        existing.push(service)
      } else {
        servicesByCategory.set(key, [service])
      }
    })

    const groups: GroupedCategory[] = []

    categories.forEach(category => {
      const servicesForCategory = servicesByCategory.get(category.id) ?? []
      if (!servicesForCategory.length) {
        return
      }

      const subcategories = category.subcategories
        .map(subcategory => ({
          data: subcategory,
          services: servicesForCategory.filter(service => service.subcategoryId === subcategory.id),
        }))
        .filter(group => group.services.length > 0)

      const uncategorizedServices = servicesForCategory.filter(service => !service.subcategoryId)

      groups.push({
        category,
        subcategories,
        uncategorizedServices,
      })

      servicesByCategory.delete(category.id)
    })

    const uncategorizedServices = servicesByCategory.get(null) ?? []
    if (uncategorizedServices.length > 0) {
      groups.push({
        category: null,
        subcategories: [],
        uncategorizedServices,
      })
    }

    return groups
  }, [filteredServices, categories])

  const handleEdit = useCallback(
    (serviceId: string): void => {
      void navigate(`/services/${serviceId}/edit`)
    },
    [navigate]
  )

  const handleDelete = useCallback(
    async (service: Service) => {
      if (!window.confirm(t('servicesPage.deleteConfirm', { name: service.name }))) return

      try {
        await deleteService(service.id)
        toast.success(t('servicesPage.toastDeleted', { name: service.name }))
      } catch (error) {
        console.error('Error deleting service:', error)
        toast.error(t('servicesPage.deleteError'))
      }
    },
    [deleteService, t]
  )

  const handleToggleService = useCallback(
    async (service: Service, nextValue: boolean) => {
      if (mutatingServices[service.id]) return

      setMutatingServices(prev => ({ ...prev, [service.id]: true }))

      try {
        await updateService(service.id, { isActive: nextValue })
        toast.success(
          nextValue
            ? t('servicesPage.toastEnabled', { name: service.name })
            : t('servicesPage.toastDisabled', { name: service.name })
        )
      } catch (error) {
        console.error('Error toggling service state:', error)
        toast.error(t('servicesPage.errorToggle'))
      } finally {
        setMutatingServices(prev => {
          const updated = { ...prev }
          delete updated[service.id]
          return updated
        })
      }
    },
    [mutatingServices, updateService, t]
  )

  const handleResetFilters = useCallback(() => {
    setSearchTerm('')
    setCategoryFilter('all')
    setShowOnlyActive(false)
  }, [])

  const isLoading = servicesLoading || categoriesLoading
  const combinedError = servicesError || categoriesError
  const hasAnyServices = services.length > 0

  const renderFilterButton = (value: string, label: string, count: number) => (
    <button
      key={value}
      type="button"
      onClick={() => void setCategoryFilter(value)}
      className={cn(
        'flex w-full items-center justify-between border border-border px-3 py-3 text-sm font-medium transition rounded-none bg-card',
        categoryFilter === value
          ? 'border-primary text-primary bg-primary/5'
          : 'hover:border-primary/40 hover:text-primary'
      )}
      aria-pressed={categoryFilter === value}
      title={label}
    >
      <span className="truncate">{label}</span>
      <span
        className={cn(
          'ml-3 rounded-full px-2 py-0.5 text-xs',
          categoryFilter === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        {count}
      </span>
    </button>
  )

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1440px] px-14 py-10 space-y-10">
        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <Scissors className="h-8 w-8 text-muted-foreground" />
                <span className="uppercase">{t('navigation.services', 'Услуги')}</span>
              </div>
            </div>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="bg-card shadow-none border-border hover:bg-muted" onClick={() => void navigate('/services/service-categories')}>
                {t('servicesPage.manageCategories')}
              </Button>
              <Button onClick={() => void navigate('/services/create')} className="bg-success text-success-foreground hover:bg-success/90">
                <Plus className="mr-2 h-4 w-4" />
                {t('services.addService')}
              </Button>
            </div>
          }
        />

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="self-start space-y-4">
            <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
              <CardContent className="space-y-5 p-5">
                <div className="space-y-1">
                  <p className="text-base font-medium text-foreground">{t('servicesPage.filters')}</p>
                  <p className="text-sm text-muted-foreground">{t('services.subtitle')}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('servicesPage.searchPlaceholder')}
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      type="text"
                      value={searchTerm}
                      onChange={event => setSearchTerm(event.target.value)}
                      placeholder={t('servicesPage.searchPlaceholder')}
                      className="w-full border-0 border-b border-border/60 bg-transparent pl-10 pr-3 text-sm focus:border-primary/40 focus:outline-none focus:ring-0 rounded-none"
                    />
                  </div>
                </div>
                <label
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between border-0 border-t border-border bg-transparent px-0 py-3 text-left transition',
                    showOnlyActive ? 'text-primary' : ''
                  )}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{t('servicesPage.onlyActiveLabel')}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className={cn(showOnlyActive ? 'text-primary font-medium' : '')}>
                        {t('servicesPage.status.active')}
                      </span>
                      <span className="px-1 text-muted-foreground/50">·</span>
                      <span className={cn(!showOnlyActive ? 'text-primary font-medium' : '')}>
                        {t('servicesPage.status.inactive')}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Switch
                      checked={showOnlyActive}
                      onCheckedChange={value => setShowOnlyActive(Boolean(value))}
                      aria-label={t('servicesPage.onlyActiveLabel')}
                    />
                  </div>
                </label>
                <Button variant="ghost" className="w-full justify-between px-0 text-sm text-primary hover:bg-transparent hover:underline" onClick={() => void handleResetFilters()}>
                  {t('servicesPage.resetFilters')}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
              <CardContent className="space-y-4 p-5">
                <div className="space-y-1">
                  <p className="text-base font-medium text-foreground">{t('serviceCategories.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('serviceCategories.subtitle', { count: categoryCounts.total })}</p>
                </div>
                <div className="space-y-2">
                  {renderFilterButton('all', t('servicesPage.filterAll'), categoryCounts.total)}
                  {categories.map(category =>
                    renderFilterButton(category.id, category.name, categoryCounts.counts[category.id] ?? 0)
                  )}
                  {renderFilterButton(
                    'uncategorized',
                    t('servicesPage.filterUncategorized'),
                    categoryCounts.counts['uncategorized'] ?? 0
                  )}
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="space-y-6">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && combinedError && (
              <Card className="border-0 border-t border-error/30 bg-error/5">
                <CardContent className="p-6 text-center text-sm text-error">{combinedError}</CardContent>
              </Card>
            )}

            {!isLoading && !combinedError && groupedCategories.length > 0 && (
              <div className="space-y-6">
                {groupedCategories.map(group => {
                  const groupTotal =
                    group.subcategories.reduce((sum, entry) => sum + entry.services.length, 0) +
                    group.uncategorizedServices.length

                  return (
                    <section
                      key={group.category?.id ?? 'uncategorized'}
                      className="space-y-5 border-0 border-t border-border bg-transparent p-0"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-medium text-foreground">
                              {group.category ? group.category.name : t('servicesPage.uncategorized')}
                            </h2>
                            {group.category && !group.category.isActive && (
                              <Badge variant="outline" className="text-xs uppercase border-warning text-warning">
                                {t('servicesPage.badges.inactiveCategory')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t('serviceCategories.subtitle', { count: groupTotal })}
                          </p>
                        </div>
                      </div>

                      {group.subcategories.map(({ data, services: subcategoryServices }) => (
                        <div key={data.id} className="space-y-4">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-foreground">{data.name}</h3>
                            {!data.isActive && (
                              <Badge variant="outline" className="text-xs uppercase border-warning text-warning">
                                {t('servicesPage.badges.inactiveSubcategory')}
                              </Badge>
                            )}
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                            {subcategoryServices.map(service => (
                              <ServiceCardItem
                                key={service.id}
                                service={service}
                                formatPrice={formatPrice}
                                onEdit={() => void handleEdit(service.id)}
                                onDelete={() => void handleDelete(service)}
                                onToggle={nextValue => void handleToggleService(service, nextValue)}
                                isMutating={Boolean(mutatingServices[service.id])}
                                t={t}
                              />
                            ))}
                          </div>
                        </div>
                      ))}

                      {group.uncategorizedServices.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-foreground">
                            {t('servicesPage.withoutSubcategory')}
                          </h3>
                          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                            {group.uncategorizedServices.map(service => (
                              <ServiceCardItem
                                key={service.id}
                                service={service}
                                formatPrice={formatPrice}
                                onEdit={() => void handleEdit(service.id)}
                                onDelete={() => void handleDelete(service)}
                                onToggle={nextValue => void handleToggleService(service, nextValue)}
                                isMutating={Boolean(mutatingServices[service.id])}
                                t={t}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>
            )}

            {!isLoading && !combinedError && groupedCategories.length === 0 && (
              <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <p className="text-base font-medium text-foreground">
                    {hasAnyServices ? t('servicesPage.emptyFilteredTitle') : t('services.emptyTitle')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {hasAnyServices ? t('servicesPage.emptyFilteredDescription') : t('services.emptyDescription')}
                  </p>
                  <Button onClick={() => void navigate('/services/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('services.addService')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
