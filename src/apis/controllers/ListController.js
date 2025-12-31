const mongoose = require('mongoose');
const List = require('../models/List');
const Task = require('../models/Task');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');

class ListController {
    // Helper: Check if user is member of project
    async checkProjectMember(projectId, userId) {
        if (!userId || !projectId) return false;
        try {
            // Validate ObjectIds
            if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(userId)) {
                return false;
            }
            const member = await ProjectMember.findOne({
                project_id: projectId,
                user_id: userId,
            });
            return !!member;
        } catch (error) {
            console.error('Error in checkProjectMember:', error);
            return false;
        }
    }

    async getListsByProject(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user?._id;

            console.log('getListsByProject - projectId:', projectId);
            console.log('getListsByProject - userId:', userId);

            // Validate projectId format
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                console.error('Invalid projectId format:', projectId);
                return res.status(400).json({
                    success: false,
                    message: 'ID dự án không hợp lệ',
                });
            }

            // Check if project exists
            const project = await Project.findById(projectId);
            if (!project) {
                console.error('Project not found:', projectId);
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dự án',
                });
            }

            console.log('Project found:', project.project_name);

            // Check if user is member (if authenticated)
            if (userId) {
                try {
                    const isMember = await this.checkProjectMember(projectId, userId);

                    // Compare ObjectIds directly - project.created_by is already an ObjectId
                    const projectCreatorId = project.created_by.toString();
                    const currentUserId = userId.toString();

                    // User has access if they are a member OR if they are the creator
                    const isCreator = projectCreatorId === currentUserId;

                    if (!isMember && !isCreator) {
                        console.error('User does not have access:', userId);
                        console.error('Project creator:', project.created_by);
                        console.error('Current user:', userId);
                        console.error('Is member:', isMember);
                        console.error('Is creator:', isCreator);
                        return res.status(403).json({
                            success: false,
                            message: 'Bạn không có quyền truy cập dự án này',
                        });
                    }
                } catch (memberError) {
                    console.error('Error checking project member:', memberError);
                    // Continue if error checking member, but log it
                }
            }

            // Get all lists
            console.log('Fetching lists for project:', projectId);
            const lists = await List.find({ project_id: projectId }).sort({ position: 1 });
            console.log('Found lists count:', lists.length);

            // Get tasks for each list and populate assignees
            const listsWithTasks = await Promise.all(
                lists.map(async (list) => {
                    try {
                        // Safely convert to object
                        const listObj =
                            list && typeof list.toObject === 'function' ? list.toObject() : list._doc || list;

                        // Get tasks for this list with manual populate for better error handling
                        let tasks = await Task.find({ list_id: list._id }).sort({ position: 1 }).lean();

                        // Manually populate assigned_to to avoid errors with null/invalid refs
                        if (tasks && tasks.length > 0) {
                            const User = require('../models/User');
                            // Collect all valid user IDs
                            const userIds = tasks
                                .flatMap((t) => t.assigned_to || [])
                                .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

                            // Fetch all users at once
                            let usersMap = {};
                            if (userIds.length > 0) {
                                try {
                                    // Use Set to remove duplicates before querying
                                    const uniqueIds = [...new Set(userIds.map((id) => id.toString()))];
                                    const users = await User.find({ _id: { $in: uniqueIds } })
                                        .select('name email avatar_url')
                                        .lean();
                                    usersMap = users.reduce((map, user) => {
                                        map[user._id.toString()] = user;
                                        return map;
                                    }, {});
                                } catch (userError) {
                                    console.error('Error fetching users for tasks:', userError);
                                }
                            }

                            // Map users to tasks
                            tasks = tasks.map((task) => {
                                if (Array.isArray(task.assigned_to) && task.assigned_to.length > 0) {
                                    task.assigned_to = task.assigned_to
                                        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
                                        .map((id) => usersMap[id.toString()] || null)
                                        .filter((user) => user !== null);
                                } else {
                                    task.assigned_to = [];
                                }
                                return task;
                            });
                        }

                        listObj.tasks = Array.isArray(tasks) ? tasks : [];
                        return listObj;
                    } catch (taskError) {
                        console.error('Error fetching tasks for list:', list._id, taskError);
                        console.error('Task error stack:', taskError.stack);
                        // Return list with empty tasks if error occurs
                        const listObj =
                            list && typeof list.toObject === 'function' ? list.toObject() : list._doc || list;
                        listObj.tasks = [];
                        return listObj;
                    }
                }),
            );

            console.log('Successfully prepared listsWithTasks, count:', listsWithTasks.length);

            return res.status(200).json({
                success: true,
                data: listsWithTasks,
                message: 'Lấy danh sách lists thành công',
            });
        } catch (error) {
            console.error('Error getting lists:', error);
            console.error('Error stack:', error.stack);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách lists',
                error:
                    process.env.NODE_ENV === 'development'
                        ? {
                              message: error.message,
                              stack: error.stack,
                              name: error.name,
                          }
                        : undefined,
            });
        }
    }

    // [POST] /api/projects/:projectId/lists - Tạo list mới
    async createList(req, res) {
        try {
            const { projectId } = req.params;
            const { name, title, position } = req.body;
            const userId = req.user?._id;

            console.log('createList - projectId:', projectId);
            console.log('createList - userId:', userId);
            console.log('createList - body:', req.body);

            // Validate projectId format
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                console.error('Invalid projectId format:', projectId);
                return res.status(400).json({
                    success: false,
                    message: 'ID dự án không hợp lệ',
                });
            }

            // Use name or title (support both)
            const listName = name || title;

            // Validation
            if (!listName || listName.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên list là bắt buộc',
                });
            }

            if (listName.trim().length < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên list không được để trống',
                });
            }

            // Check if project exists
            const project = await Project.findById(projectId);
            if (!project) {
                console.error('Project not found:', projectId);
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dự án',
                });
            }

            // Check permissions (user must be member or creator)
            if (userId) {
                const isMember = await this.checkProjectMember(projectId, userId);
                const projectCreatorId = project.created_by.toString();
                const currentUserId = userId.toString();
                const isCreator = projectCreatorId === currentUserId;

                if (!isMember && !isCreator) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn không có quyền tạo list trong dự án này',
                    });
                }
            }

            // Get max position if not provided
            let listPosition = position;
            if (listPosition === undefined || listPosition === null) {
                const maxList = await List.findOne({ project_id: projectId }).sort({ position: -1 });
                listPosition = maxList ? maxList.position + 1 : 0;
            } else {
                // Validate position is a number
                if (typeof listPosition !== 'number' || isNaN(listPosition)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Vị trí (position) phải là một số',
                    });
                }
            }

            // Create list - Convert projectId to ObjectId explicitly
            const newList = new List({
                title: listName.trim(),
                project_id: new mongoose.Types.ObjectId(projectId),
                position: Number(listPosition),
            });

            const savedList = await newList.save();

            console.log('List created successfully:', savedList._id);
            return res.status(201).json({
                success: true,
                data: savedList,
                message: 'Tạo list thành công',
            });
        } catch (error) {
            console.error('Error creating list:', error);
            console.error('Error stack:', error.stack);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi tạo list',
                error:
                    process.env.NODE_ENV === 'development'
                        ? {
                              message: error.message,
                              stack: error.stack,
                              name: error.name,
                          }
                        : undefined,
            });
        }
    }

    // [PUT] /api/lists/:listId - Cập nhật list
    async updateList(req, res) {
        try {
            const { listId } = req.params;
            const { title, position } = req.body;
            const userId = req.user?._id;

            // Find list
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
                        message: 'Bạn không có quyền cập nhật list này',
                    });
                }
            }

            // Update fields
            if (title !== undefined) {
                const newTitle = title;
                if (newTitle.trim().length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Tên list không được để trống',
                    });
                }
                list.title = newTitle.trim();
            }

            if (position !== undefined && position !== null) {
                list.position = position;
            }

            const updatedList = await list.save();

            return res.status(200).json({
                success: true,
                data: updatedList,
                message: 'Cập nhật list thành công',
            });
        } catch (error) {
            console.error('Error updating list:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật list',
            });
        }
    }

    // [DELETE] /api/lists/:listId - Xóa list (cascade delete tasks)
    async deleteList(req, res) {
        try {
            const { listId } = req.params;
            const userId = req.user?._id;

            // Find list
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
                        message: 'Bạn không có quyền xóa list này',
                    });
                }
            }

            // Cascade delete: Delete all tasks in this list
            await Task.deleteMany({ list_id: listId });

            // Delete list
            await List.findByIdAndDelete(listId);

            return res.status(200).json({
                success: true,
                message: 'Xóa list thành công',
            });
        } catch (error) {
            console.error('Error deleting list:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi xóa list',
            });
        }
    }

    /**
     * @route   PUT /api/lists/reorder
     * @desc    Cập nhật thứ tự (position) của nhiều List
     * @body    { orderedListIds: [string] }
     */
    async reorderLists(req, res) {
        const { orderedListIds } = req.body;

        if (!orderedListIds || !Array.isArray(orderedListIds)) {
            return res.status(400).json({ message: 'Cần có orderedListIds là một mảng' });
        }

        try {
            // Tạo mảng các lệnh
            const operations = orderedListIds.map((listId, index) => ({
                updateOne: {
                    filter: { _id: listId },
                    update: { $set: { position: index } }, // Gán position mới
                },
            }));

            if (operations.length > 0) {
                await List.bulkWrite(operations); // Cập nhật tất cả 1 lần
            }

            res.status(200).json({ success: true, message: 'Đã cập nhật thứ tự List' });
        } catch (error) {
            console.error('Lỗi khi sắp xếp List:', error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    }
}

const controller = new ListController();

// Bind methods to maintain 'this' context
module.exports = {
    getListsByProject: controller.getListsByProject.bind(controller),
    createList: controller.createList.bind(controller),
    updateList: controller.updateList.bind(controller),
    deleteList: controller.deleteList.bind(controller),
    reorderLists: controller.reorderLists.bind(controller),
};
