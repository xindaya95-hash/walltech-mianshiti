import express from 'express';

const router = express.Router();

// 模拟客户数据
const customers = [
  { 
    id: 'cust-001', 
    name: '深圳华强电子有限公司', 
    type: 'electronics',
    industry: '电子产品制造',
    contact: '陈经理',
    phone: '13800138001',
    address: '深圳市福田区华强北路',
    created_at: '2024-01-15',
  },
  { 
    id: 'cust-002', 
    name: '广州纺织集团', 
    type: 'textile',
    industry: '纺织品生产与贸易',
    contact: '刘总监',
    phone: '13900139002',
    address: '广州市海珠区纺织路',
    created_at: '2024-02-20',
  },
  { 
    id: 'cust-003', 
    name: '东莞玩具制造有限公司', 
    type: 'toy',
    industry: '玩具生产出口',
    contact: '周主管',
    phone: '13700137003',
    address: '东莞市长安镇工业园',
    created_at: '2024-03-10',
  },
  { 
    id: 'cust-004', 
    name: '义乌小商品批发市场', 
    type: 'retail',
    industry: '小商品批发',
    contact: '吴经理',
    phone: '13600136004',
    address: '义乌市国际商贸城',
    created_at: '2024-04-05',
  },
  { 
    id: 'cust-005', 
    name: '上海精密仪器股份', 
    type: 'precision',
    industry: '精密仪器制造',
    contact: '张总工程师',
    phone: '13500135005',
    address: '上海市浦东新区张江高科',
    created_at: '2024-05-18',
  },
];

// 获取客户列表
router.get('/', (req, res) => {
  const { search, type } = req.query;
  
  let filtered = [...customers];
  
  if (search) {
    const keyword = search.toLowerCase();
    filtered = filtered.filter(c => 
      c.name.toLowerCase().includes(keyword) || 
      c.contact.toLowerCase().includes(keyword)
    );
  }
  
  if (type) {
    filtered = filtered.filter(c => c.type === type);
  }
  
  res.json({ customers: filtered, total: filtered.length });
});

// 获取单个客户详情
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const customer = customers.find(c => c.id === id);
  
  if (!customer) {
    return res.status(404).json({ error: '客户不存在' });
  }
  
  res.json(customer);
});

export default router;