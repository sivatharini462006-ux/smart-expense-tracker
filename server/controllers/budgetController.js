const pool = require('../config/db');

// 1. Get budgets for a specific month and year with real-time spent calculation
exports.getBudgets = async (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const query = `
      SELECT 
        b.id,
        b.category_id,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        b.allocated_amount,
        b.month,
        b.year,
        COALESCE(SUM(t.amount), 0) AS spent_amount,
        (b.allocated_amount - COALESCE(SUM(t.amount), 0)) AS remaining_amount,
        ROUND((COALESCE(SUM(t.amount), 0) / b.allocated_amount) * 100, 2) AS percentage_used
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id 
        AND t.user_id = b.user_id 
        AND t.type = 'EXPENSE'
        AND MONTH(t.date) = b.month 
        AND YEAR(t.date) = b.year
      WHERE b.user_id = ? AND b.month = ? AND b.year = ?
      GROUP BY b.id, b.category_id, c.name, c.icon, c.color, b.allocated_amount, b.month, b.year
      ORDER BY percentage_used DESC
    `;

    const [budgets] = await pool.query(query, [req.user.id, month, year]);

    // Check for any categories exceeding 100% and generate alerts
    const alerts = budgets
      .filter(b => Number(b.percentage_used) >= 90)
      .map(b => ({
        category: b.category_name,
        allocated: b.allocated_amount,
        spent: b.spent_amount,
        percentage: b.percentage_used,
        is_over: Number(b.percentage_used) > 100
      }));

    return res.status(200).json({
      success: true,
      month,
      year,
      budgets,
      alerts
    });
  } catch (error) {
    next(error);
  }
};

// 2. Set or update a category budget for a month
exports.setBudget = async (req, res, next) => {
  try {
    const { category_id, allocated_amount, month, year } = req.body;

    if (!category_id || !allocated_amount || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Category, allocated amount, month, and year are required.'
      });
    }

    if (Number(allocated_amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Allocated amount must be greater than zero.'
      });
    }

    // Insert or update on duplicate (composite unique key: user_id, category_id, month, year)
    const query = `
      INSERT INTO budgets (user_id, category_id, allocated_amount, month, year)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE allocated_amount = VALUES(allocated_amount), updated_at = CURRENT_TIMESTAMP
    `;

    await pool.query(query, [req.user.id, category_id, allocated_amount, month, year]);

    return res.status(200).json({
      success: true,
      message: 'Budget allocated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// 3. Delete a budget
exports.deleteBudget = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM budgets WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found or access denied.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Budget removed successfully.'
    });
  } catch (error) {
    next(error);
  }
};