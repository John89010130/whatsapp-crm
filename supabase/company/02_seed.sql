-- ==============================================
-- SEED DATA - COMPANY DATABASE
-- ==============================================

-- Default Admin User (change password after first login!)
INSERT INTO users (email, password_hash, name, role, company_id, permissions)
VALUES (
  'admin@example.com',
  '$2b$10$rKvVXFzQMxJn4vYGGm1XF.VqYXzVtGhqxQDJfGYlvWzM3hTXfGPje', -- senha: admin123
  'Administrador',
  'ADMIN',
  '00000000-0000-0000-0000-000000000001',
  '{
    "can_view_all_conversations": true,
    "can_view_only_assigned": false,
    "can_view_unassigned": true,
    "can_assign_conversations": true,
    "can_close_conversations": true,
    "can_manage_instances": true,
    "can_manage_kanbans": true,
    "can_manage_automations": true,
    "can_manage_users": true,
    "can_manage_templates": true,
    "can_view_analytics": true
  }'::jsonb
);

-- Default Kanban Board
INSERT INTO kanban_boards (company_id, name, description, is_default)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Atendimento Padrão',
  'Kanban padrão para gestão de atendimentos',
  true
)
RETURNING id AS board_id;

-- Default Kanban Columns
INSERT INTO kanban_columns (kanban_board_id, name, color, position)
SELECT 
  id,
  column_name,
  column_color,
  column_position
FROM (
  SELECT 
    (SELECT id FROM kanban_boards WHERE is_default = true LIMIT 1) AS id,
    * 
  FROM (VALUES
    ('Novo', '#3B82F6', 1),
    ('Em Atendimento', '#F59E0B', 2),
    ('Aguardando Cliente', '#8B5CF6', 3),
    ('Resolvido', '#10B981', 4)
  ) AS columns(column_name, column_color, column_position)
) AS board_columns;

-- Default Tags
INSERT INTO tags (company_id, name, color)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Urgente', '#EF4444'),
  ('00000000-0000-0000-0000-000000000001', 'Vendas', '#10B981'),
  ('00000000-0000-0000-0000-000000000001', 'Suporte', '#3B82F6'),
  ('00000000-0000-0000-0000-000000000001', 'Financeiro', '#F59E0B');

-- Default Templates
INSERT INTO templates (company_id, name, content, shortcut, category, created_by_user_id)
SELECT
  '00000000-0000-0000-0000-000000000001',
  template_name,
  template_content,
  template_shortcut,
  template_category,
  (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
FROM (VALUES
  ('Boas-vindas', 'Olá! Seja bem-vindo(a)! Como posso ajudar você hoje?', '/bv', 'Saudação'),
  ('Aguardando resposta', 'Fico no aguardo do seu retorno. Qualquer dúvida, estou à disposição!', '/ag', 'Atendimento'),
  ('Resolvido', 'Problema resolvido! Se precisar de mais alguma coisa, é só chamar. Tenha um ótimo dia!', '/ok', 'Fechamento'),
  ('Horário de atendimento', 'Nosso horário de atendimento é de segunda a sexta, das 9h às 18h.', '/hr', 'Informativo')
) AS templates(template_name, template_content, template_shortcut, template_category);
