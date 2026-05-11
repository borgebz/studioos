import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { paths } from '@/app/paths'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const DISMISSED_KEY = 'profileSetupDismissed'

export function ProfileSetupPrompt() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    if (user.profile?.display_name) return
    if (sessionStorage.getItem(DISMISSED_KEY)) return
    setOpen(true)
  }, [user])

  const handleSetup = () => {
    setOpen(false)
    navigate(paths.accountSettings)
  }

  const handleDismiss = () => {
    setOpen(false)
    sessionStorage.setItem(DISMISSED_KEY, '1')
  }

  const initials = (user?.full_name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <Avatar className="h-20 w-20">
              {user?.profile?.photo_url && (
                <AvatarImage
                  src={user.profile.photo_url}
                  alt={user.full_name}
                />
              )}
              <AvatarFallback className="text-xl">
                {initials || <User className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
          </div>
          <DialogTitle className="text-center">
            {t('account.setupTitle')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t('account.setupDesc')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleSetup} className="w-full">
            {t('account.setupAction')}
          </Button>
          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="w-full"
          >
            {t('account.setupDismiss')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
