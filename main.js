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

// document
//   .getElementById('contact-link')
//   .addEventListener('click', function (event) {
//     event.preventDefault()
//     showContent('contact')
//   })

import { metadata } from './media/posters/metadata.js'

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
  div.innerHTML = div.innerHTML.replace(/FRONT_IMG_PATH/g, media_path)
  div.innerHTML = div.innerHTML.replace(/TITLE/g, data.title)
  div.innerHTML = div.innerHTML.replace(/DESCRIPTION/g, data.description)
  div.innerHTML = div.innerHTML.replace(/STARS/g, data.stars)
  div.innerHTML = div.innerHTML.replace(/IMDB_ID/g, data.imdb_id)
  div.innerHTML = div.innerHTML.replace(/ROLE/g, data.role)
  div.innerHTML = div.innerHTML.replace(/COMPANY/g, data.company)
  div.innerHTML = div.innerHTML.replace(/LOCATION/g, data.location)
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

function showContent (divId) {
  const divs = [
    document.getElementById('about'),
    document.getElementById('work')
    // document.getElementById('contact')
  ]

  divs.forEach(function (div) {
    div.style.display = 'none'
  })
  const div = document.getElementById(divId)
  if (div) {
    div.style.display = 'block'
  }
}

// showContent('work') // to be removed
