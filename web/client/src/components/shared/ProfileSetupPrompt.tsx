import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Camera, Sparkles } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { paths } from '@/app/paths'
import { getInitials } from '@/lib/user-utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

  const initials = getInitials(user?.full_name)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0" showCloseButton={false}>
        <div className="relative bg-background before:absolute before:inset-0 before:rounded-[inherit] before:bg-primary/5 px-6 pt-8 pb-12">
          <Sparkles className="absolute top-4 right-6 h-5 w-5 text-primary/40" />
          <Sparkles className="absolute top-8 left-8 h-3 w-3 text-primary/25 rotate-12" />
          <div className="relative flex justify-center">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                {user?.profile?.photo_url && (
                  <AvatarImage
                    src={user.profile.photo_url}
                    alt={user.full_name}
                  />
                )}
                <AvatarFallback className="text-2xl bg-muted text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Camera className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 pt-4">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-center text-xl">
              {t('account.setupTitle')}
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed">
              {t('account.setupDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button onClick={handleSetup} className="w-full" size="lg">
              {t('account.setupAction')}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="w-full text-muted-foreground"
              size="sm"
            >
              {t('account.setupDismiss')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
