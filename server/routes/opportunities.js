import express from 'express';

const router = express.Router();

// 模拟商机数据
const opportunities = [
  { 
    id: 'opp-001', 
    name: '华强电子-欧洲专线合作', 
    customerId: 'cust-001',
    amount: 500000,
    stage: 'negotiating',
    expectedCloseDate: '2024-12-31',
  },
  { 
    id: 'opp-002', 
    name: '纺织集团-海运大货项目', 
    customerId: 'cust-002',
    amount: 800000,
    stage: 'proposal',
    expectedCloseDate: '2024-11-30',
  },
  { 
    id: 'opp-003', 
    name: '玩具厂-美线空运谈判', 
    customerId: 'cust-003',
    amount: 200000,
    stage: 'initial',
    expectedCloseDate: '2025-03-31',
  },
];

// 获取所有商机
router.get('/', (req, res) => {
  const { customerId } = req.query;
  
  let filtered = [...opportunities];
  
  if (customerId) {
    filtered = filtered.filter(o => o.customerId === customerId);
  }
  
  res.json({ opportunities: filtered });
});

// 获取单个商机
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const opportunity = opportunities.find(o => o.id === id);
  
  if (!opportunity) {
    return res.status(404).json({ error: '商机不存在' });
  }
  
  res.json(opportunity);
});

export default router;