// Habillage HTML de marque Bénévoles Lavaux pour les emails transactionnels.
// CSS 100% inline (les clients mail ignorent les feuilles de style externes et
// n'ont pas accès au globals.css de l'app). Wordmark texte plutôt qu'un logo
// image : pas d'asset hébergé, et le SVG externe n'est pas rendu en email.
const BORDEAUX = "#7B2E38"
const CREAM = "#F6EFE4"
const CREAM_CARD = "#FBF7F0"
const GOLD = "#DDA85E"
const TEXT = "#2E2024"
const MUTED = "#7A6A6E"

export function brandEmail(bodyHtml: string): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:${CREAM};font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:${TEXT};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${CREAM_CARD};border-radius:12px;overflow:hidden;border:1px solid #ECE3D6;">
            <tr>
              <td style="background:${BORDEAUX};padding:20px 28px;">
                <span style="color:${CREAM};font-size:18px;font-weight:700;letter-spacing:0.2px;">Bénévoles Lavaux</span>
              </td>
            </tr>
            <tr>
              <td style="height:3px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #ECE3D6;font-size:12px;color:${MUTED};">
                Bénévoles Lavaux — groupement d'associations de Lavaux.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
