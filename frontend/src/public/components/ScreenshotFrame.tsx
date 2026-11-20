import { useState } from 'react'
import { ImageOff } from 'lucide-react'

export type ScreenshotFrameProps = {
  src: string
  alt: string
  caption: string
  label?: string
}

/** Displays a real captured PNG. If a capture is missing, it says so plainly. */
export function ScreenshotFrame({ src, alt, caption, label }: ScreenshotFrameProps) {
  const [failed, setFailed] = useState(false)

  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label ?? 'Running prototype'}</span>
        <span className="text-[11px] font-medium text-muted">Real capture</span>
      </div>
      <div className="bg-soft p-2 md:p-3">
        {failed ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-white px-4 text-center">
            <ImageOff size={22} className="text-muted" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">Capture not present</p>
            <p className="max-w-sm text-xs leading-relaxed text-muted">
              Run scripts/capture_screenshots.mjs against http://127.0.0.1:5173 to generate this image. No image has been substituted.
            </p>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="block h-auto w-full rounded-lg border border-line"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <figcaption className="px-4 py-3 text-xs leading-relaxed text-muted">{caption}</figcaption>
    </figure>
  )
}

export default ScreenshotFrame
