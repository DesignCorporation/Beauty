import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  PageContainer
} from '@beauty-platform/ui'
import { Building2, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '../utils/api-client'

export default function AddExistingSalonPage(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ salonName: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const normalizedCode = code.trim().toUpperCase()
    if (!normalizedCode) {
      toast.error(t('addSalon.errors.empty', 'Введите код приглашения'))
      return
    }

    setIsSubmitting(true)

    try {
      // Вызываем CRM API endpoint для присоединения владельца к салону по коду
      const response = await apiClient.post<{
        success: boolean
        salon?: { id: string; name: string }
        message?: string
        error?: string
      }>('/auth/salon/join-by-code', { code: normalizedCode })

      if (response.success && response.salon) {
        setSuccess({ salonName: response.salon.name })
        toast.success(
          t('addSalon.success.title', 'Салон добавлен!'),
          {
            description: t('addSalon.success.description', `Вы добавлены к салону "${response.salon.name}"`)
          }
        )
      } else {
        throw new Error(response.error || 'INVITE_FAILED')
      }
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'INVITE_FAILED'

      if (message.includes('INVITE_EXPIRED')) {
        toast.error(t('addSalon.errors.expired', 'Срок действия кода истёк'))
      } else if (message.includes('INVITE_LIMIT')) {
        toast.error(t('addSalon.errors.limit', 'Код больше не активен'))
      } else if (message.includes('INVITE_NOT_FOUND')) {
        toast.error(t('addSalon.errors.invalid', 'Неверный код приглашения'))
      } else if (message.includes('ALREADY_MEMBER')) {
        toast.info(t('addSalon.errors.alreadyMember', 'Вы уже являетесь участником этого салона'))
      } else {
        toast.error(t('addSalon.errors.generic', 'Не удалось добавить салон'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageContainer variant="standard" maxWidth="4xl" className="space-y-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border-2 border-primary/20 bg-primary/5">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-semibold text-foreground">
          {t('addSalon.title', 'Добавить существующий салон')}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t('addSalon.subtitle', 'Введите код приглашения от владельца салона, чтобы получить доступ к управлению')}
        </p>
      </div>

      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            {t('addSalon.form.title', 'Код приглашения')}
          </CardTitle>
          <CardDescription>
            {t('addSalon.form.description', 'Владелец салона может создать код приглашения в настройках и поделиться им с вами')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="mb-6 rounded-lg border border-success/40 bg-success/10 p-4 text-sm text-success">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {t('addSalon.success.title', 'Салон успешно добавлен!')}
              </div>
              <p className="mt-1 text-success/80">
                {t('addSalon.success.message', `Салон "${success.salonName}" теперь доступен в списке ваших салонов`)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => void navigate('/dashboard')}>
                  {t('addSalon.success.dashboard', 'Перейти к Dashboard')}
                </Button>
                <Button variant="outline" onClick={() => {
                  setSuccess(null)
                  setCode('')
                }}>
                  {t('addSalon.success.addAnother', 'Добавить ещё салон')}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={(d) => void handleSubmit(d)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="invite-code">
                  {t('addSalon.form.codeLabel', 'Код приглашения')}
                </Label>
                <Input
                  id="invite-code"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder={t('addSalon.form.codePlaceholder', 'XXXXX-XXXXX')}
                  maxLength={32}
                  autoComplete="off"
                  spellCheck={false}
                  className="text-center text-lg font-mono tracking-wider"
                />
                <p className="text-xs text-muted-foreground">
                  {t('addSalon.form.helper', 'Код состоит из букв и цифр (без учёта регистра)')}
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('addSalon.form.submitting', 'Проверка кода...')}
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4" />
                      {t('addSalon.form.submit', 'Добавить салон')}
                    </>
                  )}
                </Button>
                <Button variant="outline" type="button" onClick={() => void navigate('/dashboard')}>
                  {t('addSalon.form.cancel', 'Отмена')}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 rounded-lg border border-info/40 bg-info/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-info" />
              <div className="space-y-1 text-sm text-info-foreground">
                <p className="font-medium">
                  {t('addSalon.info.title', 'Как получить код?')}
                </p>
                <p className="text-info-foreground/80">
                  {t('addSalon.info.description', 'Попросите владельца салона перейти в "Настройки → Команда → Пригласить сотрудника" и поделиться кодом с вами')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
