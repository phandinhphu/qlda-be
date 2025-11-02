const List = require('../models/List');
const Task = require('../models/Task'); // Cần Task model để tìm/xóa

class ListController {
    /**
     * @route   GET /api/lists/:projectId
     * @desc    Lấy tất cả List (cột) và các Task bên trong của một Project
     */
    async getListsByProject(req, res) {
        try {
            const { projectId } = req.params;

            // 1. Lấy tất cả các CỘT (List) thuộc project
            const lists = await List.find({ project_id: projectId }).sort({ position: 'asc' });

            if (!lists || lists.length === 0) {
                // Trả về mảng rỗng là đúng, không phải lỗi
                return res.status(200).json([]);
            }

            // 2. Lấy ID của tất cả các cột
            const listIds = lists.map((list) => list._id);

            // 3. Lấy tất cả các THẺ (Task) thuộc về CÁC cột đó (chỉ 1 lần gọi DB)
            const tasks = await Task.find({ list_id: { $in: listIds } })
                .sort({ position: 'asc' }) // Sắp xếp task theo vị trí
                .populate('assigned_to', 'name email'); // Lấy info người được gán

            // 4. Nhóm các task lại theo list_id để dễ tra cứu
            const tasksByListId = tasks.reduce((acc, task) => {
                const listIdStr = task.list_id.toString();
                if (!acc[listIdStr]) {
                    acc[listIdStr] = [];
                }
                acc[listIdStr].push(task);
                return acc;
            }, {});

            // 5. Gắn mảng tasks vào từng list tương ứng
            const populatedLists = lists.map((list) => {
                const listObject = list.toObject(); // Chuyển Mongoose doc thành object
                listObject.tasks = tasksByListId[listObject._id.toString()] || []; // Gán mảng tasks
                return listObject;
            });

            return res.status(200).json(populatedLists);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Lỗi server', error });
        }
    }

    /**
     * @route   POST /api/lists/:projectId
     * @desc    Tạo một List (cột) mới
     */
    async createList(req, res) {
        const { projectId } = req.params;
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'Vui lòng cung cấp title' });
        }

        try {
            // Lấy vị trí (position) cho list mới
            const listCount = await List.countDocuments({ project_id: projectId });

            const newList = new List({
                title,
                project_id: projectId, // Khớp với schema
                position: listCount, // Vị trí cuối cùng
            });

            await newList.save();

            // Trả về object list mới (với mảng tasks rỗng)
            // để frontend có thể render ngay lập tức
            const listObject = newList.toObject();
            listObject.tasks = [];

            return res.status(201).json(listObject);
        } catch (error) {
            return res.status(500).json({ message: 'Lỗi server', error });
        }
    }

    /**
     * @route   PUT /api/lists/:id
     * @desc    Cập nhật một List (ví dụ: đổi tên)
     */
    async updateList(req, res) {
        const { id } = req.params; // id của List
        const { title, position } = req.body;

        try {
            // Chỉ cập nhật các trường được gửi lên
            const updateData = {};
            if (title) updateData.title = title;
            if (position !== undefined) updateData.position = position;

            const updatedList = await List.findByIdAndUpdate(
                id,
                updateData,
                { new: true }, // Trả về document đã được cập nhật
            );

            if (!updatedList) {
                return res.status(404).json({ message: 'Không tìm thấy list' });
            }

            // Trả về list đã cập nhật (nhưng không cần tasks,
            // vì frontend thường chỉ cần cập nhật title)
            return res.status(200).json(updatedList);
        } catch (error) {
            return res.status(500).json({ message: 'Lỗi server', error });
        }
    }

    /**
     * @route   DELETE /api/lists/:id
     * @desc    Xóa một List (và tất cả Task bên trong nó)
     */
    async deleteList(req, res) {
        const { id } = req.params; // id này là List ID

        try {
            const list = await List.findById(id);
            if (!list) {
                return res.status(404).json({ message: 'Không tìm thấy list' });
            }

            // 1. Xóa tất cả các Task (thẻ) CÓ list_id là ID này
            // Đây là logic mới, đúng với schema của bạn
            await Task.deleteMany({ list_id: id });

            // 2. Xóa chính List đó
            await List.findByIdAndDelete(id);

            return res.status(200).json({ message: 'Xóa List thành công', _id: id });
        } catch (error) {
            return res.status(500).json({ message: 'Lỗi server', error });
        }
    }
}

module.exports = new ListController();
