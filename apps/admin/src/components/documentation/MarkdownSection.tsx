import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@beauty-platform/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beauty-platform/ui'
import { Alert, AlertDescription } from '@beauty-platform/ui'
import { Loader2 } from 'lucide-react'
import { sdkClient } from '@/services/sdkClient'

interface MarkdownSectionProps {
  categoryId: string
}

interface SubSection {
  id: string
  title: string
  file: string
  content: string
}

interface CategoryData {
  id: string
  title: string
  subsections: SubSection[]
  keyPoints: string[]
  lastUpdated: string
}

export const MarkdownSection: React.FC<MarkdownSectionProps> = ({ categoryId }) => {
  const [categoryData, setCategoryData] = useState<CategoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('overview')

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        setLoading(true)

        // Fetch from MCP Server
        const apiUrl = window.location.hostname === 'localhost'
          ? 'http://localhost:6025/mcp/project-state'
          : `https://${window.location.hostname.replace('admin.', 'api.')}/api/mcp/project-state`

        const data = await sdkClient.request<any>(apiUrl, { method: 'GET', retry: 0, skipCsrf: true })

        // Try both sections (full) and criticalSections (filtered)
        const sections = data.data?.sections || data.data?.criticalSections || []

        if (data.success && sections.length > 0) {
          // Find category by ID
          const category = sections.find((s: any) => s.id === categoryId && s.isCategory)

          if (category) {
            setCategoryData(category)
            // Set first subsection as active tab
            if (category.subsections && category.subsections.length > 0) {
              setActiveTab(category.subsections[0].id)
            }
          } else {
            setError(`Category "${categoryId}" not found`)
          }
        } else {
          setError('Failed to load documentation data')
        }
      } catch (err) {
        console.error('Failed to fetch category data:', err)
        setError('Failed to load category. Check MCP server.')
      } finally {
        setLoading(false)
      }
    }

    fetchCategoryData()

    // WebSocket connection for real-time updates
    const wsUrl = window.location.hostname === 'localhost'
      ? 'ws://localhost:6025'
      : `wss://${window.location.hostname.replace('admin.', 'api.')}/ws`

    let ws: WebSocket | null = null

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('📡 WebSocket connected to MCP Server')
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('📨 WebSocket message:', message)

          if (message.type === 'file-changed') {
            // Check if changed file is in current category
            if (message.path.includes(`docs/sections/${categoryId}`)) {
              console.log(`🔄 Reloading category "${categoryId}" due to file change`)
              fetchCategoryData()
            }
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('📡 WebSocket disconnected')
      }
    } catch (err) {
      console.error('Failed to connect WebSocket:', err)
    }

    // Cleanup
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [categoryId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Загрузка документации...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!categoryData) {
    return (
      <Alert>
        <AlertDescription>Категория не найдена</AlertDescription>
      </Alert>
    )
  }

  // Find overview subsection
  const overviewSection = categoryData.subsections.find(s => s.file === '_overview')
  const regularSections = categoryData.subsections.filter(s => s.file !== '_overview')

  return (
    <div className="space-y-6">
      {/* Category Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">{categoryData.title}</h1>
        {categoryData.lastUpdated && (
          <p className="text-sm text-muted-foreground">
            Последнее обновление: {categoryData.lastUpdated}
          </p>
        )}
      </div>

      {/* Overview Section (if exists) */}
      {overviewSection && (
        <Card>
          <CardHeader>
            <CardTitle>{overviewSection.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="markdown-content prose dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                  // Custom components for better styling
                  h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                  h4: ({node, ...props}) => <h4 className="text-lg font-semibold mt-3 mb-2" {...props} />,
                  p: ({node, ...props}) => <p className="mb-4 leading-7" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                  li: ({node, ...props}) => <li className="ml-4" {...props} />,
                  code: ({node, inline, ...props}: any) =>
                    inline ? (
                      <code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono" {...props} />
                    ) : (
                      <code className="block p-4 bg-muted rounded-lg overflow-x-auto text-sm font-mono mb-4" {...props} />
                    ),
                  pre: ({node, ...props}) => <pre className="mb-4" {...props} />,
                  blockquote: ({node, ...props}) => (
                    <blockquote className="border-l-4 border-primary pl-4 italic my-4" {...props} />
                  ),
                  table: ({node, ...props}) => (
                    <div className="overflow-x-auto mb-4">
                      <table className="min-w-full divide-y divide-border" {...props} />
                    </div>
                  ),
                  thead: ({node, ...props}) => <thead className="bg-muted" {...props} />,
                  th: ({node, ...props}) => <th className="px-4 py-2 text-left text-sm font-semibold" {...props} />,
                  td: ({node, ...props}) => <td className="px-4 py-2 text-sm" {...props} />,
                  a: ({node, ...props}) => <a className="text-primary hover:underline" {...props} />,
                  hr: ({node, ...props}) => <hr className="my-8 border-border" {...props} />,
                }}
              >
                {overviewSection.content}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subsections Tabs */}
      {regularSections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Детальная документация</CardTitle>
            <CardDescription>Выберите раздел для просмотра</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-2 h-auto">
                {regularSections.map((section) => (
                  <TabsTrigger key={section.id} value={section.id} className="whitespace-normal h-auto py-2">
                    {section.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {regularSections.map((section) => (
                <TabsContent key={section.id} value={section.id} className="mt-6">
                  <div className="markdown-content prose dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw, rehypeSanitize]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                        h4: ({node, ...props}) => <h4 className="text-lg font-semibold mt-3 mb-2" {...props} />,
                        p: ({node, ...props}) => <p className="mb-4 leading-7" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                        li: ({node, ...props}) => <li className="ml-4" {...props} />,
                        code: ({node, inline, ...props}: any) =>
                          inline ? (
                            <code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono" {...props} />
                          ) : (
                            <code className="block p-4 bg-muted rounded-lg overflow-x-auto text-sm font-mono mb-4" {...props} />
                          ),
                        pre: ({node, ...props}) => <pre className="mb-4" {...props} />,
                        blockquote: ({node, ...props}) => (
                          <blockquote className="border-l-4 border-primary pl-4 italic my-4" {...props} />
                        ),
                        table: ({node, ...props}) => (
                          <div className="overflow-x-auto mb-4">
                            <table className="min-w-full divide-y divide-border" {...props} />
                          </div>
                        ),
                        thead: ({node, ...props}) => <thead className="bg-muted" {...props} />,
                        th: ({node, ...props}) => <th className="px-4 py-2 text-left text-sm font-semibold" {...props} />,
                        td: ({node, ...props}) => <td className="px-4 py-2 text-sm" {...props} />,
                        a: ({node, ...props}) => <a className="text-primary hover:underline" {...props} />,
                        hr: ({node, ...props}) => <hr className="my-8 border-border" {...props} />,
                      }}
                    >
                      {section.content}
                    </ReactMarkdown>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Key Points */}
      {categoryData.keyPoints && categoryData.keyPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ключевые моменты</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {categoryData.keyPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
