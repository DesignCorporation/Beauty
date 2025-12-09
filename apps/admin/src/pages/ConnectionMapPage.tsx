import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@beauty-platform/ui';
import { CheckCircle, Loader2, RefreshCcw, Server, XCircle } from 'lucide-react';
import { sdkClient } from '@/services/sdkClient';
import MermaidDiagram from '@/components/MermaidDiagram';

type ConnectionRoute = {
  gatewayPath: string;
  targetService: string;
  targetPath?: string;
  methods?: string[];
  serviceKey?: string;
  ws?: boolean;
  public?: boolean;
  description?: string;
};

type ConnectionService = {
  id: string;
  type: string;
  name?: string;
  url?: string;
  routes?: ConnectionRoute[];
  websocket?: {
    path: string;
    targetService: string;
    description?: string;
  };
};

type ConnectionMapResponse = {
  version: string;
  generatedAt?: string;
  services: Record<string, ConnectionService>;
};

type HealthResult = {
  id: string;
  label: string;
  status: 'pending' | 'ok' | 'fail';
  details?: string;
};

const TESTS: Array<{
  id: string;
  label: string;
  run: () => Promise<string>;
}> = [
  {
    id: 'gateway-health',
    label: 'Gateway /health',
    run: async () => {
      // Using /api/health alias to ensure prefix compatibility
      const res = await sdkClient.request<{ status?: string }>('/health', { method: 'GET', retry: 0, skipCsrf: true });
      return res?.status || 'ok';
    }
  },
  {
    id: 'csrf',
    label: 'CSRF token',
    run: async () => {
      const res = await sdkClient.request<{ csrfToken?: string; token?: string }>('/csrf-token', {
        method: 'GET',
        retry: 0,
        skipCsrf: true
      });
      return (res?.csrfToken || res?.token) ? 'ok' : 'missing token';
    }
  },
  {
    id: 'connection-map',
    label: 'Connection map endpoint',
    run: async () => {
      const res = await sdkClient.request<{ success?: boolean }>('/system/connection-map', { method: 'GET', retry: 0, skipCsrf: true });
      return res?.success === false ? 'error' : 'ok';
    }
  },
  {
    id: 'metrics',
    label: 'System metrics',
    run: async () => {
      const res = await sdkClient.request<{ services?: unknown[] }>('/system/metrics', { method: 'GET', retry: 0, skipCsrf: true });
      return Array.isArray(res?.services) ? 'ok' : 'no services';
    }
  }
];

function generateMermaidGraph(map: ConnectionMapResponse): string {
  if (!map || !map.services) return '';

  const gateway = map.services['api-gateway'];
  const backends = Object.values(map.services).filter(s => s.type === 'backend');
  const others = Object.values(map.services).filter(s => s.type !== 'gateway' && s.type !== 'backend');

  let graph = 'graph LR\n';
  
  // Styles
  graph += '  classDef gateway fill:#f9f,stroke:#333,stroke-width:2px;\n';
  graph += '  classDef backend fill:#bbf,stroke:#333,stroke-width:2px;\n';
  graph += '  classDef other fill:#ddd,stroke:#333,stroke-width:2px;\n';

  // Nodes
  if (gateway) {
    graph += `  ${gateway.id}[API Gateway]:::gateway\n`;
  }

  backends.forEach(s => {
    graph += `  ${s.id}[${s.id}]:::backend\n`;
  });

  others.forEach(s => {
    graph += `  ${s.id}[${s.id}]:::other\n`;
  });

  // Edges
  if (gateway && gateway.routes) {
    gateway.routes.forEach(route => {
      // Sanitize label for Mermaid
      const label = route.gatewayPath.replace(/\/api\//, '/');
      graph += `  ${gateway.id} -- "${label}" --> ${route.targetService}\n`;
    });
  }

  if (gateway && gateway.websocket) {
    graph += `  ${gateway.id} -. "WS: ${gateway.websocket.path}" .-> ${gateway.websocket.targetService}\n`;
  }

  return graph;
}

export default function ConnectionMapPage() {
  const [map, setMap] = useState<ConnectionMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<string, HealthResult>>(
    () =>
      TESTS.reduce<Record<string, HealthResult>>((acc, test) => {
        acc[test.id] = { id: test.id, label: test.label, status: 'pending' };
        return acc;
      }, {})
  );
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await sdkClient.request<{ data: ConnectionMapResponse }>('/system/connection-map', {
          method: 'GET',
          retry: 0,
          skipCsrf: true
        });
        // Handle both wrapped data and direct response structure if necessary
        setMap(res?.data || (res as unknown as ConnectionMapResponse));
      } catch (err) {
        console.error('Failed to load connection map:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить карту подключений');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const routes = useMemo<ConnectionRoute[]>(() => {
    if (!map?.services?.['api-gateway']?.routes) return [];
    return map.services['api-gateway'].routes;
  }, [map]);

  const mermaidChart = useMemo(() => {
    return map ? generateMermaidGraph(map) : '';
  }, [map]);

  const runHealth = async () => {
    setRunning(true);
    const next: Record<string, HealthResult> = {};
    for (const test of TESTS) {
      try {
        next[test.id] = { id: test.id, label: test.label, status: 'pending' };
        const result = await test.run();
        next[test.id] = { id: test.id, label: test.label, status: 'ok', details: result };
      } catch (err) {
        next[test.id] = {
          id: test.id,
          label: test.label,
          status: 'fail',
          details: err instanceof Error ? err.message : 'unknown error'
        };
      }
    }
    setHealth(next);
    setRunning(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Карта подключений</h1>
          <p className="text-sm text-muted-foreground">Единый источник истины по маршрутам API Gateway</p>
        </div>
        <Button variant="outline" onClick={runHealth} disabled={running}>
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          Прогнать health
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загружается карта подключений...
        </div>
      ) : null}

      {!loading && map && mermaidChart ? (
        <Card>
          <CardHeader>
            <CardTitle>Архитектура</CardTitle>
            <CardDescription>Визуализация маршрутизации Gateway</CardDescription>
          </CardHeader>
          <CardContent>
            <MermaidDiagram chart={mermaidChart} />
          </CardContent>
        </Card>
      ) : null}

      {!loading && map ? (
        <Card>
          <CardHeader>
            <CardTitle>Маршруты Gateway</CardTitle>
            <CardDescription>Данные из core/service-registry/connection-map.json</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gateway Path</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Тип</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((route, idx) => (
                  <TableRow key={`${route.gatewayPath}-${idx}`}>
                    <TableCell className="font-mono text-xs">{route.gatewayPath}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {route.targetService}
                      {route.targetPath ? <span className="opacity-50">{route.targetPath}</span> : null}
                    </TableCell>
                    <TableCell>{route.description || '-'}</TableCell>
                    <TableCell>
                      {route.ws ? (
                        <Badge variant="secondary">WS</Badge>
                      ) : (
                        <Badge variant="outline">HTTP</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Health-check</CardTitle>
          <CardDescription>Быстрый smoke через Gateway</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.values(health).map(result => (
              <div key={result.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    {result.label}
                  </div>
                  {result.details ? (
                    <p className="text-xs text-muted-foreground">{result.details}</p>
                  ) : null}
                </div>
                <div>
                  {result.status === 'pending' ? (
                    <Badge variant="outline">pending</Badge>
                  ) : result.status === 'ok' ? (
                    <Badge className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      OK
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      FAIL
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}