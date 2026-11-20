# TraceLens — Brand Guidelines

> Source of truth for identity, palette and typography: `TRANSFORMATION_CONTRACT.md`
> §2 (Product identity) and §3 (Design system). These rules apply to the public site
> and the analyst app. Light theme only.

## 1. Identity

**TraceLens — Explainable Anomaly Intelligence.**

The identity is built on three original, product-native motifs. They are derived
from the product name, tagline and story acts in the contract — not generic stock
imagery:

| Motif | Meaning | Story link |
|---|---|---|
| **Lens** | A focused instrument that brings a signal into view; the "lens" in TraceLens. | "See the signal." |
| **Signal** | A measured telemetry waveform (CPU, memory, network …) in which an anomaly hides. | "signal everywhere → anomaly hides in normal behaviour" |
| **Evidence node** | A single flagged record connected by thin lines to the observations, model decision, recommended checks and unknowns behind it. | "evidence creates understanding → every decision traceable" |

Use the lens as the primary mark, the signal waveform as supporting motion, and
the evidence node as the recurring UI unit in explanations and incident views
(a score at the centre, thin connectors to evidence, interpretation, next steps and
unknowns). Keep the marks line-based and restrained.

**Words**

- Descriptor: Explainable Anomaly Intelligence
- Tagline: "See the signal. Understand the anomaly. Act with confidence."
- Public story headline: "See Beyond the Alert. Understand the Anomaly."
- Trust line: "Evidence-driven. Explainable. Reproducible."
- Participant line: "Built by ProgVision — individual participant, AEGYTHON 2026."

Never invent employees, customers, certification, production deployment or
partnerships, and never describe the participant as a company or team.

## 2. Palette — light theme ONLY

Do **not** introduce dark mode, neon, glow, heavy gradients, generic target/brain
icons or random stock art.

| Token | Value | Use |
|---|---|---|
| Page background | `#F6F8FB` | app + site background |
| Surface | `#FFFFFF` | cards, panels |
| Soft section | `#EEF2F7` | alternating sections |
| Ink / heading | `#0B1F3A` | headings |
| Body text | `#334155` | body copy |
| Muted text | `#64748B` | captions, labels |
| Border | `#E2E8F0` | hairlines |
| Primary teal | `#0E7C7B` | actions, focus, emphasis |
| Primary hover | `#0A6363` | hover / pressed |
| Secondary blue | `#2563EB` | sparse accent only |
| Success | `#0F766E` | resolved / healthy — always with words |
| Warning | `#B45309` | elevated / severe — always with words |
| Critical | `#B91C1C` | critical — always with words |

## 3. Typography

- Font stack: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`.
- Type scale (px): **12 / 14 / 16 / 20 / 24 / 30 / 36 / 48**.
- Headings: `font-semibold tracking-tight`. Body: `leading-relaxed`.
- Use tabular numerals in tables and chart axes; keep KPI numbers proportional.

## 4. Spacing, radius, elevation

- Spacing scale (px): **4, 8, 12, 16, 24, 32, 48**.
- Radius: **8 / 12 / 16 px**.
- Shadow: `0 1px 2px rgba(15,23,42,.04), 0 4px 14px rgba(15,23,42,.06)` — restrained.

## 5. Usage rules

- **One accent per view.** Grey everything else. Teal is the default accent; blue
  is a sparse secondary accent only.
- **Charts** start at zero, use direct labels, no 3D, no dual axes. Green/red (teal/
  critical) mean good/bad only together with ▲ ▼ and words — never colour alone.
- **Contrast:** every text colour ≥ 4.5:1; every interactive element has a visible
  focus ring.
- **Responsive:** works at 360 px — one column, no sideways scroll except wide
  tables inside their own box.
- **Synthetic data** must be visibly labelled as synthetic wherever it appears
  (demo previews, screenshots, reports).
- **Screenshots** on the public site come from the real running app (`demo/shots/`);
  do not mock up product UI with invented numbers.
- **Footer links** must be real; include the GitHub link only once it is verified public.
- Do not publish or deploy; changes stop for review.

## 6. Asset ownership

Documentation and brand guidance live under `documentation/`, `research/` and
`assets/brand/**`. Brand source tokens in this file are the single reference for
Vega's `frontend/public/brand/**` assets; keep them in sync with the contract.

## 7. Anti-patterns (avoid)

Dark themes · neon/glow · heavy gradients · target or brain clip-art · random stock
photos · fabricated metrics or accuracy claims · colour-only status · axes that do
not start at zero · unlabelled synthetic data · unbranded or off-palette components.
