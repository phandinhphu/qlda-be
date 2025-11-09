const Task = require('../models/Task'); // Import Task Model
const mongoose = require('mongoose');

class UserController {
    async getUserStats(req, res) {
        try {
            const userId = req.user._id;

            const totalTasks = await Task.countDocuments({
                assigned_to: userId,
            });
            const todoTasks = await Task.countDocuments({
                assigned_to: userId,
                status: 'todo',
            });

            let percentage = 0;
            if (totalTasks > 0) {
                percentage = (1 - todoTasks / totalTasks) * 100;
            } else {
                percentage = 100;
            }
            res.status(200).json({
                totalTasks: totalTasks,
                todoTasks: todoTasks,
                percentage: Math.round(percentage),
            });
        } catch (error) {
            console.error('Lỗi khi lấy stats:', error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    }
}

module.exports = new UserController();
