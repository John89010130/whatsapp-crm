import { useState, useEffect } from 'react';
import { Plus, Phone, QrCode, CheckCircle, XCircle, Clock, X, AlertTriangle, Loader2, Download, MessageSquare, Image } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface Instance {
  id: string;
  name: string;
  phone_number: string | null;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
  qr_code: string | null;
  is_active: boolean;
  last_connected_at: string | null;
  created_at: string;
}

interface SyncProgress {
  status: 'idle' | 'syncing' | 'completed' | 'error';
  totalMessages: number;
  processedMessages: number;
  totalConversations: number;
  processedConversations: number;
  currentConversation?: string;
  mediaDownloaded: number;
  mediaFailed: number;
}

export const InstancesPage = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [disconnectModal, setDisconnectModal] = useState<{ instanceId: string; instanceName: string } | null>(null);
  const [clearMessages, setClearMessages] = useState(false);
  const [syncProgress, setSyncProgress] = useState<Map<string, SyncProgress>>(new Map());
  const token = useAuthStore((state) => state.token);

  const loadInstances = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/instances', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      console.log('📥 Resposta loadInstances:', data);
      
      if (data.success) {
        setInstances(data.data || []);
      } else {
        console.error('Erro ao carregar:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
    } finally {
      setLoading(false);
    }
  };

  const createInstance = async () => {
    if (!newInstanceName.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    setCreating(true);
    setError('');

    try {
      console.log('📤 Criando instância:', newInstanceName);
      
      const response = await fetch('http://localhost:3000/api/instances', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newInstanceName })
      });
      
      const data = await response.json();
      console.log('📥 Resposta criar:', data);
      
      if (data.success) {
        setShowNewModal(false);
        setNewInstanceName('');
        loadInstances();
      } else {
        setError(data.error || 'Erro ao criar instância');
      }
    } catch (error: any) {
      console.error('Erro ao criar instância:', error);
      setError('Erro de conexão: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const connectInstance = async (instanceId: string) => {
    try {
      console.log('🔌 Conectando instância:', instanceId);
      
      const response = await fetch(`http://localhost:3001/api/instances/${instanceId}/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('📥 Resposta conectar:', data);
      
      if (data.success) {
        // Forçar reload imediato
        await loadInstances();
        // E continuar recarregando a cada segundo por 30 segundos para pegar QR Code
        let attempts = 0;
        const qrCheckInterval = setInterval(async () => {
          attempts++;
          await loadInstances();
          if (attempts >= 30) {
            clearInterval(qrCheckInterval);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
    }
  };

  const disconnectInstance = async (instanceId: string, shouldClearMessages: boolean = false) => {
    try {
      const response = await fetch(`http://localhost:3001/api/instances/${instanceId}/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('📥 Resposta desconectar:', data);
      
      if (data.success) {
        // Se pediu para limpar mensagens
        if (shouldClearMessages) {
          try {
            console.log('🗑️ Limpando dados da instância:', instanceId);
            const clearResponse = await fetch(`http://localhost:3000/api/instances/${instanceId}/clear-messages`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            const clearData = await clearResponse.json();
            console.log('✅ Dados limpos:', clearData);
            
            if (clearData.success && clearData.data) {
              alert(`Limpeza completa!
✅ ${clearData.data.messages} mensagens removidas
✅ ${clearData.data.conversations} conversas removidas
✅ ${clearData.data.contacts} contatos removidos`);
            }
          } catch (err) {
            console.error('❌ Erro ao limpar mensagens:', err);
            alert('Erro ao limpar mensagens. Verifique o console para mais detalhes.');
          }
        }
        loadInstances();
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      alert('Erro ao desconectar instância');
    } finally {
      setDisconnectModal(null);
      setClearMessages(false);
    }
  };

  const resetInstance = async (instanceId: string) => {
    try {
      console.log('🔄 Resetando instância para novo QR:', instanceId);
      
      const response = await fetch(`http://localhost:3001/api/instances/${instanceId}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('📥 Resposta reset:', data);
      
      if (data.success) {
        // Forçar reload imediato
        await loadInstances();
        // Continuar recarregando para pegar QR Code
        let attempts = 0;
        const qrCheckInterval = setInterval(async () => {
          attempts++;
          await loadInstances();
          if (attempts >= 30) {
            clearInterval(qrCheckInterval);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao resetar:', error);
    }
  };

  // Função para buscar progresso de sincronização
  const loadSyncProgress = async () => {
    const newProgress = new Map<string, SyncProgress>();
    
    for (const instance of instances) {
      if (instance.status === 'CONNECTED') {
        try {
          const response = await fetch(`http://localhost:3001/api/instances/${instance.id}/sync-progress`);
          const data = await response.json();
          if (data.success && data.data) {
            newProgress.set(instance.id, data.data);
          }
        } catch (error) {
          // Silenciar erros
        }
      }
    }
    
    setSyncProgress(newProgress);
  };

  useEffect(() => {
    loadInstances();
    // Atualizar a cada 2 segundos para pegar QR Code rapidamente
    const interval = setInterval(loadInstances, 2000);
    return () => clearInterval(interval);
  }, []);

  // Carregar progresso quando instâncias mudam
  useEffect(() => {
    if (instances.some(i => i.status === 'CONNECTED')) {
      loadSyncProgress();
      const progressInterval = setInterval(loadSyncProgress, 1000);
      return () => clearInterval(progressInterval);
    }
  }, [instances]);

  const getStatusIcon = (status: Instance['status']) => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'CONNECTING':
        return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'ERROR':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: Instance['status']) => {
    switch (status) {
      case 'CONNECTED': return 'Conectado';
      case 'CONNECTING': return 'Conectando...';
      case 'ERROR': return 'Erro';
      default: return 'Desconectado';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Instâncias WhatsApp</h1>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Instância
        </button>
      </div>

      {instances.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Phone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma instância cadastrada</h3>
          <p className="text-gray-600 mb-6">Crie sua primeira instância para começar a usar o WhatsApp CRM</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Criar Instância
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instances.map((instance) => (
            <div key={instance.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{instance.name}</h3>
                  {getStatusIcon(instance.status)}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Status:</span>
                    <span className={`font-medium ${
                      instance.status === 'CONNECTED' ? 'text-green-600' :
                      instance.status === 'CONNECTING' ? 'text-yellow-600' :
                      instance.status === 'ERROR' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {getStatusText(instance.status)}
                    </span>
                  </div>
                  {instance.phone_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Número:</span>
                      <span className="font-medium text-gray-900">{instance.phone_number}</span>
                    </div>
                  )}
                </div>

                {/* Progresso de Sincronização */}
                {instance.status === 'CONNECTED' && syncProgress.get(instance.id)?.status === 'syncing' && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-blue-700">Sincronizando histórico...</span>
                    </div>
                    
                    {(() => {
                      const progress = syncProgress.get(instance.id)!;
                      const msgPercent = progress.totalMessages > 0 
                        ? Math.round((progress.processedMessages / progress.totalMessages) * 100) 
                        : 0;
                      
                      return (
                        <>
                          {/* Barra de progresso */}
                          <div className="h-2 bg-blue-200 rounded-full overflow-hidden mb-2">
                            <div 
                              className="h-full bg-blue-600 transition-all duration-300"
                              style={{ width: `${msgPercent}%` }}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-gray-600">
                                {progress.processedMessages}/{progress.totalMessages} msgs
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Download className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-gray-600">
                                {progress.processedConversations}/{progress.totalConversations} chats
                              </span>
                            </div>
                            {progress.mediaDownloaded > 0 && (
                              <div className="flex items-center gap-1.5 col-span-2">
                                <Image className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-gray-600">
                                  {progress.mediaDownloaded} mídias baixadas
                                  {progress.mediaFailed > 0 && (
                                    <span className="text-red-500 ml-1">({progress.mediaFailed} falhas)</span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {progress.currentConversation && (
                            <div className="mt-2 text-xs text-gray-500 truncate">
                              Processando: {progress.currentConversation}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Sincronização concluída */}
                {instance.status === 'CONNECTED' && syncProgress.get(instance.id)?.status === 'completed' && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">
                        Sincronização concluída! {syncProgress.get(instance.id)!.processedMessages} mensagens
                      </span>
                    </div>
                  </div>
                )}

                {instance.qr_code && instance.status === 'CONNECTING' && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-2 text-center">Escaneie o QR Code:</p>
                    <img 
                      src={instance.qr_code} 
                      alt="QR Code" 
                      className="w-full max-w-[200px] mx-auto"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  {instance.status === 'DISCONNECTED' ? (
                    <button
                      onClick={() => {
                        console.log('🔌 Botão Conectar clicado para:', instance.id);
                        connectInstance(instance.id);
                      }}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Conectar
                    </button>
                  ) : instance.status === 'CONNECTING' ? (
                    <div className="flex gap-2 flex-1">
                      <button
                        onClick={async () => {
                          console.log('❌ Botão Cancelar clicado para:', instance.id);
                          try {
                            const response = await fetch(`http://localhost:3000/api/instances/${instance.id}`, {
                              method: 'PUT',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({ status: 'DISCONNECTED', qr_code: null })
                            });
                            console.log('📥 Resposta cancelar - status:', response.status);
                            const data = await response.json();
                            console.log('📥 Resposta cancelar - data:', data);
                            if (response.ok) {
                              await loadInstances();
                            }
                          } catch (error) {
                            console.error('🔴 Erro ao cancelar:', error);
                          }
                        }}
                        className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          console.log('🔄 Botão Reconectar clicado para:', instance.id);
                          connectInstance(instance.id);
                        }}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Reconectar
                      </button>
                    </div>
                  ) : instance.status === 'CONNECTED' ? (
                    <div className="flex gap-2 flex-1">
                      <button
                        onClick={() => setDisconnectModal({ instanceId: instance.id, instanceName: instance.name })}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Desconectar
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Isso irá desconectar o celular atual e gerar um novo QR Code. Continuar?')) {
                            resetInstance(instance.id);
                          }
                        }}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Trocar Celular
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Instância */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Nova Instância</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Instância
              </label>
              <input
                type="text"
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: Atendimento Principal"
                autoFocus
                disabled={creating}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setError('');
                  setNewInstanceName('');
                }}
                disabled={creating}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={createInstance}
                disabled={creating}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {creating ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Desconexão */}
      {disconnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Desconectar Instância</h3>
              </div>
              <button
                onClick={() => {
                  setDisconnectModal(null);
                  setClearMessages(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Você está prestes a desconectar <strong>{disconnectModal.instanceName}</strong>.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearMessages}
                  onChange={(e) => setClearMessages(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Limpar mensagens e conversas</span>
                  <p className="text-sm text-gray-500">Remove todas as mensagens e conversas desta instância</p>
                </div>
              </label>
            </div>
            
            {clearMessages && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">
                  <strong>Atenção:</strong> Esta ação é irreversível. Todas as mensagens e conversas serão permanentemente excluídas.
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDisconnectModal(null);
                  setClearMessages(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => disconnectInstance(disconnectModal.instanceId, clearMessages)}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                {clearMessages ? 'Desconectar e Limpar' : 'Apenas Desconectar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

