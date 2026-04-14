// 跟进记录类型枚举
export type FollowUpType = 'phone_call' | 'online_meeting' | 'onsite_visit' | 'email' | 'im_chat' | 'other';

// 跟进类型配置
export interface FollowUpTypeConfig {
  key: FollowUpType;
  label: string;
  color: string;
  icon: string;
}

// 跟进记录
export interface FollowUpRecord {
  id: string;
  customer_id: string;
  follow_up_type: FollowUpType;
  follow_up_time: string;
  created_by: string;
  creator_name?: string;
  participants: string[];
  content: string;
  customer_feedback: string;
  next_reminder_time: string | null;
  related_opportunity_id: string | null;
  opportunity_name?: string | null;
  attachments: string[];
  duration_minutes: number;
  custom_fields?: {
    address?: string;  // 上门拜访地址
    phone_number?: string;  // 拨打电话
    call_result?: string;  // 通话结果
    meeting_link?: string;  // 会议链接
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  // KPI埋点字段
  processing_time?: number;
}

// 重复提交错误响应
export interface DuplicateSubmitError {
  error: string;
  is_duplicate: boolean;
  recent_record_id: string;
}

// 客户
export interface Customer {
  id: string;
  customer_code?: string;
  name: string;
  industry?: string;
  scale?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  owner_id: string;
  owner_name?: string;
  status?: string;
  source?: string;
  level?: string;
  annual_revenue?: number;
  employee_count?: number;
  website?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

// 商机
export interface Opportunity {
  id: string;
  name: string;
  customerId: string;
  amount: number;
  stage: string;
  expectedCloseDate: string;
}

// 用户
export interface User {
  id: string;
  name: string;
  role: 'sales' | 'manager' | 'admin';
  department: string;
  email: string;
}

// 跟进统计
export interface FollowUpStats {
  totalCount: number;
  lastFollowUp: string | null;
  upcomingReminder: string | null;
  nextFollowUpCountdown: number | null;
  activityScore: number;
  typeStats: Record<FollowUpType, number>;
  followUpByStats: Record<string, number>;
  totalDuration: number;
  avgContentLength: number;
}

// 创建跟进记录的请求参数
export interface CreateFollowUpParams {
  customer_id: string;
  follow_up_type: FollowUpType;
  follow_up_time: string;
  created_by: string;
  participants?: string[];
  content: string;
  customer_feedback?: string;
  next_reminder_time?: string | null;
  related_opportunity_id?: string | null;
  attachments?: string[];
  duration_minutes?: number;
}

// 更新跟进记录的请求参数
export interface UpdateFollowUpParams {
  follow_up_type?: FollowUpType;
  follow_up_time?: string;
  participants?: string[];
  content?: string;
  customer_feedback?: string;
  next_reminder_time?: string | null;
  related_opportunity_id?: string | null;
  attachments?: string[];
  duration_minutes?: number;
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  records: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 筛选参数
export interface FollowUpFilterParams {
  type?: FollowUpType;
  followUpBy?: string;
  startDate?: string;
  endDate?: string;
}