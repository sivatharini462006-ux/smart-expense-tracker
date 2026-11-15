const pool = require('../config/db');

// 1. Fetch user notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const [notifications] = await pool.query(
      `SELECT id, title, message, type, is_read, created_at 
       FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

// 2. Mark notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.'
    });
  } catch (error) {
    next(error);
  }
};