import { render } from './utils/render'
import {
  uid,
  save,
  load,
  dataTransferImageFile,
  fileToDataUrlSquare,
  parseUrlsOrIcs
} from './utils/utils'

const addModal = document.querySelector('#addModal')
const calModal = document.querySelector('#calModal')
const importModal = document.querySelector('#importModal')

document.querySelector('#addBtn').onclick = () => addModal.showModal()
document.querySelector('#updateBtn').onclick = () => calModal.showModal()
document.querySelector('#importBtn').onclick = () => importModal.showModal()

document.querySelector('#clearBtn').onclick = () => {
  if (confirm('Clear all posts?')) {
    save([])
  }
}

// Add image flow
;(function () {
  const drop = document.querySelector('#drop')
  const fileInput = document.querySelector('#fileInput')
  drop.addEventListener('click', () => fileInput.click())
  drop.addEventListener('dragover', e => {
    e.preventDefault()
    drop.classList.add('drag')
  })
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'))
  drop.addEventListener('drop', async e => {
    e.preventDefault()
    drop.classList.remove('drag')
    const file = dataTransferImageFile(e)
    if (file) {
      document.querySelector('#imgUrl').value = await fileToDataUrlSquare(file)
    }
  })
  fileInput.addEventListener('change', async e => {
    const f = fileInput.files[0]
    if (f) {
      document.querySelector('#imgUrl').value = await fileToDataUrlSquare(f)
    }
  })

  document.querySelector('#saveAdd').addEventListener('click', e => {
    e.preventDefault()
    const src = document.querySelector('#imgUrl').value.trim()
    const caption = document.querySelector('#caption').value.trim()
    const date = document.querySelector('#date').value.trim()
    if (!src) {
      alert('Please provide an image URL or upload a file.')
      return
    }
    const posts = load()
    posts.unshift({ id: uid(), src, caption, date })
    save(posts)
    addModal.close()
    document.querySelector('#addForm').reset()
  })
})()

// Calendar flow
;(function () {
  const txt = document.querySelector('#calendarText')
  const badge = document.querySelector('#countBadge')
  const appendBtn = document.querySelector('#appendMode')
  let append = true
  appendBtn.onclick = () => {
    append = !append
    appendBtn.setAttribute('aria-pressed', String(append))
    appendBtn.textContent = append ? 'Append mode' : 'Replace mode'
  }
  txt.addEventListener('input', () => {
    badge.textContent = parseUrlsOrIcs(txt.value).length + ' found'
  })

  document.querySelector('#applyCalendar').addEventListener('click', e => {
    e.preventDefault()
    const urls = parseUrlsOrIcs(txt.value)
    if (!urls.length) {
      alert(
        'No image URLs found. Paste direct image links (.jpg, .png, .webp, .gif) or ICS with links in descriptions.'
      )
      return
    }
    let posts = append ? load() : []
    urls.reverse().forEach(u => {
      posts.unshift({ id: uid(), src: u, caption: '', date: '' })
    })
    save(posts)
    calModal.close()
    document.querySelector('#calForm').reset()
    badge.textContent = '0 found'
  })
})()

// Import/Export
;(function () {
  document.querySelector('#exportBtn').onclick = () => {
    const data = JSON.stringify(load(), null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ig-preview-posts.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  document.querySelector('#applyImport').onclick = e => {
    e.preventDefault()
    try {
      const arr = JSON.parse(document.querySelector('#importText').value)
      if (!Array.isArray(arr)) throw new Error('Expected an array')
      const sanitized = arr
        .map(x => ({
          id: x.id || uid(),
          src: String(x.src || '').trim(),
          caption: String(x.caption || '').trim(),
          date: String(x.date || '').trim()
        }))
        .filter(x => x.src)
      save(sanitized)
      importModal.close()
      document.querySelector('#importForm').reset()
    } catch (err) {
      alert('Invalid JSON: ' + err.message)
    }
  }
})()

// Global clicks (safety)
document.addEventListener('click', e => {
  if (e.target.nodeName === 'DIALOG') e.target.close()
})

render()
