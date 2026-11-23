/* Shared page chrome for both pages. */

// Show the "back to top" button once the site header has scrolled out of view.
export function setUpBackToTop () {
  const button = document.getElementById('to-top')
  const header = document.querySelector('.site-header')
  if (!button || !header) return

  const setVisible = visible => {
    button.classList.toggle('is-visible', visible)
    // Keep it out of the tab order while it's hidden.
    button.tabIndex = visible ? 0 : -1
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) =>
      setVisible(!entry.isIntersecting)
    ).observe(header)
  } else {
    const check = () => setVisible(header.getBoundingClientRect().bottom < 0)
    addEventListener('scroll', check, { passive: true })
    check()
  }

  button.addEventListener('click', () => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' })
    // Send keyboard focus back to the top of the page too.
    document.querySelector('.wordmark')?.focus({ preventScroll: true })
  })
}
