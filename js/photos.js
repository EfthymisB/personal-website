import { photography_metadata } from '../media/photography/photography_metadata.js'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

const unique = list => [...new Set(list.filter(Boolean))]

/** Turn ['Spain', 'Valencian Community', 'Jávea'] into readable place names. */
function describePlace (region = []) {
  const parts = unique(region)
  const country = parts[0] || 'Unknown'
  const local = parts.length > 1 ? parts[parts.length - 1] : null
  return {
    country,
    short: local ? `${local}, ${country}` : country,
    full: [...parts].reverse().join(', ') || country
  }
}

function formatDate (iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m) return iso
  return d ? `${d} ${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1]} ${y}`
}

function formatExposure (seconds) {
  if (!seconds) return null
  if (seconds >= 0.5) return `${Number(seconds.toFixed(1))}s`
  return `1/${Math.round(1 / seconds)}s`
}

function formatExif (m) {
  return [
    m.FocalLength ? `${Math.round(m.FocalLength)}mm` : null,
    m.FNumber ? `f/${Number(m.FNumber.toFixed(1))}` : null,
    formatExposure(m.ExposureTime),
    m.ISOSpeedRatings ? `ISO ${m.ISOSpeedRatings}` : null
  ].filter(Boolean)
}

/** Normalised, newest-first list of photos. */
export const photos = Object.entries(photography_metadata)
  .sort(([a], [b]) => (a < b ? 1 : -1))
  .map(([file, m], index) => {
    const gps = m.GPSInfo || {}
    const place = describePlace(gps.region)
    return {
      index,
      id: file.replace(/\.[^.]+$/, ''),
      file,
      src: `media/photography/${file}`,
      thumb: `media/photography/thumbs/${file}`,
      width: m.Width || 3,
      height: m.Height || 2,
      hasSize: Boolean(m.Width && m.Height),
      lat: gps.lat,
      lng: gps.lng,
      place,
      date: m.DateTimeOriginal || '',
      dateLabel: formatDate(m.DateTimeOriginal),
      exif: formatExif(m),
      lens: m.LensModel || ''
    }
  })
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  .map((p, index) => ({ ...p, index }))

export const countries = (() => {
  const counts = new Map()
  photos.forEach(p =>
    counts.set(p.place.country, (counts.get(p.place.country) || 0) + 1)
  )
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )
})()

export const photoHash = photo => `#photo-${photo.id}`
