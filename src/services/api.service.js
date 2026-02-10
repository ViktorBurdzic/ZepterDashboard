// Mock API client - no actual HTTP calls
const apiClient = {
  get: async (url) => {
    console.log('Mock GET:', url);
    return { data: {} };
  },
  post: async (url, data) => {
    console.log('Mock POST:', url, data);
    return { data: {} };
  },
};

export default apiClient;
