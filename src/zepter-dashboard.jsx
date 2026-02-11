import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { User, TrendingUp, Users, DollarSign, Award, LogOut, Activity, ChevronRight } from 'lucide-react';

import zepterLogo from './assets/logo.png';
const API_BASE = 'http://127.0.0.1:8080';

// Rank Colors & Levels
const RANKS = {
    none: { label: 'New Member', color: '#6B7280', level: 0 },
    club_member: { label: 'Club Member', color: '#10B981', level: 1 },
    junior_partner: { label: 'Junior Partner', color: '#3B82F6', level: 2 },
    team_partner: { label: 'Team Partner', color: '#8B5CF6', level: 3 },
    senior_partner: { label: 'Senior Partner', color: '#F59E0B', level: 4 },
    division_partner: { label: 'Division Partner', color: '#EF4444', level: 5 },
    regional_partner: { label: 'Regional Partner', color: '#DC2626', level: 6 }
};

const DISCOUNT_LEVELS = ['DL0', 'DL1', 'DL2', 'DL3', 'DL4', 'DL5', 'DL6', 'DL7', 'DL8', 'DL9', 'DL10'];

const calculateDiscountLevel = (userData) => {
    if (!userData) return 'DL0';

    const ppv = parseFloat(userData.personal_purchase_volume || 0);

    if (ppv >= 10000) return 'DL10';
    if (ppv >= 8000) return 'DL9';
    if (ppv >= 6000) return 'DL8';
    if (ppv >= 5000) return 'DL7';
    if (ppv >= 4000) return 'DL6';
    if (ppv >= 3000) return 'DL5';
    if (ppv >= 2000) return 'DL4';
    if (ppv >= 1000) return 'DL3';
    if (ppv >= 500) return 'DL2';
    if (ppv >= 100) return 'DL1';

    return 'DL0';
};

// Utility Functions
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount || 0);
};

const formatMonth = (yyyymm) => {
    if (!yyyymm) return 'N/A';
    const str = String(yyyymm);
    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    return `${month}/${year}`;
};

// API Service
class ZepterAPI {
    constructor(baseUrl = API_BASE) {
        this.baseUrl = baseUrl;
        this.accessToken = localStorage.getItem('access_token');
        this.useMock = true; // SET TO false WHEN BACKEND IS READY
    }

    // Mock data for testing
    mockUsers = [
        { id: '123e4567-e89b-12d3-a456-426614174000', email: 'admin@test.com', password: 'admin123', name: 'Admin User', role: 'admin' },
        { id: '123e4567-e89b-12d3-a456-426614174001', email: 'user@test.com', password: 'user123', name: 'Test User', role: 'user' },
        { id: '123e4567-e89b-12d3-a456-426614174002', email: 'partner@test.com', password: 'partner123', name: 'Partner User', role: 'partner' }
    ];

    mockUserData = {
        user_uuid: '123e4567-e89b-12d3-a456-426614174000',
        rank: 'junior_partner',
        personal_sales_volume: '5432.50',
        personal_purchase_volume: '1234.00',
        current_month_psv: '456.00',
        last_month_psv: '345.00',
        group_volume: '8500.00',
        last_activity_month: 202602
    };

    async getMockResponse(endpoint, options = {}) {
        await new Promise(resolve => setTimeout(resolve, 500));

        if (endpoint === '/auth/login' && options.method === 'POST') {
            const { email, password } = JSON.parse(options.body);
            const user = this.mockUsers.find(u => u.email === email && u.password === password);

            if (!user) throw new Error('Invalid email or password');

            const tokenPayload = { sub: user.id, user_id: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + 3600 };
            const mockToken = btoa(JSON.stringify({ header: 'mock' })) + '.' + btoa(JSON.stringify(tokenPayload)) + '.' + btoa('signature');

            return { access_token: mockToken, refresh_token: 'mock_refresh_' + Date.now(), token_type: 'Bearer', expires_in: 3600 };
        }

        if (endpoint === '/auth/register' && options.method === 'POST') {
            const { email, name } = JSON.parse(options.body);
            const newUser = { id: crypto.randomUUID(), email, name, role: 'user', created_at: new Date().toISOString() };
            this.mockUsers.push(newUser);
            return newUser;
        }

        if (endpoint.includes('/commission/get_user/')) {
            return { ...this.mockUserData, user_uuid: endpoint.split('/').pop() };
        }

        if (endpoint === '/commission/transaction' && options.method === 'POST') {
            const { amount } = JSON.parse(options.body);
            const numAmount = parseFloat(amount);

            this.mockUserData.personal_purchase_volume = (parseFloat(this.mockUserData.personal_purchase_volume) + numAmount).toFixed(2);
            this.mockUserData.current_month_psv = (parseFloat(this.mockUserData.current_month_psv) + numAmount * 0.1).toFixed(2);

            return {
                purchaser_id: this.mockUserData.user_uuid,
                amount: numAmount.toFixed(2),
                discount_level: 'DL3',
                parent_id: '123e4567-e89b-12d3-a456-426614174001',
                parent_commission: (numAmount * 0.15).toFixed(2),
                managerial_payouts: [
                    { ancestor_id: '123e4567-e89b-12d3-a456-426614174002', depth: 1, amount: (numAmount * 0.05).toFixed(2) },
                    { ancestor_id: '123e4567-e89b-12d3-a456-426614174003', depth: 2, amount: (numAmount * 0.02).toFixed(2) }
                ]
            };
        }

        return {};
    }

    async request(endpoint, options = {}) {
        if (this.useMock) {
            console.log('🔷 MOCK API:', endpoint);
            return await this.getMockResponse(endpoint, options);
        }

        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });

            if (response.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.reload();
                throw new Error('Session expired. Please login again.');
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || error.detail || `HTTP ${response.status}: ${response.statusText}`);
            }

            return response.json();
        } catch (err) {
            if (err instanceof TypeError && err.message.includes('fetch')) {
                throw new Error('Cannot connect to API server. Please check if the server is running.');
            }
            throw err;
        }
    }

    async login(email, password) {
        const data = await this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        this.accessToken = data.access_token;
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        return data;
    }

    async register(email, password, name, managerId = null) {
        return this.request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name, manager_id: managerId }) });
    }

    async getUser(userId) {
        return this.request(`/commission/get_user/${userId}`);
    }

    async recordTransaction(userId, amount) {
        return this.request('/commission/transaction', { method: 'POST', body: JSON.stringify({ user_uuid: userId, amount: String(amount) }) });
    }

    logout() {
        this.accessToken = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }
}

// Login Component
function LoginScreen({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [managerId, setManagerId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const api = new ZepterAPI();
        try {
            if (isLogin) {
                const result = await api.login(email, password);
                onLogin(result);
            } else {
                await api.register(email, password, name, managerId || null);
                const result = await api.login(email, password);
                onLogin(result);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: '"IBM Plex Sans", -apple-system, sans-serif'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                padding: '48px',
                width: '100%',
                maxWidth: '480px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '80px',
                        height: '80px',
                        
                        borderRadius: '20px',
                        marginBottom: '24px',
                        boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)'
                    }}>
                        <img src={zepterLogo} alt="Zepter Logo" style={{ width: '100px', height: '100px' }} />

                    </div>
                    <h1 style={{
                        color: '#F8FAFC',
                        fontSize: '32px',
                        fontWeight: '700',
                        margin: '0 0 8px 0',
                        letterSpacing: '-0.02em'
                    }}>Zepter Engine</h1>
                    <p style={{
                        color: '#94A3B8',
                        fontSize: '16px',
                        margin: 0
                    }}>MLM Commission Platform</p>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '32px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '4px',
                    borderRadius: '12px'
                }}>
                    <button
                        onClick={() => setIsLogin(true)}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: isLogin ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'transparent',
                            color: '#F8FAFC',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}>
                        Login
                    </button>
                    <button
                        onClick={() => setIsLogin(false)}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: !isLogin ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'transparent',
                            color: '#F8FAFC',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}>
                        Register
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#CBD5E1', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    color: '#F8FAFC',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#F59E0B'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                            />
                        </div>
                    )}

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#CBD5E1', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: '#F8FAFC',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#F59E0B'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#CBD5E1', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: '#F8FAFC',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#F59E0B'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                        />
                    </div>

                    {!isLogin && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#CBD5E1', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                                Manager ID (Optional)
                            </label>
                            <input
                                type="text"
                                value={managerId}
                                onChange={(e) => setManagerId(e.target.value)}
                                placeholder="UUID of your sponsor"
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    color: '#F8FAFC',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#F59E0B'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                            />
                        </div>
                    )}

                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px',
                            color: '#FCA5A5',
                            fontSize: '14px',
                            marginBottom: '20px'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: loading ? '#64748B' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                            color: '#FFF',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: loading ? 'none' : '0 10px 30px rgba(245, 158, 11, 0.3)',
                            transition: 'all 0.2s'
                        }}>
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>
            </div>
        </div>
    );
}

// Dashboard Main Component
function Dashboard({ userId, onLogout }) {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [txAmount, setTxAmount] = useState('');
    const [txResult, setTxResult] = useState(null);
    const [txLoading, setTxLoading] = useState(false);
    const [txError, setTxError] = useState('');

    const api = new ZepterAPI();

    const loadUserData = async () => {
        try {
            setLoading(true);
            setLoadError('');
            const data = await api.getUser(userId);
            setUserData(data);
        } catch (err) {
            console.error('Failed to load user data:', err);
            setLoadError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const silentRefreshUserData = async () => {
        try {
            const data = await api.getUser(userId);
            setUserData(data);
        } catch (err) {
            console.error('Silent refresh failed:', err);
        }
    };

    useEffect(() => {
        loadUserData();
        const interval = setInterval(silentRefreshUserData, 30000); // Refresh every 30s silently
        return () => clearInterval(interval);
    }, [userId]);

    const handleTransaction = async (e) => {
        e.preventDefault();
        setTxError('');
        setTxResult(null);
        setTxLoading(true);

        try {
            const result = await api.recordTransaction(userId, parseFloat(txAmount));
            setTxResult(result);
            setTxAmount('');
            await loadUserData(); // Refresh user data
        } catch (err) {
            setTxError(err.message);
        } finally {
            setTxLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F8FAFC',
                fontFamily: '"IBM Plex Sans", sans-serif'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{
                        width: '60px',
                        height: '60px',
                        border: '4px solid rgba(245, 158, 11, 0.2)',
                        borderTop: '4px solid #F59E0B',
                        borderRadius: '50%',
                        margin: '0 auto 20px',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ fontSize: '18px', color: '#94A3B8' }}>Loading dashboard...</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (loadError) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F8FAFC',
                fontFamily: '"IBM Plex Sans", sans-serif',
                padding: '20px'
            }}>
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '2px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '24px',
                    padding: '48px',
                    maxWidth: '500px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '20px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px'
                    }}>
                        <Activity size={40} color="#EF4444" />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#FCA5A5', margin: '0 0 16px 0' }}>
                        Failed to Load Dashboard
                    </h2>
                    <p style={{ fontSize: '16px', color: '#94A3B8', marginBottom: '32px' }}>
                        {loadError}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button
                            onClick={loadUserData}
                            style={{
                                padding: '14px 28px',
                                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                color: '#FFF',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)'
                            }}>
                            Retry
                        </button>
                        <button
                            onClick={onLogout}
                            style={{
                                padding: '14px 28px',
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#FCA5A5',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}>
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const rank = RANKS[userData?.rank || 'none'];
    const volumeData = [
        { name: 'Personal Sales', value: parseFloat(userData?.personal_sales_volume || 0), color: '#F59E0B' },
        { name: 'Personal Purchase', value: parseFloat(userData?.personal_purchase_volume || 0), color: '#3B82F6' },
        { name: 'Group Volume', value: parseFloat(userData?.group_volume || 0), color: '#10B981' }
    ];

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
            fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
            color: '#F8FAFC'
        }}>
            {/* Header */}
            <header style={{
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '20px 40px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                           <img src={zepterLogo} alt="Zepter Logo" style={{ width: '42px', height: '42px' }} />
                    <div>

                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', letterSpacing: '-0.02em' }}>
                            Zepter Engine
                        </h1>
                        <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>Commission Dashboard</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        padding: '10px 20px',
                        background: `${rank.color}22`,
                        border: `1px solid ${rank.color}44`,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Award size={18} color={rank.color} />
                        <span style={{ fontSize: '14px', fontWeight: '600', color: rank.color }}>
                            {rank.label}
                        </span>
                    </div>

                    <button
                        onClick={onLogout}
                        style={{
                            padding: '10px 20px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '10px',
                            color: '#FCA5A5',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div style={{ padding: '40px' }}>
                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '24px',
                    marginBottom: '40px'
                }}>
                    <StatCard
                        icon={<DollarSign size={24} />}
                        label="Personal Sales Volume"
                        value={formatCurrency(userData?.personal_sales_volume)}
                        color="#F59E0B"
                        subtitle={`Current Month: ${formatCurrency(userData?.current_month_psv)}`}
                    />
                    <StatCard
                        icon={<TrendingUp size={24} />}
                        label="Personal Purchase Volume"
                        value={formatCurrency(userData?.personal_purchase_volume)}
                        color="#3B82F6"
                        subtitle={`Last Month: ${formatCurrency(userData?.last_month_psv)}`}
                    />
                    <StatCard
                        icon={<Users size={24} />}
                        label="Group Volume"
                        value={formatCurrency(userData?.group_volume)}
                        color="#10B981"
                        subtitle="Level 1 Downline"
                    />
                    <StatCard
                        icon={<Activity size={24} />}
                        label="Last Activity"
                        value={formatMonth(userData?.last_activity_month)}
                        color="#8B5CF6"
                        subtitle={`User ID: ${userData?.user_uuid?.substring(0, 8)}...`}
                    />
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '32px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '6px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    {['overview', 'transaction', 'performance'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                flex: 1,
                                padding: '14px 24px',
                                background: activeTab === tab ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'transparent',
                                color: activeTab === tab ? '#FFF' : '#94A3B8',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                transition: 'all 0.2s',
                                boxShadow: activeTab === tab ? '0 8px 20px rgba(245, 158, 11, 0.3)' : 'none'
                            }}>
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div>
                        {/* Current Discount Level Badge */}
                        <div style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '2px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: '20px',
                            padding: '24px',
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <div style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '8px', fontWeight: '500' }}>
                                    Current Discount Level (for next purchase)
                                </div>
                                <div style={{ fontSize: '36px', fontWeight: '800', color: '#F59E0B', letterSpacing: '-0.02em' }}>
                                    {calculateDiscountLevel(userData)}
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontStyle: 'italic' }}>
                                    Based on your accumulated purchase volume
                                </div>
                            </div>
                            <div style={{
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 12px 30px rgba(245, 158, 11, 0.4)'
                            }}>
                                <Award size={40} color="#FFF" />
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '24px',
                            padding: '32px',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
                        }}>
                            <h2 style={{ marginTop: 0, fontSize: '28px', fontWeight: '700', marginBottom: '24px' }}>
                                Volume Distribution
                            </h2>
                            <div style={{ height: '400px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={volumeData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                                            outerRadius={120}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {volumeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor:'#FFF',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '12px',
                                                padding: '12px',
                                            }}
                                            formatter={(value) => formatCurrency(value)}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'transaction' && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px',
                        padding: '32px',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
                    }}>
                        <h2 style={{ marginTop: 0, fontSize: '28px', fontWeight: '700', marginBottom: '24px' }}>
                            Record Transaction
                        </h2>

                        <form onSubmit={handleTransaction} style={{ marginBottom: '32px' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', color: '#CBD5E1', fontSize: '15px', marginBottom: '10px', fontWeight: '600' }}>
                                    Purchase Amount (EUR)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={txAmount}
                                    onChange={(e) => setTxAmount(e.target.value)}
                                    required
                                    placeholder="Enter purchase amount"
                                    style={{
                                        width: '100%',
                                        padding: '16px 20px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '14px',
                                        color: '#F8FAFC',
                                        fontSize: '16px',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#F59E0B'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                                />
                            </div>

                            {txError && (
                                <div style={{
                                    padding: '14px 18px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '14px',
                                    color: '#FCA5A5',
                                    fontSize: '14px',
                                    marginBottom: '20px'
                                }}>
                                    {txError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={txLoading}
                                style={{
                                    width: '100%',
                                    padding: '18px',
                                    background: txLoading ? '#64748B' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                                    color: '#FFF',
                                    border: 'none',
                                    borderRadius: '14px',
                                    fontSize: '17px',
                                    fontWeight: '700',
                                    cursor: txLoading ? 'not-allowed' : 'pointer',
                                    boxShadow: txLoading ? 'none' : '0 12px 28px rgba(245, 158, 11, 0.4)',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}>
                                <DollarSign size={20} />
                                {txLoading ? 'Processing Transaction...' : 'Submit Transaction'}
                            </button>
                        </form>

                        {txResult && (
                            <div style={{
                                padding: '24px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '16px',
                                marginTop: '24px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '20px'
                                }}>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: '20px',
                                        fontWeight: '700',
                                        color: '#10B981',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}>
                                        <img src={zepterLogo} alt="Zepter Logo" style={{ width: '22px', height: '22px' }} />

                                        Transaction Successful
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setActiveTab('overview');
                                            loadUserData();
                                        }}
                                        style={{
                                            padding: '8px 16px',
                                            background: 'rgba(16, 185, 129, 0.2)',
                                            border: '1px solid rgba(16, 185, 129, 0.4)',
                                            borderRadius: '10px',
                                            color: '#10B981',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.3)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                                    >
                                        View Updated Stats →
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gap: '14px', fontSize: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <span style={{ color: '#94A3B8' }}>Amount:</span>
                                        <span style={{ fontWeight: '700', color: '#F8FAFC' }}>{formatCurrency(txResult.amount)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <span style={{ color: '#94A3B8' }}>Discount Level Applied:</span>
                                        <span style={{ fontWeight: '700', color: '#F59E0B' }}>{txResult.discount_level}</span>
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#64748B',
                                        fontStyle: 'italic',
                                        padding: '8px 12px',
                                        background: 'rgba(245, 158, 11, 0.05)',
                                        borderRadius: '8px',
                                        marginTop: '4px',
                                        marginBottom: '8px'
                                    }}>
                                        Note: This is the discount level that was applied to THIS purchase. Your NEW discount level (after this purchase) can be viewed in the Overview tab.
                                    </div>
                                    {txResult.parent_id && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                            <span style={{ color: '#94A3B8' }}>Parent Commission:</span>
                                            <span style={{ fontWeight: '700', color: '#10B981' }}>{formatCurrency(txResult.parent_commission)}</span>
                                        </div>
                                    )}

                                    {txResult.managerial_payouts && txResult.managerial_payouts.length > 0 && (
                                        <div style={{ marginTop: '16px' }}>
                                            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#CBD5E1', marginBottom: '12px' }}>
                                                Managerial Payouts:
                                            </h4>
                                            {txResult.managerial_payouts.map((payout, idx) => (
                                                <div key={idx} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    padding: '10px 16px',
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    borderRadius: '10px',
                                                    marginBottom: '8px'
                                                }}>
                                                    <span style={{ color: '#94A3B8' }}>Level {payout.depth}</span>
                                                    <span style={{ fontWeight: '600', color: '#F8FAFC' }}>{formatCurrency(payout.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'performance' && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px',
                        padding: '32px',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
                    }}>
                        <h2 style={{ marginTop: 0, fontSize: '28px', fontWeight: '700', marginBottom: '24px' }}>
                            Rank Progression
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {Object.entries(RANKS).map(([key, rankInfo]) => {
                                const isCurrentRank = userData?.rank === key;
                                const isPastRank = rankInfo.level < rank.level;

                                return (
                                    <div
                                        key={key}
                                        style={{
                                            padding: '20px 24px',
                                            background: isCurrentRank ? `${rankInfo.color}22` : 'rgba(255, 255, 255, 0.03)',
                                            border: `2px solid ${isCurrentRank ? rankInfo.color : 'rgba(255, 255, 255, 0.1)'}`,
                                            borderRadius: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'all 0.3s',
                                            opacity: isPastRank ? 0.6 : 1
                                        }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '12px',
                                                background: `${rankInfo.color}33`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `2px solid ${rankInfo.color}`
                                            }}>
                                                <Award size={24} color={rankInfo.color} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '18px', fontWeight: '700', color: rankInfo.color }}>
                                                    {rankInfo.label}
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>
                                                    Level {rankInfo.level}
                                                </div>
                                            </div>
                                        </div>

                                        {isCurrentRank && (
                                            <div style={{
                                                padding: '8px 16px',
                                                background: `${rankInfo.color}44`,
                                                borderRadius: '10px',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                color: rankInfo.color,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <ChevronRight size={16} />
                                                Current
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Stat Card Component
function StatCard({ icon, label, value, color, subtitle }) {
    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s'
        }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 28px 50px rgba(0, 0, 0, 0.3)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.2)';
            }}>
            <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: `${color}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                border: `2px solid ${color}44`
            }}>
                {React.cloneElement(icon, { color })}
            </div>
            <div style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '8px', fontWeight: '500' }}>
                {label}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#F8FAFC', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                {value}
            </div>
            {subtitle && (
                <div style={{ fontSize: '13px', color: '#64748B' }}>
                    {subtitle}
                </div>
            )}
        </div>
    );
}

// Helper function to decode JWT and extract user ID
const decodeJWT = (token) => {
    try {
        // JWT format: header.payload.signature
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT format');
        }

        // Decode the payload (second part)
        const payload = JSON.parse(atob(parts[1]));

        // The user ID is in the 'sub' claim according to JWT standards
        // But we should also check for 'user_id' or 'id' as fallback
        const userId = payload.sub || payload.user_id || payload.id;

        if (!userId) {
            throw new Error('No user ID found in token');
        }

        return {
            user_id: userId,
            role: payload.role || 'user',
            exp: payload.exp
        };
    } catch (err) {
        console.error('JWT decode error:', err);
        return null;
    }
};

// Main App Component
export default function App() {
    const [authData, setAuthData] = useState(null);

    useEffect(() => {
        // Check for existing token
        const token = localStorage.getItem('access_token');
        if (token) {
            const decoded = decodeJWT(token);
            if (decoded) {
                // Check if token is expired
                if (decoded.exp && decoded.exp * 1000 < Date.now()) {
                    console.log('Token expired, clearing...');
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                } else {
                    setAuthData(decoded);
                }
            } else {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
            }
        }
    }, []);

    const handleLogin = (data) => {
        // Extract user ID from token
        const decoded = decodeJWT(data.access_token);
        if (decoded) {
            setAuthData(decoded);
        } else {
            console.error('Failed to decode access token');
        }
    };

    const handleLogout = () => {
        const api = new ZepterAPI();
        api.logout();
        setAuthData(null);
    };

    if (!authData) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return <Dashboard userId={authData.user_id} onLogout={handleLogout} />;
}