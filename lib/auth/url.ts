import "server-only"

import { headers } from "next/headers"

import { resolveSiteUrl } from "./helpers"

export async function getSiteUrl() {
  const values = await headers()
  return resolveSiteUrl({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost: values.get("x-forwarded-host") ?? undefined,
    host: values.get("host") ?? undefined,
    forwardedProtocol: values.get("x-forwarded-proto") ?? undefined,
    nodeEnv: process.env.NODE_ENV,
  })
}
