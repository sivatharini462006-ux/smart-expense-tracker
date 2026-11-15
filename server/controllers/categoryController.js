const pool = require('../config/db');

// 1. Get all accessible categories (System defaults + user created)
exports.getCategories = async (req, res, next) => {
  try {
    const { type } = req.query; // optional filter: 'INCOME' or 'EXPENSE'

    let query = `
      SELECT id, name, type, icon, color, user_id 
      FROM categories 
      WHERE user_id IS NULL OR user_id = ?
    `;
    const params = [req.user.id];

    if (type) {
      query += ' AND type = ?';
      params.push(type.toUpperCase());
    }

    query += ' ORDER BY name ASC';

    const [categories] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    next(error);
  }
};

// 2. Create custom category
exports.createCategory = async (req, res, next) => {
  try {
    const { name, type, icon, color } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Category name and type (INCOME/EXPENSE) are required.'
      });
    }

    const validTypes = ['INCOME', 'EXPENSE'];
    if (!validTypes.includes(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either INCOME or EXPENSE.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO categories (user_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
      [
        req.user.id,
        name.trim(),
        type.toUpperCase(),
        icon || 'Tag',
        color || '#4B5563'
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category: {
        id: result.insertId,
        user_id: req.user.id,
        name: name.trim(),
        type: type.toUpperCase(),
        icon: icon || 'Tag',
        color: color || '#4B5563'
      }
    });
  } catch (error) {
    next(error);
  }
};