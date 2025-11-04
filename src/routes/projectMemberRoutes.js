const express = require('express');
const router = express.Router();
const projectMemberController = require('../apis/controllers/ProjectMemberController');

// Lấy danh sách thành viên
router.get('/:projectId/members', projectMemberController.getMembersByProject.bind(projectMemberController));

// Thêm thành viên mới
router.post('/:projectId/members/:userId', projectMemberController.addMember.bind(projectMemberController));

// Xóa thành viên
router.delete('/:projectId/members/:memberId', projectMemberController.removeMember.bind(projectMemberController));

// Tìm users
router.get('/:searchText', projectMemberController.getUsers.bind(projectMemberController));

module.exports = router;
