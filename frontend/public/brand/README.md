# Logo Taller Dimensión

## Versión v3 · 20 de septiembre de 2026

Logo inspirado en la referencia del usuario: automóvil clásico, pistola de pintura y letras metálicas en negro, plata y naranja. Generado con la herramienta integrada ImageGen, con fondo blanco.

- `taller-dimension-v3.png`: original de alta resolución, 1774 × 887 px (2:1).
- `taller-dimension-v3.webp`: versión web, 234 KB, calidad 90, para acceso, carga, menú y documentos con el logo predeterminado.
- `taller-dimension.png`: ruta estable actualizada a v3, con copia idéntica en `backend/brand/taller-dimension.png` para Render.
- Se conservan las versiones v1 y v2. Los logos personalizados en «Mi empresa» se respetan. No es necesario modificar la BD para la ruta estable.
- Los membretes PDF reservan 220 × 110 puntos, manteniendo las proporciones. El diseño general de la aplicación se conserva.

### Prompt de generación (ImageGen integrado, sin CLI)

```text
Use case: logo-brand.
Asset type: final logo for the existing Taller Dimensión automotive bodywork and paint quotation app and its PDF documents.
Input image: the attached local image is a STYLE AND COMPOSITION REFERENCE, not an edit target. Create an original similar logo, not a screenshot or a mockup.
Primary request: develop a polished, robust, upbeat automotive emblem inspired closely by the reference: a classic black muscle coupe in front three-quarter view pointing left, refined chrome highlights, orange body pinstripes, an orange-and-metal paint spray gun on the right, and a dynamic orange and silver elliptical arc framing the composition. Generic car without third-party model badges or brand text.
Composition: one self-contained horizontal emblem, approximately 2:1 width to height, centered and closely framed with a small safe margin. Top section contains the car and spray gun, lower section a very large italic bold metallic silver wordmark with precise orange underline. Retain strong black silhouette shapes behind silver typography for readability on both white and dark navy UI. Use a graceful partial ellipse, not a solid rectangular black background. Slight simplification of tiny mechanical detail for recognition at small website sizes while retaining the rich look of the reference.
Text verbatim: small secondary "TALLER" above the main wordmark; large dominant "DIMENSIÓN" (D I M E N S I Ó N, preserve accented Ó); below "DESABOLLADURA Y PINTURA"; last small line "AUTOMOTRIZ".
Style/medium: premium automotive custom paint emblem, crisp illustration with tasteful metallic shading, confident bold shapes, sharp high-resolution lettering. Colors: black, silver, vivid orange #FF790D. Warm and energetic, professional.
Background: actual transparent alpha outside the emblem, including the open spaces outside the vehicle and framing arc. No checkerboard painted into the image, no white or black rectangular canvas, no shadows outside the emblem.
Avoid: extra words, blue/green accents, illegible thin letters, misspellings, watermarks, presentation boards, multiple variants. Output one finished raster logo at high resolution, ideally 1536x1024 or a horizontal canvas suited to the 2:1 logo.
```

### Prompt del ajuste final

La primera generación contenía una cuadrícula visible. ImageGen corrigió el fondo; el archivo final tiene fondo blanco, no transparencia.

```text
Use case: precise-object-edit. Edit this finished Taller Dimensión logo.
Change ONLY the background: completely remove all the visible gray checkerboard pattern, replacing it with perfectly flat pure white #FFFFFF, including every gap between the car and elliptical arc, around the paint gun, and every corner. White must be actual white, not a transparency checkerboard. The output will be used on a white sidebar card, white login panel and white PDF paper.
Preserve exactly the logo artwork, silhouette, black muscle car, orange spray gun, orange/silver ellipse, metallic wordmark, spelling and accent, all text, aspect ratio 2:1, composition, sharpness and color. Text: TALLER / DIMENSIÓN / DESABOLLADURA Y PINTURA / AUTOMOTRIZ. No new text. No mockup. Keep all logo edges safely within frame with a small even white margin. Output a single high-resolution final image on pure white.
```

## Versión anterior (v2)

La versión anterior se generó con ImageGen a partir de la primera marca del taller. Se mantiene en `taller-dimension-v2.png` y la primera versión en `taller-dimension-v1.png`.

Prompt utilizado:

> Use case: logo-brand. Reference image is the existing Taller Dimensión automotive bodywork and paint brand. Redesign it into one more robust, confident and cheerful professional brand logo, retain the exact name TALLER DIMENSIÓN with the acute accent, but evolve the simple D/car mark into a bold precision-built shield emblem incorporating an elegant car silhouette and a dynamic paint sweep. Deep midnight navy, rich emerald teal, and a warm amber accent for optimism. Premium workshop identity, refined flat vector-like geometry with medium detail and strong structure, not cartoon, not playful toy aesthetics. Horizontal lockup: emblem at left, small TALLER above strong bold slightly forward-moving DIMENSIÓN at right. Beautiful strong customized typography. Single standalone finished logo on pure white background, no mockups, no gradients, no bevels, no scenery, no additional slogans or text, no multiple alternatives. Balanced compact composition with small even white margins, suitable for a sidebar, login screen and PDF letterhead.
