import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ToastPage() {
  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Toast</h1>
        <p className="mt-1 text-muted-foreground">
          Notifications via sonner. Success, error, warning, info, and custom.
        </p>
      </header>

      <section className="space-y-8">
        {/* Variants */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Variants
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => toast('Default toast', { description: 'This is a default notification.' })}
            >
              Default
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.success('Success', { description: 'Operation completed successfully.' })}
            >
              Success
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.error('Error', { description: 'Something went wrong. Please try again.' })}
            >
              Error
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.warning('Warning', { description: 'This action may have consequences.' })}
            >
              Warning
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info('Info', { description: 'Here is some useful information.' })}
            >
              Info
            </Button>
          </div>
        </div>

        {/* With action */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            With Action
          </h2>
          <Button
            variant="outline"
            onClick={() =>
              toast('Session deleted', {
                description: 'The coaching session has been removed.',
                action: {
                  label: 'Undo',
                  onClick: () => toast.success('Restored'),
                },
              })
            }
          >
            With undo action
          </Button>
        </div>

        {/* Promise */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Promise
          </h2>
          <Button
            variant="outline"
            onClick={() =>
              toast.promise(
                new Promise<string>((resolve) => setTimeout(() => resolve('Done'), 2000)),
                {
                  loading: 'Saving session...',
                  success: 'Session saved',
                  error: 'Failed to save',
                },
              )
            }
          >
            Async operation
          </Button>
        </div>

        {/* Duration */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Custom Duration
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => toast.info('Quick toast', { duration: 1500 })}
            >
              Short (1.5s)
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info('Persistent toast', { duration: 10000 })}
            >
              Long (10s)
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
