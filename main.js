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

var TABS_INITIALISED = {
  about: false,
  experience: false,
  work: false,
  photography: false
}

var gallery

function flipCard (element) {
  console.log(element)
  const flipContainer = element.closest('.flip-container')
  flipContainer.classList.toggle('flipped')
}

function timeLenghtAsString (start, end) {
  var diff = Math.abs(end - start)
  var years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365))
  var months = Math.floor(
    (diff - years * 1000 * 60 * 60 * 24 * 365) / (1000 * 60 * 60 * 24 * 30)
  )
  var timeSpan = ''
  if (years > 0) {
    timeSpan += years + ' yrs '
  }
  timeSpan += months + ' mos'
  timeSpan = '(' + timeSpan + ')'
  return timeSpan
}

function calculateTimeSpans () {
  var periods = [...document.querySelectorAll('.period')].reverse()
  var period_groups = new Map()

  periods.forEach(function (period) {
    var [startMonth, endMonth] = period.querySelectorAll('.month')
    var [startYear, endYear] = period.querySelectorAll('.year')
    var period_group = period.classList[1]

    if (endYear.textContent === 'PRESENT') {
      var endDate = new Date()
    } else {
      var endDate = new Date(
        parseInt(endYear.textContent),
        MONTHS.indexOf(endMonth.textContent)
      )
    }

    var startDate = new Date(
      parseInt(startYear.textContent),
      MONTHS.indexOf(startMonth.textContent)
    )

    if (period_groups.has(period_group)) {
      let existingPeriod = period_groups.get(period_group)
      existingPeriod.end = endDate
    } else {
      period_groups.set(period_group, { start: startDate, end: endDate })
    }

    period.querySelector('.time_span').textContent = timeLenghtAsString(
      startDate,
      endDate
    )
  })

  var period_sums = [...document.querySelectorAll('.period-sum')]
  period_sums.forEach(function (period) {
    var period_group = period.classList[1]
    var period_sum = period_groups.get(period_group)
    if (period_sum) {
      period.textContent = timeLenghtAsString(period_sum.start, period_sum.end)
    }
  })
}

function setUpCards () {
  const media_paths = []
  for (const key in show_metadata) {
    media_paths.push('media/posters/' + key)
  }
  media_paths.sort().reverse()

  const grid_container = document.getElementById('grid-container')

  fetch('html_templates/grid_item_template.html')
    .then(response => response.text())
    .then(templateHTML => {
      media_paths.forEach(media_path => {
        const back_image = media_path.replace(/(\.[^.]+)$/, '_back$1')

        const data = show_metadata[media_path.split('/').slice(-1)[0]]

        const div = document.createElement('div')
        div.className = 'grid-item'

        div.innerHTML = templateHTML
          .replace(/FRONT_IMG_PATH/g, media_path)
          .replace(/TITLE/g, data.title.split(':').join('<br>'))
          .replace(/YEAR/g, data.year)
          .replace(/STARS/g, data.stars.join('<br>'))
          .replace(/DESCRIPTION/g, data.description)
          .replace(/IMDB_ID/g, data.imdb_id)
          .replace(/ROLE/g, data.role)
          .replace(/COMPANY/g, data.company)
          .replace(/LOCATION/g, data.location)
        if (!data.credited) {
          const ribbon = div.querySelector('.ribbon-container')
          ribbon.style.display = 'none'
        }
        const back_div = div.querySelector('.back')
        back_div.style.backgroundImage = `url(${back_image})`

        grid_container.appendChild(div)
        ;['.back', '.front'].forEach(selector => {
          div.querySelector(selector).addEventListener('click', function () {
            flipCard(this)
          })
        })
      })
    })
}

function initialise_photography_map () {
  window.PhotographyMap = L.map('photography_map')

  L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(
    window.PhotographyMap
  )

  for (const [index, [file_name, metadata]] of Object.entries(
    photography_metadata
  ).entries()) {
    var lat_lng = [metadata.GPSInfo.lat, metadata.GPSInfo.lng]

    const popupContent = `
    <b>${metadata.DateTimeOriginal}</b><br>
    <img id="popup-img" src="media/photography/${file_name}" height="250" style="cursor:pointer;"/>
    <br>
    <b>Lat: ${lat_lng[0].toFixed(6)}</b><br>
    <b>Lng: ${lat_lng[1].toFixed(6)}</b>
    `
    var marker = L.marker(lat_lng, {
      icon: new L.Icon({
        iconSize: [50, 50],
        iconUrl: 'media/website-utils/camera.png'
      }),
      photo_id: index
    })
      .addTo(window.PhotographyMap)
      .bindPopup(popupContent, { maxWidth: 650 })
      .on('popupopen', () => {
        document.getElementById('popup-img').addEventListener('click', () => {
          gallery.openGallery(index)
        })
      })
  }

  var resetViewBtn = L.Control.extend({
    options: { position: 'topright' },

    onAdd: function (map) {
      var btn = L.DomUtil.create('button', 'reset-view-button')
      btn.innerHTML = 'Reset View'
      btn.onclick = function () {
        fitMapToMarkers()
      }
      return btn
    }
  })
  window.PhotographyMap.addControl(new resetViewBtn())

  fitMapToMarkers()
}

function fitMapToMarkers (ids = null) {
  if (!window.PhotographyMap) {
    return
  }
  var bounds = L.latLngBounds()
  window.PhotographyMap.eachLayer(function (layer) {
    if (layer instanceof L.Marker) {
      if (ids && !ids.includes(layer.options.photo_id)) {
        return
      }
      bounds.extend(layer.getLatLng())
    }
  })
  window.PhotographyMap.fitBounds(bounds)
  document.getElementById('navbar').scrollIntoView()
}

// function that iterates over the media/photograpgy folder and adds a <img> element for each image on the "photo-gallery" class
function setUpPhotoGallery () {
  const photo_gallery = document.querySelector('.photo-gallery .images')

  fetch('html_templates/image_metadata_template.html')
    .then(response => response.text())
    .then(templateHTML => {
      for (const [index, [file_name, metadata]] of Object.entries(
        photography_metadata
      ).entries()) {
        var img_element = document.createElement('img')
        img_element.src = 'media/photography/' + file_name

        var text_element = document.createElement('div')
        text_element.className = 'gps-info'
        text_element.innerHTML = metadata.GPSInfo.region
          .join('<br>')
          .toLowerCase()

        var button = document.createElement('button')
        button.textContent = 'View on Map'
        button.className = 'view-button'
        button.addEventListener('click', function (event) {
          fitMapToMarkers([index])
          event.stopPropagation()
        })

        var shutter_speed = Math.round(1 / metadata.ExposureTime)
        var image_metadata = document.createElement('div')
        image_metadata.innerHTML = templateHTML
          .replace(/FSTOP/g, `f/${metadata.FNumber}`)
          .replace(/SHUTTER_SPEED/g, `1/${shutter_speed}`)
          .replace(/ISO/g, metadata.ISOSpeedRatings)
          .replace(/FOCAL_LENGTH/g, `${metadata.FocalLength}mm`)
          .replace(/DATE/g, metadata.DateTimeOriginal)

        var photo_container = document.createElement('div')
        photo_container.className = 'photo-container'
        photo_container.dataset.index = index
        photo_container.setAttribute('data-src', img_element.src)
        photo_container.setAttribute('data-sub-html', image_metadata.innerHTML)

        photo_container.appendChild(img_element)
        photo_container.appendChild(text_element)
        photo_container.appendChild(button)

        photo_gallery.appendChild(photo_container)
      }
      $(document).ready(function () {
        $('.images')
          .justifiedGallery({
            rowHeight: 450,
            margins: 5,
            lastRow: 'center',
            refreshTime: 100,
            captions: false
          })
          .on('jg.complete', function () {
            gallery = lightGallery(
              document.querySelector('.photo-gallery .images'),
              {
                plugins: [lgThumbnail, lgFullscreen],
                download: false
              }
            )
          })
      })
    })
}

function showContent (divId) {
  Object.keys(TABS_INITIALISED).forEach(function (id) {
    const div = document.getElementById(id)
    if (!div) {
      return
    }
    div.style.display = divId === id ? 'block' : 'none'

    if (!TABS_INITIALISED[id] && divId === id) {
      TABS_INITIALISED[id] = true
      if (id === 'experience') {
        calculateTimeSpans()
      } else if (id === 'work') {
        setUpCards()
      } else if (id === 'photography') {
        initialise_photography_map()
        setUpPhotoGallery()
      }
    }
  })
}

// DOCUMENT EVENT LISTENERS

Object.keys(TABS_INITIALISED).forEach(link => {
  document
    .getElementById(`${link}-link`)
    .addEventListener('click', function (event) {
      event.preventDefault()
      showContent(link)
    })
})
