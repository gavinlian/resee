const fs = require('fs')
const path = 'e:/resee/uiapp/dist/assets'

function findClass(name, keyword) {
  const f = fs.readdirSync(path).find(f => f.includes(name))
  if (!f) return
  const c = fs.readFileSync(path + '/' + f, 'utf8')
  const matches = c.match(/\btree-[a-z-]+/g) ||
    c.match(/\bsearch-[a-z-]+/g) ||
    c.match(/\btoggle-[a-z-]+/g) ||
    c.match(/\btab[A-Z][a-z-]+/g) ||
    c.match(/\b[a-z]+Btn\b/g) ||
    c.match(/\bexport-card[a-z]*\b/g) ||
    c.match(/\bscan[A-Za-z-]*\b/g) ||
    []
  console.log(f, [...new Set(matches)].slice(0, 20))
}

findClass('pages-index', 'index')
findClass('pages-search', 'search')
findClass('pages-export', 'export')