import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function AvatarPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.avatar')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.avatarSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* With image */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.avatarWithImage')}
          </h2>
          <div className="flex items-center gap-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://api.dicebear.com/9.x/initials/svg?seed=AB" alt="AB" />
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar className="h-10 w-10">
              <AvatarImage src="https://api.dicebear.com/9.x/initials/svg?seed=CD" alt="CD" />
              <AvatarFallback>CD</AvatarFallback>
            </Avatar>
            <Avatar className="h-16 w-16">
              <AvatarImage src="https://api.dicebear.com/9.x/initials/svg?seed=EF" alt="EF" />
              <AvatarFallback>EF</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Fallback initials */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.avatarFallback')}
          </h2>
          <div className="flex items-center gap-4">
            <Avatar className="h-8 w-8">
              <AvatarFallback>JB</AvatarFallback>
            </Avatar>
            <Avatar className="h-10 w-10">
              <AvatarFallback>MA</AvatarFallback>
            </Avatar>
            <Avatar className="h-16 w-16">
              <AvatarFallback>LS</AvatarFallback>
            </Avatar>
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-xl">RP</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Sizes */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.sizes')}
          </h2>
          <div className="flex items-end gap-4">
            {[
              { size: 'h-6 w-6', label: '24px', initials: 'XS' },
              { size: 'h-8 w-8', label: '32px', initials: 'SM' },
              { size: 'h-10 w-10', label: '40px', initials: 'MD' },
              { size: 'h-16 w-16', label: '64px', initials: 'LG' },
              { size: 'h-24 w-24', label: '96px', initials: 'XL' },
            ].map(({ size, label, initials }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <Avatar className={size}>
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Group */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.avatarGroup')}
          </h2>
          <div className="flex -space-x-3">
            {['JB', 'MA', 'LS', 'RP', 'CF'].map((initials) => (
              <Avatar
                key={initials}
                className="h-10 w-10 border-2 border-background"
              >
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
