import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Archive,
  CheckCheck,
  Check,
  Clock,
  MessageSquare,
  Mic,
  Play,
  Pause,
  FileText,
  Download,
  Image as ImageIcon,
  Users,
  Video,
  X,
  ZoomIn,
  ChevronDown,
  Square,
  Loader2
} from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

// Emojis populares para o picker rápido
const POPULAR_EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌',
  '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑',
  '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
  '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '💯', '✨', '🔥', '🎉'
];

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  avatar_url: string | null;
}

interface MessageMetadata {
  isGroup?: boolean;
  quotedMessage?: { id: string; text: string; type?: string } | null;
  thumbnailUrl?: string | null;
  fileName?: string | null;
  duration?: number | null;
  mimetype?: string | null;
}

interface Message {
  id: string;
  text: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'ptt';
  from_me: boolean;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  media_url: string | null;
  created_at: string;
  sender_name?: string | null;
  sender_phone?: string | null;
  metadata?: MessageMetadata;
}

interface Conversation {
  id: string;
  instance_id: string;
  contact_id: string;
  contact: Contact;
  is_group?: boolean;
  status: 'open' | 'pending' | 'closed';
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  assigned_to: string | null;
  created_at: string;
  instance?: {
    id: string;
    name: string;
    phone: string;
  };
}

// Componente de Áudio Player
const AudioPlayer = ({ src, duration }: { src: string; duration?: number }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current && isLoaded && !error) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => setError(true));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && audioDuration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * audioDuration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <button
        onClick={togglePlay}
        disabled={!isLoaded || error}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0",
          isLoaded && !error
            ? "bg-teal-500 hover:bg-teal-600 text-white cursor-pointer"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        )}
      >
        {error ? (
          <X className="w-5 h-5" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>
      <div className="flex-1">
        <div 
          className="h-1.5 bg-gray-300 rounded-full overflow-hidden cursor-pointer"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-teal-500 rounded-full transition-all"
            style={{ width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs text-gray-600 mt-1 block">
          {formatAudioTime(currentTime)} / {formatAudioTime(audioDuration)}
        </span>
      </div>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setAudioDuration(e.currentTarget.duration);
          setIsLoaded(true);
        }}
        onCanPlay={() => setIsLoaded(true)}
        onError={() => setError(true)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
      />
    </div>
  );
};

// Componente Modal de Imagem
const ImageModal = ({ src, onClose }: { src: string; onClose: () => void }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
      >
        <X className="w-8 h-8" />
      </button>
      <img
        src={src}
        alt=""
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <a
        href={src}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-4 p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <Download className="w-6 h-6 text-white" />
      </a>
    </div>
  );
};

export const ConversationsPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [imageModal, setImageModal] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Estados para scroll control
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const lastMessageCountRef = useRef(0);
  
  // Estados para emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Estados para gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados para preview de mídia (paste/attachment)
  const [mediaPreview, setMediaPreview] = useState<{
    type: 'image' | 'video' | 'document';
    url: string;
    file: File;
    name: string;
  } | null>(null);
  
  // Estado para feedback de upload
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Estados para filtro de instância
  const [instances, setInstances] = useState<Array<{id: string; name: string; phone: string}>>([]);
  const [selectedInstanceFilter, setSelectedInstanceFilter] = useState<string>('all');

  const loadInstances = async () => {
    try {
      const response = await api.getInstances();
      if (response.success) {
        setInstances(response.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const status = statusFilter !== 'all' ? statusFilter : undefined;
      const response = await api.getConversations(status);
      if (response.success) {
        let filteredData = response.data || [];
        
        // Filtrar por instância se selecionada
        if (selectedInstanceFilter !== 'all') {
          filteredData = filteredData.filter((c: Conversation) => c.instance_id === selectedInstanceFilter);
        }
        
        // Ordenar por last_message_at DESC (backend já faz isso, mas garantir no frontend)
        const sortedConversations = filteredData.sort((a: Conversation, b: Conversation) => {
          const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return dateB - dateA; // DESC - mais recente primeiro
        });
        setConversations(sortedConversations);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await api.getMessages(conversationId);
      if (response.success) {
        const newMessages = response.data || [];
        setMessages(newMessages);
        
        // Só faz scroll automático se:
        // 1. É a primeira carga (mensagens anteriores eram 0)
        // 2. Há novas mensagens E o usuário não está scrollando manualmente
        if (lastMessageCountRef.current === 0 || 
            (newMessages.length > lastMessageCountRef.current && !isUserScrolling)) {
          scrollToBottom();
        }
        lastMessageCountRef.current = newMessages.length;
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSendingMessage(true);
    try {
      const response = await api.sendMessage(selectedConversation.id, newMessage);
      if (response.success) {
        setNewMessage('');
        // Adiciona a mensagem localmente
        const sentMessage: Message = {
          id: response.data?.messageId || `temp_${Date.now()}`,
          text: newMessage,
          type: 'text',
          from_me: true,
          status: 'sent',
          media_url: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, sentMessage]);
        scrollToBottom();
        // Atualiza a lista de conversas
        loadConversations();
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleArchive = async (conversationId: string) => {
    try {
      await api.archiveConversation(conversationId);
      loadConversations();
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Erro ao arquivar:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setShowScrollButton(false);
      setIsUserScrolling(false);
    }, 100);
  };

  // Handler de scroll para detectar quando usuário está navegando
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setShowScrollButton(!isAtBottom);
    setIsUserScrolling(!isAtBottom);
  }, []);

  // Inserir emoji no texto
  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = newMessage.slice(0, start) + emoji + newMessage.slice(end);
      setNewMessage(newText);
      // Reposicionar cursor
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setNewMessage(prev => prev + emoji);
    }
  };

  // Iniciar gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Tentar usar formato webm/opus (melhor para WhatsApp)
      const options: MediaRecorderOptions = { mimeType: 'audio/webm;codecs=opus' };
      
      // Fallback se não for suportado
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        console.warn('⚠️ audio/webm;codecs=opus não suportado, usando padrão');
        options.mimeType = undefined;
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      console.log('🎙️ Gravação iniciada com mimetype:', mediaRecorder.mimeType);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      alert('Não foi possível acessar o microfone');
    }
  };

  // Parar gravação e enviar
  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !selectedConversation) return;

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        
        console.log('🎤 Áudio gravado:', audioBlob.size, 'bytes, tipo:', audioBlob.type);
        
        // Converter para base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          console.log('📊 Base64 do áudio gerado, tamanho:', base64.length);
          
          setSendingMessage(true);
          try {
            const response = await api.sendMedia(selectedConversation.id, {
              type: 'ptt', // Push-To-Talk (mensagem de voz)
              data: base64,
              filename: 'audio.ogg',
              caption: ''
            });
            
            console.log('✅ Resposta do envio de áudio:', response);
            
            if (response.success) {
              const sentMessage: Message = {
                id: response.data?.messageId || `temp_${Date.now()}`,
                text: '',
                type: 'ptt',
                from_me: true,
                status: 'sent',
                media_url: base64,
                created_at: new Date().toISOString(),
              };
              setMessages(prev => [...prev, sentMessage]);
              scrollToBottom();
              loadConversations();
            }
          } catch (error) {
            console.error('❌ Erro ao enviar áudio:', error);
          } finally {
            setSendingMessage(false);
          }
        };
        reader.readAsDataURL(audioBlob);
        
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
        resolve();
      };

      mediaRecorderRef.current!.stop();
      setIsRecording(false);
    });
  };

  // Cancelar gravação
  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
  };

  // Formatar tempo de gravação
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handler para paste de imagens
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const url = URL.createObjectURL(file);
          setMediaPreview({
            type: 'image',
            url,
            file,
            name: `imagem_${Date.now()}.png`
          });
        }
        return;
      }
    }
  };

  // Handler para seleção de arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    let type: 'image' | 'video' | 'document' = 'document';
    
    if (file.type.startsWith('image/')) {
      type = 'image';
    } else if (file.type.startsWith('video/')) {
      type = 'video';
    }

    setMediaPreview({
      type,
      url,
      file,
      name: file.name
    });

    // Limpar input
    e.target.value = '';
  };

  // Enviar mídia
  const sendMedia = async () => {
    if (!mediaPreview || !selectedConversation) return;

    const fileSizeMB = (mediaPreview.file.size / 1024 / 1024).toFixed(2);
    console.log('📤 Enviando mídia:', {
      type: mediaPreview.type,
      filename: mediaPreview.name,
      caption: newMessage,
      fileSize: `${fileSizeMB} MB`
    });
    
    // Avisar se arquivo for grande
    if (mediaPreview.file.size > 10 * 1024 * 1024) { // Maior que 10MB
      setUploadProgress(`Enviando arquivo grande (${fileSizeMB} MB)... isso pode levar alguns segundos`);
    } else {
      setUploadProgress('Enviando...');
    }

    setSendingMessage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        console.log('📊 Base64 gerado:', {
          length: base64.length,
          preview: base64.substring(0, 100) + '...'
        });

        try {
          const response = await api.sendMedia(selectedConversation.id, {
            type: mediaPreview.type,
            data: base64,
            filename: mediaPreview.name,
            caption: newMessage
          });

          console.log('✅ Resposta da API:', response);

          if (response.success) {
            const sentMessage: Message = {
              id: response.data?.messageId || `temp_${Date.now()}`,
              text: newMessage,
              type: mediaPreview.type,
              from_me: true,
              status: 'sent',
              media_url: base64,
              created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, sentMessage]);
            scrollToBottom();
            loadConversations();
            setNewMessage('');
            cancelMediaPreview();
            setUploadProgress(null);
          }
        } catch (apiError: any) {
          console.error('❌ Erro na API:', apiError);
          const errorMsg = apiError.message || 'Erro desconhecido';
          if (errorMsg.includes('Timeout')) {
            alert('⏱️ Arquivo muito grande ou conexão lenta. Tente um arquivo menor ou aguarde melhor conexão.');
          } else {
            alert('❌ Erro ao enviar mídia: ' + errorMsg);
          }
          setUploadProgress(null);
        }
        setSendingMessage(false);
      };
      
      reader.onerror = (error) => {
        console.error('❌ Erro ao ler arquivo:', error);
        alert('Erro ao ler arquivo');
        setSendingMessage(false);
        setUploadProgress(null);
      };
      
      reader.readAsDataURL(mediaPreview.file);
    } catch (error) {
      console.error('❌ Erro ao enviar mídia:', error);
      alert('Erro ao enviar mídia: ' + (error as Error).message);
      setSendingMessage(false);
      setUploadProgress(null);
    }
  };

  // Cancelar preview de mídia
  const cancelMediaPreview = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview.url);
      setMediaPreview(null);
    }
  };

  // Formatar hora para lista de conversas (mais compacto)
  const formatConversationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    if (isYesterday) {
      return 'Ontem';
    }
    
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    if (date > weekAgo) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    }
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  // Formatar hora da mensagem no chat
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'sent':
        return <Check className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const name = conv.contact?.name || conv.contact?.phone || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  useEffect(() => {
    loadInstances();
    loadConversations();
    // Atualiza a cada 5 segundos
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [statusFilter, selectedInstanceFilter]);

  useEffect(() => {
    if (selectedConversation) {
      // Resetar controles de scroll ao mudar de conversa
      lastMessageCountRef.current = 0;
      setIsUserScrolling(false);
      setShowScrollButton(false);
      setShowEmojiPicker(false);
      cancelMediaPreview();
      
      loadMessages(selectedConversation.id);
      // Atualiza mensagens a cada 3 segundos
      const interval = setInterval(() => loadMessages(selectedConversation.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-100">
      {/* Lista de Conversas */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Conversas</h2>
          
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Filter - Status */}
          <div className="flex gap-2 mb-2">
            {['all', 'open', 'pending', 'closed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                  statusFilter === status
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {status === 'all' ? 'Todas' : status === 'open' ? 'Abertas' : status === 'pending' ? 'Pendentes' : 'Fechadas'}
              </button>
            ))}
          </div>

          {/* Filter - Instância */}
          {instances.length > 1 && (
            <div className="mb-3">
              <select
                value={selectedInstanceFilter}
                onChange={(e) => setSelectedInstanceFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors text-sm"
              >
                <option value="all">📱 Todas as instâncias</option>
                {instances.map((instance) => (
                  <option key={instance.id} value={instance.id}>
                    📱 {instance.name || instance.phone}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
              <p>Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={cn(
                  'flex items-center gap-3 p-3 cursor-pointer border-b border-gray-100 transition-colors',
                  selectedConversation?.id === conversation.id
                    ? 'bg-[#f0f2f5]'
                    : 'hover:bg-[#f5f6f6]'
                )}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {conversation.contact?.avatar_url ? (
                    <img
                      src={conversation.contact.avatar_url}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-lg",
                      conversation.is_group 
                        ? "bg-gradient-to-br from-teal-400 to-teal-600" 
                        : "bg-gradient-to-br from-gray-400 to-gray-500"
                    )}>
                      {conversation.is_group ? (
                        <Users className="w-6 h-6" />
                      ) : (
                        (conversation.contact?.name || conversation.contact?.phone || '?')[0].toUpperCase()
                      )}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <p className={cn(
                        "font-medium truncate",
                        conversation.unread_count > 0 ? "text-gray-900" : "text-gray-700"
                      )}>
                        {conversation.contact?.name || conversation.contact?.phone}
                      </p>
                      {/* Badge da Instância (mostrar apenas se houver mais de uma instância) */}
                      {instances.length > 1 && (
                        <span className="flex-shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                          {instances.find(i => i.id === conversation.instance_id)?.name?.substring(0, 15) || 
                           instances.find(i => i.id === conversation.instance_id)?.phone?.substring(-4) ||
                           'Inst'}
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "text-xs flex-shrink-0",
                      conversation.unread_count > 0 ? "text-green-600 font-medium" : "text-gray-500"
                    )}>
                      {conversation.last_message_at && formatConversationTime(conversation.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      {/* Ícone de status da última mensagem enviada */}
                      {conversation.unread_count === 0 && (
                        <CheckCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                      <p className={cn(
                        "text-sm truncate",
                        conversation.unread_count > 0 ? "text-gray-700" : "text-gray-500"
                      )}>
                        {conversation.last_message || 'Sem mensagens'}
                      </p>
                    </div>
                    {conversation.unread_count > 0 && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                        {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Área do Chat */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-[#efeae2]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cfc4' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}>
          {/* Header do Chat */}
          <div className="bg-[#f0f2f5] px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-3">
              {selectedConversation.contact?.avatar_url ? (
                <img
                  src={selectedConversation.contact.avatar_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium",
                  selectedConversation.is_group 
                    ? "bg-gradient-to-br from-teal-400 to-teal-600" 
                    : "bg-gradient-to-br from-gray-400 to-gray-500"
                )}>
                  {selectedConversation.is_group ? (
                    <Users className="w-5 h-5" />
                  ) : (
                    (selectedConversation.contact?.name || selectedConversation.contact?.phone || '?')[0].toUpperCase()
                  )}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">
                    {selectedConversation.contact?.name || selectedConversation.contact?.phone}
                  </p>
                  {/* Badge da Instância no header */}
                  {instances.length > 1 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                      {instances.find(i => i.id === selectedConversation.instance_id)?.name || 
                       instances.find(i => i.id === selectedConversation.instance_id)?.phone?.substring(-4) ||
                       'Instância'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {selectedConversation.is_group ? 'Grupo' : selectedConversation.contact?.phone}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <Search className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => handleArchive(selectedConversation.id)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                title="Arquivar"
              >
                <Archive className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-16 py-4 space-y-1 relative"
          >
            {messages.map((message, index) => {
              // Verificar se deve mostrar data separadora
              const showDateSeparator = index === 0 || 
                new Date(message.created_at).toDateString() !== 
                new Date(messages[index - 1].created_at).toDateString();
              
              return (
                <div key={message.id}>
                  {/* Separador de data */}
                  {showDateSeparator && (
                    <div className="flex justify-center my-3">
                      <span className="px-3 py-1 bg-white/90 rounded-lg text-xs text-gray-600 shadow-sm">
                        {new Date(message.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'long', year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  
                  <div className={cn(
                    'flex mb-0.5',
                    message.from_me ? 'justify-end' : 'justify-start'
                  )}>
                    <div className={cn(
                      'max-w-[65%] rounded-lg shadow-sm relative',
                      message.from_me
                        ? 'bg-[#d9fdd3] rounded-tr-none'
                        : 'bg-white rounded-tl-none'
                    )}>
                      {/* Sender name em grupos */}
                      {!message.from_me && selectedConversation.is_group && message.sender_name && (
                        <p className="text-xs font-medium text-teal-700 px-3 pt-1.5 pb-0">
                          {message.sender_name}
                        </p>
                      )}
                      
                      {/* Mensagem citada */}
                      {message.metadata?.quotedMessage && (
                        <div className="mx-1.5 mt-1.5 p-2 bg-black/5 rounded-lg border-l-4 border-teal-500">
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {message.metadata.quotedMessage.text}
                          </p>
                        </div>
                      )}
                      
                      {/* Conteúdo da mensagem baseado no tipo */}
                      <div className="px-2 py-1">
                        {/* Imagem */}
                        {(message.type === 'image' || message.type === 'sticker') && (
                          <div className="mb-1">
                            {message.media_url ? (
                              <div className="relative group cursor-pointer" onClick={() => setImageModal(message.media_url)}>
                                <img
                                  src={message.media_url}
                                  alt=""
                                  className={cn(
                                    "rounded-lg hover:opacity-95 transition-opacity",
                                    message.type === 'sticker' ? 'max-w-[150px]' : 'max-w-full max-h-[300px]'
                                  )}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                                <div className="hidden w-[200px] h-[150px] bg-gray-200 rounded-lg items-center justify-center">
                                  <ImageIcon className="w-8 h-8 text-gray-400" />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-black/50 p-2 rounded-full">
                                    <ZoomIn className="w-5 h-5 text-white" />
                                  </div>
                                </div>
                              </div>
                            ) : message.metadata?.thumbnailUrl ? (
                              <div 
                                className="relative cursor-pointer group"
                                onClick={() => message.metadata?.thumbnailUrl && setImageModal(message.metadata.thumbnailUrl)}
                              >
                                <img
                                  src={message.metadata.thumbnailUrl}
                                  alt=""
                                  className="max-w-full max-h-[300px] rounded-lg"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors rounded-lg">
                                  <div className="bg-black/50 text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-2">
                                    <ZoomIn className="w-4 h-4" />
                                    Ver imagem
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="w-[200px] h-[150px] bg-gray-200 rounded-lg flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Vídeo */}
                        {message.type === 'video' && (
                          <div className="mb-1">
                            {message.media_url ? (
                              <video
                                src={message.media_url}
                                controls
                                className="max-w-full max-h-[300px] rounded-lg"
                              />
                            ) : message.metadata?.thumbnailUrl ? (
                              <div className="relative">
                                <img
                                  src={message.metadata.thumbnailUrl}
                                  alt=""
                                  className="max-w-full max-h-[200px] rounded-lg"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-14 h-14 bg-black/50 rounded-full flex items-center justify-center">
                                    <Play className="w-8 h-8 text-white ml-1" />
                                  </div>
                                </div>
                                {message.metadata?.duration && (
                                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                    {Math.floor(message.metadata.duration / 60)}:{(message.metadata.duration % 60).toString().padStart(2, '0')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="w-[200px] h-[150px] bg-gray-200 rounded-lg flex items-center justify-center">
                                <Video className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Áudio */}
                        {(message.type === 'audio' || message.type === 'ptt') && (
                          <div className={cn(
                            "py-2 px-3 rounded-full flex items-center gap-3 min-w-[240px]",
                            message.from_me ? "bg-[#c5e8c1]" : "bg-gray-100"
                          )}>
                            {message.media_url ? (
                              <AudioPlayer 
                                src={message.media_url} 
                                duration={message.metadata?.duration || undefined}
                              />
                            ) : (
                              <div className="flex items-center gap-3 text-gray-500">
                                <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center">
                                  <Mic className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className="h-1 bg-gray-300 rounded-full w-[120px]"></div>
                                  <span className="text-xs mt-1 block">
                                    {message.metadata?.duration 
                                      ? `${Math.floor(message.metadata.duration / 60)}:${(message.metadata.duration % 60).toString().padStart(2, '0')}`
                                      : '0:00'
                                    }
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Documento */}
                        {message.type === 'document' && (
                          <div className={cn(
                            "flex items-center gap-3 p-2 rounded-lg min-w-[200px]",
                            message.from_me ? "bg-[#c5e8c1]" : "bg-gray-100"
                          )}>
                            <div className="w-10 h-10 rounded-lg bg-gray-300 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {message.metadata?.fileName || 'Documento'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {message.metadata?.mimetype?.split('/')[1]?.toUpperCase() || 'PDF'}
                              </p>
                            </div>
                            {message.media_url && (
                              <a 
                                href={message.media_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-200 rounded-full"
                              >
                                <Download className="w-5 h-5 text-gray-600" />
                              </a>
                            )}
                          </div>
                        )}
                        
                        {/* Texto */}
                        {message.text && (
                          <p className="text-[14.2px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
                            {message.text}
                          </p>
                        )}
                        
                        {/* Hora e status */}
                        <div className="flex items-center justify-end gap-1 -mb-0.5">
                          <span className="text-[11px] text-gray-500">
                            {formatMessageTime(message.created_at)}
                          </span>
                          {message.from_me && getStatusIcon(message.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
            
            {/* Botão de voltar ao final */}
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="fixed bottom-24 right-8 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
                title="Ir para o final"
              >
                <ChevronDown className="w-6 h-6 text-gray-600" />
              </button>
            )}
          </div>

          {/* Input */}
          <div className="bg-[#f0f2f5] px-4 py-3 relative">
            {/* Feedback de upload */}
            {uploadProgress && (
              <div className="absolute bottom-full left-0 right-0 bg-yellow-50 border-t border-yellow-200 px-4 py-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
                  <span className="text-sm text-yellow-700">{uploadProgress}</span>
                </div>
              </div>
            )}
            
            {/* Preview de mídia */}
            {mediaPreview && (
              <div className="absolute bottom-full left-0 right-0 bg-[#e5ddd5] p-4 border-t border-gray-300">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    {mediaPreview.type === 'image' ? (
                      <img src={mediaPreview.url} alt="" className="w-32 h-32 object-cover rounded-lg" />
                    ) : mediaPreview.type === 'video' ? (
                      <video src={mediaPreview.url} className="w-32 h-32 object-cover rounded-lg" />
                    ) : (
                      <div className="w-32 h-32 bg-white rounded-lg flex flex-col items-center justify-center">
                        <FileText className="w-10 h-10 text-gray-500 mb-2" />
                        <span className="text-xs text-gray-600 text-center px-2 truncate w-full">{mediaPreview.name}</span>
                      </div>
                    )}
                    <button
                      onClick={cancelMediaPreview}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 mb-2">{mediaPreview.name}</p>
                    <input
                      type="text"
                      placeholder="Adicione uma legenda..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-lg text-sm focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={sendMedia}
                    disabled={sendingMessage}
                    className="w-12 h-12 bg-[#00a884] rounded-full flex items-center justify-center hover:bg-[#008c72] transition-colors"
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Send className="w-6 h-6 text-white" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-4 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-80 z-20">
                <div className="grid grid-cols-12 gap-1 max-h-48 overflow-y-auto">
                  {POPULAR_EMOJIS.map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        insertEmoji(emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="w-7 h-7 flex items-center justify-center text-xl hover:bg-gray-100 rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input oculto para arquivos */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              className="hidden"
            />

            {/* Gravando áudio */}
            {isRecording ? (
              <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-2.5">
                <button
                  onClick={cancelRecording}
                  className="p-2 hover:bg-gray-100 rounded-full text-red-500"
                  title="Cancelar"
                >
                  <X className="w-6 h-6" />
                </button>
                
                <div className="flex-1 flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-gray-700 font-medium">{formatRecordingTime(recordingTime)}</span>
                  <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 animate-pulse"
                      style={{ width: `${Math.min((recordingTime % 60) * 1.67, 100)}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={stopRecording}
                  disabled={sendingMessage}
                  className="w-12 h-12 bg-[#00a884] rounded-full flex items-center justify-center hover:bg-[#008c72] transition-colors"
                  title="Enviar áudio"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Send className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={cn(
                    "p-2.5 rounded-full transition-colors",
                    showEmojiPicker ? "bg-gray-200" : "hover:bg-gray-200"
                  )}
                >
                  <Smile className="w-6 h-6 text-gray-500" />
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <Paperclip className="w-6 h-6 text-gray-500" />
                </button>
                <textarea
                  ref={textareaRef}
                  placeholder="Digite uma mensagem"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  onPaste={handlePaste}
                  rows={1}
                  className="flex-1 px-4 py-2.5 bg-white border-0 rounded-lg focus:ring-0 focus:outline-none text-[15px] resize-none max-h-32 overflow-y-auto"
                  style={{ minHeight: '42px' }}
                />
                {newMessage.trim() || mediaPreview ? (
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !newMessage.trim()}
                    className="p-2.5 bg-[#00a884] hover:bg-[#008c72] text-white rounded-full transition-colors"
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Send className="w-6 h-6" />
                    )}
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="p-2.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                  >
                    <Mic className="w-6 h-6" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5]">
          <div className="text-center">
            <div className="w-[280px] h-[280px] mx-auto mb-8">
              <svg viewBox="0 0 303 172" width="280" height="160" preserveAspectRatio="xMidYMid meet" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M229.565 160.229C262.212 149.245 286.931 118.241 283.39 73.4194C278.009 5.31929 212.365 -11.5738 171.638 8.74388C125.236 32.301 99.2474 28.8296 75.0288 35.3194C22.9332 49.529 -10.5204 101.429 5.31009 152.654C19.2416 198.021 73.2872 213.223 121.996 194.796C165.321 178.435 195.835 171.51 229.565 160.229Z" fill="#DAF7F3"></path>
                <path fillRule="evenodd" clipRule="evenodd" d="M131.589 68.9422C131.593 68.9422 131.596 68.9422 131.599 68.9422C137.86 68.9422 142.935 63.6787 142.935 57.1819C142.935 50.6851 137.86 45.4216 131.599 45.4216C125.338 45.4216 120.264 50.6851 120.264 57.1819C120.264 63.6787 125.338 68.9422 131.589 68.9422Z" fill="#9DE8DF"></path>
                <path fillRule="evenodd" clipRule="evenodd" d="M74.065 96.2886L78.404 74.2632H85.506L81.137 96.2886H74.065ZM64.139 96.2886L69.178 74.2632H76.278L71.211 96.2886H64.139ZM113.14 74.2632H106.033L103.691 96.2886H110.797L113.14 74.2632ZM123.033 74.2632H115.929L113.585 96.2886H120.691L123.033 74.2632Z" fill="#087E70"></path>
                <rect x="54" y="68" width="79" height="35" rx="4" fill="white"></rect>
                <path d="M54 72C54 69.7909 55.7909 68 58 68H129C131.209 68 133 69.7909 133 72V75H54V72Z" fill="#D9FDD3"></path>
              </svg>
            </div>
            <h3 className="text-3xl font-light text-gray-700 mb-4">WhatsApp CRM</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Envie e receba mensagens. Use o WhatsApp no seu navegador.
            </p>
          </div>
        </div>
      )}

      {/* Modal de Imagem */}
      {imageModal && (
        <ImageModal src={imageModal} onClose={() => setImageModal(null)} />
      )}
    </div>
  );
};
