"use client";
import NextImage, { type ImageProps } from "next/image";
import { useState } from "react";
import {
  imageSourceAllowed,
  renderedImageOrigins,
} from "@/lib/image-policy.mjs";
export type { ImageProps } from "next/image";

export default function SafeImage({ src, onError, ...props }: ImageProps) {
  const [failedSource, setFailedSource] = useState<ImageProps["src"] | null>(
    null,
  );
  const invalid =
    typeof src === "string" && !imageSourceAllowed(src, renderedImageOrigins());
  const fallback = invalid || failedSource === src;
  return (
    <NextImage
      {...props}
      src={fallback ? "/product-placeholder.svg" : src}
      onError={(event) => {
        setFailedSource(src);
        onError?.(event);
      }}
    />
  );
}
