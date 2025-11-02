const Project = require('../models/Project');
const User = require('../models/User');

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

            // TODO: Lấy user_id từ authentication middleware (hiện tại tạm thời hardcode)
            // Tạm thời lấy user đầu tiên trong database hoặc hardcode
            let userId = req.user?._id;
            if (!userId) {
                const firstUser = await User.findOne();
                if (!firstUser) {
                    return res.status(400).json({
                        success: false,
                        message: 'Không tìm thấy người dùng. Vui lòng đăng nhập',
                    });
                }
                userId = firstUser._id;
            }

            const newProject = new Project({
                project_name: project_name.trim(),
                description: description ? description.trim() : null,
                created_by: userId,
            });

            const savedProject = await newProject.save();
            await savedProject.populate('created_by', 'name email avatar_url');

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

module.exports = new ProjectController();
