import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { paths } from '@/app/paths'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  CalendarDays,
  Camera,
  ClipboardList,
  ExternalLink,
  Globe,
  GraduationCap,
  LogIn,
  Plus,
  Settings,
  Sparkles,
  User,
} from 'lucide-react'

const pages = [
  {
    to: paths.landing,
    label: 'Landing Page',
    description: 'Public landing page with school info and StudioOS features.',
    icon: Globe,
  },
  {
    to: `${paths.login}?preview`,
    label: 'Login',
    description: 'Authentication page with editorial branding.',
    icon: LogIn,
  },
  {
    to: paths.enrollment,
    label: 'Enrollment',
    description: 'Public sign-up form for students and guardians.',
    icon: GraduationCap,
  },
  {
    to: paths.coachingsCreate,
    label: 'Create Coaching',
    description: 'Multi-section form to schedule a coaching session.',
    icon: Plus,
  },
  {
    to: paths.calendar,
    label: 'Calendar',
    description: 'Weekly schedule calendar view.',
    icon: CalendarDays,
  },
  {
    to: paths.accountSettings,
    label: 'Account Settings',
    description: 'Profile editing and user account management.',
    icon: Settings,
  },
  {
    to: paths.home,
    label: 'Home',
    description: 'Dashboard home page.',
    icon: ClipboardList,
  },
] as const

export function DesignSystemIndexPage() {
  const { t } = useTranslation()
  const [profilePromptOpen, setProfilePromptOpen] = useState(false)

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.title')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.subtitle')}
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Pages
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {pages.map(({ to, label, description, icon: Icon }) => (
            <Link key={to} to={to}>
              <div className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent/50">
                <div className="flex items-start justify-between">
                  <Icon className="mb-3 size-8 text-muted-foreground" />
                  <ExternalLink className="size-4 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-foreground">{label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
                <span className="mt-2 inline-block text-sm text-primary hover:underline">
                  View page →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Dialogs
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setProfilePromptOpen(true)}
            className="rounded-lg border border-border bg-card p-6 text-left transition-colors hover:bg-accent/50"
          >
            <User className="mb-3 size-8 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Profile Setup Prompt</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Post-onboarding dialog nudging users to complete their profile.
            </p>
            <span className="mt-2 inline-block text-sm text-primary">
              Open dialog →
            </span>
          </button>
        </div>

        {/* Profile Setup Prompt Dialog */}
        <Dialog open={profilePromptOpen} onOpenChange={setProfilePromptOpen}>
          <DialogContent className="sm:max-w-md overflow-hidden p-0" showCloseButton={false}>
            <div className="relative bg-primary/5 px-6 pt-8 pb-12">
              <Sparkles className="absolute top-4 right-6 h-5 w-5 text-primary/40" />
              <Sparkles className="absolute top-8 left-8 h-3 w-3 text-primary/25 rotate-12" />
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      ?
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
                <Button onClick={() => setProfilePromptOpen(false)} className="w-full" size="lg">
                  {t('account.setupAction')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setProfilePromptOpen(false)}
                  className="w-full text-muted-foreground"
                  size="sm"
                >
                  {t('account.setupDismiss')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </section>

    </div>
  )
}
