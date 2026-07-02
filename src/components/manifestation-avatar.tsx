import { getContrastColor } from "@/lib/color"

const SIZE_CLASSES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
} as const

export function ManifestationAvatar({
  name,
  colorHex,
  logoUrl,
  size = "md",
}: {
  name: string
  colorHex: string
  logoUrl?: string | null
  size?: keyof typeof SIZE_CLASSES
}) {
  const dims = SIZE_CLASSES[size]

  if (logoUrl) {
    return <img src={logoUrl} alt="" className={`${dims} shrink-0 rounded-full object-cover`} />
  }

  return (
    <div
      className={`${dims} flex shrink-0 items-center justify-center rounded-full font-semibold`}
      style={{ backgroundColor: colorHex, color: getContrastColor(colorHex) }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
