import { useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, ImagePlus, Camera, X, Star, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface MediaFile {
  id: string
  file?: File
  url: string
  isPrimary: boolean
}

interface MediaUploadProps {
  value: MediaFile[]
  onChange: (files: MediaFile[]) => void
  maxFiles?: number
  accept?: string
  className?: string
}

let nextId = 0
function generateId() {
  return `media-${Date.now()}-${nextId++}`
}

export function MediaUpload({
  value,
  onChange,
  maxFiles = 10,
  accept = 'image/*',
  className,
}: MediaUploadProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const canAddMore = value.length < maxFiles

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList)
      const remaining = maxFiles - value.length
      const toAdd = files.slice(0, remaining)

      const newMedia: MediaFile[] = toAdd.map((file, i) => ({
        id: generateId(),
        file,
        url: URL.createObjectURL(file),
        isPrimary: value.length === 0 && i === 0,
      }))

      onChange([...value, ...newMedia])
    },
    [value, maxFiles, onChange],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (!canAddMore) return
      const files = e.dataTransfer.files
      if (files.length > 0) addFiles(files)
    },
    [canAddMore, addFiles],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) addFiles(files)
      e.target.value = ''
    },
    [addFiles],
  )

  const removeFile = useCallback(
    (id: string) => {
      const updated = value.filter((f) => f.id !== id)
      if (updated.length > 0 && !updated.some((f) => f.isPrimary)) {
        updated[0].isPrimary = true
      }
      onChange(updated)
    },
    [value, onChange],
  )

  const setPrimary = useCallback(
    (id: string) => {
      onChange(
        value.map((f) => ({ ...f, isPrimary: f.id === id })),
      )
    },
    [value, onChange],
  )

  const handleItemDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      setDraggedIndex(index)
      e.dataTransfer.effectAllowed = 'move'
    },
    [],
  )

  const handleItemDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      if (draggedIndex === null || draggedIndex === index) return
      setDragOverIndex(index)
    },
    [draggedIndex],
  )

  const handleItemDrop = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      if (draggedIndex === null || draggedIndex === index) {
        setDraggedIndex(null)
        setDragOverIndex(null)
        return
      }
      const updated = [...value]
      const [moved] = updated.splice(draggedIndex, 1)
      updated.splice(index, 0, moved)
      onChange(updated)
      setDraggedIndex(null)
      setDragOverIndex(null)
    },
    [draggedIndex, value, onChange],
  )

  const handleItemDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {value.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/30',
          )}
        >
          <Upload className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground text-center mb-4">
            {t('mediaUpload.dragDropHint')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              {t('mediaUpload.browse')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cameraInputRef.current?.click()}
              className="md:hidden"
            >
              <Camera className="h-4 w-4 mr-2" />
              {t('mediaUpload.takePhoto')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-3">
            {t('mediaUpload.maxFiles', { count: maxFiles })}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {value.map((media, index) => (
              <div
                key={media.id}
                draggable
                onDragStart={(e) => handleItemDragStart(e, index)}
                onDragOver={(e) => handleItemDragOver(e, index)}
                onDrop={(e) => handleItemDrop(e, index)}
                onDragEnd={handleItemDragEnd}
                className={cn(
                  'group relative aspect-square rounded-lg border overflow-hidden bg-muted/30 transition-all',
                  media.isPrimary && 'ring-2 ring-primary',
                  draggedIndex === index && 'opacity-40',
                  dragOverIndex === index && 'ring-2 ring-primary/50',
                )}
              >
                <img
                  src={media.url}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

                <div className="absolute top-1 left-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                  <GripVertical className="h-4 w-4 text-white drop-shadow" />
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(media.id)}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-1.5 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-black/80 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setPrimary(media.id)}
                  className={cn(
                    'absolute bottom-1 left-1 rounded-full p-1.5 transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center',
                    media.isPrimary
                      ? 'bg-primary text-white opacity-100'
                      : 'bg-black/60 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-black/80',
                  )}
                >
                  <Star
                    className="h-3.5 w-3.5"
                    fill={media.isPrimary ? 'currentColor' : 'none'}
                  />
                </button>

                {media.isPrimary && (
                  <span className="absolute bottom-1 right-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {t('mediaUpload.primary')}
                  </span>
                )}
              </div>
            ))}

            {canAddMore && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  'flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50',
                )}
              >
                <ImagePlus className="h-6 w-6 text-muted-foreground/50 mb-1" />
                <span className="text-xs text-muted-foreground">
                  {t('mediaUpload.add')}
                </span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canAddMore}
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              {t('mediaUpload.addMore')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cameraInputRef.current?.click()}
              disabled={!canAddMore}
              className="md:hidden"
            >
              <Camera className="h-4 w-4 mr-2" />
              {t('mediaUpload.takePhoto')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
