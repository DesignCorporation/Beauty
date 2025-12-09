import React, { useCallback, useMemo, useRef, useState } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { Camera, Loader2, X } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose, cn } from '@beauty-platform/ui'
import { toast } from 'sonner'

interface AvatarUploaderProps {
  avatarUrl?: string | null
  initials?: string
  uploading?: boolean
  deleting?: boolean
  onUpload: (file: File) => Promise<void> | void
  onDelete: () => Promise<void> | void
}

const AVATAR_SIZE = 220

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'

export function AvatarUploader({
  avatarUrl,
  initials,
  uploading,
  deleting,
  onUpload,
  onDelete
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const hasAvatar = Boolean(avatarUrl)
  const isBusy = uploading || deleting || processing

  const handleTriggerUpload = () => {
    if (isBusy) return
    inputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    readFileAsDataURL(file)
      .then((dataUrl) => {
        setImageToCrop(dataUrl)
        setCropModalOpen(true)
        setZoom(1)
        setCrop({ x: 0, y: 0 })
      })
      .catch(() => {
        toast.error('Не удалось прочитать файл')
      })
      .finally(() => {
        if (inputRef.current) {
          inputRef.current.value = ''
        }
      })
  }

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleCropConfirm = useCallback(async () => {
    if (!imageToCrop || !croppedAreaPixels) return

    try {
      setProcessing(true)
      const blob = await getCroppedImage(imageToCrop, croppedAreaPixels)
      const file = new File([blob], 'avatar.jpg', { type: blob.type || 'image/jpeg' })
      await onUpload(file)
      setCropModalOpen(false)
      setImageToCrop(null)
    } catch (error) {
      console.error('Crop error:', error)
      toast.error('Не удалось обработать изображение')
    } finally {
      setProcessing(false)
    }
  }, [croppedAreaPixels, imageToCrop, onUpload])

  const handleDelete = async () => {
    if (deleting || !hasAvatar) return
    await onDelete()
  }

  const fallbackContent = useMemo(() => {
    const initialsText = initials?.slice(0, 2).toUpperCase()
    if (initialsText) {
      return (
        <span className="text-6xl font-semibold leading-none text-white">
          {initialsText}
        </span>
      )
    }
    return (
      <Camera className="h-12 w-12 text-white" />
    )
  }, [initials])

  return (
    <>
      <div className="relative" style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}>
        <div
          className={cn(
            'group relative size-full rounded-full border-2 border-indigo-200 bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg overflow-hidden transition-opacity',
            (uploading || processing) && 'opacity-80 pointer-events-none',
            !hasAvatar && 'flex items-center justify-center'
          )}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onClick={handleTriggerUpload}
          role="button"
          aria-label={hasAvatar ? 'Изменить аватар' : 'Загрузить аватар'}
        >
          {hasAvatar && (
            <img
              src={avatarUrl ?? ''}
              alt="Аватар"
              className="size-full object-cover"
            />
          )}

          {!hasAvatar && (
            <div
              className={cn(
                'absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity duration-200',
                isHovering ? 'opacity-100' : 'pointer-events-none'
              )}
            >
              <Camera className="h-10 w-10 mb-1" />
              <span className="text-sm font-medium">Загрузить фото</span>
            </div>
          )}

          {!hasAvatar && fallbackContent}

          {hasAvatar && (
            <div
              className={cn(
                'absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity duration-200',
                isHovering && !uploading ? 'opacity-100' : 'pointer-events-none'
              )}
            >
              <Camera className="h-8 w-8 mb-1" />
              <span className="text-xs font-medium">Изменить</span>
            </div>
          )}

          {(uploading || processing) && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          className="hidden"
        />

        {hasAvatar && !uploading && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            className={cn(
              'absolute flex items-center justify-center text-white transition-all duration-200 rounded-full shadow-md border border-white/20 bg-black/80 hover:bg-black',
              deleting && 'opacity-70 cursor-not-allowed'
            )}
            style={{
              width: 32,
              height: 32,
              bottom: 8,
              right: 8
            }}
            aria-label="Удалить аватар"
          >
            {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
          </button>
        )}
      </div>

      <Dialog open={cropModalOpen} onOpenChange={(open) => {
        setCropModalOpen(open)
        if (!open) {
          setImageToCrop(null)
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Обрезка изображения</DialogTitle>
            <DialogDescription>
              Настройте область обрезки, чтобы аватар выглядел идеально
            </DialogDescription>
          </DialogHeader>

          <div className="relative w-full h-[320px] overflow-hidden rounded-lg bg-muted">
            {imageToCrop && (
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                showGrid={false}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            )}
          </div>

  <div className="flex items-center gap-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Масштаб</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="flex-1 accent-indigo-500"
            />
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={processing}>
                Отмена
              </Button>
            </DialogClose>
            <Button onClick={handleCropConfirm} disabled={!croppedAreaPixels || processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Сохранить'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result as string))
    reader.addEventListener('error', reject)
    reader.readAsDataURL(file)
  })
}

async function getCroppedImage(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas not supported')
  }

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'))
        return
      }
      resolve(blob)
    }, 'image/jpeg', 0.92)
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

export default AvatarUploader
