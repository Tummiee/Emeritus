"use client";

import { useEffect, useRef, useState } from "react";
import Image from "@/components/SafeImage";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";

type Props = {
  images: string[];
  initialIndex: number;
  productName: string;
  onClose: () => void;
};

export default function ProductImageLightbox({ images, initialIndex, productName, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(initialIndex);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const multipleImages = images.length > 1;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  function navigate(direction: number) {
    setIndex((current) => (current + direction + images.length) % images.length);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={`${productName} image viewer`}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-black/90 p-0 text-white backdrop:bg-black/80"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (multipleImages && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          event.preventDefault();
          navigate(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <button
        type="button"
        autoFocus
        aria-label="Close image viewer"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-3 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
      >
        <X aria-hidden="true" className="size-6" />
      </button>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-14 py-20 sm:px-24">
        {failedImage === images[index] ? (
          <div role="status" className="pointer-events-auto flex flex-col items-center gap-3">
            <ImageOff aria-hidden="true" className="size-12" />
            <p>This image could not be loaded.</p>
          </div>
        ) : (
          <Image
            key={images[index]}
            src={images[index]}
            alt={`${productName}, image ${index + 1} of ${images.length}`}
            width={1800}
            height={1800}
            sizes="100vw"
            className="pointer-events-auto h-auto max-h-full w-auto max-w-full object-contain"
            onError={() => setFailedImage(images[index])}
          />
        )}
      </div>

      {multipleImages && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => navigate(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white sm:left-5"
          >
            <ChevronLeft aria-hidden="true" className="size-6" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => navigate(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white sm:right-5"
          >
            <ChevronRight aria-hidden="true" className="size-6" />
          </button>
        </>
      )}
      <p aria-live="polite" aria-atomic="true" className="pointer-events-none absolute inset-x-4 bottom-5 text-center text-sm">
        {productName}{multipleImages ? ` — ${index + 1} / ${images.length}` : ""}
      </p>
    </dialog>
  );
}
