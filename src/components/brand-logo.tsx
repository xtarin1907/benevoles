import { cn } from "@/lib/utils"

// Emblème Bénévoles Lavaux : cœur bicolore (bordeaux / terracotta) dans un
// double anneau or, traits de lumière crème sur les lobes, trois points or
// sous la pointe. Recréé en SVG (aucun fichier raster fourni). Couleurs en
// dur : l'emblème garde son identité quel que soit le thème.
const BORDEAUX = "#7B2E38"
const TERRACOTTA = "#C05B34"
const GOLD = "#DDA85E"
const CREAM = "#F6EFE4"

export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn("size-6", className)}
      role="img"
      aria-label="Bénévoles Lavaux"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* double anneau */}
      <circle cx="256" cy="256" r="246" fill="none" stroke={BORDEAUX} strokeWidth="8" />
      <circle cx="256" cy="256" r="228" fill="none" stroke={GOLD} strokeWidth="4" />

      {/* lobe gauche (bordeaux) */}
      <path
        d="M256 388 C205 346 120 306 118 232 C116 178 165 148 205 166 C228 176 248 185 256 193 L256 388 Z"
        fill={BORDEAUX}
      />
      {/* lobe droit (terracotta) */}
      <path
        d="M256 388 C307 346 392 306 394 232 C396 178 347 148 307 166 C284 176 264 185 256 193 L256 388 Z"
        fill={TERRACOTTA}
      />

      {/* traits de lumière crème */}
      <g stroke={CREAM} strokeWidth="9" strokeLinecap="round" fill="none">
        <path d="M168 236 C176 214 186 202 196 194" />
        <path d="M198 244 C206 224 216 212 226 205" />
        <path d="M344 236 C336 214 326 202 316 194" />
        <path d="M314 244 C306 224 296 212 286 205" />
      </g>

      {/* trois points or */}
      <g fill={GOLD}>
        <circle cx="230" cy="402" r="9" />
        <circle cx="256" cy="406" r="9" />
        <circle cx="282" cy="402" r="9" />
      </g>
    </svg>
  )
}
