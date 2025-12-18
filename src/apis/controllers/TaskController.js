const mongoose = require('mongoose');
const Task = require('../models/Task');
const List = require('../models/List');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const TaskStep = require('../models/TaskStep');
const TaskLabel = require('../models/TaskLabel');
const TaskComment = require('../models/TaskComment');
const TaskFile = require('../models/TaskFile');
const User = require('../models/User');

class TaskController {
    // [GET] /api/tasks/:id - Lấy chi tiết một task
    async getTaskById(req, res) {
        const { id } = req.params;

        try {
            const task = await Task.findById(id)
                .populate('assigned_to', 'name email avatar_url')
                .populate({
                    path: 'list_id',
                    populate: { path: 'project_id', select: '_id title' },
                });

            if (!task) {
                return res.status(404).json({ message: 'Không tìm thấy task' });
            }

            return res.status(200).json(task);
        } catch (error) {
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }
    // Helper: Check if user is member of project
    async checkProjectMember(projectId, userId) {
        if (!userId) return false;
        const member = await ProjectMember.findOne({
            project_id: projectId,
            user_id: userId,
        });
        return !!member;
    }

    // Helper: Get projectId from listId
    async getProjectIdFromList(listId) {
        const list = await List.findById(listId).populate('project_id');
        if (!list || !list.project_id) return null;
        return list.project_id._id || list.project_id;
    }

    // [GET] /api/lists/:listId/tasks - Lấy tất cả tasks trong list
    async getTasksByList(req, res) {
        try {
            const { listId } = req.params;
            const userId = req.user?._id;

            // Check if list exists
            const list = await List.findById(listId).populate('project_id');
            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy list',
                });
            }

            const project = list.project_id;
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dự án liên quan',
                });
            }

            // Check permissions
            if (userId) {
                const isMember = await this.checkProjectMember(project._id.toString(), userId);
                const projectCreatorId = project.created_by.toString();
                const currentUserId = userId.toString();
                const isCreator = projectCreatorId === currentUserId;

                if (!isMember && !isCreator) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn không có quyền truy cập tasks trong list này',
                    });
                }
            }

            // Get all tasks
            const tasks = await Task.find({ list_id: listId })
                .populate('assigned_to', 'name email avatar_url')
                .sort({ position: 1 });

            return res.status(200).json({
                success: true,
                data: tasks,
                message: 'Lấy danh sách tasks thành công',
            });
        } catch (error) {
            console.error('Error getting tasks:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách tasks',
            });
        }
    }

    // [GET] /api/tasks - Lấy tất cả tasks
    async getAllTasks(req, res) {
        const { project_id } = req.params;
        try {
            const lists = await List.find({ project_id }).select('_id');
            const listIds = lists.map((list) => list._id);
            const tasks = await Task.find({ list_id: { $in: listIds } })
                .populate('assigned_to', 'name email avatar_url')
                .populate('list_id', 'title');
            return res.status(200).json(tasks);
        } catch (error) {
            console.error('Error getting all tasks:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    // [POST] /api/tasks - Tạo task mới
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
                assigned_to: assigned_to ? (Array.isArray(assigned_to) ? assigned_to : [assigned_to]) : [],
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

    // [PUT] /api/tasks/:taskId - Cập nhật task
    async updateTask(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const updatedTask = await Task.findByIdAndUpdate(id, updateData, { new: true }).populate(
                'assigned_to',
                'name email avatar_url',
            );

            if (!updatedTask) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy task',
                });
            }

            return res.status(200).json(updatedTask);
        } catch (error) {
            console.error('Error edit task:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi edit task',
            });
        }
    }

    // [DELETE] /api/tasks/:taskId - Xóa task
    async deleteTask(req, res) {
        try {
            const { id } = req.params;
            await Task.findByIdAndDelete(id);
            return res.status(200).json({
                message: 'Xóa task thành công',
            });
        } catch (error) {
            console.error('Error deleting task:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi xóa task',
            });
        }
    }

    // [PATCH] /api/tasks/:taskId/toggle-complete - Đánh dấu hoàn thành/chưa hoàn thành
    async toggleTaskComplete(req, res) {
        try {
            const { taskId } = req.params;
            const userId = req.user?._id;

            // Find task
            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy task',
                });
            }

            // Get projectId for permission check
            const projectId = await this.getProjectIdFromList(task.list_id);
            if (!projectId) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dự án liên quan',
                });
            }

            // Check permissions
            if (userId) {
                const project = await Project.findById(projectId);
                if (project) {
                    const isMember = await this.checkProjectMember(projectId.toString(), userId);
                    const projectCreatorId = new mongoose.Types.ObjectId(project.created_by);
                    const currentUserId = new mongoose.Types.ObjectId(userId);
                    const isCreator = projectCreatorId.equals(currentUserId);

                    if (!isMember && !isCreator) {
                        return res.status(403).json({
                            success: false,
                            message: 'Bạn không có quyền cập nhật task này',
                        });
                    }
                }
            }

            // Toggle is_completed
            task.is_completed = !task.is_completed;

            // Also update status if needed
            if (task.is_completed && task.status !== 'done') {
                task.status = 'done';
            } else if (!task.is_completed && task.status === 'done') {
                task.status = 'todo';
            }

            const updatedTask = await task.save();
            await updatedTask.populate('assigned_to', 'name email avatar_url');

            return res.status(200).json({
                success: true,
                data: updatedTask,
                message: `Task đã được đánh dấu ${updatedTask.is_completed ? 'hoàn thành' : 'chưa hoàn thành'}`,
            });
        } catch (error) {
            console.error('Error toggling task complete:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật trạng thái task',
            });
        }
    }

    // [PUT] /api/lists/:listId/tasks/reorder - Sắp xếp tasks trong list
    async reorderTasks(req, res) {
        try {
            const { listId } = req.params;
            const { taskOrders } = req.body; // Array of { taskId, position }
            const userId = req.user?._id;

            // Validation
            if (!Array.isArray(taskOrders) || taskOrders.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Danh sách thứ tự không hợp lệ',
                });
            }

            // Check if list exists
            const list = await List.findById(listId).populate('project_id');
            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy list',
                });
            }

            const project = list.project_id;
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dự án liên quan',
                });
            }

            // Check permissions
            if (userId) {
                const isMember = await this.checkProjectMember(project._id.toString(), userId);
                const projectCreatorId = new mongoose.Types.ObjectId(project.created_by);
                const currentUserId = new mongoose.Types.ObjectId(userId);
                const isCreator = projectCreatorId.equals(currentUserId);

                if (!isMember && !isCreator) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn không có quyền sắp xếp tasks trong list này',
                    });
                }
            }

            // Update positions
            const updatePromises = taskOrders.map(({ taskId, position }) => {
                return Task.findByIdAndUpdate(taskId, { position }, { new: true });
            });

            await Promise.all(updatePromises);

            // Get updated tasks
            const updatedTasks = await Task.find({ list_id: listId })
                .populate('assigned_to', 'name email avatar_url')
                .sort({ position: 1 });

            return res.status(200).json({
                success: true,
                data: updatedTasks,
                message: 'Sắp xếp tasks thành công',
            });
        } catch (error) {
            console.error('Error reordering tasks:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi sắp xếp tasks',
            });
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
                color: color || '#808080', // Sẽ dùng màu default trong schema nếu không được cung cấp
            });

            await newLabel.save();
            return res.status(201).json(newLabel);
        } catch (error) {
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async updateDueDate(req, res) {
        try {
            const { taskId } = req.params;
            const { due_date } = req.body;
            // Find task
            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy task',
                });
            }
            // Update due_date
            task.due_date = due_date;
            await task.save();
            console.log('Updated task:', task);
            return res.status(200).json({
                success: true,
                data: task,
                message: 'Cập nhật ngày hết hạn thành công',
            });
        } catch (error) {
            console.error('Error setting due date:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật ngày hết hạn',
            });
        }
    }

    /**
     * @route   [GET] /api/tasks/:taskId/labels
     * @desc    Lấy danh sách labels của task
     */
    async getTaskLabels(req, res) {
        try {
            const { taskId } = req.params;

            // Find task
            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy task',
                });
            }

            // Get all labels
            const labels = await TaskLabel.find({ task_id: taskId });
            return res.status(200).json({
                success: true,
                data: labels,
                message: 'Lấy danh sách labels thành công',
            });
        } catch (error) {
            console.error('Error getting task labels:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách labels',
            });
        }
    }

    /**
     * @route   [PUT] /api/tasks/:taskId/labels/:labelId
     * @desc    Cập nhật label (tên, màu)
     * @body    { label_name: "Tên mới", color: "#..." }
     */
    async updateLabel(req, res) {
        try {
            const { taskId, labelId } = req.params;
            const { label_name, color } = req.body;

            // Find label
            const label = await TaskLabel.findOne({ _id: labelId, task_id: taskId });
            if (!label) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy label',
                });
            }

            // Check if new label_name already exists (if changed)
            if (label_name && label_name !== label.label_name) {
                const existingLabel = await TaskLabel.findOne({
                    task_id: taskId,
                    label_name,
                    _id: { $ne: labelId },
                });
                if (existingLabel) {
                    return res.status(400).json({
                        success: false,
                        message: 'Label này đã tồn tại',
                    });
                }
            }

            // Update label
            if (label_name) label.label_name = label_name;
            if (color) label.color = color;

            await label.save();
            return res.status(200).json({
                success: true,
                data: label,
                message: 'Cập nhật label thành công',
            });
        } catch (error) {
            console.error('Error updating label:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật label',
            });
        }
    }

    /**
     * @route   [DELETE] /api/tasks/:taskId/labels/:labelId
     * @desc    Xóa label khỏi task
     */
    async deleteLabel(req, res) {
        try {
            const { taskId, labelId } = req.params;

            // Find label
            const label = await TaskLabel.findOne({ _id: labelId, task_id: taskId });
            if (!label) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy label',
                });
            }

            await TaskLabel.findByIdAndDelete(labelId);
            return res.status(200).json({
                success: true,
                message: 'Xóa label thành công',
            });
        } catch (error) {
            console.error('Error deleting label:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi xóa label',
            });
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

    /**
     * @route   [GET] /api/tasks/:taskId/comments
     * @desc    Lấy danh sách comments của task
     */
    async getTaskComments(req, res) {
        try {
            const { taskId } = req.params;

            // Find task
            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy task',
                });
            }

            // Get all comments with user info
            const comments = await TaskComment.find({ task_id: taskId })
                .populate('user_id', 'name email avatar_url')
                .sort({ created_at: 1 });

            return res.status(200).json({
                success: true,
                data: comments,
                message: 'Lấy danh sách comments thành công',
            });
        } catch (error) {
            console.error('Error getting task comments:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách comments',
            });
        }
    }

    /**
     * @route   [PUT] /api/tasks/:taskId/comments/:commentId
     * @desc    Cập nhật comment
     * @body    { content: "Nội dung mới" }
     */
    async updateComment(req, res) {
        try {
            const { taskId, commentId } = req.params;
            const { content } = req.body;
            const userId = req.user._id;

            if (!content) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập nội dung bình luận',
                });
            }

            // Find comment
            const comment = await TaskComment.findOne({ _id: commentId, task_id: taskId });
            if (!comment) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy comment',
                });
            }

            // Check if user is the owner of the comment
            if (comment.user_id.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền chỉnh sửa comment này',
                });
            }

            // Update comment
            comment.content = content;
            await comment.save();

            // Populate user info
            await comment.populate('user_id', 'name email avatar_url');

            return res.status(200).json({
                success: true,
                data: comment,
                message: 'Cập nhật comment thành công',
            });
        } catch (error) {
            console.error('Error updating comment:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật comment',
            });
        }
    }

    /**
     * @route   [DELETE] /api/tasks/:taskId/comments/:commentId
     * @desc    Xóa comment
     */
    async deleteComment(req, res) {
        try {
            const { taskId, commentId } = req.params;
            const userId = req.user._id;

            // Find comment
            const comment = await TaskComment.findOne({ _id: commentId, task_id: taskId });
            if (!comment) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy comment',
                });
            }

            // Check if user is the owner of the comment
            if (comment.user_id.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xóa comment này',
                });
            }

            await TaskComment.findByIdAndDelete(commentId);

            return res.status(200).json({
                success: true,
                message: 'Xóa comment thành công',
            });
        } catch (error) {
            console.error('Error deleting comment:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi xóa comment',
            });
        }
    }
    // [PUT] /api/tasks/:taskId/move - Di chuyển task sang list khác
    async moveTask(req, res) {
        try {
            const { taskId } = req.params;
            const { targetListId, listId, position } = req.body;
            const userId = req.user?._id;

            // Use targetListId or listId
            const finalTargetListId = targetListId || listId;

            if (!finalTargetListId) {
                return res.status(400).json({
                    success: false,
                    message: 'List đích là bắt buộc',
                });
            }

            // Find task
            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy task',
                });
            }

            // Validate target list
            const targetList = await List.findById(finalTargetListId).populate('project_id');
            if (!targetList) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy list đích',
                });
            }

            // Get source and target project IDs
            const sourceProjectId = await this.getProjectIdFromList(task.list_id);
            const targetProjectId = await this.getProjectIdFromList(finalTargetListId);

            if (!sourceProjectId || !targetProjectId) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dự án liên quan',
                });
            }

            // Check if both lists are in same project
            if (sourceProjectId.toString() !== targetProjectId.toString()) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể di chuyển task sang list của dự án khác',
                });
            }

            // Check permissions
            if (userId) {
                const project = await Project.findById(targetProjectId);
                if (project) {
                    const isMember = await this.checkProjectMember(targetProjectId.toString(), userId);
                    const projectCreatorId = new mongoose.Types.ObjectId(project.created_by);
                    const currentUserId = new mongoose.Types.ObjectId(userId);
                    const isCreator = projectCreatorId.equals(currentUserId);

                    if (!isMember && !isCreator) {
                        return res.status(403).json({
                            success: false,
                            message: 'Bạn không có quyền di chuyển task này',
                        });
                    }
                }
            }

            // Update list_id
            task.list_id = finalTargetListId;

            // Handle position
            if (position !== undefined && position !== null) {
                task.position = position;
            } else {
                // Get max position in target list
                const maxTask = await Task.findOne({ list_id: finalTargetListId }).sort({ position: -1 });
                task.position = maxTask ? maxTask.position + 1 : 0;
            }

            const updatedTask = await task.save();
            await updatedTask.populate('assigned_to', 'name email avatar_url');

            return res.status(200).json({
                success: true,
                data: updatedTask,
                message: 'Di chuyển task thành công',
            });
        } catch (error) {
            console.error('Error moving task:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi di chuyển task',
            });
        }
    }

    // [GET] /api/tasks/:taskId/steps - Lấy tất cả steps của task
    async getTaskSteps(req, res) {
        try {
            const { taskId } = req.params;
            console.log('taskId:', taskId);
            // Find task
            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy task',
                });
            }

            // Get all steps
            const steps = await TaskStep.find({ task_id: taskId }).sort({ position: 1 });
            return res.status(200).json({
                success: true,
                data: steps,
                message: 'Lấy danh sách steps thành công',
            });
        } catch (error) {
            console.error('Error getting task steps:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách steps',
            });
        }
    }

    // [PATCH] /api/tasks/:taskId/steps/:stepId/toggle-complete - Đánh dấu hoàn thành/chưa hoàn thành step
    async toggleStepComplete(req, res) {
        try {
            const { taskId, stepId } = req.params;

            // Find step
            const step = await TaskStep.findOne({ _id: stepId, task_id: taskId });
            if (!step) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy step',
                });
            }

            // Toggle is_completed
            step.is_completed = !step.is_completed;
            await step.save();
            return res.status(200).json({
                success: true,
                data: step,
                message: `Step đã được đánh dấu ${step.is_completed ? 'hoàn thành' : 'chưa hoàn thành'}`,
            });
        } catch (error) {
            console.error('Error toggling step complete:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật trạng thái step',
            });
        }
    }

    // [POST] /api/tasks/:taskId/uploads
    async uploadFile(req, res) {
        try {
            const { taskId } = req.params;
            const userId = req.user._id;

            // 1. Kiểm tra multer đã xử lý file chưa
            if (!req.file) {
                return res.status(400).json({ message: 'Vui lòng chọn file để tải lên.' });
            }

            // 2. Tạo đường dẫn URL để frontend truy cập
            const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

            // 3. Lưu thông tin vào MongoDB
            const newTaskFile = new TaskFile({
                task_id: taskId,
                file_url: fileUrl,
                uploaded_by: userId,
            });

            await newTaskFile.save();
            await newTaskFile.populate('uploaded_by');
            // 4. Trả về dữ liệu
            return res.status(201).json({
                success: true,
                data: newTaskFile,
                message: 'Upload file thành công',
            });
        } catch (error) {
            console.error('Lỗi khi upload file:', error);
            // Xóa file nếu có lỗi db để tránh rác (optional)
            return res.status(500).json({ message: 'Lỗi server khi xử lý file.' });
        }
    }

    async getTaskFiles(req, res) {
        try {
            const { taskId } = req.params;
            const files = await TaskFile.find({ task_id: taskId }).populate('uploaded_by');

            return res.status(200).json({
                success: true,
                data: files,
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách file:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    /**
     * @route   [GET] /api/tasks/:taskId/members
     * @desc    Lấy danh sách thành viên đã gán vào task
     */
    async getTaskMembers(req, res) {
        try {
            const { taskId } = req.params;

            // Find task
            const task = await Task.findById(taskId).populate('assigned_to', 'name email avatar_url');
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy task',
                });
            }

            // Get all members
            const members = task.assigned_to || [];
            return res.status(200).json({
                success: true,
                data: members,
                message: 'Lấy danh sách thành viên thành công',
            });
        } catch (error) {
            console.error('Error getting task members:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách thành viên',
            });
        }
    }

    /**
     * @route   [POST] /api/tasks/:taskId/members
     * @desc    Gán thành viên vào task
     * @body    { userId: "user_id" }
     */
    async addTaskMember(req, res) {
        try {
            const { taskId } = req.params;
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp userId',
                });
            }

            // Find task
            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy task',
                });
            }

            // Check if user exists
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng',
                });
            }

            // Ensure assigned_to is an array
            if (!Array.isArray(task.assigned_to)) {
                task.assigned_to = task.assigned_to ? [task.assigned_to] : [];
            }

            // Check if user is already assigned
            const userIdStr = userId.toString();
            if (task.assigned_to.some((id) => id.toString() === userIdStr)) {
                return res.status(400).json({
                    success: false,
                    message: 'Thành viên này đã được gán vào task',
                });
            }

            // Add user to assigned_to array
            task.assigned_to.push(userId);
            await task.save();

            // Populate and return updated task
            await task.populate('assigned_to', 'name email avatar_url');
            const addedMember = task.assigned_to.find((m) => m._id.toString() === userId.toString());

            return res.status(200).json({
                success: true,
                data: addedMember,
                message: 'Gán thành viên thành công',
            });
        } catch (error) {
            console.error('Error adding task member:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi gán thành viên',
            });
        }
    }

    /**
     * @route   [DELETE] /api/tasks/:taskId/members/:userId
     * @desc    Xóa thành viên khỏi task
     */
    async removeTaskMember(req, res) {
        try {
            const { taskId, userId } = req.params;

            // Find task
            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy task',
                });
            }

            // Remove user from assigned_to array
            if (task.assigned_to && task.assigned_to.length > 0) {
                task.assigned_to = task.assigned_to.filter((id) => id.toString() !== userId.toString());
                await task.save();
            }

            return res.status(200).json({
                success: true,
                message: 'Xóa thành viên khỏi task thành công',
            });
        } catch (error) {
            console.error('Error removing task member:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi xóa thành viên',
            });
        }
    }
}

module.exports = new TaskController(); // Xuất ra một instance để có thể gọi trực tiếp
