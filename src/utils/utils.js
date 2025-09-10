import { render } from './render'

const PREVIEW_POSTS_KEY = 'igPreviewPostsV1'

export function uid () {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function save (posts) {
  localStorage.setItem(PREVIEW_POSTS_KEY, JSON.stringify(posts))
  render()
}

export function load () {
  try {
    return JSON.parse(localStorage.getItem(PREVIEW_POSTS_KEY) || '[]')
  } catch {
    return []
  }
}

export function showEmpty (show) {
  document.querySelector('#emptyState').style.display = show ? 'block' : 'none'
}

export function dataTransferImageFile (evt) {
  const dt = evt.dataTransfer
  if (!dt) return null
  const file = [...(dt.files || [])].find(f => f.type.startsWith('image/'))
  return file || null
}

export function fileToDataUrlSquare (file, size = 1080) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = () => {
      img.src = reader.result
    }
    reader.onerror = reject
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      // cover-style crop
      const r = Math.min(img.width / size, img.height / size)
      const w = size * r,
        h = size * r
      const sx = (img.width - w) / 2
      const sy = (img.height - h) / 2
      ctx.drawImage(img, sx, sy, w, h, 0, 0, size, size)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    reader.readAsDataURL(file)
  })
}

export function parseUrlsOrIcs (text) {
  const lines = text
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean)
  // If looks like ICS, join and extract urls from DESCRIPTION/URL/ATTACH
  const joined = text.trim()
  let urls = []
  const urlRe = /(https?:\/\/[^\s>\\\"]+\.(?:png|jpe?g|webp|gif))/gi
  if (/BEGIN:VCALENDAR/i.test(joined)) {
    urls = [...joined.matchAll(urlRe)].map(m => m[1])
  } else {
    urls = lines.filter(l => /^https?:\/\//i.test(l))
  }
  return Array.from(new Set(urls))
}
