import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  PageContainer
} from '@beauty-platform/ui'
import { Building2, CheckCircle, Loader2, QrCode, Sparkles } from 'lucide-react'
import ClientLayout from '../components/ClientLayout'
import { clientApi } from '../services'
import { useAuth } from '../hooks/useAuth'

export default function AddSalonPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ salonName: string } | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedCode = code.trim().toUpperCase()
    if (!normalizedCode) {
      setError(t('pages.addSalon.errors.empty'))
      setSuccess(null)
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await clientApi.joinSalonByCode(normalizedCode)
      if (!response.success) {
        throw new Error(response.error || 'INVITE_FAILED')
      }

      const salonName = (response.data as any)?.salon?.name ?? t('pages.addSalon.success.genericSalon')
      setSuccess({ salonName })
      setCode('')
      await refreshProfile()
    } catch (joinError: any) {
      const message = joinError?.message || 'INVITE_FAILED'
      if (message.includes('SALON_ALREADY_ADDED')) {
        // Salon already in the list - show info message instead of error
        setError(joinError?.data?.message || t('pages.addSalon.errors.alreadyAdded'))
      } else if (message.includes('INVITE_EXPIRED')) {
        setError(t('pages.addSalon.errors.expired'))
      } else if (message.includes('INVITE_LIMIT')) {
        setError(t('pages.addSalon.errors.limit'))
      } else if (message.includes('INVITE_NOT_FOUND')) {
        setError(t('pages.addSalon.errors.invalid'))
      } else {
        setError(t('pages.addSalon.errors.generic'))
      }
      setSuccess(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ClientLayout>
      <PageContainer variant="standard" maxWidth="6xl" className="space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Badge variant="outline" className="border-primary/40 text-primary">
            <Sparkles className="h-3 w-3" />
            {t('pages.addSalon.badge')}
          </Badge>
          <h1 className="text-3xl font-semibold text-foreground">
            {t('pages.addSalon.title')}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t('pages.addSalon.subtitle')}
          </p>
        </div>

        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <QrCode className="h-5 w-5 text-primary" />
              {t('pages.addSalon.form.title')}
            </CardTitle>
            <CardDescription>
              {t('pages.addSalon.form.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="mb-6 rounded-lg border border-success/40 bg-success/10 p-4 text-sm text-success">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  {t('pages.addSalon.success.title', { salon: success.salonName })}
                </div>
                <p className="mt-1 text-success/80">
                  {t('pages.addSalon.success.description')}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => navigate('/my-salons')}>{t('pages.addSalon.success.viewSalons')}</Button>
                  <Button variant="outline" onClick={() => setSuccess(null)}>
                    {t('pages.addSalon.success.addAnother')}
                  </Button>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="invite-code">{t('pages.addSalon.form.codeLabel')}</Label>
                <Input
                  id="invite-code"
                  value={code}
                  onChange={event => setCode(event.target.value.toUpperCase())}
                  placeholder={t('pages.addSalon.form.codePlaceholder')}
                  maxLength={16}
                  autoComplete="off"
                  spellCheck={false}
                  className="tracking-[0.3em] text-center text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  {t('pages.addSalon.form.helper')}
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('pages.addSalon.form.submitting')}
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4" />
                      {t('pages.addSalon.form.submit')}
                    </>
                  )}
                </Button>
                <Button variant="outline" type="button" onClick={() => navigate('/my-salons')}>
                  {t('pages.addSalon.form.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageContainer>
    </ClientLayout>
  )
}
