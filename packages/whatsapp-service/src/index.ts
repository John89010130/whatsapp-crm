import express from 'express';
import cors from 'cors';
import { config } from './config';
import { WhatsAppManager } from './whatsapp/manager';
import { instanceRouter } from './routes/instance.routes';
import { createClient } from '@supabase/supabase-js';

const app = express();
const whatsappManager = new WhatsAppManager();

// Supabase client
const companySupabase = createClient(
  process.env.COMPANY_SUPABASE_URL!,
  process.env.COMPANY_SUPABASE_KEY!
);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentar limite para arquivos grandes
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Make manager available to routes
app.locals.whatsappManager = whatsappManager;

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeInstances: whatsappManager.getActiveInstances().length,
    timestamp: new Date().toISOString() 
  });
});

// Routes
app.use('/api/instances', instanceRouter);

// Auto-reconnect instances on startup
async function autoReconnectInstances() {
  try {
    console.log('🔄 Verificando instâncias para reconexão...');
    
    const { data: instances, error } = await companySupabase
      .from('instances')
      .select('id, name, status')
      .in('status', ['CONNECTED', 'CONNECTING']);

    if (error) {
      console.error('❌ Erro ao buscar instâncias:', error);
      return;
    }

    if (!instances || instances.length === 0) {
      console.log('📭 Nenhuma instância para reconectar');
      return;
    }

    console.log(`📱 Encontradas ${instances.length} instância(s) para reconectar`);

    for (const instance of instances) {
      console.log(`🔌 Reconectando: ${instance.name} (${instance.id})`);
      try {
        await whatsappManager.createInstance(instance.id);
        console.log(`✅ Instância ${instance.name} reconectada`);
      } catch (err) {
        console.error(`❌ Erro ao reconectar ${instance.name}:`, err);
        // Atualizar status para DISCONNECTED em caso de erro
        await companySupabase
          .from('instances')
          .update({ status: 'DISCONNECTED' })
          .eq('id', instance.id);
      }
    }
  } catch (error) {
    console.error('❌ Erro na auto-reconexão:', error);
  }
}

// Start server
app.listen(config.port, async () => {
  console.log(`🚀 WhatsApp Service running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  
  // Aguardar 2 segundos e tentar reconectar instâncias
  setTimeout(autoReconnectInstances, 2000);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing WhatsApp connections');
  await whatsappManager.disconnectAll();
  process.exit(0);
});
