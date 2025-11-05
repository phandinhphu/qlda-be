const ProjectMember = require('../models/ProjectMember');
const User = require('../models/User');

class ProjectMemberController {
    /**
     * [GET] /api/projects/:projectId/members
     * Lấy danh sách thành viên theo project
     */
    async getMembersByProject(req, res) {
        const { projectId } = req.params;

        try {
            const members = await ProjectMember.find({ project_id: projectId })
                .populate('user_id', 'name email avatar')
                .lean();

            if (!members || members.length === 0) {
                return res.status(404).json({ message: 'Không có thành viên nào trong dự án này' });
            }

            const formatted = members.map((m) => ({
                id: m.user_id._id,
                name: m.user_id.name,
                email: m.user_id.email,
                avatar: m.user_id.avatar,
                role: m.role,
            }));

            return res.status(200).json(formatted);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách thành viên:', error);
            return res.status(500).json({ message: 'Lỗi server khi lấy danh sách thành viên' });
        }
    }
    /**
     * [GET] /api/projects/:searchText
     * Lấy danh sách thành viên theo chuỗi tìm kiếm
     */
    async getUsers(req, res) {
        const { searchText } = req.params;

        try {
            // Tạo biểu thức chính quy (regex) để tìm không phân biệt hoa thường
            const searchRegex = new RegExp(searchText, 'i');

            // Tìm trong bảng User
            const users = await User.find({
                $or: [{ name: { $regex: searchRegex } }, { email: { $regex: searchRegex } }],
            })
                .select('_id name email avatar') // chỉ lấy các trường cần thiết
                .lean();

            return res.status(200).json(users);
        } catch (error) {
            console.error('Lỗi khi tìm kiếm user:', error);
            return res.status(500).json({ message: 'Lỗi server khi tìm kiếm người dùng' });
        }
    }

    /**
     * [POST] /api/projects/:projectId/members
     * Thêm thành viên vào project
     */
    async addMember(req, res) {
        const { projectId, userId } = req.params;

        try {
            if (!userId) {
                return res.status(400).json({ message: 'Thiếu userId' });
            }

            const newMember = await ProjectMember.create({
                project_id: projectId,
                user_id: userId,
                role: 'member',
            });

            return res.status(201).json({
                message: 'Thêm thành viên thành công',
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({ message: 'Người dùng đã tồn tại trong project' });
            }
            return res.status(500).json({ message: 'Lỗi server khi thêm thành viên' });
        }
    }

    /**
     * [DELETE] /api/projects/:projectId/members/:userId
     * Xóa thành viên khỏi project
     */
    async removeMember(req, res) {
        const { projectId, userId } = req.params;

        try {
            const member = await ProjectMember.findOne({
                project_id: projectId,
                user_id: userId,
            });

            if (!member) {
                return res.status(404).json({ message: 'Không tìm thấy thành viên trong dự án này' });
            }

            await ProjectMember.findByIdAndDelete(member._id);

            return res.status(200).json({
                message: 'Xóa thành viên thành công',
                deletedId: member._id,
            });
        } catch (error) {
            console.error('Lỗi khi xóa thành viên:', error);
            return res.status(500).json({ message: 'Lỗi server khi xóa thành viên' });
        }
    }
}

module.exports = new ProjectMemberController();
