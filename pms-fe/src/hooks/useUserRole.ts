import { useState, useEffect } from 'react';
import { UserRoleInfo } from '../types/users';
import userService from '../services/userService';

export function useUserRole() {
  const [roleInfo, setRoleInfo] = useState<UserRoleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const data = await userService.getUserRoleInfo();
        setRoleInfo(data);
        setError(null);
      } catch (err) {
        setError('Failed to load user role information');
        console.error('Error loading user role:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserRole();
  }, []);

  return {
    roleInfo,
    loading,
    error,
    reload: async () => {
      setLoading(true);
      try {
        const data = await userService.getUserRoleInfo();
        setRoleInfo(data);
        setError(null);
      } catch (err) {
        setError('Failed to load user role information');
      } finally {
        setLoading(false);
      }
    },
  };
}