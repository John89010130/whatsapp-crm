import { create } from 'zustand';

interface KanbanStage {
  id: string;
  name: string;
  color: string;
  order: number;
  conversations: KanbanConversation[];
}

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

interface KanbanState {
  stages: KanbanStage[];
  loading: boolean;
  setStages: (stages: KanbanStage[]) => void;
  addStage: (stage: KanbanStage) => void;
  updateStage: (id: string, data: Partial<KanbanStage>) => void;
  deleteStage: (id: string) => void;
  moveConversation: (conversationId: string, fromStageId: string | null, toStageId: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  stages: [],
  loading: false,

  setStages: (stages) => set({ stages }),

  addStage: (stage) =>
    set((state) => ({
      stages: [...state.stages, stage],
    })),

  updateStage: (id, data) =>
    set((state) => ({
      stages: state.stages.map((s) => (s.id === id ? { ...s, ...data } : s)),
    })),

  deleteStage: (id) =>
    set((state) => ({
      stages: state.stages.filter((s) => s.id !== id),
    })),

  moveConversation: (conversationId, fromStageId, toStageId) =>
    set((state) => {
      const newStages = state.stages.map((stage) => {
        // Remove from old stage
        if (stage.id === fromStageId || (!fromStageId && stage.conversations.find(c => c.id === conversationId))) {
          return {
            ...stage,
            conversations: stage.conversations.filter((c) => c.id !== conversationId),
          };
        }
        return stage;
      });

      // Find the conversation from any stage
      let movedConversation: KanbanConversation | undefined;
      for (const stage of state.stages) {
        const conv = stage.conversations.find((c) => c.id === conversationId);
        if (conv) {
          movedConversation = { ...conv, kanban_stage_id: toStageId };
          break;
        }
      }

      // Add to new stage
      if (movedConversation) {
        return {
          stages: newStages.map((stage) =>
            stage.id === toStageId
              ? { ...stage, conversations: [...stage.conversations, movedConversation!] }
              : stage
          ),
        };
      }

      return { stages: newStages };
    }),

  setLoading: (loading) => set({ loading }),
}));
