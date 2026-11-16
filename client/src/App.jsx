import React, { useState, useEffect } from 'react';
import API from './services/api';
import { 
  Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, 
  PlusCircle, LogOut, PieChart as ChartIcon, Target, 
  Trash2, AlertTriangle, CheckCircle2, LayoutDashboard,
  Search, Sparkles, ShieldCheck, Calendar, CreditCard, 
  Bell, Sun, Moon, Zap, Check, Download, Repeat, Users, Tag, Send
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'budgets' | 'savings' | 'bills' | 'splits'
  const [darkMode, setDarkMode] = useState(false);

  // Auth State
  const [isRegister, setIsRegister] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Core & Extra Data State
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [bills, setBills] = useState([]);
  const [splits, setSplits] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // NLP Quick-Log State
  const [quickInput, setQuickInput] = useState('');
  const [quickStatus, setQuickStatus] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals
  const [showTxModal, setShowTxModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [contributeModal, setContributeModal] = useState({ open: false, goalId: null, title: '' });

  // Forms
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

  const [goalForm, setGoalForm] = useState({ title: '', target_amount: '', target_date: '' });
  const [contributeAmount, setContributeAmount] = useState('');

  const [billForm, setBillForm] = useState({
    title: '',
    amount: '',
    category_id: '',
    payment_method: 'UPI',
    due_date: new Date().toISOString().split('T')[0],
    frequency: 'MONTHLY'
  });

  const [splitForm, setSplitForm] = useState({
    person_name: '',
    description: '',
    amount: '',
    type: 'OWED_TO_ME'
  });

  const [catForm, setCatForm] = useState({
    name: '',
    type: 'EXPENSE',
    color: '#10B981'
  });

  // Auth Handler
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? authForm : { email: authForm.email, password: authForm.password };
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

  // Load All Data
  const fetchAllData = async () => {
    if (!token) return;
    try {
      const [sumRes, insRes, catRes, budRes, goalRes, notifRes, billRes, splitRes] = await Promise.all([
        API.get('/analytics/dashboard'),
        API.get('/analytics/insights'),
        API.get('/categories'),
        API.get('/budgets'),
        API.get('/savings'),
        API.get('/notifications').catch(() => ({ data: { notifications: [] } })),
        API.get('/extras/bills').catch(() => ({ data: { bills: [] } })),
        API.get('/extras/splits').catch(() => ({ data: { splits: [] } }))
      ]);

      setSummary(sumRes.data.data);
      setInsights(insRes.data.insights);
      setCategories(catRes.data.categories);
      setBudgets(budRes.data.budgets || []);
      setBudgetAlerts(budRes.data.alerts || []);
      setGoals(goalRes.data.goals || []);
      setNotifications(notifRes.data.notifications || []);
      setBills(billRes.data.bills || []);
      setSplits(splitRes.data.splits || []);

      const expenseCats = catRes.data.categories.filter(c => c.type === 'EXPENSE');
      if (expenseCats.length > 0) {
        if (!transactionForm.category_id) setTransactionForm(prev => ({ ...prev, category_id: expenseCats[0].id }));
        if (!budgetForm.category_id) setBudgetForm(prev => ({ ...prev, category_id: expenseCats[0].id }));
        if (!billForm.category_id) setBillForm(prev => ({ ...prev, category_id: expenseCats[0].id }));
      }
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  useEffect(() => {
    if (token) fetchAllData();
  }, [token]);

  // Smart NLP Quick-Log Parser (e.g. "Lunch 350 UPI" or "Salary 45000 Net Banking")
  const handleQuickLog = async (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    const amountMatch = quickInput.match(/(\d+(\.\d+)?)/);
    if (!amountMatch) {
      setQuickStatus('Include an amount (e.g., "Coffee 150 UPI")');
      return;
    }

    const amount = parseFloat(amountMatch[0]);
    const lower = quickInput.toLowerCase();

    // Detect Payment Method
    let payment_method = 'UPI';
    if (lower.includes('cash')) payment_method = 'Cash';
    else if (lower.includes('credit')) payment_method = 'Credit Card';
    else if (lower.includes('debit')) payment_method = 'Debit Card';
    else if (lower.includes('net') || lower.includes('bank')) payment_method = 'Net Banking';

    // Detect Type & Category
    const isIncome = ['salary', 'freelance', 'bonus', 'refund', 'income', 'received'].some(w => lower.includes(w));
    const type = isIncome ? 'INCOME' : 'EXPENSE';

    const matchedCat = categories.find(c => c.type === type && lower.includes(c.name.toLowerCase().split(' ')[0]))
      || categories.find(c => c.type === type);

    const description = quickInput.replace(amountMatch[0], '').replace(/upi|cash|credit card|debit card|net banking/gi, '').trim() || matchedCat?.name;

    try {
      await API.post('/transactions', {
        type,
        category_id: matchedCat?.id,
        amount,
        payment_method,
        date: new Date().toISOString().split('T')[0],
        description
      });
      setQuickInput('');
      setQuickStatus(`Logged ${type === 'INCOME' ? '+' : '-'}₹${amount} (${matchedCat?.name}) via ${payment_method}`);
      setTimeout(() => setQuickStatus(''), 4000);
      fetchAllData();
    } catch (err) {
      setQuickStatus('Failed to log entry');
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!filteredTransactions.length) return alert('No transactions to export');
    const headers = ['ID', 'Type', 'Category', 'Description', 'Payment Method', 'Date', 'Amount (INR)'];
    const rows = filteredTransactions.map(t => [
      t.id, t.type, `"${t.category_name}"`, `"${t.description || ''}"`, t.payment_method, t.date, t.amount
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SmartExpense_Statement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Standard Handlers
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    await API.post('/transactions', transactionForm);
    setShowTxModal(false);
    setTransactionForm({ ...transactionForm, amount: '', description: '' });
    fetchAllData();
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    await API.delete(`/transactions/${id}`);
    fetchAllData();
  };

  const handleSetBudget = async (e) => {
    e.preventDefault();
    await API.post('/budgets', budgetForm);
    setShowBudgetModal(false);
    setBudgetForm(prev => ({ ...prev, allocated_amount: '' }));
    fetchAllData();
  };

  const handleDeleteBudget = async (id) => {
    await API.delete(`/budgets/${id}`);
    fetchAllData();
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    await API.post('/savings', goalForm);
    setShowGoalModal(false);
    setGoalForm({ title: '', target_amount: '', target_date: '' });
    fetchAllData();
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    await API.post(`/savings/${contributeModal.goalId}/contribute`, { amount: contributeAmount });
    setContributeModal({ open: false, goalId: null, title: '' });
    setContributeAmount('');
    fetchAllData();
  };

  const handleDeleteGoal = async (id) => {
    await API.delete(`/savings/${id}`);
    fetchAllData();
  };

  // New Feature Handlers (Bills, Splits, Custom Categories)
  const handleCreateBill = async (e) => {
    e.preventDefault();
    await API.post('/extras/bills', billForm);
    setShowBillModal(false);
    setBillForm({ ...billForm, title: '', amount: '' });
    fetchAllData();
  };

  const handlePayBill = async (id) => {
    await API.post(`/extras/bills/${id}/pay`);
    fetchAllData();
  };

  const handleDeleteBill = async (id) => {
    await API.delete(`/extras/bills/${id}`);
    fetchAllData();
  };

  const handleCreateSplit = async (e) => {
    e.preventDefault();
    await API.post('/extras/splits', splitForm);
    setShowSplitModal(false);
    setSplitForm({ person_name: '', description: '', amount: '', type: 'OWED_TO_ME' });
    fetchAllData();
  };

  const handleSettleSplit = async (id) => {
    await API.put(`/extras/splits/${id}/settle`);
    fetchAllData();
  };

  const handleDeleteSplit = async (id) => {
    await API.delete(`/extras/splits/${id}`);
    fetchAllData();
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    await API.post('/extras/categories', catForm);
    setShowCatModal(false);
    setCatForm({ name: '', type: 'EXPENSE', color: '#10B981' });
    fetchAllData();
  };

  const handleMarkNotificationsRead = async () => {
    await API.put('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  // Multi-Account Wallet Breakdown Calculation
  const txList = summary?.recent_transactions || [];
  const calcMethodBalance = (methods) => txList
    .filter(t => methods.includes(t.payment_method))
    .reduce((acc, t) => acc + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)), 0);

  const bankUpiBalance = calcMethodBalance(['UPI', 'Net Banking', 'Debit Card']);
  const cashBalance = calcMethodBalance(['Cash']);
  const creditCardSpend = txList
    .filter(t => t.payment_method === 'Credit Card' && t.type === 'EXPENSE')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // Calendar Heatmap Calculation (Current Month Days 1..30)
  const dailySpendMap = {};
  txList.filter(t => t.type === 'EXPENSE').forEach(t => {
    const day = new Date(t.date).getDate();
    dailySpendMap[day] = (dailySpendMap[day] || 0) + Number(t.amount);
  });

  // Filtered Transactions
  const filteredTransactions = txList.filter((t) => {
    const matchesSearch = 
      (t.category_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.payment_method || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length + budgetAlerts.length;

  // Login / Register Screen
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px]" />
        <div className="max-w-5xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
          <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 p-10 text-white flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center space-x-2.5 bg-white/10 px-4 py-2 rounded-2xl border border-white/15 mb-8">
                <Wallet size={18} className="text-emerald-400" />
                <span className="font-extrabold text-sm">SmartExpense Pro</span>
              </div>
              <h1 className="text-3xl font-black leading-tight mb-4">Complete Personal Finance Command Center.</h1>
              <p className="text-emerald-100/75 text-sm">AI Quick-Log, Recurring Bills, Split IOUs, Multi-Wallet Tracking & Real-Time Analytics.</p>
            </div>
            <div className="space-y-3 text-xs text-emerald-100/90 font-medium mt-8">
              <div className="flex items-center space-x-2.5"><Sparkles size={15} className="text-emerald-400" /><span>Natural language quick expense logging</span></div>
              <div className="flex items-center space-x-2.5"><ShieldCheck size={15} className="text-emerald-400" /><span>JWT security & normalized MySQL architecture</span></div>
            </div>
          </div>

          <div className="lg:col-span-6 p-10 flex flex-col justify-center bg-white">
            <h2 className="text-2xl font-black text-slate-900 mb-1">{isRegister ? 'Create workspace' : 'Welcome back'}</h2>
            <p className="text-sm text-slate-500 mb-6">{isRegister ? 'Start managing finances in ₹' : 'Sign in to your financial suite'}</p>
            {authError && <div className="p-3 mb-4 text-xs font-semibold bg-rose-50 text-rose-600 rounded-xl">{authError}</div>}
            <form onSubmit={handleAuth} className="space-y-4">
              {isRegister && (
                <input type="text" required placeholder="Full Name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm" />
              )}
              <input type="email" required placeholder="Email Address" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm" />
              <input type="password" required placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm" />
              <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm rounded-2xl shadow-lg">
                {isRegister ? 'Launch Workspace' : 'Sign In'}
              </button>
            </form>
            <p className="text-center text-sm text-slate-500 mt-6">
              {isRegister ? 'Already registered?' : "New here?"}{' '}
              <button onClick={() => setIsRegister(!isRegister)} className="text-emerald-600 font-extrabold hover:underline">
                {isRegister ? 'Sign In' : 'Create Account'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const bgMain = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#f8fafc] text-slate-800';
  const cardBg = darkMode ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200/80 text-slate-800';
  const subText = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputBg = darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800';

  return (
    <div className={`min-h-screen flex ${bgMain} transition-colors duration-300`}>
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 text-white border-r border-slate-800 p-6 justify-between fixed inset-y-0 left-0 z-40">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-2.5 bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 rounded-2xl">
              <Wallet size={22} />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight block leading-none">SmartExpense</span>
              <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Pro Suite</span>
            </div>
          </div>

          <div className="space-y-1">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'budgets', label: 'Budgets', icon: ChartIcon, badge: budgetAlerts.length },
              { id: 'savings', label: 'Savings Goals', icon: Target },
              { id: 'bills', label: 'Bills & Subs', icon: Repeat, badge: bills.length },
              { id: 'splits', label: 'Splits & IOUs', icon: Users }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                    activeTab === item.id 
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-500/20 text-emerald-300 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setShowCatModal(true)}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center space-x-2 border border-slate-700 transition"
          >
            <Tag size={14} className="text-emerald-400" />
            <span>+ Custom Category</span>
          </button>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center uppercase">
                {(user?.name || 'S')[0]}
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">{user?.name || 'Sivu'}</p>
                <p className="text-[10px] text-emerald-400">MySQL Synced</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-400 rounded-xl">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header className={`${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200/80'} backdrop-blur-xl border-b sticky top-0 z-30`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
            {/* Mobile Tabs */}
            <div className="flex lg:hidden overflow-x-auto space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {['overview', 'budgets', 'savings', 'bills', 'splits'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg capitalize ${
                    activeTab === tab ? 'bg-emerald-600 text-white' : 'text-slate-500'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Smart NLP Quick-Log Input */}
            <form onSubmit={handleQuickLog} className="hidden md:flex flex-1 max-w-md relative">
              <Sparkles size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
              <input
                type="text"
                placeholder='Quick Log: e.g. "Lunch 250 UPI" or "Salary 45000"'
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                className={`w-full pl-9 pr-10 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-emerald-600 hover:bg-emerald-500/10 rounded-lg">
                <Send size={14} />
              </button>
            </form>

            {/* Right Controls */}
            <div className="flex items-center space-x-2">
              <button onClick={() => setDarkMode(!darkMode)} className={`p-2.5 rounded-xl border ${cardBg}`}>
                {darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
              </button>

              <div className="relative">
                <button onClick={() => setShowNotifDropdown(!showNotifDropdown)} className={`p-2.5 rounded-xl border relative ${cardBg}`}>
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifDropdown && (
                  <div className={`absolute right-0 mt-2 w-72 rounded-2xl shadow-2xl border p-4 z-50 ${cardBg}`}>
                    <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-200/50">
                      <span className="text-xs font-extrabold uppercase">Notifications</span>
                      <button onClick={handleMarkNotificationsRead} className="text-[11px] font-bold text-emerald-500">Mark read</button>
                    </div>
                    <div className="space-y-2 max-h-52 overflow-y-auto text-xs">
                      {budgetAlerts.map((a, i) => (
                        <div key={i} className="p-2 rounded-xl bg-rose-500/10 text-rose-500 font-semibold">
                          {a.category} reached {a.percentage}% limit
                        </div>
                      ))}
                      {notifications.length === 0 && budgetAlerts.length === 0 && <p className={subText}>No alerts</p>}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowTxModal(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl shadow-md"
              >
                <PlusCircle size={15} />
                <span>Add Entry</span>
              </button>
            </div>
          </div>
        </header>

        {quickStatus && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-6 py-2 text-center">
            ✨ {quickStatus}
          </div>
        )}

        <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Top Hero: Virtual Card + Multi-Account Wallets */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-900 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-emerald-300/80 font-bold">Total Net Balance</p>
                      <h2 className="text-3xl font-black mt-1">₹{summary?.net_savings?.toLocaleString('en-IN') || 0}</h2>
                    </div>
                    <div className="p-2.5 bg-white/10 rounded-2xl"><Zap size={20} className="text-emerald-300" /></div>
                  </div>

                  {/* Multi-Account Sub-Wallets */}
                  <div className="grid grid-cols-3 gap-2 my-5 pt-4 border-t border-white/10 text-xs">
                    <div className="bg-white/5 p-2.5 rounded-xl">
                      <p className="text-[10px] text-slate-400">Bank / UPI</p>
                      <p className="font-extrabold text-emerald-300">₹{bankUpiBalance.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-white/5 p-2.5 rounded-xl">
                      <p className="text-[10px] text-slate-400">Cash Wallet</p>
                      <p className="font-extrabold text-white">₹{cashBalance.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-white/5 p-2.5 rounded-xl">
                      <p className="text-[10px] text-slate-400">Credit Used</p>
                      <p className="font-extrabold text-rose-300">₹{creditCardSpend.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-300">
                    <span className="font-bold uppercase">{user?.name || 'SIVATHARINI M S'}</span>
                    <span className="text-emerald-400 font-black">{summary?.savings_percentage || 0}% Saved</span>
                  </div>
                </div>

                {/* 4 KPI Cards */}
                <div className="lg:col-span-7 grid grid-cols-2 gap-4">
                  <div className={`p-5 rounded-3xl border shadow-sm ${cardBg}`}>
                    <span className={`text-xs font-extrabold uppercase ${subText}`}>Total Income</span>
                    <div className="text-2xl font-black mt-2 text-emerald-500">₹{summary?.total_income?.toLocaleString('en-IN') || 0}</div>
                    <p className={`text-xs mt-1 ${subText}`}>Credited this month</p>
                  </div>
                  <div className={`p-5 rounded-3xl border shadow-sm ${cardBg}`}>
                    <span className={`text-xs font-extrabold uppercase ${subText}`}>Total Expense</span>
                    <div className="text-2xl font-black mt-2 text-rose-500">₹{summary?.total_expense?.toLocaleString('en-IN') || 0}</div>
                    <p className={`text-xs mt-1 ${subText}`}>Debited this month</p>
                  </div>
                  <div className={`p-5 rounded-3xl border shadow-sm ${cardBg}`}>
                    <span className={`text-xs font-extrabold uppercase ${subText}`}>Daily Burn Rate</span>
                    <div className="text-2xl font-black mt-2">₹{insights?.average_daily_expense || 0}</div>
                    <p className={`text-xs mt-1 ${subText}`}>Average daily spend</p>
                  </div>
                  <div className={`p-5 rounded-3xl border shadow-sm ${cardBg}`}>
                    <span className={`text-xs font-extrabold uppercase ${subText}`}>Month Projection</span>
                    <div className="text-2xl font-black mt-2">₹{insights?.projected_monthly_expense?.toLocaleString('en-IN') || 0}</div>
                    <p className={`text-xs mt-1 ${subText}`}>Estimated month-end</p>
                  </div>
                </div>
              </div>

              {/* Charts + Daily Spending Heatmap */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`p-6 rounded-3xl border shadow-sm ${cardBg}`}>
                  <h3 className="text-sm font-extrabold mb-3">Spending by Category</h3>
                  <div className="h-56">
                    {insights?.category_breakdown?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={insights.category_breakdown} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={75} paddingAngle={3}>
                            {insights.category_breakdown.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color || '#10b981'} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val) => `₹${val}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className={`h-full flex items-center justify-center text-xs ${subText}`}>No expenses yet</div>}
                  </div>
                </div>

                <div className={`p-6 rounded-3xl border shadow-sm ${cardBg}`}>
                  <h3 className="text-sm font-extrabold mb-3">Cash Flow Velocity</h3>
                  <div className="h-56">
                    {insights?.monthly_trend?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={insights.monthly_trend}>
                          <XAxis dataKey="month_label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="income" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                          <Area type="monotone" dataKey="expense" stroke="#F43F5E" fill="#F43F5E" fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : <div className={`h-full flex items-center justify-center text-xs ${subText}`}>No trend data</div>}
                  </div>
                </div>

                {/* Daily Spending Calendar Heatmap */}
                <div className={`p-6 rounded-3xl border shadow-sm ${cardBg}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-extrabold">Daily Spend Heatmap</h3>
                    <span className={`text-[10px] font-bold ${subText}`}>Days 1–30</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                      const spent = dailySpendMap[day] || 0;
                      const intensity = spent === 0 
                        ? (darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')
                        : spent < 300 
                        ? 'bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold'
                        : spent < 1000
                        ? 'bg-amber-500/40 text-amber-800 dark:text-amber-200 font-bold'
                        : 'bg-rose-500 text-white font-black';
                      return (
                        <div
                          key={day}
                          title={`Day ${day}: ₹${spent}`}
                          className={`h-8 rounded-lg flex items-center justify-center text-[11px] cursor-default transition ${intensity}`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                  <div className={`flex justify-between items-center mt-3 text-[10px] ${subText}`}>
                    <span>No Spend</span>
                    <div className="flex space-x-1">
                      <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-800" />
                      <span className="w-3 h-3 rounded bg-emerald-500/40" />
                      <span className="w-3 h-3 rounded bg-amber-500/50" />
                      <span className="w-3 h-3 rounded bg-rose-500" />
                    </div>
                    <span>High Spend</span>
                  </div>
                </div>
              </div>

              {/* Transaction Ledger + CSV Export */}
              <div className={`rounded-3xl border shadow-sm overflow-hidden ${cardBg}`}>
                <div className="p-6 border-b border-slate-200/50 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-extrabold">Transaction Ledger</h3>
                    <p className={`text-xs ${subText}`}>Search, filter, or export CSV statement</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`pl-8 pr-3 py-1.5 border rounded-xl text-xs ${inputBg}`}
                      />
                    </div>
                    {['ALL', 'INCOME', 'EXPENSE'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={`px-2.5 py-1.5 text-[11px] font-bold rounded-xl ${typeFilter === t ? 'bg-emerald-600 text-white' : 'bg-slate-500/10'}`}
                      >
                        {t}
                      </button>
                    ))}
                    <button
                      onClick={handleExportCSV}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700"
                    >
                      <Download size={13} />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className={`text-[11px] uppercase font-extrabold border-b ${darkMode ? 'bg-slate-800/50 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                      <tr>
                        <th className="px-6 py-3.5">Category</th>
                        <th className="px-6 py-3.5">Description</th>
                        <th className="px-6 py-3.5">Method</th>
                        <th className="px-6 py-3.5">Date</th>
                        <th className="px-6 py-3.5 text-right">Amount</th>
                        <th className="px-6 py-3.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800">
                      {filteredTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-emerald-500/5">
                          <td className="px-6 py-3.5 font-bold flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color || '#10b981' }} />
                            <span>{t.category_name}</span>
                          </td>
                          <td className={`px-6 py-3.5 ${subText}`}>{t.description || '—'}</td>
                          <td className="px-6 py-3.5 text-xs font-semibold">{t.payment_method}</td>
                          <td className={`px-6 py-3.5 text-xs ${subText}`}>{t.date}</td>
                          <td className={`px-6 py-3.5 text-right font-black ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {t.type === 'INCOME' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <button onClick={() => handleDeleteTransaction(t.id)} className="text-slate-400 hover:text-rose-500">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: BUDGETS */}
          {activeTab === 'budgets' && (
            <div className="space-y-6">
              <div className={`p-6 rounded-3xl border flex justify-between items-center ${cardBg}`}>
                <div>
                  <h2 className="text-xl font-black">Monthly Category Budgets</h2>
                  <p className={`text-sm ${subText}`}>Monitor spending limits & threshold warnings</p>
                </div>
                <button onClick={() => setShowBudgetModal(true)} className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl">
                  + Set Budget
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {budgets.map((b) => {
                  const pct = Math.min(Number(b.percentage_used), 100);
                  const isOver = Number(b.percentage_used) > 100;
                  return (
                    <div key={b.id} className={`p-6 rounded-3xl border space-y-3 ${cardBg}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-xs font-bold ${isOver ? 'text-rose-500' : 'text-emerald-500'}`}>{b.percentage_used}% Used</span>
                          <h4 className="font-black text-lg">{b.category_name}</h4>
                        </div>
                        <button onClick={() => handleDeleteBudget(b.id)} className="text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>
                      </div>
                      <div className="w-full bg-slate-200/50 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className={`h-full ${isOver ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span>Spent: ₹{Number(b.spent_amount).toLocaleString('en-IN')}</span>
                        <span className={subText}>Limit: ₹{Number(b.allocated_amount).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SAVINGS GOALS */}
          {activeTab === 'savings' && (
            <div className="space-y-6">
              <div className={`p-6 rounded-3xl border flex justify-between items-center ${cardBg}`}>
                <div>
                  <h2 className="text-xl font-black">Savings Goals</h2>
                  <p className={`text-sm ${subText}`}>Track milestones & log contributions</p>
                </div>
                <button onClick={() => setShowGoalModal(true)} className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl">
                  + New Goal
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {goals.map((g) => (
                  <div key={g.id} className={`p-6 rounded-3xl border space-y-4 ${cardBg}`}>
                    <div className="flex justify-between">
                      <h4 className="font-black text-lg">{g.title}</h4>
                      <button onClick={() => handleDeleteGoal(g.id)} className="text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>
                    </div>
                    <div className="text-xl font-black text-emerald-500">
                      ₹{Number(g.saved_amount).toLocaleString('en-IN')} <span className={`text-xs font-normal ${subText}`}>/ ₹{Number(g.target_amount).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full bg-slate-200/50 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(Number(g.progress_percentage), 100)}%` }} />
                    </div>
                    {g.status !== 'COMPLETED' && (
                      <button onClick={() => setContributeModal({ open: true, goalId: g.id, title: g.title })} className="w-full py-2 bg-emerald-500/10 text-emerald-500 font-bold text-xs rounded-xl">
                        + Add Contribution
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RECURRING BILLS & SUBSCRIPTIONS */}
          {activeTab === 'bills' && (
            <div className="space-y-6">
              <div className={`p-6 rounded-3xl border flex justify-between items-center ${cardBg}`}>
                <div>
                  <h2 className="text-xl font-black">Recurring Bills & Subscriptions</h2>
                  <p className={`text-sm ${subText}`}>1-click bill payment logs directly to your expenses & advances due date</p>
                </div>
                <button onClick={() => setShowBillModal(true)} className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl">
                  + Add Bill / Sub
                </button>
              </div>
              {bills.length === 0 ? (
                <div className={`p-12 rounded-3xl border text-center ${cardBg}`}>
                  <p className={subText}>No recurring bills added yet (e.g., Wi-Fi, Rent, Netflix, Gym).</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {bills.map((b) => (
                    <div key={b.id} className={`p-6 rounded-3xl border space-y-4 ${cardBg}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-500/15 text-amber-500 rounded-full">{b.frequency}</span>
                          <h4 className="font-black text-lg mt-1">{b.title}</h4>
                          <p className={`text-xs ${subText}`}>Due: {new Date(b.due_date).toLocaleDateString('en-IN')}</p>
                        </div>
                        <button onClick={() => handleDeleteBill(b.id)} className="text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>
                      </div>
                      <div className="text-2xl font-black">₹{Number(b.amount).toLocaleString('en-IN')}</div>
                      <button
                        onClick={() => handlePayBill(b.id)}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-xl shadow"
                      >
                        ✓ Mark Paid & Log Expense
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SPLITS & IOUs */}
          {activeTab === 'splits' && (
            <div className="space-y-6">
              <div className={`p-6 rounded-3xl border flex justify-between items-center ${cardBg}`}>
                <div>
                  <h2 className="text-xl font-black">Split Expenses & IOUs</h2>
                  <p className={`text-sm ${subText}`}>Track shared bills with friends & settle balances</p>
                </div>
                <button onClick={() => setShowSplitModal(true)} className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl">
                  + Record Split / IOU
                </button>
              </div>
              {splits.length === 0 ? (
                <div className={`p-12 rounded-3xl border text-center ${cardBg}`}>
                  <p className={subText}>No shared expenses or IOUs recorded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {splits.map((s) => (
                    <div key={s.id} className={`p-6 rounded-3xl border space-y-3 ${cardBg} ${s.status === 'SETTLED' ? 'opacity-60' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full ${s.type === 'OWED_TO_ME' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                            {s.type === 'OWED_TO_ME' ? 'Owes You' : 'You Owe'}
                          </span>
                          <h4 className="font-black text-lg mt-1">{s.person_name}</h4>
                          <p className={`text-xs ${subText}`}>{s.description}</p>
                        </div>
                        <button onClick={() => handleDeleteSplit(s.id)} className="text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>
                      </div>
                      <div className="text-2xl font-black">₹{Number(s.amount).toLocaleString('en-IN')}</div>
                      {s.status === 'PENDING' ? (
                        <button onClick={() => handleSettleSplit(s.id)} className="w-full py-2 bg-emerald-500/15 text-emerald-500 font-bold text-xs rounded-xl">
                          ✓ Settle Up
                        </button>
                      ) : (
                        <div className="text-center text-xs font-bold text-emerald-500 py-1.5">Settled</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-3xl w-full max-w-md p-6 border ${cardBg}`}>
            <h2 className="text-xl font-black mb-4">Record Transaction</h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {['EXPENSE', 'INCOME'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTransactionForm({ ...transactionForm, type: t, category_id: categories.find(c => c.type === t)?.id || '' })}
                    className={`py-2 text-xs font-extrabold rounded-xl border ${transactionForm.type === t ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300/30'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <select value={transactionForm.category_id} onChange={(e) => setTransactionForm({ ...transactionForm, category_id: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`}>
                {categories.filter(c => c.type === transactionForm.type).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <input type="number" step="0.01" required placeholder="Amount (₹)" value={transactionForm.amount} onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <select value={transactionForm.payment_method} onChange={(e) => setTransactionForm({ ...transactionForm, payment_method: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`}>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Net Banking">Net Banking</option>
              </select>
              <input type="date" required value={transactionForm.date} onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <input type="text" placeholder="Description" value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowTxModal(false)} className="px-4 py-2 text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBudgetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className={`rounded-3xl w-full max-w-md p-6 border ${cardBg}`}>
            <h2 className="text-xl font-black mb-4">Set Category Budget</h2>
            <form onSubmit={handleSetBudget} className="space-y-4">
              <select value={budgetForm.category_id} onChange={(e) => setBudgetForm({ ...budgetForm, category_id: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`}>
                {categories.filter(c => c.type === 'EXPENSE').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <input type="number" required placeholder="Monthly Limit (₹)" value={budgetForm.allocated_amount} onChange={(e) => setBudgetForm({ ...budgetForm, allocated_amount: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowBudgetModal(false)} className="px-4 py-2 text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className={`rounded-3xl w-full max-w-md p-6 border ${cardBg}`}>
            <h2 className="text-xl font-black mb-4">Create Savings Goal</h2>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <input type="text" required placeholder="Goal Title" value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <input type="number" required placeholder="Target Amount (₹)" value={goalForm.target_amount} onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <input type="date" required value={goalForm.target_date} onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowGoalModal(false)} className="px-4 py-2 text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {contributeModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className={`rounded-3xl w-full max-w-sm p-6 border ${cardBg}`}>
            <h2 className="text-lg font-black mb-3">Contribute to {contributeModal.title}</h2>
            <form onSubmit={handleContribute} className="space-y-4">
              <input type="number" required placeholder="Amount (₹)" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setContributeModal({ open: false, goalId: null, title: '' })} className="px-4 py-2 text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Add Funds</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBillModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className={`rounded-3xl w-full max-w-md p-6 border ${cardBg}`}>
            <h2 className="text-xl font-black mb-4">Add Recurring Bill / Subscription</h2>
            <form onSubmit={handleCreateBill} className="space-y-4">
              <input type="text" required placeholder="Title (e.g. Wi-Fi, Rent, Netflix)" value={billForm.title} onChange={(e) => setBillForm({ ...billForm, title: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <input type="number" required placeholder="Amount (₹)" value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <select value={billForm.category_id} onChange={(e) => setBillForm({ ...billForm, category_id: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`}>
                {categories.filter(c => c.type === 'EXPENSE').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <input type="date" required value={billForm.due_date} onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <select value={billForm.frequency} onChange={(e) => setBillForm({ ...billForm, frequency: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`}>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowBillModal(false)} className="px-4 py-2 text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Save Bill</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSplitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className={`rounded-3xl w-full max-w-md p-6 border ${cardBg}`}>
            <h2 className="text-xl font-black mb-4">Record Split / IOU</h2>
            <form onSubmit={handleCreateSplit} className="space-y-4">
              <input type="text" required placeholder="Friend's Name" value={splitForm.person_name} onChange={(e) => setSplitForm({ ...splitForm, person_name: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <input type="text" required placeholder="For what? (e.g. Dinner split)" value={splitForm.description} onChange={(e) => setSplitForm({ ...splitForm, description: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <input type="number" required placeholder="Amount (₹)" value={splitForm.amount} onChange={(e) => setSplitForm({ ...splitForm, amount: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <select value={splitForm.type} onChange={(e) => setSplitForm({ ...splitForm, type: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`}>
                <option value="OWED_TO_ME">They Owe Me (+)</option>
                <option value="I_OWE">I Owe Them (-)</option>
              </select>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowSplitModal(false)} className="px-4 py-2 text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Save Split</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className={`rounded-3xl w-full max-w-sm p-6 border ${cardBg}`}>
            <h2 className="text-xl font-black mb-4">Create Custom Category</h2>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <input type="text" required placeholder="Category Name (e.g. Gym, Books)" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`} />
              <select value={catForm.type} onChange={(e) => setCatForm({ ...catForm, type: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${inputBg}`}>
                <option value="EXPENSE">Expense Category</option>
                <option value="INCOME">Income Category</option>
              </select>
              <div className="flex items-center space-x-3">
                <label className="text-xs font-bold">Badge Color:</label>
                <input type="color" value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} className="h-9 w-16 rounded cursor-pointer" />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowCatModal(false)} className="px-4 py-2 text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}