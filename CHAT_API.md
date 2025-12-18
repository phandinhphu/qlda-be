# Chat API Documentation

## Base URL
```
http://localhost:5000/api/chat
```

Tất cả các endpoints yêu cầu authentication token trong cookie hoặc header.

---

## Endpoints

### 1. Lấy tất cả phòng chat của user

**GET** `/rooms/user`

Lấy tất cả phòng chat mà user hiện tại tham gia.

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "_id": "room_id",
            "project_id": {
                "_id": "project_id",
                "project_name": "Project Name"
            },
            "name": "Room Name",
            "type": "group" | "direct",
            "last_message": {
                "_id": "message_id",
                "message": "Last message content",
                "sender_id": {
                    "name": "Sender Name",
                    "avatar_url": "url"
                },
                "created_at": "2025-12-01T..."
            },
            "unread_count": 0,
            "other_member": {  // Chỉ có nếu type = "direct"
                "_id": "user_id",
                "name": "User Name",
                "avatar_url": "url"
            }
        }
    ],
    "message": "Lấy danh sách phòng chat thành công"
}
```

---

### 2. Lấy phòng chat theo project

**GET** `/rooms/project/:projectId`

Lấy tất cả phòng chat trong một project mà user tham gia.

**Response:** Tương tự endpoint `/rooms/user`

---

### 3. Lấy chi tiết phòng chat

**GET** `/rooms/:roomId`

**Response:**
```json
{
    "success": true,
    "data": {
        "_id": "room_id",
        "project_id": {
            "_id": "project_id",
            "project_name": "Project Name"
        },
        "name": "Room Name",
        "type": "group" | "direct",
        "members": [
            {
                "_id": "user_id",
                "name": "User Name",
                "email": "user@example.com",
                "avatar_url": "url"
            }
        ]
    },
    "message": "Lấy thông tin phòng chat thành công"
}
```

---

### 4. Lấy danh sách thành viên phòng chat

**GET** `/rooms/:roomId/members`

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "_id": "user_id",
            "name": "User Name",
            "email": "user@example.com",
            "avatar_url": "url"
        }
    ],
    "message": "Lấy danh sách thành viên thành công"
}
```

---

### 5. Lấy tin nhắn trong phòng chat

**GET** `/rooms/:roomId/messages?page=1&limit=50`

**Query Parameters:**
- `page` (optional): Trang hiện tại, mặc định là 1
- `limit` (optional): Số tin nhắn mỗi trang, mặc định là 50

**Response:**
```json
{
    "success": true,
    "data": {
        "messages": [
            {
                "_id": "message_id",
                "room_id": "room_id",
                "sender_id": {
                    "_id": "user_id",
                    "name": "User Name",
                    "email": "user@example.com",
                    "avatar_url": "url"
                },
                "message": "Message content",
                "created_at": "2025-12-01T...",
                "updated_at": "2025-12-01T..."
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 50,
            "total": 100,
            "totalPages": 2
        }
    },
    "message": "Lấy danh sách tin nhắn thành công"
}
```

---

### 6. Gửi tin nhắn (HTTP)

**POST** `/rooms/:roomId/messages`

**Body:**
```json
{
    "message": "Hello world!"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "_id": "message_id",
        "room_id": "room_id",
        "sender_id": {
            "_id": "user_id",
            "name": "User Name",
            "email": "user@example.com",
            "avatar_url": "url"
        },
        "message": "Hello world!",
        "created_at": "2025-12-01T...",
        "updated_at": "2025-12-01T..."
    },
    "message": "Gửi tin nhắn thành công"
}
```

**Note:** Nên sử dụng Socket.IO để gửi tin nhắn realtime thay vì HTTP endpoint này.

---

### 7. Tạo hoặc lấy phòng chat trực tiếp

**POST** `/rooms/direct`

Tạo phòng chat 1-1 giữa user hiện tại và một user khác. Nếu phòng đã tồn tại, trả về phòng đó.

**Body:**
```json
{
    "projectId": "project_id",
    "targetUserId": "target_user_id"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "_id": "room_id",
        "project_id": {
            "_id": "project_id",
            "project_name": "Project Name"
        },
        "name": "User A & User B",
        "type": "direct",
        "created_at": "2025-12-01T...",
        "updated_at": "2025-12-01T..."
    },
    "message": "Tạo phòng chat thành công" | "Phòng chat đã tồn tại"
}
```

---

### 8. Xóa tin nhắn

**DELETE** `/messages/:messageId`

Chỉ cho phép người gửi xóa tin nhắn của mình.

**Response:**
```json
{
    "success": true,
    "message": "Xóa tin nhắn thành công"
}
```

---

## Error Responses

Tất cả các endpoints có thể trả về các lỗi sau:

### 400 Bad Request
```json
{
    "success": false,
    "message": "Nội dung tin nhắn là bắt buộc"
}
```

### 401 Unauthorized
```json
{
    "success": false,
    "message": "Không xác thực. Vui lòng đăng nhập lại"
}
```

### 403 Forbidden
```json
{
    "success": false,
    "message": "Bạn không có quyền truy cập phòng chat này"
}
```

### 404 Not Found
```json
{
    "success": false,
    "message": "Không tìm thấy phòng chat"
}
```

### 500 Internal Server Error
```json
{
    "success": false,
    "message": "Có lỗi xảy ra khi xử lý yêu cầu"
}
```

---

## Flow tạo project và chat

### 1. Khi tạo project mới
- Backend tự động tạo group chat room cho project
- Backend tự động thêm owner vào group chat
- Owner có thể vào `/api/chat/rooms/project/:projectId` để xem phòng chat

### 2. Khi thêm member vào project
- Backend tự động thêm member vào group chat room
- Backend tự động tạo phòng chat trực tiếp giữa owner và member mới
- Cả owner và member đều có thể thấy 2 phòng chat mới này

### 3. Khi cần chat với một member khác
- Gọi API `POST /api/chat/rooms/direct` với `targetUserId`
- Backend sẽ tạo phòng chat nếu chưa tồn tại, hoặc trả về phòng đã có
