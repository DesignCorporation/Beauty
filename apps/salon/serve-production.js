import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// Serve static files from dist with cache headers
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d',
  etag: false
}))

// SPA fallback: route all requests to index.html for client-side routing
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'))
})

const PORT = process.env.PORT || 6001
const HOST = process.env.HOST || '0.0.0.0'

app.listen(PORT, HOST, () => {
  console.log(`✅ CRM serving from dist/ on http://${HOST}:${PORT}`)
})
