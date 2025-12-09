import { Card, CardContent, CardTitle, Badge, withOpacity } from '@beauty-platform/ui'
import { Mail, Phone, Shield, Scissors, Users, Languages, Star } from 'lucide-react'
import type { StaffMember } from '../../hooks/useStaff'
import type { TFunction } from 'i18next'
import { useEffect, useMemo, useState } from 'react'

const roleIcons: Record<string, any> = {
  SALON_OWNER: Shield,
  MANAGER: Shield,
  STAFF_MEMBER: Scissors,
  RECEPTIONIST: Users,
  ACCOUNTANT: Users,
}

const languageFlags: Record<string, string> = {
  pl: '🇵🇱',
  en: '🇬🇧',
  ru: '🇷🇺',
  ua: '🇺🇦',
}

const specializationLabels: Record<string, string> = {
  BARBER: 'Барбер',
  STYLIST: 'Стилист',
  NAIL_MASTER: 'Мастер маникюра',
  COLORIST: 'Колорист',
  GROOMER: 'Груммер',
  MAKEUP_ARTIST: 'Визажист',
  MASSAGE_THERAPIST: 'Массажист',
  AESTHETIC_SPECIALIST: 'Эстетолог',
  PIERCER: 'Пирсер',
  TATTOO_ARTIST: 'Татуировщик',
}

interface TeamMemberCardProps {
  member: StaffMember
  onOpenProfile: () => void
  t: TFunction
}

export function TeamMemberCard({ member, onOpenProfile, t }: TeamMemberCardProps) {
  const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
  const initials = useMemo(() => {
    const first = member.firstName?.charAt(0) ?? ''
    const last = member.lastName?.charAt(0) ?? (member.firstName?.charAt(1) ?? '')
    return `${first}${last}`.toUpperCase() || '??'
  }, [member.firstName, member.lastName])

  const [avatarFailed, setAvatarFailed] = useState(false)

  useEffect(() => {
    setAvatarFailed(false)
  }, [member.avatarUrl])

  const joinDate = member.createdAt ? new Date(member.createdAt) : null
  const monthsInCompany = joinDate ? Math.max(0, Math.round((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30))) : null
  const isActive = (member.status ?? '').toUpperCase() === 'ACTIVE' && member.isActive !== false
  const accentColor = isActive ? member.color || '#6366f1' : '#e5e7eb'
  const accentSoft = withOpacity(accentColor, isActive ? 0.12 : 0.35)
  const accentBorder = withOpacity(accentColor, isActive ? 0.35 : 0.55)
  // accentShadow removed since we no longer render card shadows

  const RoleIcon = roleIcons[member.role] ?? Shield

  const spokenLanguages = Array.isArray(member.languages) && member.languages.length
    ? member.languages
    : member.permissions?.filter((perm) => perm.startsWith('lang:')).map((perm) => perm.replace('lang:', '')) ?? []
  const displayLanguages = spokenLanguages.length ? Array.from(new Set(spokenLanguages.map((l) => l.toLowerCase()))) : ['pl']
  const specializationLabel = member.specialization ? specializationLabels[member.specialization] ?? member.specialization : null

  return (
    <Card
      className="group cursor-pointer border-0 border-t border-border bg-transparent shadow-none transition hover:bg-muted/40"
      onClick={onOpenProfile}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2"
              style={{
                borderColor: accentBorder,
                backgroundColor: accentSoft
              }}
            >
              {member.avatarUrl && !avatarFailed ? (
                <img
                  src={member.avatarUrl}
                  alt={fullName || member.email || 'Staff avatar'}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span className="text-lg font-medium text-foreground">{initials}</span>
              )}
            </div>
          </div>

          <div>
            <CardTitle className="text-lg font-medium text-foreground">
              {fullName || t('team.card.unknownName')}
            </CardTitle>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <Badge
                variant="outline"
                style={{ backgroundColor: accentSoft, borderColor: accentBorder, color: accentColor }}
              >
                <RoleIcon className="mr-1 h-3 w-3" />
                {t(`team.roles.${member.role}`)}
              </Badge>
              {specializationLabel && (
                <Badge variant="secondary" className="bg-muted">
                  {specializationLabel}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-3 text-foreground">
            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-foreground">—</span>
            </div>
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground/70" />
              <div className="flex flex-wrap gap-1">
                {displayLanguages.map((lang) => (
                  <Badge
                    key={lang}
                    variant="outline"
                    className="px-2 py-1 text-xs"
                    style={{ borderColor: accentBorder }}
                  >
                    {languageFlags[lang.toLowerCase()] || '🌐'} {lang.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-border pt-2 text-center">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{t('team.card.services', 'Услуг')}</span>
              <div className="font-medium text-foreground">0</div>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{t('team.card.experience', 'Месяцев')}</span>
              <div className="font-medium text-foreground">
                {monthsInCompany !== null ? monthsInCompany : '—'}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{t('team.card.growth', 'Рост')}</span>
              <div className="font-medium text-foreground">—</div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            {member.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground/70" />
                <span>{member.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground/70" />
              <span className="truncate">{member.email}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TeamMemberCard
