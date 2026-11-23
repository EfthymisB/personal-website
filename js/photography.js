import { photos, countries, photoHash } from './photos.js'
import { setUpBackToTop } from './ui.js'

const galleryEl = document.getElementById('gallery')
const filtersEl = document.getElementById('filters')
const mapEl = document.getElementById('map')

let activeCountry = 'all'
let visible = photos.slice()

const el = (tag, className, text) => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

/* ==========================================================================
   Summary + filters
   ========================================================================== */
function renderSummary () {
  const target = document.getElementById('photo-summary')
  const years = photos
    .map(p => p.date.slice(0, 4))
    .filter(Boolean)
    .sort()
  const span = years.length
    ? years[0] === years[years.length - 1]
      ? years[0]
      : `${years[0]} – ${years[years.length - 1]}`
    : ''
  const parts = [
    `${photos.length} photos`,
    `${countries.length} countries`,
    span
  ].filter(Boolean)
  target.replaceChildren(...parts.map(text => el('span', null, text)))
}

function renderFilters () {
  const options = [['all', photos.length], ...countries]
  const buttons = options.map(([country, count]) => {
    const button = el('button', null, country === 'all' ? 'All' : country)
    button.type = 'button'
    button.dataset.country = country
    button.setAttribute('aria-pressed', String(country === activeCountry))
    button.append(el('span', 'count', String(count)))
    button.addEventListener('click', () => setCountry(country))
    return button
  })
  filtersEl.replaceChildren(...buttons)
}

function setCountry (country, { fit = true } = {}) {
  activeCountry = country
  visible = photos.filter(p => country === 'all' || p.place.country === country)
  filtersEl
    .querySelectorAll('button')
    .forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.country === country))
    )
  items.forEach((item, i) => (item.hidden = !visible.includes(photos[i])))
  layoutGallery()
  map.filter(country, { fit })
}

/* ==========================================================================
   Justified gallery
   ========================================================================== */
const items = photos.map(photo => {
  const button = el('button', 'gallery__item')
  button.type = 'button'
  button.setAttribute(
    'aria-label',
    `Open photo: ${photo.place.short}, ${photo.dateLabel}`
  )

  const img = el('img')
  img.alt = ''
  img.loading = 'lazy'
  img.decoding = 'async'
  img.width = photo.width
  img.height = photo.height
  img.addEventListener('load', () => {
    img.classList.add('is-loaded')
    if (!photo.hasSize && img.naturalWidth) {
      photo.width = img.naturalWidth
      photo.height = img.naturalHeight
      photo.hasSize = true
      scheduleLayout()
    }
  })
  img.addEventListener('error', () => {
    // Fall back to the full-size image if a thumbnail is missing.
    if (!img.dataset.fallback) {
      img.dataset.fallback = '1'
      img.src = photo.src
    }
  })
  img.src = photo.thumb

  button.append(img, el('span', 'gallery__caption', photo.place.short))
  button.addEventListener('click', () => lightbox.open(photo, button))
  return button
})

galleryEl.append(...items)

function layoutGallery () {
  const width = galleryEl.clientWidth
  if (!width) return
  const gap = 6
  const target = width < 520 ? 150 : width < 900 ? 210 : 270

  let y = 0
  let row = []
  let ratioSum = 0

  const placeRow = (height, stretch) => {
    let x = 0
    row.forEach(({ item, ratio }, i) => {
      // Let the last item absorb rounding so justified rows end flush.
      const w = stretch && i === row.length - 1 ? width - x : ratio * height
      Object.assign(item.style, {
        left: `${x}px`,
        top: `${y}px`,
        width: `${w}px`,
        height: `${height}px`
      })
      x += w + gap
    })
    y += height + gap
    row = []
    ratioSum = 0
  }

  visible.forEach(photo => {
    const ratio = photo.width / photo.height
    row.push({ item: items[photo.index], ratio })
    ratioSum += ratio
    const rowWidth = ratioSum * target + gap * (row.length - 1)
    if (rowWidth >= width) {
      placeRow((width - gap * (row.length - 1)) / ratioSum, true)
    }
  })
  if (row.length) placeRow(target, false)

  galleryEl.style.height = `${Math.max(0, y - gap)}px`
}

let layoutFrame = 0
function scheduleLayout () {
  cancelAnimationFrame(layoutFrame)
  layoutFrame = requestAnimationFrame(layoutGallery)
}

let lastWidth = 0
new ResizeObserver(entries => {
  const w = entries[0].contentRect.width
  if (w !== lastWidth) {
    lastWidth = w
    scheduleLayout()
  }
}).observe(galleryEl)

/* ==========================================================================
   Map
   ========================================================================== */
const map = (() => {
  const groups = []
  let leafletMap = null

  const api = {
    ready: false,
    filter () {},
    focus () {},
    fitAll () {}
  }

  if (typeof window.L === 'undefined' || !mapEl) {
    if (mapEl) {
      mapEl.classList.add('map--unavailable')
      mapEl.append(el('p', 'map-hint', 'The map could not be loaded.'))
    }
    document.querySelector('.map-hint')?.remove()
    return api
  }

  const L = window.L
  leafletMap = L.map(mapEl, {
    scrollWheelZoom: false,
    worldCopyJump: true,
    zoomSnap: 0.5
  })

  // Standard OSM tiles, darkened with a CSS filter (see .map .leaflet-tile-pane).
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(leafletMap)
  leafletMap.attributionControl.setPrefix(
    '<a href="https://leafletjs.com">Leaflet</a>'
  )

  // Scroll-zoom only after the user has clicked into the map, so page scrolling isn't hijacked.
  leafletMap.on('click', () => leafletMap.scrollWheelZoom.enable())
  leafletMap.on('mouseout', () => leafletMap.scrollWheelZoom.disable())

  // Group photos taken within roughly a kilometre of each other into one pin.
  const byKey = new Map()
  photos.forEach(photo => {
    if (typeof photo.lat !== 'number' || typeof photo.lng !== 'number') return
    const key = `${photo.lat.toFixed(2)},${photo.lng.toFixed(2)}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(photo)
  })

  byKey.forEach(groupPhotos => {
    const lat = groupPhotos.reduce((s, p) => s + p.lat, 0) / groupPhotos.length
    const lng = groupPhotos.reduce((s, p) => s + p.lng, 0) / groupPhotos.length
    const count = groupPhotos.length
    const size = count > 1 ? 22 : 14
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'map-marker',
        html: `<span class="map-marker__dot">${count > 1 ? count : ''}</span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
      }),
      keyboard: true,
      title: `${groupPhotos[0].place.short} (${count} photo${
        count > 1 ? 's' : ''
      })`,
      riseOnHover: true
    })

    marker.bindPopup(() => buildPopup(groupPhotos), {
      maxWidth: 300,
      minWidth: 140
    })
    marker.addTo(leafletMap)
    groups.push({ marker, photos: groupPhotos })
  })

  function buildPopup (groupPhotos) {
    const root = el('div')
    root.append(el('div', 'popup__place', groupPhotos[0].place.short))
    const dates = [...new Set(groupPhotos.map(p => p.dateLabel))]
    const metaText =
      groupPhotos.length > 1
        ? `${groupPhotos.length} photos · ${
            dates.length > 1
              ? `${dates[dates.length - 1]} – ${dates[0]}`
              : dates[0]
          }`
        : dates[0]
    root.append(el('div', 'popup__meta', metaText))

    const thumbs = el(
      'div',
      `popup__thumbs${groupPhotos.length === 1 ? ' popup__thumbs--single' : ''}`
    )
    groupPhotos.forEach(photo => {
      const button = el('button')
      button.type = 'button'
      button.setAttribute('aria-label', `Open photo from ${photo.dateLabel}`)
      const img = el('img')
      img.src = photo.thumb
      img.alt = ''
      // Reserve space so the popup doesn't reposition when thumbnails arrive.
      const h = groupPhotos.length === 1 ? 150 : 72
      img.style.width = `${Math.round((photo.width / photo.height) * h)}px`
      button.append(img)
      button.addEventListener('click', () => lightbox.open(photo, button))
      thumbs.append(button)
    })
    root.append(thumbs)

    // Leaflet sizes popups by measuring content; give it an explicit width so thumbnails sit in rows.
    const h = groupPhotos.length === 1 ? 150 : 72
    const rowWidth =
      groupPhotos.reduce(
        (sum, p) => sum + Math.round((p.width / p.height) * h),
        0
      ) +
      4 * (groupPhotos.length - 1)
    root.style.width = `${Math.max(140, Math.min(260, rowWidth))}px`
    return root
  }

  const visibleGroups = () =>
    groups.filter(
      g =>
        activeCountry === 'all' ||
        g.photos.some(p => p.place.country === activeCountry)
    )

  function fitTo (list, animate = true) {
    if (!list.length) return
    const bounds = L.latLngBounds(list.map(g => g.marker.getLatLng()))
    leafletMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 11, animate })
  }

  const ResetControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd () {
      const button = L.DomUtil.create('button', 'map-control')
      button.type = 'button'
      button.textContent = 'Fit all'
      button.title = 'Zoom to show every pin'
      L.DomEvent.disableClickPropagation(button)
      button.addEventListener('click', () => {
        leafletMap.closePopup()
        fitTo(visibleGroups())
      })
      return button
    }
  })
  leafletMap.addControl(new ResetControl())

  api.ready = true

  api.filter = (country, { fit = true } = {}) => {
    leafletMap.closePopup()
    groups.forEach(g => {
      const show =
        country === 'all' || g.photos.some(p => p.place.country === country)
      if (show && !leafletMap.hasLayer(g.marker)) g.marker.addTo(leafletMap)
      if (!show && leafletMap.hasLayer(g.marker)) g.marker.remove()
    })
    if (fit) fitTo(visibleGroups())
  }

  api.focus = photo => {
    const group = groups.find(g => g.photos.includes(photo))
    if (!group) return
    if (!leafletMap.hasLayer(group.marker)) group.marker.addTo(leafletMap)
    mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    leafletMap.invalidateSize()
    leafletMap.flyTo(
      group.marker.getLatLng(),
      Math.max(leafletMap.getZoom(), 12),
      { duration: 0.8 }
    )
    leafletMap.once('moveend', () => group.marker.openPopup())
  }

  fitTo(groups, false)
  return api
})()

/* ==========================================================================
   Lightbox
   ========================================================================== */
const lightbox = (() => {
  const root = document.getElementById('lightbox')
  const stage = document.getElementById('lightbox-stage')
  const img = document.getElementById('lightbox-img')
  const place = document.getElementById('lightbox-place')
  const exif = document.getElementById('lightbox-exif')
  const counter = document.getElementById('lightbox-counter')
  const closeBtn = document.getElementById('lightbox-close')
  const prevBtn = document.getElementById('lightbox-prev')
  const nextBtn = document.getElementById('lightbox-next')
  const mapBtn = document.getElementById('lightbox-map')

  let list = []
  let current = 0
  let opener = null
  let pushedHistory = false
  let loadToken = 0
  let afterClose = null

  const isOpen = () => !root.hidden

  function preload (photo) {
    if (photo) new Image().src = photo.src
  }

  function show (index) {
    current = (index + list.length) % list.length
    const photo = list[current]
    const token = ++loadToken

    // Show the (already cached) thumbnail immediately, then swap in the full image.
    img.src = photo.thumb
    img.alt = `Photo taken in ${photo.place.full}`
    const full = new Image()
    full.onload = () => {
      if (token === loadToken) img.src = photo.src
    }
    full.src = photo.src

    place.textContent = photo.place.full
    exif.textContent = [photo.dateLabel, ...photo.exif]
      .filter(Boolean)
      .join('  ·  ')
    counter.textContent = `${current + 1} / ${list.length}`
    const multiple = list.length > 1
    prevBtn.hidden = nextBtn.hidden = !multiple
    mapBtn.hidden = !map.ready

    history.replaceState(history.state, '', photoHash(photo))

    preload(list[(current + 1) % list.length])
    preload(list[(current - 1 + list.length) % list.length])
  }

  function open (photo, trigger = null, { fromHash = false } = {}) {
    list = visible.includes(photo) ? visible : photos
    opener = trigger
    if (!isOpen()) {
      const scrollbar = window.innerWidth - document.documentElement.clientWidth
      document.body.style.paddingRight = scrollbar ? `${scrollbar}px` : ''
      document.body.classList.add('is-locked')
      root.hidden = false
      requestAnimationFrame(() => root.classList.add('is-open'))
      if (!fromHash) {
        history.pushState({ lightbox: true }, '', photoHash(photo))
        pushedHistory = true
      }
    }
    show(list.indexOf(photo))
    closeBtn.focus({ preventScroll: true })
  }

  function teardown () {
    root.classList.remove('is-open')
    root.hidden = true
    img.removeAttribute('src')
    document.body.classList.remove('is-locked')
    document.body.style.paddingRight = ''
    if (opener && document.contains(opener))
      opener.focus({ preventScroll: true })
    opener = null
    const next = afterClose
    afterClose = null
    if (next) requestAnimationFrame(next)
  }

  function close () {
    if (!isOpen()) return
    if (pushedHistory) {
      pushedHistory = false
      history.back() // popstate handler finishes the teardown
    } else {
      history.replaceState(null, '', location.pathname + location.search)
      teardown()
    }
  }

  window.addEventListener('popstate', () => {
    if (isOpen()) {
      pushedHistory = false
      teardown()
    }
  })

  closeBtn.addEventListener('click', close)
  prevBtn.addEventListener('click', () => show(current - 1))
  nextBtn.addEventListener('click', () => show(current + 1))
  mapBtn.addEventListener('click', () => {
    const photo = list[current]
    opener = null
    afterClose = () => map.focus(photo)
    close()
  })

  // Click on the dark area around the photo closes the viewer.
  stage.addEventListener('click', event => {
    if (event.target !== stage && event.target !== img) return
    if (event.target === img) {
      const rect = img.getBoundingClientRect()
      const natural = img.naturalWidth / img.naturalHeight || 1.5
      const box = rect.width / rect.height
      const drawnW = box > natural ? rect.height * natural : rect.width
      const drawnH = box > natural ? rect.height : rect.width / natural
      const dx = Math.abs(event.clientX - (rect.left + rect.width / 2))
      const dy = Math.abs(event.clientY - (rect.top + rect.height / 2))
      if (dx <= drawnW / 2 && dy <= drawnH / 2) return
    }
    close()
  })

  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'ArrowRight') {
      show(current + 1)
    } else if (event.key === 'ArrowLeft') {
      show(current - 1)
    } else if (event.key === 'Tab') {
      // Keep focus inside the dialog.
      const focusable = [...root.querySelectorAll('button')].filter(
        b => !b.hidden && b.offsetParent !== null
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  })

  // Swipe left/right on touch screens.
  let touchX = null
  let touchY = null
  stage.addEventListener(
    'touchstart',
    event => {
      if (event.touches.length !== 1) {
        touchX = null
        return
      }
      touchX = event.touches[0].clientX
      touchY = event.touches[0].clientY
    },
    { passive: true }
  )
  stage.addEventListener(
    'touchend',
    event => {
      if (touchX === null) return
      const dx = event.changedTouches[0].clientX - touchX
      const dy = event.changedTouches[0].clientY - touchY
      touchX = null
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        show(current + (dx < 0 ? 1 : -1))
      }
    },
    { passive: true }
  )

  return { open, close, isOpen }
})()

/* ==========================================================================
   Boot
   ========================================================================== */
function openFromHash () {
  const match = location.hash.match(/^#photo-(.+)$/)
  if (!match) return
  const photo = photos.find(p => p.id === decodeURIComponent(match[1]))
  if (photo) lightbox.open(photo, items[photo.index], { fromHash: true })
}

document
  .querySelectorAll('[data-year]')
  .forEach(node => (node.textContent = new Date().getFullYear()))
renderSummary()
renderFilters()
layoutGallery()
setUpBackToTop()
openFromHash()
window.addEventListener('hashchange', () => {
  if (!lightbox.isOpen()) openFromHash()
})
