import { metadata } from './media/posters/metadata.js'
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

function calculateTimeSpans () {
  var periods = document.querySelectorAll('.period')

  periods.forEach(function (period) {
    var [startMonth, endMonth] = period.querySelectorAll('.month')
    var [startYear, endYear] = period.querySelectorAll('.year')

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

    var diff = Math.abs(endDate - startDate)
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

    period.querySelector('.time_span').textContent = timeSpan
  })
}

function setUpCards () {
  const media_paths = []
  for (const key in metadata) {
    media_paths.push('media/posters/' + key)
  }
  media_paths.sort().reverse()

  const grid_container = document.getElementById('grid-container')
  const template = document.getElementById('grid-item-template')

  media_paths.forEach(media_path => {
    const back_image = media_path.replace(/(\.[^.]+)$/, '_back$1')

    const data = metadata[media_path.split('/').slice(-1)[0]]

    const div = document.createElement('div')
    div.className = 'grid-item'

    div.innerHTML = template.innerHTML
    div.innerHTML = div.innerHTML
      .replace(/FRONT_IMG_PATH/g, media_path)
      .replace(/TITLE/g, data.title.split(':').join('<br>'))
      .replace(/YEAR/g, data.year)
      .replace(/STARS/g, data.stars.join('<br>'))
      .replace(/DESCRIPTION/g, data.description)
      .replace(/IMDB_ID/g, data.imdb_id)
      .replace(/ROLE/g, data.role)
      .replace(/COMPANY/g, data.company)
      .replace(/LOCATION/g, data.location)
    if (data.credited) {
      const uncredited = div.querySelector('.uncredited')
      uncredited.style.display = 'none'
    }
    const back_div = div.querySelector('.back')
    back_div.style.backgroundImage = `url(${back_image})`

    grid_container.appendChild(div)
  })

  const backElements = document.getElementsByClassName('back')
  for (const element of backElements) {
    element.addEventListener('click', function (event) {
      toggleContent(this)
    })
  }

  const frontElements = document.getElementsByClassName('front')
  for (const element of frontElements) {
    element.addEventListener('click', function (event) {
      toggleContent(this)
    })
  }

  function toggleContent (element) {
    const flipContainer = element.closest('.flip-container')
    flipContainer.classList.toggle('flipped')
  }
}

function setUpPhotoGallery () {
  const photo_gallery = document.querySelector('.photo-gallery .images')
  const media_paths = []
  for (const key in photography_metadata) {
    const img = document.createElement('img')
    img.src = 'media/photography/' + key
    photo_gallery.appendChild(img)
  }
}

function showContent (divId) {
  ;['about', 'work', 'experience', 'photography'].forEach(function (id) {
    const div = document.getElementById(id)
    if (!div) {
      return
    }
    div.style.display = divId === id ? 'block' : 'none'
  })
}

// MODAL
var modal = document.getElementById('imageModal')
var modalImg = document.getElementById('modalImg')
var imagesContainer = document.querySelector('.photo-gallery .images')
var currentImageIndex = 0
var images = []

function openModal (imgElement, index) {
  modal.style.display = 'block'
  modalImg.src = imgElement.src // TODO: update with higher res photo?
  currentImageIndex = index
  updateImageMetadata(imgElement)
}

function updateImageMetadata (imgElement) {
  var imageName = imgElement.src.split('/').pop()
  if (photography_metadata[imageName]) {
    const data = photography_metadata[imageName]

    document.getElementById('fstop').textContent = `f/${data.FNumber}`
    document.getElementById('shutter_speed').textContent = `1/${Math.round(
      1 / data.ExposureTime
    )}`
    document.getElementById('iso').textContent = `ISO ${data.ISOSpeedRatings}`
    document.getElementById(
      'focal_length'
    ).textContent = `${data.FocalLength}mm`
    document.getElementById('date').textContent = data.DateTimeOriginal
  }
}

imagesContainer.addEventListener('click', function (e) {
  if (e.target && e.target.tagName === 'IMG') {
    const clickedImage = e.target
    images = Array.from(imagesContainer.querySelectorAll('img'))
    const clickedIndex = images.indexOf(clickedImage)
    openModal(clickedImage, clickedIndex)
  }
})

modal.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = 'none'
  }
}

// DOCUMENT EVENT LISTENERS

document
  .getElementById('about-link')
  .addEventListener('click', function (event) {
    event.preventDefault()
    showContent('about')
  })

document
  .getElementById('work-link')
  .addEventListener('click', function (event) {
    event.preventDefault()
    showContent('work')
  })

document
  .getElementById('experience-link')
  .addEventListener('click', function (event) {
    event.preventDefault()
    showContent('experience')
    calculateTimeSpans()
  })

document
  .getElementById('photography-link')
  .addEventListener('click', function (event) {
    event.preventDefault()
    showContent('photography')
  })

document.addEventListener('DOMContentLoaded', function () {
  setUpCards()
  setUpPhotoGallery()
})

document.querySelector('.close').onclick = function () {
  modal.style.display = 'none'
}

document.getElementById('prevBtn').onclick = function () {
  if (modal.style.display != 'block') {
    return
  }
  currentImageIndex = (currentImageIndex - 1 + images.length) % images.length
  modalImg.src = images[currentImageIndex].src
  updateImageMetadata(images[currentImageIndex])
}

document.getElementById('nextBtn').onclick = function () {
  if (modal.style.display != 'block') {
    return
  }
  currentImageIndex = (currentImageIndex + 1) % images.length
  modalImg.src = images[currentImageIndex].src
  updateImageMetadata(images[currentImageIndex])
}

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    modal.style.display = 'none'
  }
})

document.addEventListener('keydown', function (event) {
  if (event.key === 'ArrowLeft') {
    document.getElementById('prevBtn').click()
  } else if (event.key === 'ArrowRight') {
    document.getElementById('nextBtn').click()
  }
})
