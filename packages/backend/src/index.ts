import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth.routes';
import { masterRouter } from './routes/master.routes';
import { companyRouter } from './routes/company.routes';
import { instanceRouter } from './routes/instance.routes';
import { conversationRouter } from './routes/conversation.routes';
import { kanbanRouter } from './routes/kanban.routes';
import { automationRouter } from './routes/automation.routes';
import { templateRouter } from './routes/template.routes';
import { analyticsRouter } from './routes/analytics.routes';
import conversationsRoutes from './routes/conversations.routes';
import contactsRoutes from './routes/contacts.routes';
import webhooksRoutes from './routes/webhooks.routes';
import { setupWebSocket } from './websocket';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook routes (sem autenticação)
app.use('/api/webhooks', webhooksRoutes);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/master', masterRouter);
app.use('/api/companies', companyRouter);
app.use('/api/instances', instanceRouter);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/kanban', kanbanRouter);
app.use('/api/automations', automationRouter);
app.use('/api/templates', templateRouter);
app.use('/api/analytics', analyticsRouter);

// Error handling
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  console.log(`🚀 Backend API running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
});

// Setup WebSocket
setupWebSocket(server);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
