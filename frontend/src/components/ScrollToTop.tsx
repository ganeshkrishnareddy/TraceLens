import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Resets scrolling whenever the router moves to a new history entry.
 *
 * React Router keeps the document scroll position by default, so following a
 * link from a long page can land the reader halfway down the next page. This
 * runs before paint, covers same-path clicks and browser back/forward, and
 * restores an in-page anchor when the URL contains a hash.
 */
export function ScrollToTop() {
  const { key, pathname, hash } = useLocation()

  useLayoutEffect(() => {
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (target) {
        target.scrollIntoView({ block: 'start' })
        return
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.querySelectorAll('[data-scroll-container]').forEach((el) => {
      el.scrollTop = 0
      el.scrollLeft = 0
    })
  }, [key, pathname, hash])

  return null
}

export default ScrollToTop
