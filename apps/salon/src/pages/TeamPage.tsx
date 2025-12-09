import {
  Card,
  CardContent,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  PageContainer,
  Input,
  SidebarTrigger,
} from '@beauty-platform/ui'
import { Plus, Users, UserPlus, Filter, Search, AlertCircle } from 'lucide-react'
import { useStaff } from '../hooks/useStaff'
import { useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TeamMemberCard } from '../components/team/TeamMemberCard'
import { PageHeader } from '../components/layout/PageHeader'

const BILLABLE_ROLES = ['MANAGER', 'STAFF_MEMBER', 'RECEPTIONIST', 'ACCOUNTANT']

export default function TeamPage(): JSX.Element {
  // Показываем всех сотрудников, включая не-доступных для записи (isBookable=false)
  const { staff, loading, error, refetch } = useStaff({ bookableOnly: false })
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [specializationFilter, setSpecializationFilter] = useState('all')
  const [languagesFilter, setLanguagesFilter] = useState<string[]>([])

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('team.filters.allStatuses') },
      { value: 'ACTIVE', label: t('common.active') },
      { value: 'INACTIVE', label: t('common.inactive') },
    ],
    [t],
  )

  const roleOptions = useMemo(
    () => [
      { value: 'all', label: t('team.filters.allRoles') },
      { value: 'SALON_OWNER', label: t('team.roles.SALON_OWNER') },
      { value: 'MANAGER', label: t('team.roles.MANAGER') },
      { value: 'STAFF_MEMBER', label: t('team.roles.STAFF_MEMBER') },
      { value: 'RECEPTIONIST', label: t('team.roles.RECEPTIONIST') },
      { value: 'ACCOUNTANT', label: t('team.roles.ACCOUNTANT') },
    ],
    [t],
  )

  // Issue #82: Specialization options
  const specializationOptions = useMemo(
    () => [
      { value: 'all', label: 'Все специальности' },
      { value: 'BARBER', label: 'Барбер' },
      { value: 'STYLIST', label: 'Стилист' },
      { value: 'NAIL_MASTER', label: 'Мастер маникюра' },
      { value: 'COLORIST', label: 'Колорист' },
      { value: 'GROOMER', label: 'Груммер' },
      { value: 'MAKEUP_ARTIST', label: 'Визажист' },
      { value: 'MASSAGE_THERAPIST', label: 'Массажист' },
      { value: 'AESTHETIC_SPECIALIST', label: 'Эстетолог' },
      { value: 'PIERCER', label: 'Пирсер' },
      { value: 'TATTOO_ARTIST', label: 'Татуировщик' },
    ],
    [],
  )

  // Issue #82: Language options
  const languageOptions = useMemo(
    () => [
      { value: 'pl', label: '🇵🇱 Польский' },
      { value: 'en', label: '🇬🇧 Английский' },
      { value: 'ru', label: '🇷🇺 Русский' },
      { value: 'ua', label: '🇺🇦 Украинский' },
    ],
    [],
  )

  const filteredStaff = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return staff.filter((member) => {
      const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.toLowerCase()
      const email = member.email?.toLowerCase() ?? ''
      const matchesSearch = !query || fullName.includes(query) || email.includes(query)
      const matchesRole = roleFilter === 'all' || member.role === roleFilter
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter

      // Issue #82: Filter by specialization
      const memberSpecialization = member.specialization
      const matchesSpecialization = specializationFilter === 'all' || memberSpecialization === specializationFilter

      // Issue #82: Filter by languages
      const memberLanguages = member.languages || []
      const matchesLanguages = languagesFilter.length === 0 || languagesFilter.some(lang => memberLanguages.includes(lang))

      return matchesSearch && matchesRole && matchesStatus && matchesSpecialization && matchesLanguages
    })
  }, [staff, searchQuery, roleFilter, statusFilter, specializationFilter, languagesFilter])

  const billableStaffCount = useMemo(
    () => staff.filter((member) => BILLABLE_ROLES.includes(member.role)).length,
    [staff],
  )

  const renderSelect = (value: string, onChange: (val: string) => void, placeholder: string, options: { value: string; label: string }[]) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full rounded-none border border-border bg-card shadow-none hover:border-primary/40">
        <Filter className="mr-2 h-4 w-4 text-muted-foreground/70" />
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const filterSelects = (
    <div className="grid gap-2 md:grid-cols-4">
      {renderSelect(roleFilter, setRoleFilter, t('team.filters.role'), roleOptions)}
      {renderSelect(statusFilter, setStatusFilter, t('team.filters.status'), statusOptions)}
      {renderSelect(specializationFilter, setSpecializationFilter, 'Специальность', specializationOptions)}
      {renderSelect(languagesFilter.length > 0 ? languagesFilter[0] : 'all', (value) => setLanguagesFilter(value === 'all' ? [] : [value]), 'Язык', [
        { value: 'all', label: 'Все языки' },
        ...languageOptions
      ])}
    </div>
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
                <Users className="h-8 w-8 text-muted-foreground" />
                <span className="uppercase">{t('navigation.team', 'Команда')}</span>
              </div>
            </div>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => void navigate('/team/invite')} className="bg-card shadow-none border-border hover:bg-muted">
                <UserPlus className="mr-2 h-4 w-4" />
                {t('team.inviteEmployee')}
              </Button>
              <Button onClick={() => void navigate('/team/add')} className="bg-success text-success-foreground hover:bg-success/90">
                <Plus className="mr-2 h-4 w-4" />
                {t('team.addEmployee')}
              </Button>
            </div>
          }
        />

        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardContent className="space-y-4 p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('team.searchPlaceholder')}
                className="w-full border-0 border-b border-border/60 bg-transparent py-2 pl-10 pr-4 text-sm focus:border-primary/40 focus:outline-none focus:ring-0 rounded-none"
              />
            </div>
            {filterSelects}
          </CardContent>
        </Card>

        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between text-sm">
            <div className="text-muted-foreground">
              Дополнительные платные сотрудники:{' '}
              <span className="font-medium text-foreground">{billableStaffCount}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Следующий счет сформируется исходя из этого числа.
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        )}

        {error && (
          <Card className="rounded-none border-0 border-t border-error/30 bg-error/5 shadow-none">
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
                <AlertCircle className="h-6 w-6 text-error" />
              </div>
              <p className="text-base font-medium text-foreground">{t('team.error.title')}</p>
              <p className="text-sm text-error">{error}</p>
              <Button onClick={() => void refetch()} variant="outline">
                {t('team.error.retry')}
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredStaff.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  t={t}
                  onOpenProfile={() => void navigate(`/team/${member.id}`)}
                />
              ))}
            </div>

            {filteredStaff.length === 0 && (
              <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
                <CardContent className="text-center space-y-4 p-10">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Users className="h-10 w-10 text-muted-foreground/70" />
                  </div>
                  <p className="text-base font-medium text-foreground">
                    {staff.length === 0 ? t('team.empty.title') : t('team.empty.filteredTitle')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {staff.length === 0 ? t('team.empty.subtitle') : t('team.empty.filterSubtitle')}
                  </p>
                  {staff.length === 0 && (
                    <Button onClick={() => void navigate('/team/add')}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('team.addEmployee')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PageContainer>
  )
}
