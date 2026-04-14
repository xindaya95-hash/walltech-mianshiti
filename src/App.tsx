import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import CustomerList from './pages/CustomerList';
import CustomerDetail from './pages/CustomerDetail';
import Login from './pages/Login';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="app">
      {currentUser && (
        <div style={{
          position: 'fixed',
          top: 12,
          right: 20,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#fff',
          padding: '8px 16px',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <span style={{ fontSize: 14, color: '#333' }}>
            欢迎，<strong>{currentUser.name}</strong>
            <span style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>
              ({currentUser.role === 'admin' || currentUser.role === 'manager' ? '管理员' : '普通员工'})
            </span>
          </span>
          <button
            onClick={logout}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              color: '#666',
              background: '#f0f0f0',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            退出
          </button>
        </div>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <CustomerList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:customerId"
          element={
            <ProtectedRoute>
              <CustomerDetail />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/customers" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;