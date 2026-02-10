import { useAuth } from './useAuth';

export function useRoleAccess() {
  const { user } = useAuth();

  const hasRole = (role) => user?.role === role;
  const hasAnyRole = (roles) => roles.includes(user?.role);

  return {
    isAdmin: hasRole('admin'),
    isPartner: hasRole('partner'),
    isMember: hasRole('member'),
    isUser: hasRole('user'),
    hasRole,
    hasAnyRole,
  };
}
