import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Customer, FollowUpRecord, FollowUpStats, FollowUpType, User } from '../types';
import { FOLLOW_UP_TYPES } from '../constants/followUpTypes';
import FollowUpTimeline from '../components/FollowUpTimeline';
import FollowUpForm from '../components/FollowUpForm';
import FollowUpDetailDrawer from '../components/FollowUpDetailDrawer';
import FollowUpStatsCard from '../components/FollowUpStatsCard';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'followups' | 'info' | 'orders' | 'analytics';

const CustomerDetail: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { isAdmin, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('followups');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<FollowUpStats | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState<FollowUpType | ''>('');
  const [expanded, setExpanded] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FollowUpRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<FollowUpRecord | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [relatedRecord, setRelatedRecord] = useState<FollowUpRecord | null>(null);

  useEffect(() => {
    if (customerId) {
      loadData();
    }
  }, [customerId]);

  const loadData = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      const [customerData, overviewData] = await Promise.all([
        api.getCustomerById(customerId),
        api.getCustomerOverview(customerId),
      ]);

      setCustomer(customerData);
      setStats(overviewData as any);
      await loadFollowUps();
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowUps = async () => {
    if (!customerId) return;

    try {
      const data = await api.getCustomerFollowUps(customerId, {
        type: filterType || undefined,
        page_size: 20,
      });
      setFollowUps(data.items);
    } catch (error) {
      console.error('加载跟进记录失败:', error);
    }
  };

  useEffect(() => {
    loadFollowUps();
  }, [filterType, customerId]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreateFollowUp = async (data: any) => {
    if (!customerId) {
      throw new Error('客户ID不存在');
    }
    if (!currentUser) {
      throw new Error('用户未登录，请刷新页面重试');
    }

    try {
      setErrorMessage(null);
      await api.createFollowUp(customerId, {
        follow_up_type: data.follow_up_type,
        follow_up_time: data.follow_up_time,
        content: data.content,
        customer_feedback: data.customer_feedback,
        next_reminder_time: data.next_reminder_time,
        related_opportunity_id: data.related_opportunity_id,
        attachments: data.attachments,
        duration_minutes: data.duration_minutes,
      }, data.processing_time);

      setShowForm(false);
      setRelatedRecord(null);
      await loadData();
    } catch (error: any) {
      console.error('创建跟进记录失败:', error);
      const errorMsg = error?.error || error?.message || '创建失败，请重试';
      setErrorMessage(errorMsg);
      throw error;
    }
  };

  const handleUpdateFollowUp = async (data: any) => {
    if (!editingRecord) return;

    try {
      await api.updateFollowUp(editingRecord.id, data);
      setEditingRecord(null);
      setShowForm(false);
      await loadData();
    } catch (error: any) {
      console.error('更新跟进记录失败:', error);
      throw error;
    }
  };

  const handleDeleteFollowUp = async (id: string) => {
    if (!confirm('确定要撤销这条跟进记录吗？撤销后将标记为"已撤销"状态。')) return;

    try {
      await api.deleteFollowUp(id);
      setShowDetailDrawer(false);
      setDetailRecord(null);
      await loadData();
    } catch (error) {
      console.error('删除跟进记录失败:', error);
    }
  };

  const handleViewDetail = (record: FollowUpRecord) => {
    setDetailRecord(record);
    setShowDetailDrawer(true);
  };

  const handleEditRecord = (record: FollowUpRecord) => {
    setEditingRecord(record);
    setShowDetailDrawer(false);
    setShowForm(true);
  };

  const handleContinueFollowUp = (record: FollowUpRecord) => {
    setRelatedRecord(record);
    setShowDetailDrawer(false);
    setDetailRecord(null);
    setEditingRecord(null);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="loading-spinner"></div>
          加载中...
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-icon">❌</div>
          <div className="empty-title">客户不存在</div>
          <button className="btn btn-primary" onClick={() => navigate('/customers')}>
            返回客户列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* 页面头部 */}
      <div className="page-header">
        <div>
          <button className="btn btn-default" onClick={() => navigate('/customers')} style={{ marginBottom: 12 }}>
            ← 返回客户列表
          </button>
          <h1 className="page-title">{customer.name}</h1>
          <p className="page-subtitle">{customer.industry} | {(customer as any).contact_name} | {(customer as any).contact_phone}</p>
        </div>

        {/* 错误提示 */}
        {errorMessage && (
          <div style={{
            background: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 4,
            padding: '12px 16px',
            marginBottom: 16,
            color: '#ff4d4f',
          }}>
            ❌ {errorMessage}
            <button
              onClick={() => setErrorMessage(null)}
              style={{
                marginLeft: 16,
                border: 'none',
                background: 'none',
                color: '#ff4d4f',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )}

        <button className="btn btn-primary" onClick={() => { setEditingRecord(null); setRelatedRecord(null); setShowForm(true); }}>
          + 添加跟进记录
        </button>
      </div>

      {/* 标签页导航 */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 20,
        borderBottom: '1px solid #d9d9d9',
        paddingBottom: 0,
        overflowX: 'auto',
      }}>
        {[
          { key: 'followups', label: '跟进记录', icon: '📅' },
          { key: 'info', label: '客户信息', icon: '🏢' },
          { key: 'orders', label: '订单记录', icon: '📦' },
          { key: 'analytics', label: '数据分析', icon: '📊' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 14,
              color: activeTab === tab.key ? '#1890FF' : '#8C8C8C',
              borderBottom: activeTab === tab.key ? '2px solid #1890FF' : '2px solid transparent',
              marginBottom: -1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.key === 'followups' && stats && (stats as any).total_followup_count > 0 && (
              <span style={{
                background: '#ff4d4f',
                color: '#fff',
                borderRadius: '50%',
                minWidth: 20,
                height: 20,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                padding: '0 6px',
              }}>
                {(stats as any).total_followup_count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 跟进记录标签页 */}
      {activeTab === 'followups' && (
        <>
          {/* 统计概览卡片 */}
          <FollowUpStatsCard stats={stats} customerName={customer.name} />

          {/* 统计卡片 */}
          {stats && (stats as any).total_followup_count > 0 && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">总跟进次数</div>
                <div className="stat-value">{(stats as any).total_followup_count} 次</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">活跃热度评分</div>
                <div className="stat-value">{(stats as any).activity_score || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">最近跟进时间</div>
                <div className="stat-value">{(stats as any).last_followup_time ? new Date((stats as any).last_followup_time).toLocaleDateString() : '暂无'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">本月跟进</div>
                <div className="stat-value" style={{ color: '#1890FF' }}>
                  {(stats as any).recent_followup_count_30d || 0} 次
                </div>
              </div>
            </div>
          )}

          {/* 筛选栏 */}
          <div className="filter-bar">
            <div className="filter-item">
              <span className="filter-label">跟进类型:</span>
              <select
                className="form-select"
                style={{ width: 140 }}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FollowUpType | '')}
              >
                <option value="">全部</option>
                {FOLLOW_UP_TYPES.map((type) => (
                  <option key={type.key} value={type.key}>{type.icon} {type.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 时间轴视图 */}
          <div className="card">
            <div className="card-title">📅 跟进时间轴</div>

            {/* 空状态设计 */}
            {followUps.length === 0 ? (
              <div className="empty-state">
                <div className="empty-illustration">🚀</div>
                <div className="empty-title">记录第一次客户互动，开启跟进旅程</div>
                <div className="empty-desc">
                  点击下方按钮，记录您与客户的第一次互动，开启客户全生命周期管理
                </div>
                <button
                  className="btn btn-primary btn-large"
                  onClick={() => { setEditingRecord(null); setRelatedRecord(null); setShowForm(true); }}
                >
                  + 记录首次跟进
                </button>
              </div>
            ) : (
              <>
                <FollowUpTimeline
                  records={expanded ? followUps : followUps.slice(0, 3)}
                  onViewDetail={handleViewDetail}
                  onEdit={handleEditRecord}
                  onDelete={handleDeleteFollowUp}
                  currentUserId={currentUser?.id}
                  currentUserRole={currentUser?.role}
                />
                {followUps.length > 3 && (
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <button
                      className="btn btn-default"
                      onClick={() => setExpanded(!expanded)}
                    >
                      {expanded ? '收起历史' : `展开历史 (${followUps.length - 3} 条)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* 客户信息标签页 */}
      {activeTab === 'info' && (
        <div className="card">
          <div className="card-title">🏢 客户基本信息</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 4 }}>客户名称</div>
              <div style={{ fontSize: 14 }}>{customer.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 4 }}>行业类型</div>
              <div style={{ fontSize: 14 }}>{customer.industry || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 4 }}>联系人</div>
              <div style={{ fontSize: 14 }}>{(customer as any).contact_name || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 4 }}>联系电话</div>
              <div style={{ fontSize: 14 }}>{(customer as any).contact_phone || '-'}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 4 }}>地址</div>
              <div style={{ fontSize: 14 }}>{(customer as any).address || '-'}</div>
            </div>
          </div>
        </div>
      )}

      {/* 订单记录标签页 */}
      {activeTab === 'orders' && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-illustration">📦</div>
            <div className="empty-title">暂无订单记录</div>
            <div className="empty-desc">订单功能开发中...</div>
          </div>
        </div>
      )}

      {/* 数据分析标签页 */}
      {activeTab === 'analytics' && (
        <div className="card">
          <div className="card-title">📊 销售数据分析</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="stat-card">
              <div className="stat-label">本月跟进次数</div>
              <div className="stat-value">{(stats as any)?.total_followup_count || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">活跃热度评分</div>
              <div className="stat-value success">{(stats as any)?.activity_score || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* 跟进记录表单 - 侧滑抽屉 */}
      {showForm && (
        <FollowUpForm
          record={editingRecord}
          customerId={customerId!}
          currentUser={currentUser}
          onSave={editingRecord ? handleUpdateFollowUp : handleCreateFollowUp}
          onCancel={() => { setShowForm(false); setEditingRecord(null); setRelatedRecord(null); }}
          isOpen={showForm}
          relatedRecord={relatedRecord}
        />
      )}

      {/* 跟进记录详情抽屉 */}
      {showDetailDrawer && detailRecord && (
        <FollowUpDetailDrawer
          record={detailRecord}
          onClose={() => { setShowDetailDrawer(false); setDetailRecord(null); }}
          onEdit={() => handleEditRecord(detailRecord)}
          onDelete={() => handleDeleteFollowUp(detailRecord.id)}
          onContinueFollowUp={() => handleContinueFollowUp(detailRecord)}
          currentUserId={currentUser?.id}
          currentUserRole={currentUser?.role}
        />
      )}
    </div>
  );
};

export default CustomerDetail;