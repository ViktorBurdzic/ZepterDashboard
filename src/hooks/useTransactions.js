import { useMutation, useQueryClient } from '@tanstack/react-query';
import commissionService from '../services/commission.service';
import { QUERY_KEYS } from '../config/query.config';

export function useRecordTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, amount }) =>
      commissionService.recordTransaction(userId, amount),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.USER_STATE(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TRANSACTIONS(variables.userId),
      });
    },
  });
}
