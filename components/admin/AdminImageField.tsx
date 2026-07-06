"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { ImagePlus, X } from "lucide-react"

export function AdminImageField({
  name,
  initialUrl,
  required,
}: {
  name: string
  initialUrl?: string
  required?: boolean
}) {
  const [url, setUrl] = useState(initialUrl ?? "")
  const [filePreview, setFilePreview] = useState("")
  const preview = filePreview || url

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview)
    }
  }, [filePreview])

  return (
    <div className="mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      {preview ? (
        <div className="relative aspect-[16/7] bg-white">
          <Image src={preview} alt="Selected image preview" fill unoptimized className="object-contain p-3" />
          <button
            type="button"
            aria-label="Clear image selection"
            onClick={() => {
              setUrl("")
              setFilePreview("")
            }}
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white text-slate-700 shadow"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="grid min-h-28 place-items-center text-slate-400">
          <div className="text-center">
            <ImagePlus className="mx-auto size-7" />
            <p className="mt-2 text-xs">No image selected</p>
          </div>
        </div>
      )}
      <div className="grid gap-3 border-t border-slate-200 bg-white p-3 md:grid-cols-2">
        <div>
          <span className="text-xs font-medium text-slate-600">Upload an image</span>
          <input
            name={`${name}__file`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0]
              setFilePreview(file ? URL.createObjectURL(file) : "")
            }}
            className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
          />
          <p className="mt-1 text-[11px] text-slate-400">JPG, PNG, WebP or GIF. Maximum 10 MB.</p>
        </div>
        <div>
          <span className="text-xs font-medium text-slate-600">Or use an image URL</span>
          <input
            name={name}
            type="url"
            value={url}
            required={required && !filePreview}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/image.jpg"
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-primary"
          />
        </div>
      </div>
    </div>
  )
}
