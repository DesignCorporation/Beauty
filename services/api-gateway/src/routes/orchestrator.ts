import { Router, Request, Response } from 'express'

const router: Router = Router()

const ORCHESTRATOR_BASE_URL = process.env.ORCHESTRATOR_BASE_URL || 'http://localhost:6030'
const ORCHESTRATOR_TIMEOUT = Number(process.env.ORCHESTRATOR_PROXY_TIMEOUT || 10000)

const JSON_HEADERS = ['content-type', 'content-length', 'connection']

function buildUrl(pathname: string, req: Request, includeQuery: boolean = true): URL {
  const url = new URL(pathname, ORCHESTRATOR_BASE_URL)

  if (includeQuery) {
    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value)) {
        value.forEach(item => url.searchParams.append(key, String(item)))
      } else if (value !== undefined) {
        url.searchParams.append(key, String(value))
      }
    }
  }

  return url
}

async function forwardRequest(
  req: Request,
  res: Response,
  options: { method?: string; targetPath: string; body?: unknown; includeQuery?: boolean }
): Promise<void> {
  const method = options.method || req.method
  const url = buildUrl(options.targetPath, req, options.includeQuery ?? true)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ORCHESTRATOR_TIMEOUT)

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-forwarded-by': 'api-gateway'
  }

  // Прокидываем авторизационные заголовки, если они есть
  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal
    };

    // Only add body if it exists
    if (options.body !== undefined) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const fetchResponse = await fetch(url, fetchOptions)

    const responseText = await fetchResponse.text()
    const contentType = fetchResponse.headers.get('content-type') || 'application/json'

    res.status(fetchResponse.status)

    JSON_HEADERS.forEach(headerName => {
      const headerValue = fetchResponse.headers.get(headerName)
      if (headerValue) {
        res.setHeader(headerName, headerValue)
      }
    })

    if (contentType.includes('application/json')) {
      try {
        const json = responseText.length ? JSON.parse(responseText) : undefined
        res.json(json ?? {})
      } catch {
        res.type('application/json').send(responseText)
      }
    } else {
      res.type(contentType).send(responseText)
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      res.status(504).json({
        success: false,
        error: 'Orchestrator request timed out',
        timestamp: new Date().toISOString()
      })
      return
    }

    console.error('[Orchestrator Proxy] Error:', error)
    res.status(502).json({
      success: false,
      error: 'Failed to reach orchestrator service',
      timestamp: new Date().toISOString()
    })
  } finally {
    clearTimeout(timeout)
  }
}

// Health endpoint passthrough
router.get('/health', async (req, res) => {
  await forwardRequest(req, res, { targetPath: '/health', includeQuery: false })
})

// Status endpoints
router.get('/status-all', async (req, res) => {
  await forwardRequest(req, res, { targetPath: '/orchestrator/status-all' })
})

router.get('/services/:id/status', async (req, res) => {
  await forwardRequest(req, res, { targetPath: `/orchestrator/services/${encodeURIComponent(req.params.id)}/status` })
})

// Logs endpoint
router.get('/services/:id/logs', async (req, res) => {
  await forwardRequest(req, res, {
    targetPath: `/orchestrator/services/${encodeURIComponent(req.params.id)}/logs`
  })
})

// Registry endpoint
router.get('/registry', async (req, res) => {
  await forwardRequest(req, res, { targetPath: '/orchestrator/registry', includeQuery: false })
})

// Action endpoint
router.post('/services/:id/actions', async (req, res) => {
  await forwardRequest(req, res, {
    method: 'POST',
    targetPath: `/orchestrator/services/${encodeURIComponent(req.params.id)}/actions`,
    body: req.body,
    includeQuery: false
  })
})

// Batch actions
router.post('/services/batch/start', async (req, res) => {
  await forwardRequest(req, res, {
    method: 'POST',
    targetPath: '/orchestrator/services/batch/start',
    body: req.body,
    includeQuery: false
  })
})

router.post('/services/batch/stop', async (req, res) => {
  await forwardRequest(req, res, {
    method: 'POST',
    targetPath: '/orchestrator/services/batch/stop',
    body: req.body,
    includeQuery: false
  })
})

// Process information endpoints
router.get('/services/:id/processes', async (req, res) => {
  await forwardRequest(req, res, {
    targetPath: `/orchestrator/services/${encodeURIComponent(req.params.id)}/processes`
  })
})

// Kill status endpoint
router.get('/services/:id/kill-status', async (req, res) => {
  await forwardRequest(req, res, {
    targetPath: `/orchestrator/services/${encodeURIComponent(req.params.id)}/kill-status`
  })
})

// Kill process endpoint
router.post('/services/:id/kill', async (req, res) => {
  await forwardRequest(req, res, {
    method: 'POST',
    targetPath: `/orchestrator/services/${encodeURIComponent(req.params.id)}/kill`,
    body: req.body,
    includeQuery: false
  })
})

// Full orchestrator restart endpoint
router.post('/restart', async (req, res) => {
  await forwardRequest(req, res, {
    method: 'POST',
    targetPath: '/orchestrator/restart',
    body: req.body,
    includeQuery: false
  })
})

export default router
