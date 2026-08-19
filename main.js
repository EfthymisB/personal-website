import { show_metadata } from './media/posters/metadata.js'
import { photography_metadata } from './media/photography/photography_metadata.js'

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC'
]

const getImdbLink = imdbId => `https://www.imdb.com/title/${imdbId}/`

// Nav tabs (drive nav highlight + lazy init). Hero is a separate landing view.
const TABS_INITIALISED = {
  about: false,
  experience: false,
  work: false,
  photography: false,
  contact: false
}

const ALL_VIEWS = ['hero-tab', ...Object.keys(TABS_INITIALISED)]

let gallery
let heroTyped = false

/* ============================================================
   EXPERIENCE - timeline duration maths
   ============================================================ */
function timeLengthAsString (start, end) {
  const diff = Math.abs(end - start)
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365))
  const months = Math.floor(
    (diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30)
  )
  return `(${years > 0 ? `${years} yrs ` : ''}${months} mos)`
}

function calculateTimeSpans () {
  const periods = [...document.querySelectorAll('.period')].reverse()
  const periodGroups = new Map()

  periods.forEach(period => {
    const [startMonth, endMonth] = period.querySelectorAll('.month')
    const [startYear, endYear] = period.querySelectorAll('.year')
    const periodGroup = period.classList[1]

    const endDate =
      endYear.textContent === 'PRESENT'
        ? new Date()
        : new Date(
            parseInt(endYear.textContent),
            MONTHS.indexOf(endMonth.textContent)
          )
    const startDate = new Date(
      parseInt(startYear.textContent),
      MONTHS.indexOf(startMonth.textContent)
    )

    if (periodGroups.has(periodGroup)) {
      periodGroups.get(periodGroup).end = endDate
    } else {
      periodGroups.set(periodGroup, { start: startDate, end: endDate })
    }

    period.querySelector('.time_span').textContent = timeLengthAsString(
      startDate,
      endDate
    )
  })

  document.querySelectorAll('.period-sum').forEach(period => {
    const periodGroup = period.classList[1]
    const periodSum = periodGroups.get(periodGroup)
    if (periodSum) {
      period.textContent = timeLengthAsString(periodSum.start, periodSum.end)
    }
  })
}

/* ============================================================
   Shared helpers
   ============================================================ */
async function fetchTemplate (templatePath) {
  try {
    const response = await fetch(templatePath)
    if (!response.ok) throw new Error('Failed to fetch template')
    return await response.text()
  } catch (error) {
    console.error(error)
    return null
  }
}

async function fetchIMDBData (imdbId) {
  try {
    const response = await fetch(
      `https://data.ratings.media-imdb.com/${imdbId}/data.json`
    )
    if (!response.ok) throw new Error('Failed to fetch IMDB data')
    return await response.json()
  } catch (error) {
    console.error(error)
    return null
  }
}

/* ============================================================
   WORK - project cards
   ============================================================ */
function createCardElement (templateHTML, mediaPath, data, imdbData) {
  const div = document.createElement('div')
  div.className = 'grid-item'
  div.innerHTML = templateHTML
    .replace(/FRONT_IMG_PATH/g, mediaPath)
    .replace(/TITLE/g, data.title.split(':').join('<br>'))
    .replace(/YEAR/g, data.year)
    .replace(/STARRING/g, data.starring.join(' · '))
    .replace(/DESCRIPTION/g, data.description)
    .replace(/RATING/g, imdbData ? imdbData.imdbRating[0] : 'N/A')
    .replace(/VOTES/g, imdbData ? imdbData.imdbRating[1] : 'N/A')
    .replace(/ROLE/g, data.role)
    .replace(/COMPANY/g, data.company)
    .replace(/LOCATION/g, data.location)
    .replace(/IMDB_LINK/g, getImdbLink(data.imdb_id))

  if (!data.credited) {
    const badge = div.querySelector('.credit-checkmark')
    if (badge) badge.style.opacity = '0'
  }

  return div
}

async function setUpCards () {
  const mediaPaths = Object.keys(show_metadata)
    .map(key => `media/posters/${key}`)
    .sort()
    .reverse()
  const gridContainer = document.getElementById('grid-container')

  gridContainer.innerHTML =
    '<div class="loading-skeleton">Loading projects...</div>'

  const templateHTML = await fetchTemplate(
    'html_templates/grid_item_template.html'
  )

  if (!templateHTML) return

  gridContainer.innerHTML = ''
  const fragment = document.createDocumentFragment()

  const cardElements = []
  for (const mediaPath of mediaPaths) {
    const data = show_metadata[mediaPath.split('/').pop()]
    const cardElement = createCardElement(templateHTML, mediaPath, data, null)
    fragment.appendChild(cardElement)
    cardElements.push({ cardElement, data })
  }
  gridContainer.appendChild(fragment)

  cardElements.forEach(({ cardElement, data }) => {
    fetchIMDBData(data.imdb_id).then(imdbData => {
      if (!imdbData) return
      const ratingEl = cardElement.querySelector('.rating')
      const votesEl = cardElement.querySelector('.votes')
      if (ratingEl) ratingEl.textContent = imdbData.imdbRating[0]
      if (votesEl) votesEl.textContent = `${imdbData.imdbRating[1]} votes`
    })
  })
}

/* ============================================================
   PHOTOGRAPHY - map + justified gallery + lightGallery
   ============================================================ */
function initialisePhotographyMap () {
  window.PhotographyMap = L.map('photography_map')
  L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(window.PhotographyMap)

  Object.entries(photography_metadata).forEach(
    ([fileName, metadata], index) => {
      const latLng = [metadata.GPSInfo.lat, metadata.GPSInfo.lng]
      const popupContent = `
      <b>${metadata.DateTimeOriginal}</b><br>
      <img class="photography-popup-img" id="popup-img" src="media/photography/${fileName}" height="250" style="cursor:pointer;"/><br>
      <b>Lat: ${latLng[0].toFixed(6)}</b><br>
      <b>Lng: ${latLng[1].toFixed(6)}</b>
    `

      L.marker(latLng, {
        icon: new L.Icon({
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          iconUrl: 'media/website-utils/map_pin.png'
        }),
        photo_id: index
      })
        .addTo(window.PhotographyMap)
        .bindPopup(popupContent, { maxWidth: 650 })
        .on('popupopen', () => {
          document
            .getElementById('popup-img')
            .addEventListener('click', () => gallery.openGallery(index))
        })
    }
  )

  const resetViewBtn = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function () {
      const btn = L.DomUtil.create('button', 'reset-view-button')
      btn.type = 'button'
      btn.innerHTML = 'Reset View'
      L.DomEvent.disableClickPropagation(btn)
      btn.onclick = () => fitMapToMarkers()
      return btn
    }
  })

  const fullscreenBtn = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function () {
      const btn = L.DomUtil.create(
        'button',
        'reset-view-button map-fullscreen-button'
      )
      btn.type = 'button'
      btn.title = 'Toggle fullscreen'
      btn.innerHTML = '⛶ Fullscreen'
      L.DomEvent.disableClickPropagation(btn)
      btn.onclick = toggleMapFullscreen
      return btn
    }
  })

  window.PhotographyMap.addControl(new resetViewBtn())
  window.PhotographyMap.addControl(new fullscreenBtn())

  document.addEventListener('fullscreenchange', onMapFullscreenChange)
  document.addEventListener('webkitfullscreenchange', onMapFullscreenChange)

  fitMapToMarkers()
}

function toggleMapFullscreen () {
  const map = window.PhotographyMap
  if (!map) return
  const el = map.getContainer()
  const fsElement =
    document.fullscreenElement || document.webkitFullscreenElement

  if (!fsElement) {
    const request =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.msRequestFullscreen
    if (request) request.call(el)
  } else {
    const exit =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.msExitFullscreen
    if (exit) exit.call(document)
  }
}

function onMapFullscreenChange () {
  const map = window.PhotographyMap
  if (!map) return
  const container = map.getContainer()
  const fsElement =
    document.fullscreenElement || document.webkitFullscreenElement
  const isFs = fsElement === container

  container.classList.toggle('is-fullscreen', isFs)
  const btn = container.querySelector('.map-fullscreen-button')
  if (btn) btn.innerHTML = isFs ? '⛶ Exit' : '⛶ Fullscreen'

  // Give the browser a beat to resize the container, then re-measure.
  setTimeout(() => map.invalidateSize(), 150)
}

function fitMapToMarkers ({ ids = null } = {}) {
  if (!window.PhotographyMap) return

  const map = window.PhotographyMap
  const matched = []
  map.eachLayer(layer => {
    if (
      layer instanceof L.Marker &&
      (!ids || ids.includes(layer.options.photo_id))
    ) {
      matched.push(layer)
    }
  })
  if (!matched.length) return

  // Bring the map itself into view (centred) rather than jumping to the top.
  const mapEl = document.getElementById('photography_map')
  if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' })

  // Leaflet needs a beat after the smooth scroll to recompute sizing.
  setTimeout(() => {
    map.invalidateSize()
    if (ids && matched.length === 1) {
      // Focused on a single photo: centre on it and open its pin automatically.
      const marker = matched[0]
      map.setView(marker.getLatLng(), 12, { animate: true })
      marker.openPopup()
    } else {
      const bounds = L.latLngBounds()
      matched.forEach(m => bounds.extend(m.getLatLng()))
      map.fitBounds(bounds)
      map.closePopup()
    }
  }, 300)
}

function createPhotoElement (templateHTML, fileName, metadata, index) {
  const imgElement = document.createElement('img')
  imgElement.src = `media/photography/${fileName}`
  imgElement.loading = 'lazy'
  imgElement.alt = `Photo from ${metadata.GPSInfo.region.join(', ')}`

  const textElement = document.createElement('div')
  textElement.className = 'gps-info'
  textElement.innerHTML = metadata.GPSInfo.region
    .reverse()
    .join('<br>')
    .toLowerCase()

  const button = document.createElement('button')
  button.textContent = 'View on Map'
  button.className = 'view-button'
  button.addEventListener('click', event => {
    fitMapToMarkers({ ids: [index] })
    event.stopPropagation()
  })

  const shutterSpeed = Math.round(1 / metadata.ExposureTime)
  const imageMetadata = document.createElement('div')
  imageMetadata.innerHTML = templateHTML
    .replace(/FSTOP/g, `f/${metadata.FNumber}`)
    .replace(/SHUTTER_SPEED/g, `1/${shutterSpeed}`)
    .replace(/ISO/g, metadata.ISOSpeedRatings)
    .replace(/FOCAL_LENGTH/g, `${metadata.FocalLength}mm`)
    .replace(/DATE/g, metadata.DateTimeOriginal)

  const photoContainer = document.createElement('div')
  photoContainer.className = 'photo-container'
  photoContainer.dataset.index = index
  photoContainer.setAttribute('data-src', imgElement.src)
  photoContainer.setAttribute('data-sub-html', imageMetadata.innerHTML)

  photoContainer.appendChild(imgElement)
  photoContainer.appendChild(textElement)
  photoContainer.appendChild(button)

  return photoContainer
}

async function setUpPhotoGallery () {
  const photoGallery = document.querySelector('.photo-gallery .images')
  const templateHTML = await fetchTemplate(
    'html_templates/image_metadata_template.html'
  )

  if (!templateHTML) return

  const fragment = document.createDocumentFragment()

  Object.entries(photography_metadata).forEach(
    ([fileName, metadata], index) => {
      const photoElement = createPhotoElement(
        templateHTML,
        fileName,
        metadata,
        index
      )
      fragment.appendChild(photoElement)
    }
  )

  photoGallery.appendChild(fragment)

  $(document).ready(() => {
    $('.images')
      .justifiedGallery({
        rowHeight: 420,
        margins: 8,
        lastRow: 'center',
        refreshTime: 100,
        captions: false
      })
      .on('jg.complete', () => {
        gallery = lightGallery(
          document.querySelector('.photo-gallery .images'),
          {
            plugins: [lgThumbnail, lgFullscreen],
            download: false
          }
        )
      })
  })
}

/* ============================================================
   HERO - typing effect
   ============================================================ */
function typeHeroRole () {
  if (heroTyped) return
  heroTyped = true
  const target = document.getElementById('hero-typed')
  if (!target) return
  const text = 'Senior Pipeline Technical Director'
  let i = 0
  const tick = () => {
    if (i <= text.length) {
      target.textContent = text.slice(0, i)
      i++
      setTimeout(tick, 45)
    }
  }
  tick()
}

/* ============================================================
   ROUTING - tabbed SPA
   ============================================================ */
function showView (divId) {
  const isCurrentTab = window.location.hash === `#${divId}`
  document.body.scrollTo({
    top: 0,
    behavior: isCurrentTab ? 'smooth' : 'instant'
  })

  ALL_VIEWS.forEach(id => {
    const div = document.getElementById(id)
    if (div) div.style.display = divId === id ? 'block' : 'none'
  })

  Object.keys(TABS_INITIALISED).forEach(id => {
    const link = document.getElementById(`${id}-link`)
    if (link) link.classList.toggle('active', divId === id)

    if (!TABS_INITIALISED[id] && divId === id) {
      TABS_INITIALISED[id] = true
      if (id === 'experience') {
        calculateTimeSpans()
      } else if (id === 'work') {
        setUpCards()
      } else if (id === 'photography') {
        initialisePhotographyMap()
        setUpPhotoGallery()
      }
    }
  })

  if (divId === 'hero-tab') typeHeroRole()

  const targetHash = divId === 'hero-tab' ? '' : `#${divId}`
  if (window.location.hash !== targetHash) {
    history.pushState(null, null, targetHash || window.location.pathname)
  }
}

function handleRouting () {
  const hash = window.location.hash.slice(1)
  if (!hash) {
    showView('hero-tab')
    return
  }
  const validTabs = Object.keys(TABS_INITIALISED)
  showView(validTabs.includes(hash) ? hash : 'hero-tab')
}

window.addEventListener('hashchange', handleRouting)

/* ============================================================
   BOOT / INTRO - terminal boot sequence
   ============================================================ */
const BOOT_LINES = [
  '$ ./boot --portfolio',
  '> loading modules ............ ok',
  '> mounting pipeline .......... ok',
  '> resolving dependencies ..... ok',
  '> compiling shaders .......... ok',
  '> rendering interface ........ ok',
  '',
  '[ system ready ]'
]

function runBootSequence () {
  const logEl = document.getElementById('boot-log')
  const fillEl = document.getElementById('boot-progress-fill')
  const valueEl = document.getElementById('boot-progress-value')
  const enterEl = document.getElementById('boot-enter')

  let lineIndex = 0
  const totalLines = BOOT_LINES.length

  const printLine = () => {
    if (lineIndex < totalLines) {
      logEl.textContent += (lineIndex === 0 ? '' : '\n') + BOOT_LINES[lineIndex]
      lineIndex++

      const progress = Math.round((lineIndex / totalLines) * 100)
      fillEl.style.width = `${progress}%`
      valueEl.textContent = `${progress}%`

      setTimeout(printLine, 260)
    } else {
      fillEl.style.width = '100%'
      valueEl.textContent = '100%'
      setTimeout(() => enterEl.classList.add('visible'), 350)
    }
  }

  setTimeout(printLine, 400)
}

function dismissBoot () {
  const boot = document.getElementById('boot')
  if (!boot) return
  sessionStorage.setItem('hasSeenLoading', '1')
  boot.classList.add('hidden')
  setTimeout(() => boot.remove(), 700)
  handleRouting()
}

/* ============================================================
   Bootstrap
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
  const boot = document.getElementById('boot')
  const hasSeenLoading = sessionStorage.getItem('hasSeenLoading')

  if (hasSeenLoading) {
    if (boot) boot.remove()
    handleRouting()
  } else {
    runBootSequence()
    const enterBtn = document.getElementById('boot-enter-btn')
    if (enterBtn) enterBtn.addEventListener('click', dismissBoot)
  }

  initScrollAnimations()
})

function initScrollAnimations () {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in')
      }
    })
  }, observerOptions)

  document
    .querySelectorAll(
      '.grid-item, .timeline .content, .contact-item, .skill-category, .about-body, .about-photo'
    )
    .forEach(el => {
      el.classList.add('animate-on-scroll')
      observer.observe(el)
    })
}

window.addEventListener('scroll', () => {
  const windowHeight =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight
  const scrolled = (window.scrollY / windowHeight) * 100
  const progressEl = document.getElementById('scroll-progress')
  if (progressEl) progressEl.style.width = scrolled + '%'

  const navbar = document.getElementById('navbar')
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 40)
})

/* ============================================================
   Console easter eggs
   ============================================================ */
console.log(
  '%c' +
    `
'||''''|  '||''''| |''||''| '||'  '||' '||' '|' '||    ||' '||'  ..|''||    .|'''.|
 ||  .     ||  .      ||     ||    ||    || |    |||  |||   ||  .|'    ||   ||..  '
 ||''|     ||''|      ||     ||''''||     ||     |'|..'||   ||  ||      ||   ''|||.
 ||        ||         ||     ||    ||     ||     | '|' ||   ||  '|.     || .     '||
.||.....| .||.       .||.   .||.  .||.   .||.   .|. | .||. .||.  ''|...|'  |'....|'
`,
  'color: #38bdf8; font-family: monospace; font-weight: bold;'
)

console.log(
  '%cWelcome to my portfolio!',
  'color: #38bdf8; font-size: 1.2rem; font-weight: bold;'
)
console.log(
  '%cInterested in the tech stack? This site uses:',
  'color: #818cf8; font-size: 1rem;'
)
console.log('%c• Vanilla JavaScript (ES6+)', 'color: #f0db4f;')
console.log('%c• CSS3 with CSS Variables', 'color: #38bdf8;')
console.log('%c• Leaflet.js for maps', 'color: #56d364;')
console.log('%c• lightGallery for photo viewer', 'color: #818cf8;')
console.log(
  "%c\nWant to see something cool? Try typing 'help()' in the console!",
  'color: #8b9bb4; font-style: italic;'
)

window.help = function () {
  console.clear()
  console.log(
    '%c=== Available Commands ===',
    'color: #38bdf8; font-size: 1.2rem; font-weight: bold;'
  )
  console.log('%cabout()', 'color: #818cf8;', '- Learn about me')
  console.log('%cprojects()', 'color: #818cf8;', '- List all projects')
  console.log('%ccontact()', 'color: #818cf8;', '- Get contact information')
}

window.about = function () {
  console.log(
    '%cEfthymios Bairaktaris',
    'color: #38bdf8; font-size: 1.5rem; font-weight: bold;'
  )
  console.log('Senior Pipeline Technical Director @ One Of Us, London')
  console.log(
    '\nI build tools and systems that empower VFX artists to create amazing work.'
  )
  console.log(
    'Specializing in Python, pipeline automation, and workflow optimization.'
  )
}

window.projects = function () {
  const projectList = Object.values(show_metadata).map(p => ({
    Title: p.title,
    Year: p.year,
    Role: p.role,
    Credited: p.credited ? 'Yes' : 'No'
  }))
  console.table(projectList)
}

window.contact = function () {
  console.log(
    '%cContact Information',
    'color: #38bdf8; font-size: 1.2rem; font-weight: bold;'
  )
  console.log('📧 Email: efthymisb.vfx@gmail.com')
  console.log('💼 LinkedIn: https://www.linkedin.com/in/efthymios-bairaktaris/')
  console.log('🐙 GitHub: https://github.com/EfthymisB')
  console.log('🎬 IMDB: https://www.imdb.com/name/nm13296515')
}

/* ============================================================
   Nav + control event listeners
   ============================================================ */
Object.keys(TABS_INITIALISED).forEach(link => {
  const el = document.getElementById(`${link}-link`)
  if (el) {
    el.addEventListener('click', event => {
      event.preventDefault()
      showView(link)
    })
  }
})

const creditToggle = document.getElementById('show-credited-toggle')
if (creditToggle) {
  creditToggle.addEventListener('change', function () {
    const gridItems = document.querySelectorAll('#work .grid-item')
    gridItems.forEach(gridItem => {
      const badge = gridItem.querySelector('.credit-checkmark')
      const isRibbonHidden = badge && badge.style.opacity === '0'
      const shouldShow = this.checked ? !isRibbonHidden : true
      gridItem.style.display = shouldShow ? 'block' : 'none'
    })
  })
}
