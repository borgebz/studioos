import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { useTranslation } from 'react-i18next'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getCroppedImageFile } from '@/lib/image-resize'
import type { PixelCrop } from '@/lib/image-resize'

export interface ImageCropDialogProps {
  /** Object URL of the image to crop. Dialog opens when this is non-null. */
  imageSrc: string | null
  /** Called with the cropped `File` when the user confirms. */
  onCropComplete: (file: File) => void
  /** Called when the dialog is dismissed without cropping. */
  onCancel: () => void
  /** Output square size in pixels (default 512). */
  outputSize?: number
  /** Crop shape — "round" for avatars, "rect" for general use (default "round"). */
  cropShape?: 'round' | 'rect'
  /** Aspect ratio (default 1 for square). */
  aspect?: number
  /** Dialog title override. */
  title?: string
}

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.1

export function ImageCropDialog({
  imageSrc,
  onCropComplete,
  onCancel,
  outputSize = 512,
  cropShape = 'round',
  aspect = 1,
  title,
}: ImageCropDialogProps) {
  const { t } = useTranslation()

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(
    null
  )
  const [saving, setSaving] = useState(false)

  const handleCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setSaving(true)
    try {
      const file = await getCroppedImageFile(
        imageSrc,
        croppedAreaPixels,
        outputSize
      )
      onCropComplete(file)
    } catch {
      // Crop failed — dialog stays open so the user can retry
    } finally {
      setSaving(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) onCancel()
  }

  // Reset state when a new image is loaded
  const handleMediaLoaded = useCallback(() => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }, [])

  return (
    <Dialog open={!!imageSrc} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? t('imageCrop.title')}</DialogTitle>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-md bg-muted">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
              onMediaLoaded={handleMediaLoaded}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
            />
          )}
        </div>

        {/* Zoom control */}
        <div className="flex items-center gap-3 px-1">
          <ZoomOut className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary
              [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
              [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
            aria-label={t('imageCrop.zoom')}
          />
          <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || !croppedAreaPixels}
          >
            {saving ? t('imageCrop.saving') : t('imageCrop.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
