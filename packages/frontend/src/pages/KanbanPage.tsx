import { useState, useEffect } from 'react';
import { Plus, GripVertical, MoreHorizontal, X, Edit2, Trash2, MessageSquare } from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface KanbanConversation {
  id: string;
  contact_name: string;
  contact_phone: string;
  contact_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  kanban_stage_id: string | null;
}

interface KanbanStage {
  id: string;
  name: string;
  color: string;
  order: number;
  conversations: KanbanConversation[];
}

const DEFAULT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

export const KanbanPage = () => {
  const [stages, setStages] = useState<KanbanStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewStage, setShowNewStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState(DEFAULT_COLORS[0]);
  const [draggingConversation, setDraggingConversation] = useState<KanbanConversation | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState('');

  const loadKanbanData = async () => {
    try {
      // Carregar stages
      const stagesResponse = await api.getKanbanStages();
      const stagesData = stagesResponse.success ? (stagesResponse.data || []) : [];

      // Carregar conversas do kanban
      const conversationsResponse = await api.getKanbanConversations();
      const conversationsData = conversationsResponse.success ? (conversationsResponse.data || []) : [];

      // Organizar conversas por stage
      const stagesWithConversations = stagesData.map((stage: KanbanStage) => ({
        ...stage,
        conversations: conversationsData.filter(
          (conv: KanbanConversation) => conv.kanban_stage_id === stage.id
        ),
      }));

      // Adicionar stage "Sem Etapa" para conversas não categorizadas
      const unassigned = conversationsData.filter(
        (conv: KanbanConversation) => !conv.kanban_stage_id
      );
      
      if (unassigned.length > 0 || stagesWithConversations.length === 0) {
        stagesWithConversations.unshift({
          id: 'unassigned',
          name: 'Sem Etapa',
          color: '#9ca3af',
          order: -1,
          conversations: unassigned,
        });
      }

      setStages(stagesWithConversations);
    } catch (error) {
      console.error('Erro ao carregar kanban:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStage = async () => {
    if (!newStageName.trim()) return;

    try {
      await api.createKanbanStage({
        name: newStageName,
        color: newStageColor,
        order: stages.length,
      });
      setNewStageName('');
      setNewStageColor(DEFAULT_COLORS[0]);
      setShowNewStage(false);
      loadKanbanData();
    } catch (error) {
      console.error('Erro ao criar stage:', error);
    }
  };

  const handleUpdateStage = async (stageId: string) => {
    if (!editStageName.trim()) return;

    try {
      await api.updateKanbanStage(stageId, { name: editStageName });
      setEditingStage(null);
      setEditStageName('');
      loadKanbanData();
    } catch (error) {
      console.error('Erro ao atualizar stage:', error);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta etapa?')) return;

    try {
      await api.deleteKanbanStage(stageId);
      loadKanbanData();
    } catch (error) {
      console.error('Erro ao excluir stage:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, conversation: KanbanConversation) => {
    setDraggingConversation(conversation);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggingConversation || draggingConversation.kanban_stage_id === targetStageId) {
      setDraggingConversation(null);
      return;
    }

    // Atualização otimista
    setStages((prev) =>
      prev.map((stage) => {
        // Remove da stage anterior
        const filteredConversations = stage.conversations.filter(
          (c) => c.id !== draggingConversation.id
        );
        
        // Adiciona na nova stage
        if (stage.id === targetStageId) {
          return {
            ...stage,
            conversations: [
              ...filteredConversations,
              { ...draggingConversation, kanban_stage_id: targetStageId },
            ],
          };
        }
        
        return { ...stage, conversations: filteredConversations };
      })
    );

    // Salvar no backend
    try {
      if (targetStageId !== 'unassigned') {
        await api.moveConversationToStage(draggingConversation.id, targetStageId);
      }
    } catch (error) {
      console.error('Erro ao mover conversa:', error);
      loadKanbanData(); // Recarrega em caso de erro
    }

    setDraggingConversation(null);
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  useEffect(() => {
    loadKanbanData();
    const interval = setInterval(loadKanbanData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kanban de Atendimentos</h1>
        <button
          onClick={() => setShowNewStage(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Etapa
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className={cn(
                'w-80 flex-shrink-0 bg-gray-50 rounded-xl flex flex-col transition-colors',
                dragOverStage === stage.id && 'ring-2 ring-green-500 bg-green-50'
              )}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Stage Header */}
              <div
                className="p-4 rounded-t-xl flex items-center justify-between"
                style={{ backgroundColor: stage.color + '20' }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  {editingStage === stage.id ? (
                    <input
                      type="text"
                      value={editStageName}
                      onChange={(e) => setEditStageName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleUpdateStage(stage.id)}
                      onBlur={() => setEditingStage(null)}
                      className="px-2 py-1 text-sm border rounded"
                      autoFocus
                    />
                  ) : (
                    <span className="font-semibold text-gray-700">{stage.name}</span>
                  )}
                  <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full">
                    {stage.conversations.length}
                  </span>
                </div>
                
                {stage.id !== 'unassigned' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingStage(stage.id);
                        setEditStageName(stage.name);
                      }}
                      className="p-1 hover:bg-white/50 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteStage(stage.id)}
                      className="p-1 hover:bg-white/50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {stage.conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, conversation)}
                    className={cn(
                      'bg-white rounded-lg p-4 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border border-gray-100',
                      draggingConversation?.id === conversation.id && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      {conversation.contact_avatar ? (
                        <img
                          src={conversation.contact_avatar}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-sm">
                          {(conversation.contact_name || conversation.contact_phone || '?')[0].toUpperCase()}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 truncate">
                            {conversation.contact_name || conversation.contact_phone}
                          </p>
                          {conversation.unread_count > 0 && (
                            <span className="w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {conversation.last_message || 'Sem mensagens'}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatTime(conversation.last_message_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {stage.conversations.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma conversa</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* New Stage Form */}
          {showNewStage && (
            <div className="w-80 flex-shrink-0 bg-white rounded-xl p-4 shadow-lg border-2 border-dashed border-green-300">
              <h3 className="font-semibold text-gray-900 mb-4">Nova Etapa</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="Ex: Em Negociação"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewStageColor(color)}
                        className={cn(
                          'w-7 h-7 rounded-full transition-transform',
                          newStageColor === color && 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowNewStage(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateStage}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Criar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
