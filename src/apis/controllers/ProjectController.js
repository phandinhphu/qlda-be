const Project = require('../models/Project');
const User = require('../models/User');
const List = require('../models/List');
const Task = require('../models/Task');
const ProjectMember = require('../models/ProjectMember');

class ProjectController {
    // [GET] /api/projects - Lấy danh sách tất cả dự án
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
}

const controller = new ProjectController();

// Bind methods to maintain 'this' context
module.exports = {
    getAllProjects: controller.getAllProjects.bind(controller),
    getProjectById: controller.getProjectById.bind(controller),
    createProject: controller.createProject.bind(controller),
    updateProject: controller.updateProject.bind(controller),
    deleteProject: controller.deleteProject.bind(controller),
};
