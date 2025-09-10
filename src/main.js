import './styles/main.css'
import { render } from './utils/render'
import {
  uid,
  save,
  load,
  dataTransferImageFile,
  fileToDataUrlSquare,
  parseUrlsOrIcs
} from './utils/utils'

document.querySelector('#app').innerHTML = `
<!DOCTYPE html>
    <html lang="en">

    <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Instagram Feed Preview — Notion Widget</title>
    <link rel="stylesheet" href="/src/styles/main.css" />
    </head>

    <body>
    <div class="app">
        <div class="toolbar">
        <div class="title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="5" stroke="white" stroke-width="1.5" />
            <circle cx="16.5" cy="7.5" r="1.5" fill="white" />
            <circle cx="12" cy="12" r="4.25" stroke="white" stroke-width="1.5" />
            </svg>
            Instagram Feed Preview
            <span class="badge">local</span>
        </div>
        <button class="btn primary" id="addBtn">Add image</button>
        <button class="btn ghost" id="updateBtn">Update from calendar</button>
        <button class="btn ghost" id="importBtn" title="Import JSON">Import</button>
        <button class="btn ghost" id="exportBtn" title="Export JSON">Export</button>
        <button class="btn danger" id="clearBtn" title="Clear all">Clear</button>
        </div>

        <div id="grid" class="grid" aria-live="polite"></div>
        <div id="emptyState" class="empty" style="display:none">
        <strong>No posts yet.</strong>
        <p>Click <em>Add image</em> or <em>Update from calendar</em> to populate your preview.</p>
        </div>

        <div class="footer">
        <span>Data is saved in your browser (localStorage).</span>
        <span>Tip: embed this page in Notion with <code>/embed</code>.</span>
        </div>
    </div>

    <!-- Add Image Modal -->
    <dialog id="addModal">
        <form method="dialog" class="modal" id="addForm">
        <h3>Add image</h3>
        <div class="field">
            <label>Image source (URL) — or upload a file below</label>
            <input type="url" id="imgUrl" placeholder="https://…/image.jpg" />
        </div>
        <div class="field">
            <div id="drop" class="dropzone">
            <input class="sr-only" type="file" id="fileInput" accept="image/*" />
            <p>Drag & drop an image here, or click to choose a file.</p>
            </div>
        </div>
        <div class="row">
            <div class="field" style="flex:2 1 260px">
            <label>Caption (optional)</label>
            <input type="text" id="caption" placeholder="Write a caption…" />
            </div>
            <div class="field" style="flex:1 1 160px">
            <label>Date (optional)</label>
            <input type="text" id="date" placeholder="2025-09-10" />
            </div>
        </div>
        <div class="actions">
            <button class="btn ghost" value="cancel">Cancel</button>
            <button class="btn primary" id="saveAdd">Add</button>
        </div>
        </form>
    </dialog>

    <!-- Update from Calendar Modal -->
    <dialog id="calModal">
        <form method="dialog" class="modal" id="calForm">
        <h3>Update from calendar</h3>
        <p style="color:#cbd5e1; margin-top:0">Two easy options:
            <br>1) Paste image URLs (one per line), or
            <br>2) Paste iCal/ICS text — we'll try to extract any image links in event descriptions.
        </p>
        <div class="field">
            <label>Paste URLs or ICS</label>
            <textarea id="calendarText" rows="8"
            placeholder="https://…/img1.jpg\nhttps://…/img2.png\n\n—or—\nBEGIN:VCALENDAR…"></textarea>
        </div>
        <div class="row">
            <button class="btn ghost small" id="appendMode" type="button" aria-pressed="true">Append mode</button>
            <span class="badge" id="countBadge">0 found</span>
        </div>
        <div class="actions">
            <button class="btn ghost" value="cancel">Cancel</button>
            <button class="btn primary" id="applyCalendar">Apply</button>
        </div>
        </form>
    </dialog>

    <!-- Import JSON Modal -->
    <dialog id="importModal">
        <form method="dialog" class="modal" id="importForm">
        <h3>Import posts (JSON)</h3>
        <div class="field">
            <textarea id="importText" rows="8" placeholder='[{"src":"https://…","caption":"…"}]'></textarea>
        </div>
        <div class="actions">
            <button class="btn ghost" value="cancel">Cancel</button>
            <button class="btn primary" id="applyImport">Import</button>
        </div>
        </form>
    </dialog>

    <script src="/src/main.js"></script>
    </body>

</html>`

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
