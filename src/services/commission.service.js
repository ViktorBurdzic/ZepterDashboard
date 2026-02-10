class CommissionService {
  async recordTransaction(userId, amount) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      purchaser_id: userId,
      amount: amount,
      discount_level: 'DL2',
      parent_id: '123e4567-e89b-12d3-a456-426614174000',
      parent_commission: (amount * 0.15).toFixed(2),
      managerial_payouts: [
        {
          ancestor_id: '123e4567-e89b-12d3-a456-426614174001',
          depth: 1,
          amount: (amount * 0.05).toFixed(2),
        },
        {
          ancestor_id: '123e4567-e89b-12d3-a456-426614174002',
          depth: 2,
          amount: (amount * 0.02).toFixed(2),
        },
      ],
    };
  }

  async getUserState(userId) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
      user_uuid: userId,
      rank: 'junior_partner',
      personal_sales_volume: '5432.00',
      personal_purchase_volume: '1234.00',
      current_month_psv: '456.00',
      last_month_psv: '345.00',
      group_volume: '8500.00',
      last_activity_month: 202602,
    };
  }
}

export default new CommissionService();
