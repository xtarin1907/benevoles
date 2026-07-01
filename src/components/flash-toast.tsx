"use client"

import { useEffect } from "react"
import { toast } from "sonner"

// Server actions in this app communicate results via redirect + query
// params (?message=/?error=), not useActionState -- keeps every action a
// plain progressive-enhancement-friendly form post (see rls-isolation
// and curl-verification notes in doc/changelog.md). This component
// converts that existing pattern into a toast instead of an inline <p>,
// without having to rewrite every action.
export function FlashToast({ message, error }: { message?: string; error?: string }) {
  useEffect(() => {
    if (message) toast.success(message)
    if (error) toast.error(error)
  }, [message, error])

  return null
}
