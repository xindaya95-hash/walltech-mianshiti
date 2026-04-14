import {
  FollowUpRecord,
  FollowUpTypeConfig,
  Customer,
  Opportunity,
  User,
  FollowUpStats,
  CreateFollowUpParams,
  UpdateFollowUpParams,
  PaginatedResponse,
  FollowUpFilterParams,
} from '../types';

const API_BASE = '/api/v1/crm';

class ApiService {
  private getAuthHeaders(): Record<string, string> {
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const headers: Record<string, string> = {};
    if (userId) {
      headers['X-User-Id'] = userId;
    }
    if (userRole) {
      headers['X-User-Role'] = userRole;
    }
    return headers;
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const authHeaders = this.getAuthHeaders();
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      // 抛出包含额外信息的错误对象
      const err = new Error(error.error || 'Request failed') as any;
      err.is_duplicate = error.is_duplicate;
      err.recent_record_id = error.recent_record_id;
      throw err;
    }

    return response.json();
  }

  // ============ 跟进记录相关 ============

  // 获取跟进类型配置
  async getFollowUpTypes(): Promise<{ types: FollowUpTypeConfig[] }> {
    return this.request('/follow-ups/types');
  }

  // 创建跟进记录 - 接口1
  async createFollowUp(
    customerId: string,
    params: {
      follow_up_type: string;
      follow_up_time: string;
      content: string;
      customer_feedback?: string;
      next_reminder_time?: string | null;
      related_opportunity_id?: string | null;
      attachments?: string[];
      duration_minutes?: number;
    },
    processingTime?: number
  ): Promise<FollowUpRecord> {
    const headers: Record<string, string> = {};
    if (processingTime) {
      headers['X-Processing-Time'] = String(processingTime);
    }

    return this.request(`/customers/${customerId}/follow-ups`, {
      method: 'POST',
      body: JSON.stringify(params),
      headers,
    });
  }

  // 获取客户的所有跟进记录 - 接口2
  async getCustomerFollowUps(
    customerId: string,
    params?: {
      type?: string;
      start_date?: string;
      end_date?: string;
      page?: number;
      page_size?: number;
    }
  ): Promise<{
    total: number;
    items: any[];
    has_more: boolean;
    page: number;
    page_size: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.page_size) searchParams.set('page_size', String(params.page_size));

    const query = searchParams.toString();
    return this.request(`/customers/${customerId}/follow-ups${query ? `?${query}` : ''}`);
  }

  // 获取单条跟进记录详情
  async getFollowUpById(id: string): Promise<FollowUpRecord> {
    return this.request(`/follow-ups/${id}`);
  }

  // 更新跟进记录 - 接口3a
  async updateFollowUp(
    id: string,
    params: {
      follow_up_type?: string;
      follow_up_time?: string;
      content?: string;
      customer_feedback?: string;
      next_reminder_time?: string | null;
      related_opportunity_id?: string | null;
      attachments?: string[];
      duration_minutes?: number;
      version?: string;
    }
  ): Promise<FollowUpRecord> {
    return this.request(`/follow-ups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  }

  // 删除跟进记录（软删除）- 接口3b
  async deleteFollowUp(id: string): Promise<{ message: string; id: string }> {
    return this.request(`/follow-ups/${id}`, {
      method: 'DELETE',
    });
  }

  // 获取客户跟进统计（概览用）
  async getFollowUpStats(customerId: string): Promise<FollowUpStats> {
    return this.request(`/stats/${customerId}`);
  }

  // 获取客户跟进概览
  async getCustomerOverview(customerId: string): Promise<{
    customer_id: string;
    total_followup_count: number;
    last_followup_time: string | null;
    next_reminder_time: string | null;
    activity_score: number;
    recent_followup_count_30d: number;
  }> {
    return this.request(`/customers/${customerId}/overview`);
  }

  // ============ 接口4：KPI统计 ============
  async getFollowUpStatsKPI(params: {
    user_id?: string;
    start_date: string;
    end_date: string;
  }): Promise<{
    total_count: number;
    by_type: Record<string, number>;
    customer_coverage_count: number;
    avg_duration_minutes: number;
    start_date: string;
    end_date: string;
    user_id: string | null;
  }> {
    const searchParams = new URLSearchParams();
    if (params.user_id) searchParams.set('user_id', params.user_id);
    searchParams.set('start_date', params.start_date);
    searchParams.set('end_date', params.end_date);

    return this.request(`/analytics/follow-up-stats?${searchParams.toString()}`);
  }

  // ============ 客户相关 ============

  // 获取客户列表 - 适配后端返回格式
  async getCustomers(params?: { search?: string; type?: string }): Promise<{ customers: Customer[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.type) searchParams.set('type', params.type);

    const query = searchParams.toString();
    // 后端直接返回数组，需要包装成对象格式
    const data = await this.request<Customer[]>(`/customers${query ? `?${query}` : ''}`);
    return {
      customers: Array.isArray(data) ? data : [],
      total: Array.isArray(data) ? data.length : 0
    };
  }

  // 获取单个客户详情
  async getCustomerById(id: string): Promise<Customer> {
    return this.request<Customer>(`/customers/${id}`);
  }

  // 创建客户
  async createCustomer(params: {
    name: string;
    industry?: string;
    scale?: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    address?: string;
    source?: string;
    level?: string;
    annual_revenue?: number;
    employee_count?: number;
    website?: string;
    description?: string;
  }): Promise<Customer> {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // ============ 商机相关 ============

  // 获取商机列表
  async getOpportunities(customerId?: string): Promise<{ opportunities: Opportunity[] }> {
    const query = customerId ? `?customerId=${customerId}` : '';
    return this.request(`/opportunities${query}`);
  }

  // ============ 用户相关 ============

  // 获取当前用户
  async getCurrentUser(): Promise<User> {
    return this.request('/users/current');
  }

  // 获取所有用户
  async getUsers(): Promise<User[]> {
    const response = await this.request<User[]>('/users');
    // 后端返回数组，转为统一格式
    if (Array.isArray(response)) {
      return response;
    }
    return response as any;
  }
}

export const api = new ApiService();