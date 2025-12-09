import { FormEvent, useState } from 'react'
import { Button, Input, Label, Switch } from '@beauty-platform/ui'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface CategoryFormValues {
  name: string
  icon?: string
  isActive: boolean
}

interface CategoryFormProps {
  defaultValues?: CategoryFormValues
  loading?: boolean
  onSubmit: (values: CategoryFormValues) => Promise<void> | void
  onCancel: () => void
  submitLabel?: string
}

export function CategoryForm({
  defaultValues,
  loading = false,
  onSubmit,
  onCancel,
  submitLabel,
}: CategoryFormProps) {
  const { t } = useTranslation()
  const [values, setValues] = useState<CategoryFormValues>({
    name: defaultValues?.name ?? '',
    icon: defaultValues?.icon ?? '',
    isActive: defaultValues?.isActive ?? true,
  })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = values.name.trim()

    if (!trimmedName) {
      setError(t('serviceCategories.form.errors.requiredName'))
      return
    }

    try {
      const payload: CategoryFormValues = {
        name: trimmedName,
        isActive: values.isActive,
        ...(values.icon?.trim() ? { icon: values.icon.trim() } : {}),
      }

      await onSubmit(payload)
      setError(null)
    } catch (err) {
      console.error('Failed to submit category form', err)
      const message =
        err instanceof Error ? err.message : t('serviceCategories.form.errors.generic')
      setError(message)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {error && (
        <div className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="category-name">{t('serviceCategories.form.name')}</Label>
        <Input
          id="category-name"
          value={values.name}
          onChange={event => setValues(prev => ({ ...prev, name: event.target.value }))}
          placeholder={t('serviceCategories.form.namePlaceholder') ?? ''}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category-icon">
          {t('serviceCategories.form.icon')}
          <span className="ml-2 text-xs text-muted-foreground">
            {t('serviceCategories.form.iconHint')}
          </span>
        </Label>
        <Input
          id="category-icon"
          value={values.icon}
          onChange={event => setValues(prev => ({ ...prev, icon: event.target.value }))}
          placeholder={t('serviceCategories.form.iconPlaceholder') ?? ''}
          disabled={loading}
        />
      </div>

      <div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/40 p-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {t('serviceCategories.form.isActiveLabel')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('serviceCategories.form.isActiveHint')}
          </p>
        </div>
        <Switch
          checked={values.isActive}
          onCheckedChange={checked => setValues(prev => ({ ...prev, isActive: checked }))}
          disabled={loading}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          {t('serviceCategories.form.cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel ?? t('serviceCategories.form.save')}
        </Button>
      </div>
    </form>
  )
}
