import React, { useState } from 'react';
import { FollowUpRecord } from '../types';
import { getFollowUpTypeConfig } from '../constants/followUpTypes';
import dayjs from 'dayjs';

interface FollowUpTimelineProps {
  records: FollowUpRecord[];
  onViewDetail: (record: FollowUpRecord) => void;
  onEdit: (record: FollowUpRecord) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
  currentUserRole?: string;
}

const FollowUpTimeline: React.FC<FollowUpTimelineProps> = ({
  records,
  onViewDetail,
  onEdit,
  onDelete,
  currentUserId,
  currentUserRole,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const canEdit = (record: FollowUpRecord): boolean => {
    if (currentUserRole === 'admin' || currentUserRole === 'manager') return true;
    if (record.created_by === currentUserId) {
      const createdTime = dayjs(record.created_at);
      const now = dayjs();
      const hoursDiff = now.diff(createdTime, 'hour');
      return hoursDiff <= 24;
    }
    return false;
  };

  const formatTime = (dateStr: string) => {
    const date = dayjs(dateStr);
    const now = dayjs();
    const diffDays = now.diff(date, 'day');

    if (diffDays === 0) {
      return `今天 ${date.format('HH:mm')}`;
    } else if (diffDays === 1) {
      return `昨天 ${date.format('HH:mm')}`;
    } else if (diffDays < 7) {
      return `${diffDays}天前 ${date.format('HH:mm')}`;
    } else {
      return date.format('YYYY-MM-DD HH:mm');
    }
  };

  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 判断是否为移动端
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="timeline">
      {records.map((record) => {
        // 安全获取类型配置
        const typeConfig = record?.follow_up_type 
          ? getFollowUpTypeConfig(record.follow_up_type)
          : { color: '#8C8C8C', icon: '📋', label: '未知类型' };
        const isExpanded = expandedItems.has(record.id);
        const plainContent = stripHtml(record.content || '');
        const isLongContent = plainContent.length > 100;

        return (
          <div key={record.id} className="timeline-item">
            <div
              className={`timeline-dot ${record.follow_up_type}`}
              title={typeConfig.label}
            >
              {typeConfig.icon}
            </div>

            <div
              className="timeline-content"
              onClick={() => onViewDetail(record)}
            >
              {/* 头部：类型标签 + 时间 */}
              <div className="timeline-header">
                <div className="timeline-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`tag tag-${record.follow_up_type}`}>
                    {typeConfig.icon} {typeConfig.label}
                  </span>
                  {record.duration_minutes > 0 && (
                    <span style={{ fontSize: 12, color: '#8C8C8C' }}>
                      ⏱ {record.duration_minutes}分钟
                    </span>
                  )}
                </div>
                <div className="timeline-time">
                  {formatTime(record.follow_up_time)}
                </div>
              </div>

              {/* 内容预览 */}
              <div className="timeline-summary">
                {isExpanded || !isLongContent
                  ? plainContent
                  : `${plainContent.slice(0, 100)}...`}
              </div>

              {/* 可展开/收起的更多内容 */}
              {isLongContent && (
                <button
                  onClick={(e) => toggleExpand(record.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1890FF',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: 0,
                    marginTop: 4,
                  }}
                >
                  {isExpanded ? '收起' : '展开全部'}
                </button>
              )}

              {/* 元信息 */}
              {record.creator_name && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#8C8C8C' }}>
                  👤 {record.creator_name}
                  {record.participants && record.participants.length > 0 && ' 等'}
                </div>
              )}

              {/* 标签 */}
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                {record.attachments && record.attachments.length > 0 && (
                  <span style={{ fontSize: 12, color: '#8C8C8C' }}>
                    📎 {record.attachments.length}个附件
                  </span>
                )}
                {record.related_opportunity_id && (
                  <span style={{ fontSize: 12, color: '#8C8C8C' }}>
                    💼 关联商机
                  </span>
                )}
                {record.next_reminder_time && (
                  <span style={{ fontSize: 12, color: '#FAAD14' }}>
                    ⏰ 跟进提醒
                  </span>
                )}
              </div>

              {/* 操作按钮 */}
              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-default"
                  style={{ padding: '4px 12px', fontSize: 12 }}
                  onClick={(e) => { e.stopPropagation(); onViewDetail(record); }}
                >
                  查看详情
                </button>
                {canEdit(record) && (
                  <>
                    <button
                      className="btn btn-default"
                      style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={(e) => { e.stopPropagation(); onEdit(record); }}
                    >
                      编辑
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
                    >
                      撤销
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FollowUpTimeline;