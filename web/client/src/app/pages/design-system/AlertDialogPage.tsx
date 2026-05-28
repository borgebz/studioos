import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, LogOut, AlertTriangle } from 'lucide-react'

export function AlertDialogPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.alertDialog')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.alertDialogSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Destructive */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.alertDialogDestructive')}
          </h2>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="size-4 mr-2" />
                {t('designSystem.alertDialogDelete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('designSystem.alertDialogDeleteTitle')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('designSystem.alertDialogDeleteDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t('designSystem.alertDialogCancel')}
                </AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {t('designSystem.alertDialogConfirmDelete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Confirmation */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.alertDialogConfirmation')}
          </h2>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <LogOut className="size-4 mr-2" />
                {t('designSystem.alertDialogLogout')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('designSystem.alertDialogLogoutTitle')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('designSystem.alertDialogLogoutDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t('designSystem.alertDialogCancel')}
                </AlertDialogCancel>
                <AlertDialogAction>
                  {t('designSystem.alertDialogConfirmLogout')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Warning */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.alertDialogWarning')}
          </h2>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <AlertTriangle className="size-4 mr-2" />
                {t('designSystem.alertDialogDiscard')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('designSystem.alertDialogDiscardTitle')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('designSystem.alertDialogDiscardDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t('designSystem.alertDialogKeepEditing')}
                </AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {t('designSystem.alertDialogConfirmDiscard')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  )
}
