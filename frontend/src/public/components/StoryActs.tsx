import { useEffect, useRef, useState } from 'react'
import { Eyebrow, Container } from './ui'

type Act = {
  n: string
  title: string
  body: string
}

const acts: Act[] = [
  {
    n: '01',
    title: 'Signal everywhere',
    body: 'A system emits many signals at once: CPU, memory, disk, network, request rate, latency, errors, connections. On their own they are just numbers moving in time.',
  },
  {
    n: '02',
    title: 'The anomaly hides in normal behaviour',
    body: 'A fault rarely announces itself. It appears as a small change inside ordinary variation — one metric drifting, or several moving together for a short window.',
  },
  {
    n: '03',
    title: 'Detection is only the beginning',
    body: 'A detector can rank records and set a flag. That tells you where to look, but not what happened, why it happened, or what to do next.',
  },
  {
    n: '04',
    title: 'Evidence creates understanding',
    body: 'TraceLens compares each flagged value with a learned robust baseline, then writes the deviation, the evidence and the open questions into plain language.',
  },
  {
    n: '05',
    title: 'Investigation creates action',
    body: 'An analyst adds notes, escalates with a reason and severity, and records a resolution. Each step changes the incident state and leaves an audit entry.',
  },
  {
    n: '06',
    title: 'Every decision traceable',
    body: 'The dataset, method, threshold, metrics, explanation and incident history stay connected, so a report can be reproduced instead of merely asserted.',
  },
]

/** A small original line visual, varied by act — an illustration, not a chart of data. */
function ActVisual({ index }: { index: number }) {
  const highlighted = index % 3
  const points = [
    [8, 46], [22, 42], [36, 47], [50, 40], [64, 44], [78, 39], [92, 43],
  ] as const
  const spike = points.map(([x, y], i) => (i === highlighted + 2 ? `${x},${y - (index >= 2 ? 22 : 8)}` : `${x},${y}`)).join(' ')

  return (
    <svg viewBox="0 0 100 56" className="h-auto w-full" role="img" aria-label="Illustrative signal trace, not measured data">
      <line x1="4" y1="50" x2="96" y2="50" stroke="#E2E8F0" strokeWidth="1" />
      <line x1="4" y1="30" x2="96" y2="30" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
      <polyline points={spike} fill="none" stroke="#0E7C7B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y], i) => (
        <circle key={x} cx={x} cy={i === highlighted + 2 ? y - (index >= 2 ? 22 : 8) : y} r={i === highlighted + 2 ? 3 : 1.6} fill={i === highlighted + 2 ? '#0B1F3A' : '#0E7C7B'} />
      ))}
    </svg>
  )
}

export function StoryActs() {
  const [animate, setAnimate] = useState(false)
  const [seen, setSeen] = useState<Set<number>>(() => new Set())
  const refs = useRef<Array<HTMLElement | null>>([])

  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || typeof IntersectionObserver === 'undefined') return
    setAnimate(true)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const idx = Number((entry.target as HTMLElement).dataset.act)
        if (entry.isIntersecting) {
          setSeen((prev) => new Set(prev).add(idx))
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' })
    refs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section className="bg-soft py-12 md:py-16" aria-labelledby="story-acts-heading">
      <Container>
        <Eyebrow>Story mode</Eyebrow>
        <h2 id="story-acts-heading" className="max-w-3xl text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          Six acts: from a stream of numbers to a decision you can defend
        </h2>

        <div className="relative mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="pointer-events-none absolute left-6 top-0 hidden h-full w-px bg-line lg:block" aria-hidden="true" />
          {acts.map((act, index) => {
            const visible = !animate || seen.has(index)
            return (
              <article
                key={act.n}
                ref={(el) => { refs.current[index] = el }}
                data-act={index}
                className={`relative rounded-xl border border-line bg-white p-5 shadow-card transition-all duration-500 ${
                  visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                    {act.n}
                  </span>
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                </div>
                <div className="mb-4 rounded-lg bg-paper p-3">
                  <ActVisual index={index} />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-ink">{act.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-body">{act.body}</p>
              </article>
            )
          })}
        </div>
        <p className="mt-8 text-xs leading-relaxed text-muted">
          The signal drawings above are illustrations of the concept, not measured telemetry or performance claims.
        </p>
      </Container>
    </section>
  )
}

export default StoryActs
