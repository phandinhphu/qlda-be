const cron = require('node-cron');
const Task = require('../apis/models/Task');
const { getIO } = require('../config/socket');

const startReminderJob = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            console.log('Running reminder job at:', now);

            const tasksDue = await Task.find({
                reminder_date: { $lte: now },
                status: { $ne: 'done' },
            })
                .populate('assigned_to', '_id')
                .populate('list_id', 'project_id');

            for (const task of tasksDue) {
                const usersToRemind = task.assigned_to.filter((user) => !task.reminded_users.includes(user._id));

                if (usersToRemind.length === 0) continue;

                const io = getIO();
                const projectId = task.list_id?.project_id || task.project_id;
                const message = `Task "${task.title}" sắp đến hạn!`;

                usersToRemind.forEach((user) => {
                    const userId = user._id.toString();

                    io.to('user:' + userId).emit('task_reminder', {
                        taskId: task._id,
                        taskTitle: task.title,
                        listId: task.list_id?._id,
                        projectId: projectId,
                        message: message,
                        type: 'reminder',
                        timestamp: new Date().toISOString(),
                    });

                    task.reminded_users.push(user._id);
                });

                await task.save();
            }
        } catch (error) {
            console.error('Error in reminder cron job:', error);
        }
    });
};

module.exports = { startReminderJob };
