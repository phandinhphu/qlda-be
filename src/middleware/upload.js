const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', '..', '..', 'uploads');

// Tạo thư mục nếu chưa tồn tại
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

//
// 2) Hàm tạo tên file không trùng
//
function generateUniqueFilename(originalName) {
    const ext = path.extname(originalName); // .png
    const base = path.basename(originalName, ext); // avatar
    let filename = originalName;
    let counter = 1;

    // Nếu file đã tồn tại → thêm [1], [2], ...
    while (fs.existsSync(path.join(uploadDir, filename))) {
        filename = `${base}[${counter}]${ext}`;
        counter++;
    }

    return filename;
}

//
// 3) Cấu hình multer
//
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const safeName = generateUniqueFilename(file.originalname);
        cb(null, safeName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // max 10MB
});

module.exports = upload;
