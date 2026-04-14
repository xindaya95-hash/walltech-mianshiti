import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('请选择您的身份');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const users = await api.getUsers();
      const user = users.find((u: User) => u.id === selectedUser || u.name === selectedUser);

      if (user) {
        // 使用 AuthContext 更新登录状态
        login(user);
        navigate('/customers');
      } else {
        setError('用户不存在');
      }
    } catch (err) {
      console.error('登录失败:', err);
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '40px 48px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: 420,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 600,
            color: '#333',
            marginBottom: 8,
          }}>跨境物流 CRM</h1>
          <p style={{ color: '#666', fontSize: 14 }}>请选择您的身份登录系统</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              color: '#333',
              fontWeight: 500,
            }}>
              选择身份
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 16,
                border: '2px solid #e8e8e8',
                borderRadius: 8,
                outline: 'none',
                transition: 'border-color 0.3s',
                background: '#fff',
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e8e8e8'}
            >
              <option value="">-- 请选择 --</option>
              <option value="user-003">👔 王经理 (管理员)</option>
              <option value="user-001">👤 张销售 (普通员工)</option>
              <option value="user-002">👤 李销售 (普通员工)</option>
            </select>
          </div>

          {error && (
            <div style={{
              background: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: 6,
              padding: '12px 16px',
              marginBottom: 16,
              color: '#ff4d4f',
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 24px',
              fontSize: 16,
              fontWeight: 500,
              color: '#fff',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
            }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div style={{
          marginTop: 24,
          padding: 16,
          background: '#f8f8f8',
          borderRadius: 8,
          fontSize: 13,
          color: '#666',
        }}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>权限说明：</div>
          <div style={{ marginBottom: 4 }}>• <strong>管理员</strong>：可添加/修改客户列表，添加跟进记录</div>
          <div>• <strong>普通员工</strong>：只能添加跟进记录</div>
        </div>
      </div>
    </div>
  );
};

export default Login;