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

const TABS_INITIALISED = {
  about: false,
  experience: false,
  work: false,
  photography: false,
  contact: false
}

let gallery

function flipCard (element) {
  const flipContainer = element.closest('.flip-container')
  flipContainer.classList.toggle('flipped')
}

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

function createCardElement (templateHTML, mediaPath, data, imdbData) {
  const div = document.createElement('div')
  div.className = 'grid-item'
  div.innerHTML = templateHTML
    .replace(/FRONT_IMG_PATH/g, mediaPath)
    .replace(/TITLE/g, data.title.split(':').join('<br>'))
    .replace(/YEAR/g, data.year)
    .replace(/STARRING/g, data.starring.join('<br>'))
    .replace(/DESCRIPTION/g, data.description)
    .replace(/RATING/g, imdbData ? imdbData.imdbRating[0] : 'N/A')
    .replace(/VOTES/g, imdbData ? imdbData.imdbRating[1] : 'N/A')
    .replace(/ROLE/g, data.role)
    .replace(/COMPANY/g, data.company)
    .replace(/LOCATION/g, data.location)
    .replace(/IMDB_LINK/g, getImdbLink(data.imdb_id))

  if (!data.credited) {
    div.querySelector('.ribbon-container').style.display = 'none'
  }

  ;['.back', '.front'].forEach(selector => {
    div.querySelector(selector).addEventListener('click', e => {
      if (e.target.closest('.imdb-link')) return
      flipCard(div.querySelector(selector))
    })
  })

  return div
}

async function setUpCards () {
  const mediaPaths = Object.keys(show_metadata)
    .map(key => `media/posters/${key}`)
    .sort()
    .reverse()
  const gridContainer = document.getElementById('grid-container')

  // Show loading state
  gridContainer.innerHTML =
    '<div class="loading-skeleton">Loading projects...</div>'

  const templateHTML = await fetchTemplate(
    'html_templates/grid_item_template.html'
  )

  if (!templateHTML) return

  // Clear loading state
  gridContainer.innerHTML = ''

  const fragment = document.createDocumentFragment()

  for (const mediaPath of mediaPaths) {
    const data = show_metadata[mediaPath.split('/').pop()]
    const imdbData = await fetchIMDBData(data.imdb_id)

    const cardElement = createCardElement(
      templateHTML,
      mediaPath,
      data,
      imdbData
    )
    fragment.appendChild(cardElement)
  }

  gridContainer.appendChild(fragment)
}

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
      <img id="popup-img" src="media/photography/${fileName}" height="250" style="cursor:pointer;"/><br>
      <b>Lat: ${latLng[0].toFixed(6)}</b><br>
      <b>Lng: ${latLng[1].toFixed(6)}</b>
    `

      const marker = L.marker(latLng, {
        icon: new L.Icon({
          iconSize: [40, 40],
          iconUrl: 'media/website-utils/camera.png'
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
      btn.innerHTML = 'Reset View'
      btn.onclick = fitMapToMarkers
      return btn
    }
  })

  window.PhotographyMap.addControl(new resetViewBtn())
  fitMapToMarkers()
}

function fitMapToMarkers ({ ids = null } = {}) {
  if (!window.PhotographyMap) return

  const bounds = L.latLngBounds()
  window.PhotographyMap.eachLayer(layer => {
    console.log(ids)
    if (
      layer instanceof L.Marker &&
      (!ids || ids.includes(layer.options.photo_id))
    ) {
      bounds.extend(layer.getLatLng())
    }
  })

  window.PhotographyMap.fitBounds(bounds)
  document.getElementById('navbar').scrollIntoView()
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
        rowHeight: 450,
        margins: 5,
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

function showContent (divId) {
  // Hide hero section when navigating to any tab
  const hero = document.getElementById('hero')
  if (hero) {
    hero.style.display = 'none'
  }

  Object.keys(TABS_INITIALISED).forEach(id => {
    const div = document.getElementById(id)
    const link = document.getElementById(`${id}-link`)
    if (!div) return

    div.style.display = divId === id ? 'block' : 'none'

    // Update active state on nav links
    if (link) {
      if (divId === id) {
        link.classList.add('active')
      } else {
        link.classList.remove('active')
      }
    }

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

  // Scroll to top when changing tabs
  window.scrollTo({ top: 0, behavior: 'smooth' })

  // Update URL hash without scrolling
  if (window.location.hash !== `#${divId}`) {
    history.pushState(null, null, `#${divId}`)
  }
}

// Handle initial page load and hash changes
function handleRouting () {
  const hash = window.location.hash.slice(1)
  const hero = document.getElementById('hero')

  if (!hash) {
    // No hash means we're on the landing page - show hero
    if (hero) {
      hero.style.display = 'flex'
    }
    // Hide all tabs
    Object.keys(TABS_INITIALISED).forEach(id => {
      const div = document.getElementById(id)
      if (div) div.style.display = 'none'
    })
    // Clear all active nav states
    Object.keys(TABS_INITIALISED).forEach(id => {
      const link = document.getElementById(`${id}-link`)
      if (link) link.classList.remove('active')
    })
  } else {
    // We have a hash - navigate to that tab
    const validTabs = Object.keys(TABS_INITIALISED)
    const tab = validTabs.includes(hash) ? hash : 'about'
    showContent(tab)
  }
}

// Listen for hash changes (browser back/forward)
window.addEventListener('hashchange', handleRouting)

// VFX Render Loading Animation
function startRenderAnimation () {
  const renderGrid = document.getElementById('render-grid')
  const renderProgress = document.getElementById('render-progress')
  const renderBarFill = document.getElementById('render-bar-fill')
  const tilesRendered = document.getElementById('tiles-rendered')
  const renderLoading = document.getElementById('render-loading')
  const renderInfo = document.querySelector('.render-info')

  // Create 700 tiles (35x20 grid)
  const tiles = []
  for (let i = 0; i < 700; i++) {
    const tile = document.createElement('div')
    tile.className = 'render-tile'
    renderGrid.appendChild(tile)
    tiles.push(tile)
  }

  // Wait for all staggered animations to complete (0.8s + 1s animation = 1.8s)
  setTimeout(() => {
    // Shuffle tiles for random rendering order
    const shuffledIndices = tiles
      .map((_, i) => i)
      .sort(() => Math.random() - 0.5)

    let renderedCount = 0
    const totalTiles = tiles.length
    const renderDuration = 3000 // 3 seconds
    const tileDelay = renderDuration / totalTiles

    // Render tiles progressively
    shuffledIndices.forEach((index, i) => {
      setTimeout(() => {
        const tile = tiles[index]

        // Add rendering state briefly
        tile.classList.add('rendering')

        setTimeout(() => {
          tile.classList.remove('rendering')
          tile.classList.add('rendered')
          renderedCount++

          // Update progress
          const progress = Math.round((renderedCount / totalTiles) * 100)
          renderProgress.textContent = `${progress}%`
          renderBarFill.style.width = `${progress}%`
          tilesRendered.textContent = `Tiles: ${renderedCount}/${totalTiles}`

          // When complete, start grid-to-button transformation
          if (renderedCount === totalTiles) {
            setTimeout(() => {
              transformGridToButton()
            }, 500)
          }
        }, 200)
      }, i * tileDelay)
    })
  }, 1800) // Wait for staggered animations to complete
}

function transformGridToButton () {
  const renderGrid = document.getElementById('render-grid')
  const renderInfo = document.querySelector('.render-info')
  const renderLoading = document.getElementById('render-loading')
  const tiles = document.querySelectorAll('.render-tile')
  const hero = document.getElementById('hero')

  // Step 1: Remove gap and make borders match fill
  renderGrid.classList.add('complete')
  tiles.forEach(tile => tile.classList.add('complete'))

  // Step 2: After a brief delay, fade out hero and scale down the grid
  setTimeout(() => {
    // Fade out hero text
    hero.style.opacity = '0'
    hero.style.transition = 'opacity 0.5s ease'

    // Get grid dimensions and center position
    const gridRect = renderGrid.getBoundingClientRect()
    const gridCenterY = gridRect.top + gridRect.height / 2

    // Create a replacement div that matches grid size
    const replacement = document.createElement('div')
    replacement.style.position = 'absolute'
    replacement.style.left = '50%'
    replacement.style.top = '50%'
    replacement.style.transform = 'translate(-50%, -50%)'
    replacement.style.width = `${gridRect.width}px`
    replacement.style.height = `${gridRect.height}px`
    replacement.style.background = 'var(--main-colour)'
    replacement.style.borderRadius = '5px'
    replacement.style.transition = 'all 0.8s ease'

    // Replace grid with single element
    renderGrid.style.display = 'none'
    renderLoading.appendChild(replacement)

    // Step 3: Fade out render info
    renderInfo.style.opacity = '0'
    renderInfo.style.transition = 'opacity 0.5s ease'

    // Step 4: Scale down to button size after a brief moment
    setTimeout(() => {
      // Button dimensions
      const buttonWidth = 200
      const buttonHeight = 54

      replacement.style.width = `${buttonWidth}px`
      replacement.style.height = `${buttonHeight}px`

      // Step 5: After scale animation, replace with actual button
      setTimeout(() => {
        // Create "Dive In" button positioned exactly where replacement is
        const diveInButton = document.createElement('button')
        diveInButton.className = 'dive-in-button'
        diveInButton.textContent = 'Dive In'
        diveInButton.style.position = 'absolute'
        diveInButton.style.left = '50%'
        diveInButton.style.top = '50%'
        diveInButton.style.transform = 'translate(-50%, -50%)'
        diveInButton.style.width = `${buttonWidth}px`
        diveInButton.style.height = `${buttonHeight}px`

        // Add click handler
        diveInButton.addEventListener('click', () => {
          // Fade out entire render loading overlay
          renderLoading.style.opacity = '0'

          setTimeout(() => {
            renderLoading.remove()
            // Navigate to About page
            window.location.hash = '#about'
            handleRouting()
          }, 800)
        })

        // Remove replacement and render info, add button
        renderInfo.remove()
        hero.remove()
        renderLoading.appendChild(diveInButton)

        // Seamlessly swap: set button visible first, then remove replacement
        diveInButton.style.opacity = '1'
        replacement.remove()

        // Trigger fade in animation
        setTimeout(() => {
          diveInButton.classList.add('visible')
        }, 50)
      }, 800) // Wait for scale animation
    }, 100)
  }, 300) // Brief delay after completion state
}

// Handle initial page load
window.addEventListener('DOMContentLoaded', () => {
  // Check if user has already seen the loading animation in this session
  const hasSeenLoading = sessionStorage.getItem('hasSeenLoading')

  if (hasSeenLoading) {
    // Skip loading animation, go straight to routing
    document.getElementById('render-loading').remove()
    document.getElementById('hero').style.opacity = '1'
    handleRouting()
  } else {
    // Show loading animation
    // sessionStorage.setItem('hasSeenLoading', 'true')
    startRenderAnimation()
  }

  initScrollAnimations()
})

// Scroll animations using Intersection Observer
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

  // Observe elements for animation
  document
    .querySelectorAll('.grid-item, .timeline .content, .contact-item, .skills')
    .forEach(el => {
      el.classList.add('animate-on-scroll')
      observer.observe(el)
    })
}

// Scroll progress indicator & navbar background
window.addEventListener('scroll', () => {
  const windowHeight =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight
  const scrolled = (window.scrollY / windowHeight) * 100
  document.getElementById('scroll-progress').style.width = scrolled + '%'

  // Add background to navbar when scrolled past hero
  const navbar = document.getElementById('navbar')
  const hero = document.getElementById('hero')
  const heroHeight = hero ? hero.offsetHeight : 100

  if (window.scrollY > heroHeight - 100) {
    navbar.classList.add('scrolled')
  } else {
    navbar.classList.remove('scrolled')
  }
})

// Developer Easter Eggs
console.log(
  '%c' +
    `
 _____ _____ _   _ ______   ____
|  ___|_   _| | | |  _ \\ \\ / /  _ \\
| |_    | | | |_| | | | \\ V /| |_) |
|  _|   | | |  _  | |_| || | |  __/
|_|     |_| |_| |_|____/ |_| |_|

Pipeline Technical Director
Efthymios Bairaktaris
`,
  'color: #d16239; font-family: monospace; font-weight: bold;'
)

console.log(
  '%cWelcome to my portfolio!',
  'color: #d16239; font-size: 1.2rem; font-weight: bold;'
)
console.log(
  '%cInterested in the tech stack? This site uses:',
  'color: #ff8c5a; font-size: 1rem;'
)
console.log('%c• Vanilla JavaScript (ES6+)', 'color: #f0db4f;')
console.log('%c• CSS3 with CSS Variables', 'color: #264de4;')
console.log('%c• Leaflet.js for maps', 'color: #199900;')
console.log('%c• lightGallery for photo viewer', 'color: #d16239;')
console.log(
  "%c\nWant to see something cool? Try typing 'help()' in the console!",
  'color: #888; font-style: italic;'
)

// Easter egg function available in console
window.help = function () {
  console.clear()
  console.log(
    '%c=== Available Commands ===',
    'color: #d16239; font-size: 1.2rem; font-weight: bold;'
  )
  console.log('%cabout()', 'color: #ff8c5a;', '- Learn about me')
  console.log('%cskills()', 'color: #ff8c5a;', '- View my technical skills')
  console.log('%cprojects()', 'color: #ff8c5a;', '- List all projects')
  console.log('%ccontact()', 'color: #ff8c5a;', '- Get contact information')
  console.log('%csecret()', 'color: #ff8c5a;', '- ???')
}

window.about = function () {
  console.log(
    '%cEfthymios Bairaktaris',
    'color: #d16239; font-size: 1.5rem; font-weight: bold;'
  )
  console.log('Senior Pipeline Technical Director @ One Of Us, London')
  console.log(
    '\nI build tools and systems that empower VFX artists to create amazing work.'
  )
  console.log(
    'Specializing in Python, pipeline automation, and workflow optimization.'
  )
}

window.skills = function () {
  const skills = {
    Languages: ['Python', 'JavaScript', 'Bash'],
    'VFX Software': ['Maya', 'Houdini', 'Nuke', 'Mari', 'RV'],
    Tools: [
      'Git',
      'CI/CD',
      'ShotGrid Toolkit',
      'Qt (PySide/PyQt5)',
      'EasyBuild'
    ],
    'Soft Skills': ['Problem Solving', 'Team Collaboration', 'Self Motivation']
  }
  console.table(skills)
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
    'color: #d16239; font-size: 1.2rem; font-weight: bold;'
  )
  console.log('📧 Email: efthymisb.vfx@gmail.com')
  console.log('💼 LinkedIn: https://www.linkedin.com/in/efthymios-bairaktaris/')
  console.log('🐙 GitHub: https://github.com/EfthymisB')
  console.log('🎬 IMDB: https://www.imdb.com/name/nm13296515')
}

window.secret = function () {
  console.log(
    '%c🎉 You found the secret!',
    'color: #d16239; font-size: 2rem; font-weight: bold;'
  )
  console.log("%cHere's a little secret:", 'color: #ff8c5a; font-size: 1.2rem;')
  console.log(
    'The first VFX shot I ever worked on was a simple object removal.'
  )
  console.log('It took me 3 days. Now I can do it in 30 minutes.')
  console.log(
    "The difference? Better tools and a solid pipeline. That's why I do what I do."
  )
  console.log(
    '\n%cThanks for exploring! 🚀',
    'color: #d16239; font-weight: bold;'
  )
}

// Konami code easter egg
let konamiCode = []
const konamiPattern = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a'
]

window.addEventListener('keydown', e => {
  konamiCode.push(e.key)
  konamiCode = konamiCode.slice(-10)

  if (konamiCode.join('') === konamiPattern.join('')) {
    document.body.style.animation = 'rainbow 2s infinite'
    setTimeout(() => {
      document.body.style.animation = ''
      alert(
        '🎮 Konami Code Activated! You are now a certified VFX pipeline ninja! 🥷'
      )
    }, 100)
  }
})

// Add rainbow animation to CSS via JavaScript
const style = document.createElement('style')
style.textContent = `
  @keyframes rainbow {
    0% { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
  }
`
document.head.appendChild(style)

// DOCUMENT EVENT LISTENERS
Object.keys(TABS_INITIALISED).forEach(link => {
  document.getElementById(`${link}-link`).addEventListener('click', event => {
    event.preventDefault()
    showContent(link)
  })
})

document
  .getElementById('show-credited-toggle')
  .addEventListener('change', function () {
    const gridItems = document.querySelectorAll('#work .grid-item')
    gridItems.forEach(gridItem => {
      const isRibbonHidden =
        gridItem.querySelector('.ribbon-container').style.display === 'none'
      const shouldShow = this.checked ? !isRibbonHidden : true
      gridItem.style.display = shouldShow ? 'block' : 'none'
    })
  })
