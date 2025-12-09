import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label
} from '@beauty-platform/ui'
import { Loader2, UserPlus } from 'lucide-react'

interface AddCoOwnerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (userId: string, share: number) => Promise<void>
}

export const AddCoOwnerModal: React.FC<AddCoOwnerModalProps> = ({
  open,
  onOpenChange,
  onConfirm
}) => {
  const { t } = useTranslation()
  const [userId, setUserId] = useState('')
  const [share, setShare] = useState(50)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!userId.trim()) {
      setError(t('settings.roleManagement.addCoOwnerModal.userIdRequired', 'User ID is required'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onConfirm(userId, share)
      // Reset form
      setUserId('')
      setShare(50)
      onOpenChange(false)
    } catch (err: any) {
      const errorMessage = err?.message || t('settings.roleManagement.addCoOwnerModal.error', 'Failed to add co-owner')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setUserId('')
    setShare(50)
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('settings.roleManagement.addCoOwnerModal.title', 'Add Co-Owner')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'settings.roleManagement.addCoOwnerModal.description',
              'Add a new co-owner to this salon with ownership share percentage'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="userId">
              {t('settings.roleManagement.addCoOwnerModal.userIdLabel', 'User ID')}
            </Label>
            <Input
              id="userId"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder={t(
                'settings.roleManagement.addCoOwnerModal.userIdPlaceholder',
                'Enter user ID (e.g., cm...)'
              )}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {t(
                'settings.roleManagement.addCoOwnerModal.userIdHint',
                'You can find user ID in the staff list or user profile'
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="share">
              {t('settings.roleManagement.addCoOwnerModal.shareLabel', 'Ownership Share')}
              {' '}
              <span className="text-base font-semibold text-primary">{share}%</span>
            </Label>
            <input
              id="share"
              type="range"
              value={share}
              onChange={e => setShare(parseInt(e.target.value))}
              min={1}
              max={100}
              step={1}
              disabled={loading}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
            />
            <p className="text-xs text-muted-foreground">
              {t(
                'settings.roleManagement.addCoOwnerModal.shareHint',
                'Ownership share determines profit distribution percentage'
              )}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            {t('settings.roleManagement.addCoOwnerModal.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('settings.roleManagement.addCoOwnerModal.adding', 'Adding...')}
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                {t('settings.roleManagement.addCoOwnerModal.add', 'Add Co-Owner')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
