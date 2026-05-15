import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Settings, UserPlus } from 'lucide-react'

export function DialogPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.dialog')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.dialogSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Basic with form */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.dialogWithForm')}
          </h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-2" />
                {t('designSystem.dialogCreate')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t('designSystem.dialogCreateTitle')}</DialogTitle>
                <DialogDescription>
                  {t('designSystem.dialogCreateDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('designSystem.dialogName')}</Label>
                  <Input id="name" placeholder={t('designSystem.dialogNamePlaceholder')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t('designSystem.dialogDescription')}</Label>
                  <Textarea id="description" placeholder={t('designSystem.dialogDescPlaceholder')} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">{t('designSystem.alertDialogCancel')}</Button>
                <Button>{t('designSystem.dialogSave')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Settings dialog */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.dialogSettings')}
          </h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="size-4 mr-2" />
                {t('designSystem.dialogOpenSettings')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t('designSystem.dialogSettingsTitle')}</DialogTitle>
                <DialogDescription>
                  {t('designSystem.dialogSettingsDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name">{t('designSystem.dialogDisplayName')}</Label>
                  <Input id="display-name" defaultValue="StudioOS" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('designSystem.dialogEmail')}</Label>
                  <Input id="email" type="email" defaultValue="info@studioos.dev" />
                </div>
              </div>
              <DialogFooter>
                <Button>{t('designSystem.dialogSaveChanges')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Add participant dialog */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.dialogComplex')}
          </h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <UserPlus className="size-4 mr-2" />
                {t('designSystem.dialogAddParticipant')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t('designSystem.dialogAddParticipantTitle')}</DialogTitle>
                <DialogDescription>
                  {t('designSystem.dialogAddParticipantDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="search">{t('designSystem.dialogSearch')}</Label>
                  <Input id="search" placeholder={t('designSystem.dialogSearchPlaceholder')} />
                </div>
                <div className="rounded-md border border-border p-3 text-sm text-muted-foreground text-center">
                  {t('designSystem.dialogNoResults')}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">{t('designSystem.alertDialogCancel')}</Button>
                <Button disabled>{t('designSystem.dialogAdd')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

      </section>
    </div>
  )
}
