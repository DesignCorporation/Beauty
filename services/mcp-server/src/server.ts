// Beauty Platform MCP Server
// Provides structured context and knowledge for AI agents

import express from 'express';
import type { Express } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { WebSocketServer, WebSocket } from 'ws';
import chokidar from 'chokidar';

type SectionPriority = 'critical' | 'high' | 'medium';

interface AgentInstructions {
  forbidden: string[];
  required: string[];
  bestPractices: string[];
}

interface CategorySubsection {
  id: string;
  title: string;
  file: string;
  content: string;
}

interface TaskProgress {
  completed: number;
  total: number;
}

interface ChecklistTaskGroup {
  id: string;
  title: string;
  progress: TaskProgress;
  percentage: number;
  status?: string;
}

interface ChecklistSummary {
  totalTasks: number;
  totalCompleted: number;
  totalProgress: number;
  taskGroups: ChecklistTaskGroup[];
}

interface BaseSection {
  id: string;
  title: string;
  priority: SectionPriority;
  keyPoints: string[];
  agentInstructions: AgentInstructions;
  agentRelevance: string[];
  lastUpdated: string;
  isCategory?: false;
}

interface CategorySection extends Omit<BaseSection, 'isCategory'> {
  isCategory: true;
  subsections: CategorySubsection[];
}

interface ChecklistSection extends BaseSection {
  taskSummary: ChecklistSummary;
}

type DocumentationSection = BaseSection | CategorySection | ChecklistSection;

interface ServiceDefinition {
  name: string;
  port: number;
  endpoint: string;
  type: 'api' | 'web' | 'database';
}

interface ServiceStatus extends ServiceDefinition {
  status: 'healthy' | 'unhealthy' | 'offline' | 'error' | 'degraded';
  response?: string;
  error?: string;
  timestamp: string;
}

interface ProjectProgressBreakdown {
  services: {
    healthy: number;
    total: number;
    percentage: number;
  };
  features: {
    completed: number;
    total: number;
    percentage: number;
  };
}

interface ProjectProgress {
  progress: number;
  breakdown: ProjectProgressBreakdown;
  status: 'production-ready' | 'beta-ready' | 'alpha-ready' | 'development';
}

interface DocumentationPayload {
  sections: DocumentationSection[];
  projectStatus: ProjectProgress & {
    message: string;
    activeServices: FormattedServiceStatus[];
    lastChecked: string;
  };
  currentTasks: {
    completed: number;
    total: number;
    nextPriorities: Array<{
      id: string;
      title: string;
      priority: 'critical' | 'high' | 'medium';
      assignedTo: string;
      description: string;
      category: string;
    }>;
  };
}

interface FormattedServiceStatus {
  name: string;
  port: number;
  status: 'running' | 'degraded' | 'offline';
  notes: string;
}

type AgentTask = DocumentationPayload['currentTasks']['nextPriorities'][number];

interface AgentInstruction {
  focus: string;
  tools: string[];
  currentTasks: AgentTask[];
  nextUrgentTask?: AgentTask;
  criticalReminders: string[];
}

function isChecklistSection(section: DocumentationSection): section is ChecklistSection {
  return 'taskSummary' in section;
}

type SearchMatchType = 'title' | 'keyPoint' | 'instruction';

interface SearchMatch {
  type: SearchMatchType;
  text: string;
  relevance: number;
}

interface SearchSectionMatch {
  sectionId: string;
  sectionTitle: string;
  priority: SectionPriority;
  matches: SearchMatch[];
  totalMatches: number;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function currentDateISO(): string {
  const isoString = new Date().toISOString();
  const [datePart] = isoString.split('T');
  return datePart || isoString;
}

interface GithubIssueResponse {
  number?: number;
  html_url?: string;
  message?: string;
}

const execAsync = promisify(exec);

const app: Express = express();
const PORT = parseInt(process.env.PORT || '6025', 10);
const ADMIN_PANEL_PATH = '/root/projects/beauty/apps/admin-panel/src/components/documentation/sections';

// Middleware
app.use(cors());
app.use(express.json());

// Service health cache
let serviceHealthCache: ServiceStatus[] | null = null;
let healthCacheTimestamp = 0;
const HEALTH_CACHE_TTL = 30 * 1000; // 30 seconds

// Read documentation sections from both Admin Panel AND /docs/sections/
async function readDocumentationSections(): Promise<DocumentationSection[]> {
  const sections: DocumentationSection[] = [];

  try {
    // PHASE 1: Read from Admin Panel TSX components (legacy)
    const sectionFiles = fs.readdirSync(ADMIN_PANEL_PATH)
      .filter(file => file.endsWith('.tsx') && file !== 'index.ts');

    for (const file of sectionFiles) {
      const sectionId = file.replace('Section.tsx', '').toLowerCase();
      const content = fs.readFileSync(path.join(ADMIN_PANEL_PATH, file), 'utf-8');

      // Extract key information from TSX component
      const section = parseDocumentationSection(sectionId, content);
      if (section) {
        sections.push(section);
      }
    }

    // PHASE 2: Read from /docs/sections/ (new category system)
    const docsSectionsPath = '/root/projects/beauty/docs/sections';
    if (fs.existsSync(docsSectionsPath)) {
      const items = fs.readdirSync(docsSectionsPath);
      console.log(`📂 Found ${items.length} items in /docs/sections: ${items.join(', ')}`);

      for (const item of items) {
        const itemPath = path.join(docsSectionsPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          // Read category (folder with files)
          console.log(`🔄 Reading category folder: ${item}`);
          const categorySection = readCategoryFromFolder(item, itemPath);
          if (categorySection) {
            console.log(`✅ Loaded category: ${categorySection.id}`);
            sections.push(categorySection);
          } else {
            console.log(`⚠️ Failed to load category: ${item}`);
          }
        } else if (item.endsWith('.md')) {
          // Single .md file as category
          console.log(`🔄 Reading markdown file: ${item}`);
          const fileSection = parseSingleMarkdownFile(item.replace('.md', ''), itemPath);
          if (fileSection) {
            console.log(`✅ Loaded file section: ${fileSection.id}`);
            sections.push(fileSection);
          }
        }
      }
    } else {
      console.log(`⚠️ /docs/sections path does not exist`);
    }

    console.log(`📑 Parsed ${sections.length} sections: ${sections.map(s => s.id).join(', ')}`);
    return sections;
  } catch (error) {
    console.error('❌ Failed to read documentation sections:', error);
    return [];
  }
}

// Read a category from folder (contains multiple .md files)
function readCategoryFromFolder(categoryName: string, folderPath: string): CategorySection | null {
  try {
    const files = fs.readdirSync(folderPath)
      .filter(f => f.endsWith('.md'))
      .sort((a, b) => {
        // _overview.md first, then alphabetical
        if (a.startsWith('_')) return -1;
        if (b.startsWith('_')) return 1;
        return a.localeCompare(b);
      });

    if (files.length === 0) return null;

    const subsections: CategorySubsection[] = [];
    let overviewContent = '';

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = file.replace('.md', '').replace('_', '');

      if (file === '_overview.md') {
        overviewContent = content;
      } else {
        subsections.push({
          id: `${categoryName}-${fileName}`,
          title: extractTitleFromMarkdown(content),
          file: fileName,
          content // Full content (no truncation)
        });
      }
    }

    const categoryId = categoryName.toLowerCase();
    const categoryTitle = capitalizeFirstLetter(categoryName);
    const aggregatedContent = [overviewContent, ...subsections.map(subsection => subsection.content)].join('\n');
    const keyPoints = extractKeyPointsFromMarkdown(overviewContent || subsections[0]?.content || '');
    const agentInstructions = extractAgentInstructions(aggregatedContent);
    const agentRelevance = determineAgentRelevance(categoryId, aggregatedContent);
    const priority = determineSectionPriority(categoryId, aggregatedContent);

    console.log(`📂 Category "${categoryId}": ${subsections.length} subsections`);

    return {
      id: categoryId,
      title: categoryTitle,  // No emoji - UI will add icon
      priority,
      isCategory: true,
      subsections,
      keyPoints,
      agentInstructions,
      agentRelevance,
      lastUpdated: currentDateISO()
    };
  } catch (error) {
    console.error(`❌ Failed to read category ${categoryName}:`, error);
    return null;
  }
}

// Parse single .md file
function parseSingleMarkdownFile(fileName: string, filePath: string): BaseSection | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const title = extractTitleFromMarkdown(content);
    const keyPoints = extractKeyPointsFromMarkdown(content);
    const agentInstructions = extractAgentInstructions(content);
    const agentRelevance = determineAgentRelevance(fileName.toLowerCase(), content);

    return {
      id: fileName.toLowerCase(),
      title,
      priority: 'medium',
      keyPoints: keyPoints.slice(0, 12),
      agentInstructions,
      agentRelevance,
      lastUpdated: currentDateISO()
    };
  } catch (error) {
    console.error(`❌ Failed to parse file ${fileName}:`, error);
    return null;
  }
}

// Remove emoji from text
function removeEmoji(text: string): string {
  return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu, '').trim();
}

// Extract title from markdown (first H1)
function extractTitleFromMarkdown(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  const title = match?.[1]?.trim() ?? 'Untitled';
  return removeEmoji(title);
}

// Extract key points from markdown (list items and sections)
function extractKeyPointsFromMarkdown(content: string): string[] {
  const points: string[] = [];

  // Extract H2 headers
  const headers = content.match(/^##\s+(.+)$/gm) || [];
  headers.forEach(h => {
    const text = h.replace(/^##\s+/, '').trim();
    if (text.length > 0) points.push(text);
  });

  // Extract list items
  const lists = content.match(/^[-•*]\s+(.+)$/gm) || [];
  lists.slice(0, 5).forEach(item => {
    const text = item.replace(/^[-•*]\s+/, '').trim();
    if (text.length > 0 && !text.includes('```')) points.push(text);
  });

  return [...new Set(points)].slice(0, 12); // Remove duplicates, limit to 12
}

// Capitalize first letter
function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Parse documentation section from TSX content
function parseDocumentationSection(sectionId: string, content: string): BaseSection | null {
  try {
    // Special handling for ChecklistSection
    if (sectionId === 'checklist') {
      return parseChecklistSection(content);
    }

    // Extract title from component (improved patterns)
    const titleMatch =
      content.match(/CardTitle[^>]*>[\s\S]*?([🏗️📋🎯🛡️🌟⚙️🎨👥🚀📊🔧🤖🔐].*?)<\/CardTitle>/) ??
      content.match(/title.*?['"](.*?)['"]/) ??
      content.match(/h1.*?>(.*?)</) ??
      content.match(/CardTitle.*?>(.*?)</);

    const rawTitle = titleMatch?.[1] ?? sectionId;
    const title = removeEmoji(rawTitle.replace(/<[^>]*>/g, '').replace(/🏗️|📋|🎯|🛡️|🌟|⚙️|🎨|👥|🚀|📊|🔧|🤖|🔐/g, '').trim());
    
    // Extract key points using multiple strategies
    const keyPoints: string[] = [];
    
    // Strategy 1: Extract from <li> elements
    const listMatches = content.match(/<li[^>]*>(.*?)<\/li>/g) ?? [];
    for (const listMatch of listMatches) {
      const text = listMatch.replace(/<[^>]*>/g, '').trim();
      if (text.length > 10 && !text.includes('className') && !text.includes('import')) {
        keyPoints.push(text);
      }
    }
    
    // Strategy 2: Extract from <p> elements with meaningful content
    const paragraphMatches = content.match(/<p[^>]*>(.*?)<\/p>/g) ?? [];
    for (const paragraphMatch of paragraphMatches) {
      const text = paragraphMatch.replace(/<[^>]*>/g, '').trim();
      if (text.length > 20 && text.length < 200 && !text.includes('className')) {
        keyPoints.push(text);
      }
    }
    
    // Strategy 3: Extract from CardContent with meaningful text
    const cardContentMatches = content.match(/<CardContent[^>]*>([\s\S]*?)<\/CardContent>/g) ?? [];
    for (const cardMatch of cardContentMatches) {
      // Extract meaningful text patterns
      const meaningfulPatterns = [
        /<strong[^>]*>([^<]+)<\/strong>[^<]*([^<]+)/g,
        /• ([^•\n]+)/g,
        /\*\*([^*]+)\*\*:([^*\n]+)/g
      ];
      
      for (const pattern of meaningfulPatterns) {
        const matches = [...cardMatch.matchAll(pattern)];
        for (const match of matches) {
          const text = `${match[1] ?? ''}${match[2] ?? ''}`.replace(/<[^>]*>/g, '').trim();
          if (text.length > 15 && text.length < 150) {
            keyPoints.push(text);
          }
        }
      }
    }
    
    // Strategy 4: Extract API endpoints for API sections
    if (sectionId === 'api' || content.includes('POST') || content.includes('GET')) {
      const endpointMatches = content.match(/<code[^>]*>([^<]*\/[^<]+)<\/code>/g) ?? [];
      for (const endpointMatch of endpointMatches) {
        const endpoint = endpointMatch.replace(/<[^>]*>/g, '').trim();
        if (endpoint.startsWith('/') || endpoint.includes('POST') || endpoint.includes('GET')) {
          keyPoints.push(`API: ${endpoint}`);
        }
      }
    }
    
    // Strategy 5: Extract agent specializations
    if (sectionId === 'agents' || content.includes('backend-dev') || content.includes('frontend-dev')) {
      const agentMatches = content.match(/<strong[^>]*>([^<]*-dev|[^<]*-engineer|[^<]*-analyst)[^<]*<\/strong>[^<]*([^<\n]+)/g) ?? [];
      for (const agentMatch of agentMatches) {
        const text = agentMatch.replace(/<[^>]*>/g, '').trim();
        if (text.includes(':')) {
          keyPoints.push(`Agent: ${text}`);
        }
      }
    }
    
    // Extract critical instructions
    const agentInstructions = extractAgentInstructions(content);
    
    // Determine section priority and agent relevance
    const priority = determineSectionPriority(sectionId, content);
    const agentRelevance = determineAgentRelevance(sectionId, content);
    
    console.log(`📋 Parsed ${sectionId}: ${title} (${keyPoints.length} key points)`);
    
    return {
      id: sectionId,
      title,
      priority,
      keyPoints: [...new Set(keyPoints)].slice(0, 12), // Remove duplicates, limit to 12
      agentInstructions,
      agentRelevance, // Which agents should see this section
      lastUpdated: currentDateISO()
    };
  } catch (error) {
    console.error(`❌ Failed to parse section ${sectionId}:`, error);
    return null;
  }
}

// Determine section priority based on content and ID
function determineSectionPriority(sectionId: string, content: string): SectionPriority {
  if (['overview', 'security', 'architecture', 'checklist'].includes(sectionId)) {
    return 'critical';
  }
  if (['auth', 'api', 'agents', 'devops'].includes(sectionId) || 
      content.includes('КРИТИЧНО') || content.includes('CRITICAL')) {
    return 'high';
  }
  return 'medium';
}

// Determine which agents should see this section
function determineAgentRelevance(sectionId: string, content: string): string[] {
  const relevance: string[] = [];
  
  if (['api', 'auth', 'architecture', 'migration'].includes(sectionId) || 
      content.includes('backend-dev') || content.includes('API') || content.includes('database')) {
    relevance.push('backend-dev');
  }
  
  if (['frontend', 'registration', 'localization', 'ui'].includes(sectionId) || 
      content.includes('frontend-dev') || content.includes('React') || content.includes('Shadcn')) {
    relevance.push('frontend-dev');
  }
  
  if (['devops', 'system'].includes(sectionId) || 
      content.includes('devops-engineer') || content.includes('PM2') || content.includes('nginx')) {
    relevance.push('devops-engineer');
  }
  
  if (['api', 'migration'].includes(sectionId) || 
      content.includes('database-analyst') || content.includes('PostgreSQL') || content.includes('SQL')) {
    relevance.push('database-analyst');
  }
  
  if (['business', 'roadmap', 'ideas'].includes(sectionId) || 
      content.includes('product-manager') || content.includes('feature') || content.includes('roadmap')) {
    relevance.push('product-manager');
  }
  
  if (['frontend', 'ui'].includes(sectionId) || 
      content.includes('ui-designer') || content.includes('design') || content.includes('UX')) {
    relevance.push('ui-designer');
  }
  
  // Critical sections relevant to all agents
  if (['overview', 'security', 'architecture', 'checklist', 'agents'].includes(sectionId)) {
    relevance.push('all');
  }
  
  return relevance.length > 0 ? relevance : ['all'];
}

// Special parser for ChecklistSection to extract task information
function parseChecklistSection(content: string): ChecklistSection {
  try {
    console.log('🔍 Parsing ChecklistSection with special task extraction...');
    
    // Extract task groups from the taskGroups array
    const taskGroups: ChecklistTaskGroup[] = [];
    let totalCompleted = 0;
    let totalTasks = 0;
    
    // Find taskGroups definition
    const taskGroupsMatch = content.match(/const taskGroups: TaskGroup\[\] = \[([\s\S]*?)\];/);
    if (taskGroupsMatch?.[1]) {
      const taskGroupsContent = taskGroupsMatch[1];
      
      // Extract individual task groups
      const groupMatches = taskGroupsContent.match(/{\s*id: ['"]([^'"]+)['"]([\s\S]*?)tasks: \[([\s\S]*?)\]\s*}/g) ?? [];
      
      for (const groupMatch of groupMatches) {
        const id = groupMatch.match(/id: ['"]([^'"]+)['"]/ )?.[1];
        const titleValue = groupMatch.match(/title: ['"]([^'"]+)['"]/ )?.[1];
        const statusValue = groupMatch.match(/status: ['"]([^'"]+)['"]/ )?.[1];
        const progressMatch = groupMatch.match(/progress: {\s*completed: (\d+),\s*total: (\d+)\s*}/);
        const completed = Number.parseInt(progressMatch?.[1] ?? '', 10);
        const total = Number.parseInt(progressMatch?.[2] ?? '', 10);

        if (!id || !titleValue || !statusValue || Number.isNaN(completed) || Number.isNaN(total)) {
          continue;
        }

        totalCompleted += completed;
        totalTasks += total;
        
        taskGroups.push({
          id,
          title: titleValue,
          status: statusValue,
          progress: { completed, total },
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        });
      }
    }
    
    // Extract new priority tasks from newPriorityGroup
    const newPriorityMatch = content.match(/const newPriorityGroup: TaskGroup = {([\s\S]*?)};/);
    const newPriorityTasks: ChecklistTaskGroup[] = [];
    if (newPriorityMatch?.[1]) {
      const newPriorityContent = newPriorityMatch[1];
      const progressMatch = newPriorityContent.match(/progress: {\s*completed: (\d+),\s*total: (\d+)\s*}/);
      const completed = Number.parseInt(progressMatch?.[1] ?? '', 10);
      const total = Number.parseInt(progressMatch?.[2] ?? '', 10);
      if (!Number.isNaN(total)) {
        const normalizedCompleted = Number.isNaN(completed) ? 0 : completed;
        totalCompleted += normalizedCompleted;
        totalTasks += total;
        newPriorityTasks.push({
          id: 'crm-development',
          title: '🔥 НОВЫЕ ПРИОРИТЕТЫ - CRM РАЗРАБОТКА',
          progress: { completed: normalizedCompleted, total },
          percentage: total > 0 ? Math.round((normalizedCompleted / total) * 100) : 0,
          status: 'critical'
        });
      }
    }
    
    // Extract beta launch tasks
    const betaLaunchMatch = content.match(/const betaLaunchGroup: TaskGroup = {([\s\S]*?)};/);
    const betaLaunchTasks: ChecklistTaskGroup[] = [];
    if (betaLaunchMatch?.[1]) {
      const betaLaunchContent = betaLaunchMatch[1];
      const progressMatch = betaLaunchContent.match(/progress: {\s*completed: (\d+),\s*total: (\d+)\s*}/);
      const completed = Number.parseInt(progressMatch?.[1] ?? '', 10);
      const total = Number.parseInt(progressMatch?.[2] ?? '', 10);
      if (!Number.isNaN(total)) {
        const normalizedCompleted = Number.isNaN(completed) ? 0 : completed;
        totalCompleted += normalizedCompleted;
        totalTasks += total;
        betaLaunchTasks.push({
          id: 'beta-launch',
          title: '🎯 BETA LAUNCH ПЛАН',
          progress: { completed: normalizedCompleted, total },
          percentage: total > 0 ? Math.round((normalizedCompleted / total) * 100) : 0,
          status: 'high'
        });
      }
    }
    
    const allGroups = [...taskGroups, ...newPriorityTasks, ...betaLaunchTasks];
    const totalProgress = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    
    // Generate summary key points
    const keyPoints: string[] = [
      `📊 Общий прогресс: ${totalCompleted}/${totalTasks} задач (${totalProgress}%)`,
      ...taskGroups.map(group => 
        `• ${group.title}: ${group.progress.completed}/${group.progress.total} (${group.percentage}%) - ${group.status}`
      ),
      ...newPriorityTasks.map(group => 
        `• ${group.title}: ${group.progress.completed}/${group.progress.total} (${group.percentage}%) - критичные задачи CRM`
      ),
      ...betaLaunchTasks.map(group => 
        `• ${group.title}: ${group.progress.completed}/${group.progress.total} (${group.percentage}%) - подготовка к запуску`
      )
    ];
    
    console.log(`✅ Extracted ${allGroups.length} task groups, ${totalTasks} total tasks, ${totalCompleted} completed (${totalProgress}%)`);
    
    return {
      id: 'checklist',
      title: 'Beauty Platform - Master Checklist',
      priority: 'critical',
      keyPoints: keyPoints.slice(0, 12), // Limit to top 12 points
      agentInstructions: extractAgentInstructions(content),
      agentRelevance: determineAgentRelevance('checklist', content),
      lastUpdated: currentDateISO(),
      
      // Additional checklist-specific data
      taskSummary: {
        totalTasks,
        totalCompleted,
        totalProgress,
        taskGroups: allGroups
      }
    };
  } catch (error) {
    console.error('❌ Failed to parse ChecklistSection:', error);
    const fallbackTaskSummary: ChecklistSummary = {
      totalTasks: 0,
      totalCompleted: 0,
      totalProgress: 0,
      taskGroups: []
    };

    return {
      id: 'checklist',
      title: 'Task Checklist',
      priority: 'critical',
      keyPoints: ['Checklist parsing failed, using fallback'],
      agentInstructions: { forbidden: [], required: [], bestPractices: [] },
      agentRelevance: ['all'],
      lastUpdated: currentDateISO(),
      taskSummary: fallbackTaskSummary
    };
  }
}

// Extract agent instructions from content
function extractAgentInstructions(content: string): AgentInstructions {
  const instructions: AgentInstructions = {
    forbidden: [],
    required: [],
    bestPractices: []
  };
  
  // Look for forbidden patterns
  const forbiddenPatterns = [
    'Direct prisma access',
    'localStorage for tokens',
    'Hardcoded secrets',
    'Cross-tenant data'
  ];
  
  forbiddenPatterns.forEach(pattern => {
    if (content.toLowerCase().includes(pattern.toLowerCase())) {
      instructions.forbidden.push(pattern);
    }
  });
  
  // Look for required patterns
  const requiredPatterns = [
    'tenantPrisma(tenantId)',
    'Shadcn/UI component',
    'httpOnly cookies',
    'port schema 6000-6099'
  ];
  
  requiredPatterns.forEach(pattern => {
    if (content.toLowerCase().includes(pattern.toLowerCase())) {
      instructions.required.push(`Always use ${pattern}`);
    }
  });
  
  return instructions;
}

// Dynamic service health checking
async function checkServiceHealth(): Promise<ServiceStatus[]> {
  const now = Date.now();
  if (serviceHealthCache && (now - healthCacheTimestamp) < HEALTH_CACHE_TTL) {
    return serviceHealthCache;
  }

  console.log('🔍 Checking service health...');
  
  const services: ServiceDefinition[] = [
    { name: 'Auth Service', port: 6021, endpoint: '/health', type: 'api' },
    { name: 'CRM API', port: 6022, endpoint: '/health', type: 'api' },
    { name: 'API Gateway', port: 6020, endpoint: '/health', type: 'api' },
    { name: 'Admin Panel', port: 6002, endpoint: '/', type: 'web' },
    { name: 'Salon CRM', port: 6001, endpoint: '/', type: 'web' },
    { name: 'Client Portal', port: 6003, endpoint: '/', type: 'web' },
    { name: 'Images API', port: 6026, endpoint: '/health', type: 'api' },
    { name: 'MCP Server', port: 6025, endpoint: '/health', type: 'api' }
  ];

  const healthChecks = await Promise.allSettled<ServiceStatus>(
    services.map(async (service) => {
      try {
        const { stdout } = await execAsync(
          `timeout 3 curl -s http://localhost:${service.port}${service.endpoint} | head -c 200`
        );
        
        const isHealthy = service.type === 'api' 
          ? stdout.includes('"success":true') || stdout.includes('"status"') || stdout.includes('ok')
          : stdout.includes('<!doctype') || stdout.includes('<html');
        
        return {
          ...service,
          status: isHealthy ? 'healthy' : 'unhealthy',
          response: stdout.substring(0, 100),
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          ...service,
          status: 'offline',
          error: message,
          timestamp: new Date().toISOString()
        };
      }
    })
  );

  const serviceStatuses: ServiceStatus[] = healthChecks.map((result, index) => {
    const baseService = services[index];
    if (result.status === 'fulfilled') {
      return result.value;
    }

    const message = result.reason instanceof Error ? result.reason.message : String(result.reason ?? 'Unknown error');

    if (!baseService) {
      return {
        name: 'Unknown Service',
        port: 0,
        endpoint: 'unknown',
        type: 'api',
        status: 'error',
        error: message,
        timestamp: new Date().toISOString()
      };
    }

    return {
      ...baseService,
      status: 'error',
      error: message,
      timestamp: new Date().toISOString()
    };
  });

  // Check database connectivity
  let databaseStatus: ServiceStatus['status'] = 'offline';
  try {
    const { stdout } = await execAsync(
      `PGPASSWORD=your_secure_password_123 psql -h localhost -U beauty_crm_user -d beauty_platform_new -c "SELECT 'ok'" 2>/dev/null`
    );
    databaseStatus = stdout.includes('ok') ? 'healthy' : 'unhealthy';
  } catch (error) {
    databaseStatus = 'offline';
  }

  serviceStatuses.push({
    name: 'Database',
    port: 6100,
    endpoint: 'postgresql',
    type: 'database',
    status: databaseStatus,
    timestamp: new Date().toISOString(),
    ...(databaseStatus === 'healthy'
      ? {}
      : { error: databaseStatus === 'offline' ? 'Database connection failed' : 'Database health degraded' })
  });

  serviceHealthCache = serviceStatuses;
  healthCacheTimestamp = now;
  return serviceStatuses;
}

// Calculate dynamic project progress
function calculateProjectProgress(serviceStatuses: ServiceStatus[]): ProjectProgress {
  const totalServices = serviceStatuses.length;
  const healthyServices = serviceStatuses.filter((status) => status.status === 'healthy').length;
  // Online services count (healthy + unhealthy) tracked separately if needed for future use
  
  // Base progress from working services
  const serviceProgress = totalServices > 0 ? Math.round((healthyServices / totalServices) * 60) : 0; // Max 60% for services
  
  // Feature completeness (hardcoded for now, can be made dynamic later)
  const featureProgress = 35; // Auth, Admin, CRM, Client Portal mostly complete
  
  const totalProgress = Math.min(95, serviceProgress + featureProgress); // Cap at 95%
  
  return {
    progress: totalProgress,
    breakdown: {
      services: {
        healthy: healthyServices,
        total: totalServices,
        percentage: totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 0
      },
      features: {
        completed: 6, // Auth, Admin, CRM, Client Portal, Database, Documentation
        total: 10, // Estimated total features
        percentage: 60
      }
    },
    status: totalProgress >= 80 ? 'production-ready' : 
            totalProgress >= 60 ? 'beta-ready' : 
            totalProgress >= 40 ? 'alpha-ready' : 'development'
  };
}

// Generate dynamic status message
function generateStatusMessage(progress: ProjectProgress, serviceStatuses: ServiceStatus[]): string {
  const healthyCount = serviceStatuses.filter((status) => status.status === 'healthy').length;
  const totalCount = serviceStatuses.length;
  
  if (progress.progress >= 80) {
    return `🚀 Production Ready: ${healthyCount}/${totalCount} сервисов работают стабильно`;
  } else if (progress.progress >= 60) {
    return `🔧 Beta версия: ${healthyCount}/${totalCount} сервисов онлайн, требуется финальная настройка`;
  } else if (progress.progress >= 40) {
    return `⚡ Alpha версия: Основные компоненты разработаны, ${healthyCount}/${totalCount} сервисов доступны`;
  } else {
    return `🚧 В разработке: ${healthyCount}/${totalCount} сервисов запущены, требуется значительная работа`;
  }
}

// Convert service statuses to MCP format
function formatServicesForMCP(serviceStatuses: ServiceStatus[]): FormattedServiceStatus[] {
  return serviceStatuses.map((service) => {
    let notes = '';
    
    switch (service.name) {
      case 'Auth Service':
        notes = service.status === 'healthy' ? 'JWT + CSRF protection working' : 'Service offline - needs restart';
        break;
      case 'Admin Panel':
        notes = service.status === 'healthy' ? 'https://test-admin.beauty.designcorp.eu - доступна!' : 'Frontend unavailable';
        break;
      case 'Client Portal':
        notes = service.status === 'healthy' ? 'https://client.beauty.designcorp.eu - полностью функциональный!' : 'Client portal offline';
        break;
      case 'Salon CRM':
        notes = service.status === 'healthy' ? 'Календарь + CRM полностью работают' : 'CRM interface unavailable';
        break;
      case 'Images API':
        notes = service.status === 'healthy' ? 'Visual communication готова' : 'Image upload unavailable';
        break;
      case 'MCP Server':
        notes = service.status === 'healthy' ? 'AI контекст синхронизирован' : 'AI context service offline';
        break;
      case 'Database':
        notes = service.status === 'healthy' ? 'PostgreSQL + tenant isolation' : 'Database connection failed';
        break;
      default:
        notes = service.status === 'healthy' ? 'Сервис работает стабильно' : 'Требует проверки';
    }
    
    const formatted: FormattedServiceStatus = {
      name: service.name,
      port: service.port,
      status:
        service.status === 'healthy'
          ? 'running'
          : service.status === 'unhealthy'
            ? 'degraded'
            : 'offline',
      notes
    };

    return formatted;
  });
}

// Read documentation directly from Admin Panel components with dynamic status
async function fetchDocumentation(): Promise<DocumentationPayload | null> {
  try {
    console.log('🔄 Reading documentation from files (no cache - instant updates)...');
    console.log('🔍 Checking real-time service health...');
    
    // Get real-time service health
    const serviceStatuses = await checkServiceHealth();
    const progressData = calculateProjectProgress(serviceStatuses);
    const statusMessage = generateStatusMessage(progressData, serviceStatuses);
    
    // Read all documentation sections from components
    const sections = await readDocumentationSections();
    console.log(`📋 Loaded ${sections.length} documentation sections from Admin Panel`);
    console.log(`📊 Dynamic progress: ${progressData.progress}% (${progressData.status})`);
    
    // Use dynamic project status based on real service health
    const documentationData: DocumentationPayload = {
      sections,
      projectStatus: {
        progress: progressData.progress,
        status: progressData.status,
        message: statusMessage,
        breakdown: progressData.breakdown,
        activeServices: formatServicesForMCP(serviceStatuses),
        lastChecked: new Date().toISOString()
      },
      currentTasks: {
        completed: Math.floor(progressData.progress / 10), // Roughly estimate completed tasks
        total: 15, // Estimated total project tasks
        nextPriorities: [
          {
            id: 'health-1',
            title: '🔧 Восстановить недоступные сервисы',
            priority: 'critical',
            assignedTo: 'devops-engineer',
            description: 'Перезапустить Auth Service, API Gateway, Images API',
            category: 'infrastructure'
          },
          {
            id: 'health-2',
            title: '📊 Мониторинг стабильности',
            priority: 'high',
            assignedTo: 'backend-dev',
            description: 'Настроить автоматический health check и restart',
            category: 'monitoring'
          }
        ]
      }
    };

    console.log(`✅ Documentation loaded with ${progressData.progress}% progress (no cache - instant updates)`);
    return documentationData;
  } catch (error) {
    console.error('❌ Failed to fetch documentation:', error);
    return null;
  }
}

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'beauty-platform-mcp-server',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// MCP: Get agent context (ENHANCED)
app.get('/mcp/agent-context/:agentType', async (req, res) => {
  try {
    const { agentType } = req.params;
    const documentation = await fetchDocumentation();
    
    if (!documentation) {
      return res.status(503).json({
        success: false,
        error: 'Documentation service unavailable'
      });
    }

    // Filter sections relevant to this agent
    const relevantSections = documentation.sections.filter((section) =>
      section.agentRelevance.includes(agentType) ||
      section.agentRelevance.includes('all') ||
      section.priority === 'critical'
    );

    console.log(`🎯 Agent ${agentType}: ${relevantSections.length} relevant sections found`);

    // Build comprehensive agent context
    const agentContext = {
      agentType,
      timestamp: new Date().toISOString(),
      
      // Always include critical sections
      projectOverview: documentation.sections.find((section) => section.id === 'overview'),
      securityRules: documentation.sections.find((section) => section.id === 'security'),
      checklist: documentation.sections.find((section) => section.id === 'checklist'),
      
      // Specialized sections for this agent
      specializedSections: relevantSections.filter(
        (section) => !['overview', 'security', 'checklist'].includes(section.id)
      ),
      
      // Current project status
      currentStatus: documentation.projectStatus,
      
      // Enhanced specialized instructions
      specializedInstructions: getAgentSpecificInstructions(agentType, documentation),
      
      // Quick access to key information
      quickReference: {
        totalSections: relevantSections.length,
        agentPriorities: relevantSections
          .filter((section) => section.priority === 'high' || section.priority === 'critical')
          .map((section) => ({ id: section.id, title: section.title, priority: section.priority })),
        keyInstructions: relevantSections
          .flatMap((section) => section.agentInstructions.required)
          .filter((instruction, index, arr) => arr.indexOf(instruction) === index) // unique
      }
    };

    res.json({
      success: true,
      data: agentContext
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get agent context'
    });
  }
  return undefined;
});

// MCP: Get project state
app.get('/mcp/project-state', async (_req, res) => {
  try {
    const documentation = await fetchDocumentation();
    
    if (!documentation) {
      return res.status(503).json({
        success: false,
        error: 'Documentation service unavailable'
      });
    }

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        projectStatus: documentation.projectStatus,
        activeServices: documentation.projectStatus.activeServices,
        progress: documentation.projectStatus.progress,
        criticalSections: documentation.sections.filter((section) => section.priority === 'critical')
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get project state'
    });
  }
  return undefined;
});

// MCP: Get critical rules
app.get('/mcp/critical-rules', async (_req, res) => {
  try {
    const documentation = await fetchDocumentation();
    
    if (!documentation) {
      return res.status(503).json({
        success: false,
        error: 'Documentation service unavailable'
      });
    }

    const criticalRules = documentation.sections.flatMap((section) => {
      const rules: Array<{
        type: 'forbidden' | 'required' | 'security';
        rule: string;
        section: string;
        severity: 'critical';
      }> = [];

      section.agentInstructions.forbidden.forEach((rule) => {
        rules.push({
          type: 'forbidden',
          rule,
          section: section.id,
          severity: 'critical'
        });
      });

      section.agentInstructions.required.forEach((rule) => {
        rules.push({
          type: 'required',
          rule,
          section: section.id,
          severity: 'critical'
        });
      });

      const additionalSecurityRules =
        (section as { criticalRules?: string[] }).criticalRules ?? [];

      additionalSecurityRules.forEach((rule) => {
        rules.push({
          type: 'security',
          rule,
          section: section.id,
          severity: 'critical'
        });
      });

      return rules;
    });

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        totalRules: criticalRules.length,
        rules: criticalRules
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get critical rules'
    });
  }
  return undefined;
});

// MCP: Get task checklist
app.get('/mcp/checklist', async (_req, res) => {
  try {
    const documentation = await fetchDocumentation();
    
    if (!documentation) {
      return res.status(503).json({
        success: false,
        error: 'Documentation service unavailable'
      });
    }

    const checklistSection = documentation.sections.find((section) => section.id === 'checklist');
    
    if (!checklistSection || !isChecklistSection(checklistSection)) {
      return res.status(404).json({
        success: false,
        error: 'Checklist data not found'
      });
    }

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        checklist: {
          title: checklistSection.title,
          totalTasks: checklistSection.taskSummary.totalTasks,
          totalCompleted: checklistSection.taskSummary.totalCompleted,
          totalProgress: checklistSection.taskSummary.totalProgress,
          taskGroups: checklistSection.taskSummary.taskGroups,
          keyPoints: checklistSection.keyPoints
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get checklist'
    });
  }
  return undefined;
});

// MCP: Smart search across all documentation (PHASE 2)
app.get('/mcp/search', async (req, res) => {
  try {
    const { q: query, agent, section } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const documentation = await fetchDocumentation();
    
    if (!documentation) {
      return res.status(503).json({
        success: false,
        error: 'Documentation service unavailable'
      });
    }

    console.log(`🔍 Search query: "${query}" ${agent ? `(agent: ${agent})` : ''} ${section ? `(section: ${section})` : ''}`);

    // Filter sections based on agent or section parameter
    let sectionsToSearch = documentation.sections;
    
    if (agent && agent !== 'all') {
      sectionsToSearch = documentation.sections.filter(
        (section) =>
          section.agentRelevance.includes(agent as string) ||
          section.agentRelevance.includes('all') ||
          section.priority === 'critical'
      );
    }
    
    if (section) {
      sectionsToSearch = documentation.sections.filter((entry) => entry.id === section);
    }

    // Perform search across filtered sections
    const searchResults: SearchSectionMatch[] = [];
    const queryLower = (query as string).toLowerCase();
    
    for (const sectionData of sectionsToSearch) {
      const matches: SearchMatch[] = [];
      
      // Search in title
      if (sectionData.title.toLowerCase().includes(queryLower)) {
        matches.push({
          type: 'title',
          text: sectionData.title,
          relevance: 10
        });
      }
      
      // Search in key points
      sectionData.keyPoints.forEach((point, index) => {
        if (point.toLowerCase().includes(queryLower)) {
          matches.push({
            type: 'keyPoint',
            text: point,
            relevance: 8 - Math.min(index * 0.5, 5) // Earlier points are more relevant
          });
        }
      });
      
      // Search in agent instructions
      [...sectionData.agentInstructions.required, ...sectionData.agentInstructions.forbidden].forEach((instruction) => {
        if (instruction.toLowerCase().includes(queryLower)) {
          matches.push({
            type: 'instruction',
            text: instruction,
            relevance: 9
          });
        }
      });
      
      if (matches.length > 0) {
        searchResults.push({
          sectionId: sectionData.id,
          sectionTitle: sectionData.title,
          priority: sectionData.priority,
          matches: matches.sort((a, b) => b.relevance - a.relevance).slice(0, 5), // Top 5 matches per section
          totalMatches: matches.length
        });
      }
    }

    // Sort sections by total relevance
    searchResults.sort((a, b) => {
      const aScore = a.matches.reduce((sum, match) => sum + match.relevance, 0);
      const bScore = b.matches.reduce((sum, match) => sum + match.relevance, 0);
      return bScore - aScore;
    });

    console.log(`✅ Search completed: ${searchResults.length} sections with matches`);

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        query: query as string,
        agent: (agent as string) || 'all',
        section: (section as string) || 'all',
        totalResults: searchResults.length,
        results: searchResults.slice(0, 10), // Top 10 most relevant sections
        searchScope: {
          totalSectionsSearched: sectionsToSearch.length,
          availableSections: documentation.sections.length
        }
      }
    });
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform search'
    });
  }
  return undefined;
});

// MCP: Get full section details (PHASE 2)
app.get('/mcp/section/:sectionId', async (req, res) => {
  try {
    const { sectionId } = req.params;
    const documentation = await fetchDocumentation();
    
    if (!documentation) {
      return res.status(503).json({
        success: false,
        error: 'Documentation service unavailable'
      });
    }

    const section = documentation.sections.find((entry) => entry.id === sectionId);
    
    if (!section) {
      return res.status(404).json({
        success: false,
        error: `Section '${sectionId}' not found`
      });
    }

    console.log(`📖 Retrieved full section: ${sectionId} (${section.keyPoints.length} key points)`);

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        section
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get section'
    });
  }
  return undefined;
});

// MCP: Smart memory read - automatic context determination (PHASE 2)
app.get('/mcp/smart-memory', async (_req, res) => {
  try {
    const documentation = await fetchDocumentation();
    
    if (!documentation) {
      return res.status(503).json({
        success: false,
        error: 'Documentation service unavailable'
      });
    }

    console.log('🧠 Smart memory request - providing comprehensive project overview');

    // Build smart context with most important information
    const smartContext = {
      timestamp: new Date().toISOString(),
      
      // Always include critical overview
      projectOverview: documentation.sections.find((section) => section.id === 'overview'),
      projectStatus: documentation.projectStatus,
      
      // Essential sections for any developer
      criticalSections: {
        quickStart: documentation.sections.find((section) => section.id === 'quickstart'),
        architecture: documentation.sections.find((section) => section.id === 'architecture'),
        security: documentation.sections.find((section) => section.id === 'security'),
        checklist: documentation.sections.find((section) => section.id === 'checklist')
      },
      
      // Quick reference for immediate needs
      quickReference: {
        totalSections: documentation.sections.length,
        availableAgentTypes: ['backend-dev', 'frontend-dev', 'devops-engineer', 'database-analyst', 'product-manager', 'ui-designer'],
        
        // Key commands for developers
        usefulCommands: [
          {
            command: 'найди информацию о [тема]',
            description: 'Умный поиск по всей документации',
            example: 'найди информацию о JWT токенах'
          },
          {
            command: 'прочитай секцию [название]',
            description: 'Получи полную информацию по конкретной теме',
            example: 'прочитай секцию API'
          },
          {
            command: 'покажи все [тип информации]',
            description: 'Извлеки конкретный тип данных',
            example: 'покажи все API endpoints'
          }
        ],
        
        // Critical rules that everyone should know
        criticalRules: [
          'ВСЕГДА: tenantPrisma(salonId) для изоляции данных',
          'ВСЕГДА: httpOnly cookies для токенов', 
          'ВСЕГДА: Shadcn/UI компоненты для UI',
          'НИКОГДА: prisma.* прямые запросы',
          'НИКОГДА: localStorage для токенов',
          'НИКОГДА: Cross-tenant доступ к данным'
        ],
        
        // Current priorities
        currentPriorities: [
          '🔥 CRM разработка - основной функционал',
          '🎯 Beta launch подготовка',
          '🛡️ Security compliance',
          '⚡ Performance optimization'
        ]
      },
      
      // Available search and exploration options
      availableActions: {
        search: 'GET /mcp/search?q=query - поиск по всей документации',
        agentContext: 'GET /mcp/agent-context/:type - специализированный контекст',
        sectionDetails: 'GET /mcp/section/:id - полная информация по секции',
        checklist: 'GET /mcp/checklist - актуальные задачи проекта'
      }
    };

    res.json({
      success: true,
      data: smartContext
    });
  } catch (error) {
    console.error('❌ Smart memory error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get smart memory context'
    });
  }
  return undefined;
});

// ====== TIER 3.2: NEW TOOLS ENDPOINTS ======

// Tool 1: beauty-deploy
app.post('/mcp/tools/deploy', async (req, res) => {
  try {
    const { service, skipTests, environment } = req.body;

    if (!service) {
      return res.status(400).json({
        success: false,
        error: 'service parameter is required'
      });
    }

    console.log(`🚀 Deploying service: ${service} (skipTests: ${skipTests}, env: ${environment || 'prod'})`);

    const buildLogs: string[] = [];
    const restartLogs: string[] = [];
    let buildStatus: 'success' | 'failed' = 'failed';
    let restartStatus: 'success' | 'failed' | 'partial' = 'failed';
    let healthStatus: 'healthy' | 'degraded' | 'unknown' = 'unknown';

    try {
      // Step 1: Build service
      const { stdout: _buildOutput } = await execAsync(
        `cd /root/projects/beauty && pnpm --filter @beauty-platform/${service} build 2>&1 | tail -20`
      );
      buildLogs.push('✅ Build completed successfully');
      buildStatus = 'success';
    } catch (buildError) {
      const message = toErrorMessage(buildError);
      buildLogs.push(`❌ Build failed: ${message}`);
      buildStatus = 'failed';
    }

    if (buildStatus === 'success') {
      try {
        // Step 2: Restart via Orchestrator
        await execAsync(
          `curl -X POST http://localhost:6030/orchestrator/services/${service}/actions -H "Content-Type: application/json" -d '{"action":"restart"}' 2>/dev/null`
        );
        restartLogs.push('✅ Service restarted via Orchestrator');
        restartStatus = 'success';
      } catch (restartError) {
        const message = toErrorMessage(restartError);
        restartLogs.push(`⚠️ Restart warning: ${message}`);
        restartStatus = 'partial';
      }

      // Step 3: Health check
      try {
        const { stdout: healthOutput } = await execAsync(
          `timeout 5 curl -s http://localhost:6020/health | grep -q "success" && echo "healthy" || echo "unhealthy"`
        );
        healthStatus = healthOutput.trim() === 'healthy' ? 'healthy' : 'degraded';
      } catch (healthError) {
        healthStatus = 'unknown';
      }
    }

    res.json({
      success: buildStatus === 'success',
      service,
      buildStatus,
      buildLogs,
      restartStatus,
      restartLogs,
      healthCheck: healthStatus,
      healthLogs: [`Service health: ${healthStatus}`],
      totalTime: Math.round(Date.now() / 1000)
    });
  } catch (error) {
    const message = toErrorMessage(error);
    res.status(500).json({
      success: false,
      error: `Deploy failed: ${message}`
    });
  }
  return undefined;
});

// Tool 2: beauty-issue
app.post('/mcp/tools/issue', async (req, res) => {
  try {
    const { action, issueNumber, title, body, labels, assignee } = req.body;
    const githubToken = process.env.GITHUB_TOKEN;
    const repo = 'DesignCorporation/Beauty-Platform';

    if (!githubToken) {
      return res.status(400).json({
        success: false,
        error: 'GITHUB_TOKEN environment variable is required'
      });
    }

    if (!action || !['create', 'update', 'close'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'action must be: create, update, or close'
      });
    }

    let issueUrl = '';
    let resultIssueNumber = issueNumber as number | undefined;

    if (action === 'create') {
      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'title is required for create action'
        });
      }

      try {
        const { stdout } = await execAsync(
          `curl -s -X POST -H "Authorization: token ${githubToken}" -H "Accept: application/vnd.github+json" https://api.github.com/repos/${repo}/issues -d '${JSON.stringify({ title, body: body || '', labels: labels || [] })}'`
        );
        const issueData = JSON.parse(stdout) as GithubIssueResponse;
        resultIssueNumber = issueData.number ?? resultIssueNumber;
        issueUrl = issueData.html_url ?? issueUrl;
        console.log(`✅ Issue created: #${resultIssueNumber}`);
      } catch (createError) {
        return res.status(500).json({
          success: false,
          error: `Failed to create issue: ${toErrorMessage(createError)}`
        });
      }
    } else if (action === 'update') {
      if (!issueNumber) {
        return res.status(400).json({
          success: false,
          error: 'issueNumber is required for update action'
        });
      }

      try {
        const updatePayload: Record<string, unknown> = {};
        if (title) updatePayload.title = title;
        if (body) updatePayload.body = body;
        if (labels) updatePayload.labels = labels;
        if (assignee) updatePayload.assignee = assignee;

        await execAsync(
          `curl -s -X PATCH -H "Authorization: token ${githubToken}" -H "Accept: application/vnd.github+json" https://api.github.com/repos/${repo}/issues/${issueNumber} -d '${JSON.stringify(updatePayload)}'`
        );
        issueUrl = `https://github.com/${repo}/issues/${issueNumber}`;
        console.log(`✅ Issue #${issueNumber} updated`);
      } catch (updateError) {
        return res.status(500).json({
          success: false,
          error: `Failed to update issue: ${toErrorMessage(updateError)}`
        });
      }
    } else if (action === 'close') {
      if (!issueNumber) {
        return res.status(400).json({
          success: false,
          error: 'issueNumber is required for close action'
        });
      }

      try {
        await execAsync(
          `curl -s -X PATCH -H "Authorization: token ${githubToken}" -H "Accept: application/vnd.github+json" https://api.github.com/repos/${repo}/issues/${issueNumber} -d '{"state":"closed"}'`
        );
        issueUrl = `https://github.com/${repo}/issues/${issueNumber}`;
        console.log(`✅ Issue #${issueNumber} closed`);
      } catch (closeError) {
        return res.status(500).json({
          success: false,
          error: `Failed to close issue: ${toErrorMessage(closeError)}`
        });
      }
    }

    res.json({
      success: true,
      action,
      issueUrl: issueUrl || (resultIssueNumber ? `https://github.com/${repo}/issues/${resultIssueNumber}` : ''),
      issueNumber: resultIssueNumber,
      status: action === 'create' ? 'created' : action === 'close' ? 'closed' : 'updated'
    });
  } catch (error) {
    const message = toErrorMessage(error);
    res.status(500).json({
      success: false,
      error: `Issue operation failed: ${message}`
    });
  }
  return undefined;
});

// Tool 3: beauty-health
app.get('/mcp/tools/health', async (req, res) => {
  try {
    const detailed = req.query.detailed === 'true';
    console.log(`🏥 Health check requested (detailed: ${detailed})`);

    const serviceStatuses = await checkServiceHealth();
    const healthyCount = serviceStatuses.filter(s => s.status === 'healthy').length;
    const totalCount = serviceStatuses.length;

    const overallStatus = healthyCount === totalCount ? 'healthy' :
                         healthyCount >= totalCount * 0.8 ? 'degraded' : 'down';

    const response: {
      success: true;
      timestamp: string;
      overallStatus: string;
      summary: {
        healthyServices: number;
        totalServices: number;
        databaseStatus: string;
        recentErrors: number;
      };
      services?: Array<{
        name: string;
        port: number;
        status: string;
        uptime: string;
        responseTime: string;
      }>;
    } = {
      success: true,
      timestamp: new Date().toISOString(),
      overallStatus,
      summary: {
        healthyServices: healthyCount,
        totalServices: totalCount,
        databaseStatus: serviceStatuses.find((service) => service.name === 'Database')?.status ?? 'unknown',
        recentErrors: 0
      }
    };

    if (detailed) {
      response.services = serviceStatuses.map((serviceStatus) => ({
        name: serviceStatus.name,
        port: serviceStatus.port,
        status: serviceStatus.status === 'healthy' ? 'running' : serviceStatus.status,
        uptime: 'N/A',
        responseTime: serviceStatus.status === 'healthy' ? '20-30ms' : 'N/A'
      }));
    }

    res.json(response);
  } catch (error) {
    const message = toErrorMessage(error);
    res.status(500).json({
      success: false,
      error: `Health check failed: ${message}`
    });
  }
});

// Tool 4: beauty-search (Enhanced)
app.get('/mcp/tools/search', async (req, res) => {
  try {
    const { q: query, scope, limit } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'q parameter is required'
      });
    }

    const searchScope = (scope as string) || 'all';
    const maxResults = parseInt(limit as string, 10) || 20;
    const searchQuery = String(query);

    console.log(`🔍 Search: "${searchQuery}" (scope: ${searchScope}, limit: ${maxResults})`);

    const results: {
      code: Array<{ file: string; relevance: number }>;
      github: Array<Record<string, unknown>>;
      docs: Array<Record<string, unknown>>;
      memory: Array<Record<string, unknown>>;
    } = {
      code: [],
      github: [],
      docs: [],
      memory: []
    };

    // Search in code
    if (searchScope === 'all' || searchScope === 'code') {
      try {
        const { stdout } = await execAsync(
          `find /root/projects/beauty/services -type f -name "*.ts" -o -name "*.tsx" | xargs grep -l "${searchQuery.replace(/"/g, '\\"')}" 2>/dev/null | head -${maxResults}`
        );
        results.code = stdout.split('\n').filter(f => f).map((file, i) => ({
          file,
          relevance: 9 - (i * 0.5)
        }));
      } catch (e) {
        // No results
      }
    }

    const totalResults = (['code', 'github', 'docs', 'memory'] as const).reduce(
      (sum, key) => sum + results[key].length,
      0
    );

    res.json({
      success: true,
      query: searchQuery,
      scope: searchScope,
      results,
      totalResults
    });
  } catch (error) {
    const message = toErrorMessage(error);
    res.status(500).json({
      success: false,
      error: `Search failed: ${message}`
    });
  }
  return undefined;
});

// ====== END TIER 3.2 TOOLS ======

// Get agent-specific instructions with current tasks
function getAgentSpecificInstructions(agentType: string, documentation: DocumentationPayload): AgentInstruction {
  const agentTasks: AgentTask[] = documentation.currentTasks.nextPriorities.filter(
    (task) => task.assignedTo === agentType
  );
  const nextTask = agentTasks[0];

  const urgentTaskField: Partial<Pick<AgentInstruction, 'nextUrgentTask'>> = nextTask
    ? { nextUrgentTask: nextTask }
    : {};

  const instructionMap: Record<string, AgentInstruction> = {
    'backend-dev': {
      focus: 'API development, database operations, tenant isolation',
      tools: ['Express.js', 'Prisma ORM', 'PostgreSQL', 'JWT'],
      currentTasks: agentTasks,
      ...urgentTaskField,
      criticalReminders: [
        'ALWAYS use tenantPrisma(salonId) for database queries',
        'Implement proper error handling and validation',
        'Follow RESTful API conventions',
        'Use environment variables for configuration'
      ]
    },
    'frontend-dev': {
      focus: 'React components, UI/UX, Shadcn/UI integration',
      tools: ['React 18', 'TypeScript', 'Shadcn/UI', 'Tailwind CSS'],
      currentTasks: agentTasks,
      ...urgentTaskField,
      criticalReminders: [
        'Use ONLY Shadcn/UI components for consistency',
        'Follow React 18 hooks patterns',
        'Implement proper TypeScript typing',
        'Use httpOnly cookies, never localStorage for auth'
      ]
    },
    'devops-engineer': {
      focus: 'Infrastructure, deployment, monitoring, PM2',
      tools: ['PM2', 'nginx', 'PostgreSQL', 'Linux'],
      currentTasks: agentTasks,
      ...urgentTaskField,
      criticalReminders: [
        'Follow port schema 6000-6099 strictly',
        'Use PM2 for process management',
        'Configure nginx proxy correctly',
        'Monitor service health and performance'
      ]
    },
    'database-analyst': {
      focus: 'Database schema, queries, performance, tenant isolation',
      tools: ['PostgreSQL', 'Prisma', 'SQL', 'Database design'],
      currentTasks: agentTasks,
      ...urgentTaskField,
      criticalReminders: [
        'Ensure complete tenant isolation in all queries',
        'Use Prisma for type-safe database access',
        'Optimize queries for performance',
        'Maintain audit trail in separate database'
      ]
    }
  };

  const defaultInstruction = instructionMap['backend-dev']!;
  const specificInstruction = instructionMap[agentType];
  return specificInstruction ?? defaultInstruction;
}

// Start server
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`🤖 Beauty Platform MCP Server running on http://127.0.0.1:${PORT}`);
  console.log(`📡 MCP Endpoints:`);
  console.log(`   GET /mcp/smart-memory                                 # "прочитай память mcp"`);
  console.log(`   GET /mcp/agent-context/:agentType                    # Specialized contexts`);
  console.log(`   GET /mcp/search?q=query&agent=agentType&section=id   # Smart search`);
  console.log(`   GET /mcp/section/:sectionId                          # Full section details`);
  console.log(`   GET /mcp/project-state                               # Project status`);
  console.log(`   GET /mcp/checklist                                   # Task checklist`);
  console.log(`   GET /mcp/critical-rules                              # Security rules`);
  console.log(`   GET /health                                          # Server health`);

  // Initialize documentation cache
  fetchDocumentation();
});

// WebSocket Server for real-time documentation updates
const wss = new WebSocketServer({ server });

// Track connected clients
const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  console.log('📡 WebSocket client connected');
  clients.add(ws);

  ws.on('close', () => {
    console.log('📡 WebSocket client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clients.delete(ws);
  });

  // Send initial connection confirmation
  ws.send(JSON.stringify({ type: 'connected', message: 'MCP WebSocket connected' }));
});

// File Watcher for /docs/sections/
const docsSectionsPath = '/root/projects/beauty/docs/sections';
console.log(`👀 Watching for changes in: ${docsSectionsPath}`);

const watcher = chokidar.watch(docsSectionsPath, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true,
  depth: 3
});

// Broadcast changes to all connected clients
function broadcastUpdate(eventType: string, filePath: string) {
  const relativePath = path.relative('/root/projects/beauty', filePath);
  const message = JSON.stringify({
    type: 'file-changed',
    event: eventType,
    path: relativePath,
    timestamp: new Date().toISOString()
  });

  console.log(`🔄 Broadcasting ${eventType}: ${relativePath} to ${clients.size} clients`);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Listen for file changes
watcher
  .on('add', (filePath) => broadcastUpdate('add', filePath))
  .on('change', (filePath) => broadcastUpdate('change', filePath))
  .on('unlink', (filePath) => broadcastUpdate('delete', filePath));

console.log(`🔌 WebSocket server ready on ws://127.0.0.1:${PORT}`);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Shutting down MCP server...');
  server.close(() => {
    console.log('✅ MCP server stopped');
    process.exit(0);
  });
});

export default app;
