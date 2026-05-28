import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { withApiBase } from '../utils/apiBase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await fetch(withApiBase('/api/auth/me/'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          localStorage.removeItem('token');
          setUser(null);
          return;
        }
        const data = await res.json();
        setUser(data);
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      await fetch(withApiBase('/api/auth/logout/'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error(error);
    }
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  }, [navigate]);

  return { user, loading, logout };
}