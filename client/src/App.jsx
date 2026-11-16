import React, { useState, useEffect } from 'react';
import API from './services/api';
import { 
  Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, 
  PlusCircle, LogOut, PieChart as ChartIcon, Target, 
  Trash2, AlertTriangle, CheckCircle2, LayoutDashboard,
  Search, Sparkles, ShieldCheck, Calendar, CreditCard, Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'budgets' | 'savings'
  
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

  // Filter State for Transactions
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'INCOME' | 'EXPENSE'

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
      const [sumRes, insRes, catRes, budRes, goalRes] = await Promise.all([
        API.get('/analytics/dashboard'),
        API.get('/analytics/insights'),
        API.get('/categories'),
        API.get('/budgets'),
        API.get('/savings')
      ]);

      setSummary(sumRes.data.data);
      setInsights(insRes.data.insights);
      setCategories(catRes.data.categories);
      setBudgets(budRes.data.budgets || []);
      setBudgetAlerts(budRes.data.alerts || []);
      setGoals(goalRes.data.goals || []);

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

  // 1. Attractive Split-Screen Login / Register Screen
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient Glowing Background Orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 relative z-10">
          {/* Left Branding Panel */}
          <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 p-8 md:p-10 text-white flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center space-x-2.5 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 mb-8">
                <Wallet size={22} className="text-emerald-300" />
                <span className="font-bold tracking-wide text-sm">Smart Expense Tracker</span>
              </div>
              <h1 className="text-3xl font-extrabold leading-tight mb-4">
                Take complete control of your personal finances.
              </h1>
              <p className="text-emerald-100/80 text-sm leading-relaxed">
                Track daily expenses, enforce smart category budgets, and achieve your savings milestones with real-time visual analytics.
              </p>
            </div>

            <div className="space-y-4 mt-10">
              <div className="flex items-center space-x-3 text-sm text-emerald-100">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-300">
                  <Sparkles size={16} />
                </div>
                <span>Automated spending forecasts & smart insights</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-emerald-100">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-300">
                  <Target size={16} />
                </div>
                <span>Real-time budget alerts & goal progress tracking</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-emerald-100">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-300">
                  <ShieldCheck size={16} />
                </div>
                <span>JWT-secured multi-user MySQL architecture</span>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="p-8 md:p-10 flex flex-col justify-center bg-white">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-1">
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {isRegister ? 'Start managing your income and budgets in ₹' : 'Sign in to access your financial workspace'}
            </p>

            {authError && (
              <div className="p-3 mb-4 text-xs font-medium bg-rose-50 border border-rose-200 text-rose-600 rounded-xl flex items-center space-x-2">
                <AlertTriangle size={16} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Sivu"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="sivu@example.com"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition transform active:scale-[0.99]"
              >
                {isRegister ? 'Create Free Account' : 'Sign In to Dashboard'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                onClick={() => { setIsRegister(!isRegister); setAuthError(''); }}
                className="text-emerald-600 font-bold hover:underline"
              >
                {isRegister ? 'Sign In' : 'Create One'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Main Authenticated Workspace
  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800">
      {/* Frosted Glass Top Navbar */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-sm">
                <Wallet size={20} />
              </div>
              <span className="font-extrabold text-lg bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent hidden sm:inline">
                SmartExpense
              </span>
            </div>

            {/* Pill Navigation Tabs */}
            <nav className="flex space-x-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'overview' 
                    ? 'bg-white text-emerald-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard size={15} />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('budgets')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'budgets' 
                    ? 'bg-white text-emerald-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ChartIcon size={15} />
                <span>Budgets</span>
                {budgetAlerts.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('savings')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'savings' 
                    ? 'bg-white text-emerald-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Target size={15} />
                <span>Savings Goals</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-full">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center uppercase">
                {(user?.name || 'S')[0]}
              </div>
              <span className="text-xs font-semibold text-slate-700">{user?.name || 'Sivu'}</span>
            </div>

            <button
              onClick={() => setShowTxModal(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition transform active:scale-95"
            >
              <PlusCircle size={16} />
              <span>Add Entry</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            {/* Welcome Hero Strip */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-1">
                  <Sparkles size={14} />
                  <span>Personal Finance Overview</span>
                </div>
                <h1 className="text-2xl font-bold">Welcome back, {user?.name || 'Sivu'}!</h1>
                <p className="text-slate-300 text-sm mt-0.5">
                  Here is your real-time cash flow, category breakdown, and savings performance.
                </p>
              </div>
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
                <Calendar size={20} className="text-emerald-300" />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-300">Active Period</p>
                  <p className="text-sm font-bold">
                    {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Elevated KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Income</span>
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <ArrowUpRight size={18} />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-slate-800">
                  ₹{summary?.total_income?.toLocaleString('en-IN') || 0}
                </div>
                <div className="mt-2 inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  + Credited this month
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Expense</span>
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                    <ArrowDownRight size={18} />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-slate-800">
                  ₹{summary?.total_expense?.toLocaleString('en-IN') || 0}
                </div>
                <div className="mt-2 inline-flex items-center text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                  - Debited this month
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Net Balance</span>
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <TrendingUp size={18} />
                  </div>
                </div>
                <div className={`text-2xl font-extrabold ${(summary?.net_savings || 0) >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                  ₹{summary?.net_savings?.toLocaleString('en-IN') || 0}
                </div>
                <div className="mt-2 inline-flex items-center text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  Savings rate: {summary?.savings_percentage || 0}%
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Projected Spend</span>
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                    <ChartIcon size={18} />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-slate-800">
                  ₹{insights?.projected_monthly_expense?.toLocaleString('en-IN') || 0}
                </div>
                <div className="mt-2 inline-flex items-center text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                  Avg ₹{insights?.average_daily_expense || 0}/day
                </div>
              </div>
            </div>

            {/* Smart Insights Banner */}
            {insights?.smart_suggestions?.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2">
                  <Sparkles size={16} className="text-emerald-600" />
                  <span>Smart Financial Insights</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {insights.smart_suggestions.map((msg, i) => (
                    <div key={i} className="bg-white/70 px-3.5 py-2 rounded-xl text-sm text-emerald-950 border border-emerald-100">
                      {msg}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-800">Spending by Category</h3>
                  <span className="text-xs text-slate-400 font-medium">Current Month</span>
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
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {insights.category_breakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || '#10b981'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                      No expense records yet this month.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-800">Income vs Expense Trend</h3>
                  <span className="text-xs text-slate-400 font-medium">Monthly Comparison</span>
                </div>
                <div className="h-64">
                  {insights?.monthly_trend?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insights.monthly_trend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month_label" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip 
                          formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                        <Bar dataKey="income" fill="#10B981" name="Income (₹)" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="expense" fill="#F43F5E" name="Expense (₹)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                      Trend data will populate as transactions are added.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Transaction Ledger with Search & Filter */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Transaction History</h3>
                  <p className="text-xs text-slate-400">Filter and review your recent financial records</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search Box */}
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search category or note..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Type Filter */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    {['ALL', 'INCOME', 'EXPENSE'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setTypeFilter(type)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                          typeFilter === type 
                            ? 'bg-white text-slate-800 shadow-sm' 
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
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Category</th>
                      <th className="px-6 py-3.5">Description</th>
                      <th className="px-6 py-3.5">Payment Mode</th>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5 text-right">Amount</th>
                      <th className="px-6 py-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-sm text-slate-400">
                          No matching transactions found.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-6 py-4 font-semibold text-slate-800 flex items-center space-x-2.5">
                            <span 
                              className="w-3 h-3 rounded-full shadow-sm" 
                              style={{ backgroundColor: t.color || '#10b981' }} 
                            />
                            <span>{t.category_name}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">{t.description || '—'}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">
                              <CreditCard size={12} />
                              <span>{t.payment_method}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-medium">{t.date}</td>
                          <td className={`px-6 py-4 text-right font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {t.type === 'INCOME' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Transaction"
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Monthly Category Budgets</h2>
                <p className="text-sm text-slate-500">Set spending caps and receive automatic alerts before overspending</p>
              </div>
              <button
                onClick={() => setShowBudgetModal(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition"
              >
                <PlusCircle size={16} />
                <span>Set Category Budget</span>
              </button>
            </div>

            {budgetAlerts.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-2 shadow-sm">
                <div className="flex items-center space-x-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle size={16} className="text-rose-600" />
                  <span>Budget Threshold Alerts</span>
                </div>
                {budgetAlerts.map((alert, i) => (
                  <p key={i} className="text-sm text-rose-800">
                    • <strong>{alert.category}</strong> has reached <strong>{alert.percentage}%</strong> of its monthly limit (₹{Number(alert.spent).toLocaleString('en-IN')} / ₹{Number(alert.allocated).toLocaleString('en-IN')})
                  </p>
                ))}
              </div>
            )}

            {budgets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-14 text-center shadow-sm">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ChartIcon size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">No category budgets configured</h3>
                <p className="text-slate-500 text-sm mb-4">Create a monthly spending limit to track your category utilization.</p>
                <button
                  onClick={() => setShowBudgetModal(true)}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 font-semibold text-sm rounded-xl hover:bg-emerald-100 transition"
                >
                  + Set Your First Budget
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {budgets.map((b) => {
                  const pct = Math.min(Number(b.percentage_used), 100);
                  const isOver = Number(b.percentage_used) > 100;
                  const isWarning = Number(b.percentage_used) >= 85;
                  return (
                    <div key={b.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full mb-1.5 ${
                            isOver ? 'bg-rose-100 text-rose-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {b.percentage_used}% Utilized
                          </span>
                          <h4 className="font-extrabold text-slate-800 text-lg">{b.category_name}</h4>
                        </div>
                        <button
                          onClick={() => handleDeleteBudget(b.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOver ? 'bg-gradient-to-r from-rose-500 to-red-600' : isWarning ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-xs font-semibold pt-1 border-t border-slate-100">
                        <span className="text-slate-600">Spent: ₹{Number(b.spent_amount).toLocaleString('en-IN')}</span>
                        <span className="text-slate-400">Limit: ₹{Number(b.allocated_amount).toLocaleString('en-IN')}</span>
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Savings Goals</h2>
                <p className="text-sm text-slate-500">Build dedicated funds for future milestones and track progress</p>
              </div>
              <button
                onClick={() => setShowGoalModal(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition"
              >
                <PlusCircle size={16} />
                <span>New Savings Goal</span>
              </button>
            </div>

            {goals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-14 text-center shadow-sm">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Target size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">No savings goals yet</h3>
                <p className="text-slate-500 text-sm mb-4">Set a financial target and log contributions over time.</p>
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 font-semibold text-sm rounded-xl hover:bg-emerald-100 transition"
                >
                  + Create Your First Goal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {goals.map((g) => {
                  const pct = Math.min(Number(g.progress_percentage), 100);
                  const isDone = g.status === 'COMPLETED';
                  return (
                    <div key={g.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-extrabold text-slate-800 text-lg">{g.title}</h4>
                          <button
                            onClick={() => handleDeleteGoal(g.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 font-medium flex items-center space-x-1">
                          <Calendar size={12} />
                          <span>Target Date: {g.target_date}</span>
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xl font-extrabold text-emerald-600">
                            ₹{Number(g.saved_amount).toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            of ₹{Number(g.target_amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                          <span>{g.progress_percentage}% achieved</span>
                          {isDone && (
                            <span className="inline-flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={13} />
                              <span>Goal Reached</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {!isDone && (
                        <button
                          onClick={() => setContributeModal({ open: true, goalId: g.id, title: g.title })}
                          className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold text-xs rounded-xl transition"
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

      {/* MODAL 1: Add Transaction */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100">
            <h2 className="text-xl font-extrabold text-slate-800 mb-4">Record New Entry</h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Entry Type</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const firstExp = categories.find(c => c.type === 'EXPENSE')?.id || '';
                      setTransactionForm({ ...transactionForm, type: 'EXPENSE', category_id: firstExp });
                    }}
                    className={`py-2.5 text-sm font-bold rounded-xl border transition ${
                      transactionForm.type === 'EXPENSE'
                        ? 'bg-rose-50 border-rose-500 text-rose-600 shadow-sm'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
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
                    className={`py-2.5 text-sm font-bold rounded-xl border transition ${
                      transactionForm.type === 'INCOME'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-sm'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Income (+)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                <select
                  value={transactionForm.category_id}
                  onChange={(e) => setTransactionForm({ ...transactionForm, category_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Method</label>
                <select
                  value={transactionForm.payment_method}
                  onChange={(e) => setTransactionForm({ ...transactionForm, payment_method: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="Cash">Cash</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Groceries, Metro ticket"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20"
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
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-extrabold text-slate-800 mb-4">Set Category Budget</h2>
            <form onSubmit={handleSetBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expense Category</label>
                <select
                  value={budgetForm.category_id}
                  onChange={(e) => setBudgetForm({ ...budgetForm, category_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {categories
                    .filter((c) => c.type === 'EXPENSE')
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monthly Limit (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={budgetForm.allocated_amount}
                  onChange={(e) => setBudgetForm({ ...budgetForm, allocated_amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20"
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
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-extrabold text-slate-800 mb-4">Create Savings Goal</h2>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund, New Laptop"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 25000"
                  value={goalForm.target_amount}
                  onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Date</label>
                <input
                  type="date"
                  required
                  value={goalForm.target_date}
                  onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20"
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
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-extrabold text-slate-800 mb-1">Add Contribution</h2>
            <p className="text-xs text-slate-500 mb-4">Goal: <span className="font-bold text-slate-700">{contributeModal.title}</span></p>
            <form onSubmit={handleContribute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 2000"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setContributeModal({ open: false, goalId: null, title: '' })}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20"
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