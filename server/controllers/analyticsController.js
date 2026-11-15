const pool = require('../config/db');

// 1. Dashboard summary cards (Total Income, Total Expense, Balance, Savings Rate)
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Query current month income and expenses
    const [totals] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS total_expense
       FROM transactions
       WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?`,
      [req.user.id, month, year]
    );

    const totalIncome = Number(totals[0].total_income);
    const totalExpense = Number(totals[0].total_expense);
    const netSavings = totalIncome - totalExpense;
    const savingsPercentage = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(2) : 0;

    // Budget utilization for the month
    const [budgetStats] = await pool.query(
      `SELECT 
        COALESCE(SUM(allocated_amount), 0) AS total_budget
       FROM budgets
       WHERE user_id = ? AND month = ? AND year = ?`,
      [req.user.id, month, year]
    );

    const totalBudget = Number(budgetStats[0].total_budget);
    const budgetUtilization = totalBudget > 0 ? ((totalExpense / totalBudget) * 100).toFixed(2) : 0;

    // 5 Most recent transactions
    const [recentTransactions] = await pool.query(
      `SELECT t.id, t.type, t.amount, t.payment_method, DATE_FORMAT(t.date, '%Y-%m-%d') AS date, 
              t.description, c.name AS category_name, c.icon, c.color
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
       ORDER BY t.date DESC, t.id DESC
       LIMIT 5`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_savings: netSavings,
        savings_percentage: Number(savingsPercentage),
        total_budget: totalBudget,
        budget_utilization: Number(budgetUtilization),
        recent_transactions: recentTransactions
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. Smart Financial Insights
exports.getSmartInsights = async (req, res, next) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();
    const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();

    // 1. Highest spending category this month
    const [topCategory] = await pool.query(
      `SELECT c.name, SUM(t.amount) AS total_spent
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'EXPENSE' AND MONTH(t.date) = ? AND YEAR(t.date) = ?
       GROUP BY c.name
       ORDER BY total_spent DESC
       LIMIT 1`,
      [req.user.id, currentMonth, currentYear]
    );

    // 2. Total expenses this month for daily average and projections
    const [expenseData] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS month_spent
       FROM transactions
       WHERE user_id = ? AND type = 'EXPENSE' AND MONTH(date) = ? AND YEAR(date) = ?`,
      [req.user.id, currentMonth, currentYear]
    );

    const monthSpent = Number(expenseData[0].month_spent);
    const avgDailyExpense = currentDay > 0 ? (monthSpent / currentDay).toFixed(2) : 0;
    const projectedMonthEndExpense = (avgDailyExpense * daysInCurrentMonth).toFixed(2);

    // 3. Category distribution (for Recharts PieChart)
    const [categoryBreakdown] = await pool.query(
      `SELECT c.name, c.color, SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'EXPENSE' AND MONTH(t.date) = ? AND YEAR(t.date) = ?
       GROUP BY c.name, c.color`,
      [req.user.id, currentMonth, currentYear]
    );

    // 4. Monthly 6-month trend (for Recharts BarChart)
    const [trendData] = await pool.query(
      `SELECT 
        DATE_FORMAT(date, '%b %Y') AS month_label,
        SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS expense
       FROM transactions
       WHERE user_id = ? AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
       GROUP BY YEAR(date), MONTH(date), DATE_FORMAT(date, '%b %Y')
       ORDER BY YEAR(date) ASC, MONTH(date) ASC`,
      [req.user.id]
    );

    // 5. Smart rule-based recommendations
    const suggestions = [];
    if (monthSpent > 0 && topCategory.length > 0) {
      suggestions.push(`Your highest spending area is ${topCategory[0].name} (₹${topCategory[0].total_spent}). Consider finding alternatives to reduce costs here.`);
    }
    if (Number(projectedMonthEndExpense) > 0) {
      suggestions.push(`At your current pace of ₹${avgDailyExpense}/day, your projected expense this month will reach ₹${projectedMonthEndExpense}.`);
    }

    return res.status(200).json({
      success: true,
      insights: {
        highest_category: topCategory[0] || null,
        average_daily_expense: Number(avgDailyExpense),
        projected_monthly_expense: Number(projectedMonthEndExpense),
        category_breakdown: categoryBreakdown,
        monthly_trend: trendData,
        smart_suggestions: suggestions
      }
    });
  } catch (error) {
    next(error);
  }
};