const API_URL = 'http://localhost:3000/api';
const WS_API_URL = 'http://localhost:3001/api';

export const api = {
  // Helper para requisições autenticadas
  async request(endpoint: string, options: RequestInit = {}, useWsApi = false) {
    const token = localStorage.getItem('auth-storage');
    const authData = token ? JSON.parse(token) : null;
    const authToken = authData?.state?.token;

    const baseUrl = useWsApi ? WS_API_URL : API_URL;
    const url = `${baseUrl}${endpoint}`;
    
    console.log('🌐 API Request:', { url, method: options.method || 'GET' });
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...options.headers,
        },
      });

      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Resposta não é JSON:', text.substring(0, 200));
        throw new Error(`Servidor retornou ${response.status}: ${text.substring(0, 100)}`);
      }

      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ Erro na API:', data);
        throw new Error(data.error || `Erro ${response.status}`);
      }

      return data;
    } catch (error: any) {
      console.error('❌ Erro na requisição:', error);
      throw error;
    }
  },

  // Conversations
  async getConversations(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request(`/conversations${params}`);
  },

  async getConversation(id: string) {
    return this.request(`/conversations/${id}`);
  },

  async getMessages(conversationId: string, limit = 50, before?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) params.append('before', before);
    return this.request(`/conversations/${conversationId}/messages?${params}`);
  },

  async sendMessage(conversationId: string, text: string, mediaUrl?: string, mediaType?: string) {
    return this.request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, mediaUrl, mediaType }),
    });
  },

  async sendMedia(conversationId: string, media: { type: string; data: string; filename: string; caption?: string }) {
    return this.request(`/conversations/${conversationId}/media`, {
      method: 'POST',
      body: JSON.stringify(media),
    });
  },

  async archiveConversation(conversationId: string) {
    return this.request(`/conversations/${conversationId}/archive`, {
      method: 'POST',
    });
  },

  async updateConversation(conversationId: string, data: { assignedTo?: string; status?: string }) {
    return this.request(`/conversations/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Contacts
  async getContacts(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/contacts${params}`);
  },

  async getContact(id: string) {
    return this.request(`/contacts/${id}`);
  },

  async createContact(data: { phone: string; name?: string; email?: string; notes?: string }) {
    return this.request('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateContact(id: string, data: { name?: string; email?: string; notes?: string; tags?: string[] }) {
    return this.request(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteContact(id: string) {
    return this.request(`/contacts/${id}`, {
      method: 'DELETE',
    });
  },

  // Kanban
  async getKanbanStages() {
    return this.request('/kanban/stages');
  },

  async createKanbanStage(data: { name: string; color: string; order?: number }) {
    return this.request('/kanban/stages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateKanbanStage(id: string, data: { name?: string; color?: string; order?: number }) {
    return this.request(`/kanban/stages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteKanbanStage(id: string) {
    return this.request(`/kanban/stages/${id}`, {
      method: 'DELETE',
    });
  },

  async getKanbanConversations() {
    return this.request('/kanban/conversations');
  },

  async moveConversationToStage(conversationId: string, stageId: string) {
    return this.request(`/kanban/conversations/${conversationId}/move`, {
      method: 'POST',
      body: JSON.stringify({ stageId }),
    });
  },

  // Instances
  async getInstances() {
    return this.request('/instances');
  },

  async getInstance(id: string) {
    return this.request(`/instances/${id}`);
  },

  async sendDirectMessage(instanceId: string, phone: string, text: string) {
    return this.request(`/instances/${instanceId}/send`, {
      method: 'POST',
      body: JSON.stringify({ phone, text }),
    }, true);
  },

  // Quick Replies
  async getQuickReplies() {
    return this.request('/templates');
  },

  async createQuickReply(data: { shortcut: string; content: string; category?: string }) {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteQuickReply(id: string) {
    return this.request(`/templates/${id}`, {
      method: 'DELETE',
    });
  },
};
