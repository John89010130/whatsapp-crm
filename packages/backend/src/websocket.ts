import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from './config';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  companyId?: string;
  instanceIds?: string[];
}

const clients = new Map<string, AuthenticatedWebSocket>();

export const setupWebSocket = (server: HTTPServer) => {
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    console.log('New WebSocket connection');
    
    // Authenticate
    const token = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('token');
    
    if (!token) {
      ws.close(4001, 'No token provided');
      return;
    }
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      ws.userId = decoded.id;
      ws.companyId = decoded.companyId;
      
      if (ws.userId) {
        clients.set(ws.userId, ws);
      }
      
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        payload: { userId: ws.userId }
      }));
      
    } catch (error) {
      ws.close(4002, 'Invalid token');
      return;
    }
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleWebSocketMessage(ws, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (ws.userId) {
        clients.delete(ws.userId);
      }
      console.log('WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  console.log('✅ WebSocket server initialized');
};

const handleWebSocketMessage = (ws: AuthenticatedWebSocket, message: any) => {
  // Handle different message types
  switch (message.type) {
    case 'PING':
      ws.send(JSON.stringify({ type: 'PONG' }));
      break;
    case 'SUBSCRIBE_INSTANCES':
      ws.instanceIds = message.payload.instanceIds;
      break;
    default:
      console.log('Unknown message type:', message.type);
  }
};

export const broadcastToUser = (userId: string, event: any) => {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(event));
  }
};

export const broadcastToCompany = (companyId: string, event: any) => {
  clients.forEach((client) => {
    if (client.companyId === companyId && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
};

export const broadcastToInstance = (instanceId: string, event: any) => {
  clients.forEach((client) => {
    if (client.instanceIds?.includes(instanceId) && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
};
