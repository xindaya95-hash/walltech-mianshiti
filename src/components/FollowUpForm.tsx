import React, { useState, useEffect, useRef, useCallback } from 'react';
import dayjs from 'dayjs';
import { api } from '../services/api';
import { FollowUpRecord, FollowUpType, User, Opportunity } from '../types';
import { FOLLOW_UP_TYPES } from '../constants/followUpTypes';

interface FollowUpFormProps {
  record: FollowUpRecord | null;
  customerId: string;
  currentUser: User | null;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
  relatedRecord?: FollowUpRecord | null;
}

// 模板话术配置
const TEMPLATE_PHRASES = {
  phone_call: [
    '已电话沟通，客户需求已明确，等待报价。',
    '电话无人接听，已发短信告知稍后再次联系。',
    '电话沟通中客户提及竞品在谈，需尽快安排演示。',
  ],
  online_meeting: [
    '已完成线上演示，客户对功能无异议，讨论价格中。',
    '会议主要讨论合作方案细节，已约定下次会议时间。',
    '演示效果良好，客户表示需要内部讨论后回复。',
  ],
  onsite_visit: [
    '已上门拜访，参观了客户仓库，了解发货流程。',
    '拜访客户工厂，双方就物流方案深入探讨。',
    '上门沟通顺利，客户对我们的服务表示认可。',
  ],
  email: [
    '已发送报价单，等待客户回复。',
    '邮件回复客户疑问，已提供详细方案说明。',
    '发送合作方案文档，等待客户反馈。',
  ],
  im_chat: [
    '微信沟通，已发送产品资料。',
    'IM聊天回复客户咨询，问题已解决。',
    '微信交流中客户表示有合作意向。',
  ],
  other: [
    '已与客户建立联系，持续跟进中。',
    '通过其他渠道与客户沟通。',
  ],
};

// 各类型特有的扩展字段
const TYPE_SPECIFIC_FIELDS: Record<FollowUpType, { field: string; label: string; type: string; placeholder?: string }[]> = {
  phone_call: [
    { field: 'phone_number', label: '拨打电话', type: 'tel', placeholder: '请输入电话号码' },
    { field: 'call_result', label: '通话结果', type: 'select', placeholder: '请选择通话结果' },
  ],
  online_meeting: [
    { field: 'meeting_link', label: '会议链接', type: 'url', placeholder: '请输入会议链接' },
    { field: 'meeting_platform', label: '会议平台', type: 'select', placeholder: '请选择会议平台' },
  ],
  onsite_visit: [
    { field: 'visit_address', label: '拜访地址', type: 'text', placeholder: '请输入拜访地址' },
    { field: 'visit_purpose', label: '拜访目的', type: 'select', placeholder: '请选择拜访目的' },
  ],
  email: [
    { field: 'email_subject', label: '邮件主题', type: 'text', placeholder: '请输入邮件主题' },
    { field: 'email_reply_expected', label: '期望回复时间', type: 'datetime-local' },
  ],
  im_chat: [
    { field: 'im_platform', label: '沟通平台', type: 'select', placeholder: '请选择沟通平台' },
    { field: 'im_account', label: '对方账号', type: 'text', placeholder: '请输入对方账号' },
  ],
  other: [],
};

const CALL_RESULTS = ['已接通', '无人接听', '号码错误', '占线', '直接挂断'];
const MEETING_PLATFORMS = ['腾讯会议', '钉钉会议', '飞书会议', 'Zoom', 'Microsoft Teams', '其他'];
const VISIT_PURPOSES = ['初次拜访', '项目洽谈', '售后拜访', '关系维护', '其他'];
const IM_PLATFORMS = ['微信', '企业微信', '钉钉', '飞书', 'WhatsApp', '其他'];

const FollowUpForm: React.FC<FollowUpFormProps> = ({
  record,
  customerId,
  currentUser,
  onSave,
  onCancel,
  isOpen,
  relatedRecord,
}) => {
  const startTimeRef = useRef(Date.now());
  const draftKeyRef = useRef(`draft_followup_${customerId}_${record?.id || 'new'}`);

  const [formData, setFormData] = useState({
    follow_up_type: record?.follow_up_type || 'phone_call' as FollowUpType,
    follow_up_time: record?.follow_up_time
      ? dayjs(record.follow_up_time).format('YYYY-MM-DDTHH:mm')
      : dayjs().format('YYYY-MM-DDTHH:mm'),
    participants: record?.participants || [] as string[],
    content: record?.content || '',
    customer_feedback: record?.customer_feedback || '',
    next_reminder_time: record?.next_reminder_time
      ? dayjs(record.next_reminder_time).format('YYYY-MM-DDTHH:mm')
      : '',
    related_opportunity_id: record?.related_opportunity_id || '',
    attachments: record?.attachments || [] as string[],
    duration_minutes: record?.duration_minutes || 0,
    phone_number: '',
    call_result: '',
    meeting_link: '',
    meeting_platform: '',
    visit_address: '',
    visit_purpose: '',
    email_subject: '',
    email_reply_expected: '',
    im_platform: '',
    im_account: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [savingType, setSavingType] = useState<'save' | 'saveAndNew' | null>(null);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [version, setVersion] = useState(record?.updated_at || dayjs().toISOString());

  useEffect(() => {
    if (isOpen) {
      loadOpportunities();
      loadUsers();
      checkDraft();
    }
  }, [isOpen, customerId]);

  useEffect(() => {
    if (relatedRecord && isOpen) {
      setFormData(prev => ({
        ...prev,
        content: `<p>@${relatedRecord?.creator_name || '同事'} 继续跟进：</p><p>针对上次${getTypeLabel(relatedRecord?.follow_up_type)}的反馈：</p><p></p>`,
        customer_feedback: relatedRecord.customer_feedback || '',
      }));
    }
  }, [relatedRecord, isOpen]);

  const getTypeLabel = (type: string) => {
    return FOLLOW_UP_TYPES.find(t => t.key === type)?.label || type;
  };

  const loadOpportunities = async () => {
    try {
      const data = await api.getOpportunities(customerId);
      setOpportunities(data.opportunities);
    } catch (error) {
      console.error('加载商机失败:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await api.getUsers();
      setAllUsers(users);
    } catch (error) {
      console.error('加载用户失败:', error);
    }
  };

  const checkDraft = useCallback(() => {
    try {
      const draft = localStorage.getItem(draftKeyRef.current);
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        if (dayjs().isBefore(dayjs(parsedDraft.savedAt).add(24, 'hour'))) {
          setHasDraft(true);
          setShowDraftModal(true);
        } else {
          localStorage.removeItem(draftKeyRef.current);
        }
      }
    } catch (error) {
      console.error('检查草稿失败:', error);
    }
  }, []);

  const saveDraft = useCallback(() => {
    try {
      const draft = { ...formData, savedAt: dayjs().toISOString() };
      localStorage.setItem(draftKeyRef.current, JSON.stringify(draft));
    } catch (error) {
      console.error('保存草稿失败:', error);
    }
  }, [formData]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKeyRef.current);
    setHasDraft(false);
  }, []);

  const restoreDraft = () => {
    try {
      const draft = localStorage.getItem(draftKeyRef.current);
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        setFormData(prev => ({ ...prev, ...parsedDraft }));
        setShowDraftModal(false);
      }
    } catch (error) {
      console.error('恢复草稿失败:', error);
    }
  };

  useEffect(() => {
    if (isOpen && formData.content) {
      const timer = setTimeout(() => saveDraft(), 3000);
      return () => clearTimeout(timer);
    }
  }, [formData, isOpen, saveDraft]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.follow_up_type) {
      newErrors.follow_up_type = '请选择跟进类型';
    }
    if (!formData.follow_up_time) {
      newErrors.follow_up_time = '请选择跟进时间';
    }
    if (!formData.content || formData.content.trim() === '') {
      newErrors.content = '请输入沟通内容';
    }
    if (formData.follow_up_type === 'onsite_visit' && !formData.visit_address) {
      newErrors.visit_address = '请输入拜访地址';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, action?: 'save' | 'saveAndNew') => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    setSavingType(action || 'save');

    try {
      const processingTime = Math.round((Date.now() - startTimeRef.current) / 1000);

      const { phone_number, call_result, meeting_link, meeting_platform, visit_address, visit_purpose, email_subject, email_reply_expected, im_platform, im_account, ...rest } = formData;

      await onSave({
        ...rest,
        next_reminder_time: formData.next_reminder_time || null,
        related_opportunity_id: formData.related_opportunity_id || null,
        custom_fields: {
          phone_number, call_result, meeting_link, meeting_platform,
          visit_address, visit_purpose, email_subject, email_reply_expected,
          im_platform, im_account,
        },
        processing_time: processingTime,
        version,
      });

      clearDraft();

      if (action === 'saveAndNew') {
        startTimeRef.current = Date.now();
        draftKeyRef.current = `draft_followup_${customerId}_new`;
        setFormData({
          follow_up_type: 'phone_call',
          follow_up_time: dayjs().format('YYYY-MM-DDTHH:mm'),
          participants: [],
          content: '',
          customer_feedback: '',
          next_reminder_time: '',
          related_opportunity_id: '',
          attachments: [],
          duration_minutes: 0,
          phone_number: '',
          call_result: '',
          meeting_link: '',
          meeting_platform: '',
          visit_address: '',
          visit_purpose: '',
          email_subject: '',
          email_reply_expected: '',
          im_platform: '',
          im_account: '',
        });
        setErrors({});
        setVersion(dayjs().toISOString());
      }
    } catch (error: any) {
      console.error('保存失败:', error);
      const errorMsg = error?.error || error?.message || '保存失败，请重试';
      alert(errorMsg); // 临时用alert显示错误
    } finally {
      setSaving(false);
      setSavingType(null);
    }
  };

  const handleParticipantChange = (userId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      participants: checked
        ? [...prev.participants, userId]
        : prev.participants.filter(id => id !== userId),
    }));
  };

  const handleContentChange = (content: string) => {
    setFormData(prev => ({ ...prev, content }));

    const lastIndex = content.lastIndexOf('@');
    if (lastIndex !== -1) {
      const textAfterAt = content.slice(lastIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('<')) {
        setMentionSearch(textAfterAt);
        setShowMentionList(true);
      } else {
        setShowMentionList(false);
      }
    } else {
      setShowMentionList(false);
    }
  };

  const insertTemplate = (phrase: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + `<p>${phrase}</p>`,
    }));
  };

  const insertMention = (user: User) => {
    const content = formData.content;
    const lastIndex = content.lastIndexOf('@');
    const newContent = content.slice(0, lastIndex) + `@${user.name} `;
    setFormData(prev => ({ ...prev, content: newContent }));
    setShowMentionList(false);
  };

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const typeSpecificFields = TYPE_SPECIFIC_FIELDS[formData.follow_up_type] || [];

  // 判断是否为移动端
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onCancel}></div>
      <div className="drawer">
        <div className="drawer-header">
          <div className="drawer-title">
            {record ? '📝 编辑跟进记录' : relatedRecord ? '🔄 继续跟进' : '➕ 新增跟进记录'}
          </div>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, 'save')} className="drawer-body">
          {/* SegmentedControl 类型选择器 */}
          <div className="form-group">
            <label className="form-label required">跟进类型</label>
            <div className="segmented-control">
              {FOLLOW_UP_TYPES.map((type) => (
                <button
                  key={type.key}
                  type="button"
                  className={`segmented-item ${type.key} ${formData.follow_up_type === type.key ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, follow_up_type: type.key }))}
                >
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 类型特有字段 */}
          {typeSpecificFields.length > 0 && (
            <div className="form-group" style={{
              padding: 12,
              background: '#f0f5ff',
              borderRadius: 8,
              marginBottom: 16,
            }}>
              {typeSpecificFields.map((field) => (
                <div key={field.field} style={{ marginBottom: 12 }}>
                  <label className="form-label" style={{ fontSize: 13 }}>{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      className="form-select"
                      value={formData[field.field as keyof typeof formData] as string}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.field]: e.target.value }))}
                      style={{ fontSize: 13 }}
                    >
                      <option value="">{field.placeholder}</option>
                      {field.field === 'call_result' && CALL_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                      {field.field === 'meeting_platform' && MEETING_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                      {field.field === 'visit_purpose' && VISIT_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                      {field.field === 'im_platform' && IM_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      className="form-input"
                      value={formData[field.field as keyof typeof formData] as string}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.field]: e.target.value }))}
                      placeholder={field.placeholder}
                      style={{ fontSize: 13 }}
                    />
                  )}
                  {errors[field.field] && (
                    <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 2 }}>{errors[field.field]}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 跟进时间 - DateTimePicker */}
          <div className="form-group">
            <label className="form-label required">跟进时间</label>
            <input
              type="datetime-local"
              className="form-input"
              value={formData.follow_up_time}
              onChange={(e) => setFormData(prev => ({ ...prev, follow_up_time: e.target.value }))}
            />
          </div>

          {/* 沟通时长 */}
          <div className="form-group">
            <label className="form-label">沟通时长（分钟）</label>
            <input
              type="number"
              className="form-input"
              min="0"
              value={formData.duration_minutes}
              onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
              placeholder="请输入沟通时长"
            />
          </div>

          {/* 参与人员 */}
          <div className="form-group">
            <label className="form-label">参与人员</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {allUsers.map((user) => (
                <label
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: '1px solid #d9d9d9',
                    cursor: 'pointer',
                    background: formData.participants.includes(user.id) ? '#1890FF15' : '#fff',
                    fontSize: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.participants.includes(user.id)}
                    onChange={(e) => handleParticipantChange(user.id, e.target.checked)}
                  />
                  <span>{user.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 模板话术 */}
          <div className="form-group">
            <label className="form-label">💡 快捷话术</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TEMPLATE_PHRASES[formData.follow_up_type]?.slice(0, 3).map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => insertTemplate(phrase)}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    background: '#fafafa',
                    fontSize: 11,
                    cursor: 'pointer',
                    color: '#8C8C8C',
                  }}
                >
                  {phrase.slice(0, 10)}...
                </button>
              ))}
            </div>
          </div>

          {/* 沟通内容 */}
          <div className="form-group">
            <label className="form-label required">沟通内容</label>
            <textarea
              className="form-input"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="请输入沟通内容..."
              style={{ height: 120, resize: 'vertical' }}
            />
            {errors.content && (
              <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{errors.content}</div>
            )}
          </div>

          {/* 客户反馈 */}
          <div className="form-group">
            <label className="form-label">客户反馈</label>
            <input
              type="text"
              className="form-input"
              value={formData.customer_feedback}
              onChange={(e) => setFormData(prev => ({ ...prev, customer_feedback: e.target.value }))}
              placeholder="请简要描述客户反馈"
              maxLength={500}
            />
          </div>

          {/* 下次跟进提醒 */}
          <div className="form-group">
            <label className="form-label">⏰ 下次跟进提醒</label>
            <input
              type="datetime-local"
              className="form-input"
              value={formData.next_reminder_time}
              onChange={(e) => setFormData(prev => ({ ...prev, next_reminder_time: e.target.value }))}
            />
          </div>

          {/* 关联商机 */}
          <div className="form-group">
            <label className="form-label">💼 关联商机</label>
            <select
              className="form-select"
              value={formData.related_opportunity_id}
              onChange={(e) => setFormData(prev => ({ ...prev, related_opportunity_id: e.target.value }))}
            >
              <option value="">不关联</option>
              {opportunities.map((opp) => (
                <option key={opp.id} value={opp.id}>{opp.name}</option>
              ))}
            </select>
          </div>

          {/* 附件上传 */}
          <div className="form-group">
            <label className="form-label">📎 附件上传</label>
            <div style={{
              border: '1px dashed #d9d9d9',
              borderRadius: 6,
              padding: 16,
              textAlign: 'center',
              cursor: 'pointer',
              background: '#fafafa',
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>📎</div>
              <div style={{ color: '#8C8C8C', fontSize: 12 }}>
                点击上传（通话录音、会议纪要、照片等）
              </div>
            </div>
          </div>

          {/* 草稿提示 */}
          {hasDraft && (
            <div style={{
              padding: 8,
              background: '#fff7e6',
              borderRadius: 4,
              fontSize: 12,
              color: '#fa8c16',
              marginBottom: 12,
            }}>
              📝 检测到未保存的草稿
            </div>
          )}
        </form>

        {/* 底部操作栏 - 移到表单内部确保submit事件正确触发 */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          right: isMobile ? 0 : 'calc(100% - 600px)',
          width: isMobile ? '100%' : 600,
          background: '#fff',
          borderTop: '1px solid #d9d9d9',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <button type="button" className="btn btn-default" onClick={onCancel}>
            取消
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {!record && (
              <button
                type="button"
                className="btn btn-default"
                onClick={(e) => handleSubmit(e as any, 'saveAndNew')}
                disabled={saving}
              >
                {saving && savingType === 'saveAndNew' ? '保存中...' : '保存并新增'}
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={(e) => handleSubmit(e as any, 'save')}
            >
              {saving && savingType === 'save' ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>

      {/* 草稿恢复确认弹窗 */}
      {showDraftModal && (
        <div className="modal-overlay" onClick={() => setShowDraftModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">📝 恢复草稿</div>
              <button className="modal-close" onClick={() => setShowDraftModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16 }}>检测到您有未保存的跟进记录草稿，是否要恢复？</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-default"
                onClick={() => { clearDraft(); setShowDraftModal(false); }}
              >
                丢弃草稿
              </button>
              <button
                className="btn btn-primary"
                onClick={restoreDraft}
              >
                恢复草稿
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FollowUpForm;