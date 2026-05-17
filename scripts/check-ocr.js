const fs = require('fs')
const files = fs.readdirSync('e:/resee/uiapp/dist/assets').filter(f => f.includes('ocr-index'))
files.forEach(f => {
  const c = fs.readFileSync('e:/resee/uiapp/dist/assets/' + f, 'utf8')
  if (c.includes('click')) {
    console.log('FILE:', f)
    const idx = c.indexOf('click')
    console.log(c.slice(Math.max(0, idx - 200), idx + 200))
    console.log('---')
  }
})