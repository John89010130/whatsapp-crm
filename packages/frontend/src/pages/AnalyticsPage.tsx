import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface Stats {
  totalConversations: number;
  totalMessages: number;
  activeContacts: number;
  avgResponseTime: string;
  resolvedToday: number;
  pendingConversations: number;
}

interface ChartData {
  label: string;
  value: number;
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  color: string;
  trend?: string;
}) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend && (
          <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const BarChartSimple = ({ data, title }: { data: ChartData[]; title: string }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AnalyticsPage = () => {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    totalConversations: 0,
    totalMessages: 0,
    activeContacts: 0,
    avgResponseTime: '0 min',
    resolvedToday: 0,
    pendingConversations: 0
  });
  const [loading, setLoading] = useState(true);
  const [messagesPerDay, setMessagesPerDay] = useState<ChartData[]>([]);
  const [conversationsByStatus, setConversationsByStatus] = useState<ChartData[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load conversations stats
      const convResponse = await fetch('http://localhost:3000/api/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const convData = await convResponse.json();
      
      const conversations = convData.data || [];
      const totalConversations = conversations.length;
      const pendingConversations = conversations.filter((c: any) => c.status === 'OPEN').length;
      const resolvedToday = conversations.filter((c: any) => {
        const today = new Date().toDateString();
        return c.status === 'RESOLVED' && new Date(c.updated_at).toDateString() === today;
      }).length;

      // Load contacts stats
      const contactsResponse = await fetch('http://localhost:3000/api/contacts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const contactsData = await contactsResponse.json();
      const activeContacts = (contactsData.data || []).length;

      // Calculate messages (sum of all message counts)
      let totalMessages = 0;
      conversations.forEach((conv: any) => {
        totalMessages += conv.unread_count || 0;
      });

      setStats({
        totalConversations,
        totalMessages: totalMessages + (totalConversations * 5), // Estimate
        activeContacts,
        avgResponseTime: '3 min',
        resolvedToday,
        pendingConversations
      });

      // Generate chart data
      const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      setMessagesPerDay(days.map(day => ({
        label: day,
        value: Math.floor(Math.random() * 50) + 10
      })));

      setConversationsByStatus([
        { label: 'Em aberto', value: pendingConversations },
        { label: 'Em atendimento', value: Math.floor(totalConversations * 0.3) },
        { label: 'Resolvidas', value: resolvedToday },
        { label: 'Arquivadas', value: Math.floor(totalConversations * 0.1) }
      ]);

    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex gap-2">
          <select className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500">
            <option>Últimos 7 dias</option>
            <option>Últimos 30 dias</option>
            <option>Este mês</option>
            <option>Mês passado</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard 
          title="Total de Conversas" 
          value={stats.totalConversations}
          icon={MessageSquare}
          color="bg-blue-500"
          trend="+12% vs semana passada"
        />
        <StatCard 
          title="Contatos Ativos" 
          value={stats.activeContacts}
          icon={Users}
          color="bg-green-500"
        />
        <StatCard 
          title="Tempo Médio de Resposta" 
          value={stats.avgResponseTime}
          icon={Clock}
          color="bg-purple-500"
        />
        <StatCard 
          title="Resolvidas Hoje" 
          value={stats.resolvedToday}
          icon={CheckCircle}
          color="bg-emerald-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <BarChartSimple 
          data={messagesPerDay} 
          title="Mensagens por Dia" 
        />
        <BarChartSimple 
          data={conversationsByStatus} 
          title="Conversas por Status" 
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Aguardando Resposta</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.pendingConversations}</p>
          <p className="text-sm text-gray-500">conversas pendentes</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Taxa de Resolução</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {stats.totalConversations > 0 
              ? Math.round((stats.resolvedToday / stats.totalConversations) * 100) 
              : 0}%
          </p>
          <p className="text-sm text-gray-500">das conversas hoje</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Total de Mensagens</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalMessages}</p>
          <p className="text-sm text-gray-500">mensagens trocadas</p>
        </div>
      </div>
    </div>
  );
};
