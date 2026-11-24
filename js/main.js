import { show_metadata } from '../media/posters/metadata.js'
import { photos, countries, photoHash } from './photos.js'
import { setUpBackToTop } from './ui.js'

const CREDITS_VISIBLE = 10

/* --------------------------------------------------------------------------
   Experience: durations ("2 yrs 1 mo"), counted inclusively like LinkedIn
   -------------------------------------------------------------------------- */
function monthsBetween (from, to) {
  const [fy, fm] = from.split('-').map(Number)
  let ty, tm
  if (to === 'present') {
    const now = new Date()
    ty = now.getFullYear()
    tm = now.getMonth() + 1
  } else {
    ;[ty, tm] = to.split('-').map(Number)
  }
  return (ty - fy) * 12 + (tm - fm) + 1
}

function formatDuration (months) {
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts = []
  if (y) parts.push(`${y} yr${y > 1 ? 's' : ''}`)
  if (m) parts.push(`${m} mo${m > 1 ? 's' : ''}`)
  return parts.join(' ')
}

function renderDurations () {
  document.querySelectorAll('.duration[data-from]').forEach(el => {
    const months = monthsBetween(el.dataset.from, el.dataset.to || 'present')
    if (months > 0) el.textContent = formatDuration(months)
  })
}

/* --------------------------------------------------------------------------
   Credits
   -------------------------------------------------------------------------- */
function el (tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

function renderCredits () {
  const list = document.getElementById('credits-list')
  const more = document.getElementById('credits-more')
  const buttons = document.querySelectorAll('.segmented [data-filter]')
  if (!list) return

  const credits = Object.entries(show_metadata)
    .sort(([a], [b]) => (a < b ? 1 : -1)) // file names are numbered chronologically
    .map(([file, data]) => ({
      ...data,
      icon: `media/posters/${file.replace(/\.jpg$/, '.webp')}`
    }))

  const items = credits.map(data => {
    const li = el('li', 'credit')
    li.dataset.credited = data.credited ? 'true' : 'false'

    const link = el('a', 'credit__link')
    link.href = `https://www.imdb.com/title/${data.imdb_id}/`
    link.target = '_blank'
    link.rel = 'noopener'

    const poster = el('img', 'credit__poster')
    poster.src = data.icon
    poster.alt = ''
    poster.width = 28
    poster.height = 42
    poster.loading = 'lazy'
    poster.decoding = 'async'
    poster.addEventListener('error', () => poster.classList.add('is-missing'), {
      once: true
    })

    const title = el('span', 'credit__title', data.title)
    if (data.credited) title.append(el('span', 'credit__tag', 'credited'))
    const ext = el('span', 'ext', '↗')
    ext.setAttribute('aria-hidden', 'true')
    title.append(ext)

    const text = el('span', 'credit__text')
    text.append(title)
    if (data.starring?.length) {
      text.append(el('span', 'credit__cast', data.starring.join(', ')))
    }

    link.append(poster, text, el('span', 'credit__year', data.year))
    li.append(link)
    return li
  })
  list.replaceChildren(...items)

  document.querySelector('[data-count="all"]').textContent = credits.length
  document.querySelector('[data-count="credited"]').textContent =
    credits.filter(c => c.credited).length

  let filter =
    document.querySelector('.segmented [aria-pressed="true"]')?.dataset
      .filter || 'credited'
  let expanded = false

  const update = () => {
    list.dataset.filter = filter // the 'credited' tag is redundant when only credited rows show
    const matching = items.filter(
      li => filter === 'all' || li.dataset.credited === 'true'
    )
    items.forEach(li => (li.hidden = true))
    matching.forEach((li, i) => (li.hidden = !expanded && i >= CREDITS_VISIBLE))

    const hiddenCount = matching.length - CREDITS_VISIBLE
    more.hidden = hiddenCount <= 0
    more.textContent = expanded ? 'Show fewer' : `Show all ${matching.length}`
    more.setAttribute('aria-expanded', String(expanded))
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      filter = button.dataset.filter
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)))
      update()
    })
  })

  more.addEventListener('click', () => {
    const collapsing = expanded
    expanded = !expanded
    update()
    if (collapsing) {
      document.getElementById('credits').scrollIntoView({ block: 'start' })
    }
  })

  update()
}

/* --------------------------------------------------------------------------
   Photography teaser
   -------------------------------------------------------------------------- */
function renderPhotoTeaser () {
  const stats = document.getElementById('photo-stats')
  const strip = document.getElementById('photo-strip')
  if (!strip || !photos.length) return

  if (stats) {
    stats.textContent = `${photos.length} of them are pinned on a map, across ${countries.length} countries.`
  }

  // Newest first, but one per place
  const seen = new Set()
  const picks = []
  for (const photo of photos) {
    if (seen.has(photo.place.short)) continue
    seen.add(photo.place.short)
    picks.push(photo)
    if (picks.length === 4) break
  }

  strip.replaceChildren(
    ...picks.map(photo => {
      const a = el('a')
      a.href = `photography.html${photoHash(photo)}`
      a.setAttribute(
        'aria-label',
        `Photo: ${photo.place.short}, ${photo.dateLabel}`
      )
      const img = el('img')
      img.src = photo.thumb
      img.alt = ''
      img.loading = 'lazy'
      img.decoding = 'async'
      a.append(img)
      return a
    })
  )
}

/* --------------------------------------------------------------------------
   Contact: copy email
   -------------------------------------------------------------------------- */
function setUpCopyEmail () {
  const button = document.getElementById('copy-email')
  const status = document.getElementById('copy-status')
  if (!button) return
  let timer

  button.addEventListener('click', async () => {
    const email = button.dataset.email
    let ok = false
    try {
      await navigator.clipboard.writeText(email)
      ok = true
    } catch {
      // Fallback for browsers without the async clipboard API.
      const input = document.createElement('textarea')
      input.value = email
      input.setAttribute('readonly', '')
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.append(input)
      input.select()
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
      input.remove()
    }
    status.textContent = ok
      ? 'Copied to clipboard'
      : 'Copy failed. Select the address instead.'
    clearTimeout(timer)
    timer = setTimeout(() => (status.textContent = ''), 2500)
  })
}

/* --------------------------------------------------------------------------
   Old hash links (#about, #work) from the previous version of the site
   -------------------------------------------------------------------------- */
function handleLegacyHash () {
  const legacy = { about: 'main', work: 'credits', 'hero-tab': 'main' }
  const target = legacy[location.hash.slice(1)]
  if (!target) return
  history.replaceState(
    null,
    '',
    target === 'main' ? location.pathname : `#${target}`
  )
  if (target !== 'main')
    document.getElementById(target)?.scrollIntoView({ behavior: 'instant' })
}

document
  .querySelectorAll('[data-year]')
  .forEach(node => (node.textContent = new Date().getFullYear()))
renderDurations()
renderCredits()
renderPhotoTeaser()
setUpCopyEmail()
setUpBackToTop()
handleLegacyHash()
