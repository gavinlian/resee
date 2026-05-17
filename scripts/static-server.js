const http = require('http')
const fs = require('fs')
const path = require('path')

const DIST = path.join(__dirname, '..', 'dist')
const PORT = 8083

const MIME = {
  '.html': 'text/html;charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
}

function serveFile(filePath, contentType, res) {
  const stream = fs.createReadStream(filePath)
  let headerWritten = false
  stream.on('data', (chunk) => {
    if (!headerWritten) {
      res.writeHead(200, { 'Content-Type': contentType })
      headerWritten = true
    }
    res.write(chunk)
  })
  stream.on('end', () => {
    if (!headerWritten) {
      res.writeHead(200, { 'Content-Type': contentType })
    }
    res.end()
  })
  stream.on('error', () => {
    res.writeHead(404).end('Not Found')
  })
}

function serveIndex(res) {
  const filePath = path.join(DIST, 'index.html')
  serveFile(filePath, 'text/html;charset=utf-8', res)
}

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0]

  // 静态资源（assets / static）
  if (urlPath.startsWith('/assets/')) {
    const filePath = path.join(DIST, urlPath)
    const ext = path.extname(filePath)
    const ct = MIME[ext] || 'application/octet-stream'
    serveFile(filePath, ct, res)
    return
  }

  // static/ 目录的文件（如 TabBar 图标）
  if (urlPath.startsWith('/static/')) {
    const filePath = path.join(__dirname, '..', urlPath)
    const ext = path.extname(filePath)
    const ct = MIME[ext] || 'application/octet-stream'
    serveFile(filePath, ct, res)
    return
  }

  // 带有 hash 的路由（如 /#/pages/index）
  if (urlPath.startsWith('/#')) {
    serveIndex(res)
    return
  }

  // 尝试精确文件路径
  const exactFile = path.join(DIST, urlPath)
  if (fs.existsSync(exactFile) && fs.statSync(exactFile).isFile()) {
    const ext = path.extname(exactFile)
    const ct = MIME[ext] || 'application/octet-stream'
    serveFile(exactFile, ct, res)
    return
  }

  // 其余全部走 index.html（SPA fallback）
  serveIndex(res)
}).listen(PORT, () => console.log(`Static server running at http://localhost:${PORT}`))