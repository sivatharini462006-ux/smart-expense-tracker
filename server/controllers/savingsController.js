const pool = require('../config/db');

// 1. Get all savings goals with calculated progress
exports.getGoals = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        id, 
        title, 
        target_amount, 
        saved_amount, 
        (target_amount - saved_amount) AS remaining_amount,
        ROUND((saved_amount / target_amount) * 100, 2) AS progress_percentage,
        DATE_FORMAT(target_date, '%Y-%m-%d') AS target_date,
        status, 
        created_at
      FROM savings_goals
      WHERE user_id = ?
      ORDER BY status ASC, target_date ASC
    `;

    const [goals] = await pool.query(query, [req.user.id]);

    return res.status(200).json({
      success: true,
      count: goals.length,
      goals
    });
  } catch (error) {
    next(error);
  }
};

// 2. Create a new savings goal
exports.createGoal = async (req, res, next) => {
  try {
    const { title, target_amount, target_date } = req.body;

    if (!title || !target_amount || !target_date) {
      return res.status(400).json({
        success: false,
        message: 'Title, target amount, and target date are required.'
      });
    }

    if (Number(target_amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Target amount must be greater than zero.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO savings_goals (user_id, title, target_amount, target_date) VALUES (?, ?, ?, ?)',
      [req.user.id, title.trim(), target_amount, target_date]
    );

    return res.status(201).json({
      success: true,
      message: 'Savings goal created successfully.',
      goal_id: result.insertId
    });
  } catch (error) {
    next(error);
  }
};

// 3. Add contribution to a savings goal
exports.addContribution = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { goal_id } = req.params;
    const { amount, contribution_date, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Contribution amount must be greater than zero.'
      });
    }

    // Verify goal exists and belongs to user
    const [goal] = await connection.query(
      'SELECT id, target_amount, saved_amount FROM savings_goals WHERE id = ? AND user_id = ? FOR UPDATE',
      [goal_id, req.user.id]
    );

    if (goal.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found or access denied.'
      });
    }

    const currentGoal = goal[0];
    const newSavedAmount = Number(currentGoal.saved_amount) + Number(amount);
    const newStatus = newSavedAmount >= Number(currentGoal.target_amount) ? 'COMPLETED' : 'IN_PROGRESS';

    // Insert contribution record
    await connection.query(
      'INSERT INTO savings_contributions (goal_id, amount, contribution_date, notes) VALUES (?, ?, ?, ?)',
      [goal_id, amount, contribution_date || new Date().toISOString().split('T')[0], notes || null]
    );

    // Update goal running balance and status
    await connection.query(
      'UPDATE savings_goals SET saved_amount = ?, status = ? WHERE id = ?',
      [newSavedAmount, newStatus, goal_id]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Contribution recorded successfully.',
      saved_amount: newSavedAmount,
      status: newStatus
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// 4. Delete goal
exports.deleteGoal = async (req, res, next) => {
  try {
    const { goal_id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM savings_goals WHERE id = ? AND user_id = ?',
      [goal_id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found or access denied.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Savings goal deleted.'
    });
  } catch (error) {
    next(error);
  }
};