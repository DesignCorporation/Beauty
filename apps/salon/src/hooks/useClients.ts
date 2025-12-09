import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../contexts/AuthContext';
import { CRMApiService } from '../services/crmApiNew';

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  birthday?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  createdAt: string;
  updatedAt: string;
  appointmentsCount?: number;
  avatar?: string | null;
  avatarUrl?: string | null;
  profileFirstName?: string | null;
  profileLastName?: string | null;
  isPortalClient?: boolean;
}

export interface ClientFormData {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  birthday?: string;
}

export const useClients = (): {
  clients: Client[];
  loading: boolean;
  error: string | null;
  fetchClients: () => Promise<void>;
  createClient: (data: ClientFormData) => Promise<Client | null>;
  updateClient: (id: string, data: Partial<ClientFormData>) => Promise<Client | null>;
  deleteClient: (id: string) => Promise<void>;
  searchClients: (query: string) => Promise<Client[]>;
  refetch: () => Promise<void>;
} => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenantId } = useTenant();

  const resolveAssetUrl = (value?: string | null) => {
    if (!value) return null;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('/')) return value;
    return `/${value}`;
  };

  const normalizeClient = useCallback((client: Client): Client => {
    const avatar = client.avatar ?? null;
    const avatarUrl = resolveAssetUrl(avatar);
    const profileFirstName = client.profileFirstName ?? null;
    const profileLastName = client.profileLastName ?? null;
    const isPortalClient = Boolean(client.isPortalClient);

    const derivedName = [profileFirstName, profileLastName].filter(Boolean).join(' ').trim();
    const displayName = (client.name || '').trim() || derivedName;

    return {
      ...client,
      name: displayName || client.name,
      avatar,
      avatarUrl,
      profileFirstName,
      profileLastName,
      isPortalClient
    };
  }, []);

  // Получение всех клиентов
  const fetchClients = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);
      
      // ✅ ВОССТАНОВЛЕНО - используем реальное API
      const response = await CRMApiService.getClients();
      
      if (response.success) {
        const normalized = (response.clients || []).map(normalizeClient);
        setClients(normalized);
      } else {
        throw new Error('Failed to fetch clients');
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, normalizeClient]);

  // Создание нового клиента
  const createClient = useCallback(async (clientData: ClientFormData): Promise<Client | null> => {
    if (!tenantId) throw new Error('No tenant ID');

    try {
      const response = await CRMApiService.createClient(clientData);

      if (response.success && response.client) {
        const newClient = normalizeClient(response.client as Client);
        setClients(prev => [newClient, ...prev]);
        return newClient;
      } else {
        throw new Error('Failed to create client');
      }
    } catch (err) {
      console.error('Error creating client:', err);
      throw err;
    }
  }, [tenantId, normalizeClient]);

  // Обновление клиента
  const updateClient = useCallback(async (clientId: string, updates: Partial<ClientFormData>): Promise<Client | null> => {
    if (!tenantId) throw new Error('No tenant ID');

    try {
      const response = await CRMApiService.updateClient(clientId, updates);

      if (response.success && response.client) {
        const updatedClient = normalizeClient(response.client as Client);
        setClients(prev => 
          prev.map(client => 
            client.id === clientId ? updatedClient : client
          )
        );
        return updatedClient;
      } else {
        throw new Error('Failed to update client');
      }
    } catch (err) {
      console.error('Error updating client:', err);
      throw err;
    }
  }, [tenantId, normalizeClient]);

  // Удаление клиента
  const deleteClient = useCallback(async (clientId: string): Promise<void> => {
    if (!tenantId) throw new Error('No tenant ID');

    try {
      const response = await CRMApiService.deleteClient(clientId);

      if (response.success) {
        setClients(prev => prev.filter(client => client.id !== clientId));
      } else {
        throw new Error('Failed to delete client');
      }
    } catch (err) {
      console.error('Error deleting client:', err);
      throw err;
    }
  }, [tenantId]);

  // Поиск клиентов
  const searchClients = useCallback(async (query: string): Promise<Client[]> => {
    if (!tenantId || !query.trim()) return clients;

    try {
      const normalizedQuery = query.toLowerCase();
      // Новый API пока не поддерживает поиск, используем локальную фильтрацию
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(normalizedQuery) ||
        (client.profileFirstName && client.profileFirstName.toLowerCase().includes(normalizedQuery)) ||
        (client.profileLastName && client.profileLastName.toLowerCase().includes(normalizedQuery)) ||
        (client.email && client.email.toLowerCase().includes(normalizedQuery)) ||
        (client.phone && client.phone.includes(query))
      );
      return filtered;
      
      // TODO: Когда API будет поддерживать поиск:
      // const response = await CRMApiService.searchClients(query);
      // return response.success ? response.clients || [] : [];
    } catch (err) {
      console.error('Error searching clients:', err);
      return [];
    }
  }, [tenantId, clients]);

  // Загрузка данных при монтировании
  useEffect((): void => {
    void fetchClients();
  }, [fetchClients]);

  return {
    clients,
    loading,
    error,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    searchClients,
    refetch: fetchClients,
  };
};
