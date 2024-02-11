import { metadata } from './media/posters/metadata.js'

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

function showContent (divId) {
  const divs = [
    document.getElementById('about'),
    document.getElementById('work'),
    document.getElementById('experience')
  ]

  divs.forEach(function (div) {
    div.style.display = 'none'
  })
  const div = document.getElementById(divId)
  if (div) {
    div.style.display = 'block'
  }
}

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

document.addEventListener('DOMContentLoaded', function () {
  setUpCards()
})
