import React from 'react'
import { Badge } from '@beauty-platform/ui'
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useServiceStatus, ServiceStatus } from '../hooks/useServiceStatus'

interface LiveServiceStatusProps {
  services: Array<{
    name: string
    port: number
    endpoint?: string
    url?: string
    description?: string
  }>
  showDetails?: boolean
}

const StatusBadge: React.FC<{ status: ServiceStatus }> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status.status) {
      case 'online':
        return {
          icon: CheckCircle,
          className: "bg-green-100 text-green-800 border-green-300",
          text: "✅ ONLINE"
        }
      case 'offline':
        return {
          icon: XCircle,
          className: "bg-red-100 text-red-800 border-red-300",
          text: "❌ OFFLINE"
        }
      case 'checking':
        return {
          icon: Clock,
          className: "bg-yellow-100 text-yellow-800 border-yellow-300",
          text: "⏳ CHECKING"
        }
      default:
        return {
          icon: Clock,
          className: "bg-gray-100 text-gray-800 border-gray-300",
          text: "❓ UNKNOWN"
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
      {status.responseTime && status.status === 'online' && (
        <span className="ml-1 text-xs">({status.responseTime}ms)</span>
      )}
    </Badge>
  )
}

export const LiveServiceStatus: React.FC<LiveServiceStatusProps> = ({ 
  services, 
  showDetails = false 
}) => {
  const { statuses, isChecking, checkAllServices } = useServiceStatus(services)

  const formatLastChecked = (date?: Date) => {
    if (!date) return 'Never'
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  if (showDetails) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-lg">🔴 Live Service Status</h4>
          <button
            onClick={checkAllServices}
            disabled={isChecking}
            className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Refresh'}
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Service</th>
                <th className="px-4 py-2 text-left">Port</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Response Time</th>
                <th className="px-4 py-2 text-left">Last Checked</th>
                <th className="px-4 py-2 text-left">URL</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => {
                const status = statuses[service.name]
                return (
                  <tr key={service.name} className="border-t">
                    <td className="px-4 py-2 font-medium">{service.name}</td>
                    <td className="px-4 py-2 font-mono">{service.port}</td>
                    <td className="px-4 py-2">
                      {status ? <StatusBadge status={status} /> : <span className="text-gray-400">...</span>}
                    </td>
                    <td className="px-4 py-2 font-mono">
                      {status?.responseTime ? `${status.responseTime}ms` : '-'}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {formatLastChecked(status?.lastChecked)}
                    </td>
                    <td className="px-4 py-2">
                      {service.url && (
                        <a 
                          href={service.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          🔗 Open
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Компактный вид - только badges
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {services.map((service) => {
        const status = statuses[service.name]
        return (
          <div key={service.name} className="text-center">
            <div className="text-sm font-medium text-gray-700 mb-1">{service.name}</div>
            <div className="text-xs text-gray-500 mb-2">:{service.port}</div>
            {status ? <StatusBadge status={status} /> : <div className="text-gray-400">Loading...</div>}
          </div>
        )
      })}
    </div>
  )
}

export default LiveServiceStatus