/**
 * Client-side image resizing using the Canvas API.
 *
 * Shrinks an image so its longest side fits within `maxSize` pixels while
 * keeping the original aspect ratio.  If the source is already smaller it
 * is returned untouched (no up-scaling).
 *
 * The output is always JPEG at the requested quality — this keeps file
 * sizes predictable regardless of the source format (PNG, WebP, …).
 */

export interface ResizeImageOptions {
  /** Maximum width **or** height in pixels (default 800). */
  maxSize?: number
  /** JPEG quality 0–1 (default 0.85). */
  quality?: number
  /**
   * Output MIME type (default `image/jpeg`).
   * Use `image/webp` for smaller files where browser support is fine.
   */
  outputType?: 'image/jpeg' | 'image/webp'
}

const DEFAULT_MAX_SIZE = 800
const DEFAULT_QUALITY = 0.85

/**
 * Resize an image `File` on the client before uploading.
 *
 * @returns A new `File` with the resized image data and the same name.
 *          If the image is already within bounds it is returned as-is.
 */
export function resizeImageFile(
  file: File,
  options: ResizeImageOptions = {},
): Promise<File> {
  const {
    maxSize = DEFAULT_MAX_SIZE,
    quality = DEFAULT_QUALITY,
    outputType = 'image/jpeg',
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const { width, height } = img

      // Already within bounds — return original file untouched.
      if (width <= maxSize && height <= maxSize) {
        resolve(file)
        return
      }

      // Compute scaled dimensions keeping aspect ratio.
      const ratio = Math.min(maxSize / width, maxSize / height)
      const targetW = Math.round(width * ratio)
      const targetH = Math.round(height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = targetW
      canvas.height = targetH

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'))
        return
      }

      ctx.drawImage(img, 0, 0, targetW, targetH)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob returned null'))
            return
          }

          const ext = outputType === 'image/webp' ? '.webp' : '.jpg'
          const name = stripExtension(file.name) + ext

          resolve(new File([blob], name, { type: outputType }))
        },
        outputType,
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for resizing'))
    }

    img.src = url
  })
}

// ─── Crop helpers (used with react-easy-crop) ─────────────────────────

export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Extract the cropped region from an image source and return it as a `File`.
 *
 * @param imageSrc  Object URL or data URL of the source image.
 * @param crop      Pixel-based crop area from react-easy-crop.
 * @param outputSize Final square size in pixels (default 512).
 * @param fileName  Output file name (default "photo.jpg").
 * @param quality   JPEG quality 0–1 (default 0.85).
 */
export function getCroppedImageFile(
  imageSrc: string,
  crop: PixelCrop,
  outputSize = 512,
  fileName = 'photo.jpg',
  quality = DEFAULT_QUALITY,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = outputSize
      canvas.height = outputSize

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'))
        return
      }

      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        outputSize,
        outputSize,
      )

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob returned null'))
            return
          }
          resolve(new File([blob], fileName, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality,
      )
    }

    img.onerror = () => reject(new Error('Failed to load image for cropping'))
    img.src = imageSrc
  })
}

/** Strip the file extension (keeps the stem). */
function stripExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(0, dot) : filename
}
