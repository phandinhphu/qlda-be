const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const List = require('../models/List');
const Task = require('../models/Task');
const ChatController = require('./ChatController');

class ProjectController {
    // [GET] /api/projects - Lấy danh sách tất cả dự án
    /**
     * @route   GET /api/projects/user/:userId
     * @desc    Lấy danh sách tất cả dự án được tạo bởi một User
     */
    async getProjectsByUser(req, res) {
        try {
            const userId = req.params.userId;

            // Tìm tất cả dự án mà trường 'created_by' khớp với userId
            const projects = await Project.find({ created_by: userId }).sort({ created_at: -1 }); // Dự án mới nhất lên đầu

            return res.status(200).json(projects);
        } catch (error) {
            console.error('Lỗi khi tải dự án:', error);
            // Trả về lỗi 500 nếu có lỗi server hoặc DB
            return res.status(500).json({ message: 'Lỗi server khi tải dự án.' });
        }
    }

    /**
     * @route   GET /api/projects/search?name=abc
     * @desc    Tìm kiếm dự án theo tên (theo người dùng hiện tại)
     */
    async searchProjectsByName(req, res) {
        try {
            const userId = req.user?._id;
            const { name = '' } = req.query;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Không xác thực. Vui lòng đăng nhập lại',
                });
            }
            const keyword = name.toString().trim();
            const condition = {
                created_by: userId,
                ...(keyword ? { project_name: { $regex: new RegExp(keyword, 'i') } } : {}),
            };
            const projects = await Project.find(condition)
                .populate('created_by', 'name email avatar_url')
                .sort({ created_at: -1 });

            return res.status(200).json({
                success: true,
                data: projects,
                message: 'Tìm kiếm dự án thành công',
            });
        } catch (error) {
            console.error('Error searching projects:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi tìm kiếm dự án',
            });
        }
    }

    async getAllProjects(req, res) {
        try {
            const projects = await Project.find()
                .populate('created_by', 'name email avatar_url')
                .sort({ created_at: -1 });

            return res.status(200).json({
                success: true,
                data: projects,
                message: 'Lấy danh sách dự án thành công',
            });
        } catch (error) {
            console.error('Error getting projects:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách dự án',
            });
        }
    }

    // [GET] /api/projects/:id - Lấy chi tiết 1 dự án
    async getProjectById(req, res) {
        try {
            const { id } = req.params;
            const project = await Project.findById(id).populate('created_by', 'name email avatar_url');

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dự án',
                });
            }

            return res.status(200).json({
                success: true,
                data: project,
                message: 'Lấy chi tiết dự án thành công',
            });
        } catch (error) {
            console.error('Error getting project:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy chi tiết dự án',
            });
        }
    }

    // [POST] /api/projects - Tạo dự án mới
    async createProject(req, res) {
        try {
            const { project_name, description } = req.body;

            // Validation
            if (!project_name || project_name.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên dự án là bắt buộc',
                });
            }

            if (project_name.trim().length < 3) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên dự án phải có ít nhất 3 ký tự',
                });
            }

            if (description && description.length > 500) {
                return res.status(400).json({
                    success: false,
                    message: 'Mô tả không được vượt quá 500 ký tự',
                });
            }

            // Lấy user_id từ authentication middleware
            // authMiddleware đảm bảo req.user luôn được set
            const userId = req.user._id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại',
                });
            }

            const newProject = new Project({
                project_name: project_name.trim(),
                description: description ? description.trim() : null,
                created_by: userId,
            });

            const savedProject = await newProject.save();
            await savedProject.populate('created_by', 'name email avatar_url');

            // Tự động tạo ProjectMember cho người tạo với role 'owner'
            const newProjectMember = new ProjectMember({
                project_id: savedProject._id,
                user_id: userId,
                role: 'owner',
            });
            await newProjectMember.save();

            // Tạo group chat room cho project
            try {
                const groupRoom = await ChatController.createGroupChatRoom(savedProject._id, savedProject.project_name);
                // Thêm owner vào group chat
                await ChatController.addMemberToGroupRoom(savedProject._id, userId);
            } catch (chatError) {
                console.error('Error creating chat room:', chatError);
                // Không throw error, vẫn tạo project thành công
            }

            return res.status(201).json({
                success: true,
                data: savedProject,
                message: 'Tạo dự án thành công',
            });
        } catch (error) {
            console.error('Error creating project:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi tạo dự án',
            });
        }
    }

    // [PUT] /api/projects/:id - Cập nhật dự án
    async updateProject(req, res) {
        try {
            const { id } = req.params;
            const { project_name, description } = req.body;

            // Kiểm tra project tồn tại
            const project = await Project.findById(id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dự án',
                });
            }

            // Validation
            if (!project_name || project_name.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên dự án là bắt buộc',
                });
            }

            if (project_name.trim().length < 3) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên dự án phải có ít nhất 3 ký tự',
                });
            }

            if (description && description.length > 500) {
                return res.status(400).json({
                    success: false,
                    message: 'Mô tả không được vượt quá 500 ký tự',
                });
            }

            // Cập nhật project
            project.project_name = project_name.trim();
            project.description = description ? description.trim() : null;

            const updatedProject = await project.save();
            await updatedProject.populate('created_by', 'name email avatar_url');

            return res.status(200).json({
                success: true,
                data: updatedProject,
                message: 'Cập nhật dự án thành công',
            });
        } catch (error) {
            console.error('Error updating project:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật dự án',
            });
        }
    }

    // [DELETE] /api/projects/:id - Xóa dự án
    async deleteProject(req, res) {
        try {
            const { id } = req.params;

            // Kiểm tra project tồn tại
            const project = await Project.findById(id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dự án',
                });
            }

            // Cascade delete: Xóa tất cả lists và tasks trong project
            const lists = await List.find({ project_id: id });
            const listIds = lists.map((list) => list._id);

            // Xóa tất cả tasks trong các lists
            if (listIds.length > 0) {
                await Task.deleteMany({ list_id: { $in: listIds } });
            }

            // Xóa tất cả lists
            await List.deleteMany({ project_id: id });

            // Xóa tất cả ProjectMembers
            await ProjectMember.deleteMany({ project_id: id });

            // Xóa project
            await Project.findByIdAndDelete(id);

            return res.status(200).json({
                success: true,
                message: 'Xóa dự án thành công',
            });
        } catch (error) {
            console.error('Error deleting project:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi xóa dự án',
            });
        }
    }

    async getProjectsUserJoined(req, res) {
        try {
            const userId = req.user._id;
            const memberships = await ProjectMember.find({ user_id: userId }).select('project_id');
            const projectIds = memberships.map((m) => m.project_id);

            // 2. Dùng Aggregation để lấy Project và tính toán %
            const projectsWithStats = await Project.aggregate([
                // Chỉ lấy các dự án mà user là thành viên
                {
                    $match: { _id: { $in: projectIds } },
                },
                // Lấy tất cả List (cột) thuộc về dự án
                {
                    $lookup: {
                        from: 'lists', // Tên collection của List
                        localField: '_id',
                        foreignField: 'project_id',
                        as: 'lists',
                    },
                },
                {
                    $lookup: {
                        from: 'tasks', // Tên collection của Task
                        let: {
                            // 1. Tạo một biến 'listIds' (lấy từ mảng 'lists' của bước trước)
                            listIds: '$lists._id',
                        },
                        pipeline: [
                            // 2. Chạy một pipeline con trên collection 'tasks'
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            // Điều kiện 1: task.list_id phải nằm trong mảng [$$listIds]
                                            { $in: ['$list_id', '$$listIds'] },

                                            // Điều kiện 2: task.assigned_to phải là userId
                                            // (userId này là biến JS có trong hàm controller)
                                            { $in: [userId, '$assigned_to'] },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: 'tasks', // Tên mảng kết quả
                    },
                },
                // Thêm các trường tính toán %
                {
                    $addFields: {
                        totalTasks: { $size: '$tasks' },
                        doneTasks: {
                            $size: {
                                $filter: {
                                    input: '$tasks',
                                    as: 'task',
                                    cond: { $eq: ['$$task.status', 'done'] }, // Giả sử status là 'done'
                                },
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        percentage: {
                            // Chia (tránh chia cho 0)
                            $cond: [
                                { $eq: ['$totalTasks', 0] },
                                100, // Nếu totalTasks = 0, % = 0
                                { $multiply: [{ $divide: ['$doneTasks', '$totalTasks'] }, 100] },
                            ],
                        },
                    },
                },
                // Chỉ chọn lọc các trường cần thiết trả về
                {
                    $project: {
                        project_id: '$_id',
                        project_name: 1,
                        description: 1,
                        created_by: 1,
                        percentage: { $round: ['$percentage', 0] }, // Làm tròn %
                        totalTasks: 1,
                        doneTasks: 1,
                        // Bỏ đi mảng 'lists' và 'tasks' (đã dùng xong)
                    },
                },
                {
                    $sort: { project_name: 1 }, // Sắp xếp theo tên
                },
            ]);
            res.status(200).json(projectsWithStats);
        } catch (error) {
            console.error('Lỗi khi lấy dự án của user:', error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    }
}

const controller = new ProjectController();

// Bind methods to maintain 'this' context
module.exports = {
    getAllProjects: controller.getAllProjects.bind(controller),
    getProjectById: controller.getProjectById.bind(controller),
    createProject: controller.createProject.bind(controller),
    updateProject: controller.updateProject.bind(controller),
    deleteProject: controller.deleteProject.bind(controller),
    getProjectsByUser: controller.getProjectsByUser.bind(controller),
    getProjectsUserJoined: controller.getProjectsUserJoined.bind(controller),
    searchProjectsByName: controller.searchProjectsByName.bind(controller),
};
