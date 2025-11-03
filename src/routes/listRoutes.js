const express = require('express');
const router = express.Router();
const ListController = require('../apis/controllers/ListController');
/**
 * @route   GET /api/lists/:projectId
 * @desc    Lấy tất cả List (cột) và Task của một Project
 */
router.get('/:projectId', ListController.getListsByProject);

/**
 * @route   POST /api/lists/:projectId
 * @desc    Tạo một List (cột) mới cho Project
 */
router.post('/:projectId', ListController.createList);

/**
 * @route   PUT /api/lists/:id
 * @desc    Cập nhật một List (thay đổi title, position)
 * @note    :id ở đây là ID của List (cột)
 */
router.put('/:id', ListController.updateList);

/**
 * @route   DELETE /api/lists/:id
 * @desc    Xóa một List (và tất cả Task bên trong)
 * @note    :id ở đây là ID của List (cột)
 */
router.delete('/:listId', ListController.deleteList);

module.exports = router;
