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
  photography: false
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
  const templateHTML = await fetchTemplate(
    'html_templates/grid_item_template.html'
  )

  if (!templateHTML) return

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
  L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(
    window.PhotographyMap
  )

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
  Object.keys(TABS_INITIALISED).forEach(id => {
    const div = document.getElementById(id)
    if (!div) return

    div.style.display = divId === id ? 'block' : 'none'

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
}

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
