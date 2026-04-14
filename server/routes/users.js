import express from 'express';

const router = express.Router();

// 模拟用户数据
const users = [
  { 
    id: 'user-001', 
    name: '张三', 
    role: 'sales',
    department: '华南销售部',
    email: 'zhangsan@example.com',
  },
  { 
    id: 'user-002', 
    name: '李四', 
    role: 'sales',
    department: '华南销售部',
    email: 'lisi@example.com',
  },
  { 
    id: 'user-003', 
    name: '王五', 
    role: 'manager',
    department: '华南销售部',
    email: 'wangwu@example.com',
  },
  { 
    id: 'user-004', 
    name: '赵六', 
    role: 'sales',
    department: '华东销售部',
    email: 'zhaoliu@example.com',
  },
];

// 获取当前用户（模拟）
router.get('/current', (req, res) => {
  // 模拟当前登录用户
  res.json(users[0]);
});

// 获取所有用户
router.get('/', (req, res) => {
  res.json({ users });
});

// 获取单个用户
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const user = users.find(u => u.id === id);
  
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  res.json(user);
});

export default router;