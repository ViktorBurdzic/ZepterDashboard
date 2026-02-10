import { useQuery } from '@tanstack/react-query';
import commissionService from '../services/commission.service';
import { QUERY_KEYS } from '../config/query.config';

export function useUserState(userId, options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.USER_STATE(userId),
    queryFn: () => commissionService.getUserState(userId),
    enabled: !!userId,
    ...options,
  });
}
