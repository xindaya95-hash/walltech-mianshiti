import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Customer } from '../types';
import { useAuth } from '../contexts/AuthContext';

const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, userId } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    industry: '',
    scale: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    source: '',
    level: 'C',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async (search?: string) => {
    setLoading(true);
    try {
      const data = await api.getCustomers({ search });
      setCustomers(data.customers);
    } catch (error) {
      console.error('加载客户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers(searchKeyword);
  };

  const handleCustomerClick = (customerId: string) => {
    navigate(`/customers/${customerId}`);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) {
      alert('请输入客户名称');
      return;
    }

    setSaving(true);
    try {
      await api.createCustomer(newCustomer);
      setShowAddModal(false);
      setNewCustomer({
        name: '',
        industry: '',
        scale: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        address: '',
        source: '',
        level: 'C',
      });
      loadCustomers();
    } catch (error: any) {
      console.error('创建客户失败:', error);
      alert(error?.error || '创建客户失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">客户列表</h1>
          <p className="page-subtitle">跨境物流云服务 - CRM管理系统</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + 新增客户
        </button>
      </div>

      <form onSubmit={handleSearch} className="filter-bar">
        <div className="filter-item" style={{ flex: 1 }}>
          <input
            type="text"
            className="form-input"
            placeholder="搜索客户名称或联系人..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">搜索</button>
        <button
          type="button"
          className="btn btn-default"
          onClick={() => { setSearchKeyword(''); loadCustomers(); }}
        >
          重置
        </button>
      </form>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          加载中...
        </div>
      ) : customers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">暂无客户</div>
          <div className="empty-desc">没有找到匹配的客户，请尝试其他搜索条件</div>
        </div>
      ) : (
        <div className="customer-list">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="customer-card"
              onClick={() => handleCustomerClick(customer.id)}
            >
              <div className="customer-info">
                <div className="customer-name">{customer.name}</div>
                <div className="customer-meta">
                  <span>{(customer as any).contact_name}</span>
                  <span>{(customer as any).contact_phone}</span>
                  <span>{customer.industry}</span>
                </div>
              </div>
              <div className="customer-stats">
                <div className="customer-stat">
                  <div className="customer-stat-value">→</div>
                  <div>查看详情</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新增客户弹窗 */}
      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}></div>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title">➕ 新增客户</div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddCustomer}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">客户名称</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="请输入客户名称"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">行业</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCustomer.industry}
                    onChange={(e) => setNewCustomer({ ...newCustomer, industry: e.target.value })}
                    placeholder="请输入行业"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">规模</label>
                  <select
                    className="form-select"
                    value={newCustomer.scale}
                    onChange={(e) => setNewCustomer({ ...newCustomer, scale: e.target.value })}
                  >
                    <option value="">请选择</option>
                    <option value="小型企业">小型企业</option>
                    <option value="中型企业">中型企业</option>
                    <option value="大型企业">大型企业</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">联系人</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCustomer.contact_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, contact_name: e.target.value })}
                    placeholder="请输入联系人姓名"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">联系电话</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCustomer.contact_phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, contact_phone: e.target.value })}
                    placeholder="请输入联系电话"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">邮箱</label>
                  <input
                    type="email"
                    className="form-input"
                    value={newCustomer.contact_email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, contact_email: e.target.value })}
                    placeholder="请输入邮箱"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">地址</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    placeholder="请输入地址"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">客户来源</label>
                  <select
                    className="form-select"
                    value={newCustomer.source}
                    onChange={(e) => setNewCustomer({ ...newCustomer, source: e.target.value })}
                  >
                    <option value="">请选择</option>
                    <option value="官网获客">官网获客</option>
                    <option value="展会获客">展会获客</option>
                    <option value="电话营销">电话营销</option>
                    <option value="客户推荐">客户推荐</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">客户等级</label>
                  <select
                    className="form-select"
                    value={newCustomer.level}
                    onChange={(e) => setNewCustomer({ ...newCustomer, level: e.target.value })}
                  >
                    <option value="A">A级 - 重点客户</option>
                    <option value="B">B级 - 普通客户</option>
                    <option value="C">C级 - 潜在客户</option>
                    <option value="D">D级 - 观望客户</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-default" onClick={() => setShowAddModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerList;