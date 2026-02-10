export const API_CONFIG = {
  BASE_URL: 'http://localhost:8080',
  TIMEOUT: 30000,
  ENDPOINTS: {
    AUTH: {
      REGISTER: '/auth/register',
      LOGIN: '/auth/login',
      REFRESH: '/auth/refresh',
      LOGOUT: '/auth/logout',
    },
    COMMISSION: {
      TRANSACTION: '/commission/transaction',
      GET_USER: (userId) => `/commission/get_user/${userId}`,
    },
  },
};
