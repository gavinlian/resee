const fs = require('fs')
const path = 'e:/resee/uiapp/dist/assets'
const files = fs.readdirSync(path)

function checkFile(name, patterns) {
  const f = files.find(f => f.includes(name))
  if (!f) return
  const c = fs.readFileSync(path + '/' + f, 'utf8')
  patterns.forEach(([pat, desc]) => {
    if (c.includes(pat)) console.log('FOUND:', desc, '->', pat)
    else console.log('MISSING:', desc, '->', pat)
  })
}

console.log('=== index page ===')
checkFile('pages-index', [
  ['tab-bar', 'tab-bar'],
  ['.bottom-actions', 'bottom-actions'],
  ['relation-graph', '关系图'],
  ['scan-genealogy', '扫描族谱'],
])

console.log('\n=== search page ===')
checkFile('pages-search', [
  ['search-bar', 'search-bar'],
  ['ai-tips', 'ai-tips'],
  ['mode-btn', 'mode-btn'],
])

console.log('\n=== settings page ===')
checkFile('pages-settings', [
  ['settings-page', 'settings-page'],
  ['AI-配置', 'AI配置'],
])

console.log('\n=== export page ===')
checkFile('pages-export', [
  ['export-page', 'export-page'],
  ['JSON-导出', 'JSON导出'],
  ['PDF-导出', 'PDF导出'],
])

console.log('\n=== ocr page ===')
checkFile('pages-ocr', [
  ['upload-box', 'upload-box'],
  ['preview-area', 'preview-area'],
])

console.log('\n=== ocr-review page ===')
checkFile('pages-ocr-review', [
  ['ocr-review-page', 'ocr-review-page'],
  ['textarea', 'textarea'],
])