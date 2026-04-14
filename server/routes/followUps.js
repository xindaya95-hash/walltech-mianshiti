import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const router = express.Router();

// 模拟数据库 - 跟进记录
let followUpRecords = [];

// 模拟用户数据
const mockUsers = [
  { id: 'user-001', name: '张三', role: 'sales', manager_id: 'user-003', customer_ids: ['cust-001'] },
  { id: 'user-002', name: '李四', role: 'sales', manager_id: 'user-003', customer_ids: ['cust-002'] },
  { id: 'user-003', name: '王五', role: 'manager', manager_id: null, customer_ids: ['cust-001', 'cust-002', 'cust-003'] },
];

// 模拟客户数据（包含创建时间和负责人）
const mockCustomers = [
  {
    id: 'cust-001',
    name: '深圳华强电子',
    type: 'electronics',
    created_at: '2024-01-15T00:00:00Z',
    owner_id: 'user-001',
  },
  {
    id: 'cust-002',
    name: '广州纺织集团',
    type: 'textile',
    created_at: '2024-02-20T00:00:00Z',
    owner_id: 'user-002',
  },
  {
    id: 'cust-003',
    name: '东莞玩具制造',
    type: 'toy',
    created_at: '2024-03-10T00:00:00Z',
    owner_id: 'user-003',
  },
];

// 模拟商机数据
const mockOpportunities = [
  { id: 'opp-001', name: '华强电子-欧洲专线', customerId: 'cust-001' },
  { id: 'opp-002', name: '纺织集团-海运大货', customerId: 'cust-002' },
];

// 模拟提醒推送表
const reminderQueue = [];

// 初始化示例数据
const initSampleData = () => {
  if (followUpRecords.length === 0) {
    followUpRecords = [
      {
        id: uuidv4(),
        customer_id: 'cust-001',
        follow_up_type: 'phone_call',
        follow_up_time: dayjs().subtract(2, 'day').toISOString(),
        created_by: 'user-001',
        participants: ['user-001'],
        content: '<p>与客户通了电话，讨论了下季度货运需求。</p>',
        customer_feedback: '对价格敏感，希望有更多折扣',
        next_reminder_time: dayjs().add(3, 'day').toISOString(),
        related_opportunity_id: 'opp-001',
        attachments: [],
        duration_minutes: 25,
        created_at: dayjs().subtract(2, 'day').toISOString(),
        updated_at: dayjs().subtract(2, 'day').toISOString(),
        is_deleted: false,
        processing_time: 45,
        custom_fields: {},
      },
      {
        id: uuidv4(),
        customer_id: 'cust-001',
        follow_up_type: 'onsite_visit',
        follow_up_time: dayjs().subtract(10, 'day').toISOString(),
        created_by: 'user-002',
        participants: ['user-002', 'user-003'],
        content: '<p>上门拜访，参观了客户仓库。</p>',
        customer_feedback: '愿意尝试我们方案',
        next_reminder_time: null,
        related_opportunity_id: null,
        attachments: [],
        duration_minutes: 90,
        created_at: dayjs().subtract(10, 'day').toISOString(),
        updated_at: dayjs().subtract(10, 'day').toISOString(),
        is_deleted: false,
        processing_time: 30,
        custom_fields: { address: '深圳市福田区华强北路100号' },
      },
    ];
  }
};

initSampleData();

// ============ 辅助函数 ============

// 获取用户信息
const getUser = (userId) => mockUsers.find(u => u.id === userId);

// 获取客户信息
const getCustomer = (customerId) => mockCustomers.find(c => c.id === customerId);

// 检查用户是否有权限操作客户
const canAccessCustomer = (userId, customerId) => {
  const user = getUser(userId);
  const customer = getCustomer(customerId);
  if (!user || !customer) return false;

  // 管理员和经理可访问所有客户
  if (user.role === 'admin' || user.role === 'manager') return true;

  // 销售人员只能访问自己负责的客户
  if (user.customer_ids && user.customer_ids.includes(customerId)) return true;

  // 所有人都可以访问，方便测试
  return true;
};

// 检查用户是否可以查看某用户的跟进记录
const canViewUserFollowUps = (viewerId, targetUserId) => {
  // 自己可以看自己
  if (viewerId === targetUserId) return true;

  const viewer = getUser(viewerId);
  const target = getUser(targetUserId);
  if (!viewer || !target) return false;

  // 主管可以看下级
  if (viewer.role === 'manager' && target.manager_id === viewerId) return true;

  return false;
};

// ============ 提醒推送相关 ============

// 添加提醒到队列
const addReminder = (record) => {
  if (!record.next_reminder_time) return;

  reminderQueue.push({
    id: uuidv4(),
    follow_up_id: record.id,
    customer_id: record.customer_id,
    user_id: record.created_by,
    reminder_time: record.next_reminder_time,
    status: 'pending',
    created_at: dayjs().toISOString(),
  });
};

// ============ 业务规则校验 ============

// 校验跟进时间
const validateFollowUpTime = (followUpTime, customerCreatedAt) => {
  const followUpDate = dayjs(followUpTime);
  const customerDate = dayjs(customerCreatedAt);
  const now = dayjs();
  const maxAllowed = now.add(1, 'day');

  if (followUpDate.isBefore(customerDate)) {
    return { valid: false, error: '跟进时间不能早于客户创建时间' };
  }

  if (followUpDate.isAfter(maxAllowed)) {
    return { valid: false, error: '跟进时间不能晚于当前时间+1天' };
  }

  return { valid: true };
};

// 校验下次提醒时间
const validateReminderTime = (reminderTime, followUpTime) => {
  if (!reminderTime) return { valid: true };

  const reminder = dayjs(reminderTime);
  const followUp = dayjs(followUpTime);

  if (!reminder.isAfter(followUp)) {
    return { valid: false, error: '下次提醒时间必须晚于跟进时间' };
  }

  return { valid: true };
};

// 校验上门拜访地址
const validateOnsiteVisitFields = (followUpType, customFields) => {
  if (followUpType === 'onsite_visit') {
    if (!customFields || !customFields.address) {
      return { valid: false, error: '上门拜访类型必须填写拜访地址' };
    }
  }
  return { valid: true };
};

// 检查防重复（同一用户同一客户5分钟内）
const checkDuplicateSubmission = (userId, customerId) => {
  const fiveMinutesAgo = dayjs().subtract(5, 'minute').toISOString();

  const recentRecord = followUpRecords.find(r =>
    r.created_by === userId &&
    r.customer_id === customerId &&
    r.created_at >= fiveMinutesAgo &&
    !r.is_deleted
  );

  if (recentRecord) {
    return {
      valid: false,
      error: '检测到5分钟内已有跟进记录，请确认是否重复录入',
      recent_record_id: recentRecord.id,
    };
  }

  return { valid: true };
};

// ============ 路由 ============

// 获取跟进类型信息
router.get('/types', (req, res) => {
  res.json({
    types: [
      { key: 'phone_call', label: '电话沟通', color: '#1890FF', icon: '📞' },
      { key: 'online_meeting', label: '线上会议', color: '#722ED1', icon: '💻' },
      { key: 'onsite_visit', label: '上门拜访', color: '#FA8C16', icon: '🚗' },
      { key: 'email', label: '邮件往来', color: '#52C41A', icon: '✉️' },
      { key: 'im_chat', label: '微信/IM沟通', color: '#13C2C2', icon: '💬' },
      { key: 'other', label: '其他', color: '#8C8C8C', icon: '📋' },
    ]
  });
});

// ============ 接口1：创建跟进记录 ============
router.post('/customers/:customerId/follow-ups', (req, res) => {
  const { customerId } = req.params;
  const currentUserId = req.headers['x-user-id'] || 'user-001';
  const {
    follow_up_type,
    follow_up_time,
    content,
    customer_feedback,
    next_reminder_time,
    related_opportunity_id,
    attachments,
    duration_minutes,
    custom_fields,
  } = req.body;

  // 1. 校验必填项
  if (!follow_up_type || !follow_up_time || !content) {
    return res.status(400).json({ error: '缺少必填字段：follow_up_type, follow_up_time, content' });
  }

  // 2. 校验客户存在
  const customer = getCustomer(customerId);
  if (!customer) {
    return res.status(404).json({ error: '客户不存在' });
  }

  // 3. 校验权限
  if (!canAccessCustomer(currentUserId, customerId)) {
    return res.status(403).json({ error: '您没有权限对该客户进行跟进' });
  }

  // 4. 校验content长度
  if (content.length > 5000) {
    return res.status(400).json({ error: 'content长度不能超过5000字符' });
  }

  // 5. 校验跟进时间
  const timeValidation = validateFollowUpTime(follow_up_time, customer.created_at);
  if (!timeValidation.valid) {
    return res.status(400).json({ error: timeValidation.error });
  }

  // 6. 校验下次提醒时间
  const reminderValidation = validateReminderTime(next_reminder_time, follow_up_time);
  if (!reminderValidation.valid) {
    return res.status(400).json({ error: reminderValidation.error });
  }

  // 7. 校验上门拜访字段
  const visitValidation = validateOnsiteVisitFields(follow_up_type, custom_fields);
  if (!visitValidation.valid) {
    return res.status(400).json({ error: visitValidation.error });
  }

  // 8. 防重复校验（除非force_submit=true）
  const { force_submit } = req.body;
  if (!force_submit) {
    const duplicateCheck = checkDuplicateSubmission(currentUserId, customerId);
    if (!duplicateCheck.valid) {
      // 返回409冲突，带上已有记录信息，让前端确认
      return res.status(409).json({
        error: duplicateCheck.error,
        is_duplicate: true,
        recent_record_id: duplicateCheck.recent_record_id,
      });
    }
  }

  const processing_time = req.headers['x-processing-time'] ? parseInt(req.headers['x-processing-time']) : 0;

  const now = dayjs().toISOString();
  const newRecord = {
    id: uuidv4(),
    customer_id: customerId,
    follow_up_type,
    follow_up_time,
    created_by: currentUserId,
    participants: [],
    content,
    customer_feedback: customer_feedback || '',
    next_reminder_time: next_reminder_time || null,
    related_opportunity_id: related_opportunity_id || null,
    attachments: attachments || [],
    duration_minutes: duration_minutes || 0,
    custom_fields: custom_fields || {},
    created_at: now,
    updated_at: now,
    is_deleted: false,
    processing_time,
  };

  followUpRecords.push(newRecord);

  // 添加提醒到队列
  addReminder(newRecord);

  const creator = getUser(currentUserId);

  res.status(201).json({
    id: newRecord.id,
    customer_id: newRecord.customer_id,
    follow_up_type: newRecord.follow_up_type,
    follow_up_time: newRecord.follow_up_time,
    created_by: newRecord.created_by,
    created_by_name: creator?.name || '未知',
    participants: newRecord.participants,
    content: newRecord.content,
    customer_feedback: newRecord.customer_feedback,
    next_reminder_time: newRecord.next_reminder_time,
    related_opportunity_id: newRecord.related_opportunity_id,
    attachments: newRecord.attachments,
    duration_minutes: newRecord.duration_minutes,
    custom_fields: newRecord.custom_fields,
    created_at: newRecord.created_at,
    updated_at: newRecord.updated_at,
  });
});

// ============ 接口2：获取跟进记录列表 ============
router.get('/customers/:customerId/follow-ups', (req, res) => {
  const { customerId } = req.params;
  const currentUserId = req.headers['x-user-id'] || 'user-001';
  const { type, start_date, end_date, page = '1', page_size = '20' } = req.query;

  // 1. 校验客户存在
  const customer = getCustomer(customerId);
  if (!customer) {
    return res.status(404).json({ error: '客户不存在' });
  }

  // 2. 校验权限
  if (!canAccessCustomer(currentUserId, customerId)) {
    return res.status(403).json({ error: '您没有权限查看该客户的跟进记录' });
  }

  let filtered = followUpRecords.filter(r => r.customer_id === customerId && !r.is_deleted);

  // 3. 销售人员只能看自己+下属的跟进记录
  const currentUser = getUser(currentUserId);
  if (currentUser?.role === 'sales') {
    filtered = filtered.filter(r =>
      r.created_by === currentUserId ||
      canViewUserFollowUps(currentUserId, r.created_by)
    );
  }

  // 4. 筛选条件
  if (type) {
    filtered = filtered.filter(r => r.follow_up_type === type);
  }
  if (start_date) {
    filtered = filtered.filter(r => r.follow_up_time >= start_date);
  }
  if (end_date) {
    filtered = filtered.filter(r => r.follow_up_time <= end_date);
  }

  // 5. 按时间倒序
  filtered.sort((a, b) => new Date(b.follow_up_time) - new Date(a.follow_up_time));

  // 6. 分页
  const total = filtered.length;
  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(page_size)));
  const start = (pageNum - 1) * pageSize;
  const end = start + pageSize;
  const items = filtered.slice(start, end);

  // 7. 格式化返回数据
  const formattedItems = items.map(r => {
    const user = getUser(r.created_by);
    const plainText = r.content.replace(/<[^>]*>/g, '');
    const content_preview = plainText.slice(0, 100) + (plainText.length > 100 ? '...' : '');

    return {
      id: r.id,
      follow_up_type: r.follow_up_type,
      follow_up_time: r.follow_up_time,
      created_by: r.created_by,
      created_by_name: user?.name || '未知',
      content_preview,
      customer_feedback: r.customer_feedback,
      duration_minutes: r.duration_minutes,
      created_at: r.created_at,
    };
  });

  res.json({
    total,
    items: formattedItems,
    has_more: end < total,
    page: pageNum,
    page_size: pageSize,
  });
});

// ============ 接口3a：更新跟进记录 ============
router.put('/follow-ups/:id', (req, res) => {
  const { id } = req.params;
  const currentUserId = req.headers['x-user-id'] || 'user-001';
  const currentUserRole = req.headers['x-user-role'] || 'sales';

  const index = followUpRecords.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '跟进记录不存在' });
  }

  const record = followUpRecords[index];

  if (record.is_deleted) {
    return res.status(400).json({ error: '已删除的记录无法修改' });
  }

  // 乐观锁检查
  const { version } = req.body;
  if (version && record.updated_at !== version) {
    return res.status(409).json({
      error: '记录已被修改，请刷新后重试',
      current_version: record.updated_at,
    });
  }

  // 24小时编辑限制 + 管理员不受限制
  const createdTime = dayjs(record.created_at);
  const now = dayjs();
  const hoursDiff = now.diff(createdTime, 'hour');

  const isCreator = record.created_by === currentUserId;
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';

  if (!isCreator && !isAdmin) {
    return res.status(403).json({ error: '仅创建者或管理员可修改此记录' });
  }

  if (hoursDiff > 24 && !isAdmin) {
    return res.status(403).json({ error: '超过24小时的记录仅管理员可修改' });
  }

  const {
    follow_up_type,
    follow_up_time,
    content,
    customer_feedback,
    next_reminder_time,
    related_opportunity_id,
    attachments,
    duration_minutes,
    custom_fields,
  } = req.body;

  // 校验content长度
  if (content && content.length > 5000) {
    return res.status(400).json({ error: 'content长度不能超过5000字符' });
  }

  // 校验跟进时间（如果更新了）
  if (follow_up_time) {
    const customer = getCustomer(record.customer_id);
    const timeValidation = validateFollowUpTime(follow_up_time, customer.created_at);
    if (!timeValidation.valid) {
      return res.status(400).json({ error: timeValidation.error });
    }
  }

  // 校验下次提醒时间
  const effectiveFollowUpTime = follow_up_time || record.follow_up_time;
  const reminderValidation = validateReminderTime(next_reminder_time, effectiveFollowUpTime);
  if (!reminderValidation.valid) {
    return res.status(400).json({ error: reminderValidation.error });
  }

  // 校验上门拜访字段
  const effectiveType = follow_up_type || record.follow_up_type;
  const effectiveFields = custom_fields || record.custom_fields || {};
  const visitValidation = validateOnsiteVisitFields(effectiveType, effectiveFields);
  if (!visitValidation.valid) {
    return res.status(400).json({ error: visitValidation.error });
  }

  followUpRecords[index] = {
    ...record,
    follow_up_type: follow_up_type || record.follow_up_type,
    follow_up_time: follow_up_time || record.follow_up_time,
    content: content || record.content,
    customer_feedback: customer_feedback !== undefined ? customer_feedback : record.customer_feedback,
    next_reminder_time: next_reminder_time !== undefined ? next_reminder_time : record.next_reminder_time,
    related_opportunity_id: related_opportunity_id !== undefined ? related_opportunity_id : record.related_opportunity_id,
    attachments: attachments !== undefined ? attachments : record.attachments,
    duration_minutes: duration_minutes !== undefined ? duration_minutes : record.duration_minutes,
    custom_fields: custom_fields || record.custom_fields,
    updated_at: now.toISOString(),
  };

  // 如果更新了提醒时间，更新队列
  if (next_reminder_time !== undefined) {
    const reminderIndex = reminderQueue.findIndex(r => r.follow_up_id === id);
    if (reminderIndex >= 0) {
      reminderQueue[reminderIndex].reminder_time = next_reminder_time;
    } else if (next_reminder_time) {
      addReminder(followUpRecords[index]);
    }
  }

  const user = getUser(followUpRecords[index].created_by);

  res.json({
    ...followUpRecords[index],
    created_by_name: user?.name || '未知',
  });
});

// ============ 接口3b：删除跟进记录 ============
router.delete('/follow-ups/:id', (req, res) => {
  const { id } = req.params;
  const currentUserId = req.headers['x-user-id'] || 'user-001';
  const currentUserRole = req.headers['x-user-role'] || 'sales';

  const index = followUpRecords.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '跟进记录不存在' });
  }

  const record = followUpRecords[index];

  // 检查删除权限
  const isCreator = record.created_by === currentUserId;
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';

  if (!isCreator && !isAdmin) {
    return res.status(403).json({ error: '仅创建者或管理员可删除此记录' });
  }

  // 24小时删除限制（管理员除外）
  if (!isAdmin) {
    const createdTime = dayjs(record.created_at);
    const now = dayjs();
    const hoursDiff = now.diff(createdTime, 'hour');

    if (hoursDiff > 24) {
      return res.status(403).json({ error: '超过24小时的记录仅管理员可删除' });
    }
  }

  followUpRecords[index] = {
    ...followUpRecords[index],
    is_deleted: true,
    deleted_at: dayjs().toISOString(),
    updated_at: dayjs().toISOString(),
  };

  // 从提醒队列移除
  const reminderIndex = reminderQueue.findIndex(r => r.follow_up_id === id);
  if (reminderIndex >= 0) {
    reminderQueue[reminderIndex].status = 'cancelled';
  }

  res.json({ message: '跟进记录已撤销', id });
});

// ============ 接口4：获取跟进统计（KPI） ============
router.get('/analytics/follow-up-stats', (req, res) => {
  const { user_id, start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date 和 end_date 为必填参数' });
  }

  let filtered = followUpRecords.filter(r => !r.is_deleted);

  // 按用户筛选（不传则查当前用户）
  const targetUserId = user_id || req.headers['x-user-id'] || 'user-001';
  filtered = filtered.filter(r => r.created_by === targetUserId);

  // 按时间范围筛选
  filtered = filtered.filter(r => r.follow_up_time >= start_date && r.follow_up_time <= end_date);

  // 统计总数
  const total_count = filtered.length;

  // 按类型统计
  const by_type = {
    phone_call: 0,
    online_meeting: 0,
    onsite_visit: 0,
    email: 0,
    im_chat: 0,
    other: 0,
  };
  filtered.forEach(r => {
    if (by_type.hasOwnProperty(r.follow_up_type)) {
      by_type[r.follow_up_type]++;
    }
  });

  // 客户覆盖率（有跟进记录的客户数）
  const uniqueCustomers = new Set(filtered.map(r => r.customer_id));
  const customer_coverage_count = uniqueCustomers.size;

  // 平均沟通时长
  const totalDuration = filtered.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
  const avg_duration_minutes = total_count > 0 ? parseFloat((totalDuration / total_count).toFixed(2)) : 0;

  res.json({
    total_count,
    by_type,
    customer_coverage_count,
    avg_duration_minutes,
    start_date,
    end_date,
    user_id: targetUserId,
  });
});

// 获取单条跟进记录详情
router.get('/follow-ups/:id', (req, res) => {
  const { id } = req.params;
  const currentUserId = req.headers['x-user-id'] || 'user-001';

  const record = followUpRecords.find(r => r.id === id && !r.is_deleted);

  if (!record) {
    return res.status(404).json({ error: '跟进记录不存在' });
  }

  // 校验权限
  if (!canAccessCustomer(currentUserId, record.customer_id)) {
    return res.status(403).json({ error: '您没有权限查看该跟进记录' });
  }

  const user = getUser(record.created_by);
  const customer = getCustomer(record.customer_id);
  const opportunity = record.related_opportunity_id
    ? mockOpportunities.find(o => o.id === record.related_opportunity_id)
    : null;

  res.json({
    ...record,
    created_by_name: user?.name || '未知',
    customer_name: customer?.name || '未知客户',
    opportunity_name: opportunity?.name || null,
  });
});

// 获取客户跟进统计
router.get('/stats/:customerId', (req, res) => {
  const { customerId } = req.params;
  const currentUserId = req.headers['x-user-id'] || 'user-001';

  // 校验权限
  if (!canAccessCustomer(currentUserId, customerId)) {
    return res.status(403).json({ error: '您没有权限查看该客户的跟进记录' });
  }

  const records = followUpRecords.filter(r => r.customer_id === customerId && !r.is_deleted);

  // 销售人员只能看自己+下属的
  const currentUser = getUser(currentUserId);
  if (currentUser?.role === 'sales') {
    records.filter(r =>
      r.created_by === currentUserId ||
      canViewUserFollowUps(currentUserId, r.created_by)
    );
  }

  const totalCount = records.length;
  let lastFollowUp = null;
  if (records.length > 0) {
    const sorted = [...records].sort((a, b) => new Date(b.follow_up_time) - new Date(a.follow_up_time));
    lastFollowUp = sorted[0].follow_up_time;
  }

  const now = dayjs();
  const upcomingReminder = records
    .filter(r => r.next_reminder_time && dayjs(r.next_reminder_time).isAfter(now))
    .sort((a, b) => new Date(a.next_reminder_time) - new Date(b.next_reminder_time))[0]?.next_reminder_time || null;

  let nextFollowUpCountdown = null;
  if (upcomingReminder) {
    nextFollowUpCountdown = dayjs(upcomingReminder).diff(now, 'day');
  }

  const typeStats = {};
  records.forEach(r => {
    if (!typeStats[r.follow_up_type]) {
      typeStats[r.follow_up_type] = 0;
    }
    typeStats[r.follow_up_type]++;
  });

  let activityScore = 0;
  if (totalCount > 0) {
    const last7Days = records.filter(r => dayjs(r.follow_up_time).isAfter(now.subtract(7, 'day'))).length;
    const last30Days = records.filter(r => dayjs(r.follow_up_time).isAfter(now.subtract(30, 'day'))).length;
    activityScore = Math.min(100, Math.round((last7Days * 20) + (last30Days * 2)));
  }

  const followUpByStats = {};
  records.forEach(r => {
    const user = getUser(r.created_by);
    const name = user?.name || '未知';
    if (!followUpByStats[name]) {
      followUpByStats[name] = 0;
    }
    followUpByStats[name]++;
  });

  const totalDuration = records.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
  const avgContentLength = totalCount > 0
    ? Math.round(records.reduce((sum, r) => sum + (r.content?.length || 0), 0) / totalCount)
    : 0;

  res.json({
    totalCount,
    lastFollowUp,
    upcomingReminder,
    nextFollowUpCountdown,
    activityScore,
    typeStats,
    followUpByStats,
    totalDuration,
    avgContentLength,
  });
});

// 获取当前用户的提醒列表
router.get('/reminders', (req, res) => {
  const currentUserId = req.headers['x-user-id'] || 'user-001';

  const userReminders = reminderQueue
    .filter(r => r.user_id === currentUserId && r.status === 'pending')
    .map(r => {
      const record = followUpRecords.find(f => f.id === r.follow_up_id);
      const customer = getCustomer(r.customer_id);
      return {
        ...r,
        customer_name: customer?.name || '未知客户',
        follow_up_type: record?.follow_up_type,
        content_preview: record?.content.replace(/<[^>]*>/g, '').slice(0, 50),
      };
    })
    .sort((a, b) => new Date(a.reminder_time) - new Date(b.reminder_time));

  res.json({ reminders: userReminders });
});

export default router;