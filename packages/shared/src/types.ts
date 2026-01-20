// ========================================
// ENUMS
// ========================================

export enum UserRole {
  MASTER = 'MASTER',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  ATTENDANT = 'ATTENDANT'
}

export enum InstanceStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export enum ConversationStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED'
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
  STICKER = 'STICKER',
  LOCATION = 'LOCATION',
  CONTACT = 'CONTACT'
}

export enum MessageDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING'
}

export enum AutomationTriggerType {
  TIME_ELAPSED = 'TIME_ELAPSED',
  KEYWORD = 'KEYWORD',
  ATTENDANT_ACTION = 'ATTENDANT_ACTION',
  STATUS_CHANGE = 'STATUS_CHANGE',
  FIRST_CONTACT = 'FIRST_CONTACT',
  CLIENT_RESPONDED = 'CLIENT_RESPONDED',
  NO_CLIENT_RESPONSE = 'NO_CLIENT_RESPONSE',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  MESSAGE_SENT = 'MESSAGE_SENT'
}

export enum AutomationActionType {
  MOVE_KANBAN = 'MOVE_KANBAN',
  ASSIGN_ATTENDANT = 'ASSIGN_ATTENDANT',
  ADD_TAG = 'ADD_TAG',
  REMOVE_TAG = 'REMOVE_TAG',
  SEND_MESSAGE = 'SEND_MESSAGE',
  NOTIFY = 'NOTIFY',
  CLOSE_CONVERSATION = 'CLOSE_CONVERSATION',
  CREATE_REMINDER = 'CREATE_REMINDER',
  WEBHOOK = 'WEBHOOK'
}

export enum PlanType {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

// ========================================
// MASTER DATABASE TYPES
// ========================================

export interface MasterUser {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole.MASTER;
  created_at: string;
  updated_at: string;
}

export interface Owner {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole.OWNER;
  master_id: string;
  plan: PlanType;
  plan_limits: PlanLimits;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  owner_id: string;
  name: string;
  supabase_url: string;
  supabase_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanLimits {
  max_companies: number;
  max_instances_per_company: number;
  max_attendants_per_company: number;
  max_conversations_per_month: number;
  has_automations: boolean;
  has_analytics: boolean;
  has_webhooks: boolean;
}

// ========================================
// COMPANY DATABASE TYPES
// ========================================

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole.ADMIN | UserRole.ATTENDANT;
  company_id: string;
  avatar_url?: string;
  signature?: string;
  is_active: boolean;
  permissions: UserPermissions;
  created_at: string;
  updated_at: string;
}

export interface UserPermissions {
  can_view_all_conversations: boolean;
  can_view_only_assigned: boolean;
  can_view_unassigned: boolean;
  can_assign_conversations: boolean;
  can_close_conversations: boolean;
  can_manage_instances: boolean;
  can_manage_kanbans: boolean;
  can_manage_automations: boolean;
  can_manage_users: boolean;
  can_manage_templates: boolean;
  can_view_analytics: boolean;
}

export interface Instance {
  id: string;
  company_id: string;
  name: string;
  phone_number: string;
  status: InstanceStatus;
  qr_code?: string;
  session_data?: any;
  allowed_user_ids: string[];
  webhook_url?: string;
  is_active: boolean;
  last_connected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  instance_id: string;
  contact_phone: string;
  contact_name?: string;
  contact_avatar?: string;
  status: ConversationStatus;
  assigned_to_user_id?: string;
  kanban_column_id?: string;
  last_message_at: string;
  last_message_preview?: string;
  unread_count: number;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  whatsapp_message_id: string;
  type: MessageType;
  direction: MessageDirection;
  content: string;
  media_url?: string;
  sender_user_id?: string;
  sender_name?: string;
  is_from_client: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export interface KanbanBoard {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  instance_ids: string[];
  columns: KanbanColumn[];
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  id: string;
  kanban_board_id: string;
  name: string;
  color: string;
  position: number;
  automations: string[];
  created_at: string;
  updated_at: string;
}

export interface Automation {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  created_at: string;
  updated_at: string;
}

export interface AutomationTrigger {
  type: AutomationTriggerType;
  config: Record<string, any>;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_equals';
  value: any;
}

export interface AutomationAction {
  type: AutomationActionType;
  config: Record<string, any>;
  delay_seconds?: number;
}

export interface Template {
  id: string;
  company_id: string;
  name: string;
  content: string;
  shortcut?: string;
  category?: string;
  variables: string[];
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  company_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Note {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  conversation_id: string;
  user_id: string;
  remind_at: string;
  message: string;
  is_completed: boolean;
  created_at: string;
}

// ========================================
// API REQUEST/RESPONSE TYPES
// ========================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

export interface SendMessageRequest {
  conversation_id: string;
  content: string;
  type: MessageType;
  use_signature?: boolean;
}

export interface CreateAutomationRequest {
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

export interface AssignConversationRequest {
  conversation_id: string;
  user_id: string;
}

export interface MoveKanbanRequest {
  conversation_id: string;
  column_id: string;
}

// ========================================
// WEBSOCKET EVENTS
// ========================================

export interface WebSocketEvent {
  type: string;
  payload: any;
}

export interface NewMessageEvent {
  type: 'NEW_MESSAGE';
  payload: {
    conversation_id: string;
    message: Message;
  };
}

export interface ConversationUpdatedEvent {
  type: 'CONVERSATION_UPDATED';
  payload: {
    conversation: Conversation;
  };
}

export interface InstanceStatusEvent {
  type: 'INSTANCE_STATUS';
  payload: {
    instance_id: string;
    status: InstanceStatus;
    qr_code?: string;
  };
}

// ========================================
// UTILITY TYPES
// ========================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
