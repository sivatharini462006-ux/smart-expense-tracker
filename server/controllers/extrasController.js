const db = require('../config/db');

// 1. Custom Category Creation
exports.createCategory = async (req, res) => {
  try {
    const { name, type, color } = req.body;
    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' });
    }
    const [result] = await db.query(
      'INSERT INTO categories (user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, name, type, color || '#10B981', 'Tag']
    );
    res.status(201).json({ message: 'Category created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create category', error: err.message });
  }
};

// 2. Recurring Bills CRUD + 1-Click Pay
exports.getBills = async (req, res) => {
  try {
    const [bills] = await db.query(
      `SELECT rb.*, c.name AS category_name, c.color 
       FROM recurring_bills rb 
       JOIN categories c ON rb.category_id = c.id 
       WHERE rb.user_id = ? ORDER BY rb.due_date ASC`,
      [req.user.id]
    );
    res.json({ bills });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch bills', error: err.message });
  }
};

exports.createBill = async (req, res) => {
  try {
    const { title, amount, category_id, payment_method, due_date, frequency } = req.body;
    await db.query(
      `INSERT INTO recurring_bills (user_id, title, amount, category_id, payment_method, due_date, frequency) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, amount, category_id, payment_method || 'UPI', due_date, frequency || 'MONTHLY']
    );
    res.status(201).json({ message: 'Recurring bill added' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add bill', error: err.message });
  }
};

exports.payBill = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM recurring_bills WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Bill not found' });

    const bill = rows[0];
    const today = new Date().toISOString().split('T')[0];

    // Log transaction automatically
    await db.query(
      `INSERT INTO transactions (user_id, category_id, type, amount, payment_method, date, description) 
       VALUES (?, ?, 'EXPENSE', ?, ?, ?, ?)`,
      [req.user.id, bill.category_id, bill.amount, bill.payment_method, today, `Bill Paid: ${bill.title}`]
    );

    // Advance due date by 1 month or 1 year
    const interval = bill.frequency === 'YEARLY' ? 'INTERVAL 1 YEAR' : 'INTERVAL 1 MONTH';
    await db.query(
      `UPDATE recurring_bills SET due_date = DATE_ADD(due_date, ${interval}) WHERE id = ?`,
      [bill.id]
    );

    res.json({ message: 'Bill paid & transaction logged' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to pay bill', error: err.message });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    await db.query('DELETE FROM recurring_bills WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Bill deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete bill', error: err.message });
  }
};

// 3. Split Expenses & IOUs
exports.getSplits = async (req, res) => {
  try {
    const [splits] = await db.query(
      'SELECT * FROM splits WHERE user_id = ? ORDER BY status ASC, created_at DESC',
      [req.user.id]
    );
    res.json({ splits });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch splits', error: err.message });
  }
};

exports.createSplit = async (req, res) => {
  try {
    const { person_name, description, amount, type } = req.body;
    await db.query(
      'INSERT INTO splits (user_id, person_name, description, amount, type) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, person_name, description, amount, type]
    );
    res.status(201).json({ message: 'Split recorded' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create split', error: err.message });
  }
};

exports.settleSplit = async (req, res) => {
  try {
    await db.query(
      "UPDATE splits SET status = 'SETTLED' WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Split settled' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to settle split', error: err.message });
  }
};

exports.deleteSplit = async (req, res) => {
  try {
    await db.query('DELETE FROM splits WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Split deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete split', error: err.message });
  }
};