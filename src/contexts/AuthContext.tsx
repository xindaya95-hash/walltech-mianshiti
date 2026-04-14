import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userRole: 'admin' | 'manager' | 'sales' | null;
  userId: string | null;
  isAdmin: boolean;
  isManager: boolean;
  isSales: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'sales' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // 从 localStorage 恢复登录状态
    const savedUser = localStorage.getItem('currentUser');
    const savedRole = localStorage.getItem('userRole');
    const savedId = localStorage.getItem('userId');

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    if (savedRole) {
      setUserRole(savedRole as 'admin' | 'manager' | 'sales');
    }
    if (savedId) {
      setUserId(savedId);
    }
  }, []);

  const login = (user: User) => {
    setCurrentUser(user);
    setUserRole(user.role);
    setUserId(user.id);
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('userId', user.id);
  };

  const logout = () => {
    setCurrentUser(null);
    setUserRole(null);
    setUserId(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
  };

  const isAdmin = userRole === 'admin' || userRole === 'manager';
  const isManager = userRole === 'manager' || userRole === 'admin';
  const isSales = userRole === 'sales';

  return (
    <AuthContext.Provider value={{ currentUser, userRole, userId, isAdmin, isManager, isSales, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};