import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Camera, ImagePlus, Trash2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { ImageCropDialog } from '@/components/shared/ImageCropDialog'
import { cn } from '@/lib/utils'

type Variant = 'avatar' | 'cover'

export interface ImageUploadProps {
  /** Current preview URL (object URL or remote). `null` to show the empty state. */
  value: string | null
  /** Fired with the picked (and cropped, if enabled) `File`. */
  onChange: (file: File) => void
  /** Fired when the user clears the image. If omitted, the remove control is hidden. */
  onRemove?: () => void

  variant?: Variant
  /** Aspect ratio for `cover` variant. Default 16/9. */
  aspectRatio?: number
  /** Crop shape. `"none"` skips the crop dialog. Defaults to `"round"` for avatar, `"none"` for cover. */
  cropShape?: 'round' | 'rect' | 'none'
  /** Crop output square size in pixels. Default 512 for avatar, 1600 for cover. */
  outputSize?: number

  /** Max file size in MB. Default 5. */
  maxSizeMB?: number
  /** Allowed MIME types. Default JPEG / PNG / WEBP. */
  allowedTypes?: string[]

  /** Fallback rendered inside the avatar when no image is set (avatar variant only). */
  fallback?: ReactNode
  /** Alt text + accessible label. */
  alt?: string

  disabled?: boolean
  className?: string
}

const DEFAULT_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function ImageUpload({
  value,
  onChange,
  onRemove,
  variant = 'cover',
  aspectRatio = 16 / 9,
  cropShape,
  outputSize,
  maxSizeMB = 5,
  allowedTypes = DEFAULT_TYPES,
  fallback,
  alt,
  disabled,
  className,
}: ImageUploadProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const effectiveCropShape =
    cropShape ?? (variant === 'avatar' ? 'round' : 'none')
  const effectiveOutputSize =
    outputSize ?? (variant === 'avatar' ? 512 : 1600)
  const cropAspect = variant === 'avatar' ? 1 : aspectRatio

  const acceptInput = allowedTypes.join(',')

  const handlePick = useCallback(
    (file: File | undefined | null) => {
      if (!file) return
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.warning(t('imageUpload.tooLarge', { size: maxSizeMB }))
        return
      }
      if (!allowedTypes.includes(file.type)) {
        toast.warning(t('imageUpload.invalidType'))
        return
      }
      if (effectiveCropShape === 'none') {
        onChange(file)
      } else {
        setCropSrc(URL.createObjectURL(file))
      }
    },
    [allowedTypes, effectiveCropShape, maxSizeMB, onChange, t]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handlePick(e.target.files?.[0])
      e.target.value = ''
    },
    [handlePick]
  )

  const handleCropComplete = useCallback(
    (file: File) => {
      setCropSrc(null)
      onChange(file)
    },
    [onChange]
  )

  const handleCropCancel = useCallback(() => setCropSrc(null), [])

  const openBrowse = () => fileInputRef.current?.click()
  const openCamera = () => cameraInputRef.current?.click()

  // ── Avatar variant ──────────────────────────────────────────────────────
  if (variant === 'avatar') {
    return (
      <>
        <div className={cn('relative inline-block', className)}>
          <Avatar className="h-28 w-28">
            {value && <AvatarImage src={value} alt={alt ?? ''} />}
            <AvatarFallback className="text-2xl">{fallback}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            disabled={disabled}
            aria-label={t('imageUpload.changePhoto')}
            onClick={openBrowse}
            className="absolute bottom-0 right-0 hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-label={t('imageUpload.takePhoto')}
            onClick={openCamera}
            className="absolute bottom-0 right-0 md:hidden flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptInput}
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled}
          />
        </div>

        <ImageCropDialog
          imageSrc={cropSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          outputSize={effectiveOutputSize}
          cropShape={effectiveCropShape === 'none' ? 'rect' : effectiveCropShape}
          aspect={cropAspect}
        />
      </>
    )
  }

  // ── Cover variant ───────────────────────────────────────────────────────
  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptInput}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {value ? (
        <div
          className="relative overflow-hidden rounded-md border border-border bg-muted/30"
          style={{ aspectRatio }}
        >
          <img
            src={value}
            alt={alt ?? ''}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled) setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (disabled) return
            handlePick(e.dataTransfer.files?.[0])
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center transition-colors',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/10 hover:border-primary/40 hover:bg-primary/5',
            disabled && 'pointer-events-none opacity-60'
          )}
          style={{ aspectRatio }}
        >
          <ImagePlus className="mb-2 size-8 text-muted-foreground" />
          <p className="text-sm">
            {t('imageUpload.dropHint')}{' '}
            <button
              type="button"
              onClick={openBrowse}
              disabled={disabled}
              className="cursor-pointer font-medium text-primary hover:underline"
            >
              {t('imageUpload.browse')}
            </button>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('imageUpload.hint', { size: maxSizeMB })}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {value ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openBrowse}
            disabled={disabled}
          >
            <Upload className="size-4" />
            {t('imageUpload.replace')}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openCamera}
          disabled={disabled}
          className="md:hidden"
          aria-label={t('imageUpload.takePhoto')}
        >
          <Camera className="size-4" />
          {t('imageUpload.takePhoto')}
        </Button>
        {value && onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
            disabled={disabled}
          >
            <Trash2 className="size-4" />
            {t('imageUpload.remove')}
          </Button>
        )}
      </div>

      <ImageCropDialog
        imageSrc={cropSrc}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
        outputSize={effectiveOutputSize}
        cropShape={effectiveCropShape === 'none' ? 'rect' : effectiveCropShape}
        aspect={cropAspect}
      />
    </div>
  )
}
