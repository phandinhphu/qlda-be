const Project = require('../models/Project');
class ProjectController {
    /**
     * @route   GET /api/projects/user/:userId
     * @desc    Lấy danh sách tất cả dự án được tạo bởi một User
     */
    async getProjectsByUser(req, res) {
        try {
            const userId = req.params.userId;

            // Tìm tất cả dự án mà trường 'created_by' khớp với userId
            const projects = await Project.find({ created_by: userId })
                .select('-description') // Không cần mô tả dài cho danh sách
                .sort({ created_at: -1 }); // Dự án mới nhất lên đầu

            return res.status(200).json(projects);
        } catch (error) {
            console.error('Lỗi khi tải dự án:', error);
            // Trả về lỗi 500 nếu có lỗi server hoặc DB
            return res.status(500).json({ message: 'Lỗi server khi tải dự án.' });
        }
    }

    // ... (Các hàm createProject, updateProject, deleteProject sẽ được thêm vào đây)
}

module.exports = new ProjectController();
