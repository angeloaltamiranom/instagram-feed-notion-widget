import { load, save, showEmpty } from './utils'
function enableDnD () {
  const grid = document.querySelector('#grid')
  let dragEl = null

  grid.querySelectorAll('.tile').forEach(tile => {
    tile.addEventListener('dragstart', e => {
      dragEl = tile
      tile.classList.add('dragging')
    })
    tile.addEventListener('dragend', e => {
      dragEl = null
      tile.classList.remove('dragging')
    })
    tile.addEventListener('dragover', e => {
      e.preventDefault()
      const target = tile
      const rect = target.getBoundingClientRect()
      const before = e.clientY < rect.top + rect.height / 2
      if (dragEl && dragEl !== target) {
        if (before) target.before(dragEl)
        else target.after(dragEl)
      }
    })
  })

  grid.addEventListener('drop', () => {
    // persist new order
    const ids = [...grid.querySelectorAll('.tile')].map(t => t.dataset.id)
    const posts = load().sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
    save(posts)
  })

  // delete click
  grid.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="delete"]')
    if (!btn) return
    const id = e.target.closest('.tile').dataset.id
    const posts = load().filter(p => p.id !== id)
    save(posts)
  })
}

export function render () {
  const grid = document.querySelector('#grid')
  const posts = load()
  grid.innerHTML = ''
  if (!posts.length) {
    showEmpty(true)
    return
  }
  showEmpty(false)

  posts.forEach((p, idx) => {
    const el = document.createElement('div')
    el.className = 'tile'
    el.setAttribute('draggable', 'true')
    el.dataset.id = p.id
    el.innerHTML = `
          <img alt="post" src="${p.src}" loading="lazy" />
          <div class="overlay"></div>
          <div class="actions">
            <button class="iconbtn" title="Delete" data-action="delete">✕</button>
          </div>
          ${
            p.date
              ? `<div class="chip" style="position:absolute; left:8px; bottom:8px">${p.date}</div>`
              : ''
          }
        `
    grid.appendChild(el)
  })

  enableDnD()
}
