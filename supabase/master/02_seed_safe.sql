-- ==============================================
-- MASTER DATABASE - SEED DATA (Safe Insert)
-- ==============================================

-- Default Master User (change password after first login!)
-- Uses INSERT ... ON CONFLICT to avoid duplicate key errors
INSERT INTO master_users (email, password_hash)
VALUES (
  'master@whatsappcrm.com',
  '$2b$10$rKvVXFzQMxJn4vYGGm1XF.VqYXzVtGhqxQDJfGYlvWzM3hTXfGPje' -- senha: admin123
)
ON CONFLICT (email) DO NOTHING;

-- Example Owner (for testing)
-- Uses INSERT ... ON CONFLICT to avoid duplicate key errors
INSERT INTO owners (email, password_hash, name, master_id, plan, plan_limits)
VALUES (
  'owner@example.com',
  '$2b$10$rKvVXFzQMxJn4vYGGm1XF.VqYXzVtGhqxQDJfGYlvWzM3hTXfGPje', -- senha: admin123
  'Owner de Exemplo',
  (SELECT id FROM master_users WHERE email = 'master@whatsappcrm.com' LIMIT 1),
  'PRO',
  '{
    "max_companies": 5,
    "max_instances_per_company": 10,
    "max_attendants_per_company": 20,
    "max_conversations_per_month": 10000,
    "has_automations": true,
    "has_analytics": true,
    "has_webhooks": true
  }'::jsonb
)
ON CONFLICT (email) DO NOTHING;

-- Show results
SELECT 'Master Users:' as info;
SELECT id, email, role, created_at FROM master_users;

SELECT 'Owners:' as info;
SELECT id, email, name, plan, is_active FROM owners;
