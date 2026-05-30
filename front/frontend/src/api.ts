const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  created_at?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  created_at?: string;
}

export interface Campaign {
  id: string;
  name: string;
  message_text: string;
  image_url?: string;
  status: 'draft' | 'queued' | 'sending' | 'completed' | 'failed' | 'paused';
  total_recipients: number;
  sent_recipients: number;
  failed_recipients: number;
  created_at: string;
  recipients?: Array<{
    id: string;
    status: string;
    error_message?: string;
    sent_at?: string;
    contactName: string;
    contactPhone: string;
  }>;
}

export interface WhatsappStatus {
  status: 'DISCONNECTED' | 'INITIALIZING' | 'READY' | 'QR_CODE';
  qr: string | null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}/api${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error de red indefinido.' }));
    throw new Error(errorData.message || 'Error en la petición API.');
  }

  return response.json() as Promise<T>;
}

export const api = {
  // CONTACTS
  contacts: {
    list: () => request<Contact[]>('/contacts'),
    get: (id: string) => request<Contact>(`/contacts/${id}`),
    create: (data: Omit<Contact, 'id'>) =>
      request<Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) }),
    bulkCreate: (contacts: Omit<Contact, 'id'>[]) =>
      request<Contact[]>('/contacts/bulk', { method: 'POST', body: JSON.stringify(contacts) }),
    update: (id: string, data: Partial<Omit<Contact, 'id'>>) =>
      request<Contact>(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/contacts/${id}`, { method: 'DELETE' }),
  },

  // GROUPS
  groups: {
    list: () => request<Group[]>('/groups'),
    get: (id: string) => request<Group & { members: Contact[] }>(`/groups/${id}`),
    create: (data: { name: string; description?: string }) =>
      request<Group>('/groups', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; description?: string }>) =>
      request<Group>(`/groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/groups/${id}`, { method: 'DELETE' }),
    syncContacts: (id: string, contactIds: string[]) =>
      request<{ message: string }>(`/groups/${id}/sync`, {
        method: 'POST',
        body: JSON.stringify({ contactIds }),
      }),
  },

  // CAMPAIGNS
  campaigns: {
    list: () => request<Campaign[]>('/campaigns'),
    get: (id: string) => request<Campaign>(`/campaigns/${id}`),
    create: (data: { name: string; messageText: string; imageUrl?: string; groupIds: string[] }) =>
      request<Campaign>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    pause: (id: string) => request<Campaign>(`/campaigns/${id}/pause`, { method: 'POST' }),
    resume: (id: string) => request<Campaign>(`/campaigns/${id}/resume`, { method: 'POST' }),
    delete: (id: string) => request<{ message: string }>(`/campaigns/${id}`, { method: 'DELETE' }),
  },

  // WHATSAPP
  whatsapp: {
    status: () => request<WhatsappStatus>('/whatsapp/status'),
    logout: () => request<{ message: string }>('/whatsapp/logout', { method: 'POST' }),
  },
};
