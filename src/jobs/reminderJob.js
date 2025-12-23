const cron = require('node-cron');
const Task = require('../apis/models/Task');
const { getIO } = require('../config/socket');

const startReminderJob = () => {
    // Chạy mỗi phút 1 lần
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            console.log('Running reminder job at:', now);

            // Tìm task có ngày nhắc <= hiện tại và chưa được nhắc
            const tasksDue = await Task.find({
                reminder_date: { $exists: true, $lte: now },
                is_reminded: false,
                status: { $ne: 'done' },
            })
                .populate('assigned_to', '_id')
                .populate({
                    path: 'list_id',
                    select: 'project_id',
                });

            if (tasksDue.length > 0) {
                console.log(`Found ${tasksDue.length} tasks due for reminder.`);
            }

            for (const task of tasksDue) {
                const io = getIO();
                const projectId = task.list_id?.project_id;

                // Gửi thông báo đến những người được assign
                if (task.assigned_to && task.assigned_to.length > 0) {
                    task.assigned_to.forEach((user) => {
                        const userId = user._id.toString();
                        console.log(`Emitting notification to user ${userId} for task ${task.title}`);
                        // Emit sự kiện 'task_reminder' tới room của user
                        // Socket config đang join room "user:${userId}"
                        io.to(`user:${userId}`).emit('task_reminder', {
                            taskId: task._id,
                            taskTitle: task.title,
                            listId: task.list_id?._id,
                            projectId: projectId,
                            message: `Công việc "${task.title}" sắp hết hạn !`,
                            type: 'info',
                            timestamp: new Date().toISOString(),
                        });
                    });
                }

                // Cập nhật đã nhắc
                task.is_reminded = true;
                await task.save();
            }
        } catch (error) {
            console.error('Error in reminder cron job:', error);
        }
    });
};

module.exports = { startReminderJob };
