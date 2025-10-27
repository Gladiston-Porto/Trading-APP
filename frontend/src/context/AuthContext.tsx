/**
 * Authentication Context Provider
 * 
 * Manages user authentication state and provides auth methods.
 * Handles token management, user session, and auth errors.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api/client';
import { User, AuthToken, LoginRequest, RegisterRequest, AuthContext } from '../types';

const AuthContextAPI = createContext<AuthContext | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedToken = localStorage.getItem('auth_token');
        if (savedToken) {
          apiClient.setToken(savedToken);
          setToken(savedToken);
          
          // Verify token is still valid
          const response = await apiClient.get<User>('/auth/me');
          if (response.success && response.data) {
            setUser(response.data);
          } else {
            // Token is invalid
            localStorage.removeItem('auth_token');
            setToken(null);
          }
        }
      } catch (err: any) {
        console.error('Auth check failed:', err);
        localStorage.removeItem('auth_token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Listen for unauthorized events
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      setError(null);
      setLoading(true);

      const response = await apiClient.post<{ user: User; token: AuthToken }>(
        '/auth/login',
        credentials
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Login failed');
      }

      const { user: userData, token: authToken } = response.data;
      
      apiClient.setToken(authToken.accessToken);
      setToken(authToken.accessToken);
      setUser(userData);
      localStorage.setItem('auth_token', authToken.accessToken);
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setError(null);
    apiClient.setToken('');
    localStorage.removeItem('auth_token');
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    try {
      setError(null);
      setLoading(true);

      const response = await apiClient.post<{ user: User; token: AuthToken }>(
        '/auth/register',
        data
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Registration failed');
      }

      const { user: userData, token: authToken } = response.data;
      
      apiClient.setToken(authToken.accessToken);
      setToken(authToken.accessToken);
      setUser(userData);
      localStorage.setItem('auth_token', authToken.accessToken);
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value: AuthContext = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    register,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContextAPI.Provider value={value}>
      {children}
    </AuthContextAPI.Provider>
  );
};

/**
 * Hook to use authentication context
 */
export const useAuth = (): AuthContext => {
  const context = useContext(AuthContextAPI);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
