import React from 'react';
import dayjs from 'dayjs';
import { FollowUpRecord } from '../types';
import { getFollowUpTypeConfig } from '../constants/followUpTypes';

interface FollowUpDetailDrawerProps {
  record: FollowUpRecord;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onContinueFollowUp?: () => void; // 继续跟进回调
  currentUserId?: string;
  currentUserRole?: string;
}

const FollowUpDetailDrawer: React.FC<FollowUpDetailDrawerProps> = ({
  record,
  onClose,
  onEdit,
  onDelete,
  onContinueFollowUp,
  currentUserId,
  currentUserRole,
}) => {
  // 判断是否可以编辑
  const canEdit = (): boolean => {
    if (currentUserRole === 'admin') return true;
    if (record.created_by === currentUserId) {
      const createdTime = dayjs(record.created_at);
      const now = dayjs();
      const hoursDiff = now.diff(createdTime, 'hour');
      return hoursDiff <= 24;
    }
    return false;
  };

  // 安全获取类型配置，防止无效类型导致白屏
  const typeConfig = record?.follow_up_type 
    ? getFollowUpTypeConfig(record.follow_up_type) 
    : { color: '#8C8C8C', icon: '📋', label: '未知类型' };

  const formatDateTime = (dateStr: string) => {
    return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
  };

  // 计算时间差描述
  const getTimeDiff = (dateStr: string) => {
    const diff = dayjs().diff(dayjs(dateStr), 'minute');
    if (diff < 60) return `${diff}分钟前`;
    if (diff < 1440) return `${Math.floor(diff / 60)}小时前`;
    return `${Math.floor(diff / 1440)}天前`;
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">跟进详情</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="drawer-body">
          {/* 跟进类型标识 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            background: `${typeConfig.color}15`,
            borderRadius: 8,
            marginBottom: 20,
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: typeConfig.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}>
              {typeConfig.icon}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{typeConfig.label}</div>
              <div style={{ fontSize: 13, color: '#8C8C8C' }}>
                {formatDateTime(record.follow_up_time)}
                {record.duration_minutes > 0 && ` · ${record.duration_minutes}分钟`}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8C8C8C' }}>
              {getTimeDiff(record.created_at)}
            </div>
          </div>

          {/* 基本信息 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#262626', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📋</span> 基本信息
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 2 }}>跟进人</div>
                <div style={{ fontSize: 14 }}>{record.creator_name || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 2 }}>跟进时间</div>
                <div style={{ fontSize: 14 }}>{formatDateTime(record.follow_up_time)}</div>
              </div>
              {record.duration_minutes > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 2 }}>沟通时长</div>
                  <div style={{ fontSize: 14 }}>{record.duration_minutes} 分钟</div>
                </div>
              )}
              {record.opportunity_name && (
                <div>
                  <div style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 2 }}>关联商机</div>
                  <div style={{ fontSize: 14, color: '#1890FF' }}>{record.opportunity_name}</div>
                </div>
              )}
            </div>
          </div>

          {/* 参与人员 */}
          {record.participants && record.participants.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#262626', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>👥</span> 参与人员
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {record.participants.map((participantId, index) => (
                  <span key={index} className="tag" style={{ background: '#f0f0f0', color: '#262626' }}>
                    👤 {participantId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 沟通内容 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#262626', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💬</span> 沟通内容
            </div>
            <div 
              style={{ 
                padding: 16, 
                background: '#fafafa', 
                borderRadius: 8,
                fontSize: 14,
                lineHeight: 1.8,
                maxHeight: 300,
                overflow: 'auto',
              }}
              dangerouslySetInnerHTML={{ __html: record.content }}
            />
          </div>

          {/* 客户反馈 */}
          {record.customer_feedback && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#262626', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>💡</span> 客户反馈
              </div>
              <div style={{ 
                padding: 12, 
                background: '#fff7e6', 
                borderRadius: 8,
                borderLeft: '3px solid #faad14',
                fontSize: 14,
              }}>
                {record.customer_feedback}
              </div>
            </div>
          )}

          {/* 下次跟进提醒 */}
          {record.next_reminder_time && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#262626', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⏰</span> 下次跟进提醒
              </div>
              <div style={{ 
                padding: 12, 
                background: '#e6f7ff', 
                borderRadius: 8,
                borderLeft: '3px solid #1890FF',
                fontSize: 14,
              }}>
                {formatDateTime(record.next_reminder_time)}
                {dayjs(record.next_reminder_time).isBefore(dayjs()) && (
                  <span style={{ color: '#ff4d4f', marginLeft: 8 }}>（已到期）</span>
                )}
              </div>
            </div>
          )}

          {/* 附件 */}
          {record.attachments && record.attachments.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#262626', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📎</span> 附件 ({record.attachments.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {record.attachments.map((url, index) => (
                  <a 
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: 12,
                      background: '#fafafa',
                      borderRadius: 6,
                      fontSize: 13,
                      color: '#1890FF',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>📄</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {url.split('/').pop() || url}
                    </span>
                    <span style={{ fontSize: 12, color: '#8C8C8C' }}>查看</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* KPI埋点信息 */}
          {record.processing_time && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#262626', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📊</span> 录入信息
              </div>
              <div style={{ 
                padding: 12, 
                background: '#f5f5f5', 
                borderRadius: 8,
                fontSize: 13,
                color: '#8C8C8C',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>录入耗时：</span>
                  <span>{record.processing_time} 秒</span>
                </div>
              </div>
            </div>
          )}

          {/* 元信息 */}
          <div style={{ 
            padding: 12, 
            background: '#f5f5f5', 
            borderRadius: 8,
            fontSize: 12,
            color: '#8C8C8C',
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>创建时间：</span>
              <span>{formatDateTime(record.created_at)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>更新时间：</span>
              <span>{formatDateTime(record.updated_at)}</span>
            </div>
          </div>

          {/* 操作按钮区域 */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: canEdit() ? '1fr 1fr' : '1fr',
            gap: 12,
            marginTop: 24,
          }}>
            {/* 继续跟进 - 主要操作 */}
            {onContinueFollowUp && (
              <button 
                className="btn btn-primary"
                onClick={onContinueFollowUp}
                style={{ gridColumn: '1 / -1' }}
              >
                🔄 继续跟进
              </button>
            )}
            
            {canEdit() ? (
              <>
                <button 
                  className="btn btn-default"
                  onClick={onEdit}
                >
                  ✏️ 编辑
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={onDelete}
                >
                  🗑️ 撤销
                </button>
              </>
            ) : (
              <div style={{ 
                gridColumn: '1 / -1',
                textAlign: 'center', 
                padding: 12,
                background: '#f5f5f5',
                borderRadius: 6,
                fontSize: 13,
                color: '#8C8C8C',
              }}>
                ⏰ 该记录已超出编辑时限（24小时后自动锁定）
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowUpDetailDrawer;