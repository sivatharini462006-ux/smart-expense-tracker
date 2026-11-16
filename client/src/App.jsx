import React, { useState, useEffect } from 'react';
import API from './services/api';
import { 
  Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, 
  PlusCircle, LogOut, PieChart as ChartIcon, Target, 
  Trash2, AlertTriangle, CheckCircle2, LayoutDashboard,
  Search, Sparkles, ShieldCheck, Calendar, CreditCard, 
  Bell, Sun, Moon, Zap, Coffee, Utensils, Car, Check
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'budgets' | 'savings'
  const [darkMode, setDarkMode] = useState(false);

  // Auth Form State
  const [isRegister, setIsRegister] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Dashboard & Module Data State
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Filter State for Transactions
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals State
  const [showTxModal, setShowTxModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [contributeModal, setContributeModal] = useState({ open: false, goalId: null, title: '' });

  // Forms State
  const [transactionForm, setTransactionForm] = useState({
    type: 'EXPENSE',
    category_id: '',
    amount: '',
    payment_method: 'UPI',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [budgetForm, setBudgetForm] = useState({
    category_id: '',
    allocated_amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const [goalForm, setGoalForm] = useState({
    title: '',
    target_amount: '',
    target_date: ''
  });

  const [contributeAmount, setContributeAmount] = useState('');

  // Authentication Handler
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister 
        ? authForm 
        : { email: authForm.email, password: authForm.password };
      
      const { data } = await API.post(endpoint, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  };

  // Load All Data from Backend
  const fetchAllData = async () => {
    if (!token) return;
    try {
      const [sumRes, insRes, catRes, budRes, goalRes, notifRes] = await Promise.all([
        API.get('/analytics/dashboard'),
        API.get('/analytics/insights'),
        API.get('/categories'),
        API.get('/budgets'),
        API.get('/savings'),
        API.get('/notifications').catch(() => ({ data: { notifications: [] } }))
      ]);

      setSummary(sumRes.data.data);
      setInsights(insRes.data.insights);
      setCategories(catRes.data.categories);
      setBudgets(budRes.data.budgets || []);
      setBudgetAlerts(budRes.data.alerts || []);
      setGoals(goalRes.data.goals || []);
      setNotifications(notifRes.data.notifications || []);

      const expenseCats = catRes.data.categories.filter(c => c.type === 'EXPENSE');
      if (expenseCats.length > 0) {
        if (!transactionForm.category_id) {
          setTransactionForm(prev => ({ ...prev, category_id: expenseCats[0].id }));
        }
        if (!budgetForm.category_id) {
          setBudgetForm(prev => ({ ...prev, category_id: expenseCats[0].id }));
        }
      }
    } catch (err) {
      console.error('Error syncing with backend:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  // Mark Notification Read
  const handleMarkNotificationsRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  // Transaction Handlers
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      await API.post('/transactions', transactionForm);
      setShowTxModal(false);
      setTransactionForm({
        type: 'EXPENSE',
        category_id: categories.find(c => c.type === 'EXPENSE')?.id || '',
        amount: '',
        payment_method: 'UPI',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add transaction');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await API.delete(`/transactions/${id}`);
      fetchAllData();
    } catch (err) {
      alert('Failed to delete transaction');
    }
  };

  // Budget Handlers
  const handleSetBudget = async (e) => {
    e.preventDefault();
    try {
      await API.post('/budgets', budgetForm);
      setShowBudgetModal(false);
      setBudgetForm(prev => ({ ...prev, allocated_amount: '' }));
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save budget');
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Remove this category budget?')) return;
    try {
      await API.delete(`/budgets/${id}`);
      fetchAllData();
    } catch (err) {
      alert('Failed to remove budget');
    }
  };

  // Savings Goal Handlers
  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      await API.post('/savings', goalForm);
      setShowGoalModal(false);
      setGoalForm({ title: '', target_amount: '', target_date: '' });
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create savings goal');
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/savings/${contributeModal.goalId}/contribute`, {
        amount: contributeAmount
      });
      setContributeModal({ open: false, goalId: null, title: '' });
      setContributeAmount('');
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record contribution');
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Delete this savings goal?')) return;
    try {
      await API.delete(`/savings/${id}`);
      fetchAllData();
    } catch (err) {
      alert('Failed to delete goal');
    }
  };

  // Filtered Transactions
  const filteredTransactions = (summary?.recent_transactions || []).filter((t) => {
    const matchesSearch = 
      (t.category_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.payment_method || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length + budgetAlerts.length;

  // 1. Flagship Split-Screen Login / Register Screen
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 border border-white/10">
          {/* Left Showcase Panel */}
          <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 p-10 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl" />
            <div>
              <div className="inline-flex items-center space-x-2.5 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 mb-8">
                <div className="p-1.5 bg-emerald-500 rounded-lg text-slate-950">
                  <Wallet size={18} />
                </div>
                <span className="font-extrabold tracking-wide text-sm">SmartExpense Pro</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-4 tracking-tight">
                Master every rupee with intelligent clarity.
              </h1>
              <p className="text-emerald-100/75 text-sm leading-relaxed">
                A full-stack personal finance command center engineered with real-time budget guards, savings milestones, and automated spend forecasting.
              </p>
            </div>

            {/* Mock Floating Preview Card */}
            <div className="my-8 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Live Portfolio Snapshot</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-400/20 text-emerald-300 rounded-full">INR (₹)</span>
              </div>
              <div className="text-2xl font-black mb-1">₹44,550.00</div>
              <div className="text-xs text-slate-300 flex items-center space-x-2">
                <span className="text-emerald-400 font-bold">↑ 98.9% Savings Rate</span>
                <span>•</span>
                <span>Zero budget overruns</span>
              </div>
            </div>

            <div className="space-y-3 text-xs text-emerald-100/90 font-medium">
              <div className="flex items-center space-x-2.5">
                <Sparkles size={15} className="text-emerald-400" />
                <span>AI-driven daily spending projections & insights</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <ShieldCheck size={15} className="text-emerald-400" />
                <span>End-to-end JWT security & MySQL relational persistence</span>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="lg:col-span-6 p-10 sm:p-12 flex flex-col justify-center bg-white">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900 mb-1.5">
                {isRegister ? 'Create your workspace' : 'Welcome back'}
              </h2>
              <p className="text-sm text-slate-500">
                {isRegister ? 'Set up your personal finance tracker in seconds' : 'Enter your credentials to access your financial command center'}
              </p>
            </div>

            {authError && (
              <div className="p-3.5 mb-5 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center space-x-2">
                <AlertTriangle size={16} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Sivu"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="sivu@example.com"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition transform active:scale-[0.99]"
              >
                {isRegister ? 'Launch Workspace' : 'Sign In to Dashboard'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-8">
              {isRegister ? 'Already have an account?' : "New to SmartExpense?"}{' '}
              <button 
                onClick={() => { setIsRegister(!isRegister); setAuthError(''); }}
                className="text-emerald-600 font-extrabold hover:underline"
              >
                {isRegister ? 'Sign In' : 'Create Free Account'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Theme Helper Classes
  const bgMain = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#f8fafc] text-slate-800';
  const cardBg = darkMode ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200/80 text-slate-800';
  const subText = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputBg = darkMode ? 'bg-slate-800 border-slate-700 text-white focus:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white';

  // 2. Main Authenticated Command Center
  return (
    <div className={`min-h-screen flex ${bgMain} transition-colors duration-300`}>
      
      {/* Left Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 text-white border-r border-slate-800 p-6 justify-between fixed inset-y-0 left-0 z-40">
        <div>
          <div className="flex items-center space-x-3 mb-10">
            <div className="p-2.5 bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 rounded-2xl shadow-lg shadow-emerald-500/20">
              <Wallet size={22} />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight block leading-none">SmartExpense</span>
              <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Finance Suite</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 px-3 mb-2">Menu</p>
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'overview' 
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard size={18} />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('budgets')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'budgets' 
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ChartIcon size={18} />
                <span>Budgets</span>
              </div>
              {budgetAlerts.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black bg-rose-500 text-white rounded-full">
                  {budgetAlerts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('savings')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'savings' 
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Target size={18} />
              <span>Savings Goals</span>
            </button>
          </div>
        </div>

        {/* Bottom Status & User Card */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>MySQL Live Sync</span>
            </div>
            <p className="text-[11px] text-slate-400">Connected to localhost:5000</p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-sm flex items-center justify-center uppercase">
                {(user?.name || 'S')[0]}
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">{user?.name || 'Sivu'}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[110px]">{user?.email || 'sivu@example.com'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        
        {/* Top Glass Header */}
        <header className={`${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200/80'} backdrop-blur-xl border-b sticky top-0 z-30`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
            {/* Mobile Nav Switcher */}
            <div className="flex lg:hidden items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {['overview', 'budgets', 'savings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize ${
                    activeTab === tab ? 'bg-emerald-600 text-white' : 'text-slate-500'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="hidden lg:block">
              <h2 className="text-sm font-extrabold capitalize tracking-tight">
                {activeTab === 'overview' ? 'Financial Dashboard' : activeTab === 'budgets' ? 'Budget Guardrails' : 'Wealth & Savings Goals'}
              </h2>
            </div>

            {/* Right Controls */}
            <div className="flex items-center space-x-2.5">
              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2.5 rounded-xl border transition ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Toggle Dark / Light Mode"
              >
                {darkMode ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className={`p-2.5 rounded-xl border transition relative ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Bell size={17} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifDropdown && (
                  <div className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl border p-4 z-50 ${cardBg}`}>
                    <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-200/60">
                      <span className="text-xs font-extrabold uppercase tracking-wider">Alerts & Notifications</span>
                      <button
                        onClick={handleMarkNotificationsRead}
                        className="text-[11px] font-bold text-emerald-500 hover:underline flex items-center space-x-1"
                      >
                        <Check size={12} />
                        <span>Mark read</span>
                      </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {budgetAlerts.map((a, idx) => (
                        <div key={`b-${idx}`} className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                          <p className="font-bold text-rose-500">Budget Alert: {a.category}</p>
                          <p className={subText}>Used {a.percentage}% (₹{a.spent} / ₹{a.allocated})</p>
                        </div>
                      ))}
                      {notifications.length === 0 && budgetAlerts.length === 0 ? (
                        <p className={`text-xs text-center py-4 ${subText}`}>All clear! No new alerts.</p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`p-2.5 rounded-xl text-xs border ${n.is_read ? 'opacity-60 border-transparent' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                            <p className="font-bold">{n.title}</p>
                            <p className={subText}>{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Primary Add Entry Button */}
              <button
                onClick={() => setShowTxModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition transform active:scale-95"
              >
                <PlusCircle size={16} />
                <span>Add Entry</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Workspace Container */}
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Top Hero Row: Virtual Metallic Wallet Card + Welcome Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Virtual Balance Card */}
                <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[200px]">
                  <div className="absolute -right-10 -top-10 w-44 h-44 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-emerald-300/80 font-bold">Available Net Balance</p>
                      <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
                        ₹{summary?.net_savings?.toLocaleString('en-IN') || 0}
                      </h2>
                    </div>
                    <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
                      <Zap size={20} className="text-emerald-300" />
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Account Holder</p>
                      <p className="text-sm font-bold tracking-wide uppercase">{user?.name || 'SIVATHARINI M S'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Savings Ratio</p>
                      <p className="text-sm font-black text-emerald-400">{summary?.savings_percentage || 0}% Saved</p>
                    </div>
                  </div>
                </div>

                {/* Right KPI Grid (2x2) */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={`p-5 rounded-3xl border shadow-sm transition hover:shadow-md ${cardBg}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-xs font-extrabold uppercase tracking-wider ${subText}`}>Total Income</span>
                      <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl"><ArrowUpRight size={18} /></div>
                    </div>
                    <div className="text-2xl font-black">₹{summary?.total_income?.toLocaleString('en-IN') || 0}</div>
                    <p className="text-xs text-emerald-500 font-semibold mt-1">Monthly inflow</p>
                  </div>

                  <div className={`p-5 rounded-3xl border shadow-sm transition hover:shadow-md ${cardBg}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-xs font-extrabold uppercase tracking-wider ${subText}`}>Total Expense</span>
                      <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl"><ArrowDownRight size={18} /></div>
                    </div>
                    <div className="text-2xl font-black">₹{summary?.total_expense?.toLocaleString('en-IN') || 0}</div>
                    <p className="text-xs text-rose-500 font-semibold mt-1">Monthly outflow</p>
                  </div>

                  <div className={`p-5 rounded-3xl border shadow-sm transition hover:shadow-md ${cardBg}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-xs font-extrabold uppercase tracking-wider ${subText}`}>Daily Burn Rate</span>
                      <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl"><TrendingUp size={18} /></div>
                    </div>
                    <div className="text-2xl font-black">₹{insights?.average_daily_expense || 0}</div>
                    <p className={`text-xs font-semibold mt-1 ${subText}`}>Average spend / day</p>
                  </div>

                  <div className={`p-5 rounded-3xl border shadow-sm transition hover:shadow-md ${cardBg}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-xs font-extrabold uppercase tracking-wider ${subText}`}>Projected Spend</span>
                      <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl"><ChartIcon size={18} /></div>
                    </div>
                    <div className="text-2xl font-black">₹{insights?.projected_monthly_expense?.toLocaleString('en-IN') || 0}</div>
                    <p className={`text-xs font-semibold mt-1 ${subText}`}>Estimated month-end</p>
                  </div>
                </div>
              </div>

              {/* Smart Insights Pill Strip */}
              {insights?.smart_suggestions?.length > 0 && (
                <div className={`rounded-3xl p-5 border shadow-sm ${darkMode ? 'bg-emerald-950/30 border-emerald-800/50' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/70'}`}>
                  <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs uppercase tracking-wider mb-3">
                    <Sparkles size={16} />
                    <span>Smart Financial Advisor</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.smart_suggestions.map((msg, i) => (
                      <div key={i} className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium border ${darkMode ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white/90 border-emerald-100 text-slate-700'}`}>
                        {msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Donut Chart */}
                <div className={`p-6 rounded-3xl border shadow-sm ${cardBg}`}>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-base font-extrabold">Spending Distribution</h3>
                      <p className={`text-xs ${subText}`}>Category share this month</p>
                    </div>
                  </div>
                  <div className="h-64">
                    {insights?.category_breakdown?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={insights.category_breakdown}
                            dataKey="total"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={88}
                            paddingAngle={4}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {insights.category_breakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || '#10b981'} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className={`h-full flex items-center justify-center text-sm ${subText}`}>
                        Add expenses to visualize category distribution.
                      </div>
                    )}
                  </div>
                </div>

                {/* Smooth Gradient AreaChart */}
                <div className={`p-6 rounded-3xl border shadow-sm ${cardBg}`}>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-base font-extrabold">Cash Flow Velocity</h3>
                      <p className={`text-xs ${subText}`}>Income vs Expense trajectory</p>
                    </div>
                  </div>
                  <div className="h-64">
                    {insights?.monthly_trend?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={insights.monthly_trend}>
                          <defs>
                            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="month_label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)' }}
                          />
                          <Legend />
                          <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#incomeGrad)" name="Income (₹)" />
                          <Area type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={3} fillOpacity={1} fill="url(#expenseGrad)" name="Expense (₹)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className={`h-full flex items-center justify-center text-sm ${subText}`}>
                        Cash flow trends will appear as transactions accumulate.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Transaction Ledger */}
              <div className={`rounded-3xl border shadow-sm overflow-hidden ${cardBg}`}>
                <div className="p-6 border-b border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-base font-extrabold">Recent Ledger</h3>
                    <p className={`text-xs ${subText}`}>Real-time synced records from MySQL</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search category or note..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`pl-9 pr-3.5 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                      />
                    </div>

                    <div className={`flex p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      {['ALL', 'INCOME', 'EXPENSE'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setTypeFilter(type)}
                          className={`px-3 py-1 text-[11px] font-extrabold rounded-lg transition ${
                            typeFilter === type 
                              ? 'bg-emerald-600 text-white shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className={`text-[11px] uppercase tracking-wider font-extrabold border-b ${darkMode ? 'bg-slate-800/50 text-slate-400 border-slate-800' : 'bg-slate-50/80 text-slate-400 border-slate-100'}`}>
                      <tr>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="6" className={`px-6 py-10 text-center text-sm ${subText}`}>
                            No matching transactions found.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((t) => (
                          <tr key={t.id} className="hover:bg-emerald-500/5 transition">
                            <td className="px-6 py-4 font-bold flex items-center space-x-3">
                              <span 
                                className="w-3 h-3 rounded-full shadow-sm" 
                                style={{ backgroundColor: t.color || '#10b981' }} 
                              />
                              <span>{t.category_name}</span>
                            </td>
                            <td className={`px-6 py-4 ${subText}`}>{t.description || '—'}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                <CreditCard size={12} />
                                <span>{t.payment_method}</span>
                              </span>
                            </td>
                            <td className={`px-6 py-4 text-xs font-semibold ${subText}`}>{t.date}</td>
                            <td className={`px-6 py-4 text-right font-black ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {t.type === 'INCOME' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: MONTHLY BUDGETS */}
          {activeTab === 'budgets' && (
            <div className="space-y-6">
              <div className={`p-6 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${cardBg}`}>
                <div>
                  <h2 className="text-xl font-black">Monthly Category Budgets</h2>
                  <p className={`text-sm ${subText}`}>Enforce spending limits with automated threshold warnings</p>
                </div>
                <button
                  onClick={() => setShowBudgetModal(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition"
                >
                  <PlusCircle size={16} />
                  <span>Set Budget Limit</span>
                </button>
              </div>

              {budgetAlerts.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-5 space-y-2">
                  <div className="flex items-center space-x-2 text-rose-500 font-extrabold text-xs uppercase tracking-wider">
                    <AlertTriangle size={16} />
                    <span>Threshold Exceeded Alerts</span>
                  </div>
                  {budgetAlerts.map((alert, i) => (
                    <p key={i} className="text-sm font-medium">
                      • <strong>{alert.category}</strong> is at <strong>{alert.percentage}%</strong> utilization (₹{Number(alert.spent).toLocaleString('en-IN')} / ₹{Number(alert.allocated).toLocaleString('en-IN')})
                    </p>
                  ))}
                </div>
              )}

              {budgets.length === 0 ? (
                <div className={`rounded-3xl border p-14 text-center shadow-sm ${cardBg}`}>
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ChartIcon size={26} />
                  </div>
                  <h3 className="text-base font-extrabold mb-1">No category budgets active</h3>
                  <p className={`text-sm mb-5 ${subText}`}>Create your first category cap to monitor monthly spending health.</p>
                  <button
                    onClick={() => setShowBudgetModal(true)}
                    className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-500 transition"
                  >
                    + Create Budget Limit
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {budgets.map((b) => {
                    const pct = Math.min(Number(b.percentage_used), 100);
                    const isOver = Number(b.percentage_used) > 100;
                    const isWarning = Number(b.percentage_used) >= 85;
                    return (
                      <div key={b.id} className={`p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all space-y-4 ${cardBg}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`inline-block px-2.5 py-0.5 text-[11px] font-extrabold rounded-full mb-2 ${
                              isOver ? 'bg-rose-500/15 text-rose-500' : isWarning ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'
                            }`}>
                              {b.percentage_used}% Used
                            </span>
                            <h4 className="font-black text-lg">{b.category_name}</h4>
                          </div>
                          <button
                            onClick={() => handleDeleteBudget(b.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="w-full bg-slate-200/50 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOver ? 'bg-gradient-to-r from-rose-500 to-red-600' : isWarning ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-xs font-bold pt-2 border-t border-slate-200/50 dark:border-slate-800">
                          <span>Spent: ₹{Number(b.spent_amount).toLocaleString('en-IN')}</span>
                          <span className={subText}>Cap: ₹{Number(b.allocated_amount).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SAVINGS GOALS */}
          {activeTab === 'savings' && (
            <div className="space-y-6">
              <div className={`p-6 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${cardBg}`}>
                <div>
                  <h2 className="text-xl font-black">Savings Milestones</h2>
                  <p className={`text-sm ${subText}`}>Track dedicated targets and log incremental deposits</p>
                </div>
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition"
                >
                  <PlusCircle size={16} />
                  <span>New Savings Goal</span>
                </button>
              </div>

              {goals.length === 0 ? (
                <div className={`rounded-3xl border p-14 text-center shadow-sm ${cardBg}`}>
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Target size={26} />
                  </div>
                  <h3 className="text-base font-extrabold mb-1">No savings goals yet</h3>
                  <p className={`text-sm mb-5 ${subText}`}>Define a target amount and deadline to start building your fund.</p>
                  <button
                    onClick={() => setShowGoalModal(true)}
                    className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-500 transition"
                  >
                    + Create First Goal
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {goals.map((g) => {
                    const pct = Math.min(Number(g.progress_percentage), 100);
                    const isDone = g.status === 'COMPLETED';
                    return (
                      <div key={g.id} className={`p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5 ${cardBg}`}>
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-black text-lg">{g.title}</h4>
                            <button
                              onClick={() => handleDeleteGoal(g.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <p className={`text-xs font-semibold flex items-center space-x-1.5 ${subText}`}>
                            <Calendar size={12} />
                            <span>Target: {g.target_date}</span>
                          </p>
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex justify-between items-baseline">
                            <span className="text-2xl font-black text-emerald-500">
                              ₹{Number(g.saved_amount).toLocaleString('en-IN')}
                            </span>
                            <span className={`text-xs font-bold ${subText}`}>
                              of ₹{Number(g.target_amount).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200/50 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className={`flex justify-between items-center text-xs font-bold ${subText}`}>
                            <span>{g.progress_percentage}% achieved</span>
                            {isDone && (
                              <span className="inline-flex items-center space-x-1 text-emerald-500 bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
                                <CheckCircle2 size={13} />
                                <span>Completed</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {!isDone && (
                          <button
                            onClick={() => setContributeModal({ open: true, goalId: g.id, title: g.title })}
                            className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 hover:text-white font-extrabold text-xs rounded-xl transition"
                          >
                            + Add Contribution
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: Add Transaction with Quick Presets */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-3xl shadow-2xl w-full max-w-md p-6 border ${cardBg}`}>
            <h2 className="text-xl font-black mb-1">Record New Entry</h2>
            <p className={`text-xs mb-4 ${subText}`}>Log an income or expense transaction in ₹</p>

            {/* 1-Click Quick Amount Presets */}
            <div className="flex items-center space-x-2 mb-4">
              <span className={`text-[11px] font-bold uppercase ${subText}`}>Quick:</span>
              {[100, 250, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTransactionForm({ ...transactionForm, amount: String(amt) })}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition"
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const firstExp = categories.find(c => c.type === 'EXPENSE')?.id || '';
                    setTransactionForm({ ...transactionForm, type: 'EXPENSE', category_id: firstExp });
                  }}
                  className={`py-2.5 text-sm font-extrabold rounded-xl border transition ${
                    transactionForm.type === 'EXPENSE'
                      ? 'bg-rose-500/15 border-rose-500 text-rose-500'
                      : 'border-slate-300/40 text-slate-400'
                  }`}
                >
                  Expense (-)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstInc = categories.find(c => c.type === 'INCOME')?.id || '';
                    setTransactionForm({ ...transactionForm, type: 'INCOME', category_id: firstInc });
                  }}
                  className={`py-2.5 text-sm font-extrabold rounded-xl border transition ${
                    transactionForm.type === 'INCOME'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500'
                      : 'border-slate-300/40 text-slate-400'
                  }`}
                >
                  Income (+)
                </button>
              </div>

              <div>
                <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1 ${subText}`}>Category</label>
                <select
                  value={transactionForm.category_id}
                  onChange={(e) => setTransactionForm({ ...transactionForm, category_id: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                >
                  {categories
                    .filter((c) => c.type === transactionForm.type)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1 ${subText}`}>Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1 ${subText}`}>Date</label>
                  <input
                    type="date"
                    required
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1 ${subText}`}>Payment Method</label>
                <select
                  value={transactionForm.payment_method}
                  onChange={(e) => setTransactionForm({ ...transactionForm, payment_method: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                >
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="Cash">Cash</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>

              <div>
                <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1 ${subText}`}>Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Coffee, Metro pass, Groceries"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-4 py-2.5 border border-slate-300/40 rounded-xl text-sm font-bold hover:bg-slate-500/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-extrabold shadow-lg shadow-emerald-600/20"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Set Category Budget */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-3xl shadow-2xl w-full max-w-md p-6 border ${cardBg}`}>
            <h2 className="text-xl font-black mb-4">Set Category Budget</h2>
            <form onSubmit={handleSetBudget} className="space-y-4">
              <div>
                <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1 ${subText}`}>Expense Category</label>
                <select
                  value={budgetForm.category_id}
                  onChange={(e) => setBudgetForm({ ...budgetForm, category_id: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                >
                  {categories
                    .filter((c) => c.type === 'EXPENSE')
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1 ${subText}`}>Monthly Limit (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={budgetForm.allocated_amount}
                  onChange={(e) => setBudgetForm({ ...budgetForm, allocated_amount: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="px-4 py-2.5 border border-slate-300/40 rounded-xl text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-extrabold shadow-lg shadow-emerald-600/20"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Savings Goal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-3xl shadow-2xl w-full max-w-md p-6 border ${cardBg}`}>
            <h2 className="text-xl font-black mb-4">Create Savings Goal</h2>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1 ${subText}`}>Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund, MacBook Pro"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1 ${subText}`}>Target Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 25000"
                  value={goalForm.target_amount}
                  onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1 ${subText}`}>Target Date</label>
                <input
                  type="date"
                  required
                  value={goalForm.target_date}
                  onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2.5 border border-slate-300/40 rounded-xl text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-extrabold shadow-lg shadow-emerald-600/20"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Contribute to Savings Goal */}
      {contributeModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-3xl shadow-2xl w-full max-w-sm p-6 border ${cardBg}`}>
            <h2 className="text-lg font-black mb-1">Add Contribution</h2>
            <p className={`text-xs mb-4 ${subText}`}>Goal: <span className="font-bold text-emerald-500">{contributeModal.title}</span></p>
            <form onSubmit={handleContribute} className="space-y-4">
              <div>
                <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1 ${subText}`}>Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 2000"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setContributeModal({ open: false, goalId: null, title: '' })}
                  className="px-4 py-2 border border-slate-300/40 rounded-xl text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-extrabold shadow-lg shadow-emerald-600/20"
                >
                  Add Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}