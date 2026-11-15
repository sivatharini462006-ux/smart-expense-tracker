import React, { useState, useEffect } from 'react';
import API from './services/api';
import { 
  Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, 
  PlusCircle, LogOut, PieChart as ChartIcon, Target, 
  Trash2, AlertTriangle, CheckCircle2, LayoutDashboard 
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
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

  // 1. Login / Register Screen
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <Wallet size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Smart Expense Tracker</h1>
              <p className="text-sm text-slate-500">Plan smarter, save better</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {isRegister ? 'Start tracking your expenses and budget in ₹' : 'Enter your credentials to access your dashboard'}
          </p>

          {authError && (
            <div className="p-3 mb-4 text-sm bg-rose-50 border border-rose-200 text-rose-600 rounded-lg">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Sivu"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email Address</label>
              <input 
                type="email" 
                required
                placeholder="sivu@example.com"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Password</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button 
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition"
            >
              {isRegister ? 'Register' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              onClick={() => { setIsRegister(!isRegister); setAuthError(''); }}
              className="text-emerald-600 font-semibold hover:underline"
            >
              {isRegister ? 'Sign In' : 'Create One'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // 2. Main Authenticated Workspace
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar with Navigation Tabs */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-600 text-white rounded-lg">
                <Wallet size={20} />
              </div>
              <span className="font-bold text-lg text-slate-800 hidden sm:inline">Smart Expense Tracker</span>
            </div>

            {/* Tab Switcher */}
            <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  activeTab === 'overview' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard size={15} />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('budgets')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  activeTab === 'budgets' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ChartIcon size={15} />
                <span>Budgets</span>
                {budgetAlerts.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('savings')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  activeTab === 'savings' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Target size={15} />
                <span>Savings Goals</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-slate-600 hidden md:inline">
              Hi, <span className="font-semibold text-slate-800">{user?.name || 'Sivu'}</span>
            </span>
            <button
              onClick={() => setShowTxModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm"
            >
              <PlusCircle size={16} />
              <span>Add Transaction</span>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              title="Logout"
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
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Income</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ArrowUpRight size={18} /></div>
                </div>
                <div className="text-2xl font-bold text-slate-800">₹{summary?.total_income?.toLocaleString('en-IN') || 0}</div>
                <span className="text-xs text-emerald-600 font-medium">Credited this month</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Expense</span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><ArrowDownRight size={18} /></div>
                </div>
                <div className="text-2xl font-bold text-slate-800">₹{summary?.total_expense?.toLocaleString('en-IN') || 0}</div>
                <span className="text-xs text-rose-500 font-medium">Debited this month</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Net Balance</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={18} /></div>
                </div>
                <div className={`text-2xl font-bold ${(summary?.net_savings || 0) >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                  ₹{summary?.net_savings?.toLocaleString('en-IN') || 0}
                </div>
                <span className="text-xs text-slate-500 font-medium">Savings rate: {summary?.savings_percentage || 0}%</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Projected Expense</span>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><ChartIcon size={18} /></div>
                </div>
                <div className="text-2xl font-bold text-slate-800">
                  ₹{insights?.projected_monthly_expense?.toLocaleString('en-IN') || 0}
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Avg ₹{insights?.average_daily_expense || 0}/day
                </span>
              </div>
            </div>

            {/* Smart Insights Banner */}
            {insights?.smart_suggestions?.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col space-y-1">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">💡 Smart Financial Insights</span>
                {insights.smart_suggestions.map((msg, i) => (
                  <p key={i} className="text-sm text-emerald-900">• {msg}</p>
                ))}
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-semibold text-slate-800 mb-4">Spending by Category</h3>
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
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {insights.category_breakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || '#10b981'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₹${value}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                      No expense records yet this month.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-semibold text-slate-800 mb-4">Income vs Expense Trend</h3>
                <div className="h-64">
                  {insights?.monthly_trend?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insights.monthly_trend}>
                        <XAxis dataKey="month_label" />
                        <YAxis />
                        <Tooltip formatter={(value) => `₹${value}`} />
                        <Legend />
                        <Bar dataKey="income" fill="#10B981" name="Income (₹)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" fill="#EF4444" name="Expense (₹)" radius={[4, 4, 0, 0]} />
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

            {/* Recent Transactions Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-base font-semibold text-slate-800">Recent Transactions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Description</th>
                      <th className="px-6 py-3">Payment Method</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary?.recent_transactions?.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-medium text-slate-800 flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color || '#10b981' }} />
                          <span>{t.category_name}</span>
                        </td>
                        <td className="px-6 py-3.5">{t.description || '-'}</td>
                        <td className="px-6 py-3.5">
                          <span className="px-2 py-0.5 text-xs bg-slate-100 rounded-md text-slate-600">
                            {t.payment_method}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-400">{t.date}</td>
                        <td className={`px-6 py-3.5 text-right font-semibold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.type === 'INCOME' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="text-slate-400 hover:text-rose-600 transition"
                            title="Delete"
                          >
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

        {/* TAB 2: MONTHLY BUDGETS */}
        {activeTab === 'budgets' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Monthly Category Budgets</h2>
                <p className="text-sm text-slate-500">Set spending limits and monitor category utilization</p>
              </div>
              <button
                onClick={() => setShowBudgetModal(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm"
              >
                <PlusCircle size={16} />
                <span>Set Category Budget</span>
              </button>
            </div>

            {budgetAlerts.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-1">
                <div className="flex items-center space-x-2 text-rose-800 font-bold text-xs uppercase">
                  <AlertTriangle size={16} />
                  <span>Budget Threshold Alerts</span>
                </div>
                {budgetAlerts.map((alert, i) => (
                  <p key={i} className="text-sm text-rose-700">
                    • <strong>{alert.category}</strong> has reached <strong>{alert.percentage}%</strong> (₹{Number(alert.spent).toLocaleString('en-IN')} / ₹{Number(alert.allocated).toLocaleString('en-IN')})
                  </p>
                ))}
              </div>
            )}

            {budgets.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <p className="text-slate-500 text-sm mb-3">No category budgets set for this month yet.</p>
                <button
                  onClick={() => setShowBudgetModal(true)}
                  className="text-emerald-600 font-semibold text-sm hover:underline"
                >
                  + Create your first category budget
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {budgets.map((b) => {
                  const pct = Math.min(Number(b.percentage_used), 100);
                  const isOver = Number(b.percentage_used) > 100;
                  const isWarning = Number(b.percentage_used) >= 85;
                  return (
                    <div key={b.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-800">{b.category_name}</h4>
                          <span className="text-xs text-slate-400">Limit: ₹{Number(b.allocated_amount).toLocaleString('en-IN')}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteBudget(b.id)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOver ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-600">Spent: ₹{Number(b.spent_amount).toLocaleString('en-IN')}</span>
                        <span className={isOver ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                          {b.percentage_used}% used
                        </span>
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
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Savings Goals</h2>
                <p className="text-sm text-slate-500">Track progress toward major milestones and targets</p>
              </div>
              <button
                onClick={() => setShowGoalModal(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm"
              >
                <PlusCircle size={16} />
                <span>New Savings Goal</span>
              </button>
            </div>

            {goals.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <p className="text-slate-500 text-sm mb-3">No savings goals created yet.</p>
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="text-emerald-600 font-semibold text-sm hover:underline"
                >
                  + Start a new savings goal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {goals.map((g) => {
                  const pct = Math.min(Number(g.progress_percentage), 100);
                  const isDone = g.status === 'COMPLETED';
                  return (
                    <div key={g.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-slate-800 text-base">{g.title}</h4>
                          <button
                            onClick={() => handleDeleteGoal(g.id)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400">Target Date: {g.target_date}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-emerald-600">₹{Number(g.saved_amount).toLocaleString('en-IN')}</span>
                          <span className="text-slate-500">of ₹{Number(g.target_amount).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500">
                          <span>{g.progress_percentage}% achieved</span>
                          {isDone && (
                            <span className="inline-flex items-center space-x-1 text-emerald-600 font-semibold">
                              <CheckCircle2 size={14} />
                              <span>Completed</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {!isDone && (
                        <button
                          onClick={() => setContributeModal({ open: true, goalId: g.id, title: g.title })}
                          className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-lg transition"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Add Transaction</h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const firstExp = categories.find(c => c.type === 'EXPENSE')?.id || '';
                      setTransactionForm({ ...transactionForm, type: 'EXPENSE', category_id: firstExp });
                    }}
                    className={`py-2 text-sm font-semibold rounded-lg border ${
                      transactionForm.type === 'EXPENSE'
                        ? 'bg-rose-50 border-rose-500 text-rose-600'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const firstInc = categories.find(c => c.type === 'INCOME')?.id || '';
                      setTransactionForm({ ...transactionForm, type: 'INCOME', category_id: firstInc });
                    }}
                    className={`py-2 text-sm font-semibold rounded-lg border ${
                      transactionForm.type === 'INCOME'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Category</label>
                <select
                  value={transactionForm.category_id}
                  onChange={(e) => setTransactionForm({ ...transactionForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {categories
                    .filter((c) => c.type === transactionForm.type)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Method</label>
                <select
                  value={transactionForm.payment_method}
                  onChange={(e) => setTransactionForm({ ...transactionForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="Cash">Cash</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Groceries, Metro ticket"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Set Category Budget */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Set Category Budget</h2>
            <form onSubmit={handleSetBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Expense Category</label>
                <select
                  value={budgetForm.category_id}
                  onChange={(e) => setBudgetForm({ ...budgetForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {categories
                    .filter((c) => c.type === 'EXPENSE')
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Monthly Limit (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={budgetForm.allocated_amount}
                  onChange={(e) => setBudgetForm({ ...budgetForm, allocated_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Create Savings Goal</h2>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund, New Laptop"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 25000"
                  value={goalForm.target_amount}
                  onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Date</label>
                <input
                  type="date"
                  required
                  value={goalForm.target_date}
                  onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Add Contribution</h2>
            <p className="text-xs text-slate-500 mb-4">Goal: {contributeModal.title}</p>
            <form onSubmit={handleContribute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 2000"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setContributeModal({ open: false, goalId: null, title: '' })}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
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