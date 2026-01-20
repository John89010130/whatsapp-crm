import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  // Master Supabase
  masterSupabaseUrl: process.env.MASTER_SUPABASE_URL!,
  masterSupabaseKey: process.env.MASTER_SUPABASE_KEY!,
  
  // Company Supabase
  companySupabaseUrl: process.env.COMPANY_SUPABASE_URL!,
  companySupabaseKey: process.env.COMPANY_SUPABASE_KEY!,
  
  // JWT
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },
  
  // WhatsApp Service
  whatsappServiceUrl: process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
};

// Validate required config
const requiredEnvVars = [
  'MASTER_SUPABASE_URL',
  'MASTER_SUPABASE_KEY',
  'COMPANY_SUPABASE_URL',
  'COMPANY_SUPABASE_KEY',
  'JWT_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

