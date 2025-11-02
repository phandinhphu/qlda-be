# QLDA Backend API

Backend API cho hệ thống Quản Lý Dự Án (Project Management System) được xây dựng với Node.js và Express.

## 📋 Mục Lục

- [Cấu Trúc Dự Án](#cấu-trúc-dự-án)
- [Luồng Chạy Thực Tế](#luồng-chạy-thực-tế)
- [Cài Đặt](#cài-đặt)
- [Cấu Hình](#cấu-hình)
- [Chạy Ứng Dụng](#chạy-ứng-dụng)
- [API Endpoints](#api-endpoints)
- [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)
- [Testing](#testing)

## ⚠️ Migration Script

Nếu bạn đã có dữ liệu Project trong database từ trước, bạn cần chạy migration script để tạo ProjectMember records cho các project cũ:

```bash
node migrate-project-members.js
```

Script này sẽ:
- Tìm tất cả các projects trong database
- Kiểm tra xem ProjectMember đã tồn tại chưa
- Tạo ProjectMember với role 'owner' cho project creator nếu chưa có
- Hiển thị kết quả: số lượng tạo mới, đã tồn tại, và lỗi (nếu có)

**Lưu ý:** Các project mới tạo sau khi thêm tính năng auto-create ProjectMember sẽ tự động có ProjectMember record khi được tạo.

## 📁 Cấu Trúc Dự Án
qlda-be/
├── src/
│ ├── index.js # Entry point - Khởi tạo Express app và server
│ ├── apis/ # Business logic layer
│ │ ├── controllers/ # Controllers xử lý request/response
│ │ │ ├── AuthController.js
│ │ │ ├── ProjectController.js
│ │ │ └── index.js
│ │ └── models/ # Mongoose models (Database schemas)
│ │ ├── User.js
│ │ ├── Project.js
│ │ ├── ProjectMember.js
│ │ ├── List.js
│ │ ├── Task.js
│ │ ├── TaskStep.js
│ │ ├── TaskLabel.js
│ │ ├── TaskComment.js
│ │ ├── TaskFile.js
│ │ ├── ChatRoom.js
│ │ ├── ChatRoomMember.js
│ │ ├── ChatMessage.js
│ │ ├── Notification.js
│ │ └── index.js
│ ├── config/ # Configuration files
│ │ ├── db.js # MongoDB connection setup
│ │ └── passport.js # Passport.js authentication strategies
│ ├── middleware/ # Custom middleware
│ │ └── auth.js # JWT authentication middleware
│ ├── routes/ # Route definitions
│ │ ├── index.js # Main router - tập hợp tất cả routes
│ │ ├── auth.js # Authentication routes
│ │ └── project.js # Project routes
│ └── util/ # Utility files
│ └── constants.js # Environment variables và constants
├── tests/ # Test files
│ ├── helpers/ # Test helper functions
│ ├── setup.js # Test environment setup
│ └── unit/ # Unit tests
│ └── controllers/
├── jest.config.js # Jest testing configuration
├── migrate-project-members.js # Migration script for existing projects
├── package.json # Dependencies và scripts
└── README.md # Documentation

### Mô Tả Các Thư Mục

- **`src/index.js`**: File khởi động chính, thiết lập Express app, middleware, routes và kết nối database
- **`src/apis/controllers/`**: Chứa các controller xử lý logic nghiệp vụ và trả về response
- **`src/apis/models/`**: Định nghĩa các Mongoose schema cho MongoDB collections
- **`src/config/`**: Cấu hình database connection và authentication strategies
- **`src/middleware/`**: Custom middleware (JWT authentication, validation, etc.)
- **`src/routes/`**: Định nghĩa các API endpoints và ánh xạ đến controllers
- **`src/util/`**: Utility functions và constants


