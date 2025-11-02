const mongoose = require('mongoose');
const Task = require('../models/Task');
const List = require('../models/List');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const User = require('../models/User');

class TaskController {
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

    // [POST] /api/lists/:listId/tasks - Tạo task mới
    async createTask(req, res) {
        try {
            const { listId } = req.params;
            const { title, description, assignees, assigned_to, dueDate, due_date, position } = req.body;
            const userId = req.user?._id;

            // Validation
            if (!title || title.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Tiêu đề task là bắt buộc',
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
                const projectCreatorId = project.created_by.toString();
                const currentUserId = userId.toString();
                const isCreator = projectCreatorId === currentUserId;

                if (!isMember && !isCreator) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn không có quyền tạo task trong list này',
                    });
                }
            }

            // Get max position if not provided
            let taskPosition = position;
            if (taskPosition === undefined || taskPosition === null) {
                const maxTask = await Task.findOne({ list_id: listId }).sort({ position: -1 });
                taskPosition = maxTask ? maxTask.position + 1 : 0;
            }

            // Handle assignee (support both single and array, but model only supports single)
            // Use assigned_to if provided, otherwise use first item from assignees array
            let assigneeId = assigned_to || (Array.isArray(assignees) && assignees.length > 0 ? assignees[0] : null);

            // Validate assignee if provided
            if (assigneeId) {
                const assignee = await User.findById(assigneeId);
                if (!assignee) {
                    return res.status(400).json({
                        success: false,
                        message: 'Người được gán không tồn tại',
                    });
                }
            }

            // Handle due date (support both camelCase and snake_case)
            const dueDateValue = dueDate || due_date;

            // Create task
            const newTask = new Task({
                title: title.trim(),
                description: description ? description.trim() : null,
                list_id: listId,
                assigned_to: assigneeId || null,
                due_date: dueDateValue ? new Date(dueDateValue) : null,
                position: taskPosition,
                is_completed: false,
            });

            const savedTask = await newTask.save();
            await savedTask.populate('assigned_to', 'name email avatar_url');

            return res.status(201).json({
                success: true,
                data: savedTask,
                message: 'Tạo task thành công',
            });
        } catch (error) {
            console.error('Error creating task:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi tạo task',
            });
        }
    }

    // [PUT] /api/tasks/:taskId - Cập nhật task
    async updateTask(req, res) {
        try {
            const { taskId } = req.params;
            const updateData = req.body;
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
                    const projectCreatorId = project.created_by.toString();
                    const currentUserId = userId.toString();
                    const isCreator = projectCreatorId === currentUserId;

                    if (!isMember && !isCreator) {
                        return res.status(403).json({
                            success: false,
                            message: 'Bạn không có quyền cập nhật task này',
                        });
                    }
                }
            }

            // Handle move to another list
            if (updateData.listId || updateData.list_id || updateData.targetListId) {
                const targetListId = updateData.listId || updateData.list_id || updateData.targetListId;

                // Validate target list
                const targetList = await List.findById(targetListId);
                if (!targetList) {
                    return res.status(404).json({
                        success: false,
                        message: 'Không tìm thấy list đích',
                    });
                }

                // Check if target list is in same project
                const targetProjectId = await this.getProjectIdFromList(targetListId);
                if (targetProjectId?.toString() !== projectId.toString()) {
                    return res.status(400).json({
                        success: false,
                        message: 'Không thể di chuyển task sang list của dự án khác',
                    });
                }

                task.list_id = targetListId;

                // If position is provided for new list, use it; otherwise get max + 1
                if (updateData.position !== undefined && updateData.position !== null) {
                    task.position = updateData.position;
                } else {
                    const maxTask = await Task.findOne({ list_id: targetListId }).sort({ position: -1 });
                    task.position = maxTask ? maxTask.position + 1 : 0;
                }
            }

            // Update other fields
            if (updateData.title !== undefined) {
                if (updateData.title.trim().length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Tiêu đề task không được để trống',
                    });
                }
                task.title = updateData.title.trim();
            }

            if (updateData.description !== undefined) {
                task.description = updateData.description ? updateData.description.trim() : null;
            }

            if (updateData.assigned_to !== undefined || updateData.assignees !== undefined) {
                const assigneeId =
                    updateData.assigned_to ||
                    (Array.isArray(updateData.assignees) && updateData.assignees.length > 0
                        ? updateData.assignees[0]
                        : null);

                if (assigneeId) {
                    const assignee = await User.findById(assigneeId);
                    if (!assignee) {
                        return res.status(400).json({
                            success: false,
                            message: 'Người được gán không tồn tại',
                        });
                    }
                    task.assigned_to = assigneeId;
                } else {
                    task.assigned_to = null;
                }
            }

            if (updateData.dueDate !== undefined || updateData.due_date !== undefined) {
                const dueDateValue = updateData.dueDate || updateData.due_date;
                task.due_date = dueDateValue ? new Date(dueDateValue) : null;
            }

            if (
                updateData.position !== undefined &&
                updateData.position !== null &&
                !updateData.listId &&
                !updateData.list_id &&
                !updateData.targetListId
            ) {
                task.position = updateData.position;
            }

            if (updateData.status !== undefined) {
                task.status = updateData.status;
            }

            if (updateData.priority !== undefined) {
                task.priority = updateData.priority;
            }

            const updatedTask = await task.save();
            await updatedTask.populate('assigned_to', 'name email avatar_url');

            return res.status(200).json({
                success: true,
                data: updatedTask,
                message: 'Cập nhật task thành công',
            });
        } catch (error) {
            console.error('Error updating task:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật task',
            });
        }
    }

    // [DELETE] /api/tasks/:taskId - Xóa task
    async deleteTask(req, res) {
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
                    const projectCreatorId = project.created_by.toString();
                    const currentUserId = userId.toString();
                    const isCreator = projectCreatorId === currentUserId;

                    if (!isMember && !isCreator) {
                        return res.status(403).json({
                            success: false,
                            message: 'Bạn không có quyền xóa task này',
                        });
                    }
                }
            }

            // Delete task
            await Task.findByIdAndDelete(taskId);

            return res.status(200).json({
                success: true,
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
}

const controller = new TaskController();

// Bind methods to maintain 'this' context
module.exports = {
    getTasksByList: controller.getTasksByList.bind(controller),
    createTask: controller.createTask.bind(controller),
    reorderTasks: controller.reorderTasks.bind(controller),
    updateTask: controller.updateTask.bind(controller),
    deleteTask: controller.deleteTask.bind(controller),
    toggleTaskComplete: controller.toggleTaskComplete.bind(controller),
    moveTask: controller.moveTask.bind(controller),
};
