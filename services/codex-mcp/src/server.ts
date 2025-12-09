import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import fs from 'fs/promises'
import path from 'path'
import type { Dirent } from 'fs'

const CLAUDE_MEMORY_PATH = '/root/beauty-platform/CLAUDE.md'
const CODEX_MEMORY_PATH = '/root/beauty-platform/Codex.md'
const DOC_SECTIONS_DIR = '/root/beauty-platform/apps/admin-panel/src/components/documentation/sections'
const UI_COMPONENTS_DIR = '/root/beauty-platform/packages/ui/src/components'
const DEFAULT_MCP_BASE_URL = process.env.MCP_SERVER_URL || 'http://mcp-server:6025'

const DOC_SECTION_CACHE_TTL = 60 * 1000
const UI_COMPONENT_CACHE_TTL = 60 * 1000

const AGENT_TYPES = [
  'backend-dev',
  'frontend-dev',
  'devops-engineer',
  'database-analyst',
  'product-manager',
  'ui-designer'
]

type CachedEntry<T> = {
  value: T
  loadedAt: number
}

type DocSectionInfo = {
  id: string
  fileName: string
  title: string
  relativePath: string
  absolutePath: string
}

type UIComponentInfo = {
  id: string
  name: string
  relativePath: string
  absolutePath: string
}

const server = new McpServer({
  name: 'beauty-platform-codex-mcp',
  version: '0.1.0'
})

let docSectionCache: CachedEntry<DocSectionInfo[]> | null = null
let uiComponentCache: CachedEntry<UIComponentInfo[]> | null = null

/**
 * Utility Helpers
 */
async function safeReadFile(filePath: string, label: string): Promise<string> {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return `⚠️ Не удалось прочитать файл ${label}: ${message}`
  }
}

async function fetchJson(pathname: string): Promise<any | null> {
  const baseUrl = process.env.BEAUTY_MCP_HTTP ?? DEFAULT_MCP_BASE_URL
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3_000)

  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`⚠️ Не удалось получить ${pathname}: ${message}`)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function renderJsonBlock(title: string, payload: any): string {
  return [`## ${title}`, '```json', JSON.stringify(payload, null, 2), '```', ''].join('\n')
}

function formatSmartMemory(data: any): string {
  if (!data) {
    return '⚠️ MCP сервер документации недоступен или вернул пустые данные.'
  }

  const lines: string[] = ['# Beauty Platform — Smart Memory', `Обновлено: ${data.timestamp ?? 'неизвестно'}`, '']

  if (data.projectStatus) {
    lines.push('## Статус проекта')
    lines.push(
      `- Прогресс: ${data.projectStatus.progress ?? '?'}% (${data.projectStatus.status ?? 'unknown'})`
    )
    lines.push(`- Сообщение: ${data.projectStatus.message ?? '—'}`)
    if (Array.isArray(data.projectStatus.activeServices)) {
      lines.push('', '### Сервисы')
      for (const service of data.projectStatus.activeServices) {
        lines.push(`- ${service.name ?? 'service'} — ${service.status ?? 'unknown'}`)
      }
    }
    lines.push('')
  }

  if (Array.isArray(data.quickReference?.criticalRules)) {
    lines.push('## Критичные правила')
    for (const rule of data.quickReference.criticalRules) {
      lines.push(`- ${rule}`)
    }
    lines.push('')
  }

  if (Array.isArray(data.quickReference?.currentPriorities)) {
    lines.push('## Текущие приоритеты')
    for (const item of data.quickReference.currentPriorities) {
      lines.push(`- ${item}`)
    }
    lines.push('')
  }

  if (Array.isArray(data.criticalSections?.quickStart ? [data.criticalSections.quickStart] : [])) {
    lines.push('## Важные секции')
    const critical = Object.entries(data.criticalSections)
      .filter(([, value]) => value)
      .map(([, value]) => value as any)
    for (const section of critical) {
      lines.push(`- ${section.title ?? section.id ?? 'section'} — приоритет ${section.priority ?? '?'}`)
    }
    lines.push('')
  }

  if (Array.isArray(data.sections)) {
    lines.push('## Пример секций')
    for (const section of data.sections) {
      lines.push(
        `- ${section.title ?? section.id ?? 'section'} (priority: ${section.priority ?? '?'})`
      )
    }
    lines.push('')
  }

  lines.push(renderJsonBlock('Исходные данные', data))
  return lines.join('\n')
}

function formatAgentContext(agentType: string, context: any): string {
  if (!context) {
    return `⚠️ Не удалось получить контекст агента ${agentType}. Проверьте, запущен ли HTTP MCP сервер.`
  }

  const lines: string[] = [
    `# Контекст для агента ${agentType}`,
    `Обновлено: ${context.timestamp ?? 'неизвестно'}`,
    ''
  ]

  if (context.projectOverview) {
    lines.push('## Обзор проекта', context.projectOverview?.title ?? '—', '')
  }

  if (context.securityRules) {
    lines.push('## Безопасность', context.securityRules?.title ?? '—', '')
  }

  if (Array.isArray(context.specializedSections)) {
    lines.push('## Специализированные секции')
    for (const section of context.specializedSections) {
      lines.push(`- ${section.title ?? section.id ?? 'section'} (priority: ${section.priority ?? '?'})`)
    }
    lines.push('')
  }

  if (context.currentStatus) {
    lines.push('## Статус проекта', renderJsonBlock('Текущее состояние', context.currentStatus))
  }

  if (context.specializedInstructions) {
    lines.push(renderJsonBlock('Инструкции', context.specializedInstructions))
  }

  if (context.quickReference) {
    lines.push(renderJsonBlock('Quick Reference', context.quickReference))
  }

  return lines.join('\n')
}

async function getDocSections(): Promise<DocSectionInfo[]> {
  const now = Date.now()
  if (docSectionCache && now - docSectionCache.loadedAt < DOC_SECTION_CACHE_TTL) {
    return docSectionCache.value
  }

  const sections: DocSectionInfo[] = []

  try {
    const entries = await fs.readdir(DOC_SECTIONS_DIR, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.tsx') || entry.name === 'index.ts') {
        continue
      }
      const absolutePath = path.join(DOC_SECTIONS_DIR, entry.name)
      const relativePath = `apps/admin-panel/src/components/documentation/sections/${entry.name}`
      const baseName = entry.name.replace(/Section\.tsx$/, '').replace(/\.tsx$/, '')
      const title = baseName
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/-/g, ' ')
        .trim()
      const id = encodeURIComponent(entry.name)

      sections.push({
        id,
        fileName: entry.name,
        title,
        relativePath,
        absolutePath
      })
    }

    sections.sort((a, b) => a.title.localeCompare(b.title))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`⚠️ Не удалось прочитать секции документации: ${message}`)
  }

  docSectionCache = { value: sections, loadedAt: now }
  return sections
}

async function getUiComponents(): Promise<UIComponentInfo[]> {
  const now = Date.now()
  if (uiComponentCache && now - uiComponentCache.loadedAt < UI_COMPONENT_CACHE_TTL) {
    return uiComponentCache.value
  }

  const results: UIComponentInfo[] = []

  async function walk(dir: string, prefix = ''): Promise<void> {
    let entries: Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`⚠️ Ошибка чтения каталога UI компонентов (${dir}): ${message}`)
      return
    }

    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
      const absolutePath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath)
      } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
        const name = entry.name.replace(/\.(tsx|ts)$/, '')
        const id = encodeURIComponent(relativePath)
        results.push({ id, name, relativePath, absolutePath })
      }
    }
  }

  await walk(UI_COMPONENTS_DIR)
  results.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
  uiComponentCache = { value: results, loadedAt: now }
  return results
}

async function buildDocOverview(): Promise<string> {
  const sections = await getDocSections()
  if (!sections.length) {
    return '# Секции документации\n\n⚠️ Не найдено секций. Убедитесь, что admin-panel собрана.'
  }

  const lines: string[] = [
    '# Секции документации Beauty Platform',
    `Всего секций: ${sections.length}`,
    ''
  ]

  for (const section of sections) {
    lines.push(`- **${section.title}** — \`${section.fileName}\``)
  }

  lines.push('', 'Используй ресурс `beauty://docs/section/{fileName}` для чтения исходника секции.')
  return lines.join('\n')
}

async function buildUiOverview(): Promise<string> {
  const components = await getUiComponents()
  if (!components.length) {
    return '# Shadcn/UI компоненты\n\n⚠️ Компоненты не найдены.'
  }

  const lines: string[] = [
    '# Shadcn/UI компоненты Beauty Platform',
    `Всего компонентов: ${components.length}`,
    ''
  ]

  for (const component of components) {
    lines.push(`- **${component.name}** — \`${component.relativePath}\``)
  }

  lines.push('', 'Используй ресурс `beauty://ui/component/{componentId}` для чтения исходника.')
  return lines.join('\n')
}

/**
 * Resource registrations
 */
server.registerResource(
  'beauty-claude-memory',
  'beauty://memory/claude',
  {
    title: 'CLAUDE.md — основная память',
    description: 'Текущая память проекта из файла CLAUDE.md',
    mimeType: 'text/markdown'
  },
  async () => ({
    contents: [
      {
        uri: 'beauty://memory/claude',
        mimeType: 'text/markdown',
        text: await safeReadFile(CLAUDE_MEMORY_PATH, 'CLAUDE.md')
      }
    ]
  })
)

server.registerResource(
  'beauty-codex-memory',
  'beauty://memory/codex',
  {
    title: 'Codex.md — базовая инструкция',
    description: 'Память и правила для агента Codex',
    mimeType: 'text/markdown'
  },
  async () => ({
    contents: [
      {
        uri: 'beauty://memory/codex',
        mimeType: 'text/markdown',
        text: await safeReadFile(CODEX_MEMORY_PATH, 'Codex.md')
      }
    ]
  })
)

server.registerResource(
  'beauty-docs-overview',
  'beauty://docs/overview',
  {
    title: 'Обзор секций документации',
    description: 'Список всех секций документации admin-panel',
    mimeType: 'text/markdown'
  },
  async () => ({
    contents: [
      {
        uri: 'beauty://docs/overview',
        mimeType: 'text/markdown',
        text: await buildDocOverview()
      }
    ]
  })
)

const docSectionTemplate = new ResourceTemplate('beauty://docs/section/{fileName}', {
  list: async () => {
    const sections = await getDocSections()
    return {
      resources: sections.map(section => ({
        uri: `beauty://docs/section/${section.id}`,
        name: section.title,
        description: section.relativePath,
        mimeType: 'text/tsx'
      }))
    }
  }
})

server.registerResource(
  'beauty-doc-section',
  docSectionTemplate,
  {
    title: 'Исходник секции документации',
    description: 'TSX файл секции документации из admin-panel',
    mimeType: 'text/tsx'
  },
  async (uri, variables): Promise<ReadResourceResult> => {
    const fileParam = variables.fileName
    const decoded = decodeURIComponent(fileParam as any)
    const sections = await getDocSections()
    const match = sections.find(section => section.fileName === decoded)

    if (!match) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: `⚠️ Секция ${decoded} не найдена.`
          }
        ]
      }
    }

    const source = await safeReadFile(match.absolutePath, match.relativePath)
    const banner = `// File: ${match.relativePath}\n\n`
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/tsx',
          text: banner + source
        }
      ]
    }
  }
)

server.registerResource(
  'beauty-ui-overview',
  'beauty://ui/overview',
  {
    title: 'Shadcn/UI компоненты',
    description: 'Сводка по доступным UI компонентам Beauty Platform',
    mimeType: 'text/markdown'
  },
  async () => ({
    contents: [
      {
        uri: 'beauty://ui/overview',
        mimeType: 'text/markdown',
        text: await buildUiOverview()
      }
    ]
  })
)

const uiComponentTemplate = new ResourceTemplate('beauty://ui/component/{componentId}', {
  list: async () => {
    const components = await getUiComponents()
    return {
      resources: components.map(component => ({
        uri: `beauty://ui/component/${component.id}`,
        name: component.name,
        description: component.relativePath,
        mimeType: component.relativePath.endsWith('.ts') ? 'text/typescript' : 'text/tsx'
      }))
    }
  }
})

server.registerResource(
  'beauty-ui-component',
  uiComponentTemplate,
  {
    title: 'Компонент UI библиотеки',
    description: 'Исходный код Shadcn/UI компонента из packages/ui',
    mimeType: 'text/tsx'
  },
  async (uri, variables): Promise<ReadResourceResult> => {
    const componentId = variables.componentId
    const decoded = decodeURIComponent(componentId as any)
    const components = await getUiComponents()
    const match = components.find(component => component.relativePath === decoded)

    if (!match) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: `⚠️ Компонент ${decoded} не найден.`
          }
        ]
      }
    }

    const source = await safeReadFile(match.absolutePath, match.relativePath)
    const banner = `// File: packages/ui/src/components/${decoded}\n\n`
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: decoded.endsWith('.ts') ? 'text/typescript' : 'text/tsx',
          text: banner + source
        }
      ]
    }
  }
)

server.registerResource(
  'beauty-smart-memory',
  'beauty://docs/smart-memory',
  {
    title: 'Smart Memory из HTTP MCP сервера',
    description: 'Агрегированная информация (/mcp/smart-memory)',
    mimeType: 'text/markdown'
  },
  async () => {
    const response = await fetchJson('/mcp/smart-memory')
    const text = response?.success ? formatSmartMemory(response.data) : formatSmartMemory(null)
    return {
      contents: [
        {
          uri: 'beauty://docs/smart-memory',
          mimeType: 'text/markdown',
          text
        }
      ]
    }
  }
)

const agentContextTemplate = new ResourceTemplate('beauty://docs/agent-context/{agentType}', {
  list: async () => ({
    resources: AGENT_TYPES.map(agent => ({
      uri: `beauty://docs/agent-context/${agent}`,
      name: `Agent context: ${agent}`,
      description: 'Специализированные инструкции из MCP сервера',
      mimeType: 'text/markdown'
    }))
  })
})

server.registerResource(
  'beauty-agent-context',
  agentContextTemplate,
  {
    title: 'Специализированный контекст агента',
    description: 'Данные из /mcp/agent-context/:agentType',
    mimeType: 'text/markdown'
  },
  async (uri, variables): Promise<ReadResourceResult> => {
    const rawAgentType = Array.isArray(variables.agentType)
      ? variables.agentType[0]
      : variables.agentType
    const agentType = rawAgentType ?? ''

    if (!agentType) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: '⚠️ Тип агента не указан в запросе.'
          }
        ]
      }
    }
    const response = await fetchJson(`/mcp/agent-context/${agentType}`)
    const text = response?.success
      ? formatAgentContext(agentType, response.data as any as any as any as any)
      : `⚠️ Не удалось получить контекст для ${agentType}.`

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text
        }
      ]
    }
  }
)

server.registerResource(
  'beauty-critical-rules',
  'beauty://docs/critical-rules',
  {
    title: 'Критичные правила',
    description: 'Список правил безопасности из /mcp/critical-rules',
    mimeType: 'text/markdown'
  },
  async () => {
    const response = await fetchJson('/mcp/critical-rules')
    if (!response?.success) {
      return {
        contents: [
          {
            uri: 'beauty://docs/critical-rules',
            mimeType: 'text/markdown',
            text: '⚠️ Не удалось получить критичные правила.'
          }
        ]
      }
    }

    const rules = response.data?.rules ?? []
    const lines: string[] = ['# Критичные правила безопасности', '']
    for (const rule of rules) {
      lines.push(`- [${rule.type}] ${rule.rule} (severity: ${rule.severity})`)
    }

    return {
      contents: [
        {
          uri: 'beauty://docs/critical-rules',
          mimeType: 'text/markdown',
          text: lines.join('\n')
        }
      ]
    }
  }
)

async function main() {
  console.log('🤖 Запуск Beauty Platform Codex MCP сервера...')
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.log('✅ Codex MCP сервер готов. Доступные ресурсы будут перечислены клиентом.')
}

main().catch(error => {
  console.error('❌ Ошибка запуска Codex MCP сервера:', error)
  process.exit(1)
})
