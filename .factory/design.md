# Move Confirmed — visual thesis

## Direction: the change-line transit poster

Move Confirmed treats a reschedule like a train changing platforms: the important
thing is not the timetable itself, but making the changed route unmistakable and
leaving a stamped record that it reached the passenger. The interface borrows
from late-1920s/early-1930s transit posters—stepped rays, precise route lines,
ticket punches, cream stock, and disciplined geometry—without reproducing a
historic brand. Decoration explains state: paired circles are the old and new
stops; the route line between them is the handoff; a punch mark means confirmed.

This is intentionally a single-mode, ink-on-paper treatment. A dark mode would
turn the paper metaphor into a generic app skin and weaken fast recognition in
bright, on-the-go working conditions. The background is painted explicitly.

## Palette

- `paper #F5EBCF` — warm ticket stock / page background.
- `paper-raised #FFF8E7` — input and sheet surfaces.
- `ink #172A2B` — near-black teal; body and structural lines (12.3:1 on paper).
- `ink-muted #53635F` — secondary copy (5.4:1 on paper).
- `rail #16615B` — primary teal; movement and action (6.2:1 on paper).
- `signal #B93724` — vermilion change marker and danger (4.9:1 on paper).
- `brass #A56A12` — accent rules and warning fields; decorative unless paired
  with text/symbol.
- `confirmed #23683B` — acknowledgement stamp (6.4:1 on paper-raised).
- `night #0D1B1C` — poster footer and high-contrast reverse surfaces.

No state is color-only: every status has an icon/word and timestamp.

## Typography

- Display: `Georgia`, `Times New Roman`, serif. Its high-contrast strokes evoke
  engraved destination boards while remaining a zero-download system face.
- Utility: `Arial`, `Helvetica Neue`, sans-serif. Clear, compact, and familiar
  in forms. Numbers use `font-variant-numeric: tabular-nums`.
- Scale: 0.875 / 1 / 1.25 / 1.75 / clamp(2.4, 7vw, 5.4) rem. Body never below
  16 px. Measures stop at 68 characters.

## Spacing and shape

An 8 px base rhythm with 4 px for optical corrections: 4, 8, 16, 24, 32, 48,
64, 96. Major regions are separated by whitespace and route rules rather than
unnecessary cards. Corners are 2–6 px like clipped tickets, never pill-heavy.
Control targets are at least 44 px. Layout max-width is 1180 px; at 390 px the
poster art becomes a compact masthead, form columns stack, and secondary prose
drops below the primary workflow.

## Interaction grammar

- Primary action: solid teal rectangle with an offset brass shadow, moving 2 px
  toward the stock when pressed.
- Mode changes: old and new stops exchange emphasis along one horizontal line.
- Status: `Prepared → Notified → Acknowledged`, always visible as three named
  stops. A receipt adds a rotated punch stamp, not confetti.
- Destructive actions name the appointment and require confirmation. Undo is
  offered after archive where possible.
- Empty, offline, validation, imported receipt, and update-ready states each
  provide a concrete next action in a live region.

## Motion

Transitions are 180–240 ms, limited to opacity and transform. A route line draws
once when a new card is created and a punch stamp settles from 4 px above when a
receipt is imported. Nothing loops. Under `prefers-reduced-motion: reduce`,
animation and smooth scrolling are removed and state changes are immediate.

## Asset plan and provenance

The hero is an original raster illustration: an abstract art-deco transit scene
with two platform clocks connected by a decisive route, leaving calm negative
space for the product masthead. It explains “a changed appointment that visibly
arrives” rather than decorating the screen. App icons and interface symbols are
hand-authored SVG/CSS geometry because they must remain sharp and accessible.

### Image prompt sheet

- Subject: two stylized station clocks / destination discs connected by a bold
  rerouted line, with one punched confirmation seal.
- World: imaginary small-city transit concourse, no people, no brands.
- Materials: screen-printed ink, cream paper fibers, subtle offset registration.
- Light/lens: flat poster lighting, orthographic frontal composition.
- Palette words: warm ticket cream, deep petrol teal, vermilion signal red,
  aged brass.
- Negative list: no text, letters, numbers, logos, watermarks, gradients,
  photoreal people, brand symbols, UI screenshots, illegible pseudo-type.
- Production prompt: “Art-deco transit poster illustration for a privacy-first
  appointment reschedule utility. Two geometric station-clock discs represent an
  old stop and a new stop, connected by one clear stepped rail line ending in a
  small punched confirmation seal. Screen-printed ink on warm cream paper,
  deep petrol teal, vermilion red and aged brass, bold 1930s geometry, subtle
  paper grain and offset registration, frontal wide composition, strong
  silhouette, generous calm negative space. No text, no letters, no numbers,
  no logos, no watermark, no people, no brands, no UI screenshot, no gradient.”

Generated on 2026-08-28 with the factory Azure image deployment via
`/opt/fleet/lib/gen-image.sh`. Original project asset; no third-party source
material. The selected render is reviewed for text artifacts, unintended marks,
seams, brand resemblance, and palette consistency. Source PNG and prompt sidecar
live under `assets/src/`; optimized WebP ships in `public/assets/`.

The 1200 × 630 social preview is a centered crop of that reviewed original hero,
made locally with ImageMagick. The 180 px Apple touch icon is resized from the
project’s hand-authored app icon. Neither derivative adds outside artwork, text,
logos, or third-party material.
