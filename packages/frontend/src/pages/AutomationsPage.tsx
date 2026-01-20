import { useState, useEffect } from 'react';
import { Plus, Zap, Play, Pause, Trash2, Edit2, MessageSquare, Clock, Tag, Users } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../lib/utils';

interface Automation {
  id: string;
  name: string;
  trigger_type: 'NEW_CONVERSATION' | 'KEYWORD' | 'NO_RESPONSE' | 'SCHEDULE';
  trigger_config: {
    keywords?: string[];
    delay_minutes?: number;
    schedule?: string;
  };
  actions: {
    type: 'SEND_MESSAGE' | 'ASSIGN_TO' | 'ADD_TAG' | 'MOVE_STAGE';
    config: any;
  }[];
  is_active: boolean;
  created_at: string;
}

const TRIGGER_TYPES = [
  { value: 'NEW_CONVERSATION', label: 'Nova Conversa', icon: MessageSquare, description: 'Quando uma nova conversa é iniciada' },
  { value: 'KEYWORD', label: 'Palavra-chave', icon: Tag, description: 'Quando uma mensagem contém palavras específicas' },
  { value: 'NO_RESPONSE', label: 'Sem Resposta', icon: Clock, description: 'Quando não há resposta após X minutos' },
  { value: 'SCHEDULE', label: 'Agendamento', icon: Clock, description: 'Em horários programados' },
];

const ACTION_TYPES = [
  { value: 'SEND_MESSAGE', label: 'Enviar Mensagem' },
  { value: 'ASSIGN_TO', label: 'Atribuir a Usuário' },
  { value: 'ADD_TAG', label: 'Adicionar Tag' },
  { value: 'MOVE_STAGE', label: 'Mover Etapa Kanban' },
];

export const AutomationsPage = () => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const token = useAuthStore((state) => state.token);

  // Form state
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<string>('NEW_CONVERSATION');
  const [keywords, setKeywords] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(5);
  const [actionType, setActionType] = useState<string>('SEND_MESSAGE');
  const [actionMessage, setActionMessage] = useState('');

  const loadAutomations = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/automations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAutomations(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar automações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      const triggerConfig: any = {};
      if (triggerType === 'KEYWORD' && keywords) {
        triggerConfig.keywords = keywords.split(',').map(k => k.trim());
      }
      if (triggerType === 'NO_RESPONSE') {
        triggerConfig.delay_minutes = delayMinutes;
      }

      const actions = [];
      if (actionType === 'SEND_MESSAGE' && actionMessage) {
        actions.push({ type: 'SEND_MESSAGE', config: { message: actionMessage } });
      }

      const payload = {
        name,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        actions,
        is_active: true
      };

      const url = editingAutomation 
        ? `http://localhost:3000/api/automations/${editingAutomation.id}`
        : 'http://localhost:3000/api/automations';
      
      const method = editingAutomation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        resetForm();
        loadAutomations();
      }
    } catch (error) {
      console.error('Erro ao salvar automação:', error);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await fetch(`http://localhost:3000/api/automations/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !isActive })
      });
      loadAutomations();
    } catch (error) {
      console.error('Erro ao alternar automação:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta automação?')) return;

    try {
      await fetch(`http://localhost:3000/api/automations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      loadAutomations();
    } catch (error) {
      console.error('Erro ao excluir automação:', error);
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingAutomation(null);
    setName('');
    setTriggerType('NEW_CONVERSATION');
    setKeywords('');
    setDelayMinutes(5);
    setActionType('SEND_MESSAGE');
    setActionMessage('');
  };

  const openEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    setName(automation.name);
    setTriggerType(automation.trigger_type);
    setKeywords(automation.trigger_config.keywords?.join(', ') || '');
    setDelayMinutes(automation.trigger_config.delay_minutes || 5);
    const sendAction = automation.actions.find(a => a.type === 'SEND_MESSAGE');
    if (sendAction) {
      setActionType('SEND_MESSAGE');
      setActionMessage(sendAction.config.message || '');
    }
    setShowModal(true);
  };

  const getTriggerIcon = (type: string) => {
    const trigger = TRIGGER_TYPES.find(t => t.value === type);
    return trigger?.icon || Zap;
  };

  useEffect(() => {
    loadAutomations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automações</h1>
          <p className="text-gray-600 mt-1">Configure respostas automáticas e fluxos de trabalho</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Automação
        </button>
      </div>

      {/* Lista de Automações */}
      {automations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma automação criada</h3>
          <p className="text-gray-500 mb-4">Crie sua primeira automação para responder automaticamente aos clientes</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Criar Automação
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {automations.map((automation) => {
            const TriggerIcon = getTriggerIcon(automation.trigger_type);
            const trigger = TRIGGER_TYPES.find(t => t.value === automation.trigger_type);
            
            return (
              <div
                key={automation.id}
                className={cn(
                  'bg-white rounded-xl shadow-sm p-6 border-l-4 transition-colors',
                  automation.is_active ? 'border-green-500' : 'border-gray-300'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center',
                      automation.is_active ? 'bg-green-100' : 'bg-gray-100'
                    )}>
                      <TriggerIcon className={cn(
                        'w-6 h-6',
                        automation.is_active ? 'text-green-600' : 'text-gray-400'
                      )} />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900">{automation.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{trigger?.description}</p>
                      
                      {automation.trigger_type === 'KEYWORD' && automation.trigger_config.keywords && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {automation.trigger_config.keywords.map((kw, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {automation.actions.length > 0 && (
                        <div className="mt-3 text-sm text-gray-600">
                          <strong>Ações:</strong>{' '}
                          {automation.actions.map(a => ACTION_TYPES.find(at => at.value === a.type)?.label).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(automation.id, automation.is_active)}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        automation.is_active 
                          ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      )}
                      title={automation.is_active ? 'Pausar' : 'Ativar'}
                    >
                      {automation.is_active ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => openEdit(automation)}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(automation.id)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingAutomation ? 'Editar Automação' : 'Nova Automação'}
            </h2>
            
            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Boas-vindas automático"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Gatilho */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gatilho</label>
                <div className="grid grid-cols-2 gap-2">
                  {TRIGGER_TYPES.map((trigger) => (
                    <button
                      key={trigger.value}
                      onClick={() => setTriggerType(trigger.value)}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-colors',
                        triggerType === trigger.value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <trigger.icon className={cn(
                        'w-5 h-5 mb-1',
                        triggerType === trigger.value ? 'text-green-600' : 'text-gray-400'
                      )} />
                      <p className="font-medium text-sm">{trigger.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configuração do Gatilho */}
              {triggerType === 'KEYWORD' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Palavras-chave (separadas por vírgula)</label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="preço, valor, quanto custa"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              )}

              {triggerType === 'NO_RESPONSE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempo sem resposta (minutos)</label>
                  <input
                    type="number"
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(Number(e.target.value))}
                    min={1}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Ação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem Automática</label>
                <textarea
                  value={actionMessage}
                  onChange={(e) => setActionMessage(e.target.value)}
                  rows={3}
                  placeholder="Olá! Obrigado por entrar em contato. Em breve retornaremos."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                {editingAutomation ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
