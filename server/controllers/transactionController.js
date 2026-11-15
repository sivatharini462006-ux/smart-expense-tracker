const pool = require('../config/db');

// 1. Get all transactions with search, type, category, date filters
exports.getTransactions = async (req, res, next) => {
  try {
    const { type, category_id, startDate, endDate, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        t.id, 
        t.type, 
        t.amount, 
        t.payment_method, 
        DATE_FORMAT(t.date, '%Y-%m-%d') AS date, 
        t.description,
        c.id AS category_id, 
        c.name AS category_name, 
        c.icon AS category_icon, 
        c.color AS category_color,
        t.created_at
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params = [req.user.id];

    if (type) {
      query += ' AND t.type = ?';
      params.push(type.toUpperCase());
    }

    if (category_id) {
      query += ' AND t.category_id = ?';
      params.push(category_id);
    }

    if (startDate) {
      query += ' AND t.date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND t.date <= ?';
      params.push(endDate);
    }

    if (search) {
      query += ' AND (t.description LIKE ? OR c.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [transactions] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    next(error);
  }
};

// 2. Add new transaction (Income or Expense)
exports.addTransaction = async (req, res, next) => {
  try {
    const { category_id, type, amount, payment_method, date, description } = req.body;

    if (!category_id || !type || !amount || !date) {
      return res.status(400).json({
        success: false,
        message: 'Category, type, amount, and date are required fields.'
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number.'
      });
    }

    // Verify category exists and is accessible
    const [category] = await pool.query(
      'SELECT id, type FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)',
      [category_id, req.user.id]
    );

    if (category.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or access denied.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO transactions (user_id, category_id, type, amount, payment_method, date, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        category_id,
        type.toUpperCase(),
        amount,
        payment_method || 'UPI',
        date,
        description || null
      ]
    );

    return res.status(201).json({
      success: true,
      message: `${type.toUpperCase() === 'INCOME' ? 'Income' : 'Expense'} added successfully.`,
      transaction_id: result.insertId
    });
  } catch (error) {
    next(error);
  }
};

// 3. Update an existing transaction
exports.updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_id, amount, payment_method, date, description, type } = req.body;

    // Check ownership
    const [existing] = await pool.query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or access denied.'
      });
    }

    await pool.query(
      `UPDATE transactions 
       SET category_id = COALESCE(?, category_id),
           amount = COALESCE(?, amount),
           payment_method = COALESCE(?, payment_method),
           date = COALESCE(?, date),
           description = COALESCE(?, description),
           type = COALESCE(?, type)
       WHERE id = ? AND user_id = ?`,
      [category_id, amount, payment_method, date, description, type, id, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Transaction updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// 4. Delete a transaction
exports.deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or unauthorized.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};