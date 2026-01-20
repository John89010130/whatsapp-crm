import { useState, useEffect } from 'react';
import { User, Building, Bell, Shield, Palette, Save, LogOut, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../lib/utils';

interface QuickReply {
  id: string;
  shortcut: string;
  name: string;
  content: string;
}

const tabs = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'company', label: 'Empresa', icon: Building },
  { id: 'templates', label: 'Respostas Rápidas', icon: MessageSquare },
  { id: 'notifications', label: 'Notificações', icon: Bell },
];

export const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, token, logout } = useAuthStore();
  const [saving, setSaving] = useState(false);
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  // Quick Replies state
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showNewReply, setShowNewReply] = useState(false);
  const [newShortcut, setNewShortcut] = useState('');
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');

  const loadQuickReplies = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setQuickReplies(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // TODO: Implementar endpoint de atualização de perfil
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateQuickReply = async () => {
    if (!newShortcut || !newContent) return;

    try {
      const response = await fetch('http://localhost:3000/api/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shortcut: newShortcut,
          name: newName || newShortcut,
          content: newContent
        })
      });
      
      if (response.ok) {
        setNewShortcut('');
        setNewName('');
        setNewContent('');
        setShowNewReply(false);
        loadQuickReplies();
      }
    } catch (error) {
      console.error('Erro ao criar template:', error);
    }
  };

  const handleDeleteQuickReply = async (id: string) => {
    if (!confirm('Excluir esta resposta rápida?')) return;

    try {
      await fetch(`http://localhost:3000/api/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      loadQuickReplies();
    } catch (error) {
      console.error('Erro ao excluir template:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'templates') {
      loadQuickReplies();
    }
  }, [activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Perfil</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                  <p className="px-4 py-2 bg-gray-100 rounded-lg w-fit">
                    {user?.role === 'ADMIN' ? 'Administrador' : 'Atendente'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        );
        
      case 'company':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações da Empresa</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-600">
                Configurações da empresa estarão disponíveis em breve.
              </p>
            </div>
          </div>
        );
        
      case 'templates':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Respostas Rápidas</h3>
              <button
                onClick={() => setShowNewReply(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova Resposta
              </button>
            </div>

            {showNewReply && (
              <div className="bg-green-50 rounded-lg p-4 space-y-4 border border-green-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Atalho</label>
                    <input
                      type="text"
                      value={newShortcut}
                      onChange={(e) => setNewShortcut(e.target.value)}
                      placeholder="/ola"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Saudação"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={3}
                    placeholder="Olá! Como posso ajudar?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNewReply(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateQuickReply}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Criar
                  </button>
                </div>
              </div>
            )}

            {quickReplies.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Nenhuma resposta rápida criada</p>
                <p className="text-sm text-gray-500 mt-1">
                  Crie atalhos para mensagens frequentes
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {quickReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-sm rounded font-mono">
                          {reply.shortcut}
                        </span>
                        <span className="font-medium text-gray-900">{reply.name}</span>
                      </div>
                      <p className="text-gray-600 text-sm">{reply.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteQuickReply(reply.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        
      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferências de Notificação</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5 text-green-500 rounded" />
                <span className="text-gray-700">Notificações de novas mensagens</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5 text-green-500 rounded" />
                <span className="text-gray-700">Sons de notificação</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 text-green-500 rounded" />
                <span className="text-gray-700">Notificações por email</span>
              </label>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configurações</h1>
      
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  activeTab === tab.id
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl shadow-sm p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};
