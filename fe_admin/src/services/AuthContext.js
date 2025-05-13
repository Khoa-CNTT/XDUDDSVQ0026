import React, { createContext, useState, useContext, useEffect } from 'react';
import adminAPI from './adminAPI';

// Create context
const AuthContext = createContext(null);

// Custom hook to use AuthContext
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('admin_user')) || null);
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  // Check authentication when component mounts
  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await adminAPI.checkAuth();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Authentication check failed:', error);
        // Remove token if authentication fails
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [token]);

  // Login function
  const login = async (email, password) => {
    try {
      const { token, user } = await adminAPI.login(email, password);
      setToken(token);
      setUser(user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        message: error.message || 'Login failed. Please check your credentials.'
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await adminAPI.logout();
    } finally {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Context value
  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 