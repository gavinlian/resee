const fs = require('fs')
const path = 'e:/resee/uiapp/test-results'
const dirs = fs.readdirSync(path)
const errors = dirs.filter(d => d.includes('error-context'))
errors.forEach(d => {
  const md = fs.readFileSync(path + '/' + d + '/error-context.md', 'utf8')
  console.log('=== ' + d + ' ===')
  console.log(md.slice(0, 500))
  console.log('')
})