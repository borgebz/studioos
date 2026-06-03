import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff, Send } from 'lucide-react'

import { NotificationEnum } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface PublishNotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "event" tweaks copy; "post" uses post-specific phrasing. */
  kind: 'event' | 'post'
  submitting: boolean
  onConfirm: (notification: NotificationEnum) => void
}

/**
 * Three-option chooser shown when staff clicks Publish on an event or post.
 * Notification audience is determined by the event's notification_target
 * (everyone vs. targeted classes) — this dialog only chooses *how* to send:
 * off, a test to me, or for real.
 */
export function PublishNotificationDialog({
  open,
  onOpenChange,
  kind,
  submitting,
  onConfirm,
}: PublishNotificationDialogProps) {
  const { t } = useTranslation()
  const [choice, setChoice] = useState<NotificationEnum>(
    NotificationEnum.Notification
  )

  // Reset to the default each time the dialog opens — we never want stale
  // state when reopening the picker after a previous publish.
  useEffect(() => {
    if (open) setChoice(NotificationEnum.Notification)
  }, [open])

  const titleKey =
    kind === 'event' ? 'events.publishDialog.title' : 'events.publishDialog.postTitle'
  const descKey =
    kind === 'event'
      ? 'events.publishDialog.description'
      : 'events.publishDialog.postDescription'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          <DialogDescription>{t(descKey)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Option
            icon={<Bell className="size-4" />}
            label={t('events.publishDialog.optionAll')}
            description={t('events.publishDialog.optionAllDesc')}
            checked={choice === NotificationEnum.Notification}
            onSelect={() => setChoice(NotificationEnum.Notification)}
          />
          <Option
            icon={<Send className="size-4" />}
            label={t('events.publishDialog.optionTest')}
            description={t('events.publishDialog.optionTestDesc')}
            checked={choice === NotificationEnum.NotificationTest}
            onSelect={() => setChoice(NotificationEnum.NotificationTest)}
          />
          <Option
            icon={<BellOff className="size-4" />}
            label={t('events.publishDialog.optionNone')}
            description={t('events.publishDialog.optionNoneDesc')}
            checked={choice === NotificationEnum.None}
            onSelect={() => setChoice(NotificationEnum.None)}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('events.publishDialog.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(choice)}
            disabled={submitting}
          >
            {t('events.publishDialog.publish')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Option({
  icon,
  label,
  description,
  checked,
  onSelect,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
        checked
          ? 'border-primary bg-primary/5'
          : 'border-border hover:bg-accent/40'
      )}
    >
      <span
        className={cn(
          'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-[1.5px]',
          checked ? 'border-primary' : 'border-muted-foreground/50'
        )}
      >
        {checked && <span className="size-2 rounded-full bg-primary" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {label}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {description}
        </div>
      </div>
    </button>
  )
}
