"use client"

import type { ComponentProps, ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

// Submits the form with id={formId} via the HTML `form` attribute rather
// than DOM nesting -- AlertDialogContent renders through a portal, so a
// submit button nested inside a <form> the usual way would no longer be
// associated with it once portaled. The `form` attribute resolves by ID
// at submit time regardless of where the button actually lives in the
// DOM tree.
export function ConfirmSubmitButton({
  formId,
  children,
  title,
  description,
  variant = "outline",
  size = "sm",
}: {
  formId: string
  children: ReactNode
  title: string
  description: string
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button type="button" variant={variant} size={size} />}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction type="submit" form={formId} variant="destructive">
            Confirmer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
