import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@beauty-platform/ui'
import { MoreHorizontal, UserPlus, UserMinus, ShieldCheck } from 'lucide-react'
import type { TenantRole } from '../../hooks/useAuth'

interface RoleActionsMenuProps {
  memberId: string
  memberName: string
  currentRoles: TenantRole[]
  onGrantRole: (userId: string, role: TenantRole) => Promise<void>
  onRevokeRole: (userId: string, role: TenantRole) => Promise<void>
  canGrantOwner: boolean
}

export const RoleActionsMenu: React.FC<RoleActionsMenuProps> = ({
  memberId,
  memberName,
  currentRoles,
  onGrantRole,
  onRevokeRole,
  canGrantOwner
}) => {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'grant' | 'revoke'
    role: TenantRole
  } | null>(null)

  const allRoles: TenantRole[] = ['OWNER', 'MANAGER', 'STAFF', 'RECEPTIONIST', 'ACCOUNTANT']
  const availableToGrant = allRoles.filter(role => {
    if (role === 'OWNER' && !canGrantOwner) return false
    return !currentRoles.includes(role)
  })
  const availableToRevoke = currentRoles

  const handleGrantClick = (role: TenantRole) => {
    if (role === 'OWNER') {
      setConfirmAction({ type: 'grant', role })
      setConfirmOpen(true)
    } else {
      void onGrantRole(memberId, role)
    }
  }

  const handleRevokeClick = (role: TenantRole) => {
    if (role === 'OWNER' || role === 'MANAGER') {
      setConfirmAction({ type: 'revoke', role })
      setConfirmOpen(true)
    } else {
      void onRevokeRole(memberId, role)
    }
  }

  const handleConfirm = async () => {
    if (!confirmAction) return

    try {
      if (confirmAction.type === 'grant') {
        await onGrantRole(memberId, confirmAction.role)
      } else {
        await onRevokeRole(memberId, confirmAction.role)
      }
    } finally {
      setConfirmOpen(false)
      setConfirmAction(null)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <span className="sr-only">{t('settings.roleManagement.openMenu', 'Open menu')}</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            {t('settings.roleManagement.manageRoles', 'Manage Roles')}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {availableToGrant.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <UserPlus className="mr-2 h-4 w-4" />
                <span>{t('settings.roleManagement.grantRole', 'Grant Role')}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {availableToGrant.map(role => (
                  <DropdownMenuItem key={role} onClick={() => handleGrantClick(role)}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {t(`tenantSwitcher.roles.${role.toLowerCase()}`, role)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {availableToRevoke.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <UserMinus className="mr-2 h-4 w-4" />
                <span>{t('settings.roleManagement.revokeRole', 'Revoke Role')}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {availableToRevoke.map(role => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => handleRevokeClick(role)}
                    className="text-destructive"
                  >
                    <UserMinus className="mr-2 h-4 w-4" />
                    {t(`tenantSwitcher.roles.${role.toLowerCase()}`, role)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {availableToGrant.length === 0 && availableToRevoke.length === 0 && (
            <DropdownMenuItem disabled>
              {t('settings.roleManagement.noActionsAvailable', 'No actions available')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === 'grant'
                ? t('settings.roleManagement.confirmGrantTitle', 'Confirm Grant Role')
                : t('settings.roleManagement.confirmRevokeTitle', 'Confirm Revoke Role')}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'grant'
                ? t(
                    'settings.roleManagement.confirmGrantDescription',
                    'Are you sure you want to grant {{role}} role to {{name}}? This will give them elevated permissions.',
                    {
                      role: confirmAction?.role,
                      name: memberName
                    }
                  )
                : t(
                    'settings.roleManagement.confirmRevokeDescription',
                    'Are you sure you want to revoke {{role}} role from {{name}}? They will lose associated permissions.',
                    {
                      role: confirmAction?.role,
                      name: memberName
                    }
                  )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t('settings.roleManagement.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleConfirm}>
              {t('settings.roleManagement.confirm', 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
