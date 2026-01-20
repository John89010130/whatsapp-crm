import { create } from 'zustand';

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
  tags: string[];
}

interface Message {
  id: string;
  text: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  from_me: boolean;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  media_url: string | null;
  created_at: string;
}

interface Conversation {
  id: string;
  instance_id: string;
  contact_id: string;
  contact: Contact;
  status: 'open' | 'pending' | 'closed';
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  assigned_to: string | null;
  kanban_stage_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ConversationsState {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  messagesLoading: boolean;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, data: Partial<Conversation>) => void;
  selectConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
  setMessagesLoading: (loading: boolean) => void;
}

export const useConversationsStore = create<ConversationsState>((set) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  loading: false,
  messagesLoading: false,

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => {
      const exists = state.conversations.find((c) => c.id === conversation.id);
      if (exists) {
        return {
          conversations: state.conversations.map((c) =>
            c.id === conversation.id ? { ...c, ...conversation } : c
          ),
        };
      }
      return { conversations: [conversation, ...state.conversations] };
    }),

  updateConversation: (id, data) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
      selectedConversation:
        state.selectedConversation?.id === id
          ? { ...state.selectedConversation, ...data }
          : state.selectedConversation,
    })),

  selectConversation: (conversation) => set({ selectedConversation: conversation, messages: [] }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setLoading: (loading) => set({ loading }),
  setMessagesLoading: (messagesLoading) => set({ messagesLoading }),
}));
