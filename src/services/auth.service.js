import storageService from './storage.service';

class AuthService {
  // Mock user database
  mockUsers = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'admin@test.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin',
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      email: 'user@test.com',
      password: 'user123',
      name: 'Test User',
      role: 'user',
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174002',
      email: 'partner@test.com',
      password: 'partner123',
      name: 'Partner User',
      role: 'partner',
    },
  ];

  async register(data) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newUser = {
      id: crypto.randomUUID(),
      email: data.email,
      name: data.name,
      role: 'user',
      created_at: new Date().toISOString(),
    };
    
    this.mockUsers.push({ ...newUser, password: data.password });
    return newUser;
  }

  async login(email, password) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = this.mockUsers.find(
      u => u.email === email && u.password === password
    );
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Mock JWT tokens
    const access_token = 'mock_access_token_' + Date.now();
    const refresh_token = 'mock_refresh_token_' + Date.now();
    
    const userInfo = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    
    storageService.setAccessToken(access_token);
    storageService.setRefreshToken(refresh_token);
    storageService.setUser(userInfo);

    return { user: userInfo, access_token };
  }

  async logout() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    storageService.clearTokens();
    storageService.clearUser();
  }

  getUserFromToken(token) {
    return storageService.getUser();
  }

  isTokenValid(token) {
    return !!token;
  }
}

export default new AuthService();
