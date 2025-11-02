const Task = require('../models/Task');
const List = require('../models/List');
const mongoose = require('mongoose');

class TaskController {
    /**
     * @route   [POST] /api/tasks
     * @desc    Tạo một task mới
     * @body    { title: "Tên task", list_id: "ID của List" }
     */
    async createTask(req, res) {
        const { title, list_id, description, assigned_to, due_date, priority } = req.body;

        // 1. Kiểm tra dữ liệu đầu vào
        if (!title || !list_id) {
            return res.status(400).json({ message: 'Vui lòng cung cấp title và list_id' });
        }

        try {
            // 2. Kiểm tra xem List có tồn tại không
            const list = await List.findById(list_id);
            if (!list) {
                return res.status(404).json({ message: 'Không tìm thấy danh sách (List)' });
            }

            // 3. Tạo Task mới
            const newTask = new Task({
                title,
                list_id,
                description,
                assigned_to, // ID của user được gán
                due_date,
                priority,
                // Giả sử bạn muốn gán người tạo task (lấy từ middleware)
                // reporter_id: req.user._id
            });

            await newTask.save();

            return res.status(201).json(newTask);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    /**
     * @route   [GET] /api/tasks/list/:list_id
     * @desc    Lấy tất cả task thuộc về một List
     */
    async getTasksByList(req, res) {
        const { list_id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(list_id)) {
            return res.status(400).json({ message: 'List ID không hợp lệ' });
        }

        try {
            const tasks = await Task.find({ list_id: list_id })
                .populate('assigned_to', 'name email avatar_url') // Lấy thông tin người được gán
                .sort({ position: 1 }); // Giả sử bạn có trường 'position' để sắp xếp

            return res.status(200).json(tasks);
        } catch (error) {
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    /**
     * @route   [GET] /api/tasks/:id
     * @desc    Lấy chi tiết một task
     */
    async getTaskById(req, res) {
        const { id } = req.params;

        try {
            const task = await Task.findById(id).populate('assigned_to', 'name email avatar_url');

            if (!task) {
                return res.status(404).json({ message: 'Không tìm thấy task' });
            }

            return res.status(200).json(task);
        } catch (error) {
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    /**
     * @route   [PUT] /api/tasks/:id
     * @desc    Cập nhật một task (thay đổi status, title, assignee, v.v.)
     */
    async updateTask(req, res) {
        const { id } = req.params;
        const updateData = req.body; // { title, description, status, priority, due_date, assigned_to }

        try {
            const task = await Task.findById(id);
            if (!task) {
                return res.status(404).json({ message: 'Không tìm thấy task' });
            }

            // 1. Xử lý logic nếu Task bị chuyển sang List khác
            const oldListId = task.list_id;
            const newListId = updateData.list_id;

            if (newListId && newListId.toString() !== oldListId.toString()) {
                // Xóa task khỏi list cũ
                await List.findByIdAndUpdate(oldListId, {
                    $pull: { tasks: id },
                });
                // Thêm task vào list mới
                await List.findByIdAndUpdate(newListId, {
                    $push: { tasks: id },
                });
            }

            // 2. Cập nhật các thông tin còn lại của task
            // Dùng Object.assign để gán các giá trị mới vào task tìm được
            Object.assign(task, updateData);
            await task.save();

            // Trả về task đã được populate
            const populatedTask = await Task.findById(id).populate('assigned_to', 'name email avatar_url');

            return res.status(200).json(populatedTask);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    /**
     * @route   [DELETE] /api/tasks/:id
     * @desc    Xóa một task
     */
    async deleteTask(req, res) {
        const { id } = req.params;

        try {
            // 1. Tìm và xóa task
            const deletedTask = await Task.findByIdAndDelete(id);

            if (!deletedTask) {
                return res.status(404).json({ message: 'Không tìm thấy task' });
            }

            // 2. (Quan trọng) Xóa ID của task này khỏi List cha
            await List.findByIdAndUpdate(deletedTask.list_id, {
                $pull: { tasks: deletedTask._id },
            });

            return res.status(200).json({ message: 'Xóa task thành công', _id: id });
        } catch (error) {
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    /**
     * @route   [POST] /api/tasks/:id/steps
     * @desc    Thêm một step (công việc con)
     * @body    { title: "Tên step" }
     */
    async addStep(req, res) {
        const { id } = req.params; // ID của Task
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'Vui lòng cung cấp title cho step' });
        }

        try {
            // 1. Kiểm tra Task cha có tồn tại không
            const task = await Task.findById(id);
            if (!task) {
                return res.status(404).json({ message: 'Không tìm thấy task' });
            }

            // 2. Lấy vị trí (position) cho step mới
            const stepCount = await TaskStep.countDocuments({ task_id: id });

            // 3. Tạo một document mới trong collection 'task_steps'
            const newStep = new TaskStep({
                task_id: id,
                title: title,
                position: stepCount, // Dùng số lượng step hiện tại làm vị trí
            });

            await newStep.save();
            return res.status(201).json(newStep);
        } catch (error) {
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    /**
     * @route   [POST] /api/tasks/:id/labels
     * @desc    Thêm một label
     * @body    { label_name: "Tên label", color: "#..." }
     */
    async addLabel(req, res) {
        const { id } = req.params; // ID của Task
        const { label_name, color } = req.body;

        if (!label_name) {
            return res.status(400).json({ message: 'Vui lòng cung cấp label_name' });
        }

        try {
            const task = await Task.findById(id);
            if (!task) {
                return res.status(404).json({ message: 'Không tìm thấy task' });
            }

            // (Nâng cao) Kiểm tra label này đã tồn tại cho task này chưa
            const existingLabel = await TaskLabel.findOne({ task_id: id, label_name });
            if (existingLabel) {
                return res.status(400).json({ message: 'Label này đã tồn tại' });
            }

            // 2. Tạo document mới trong collection 'task_labels'
            const newLabel = new TaskLabel({
                task_id: id,
                label_name,
                color, // Sẽ dùng màu default trong schema nếu không được cung cấp
            });

            await newLabel.save();
            return res.status(201).json(newLabel);
        } catch (error) {
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    /**
     * @route   [POST] /api/tasks/:id/comments
     * @desc    Thêm một bình luận
     * @body    { content: "Nội dung bình luận" }
     */
    async addComment(req, res) {
        const { id } = req.params; // ID của Task
        const { content } = req.body;
        const userId = req.user._id; // Lấy từ authMiddleware

        if (!content) {
            return res.status(400).json({ message: 'Vui lòng nhập nội dung bình luận' });
        }

        try {
            const task = await Task.findById(id);
            if (!task) {
                return res.status(404).json({ message: 'Không tìm thấy task' });
            }

            // 2. Tạo document mới trong collection 'task_comments'
            const newComment = new TaskComment({
                task_id: id,
                user_id: userId,
                content: content,
            });

            await newComment.save();

            // 3. Trả về comment vừa tạo (kèm thông tin user)
            // Vì newComment là một document, ta có thể populate nó
            const populatedComment = await newComment.populate('user_id', 'name email avatar_url');

            return res.status(201).json(populatedComment);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }
}

module.exports = new TaskController(); // Xuất ra một instance để có thể gọi trực tiếp
