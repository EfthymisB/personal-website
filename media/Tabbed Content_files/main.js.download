function openTab (tabName) {
  var tabs = document.getElementsByClassName('tab')
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].style.display = 'none'
  }

  var buttons = document.getElementsByClassName('tab-button')
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove('selected')
  }

  document.getElementById(tabName).style.display = 'block'
  document
    .querySelector('[onclick="openTab(\'' + tabName + '\')"]')
    .classList.add('selected')
}
const movement_margin = 50 // percentage of allowed movement left to right (0-100)
const track = document.getElementById('image-track')

function set_data () {
  track.dataset.mouseDownAt = '0'
  track.dataset.prevPercentage = track.dataset.percentage
}

function set_new_percentage (percentage) {
  const newPercentage = Math.max(
    Math.min(
      parseFloat(track.dataset.prevPercentage) + percentage,
      movement_margin / 2 - 50
    ),
    -(movement_margin / 2 + 50)
  )
  track.dataset.percentage = newPercentage
  track.animate(
    {
      transform: `translate(${newPercentage}%, -50%)`
    },
    { duration: 750, fill: 'forwards' }
  )

  //   for (const image of track.getElementsByClassName('image')) {
  //     image.animate(
  //       {
  //         objectPosition: `${100 + newPercentage}% center`
  //       },
  //       { duration: 750, fill: 'forwards' }
  //     )
  //   }
}
window.onmousedown = e => {
  track.dataset.mouseDownAt = e.clientX
}

window.onmouseup = () => {
  set_data()
}

window.onmousemove = e => {
  if (track.dataset.mouseDownAt === '0') return

  const mouseDelta = parseFloat(track.dataset.mouseDownAt) - e.clientX
  const maxDelta = window.innerWidth / 2
  const percentage = (mouseDelta / maxDelta) * -100
  set_new_percentage(percentage)
}

window.onwheel = e => {
  const percentage = 5 * Math.sign(e.deltaY)
  set_new_percentage(percentage)
  set_data()
}
