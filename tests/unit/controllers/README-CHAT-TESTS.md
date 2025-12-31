# Unit Tests cho Chat Feature

## Mô tả

Unit tests cho các tính năng chat realtime bao gồm:
- **ChatController**: Các API endpoints cho chat
- **Socket.IO**: Các tính năng realtime như gửi tin nhắn, typing indicator, join/leave room

## Cài đặt

Trước khi chạy tests, cần cài đặt package `socket.io-client`:

```bash
npm install --save-dev socket.io-client
```

## Chạy Tests

### Chạy tất cả tests
```bash
npm test
```

### Chạy test cho ChatController
```bash
npm test chat.test.js
```

### Chạy test cho Socket.IO
```bash
npm test socket.test.js
```

### Chạy tests với coverage
```bash
npm run test:coverage
```

### Chạy tests ở chế độ watch
```bash
npm run test:watch
```

## Cấu trúc Tests

### ChatController Tests (`tests/unit/controllers/chat.test.js`)

#### 1. GET /api/chat/rooms/project/:projectId
- ✅ Lấy danh sách phòng chat của project
- ✅ Trả về mảng rỗng khi user không thuộc phòng nào
- ✅ Lỗi 404 khi project không tồn tại
- ✅ Hiển thị last_message cho mỗi room
- ✅ Hiển thị other_member cho direct chat

#### 2. GET /api/chat/rooms/:roomId/messages
- ✅ Lấy danh sách tin nhắn trong phòng chat
- ✅ Pagination cho tin nhắn
- ✅ Lỗi 403 khi user không có quyền truy cập
- ✅ Populate sender_id cho mỗi message

#### 3. POST /api/chat/rooms/:roomId/messages
- ✅ Gửi tin nhắn thành công
- ✅ Trim nội dung tin nhắn
- ✅ Lỗi 400 khi tin nhắn trống
- ✅ Lỗi 400 khi tin nhắn chỉ có khoảng trắng
- ✅ Lỗi 403 khi user không có quyền

#### 4. GET /api/chat/rooms/:roomId
- ✅ Lấy thông tin chi tiết phòng chat
- ✅ Populate project_id
- ✅ Lỗi 403 khi không có quyền
- ✅ Lỗi 404 khi room không tồn tại

#### 5. POST /api/chat/rooms/direct
- ✅ Tạo phòng chat trực tiếp thành công
- ✅ Trả về phòng đã tồn tại
- ✅ Lỗi 400 khi thiếu thông tin
- ✅ Lỗi 400 khi tạo phòng với chính mình
- ✅ Lỗi 404 khi project/user không tồn tại

#### 6. GET /api/chat/rooms/:roomId/members
- ✅ Lấy danh sách thành viên
- ✅ Lỗi 403 khi không có quyền

#### 7. DELETE /api/chat/messages/:messageId
- ✅ Xóa tin nhắn thành công
- ✅ Lỗi 403 khi không phải người gửi
- ✅ Lỗi 404 khi message không tồn tại

#### 8. GET /api/chat/rooms/user
- ✅ Lấy tất cả phòng chat của user
- ✅ Sắp xếp theo thời gian tin nhắn
- ✅ Trả về last_message và other_member
- ✅ Populate project_id

#### 9. Helper Methods
- ✅ createGroupChatRoom
- ✅ addMemberToGroupRoom
- ✅ createDirectChatRoom

### Socket.IO Tests (`tests/unit/socket/socket.test.js`)

#### 1. Socket Authentication
- ✅ Kết nối thành công với token hợp lệ
- ✅ Bị từ chối khi không có token
- ✅ Bị từ chối với token không hợp lệ
- ✅ Join vào personal room sau khi connect

#### 2. Join Room
- ✅ Join room thành công khi có quyền
- ✅ Lỗi khi không có quyền
- ✅ Set currentRoomId sau khi join

#### 3. Leave Room
- ✅ Leave room thành công

#### 4. Send Message
- ✅ Gửi tin nhắn và nhận ở client khác
- ✅ Lưu tin nhắn vào database
- ✅ Lỗi khi tin nhắn trống
- ✅ Lỗi khi tin nhắn chỉ có khoảng trắng
- ✅ Lỗi khi không có quyền
- ✅ Trim nội dung tin nhắn
- ✅ Populate sender_id
- ✅ Gửi notification cho user offline

#### 5. Typing Indicator
- ✅ Broadcast typing indicator
- ✅ Gửi isTyping false khi ngừng typing
- ✅ Không nhận typing indicator của chính mình

#### 6. Disconnect
- ✅ Log disconnect
- ✅ Không nhận messages sau khi disconnect

#### 7. Multiple Rooms
- ✅ Chỉ nhận tin nhắn từ room đã join

#### 8. Error Handling
- ✅ Xử lý lỗi database
- ✅ Xử lý lỗi khi room không tồn tại

## Mock Data và Helpers

### Mock Data (`tests/helpers/mockData.js`)
- `createTestProject()`: Tạo project mẫu
- `createTestChatRoom()`: Tạo chat room mẫu
- `createTestChatMessage()`: Tạo chat message mẫu

### Test Helpers (`tests/helpers/testHelpers.js`)
- `createTestUser()`: Tạo user mẫu
- `createTestUserWithToken()`: Tạo user và JWT token
- `generateTestToken()`: Tạo JWT token

## Lưu ý

1. **MongoDB Memory Server**: Tests sử dụng MongoDB in-memory để không ảnh hưởng đến database thật
2. **Cleanup**: Sau mỗi test, tất cả collections sẽ được xóa để đảm bảo tests độc lập
3. **Async/Await**: Tất cả tests đều sử dụng async/await để xử lý bất đồng bộ
4. **Socket.IO Client**: Cần cài đặt `socket.io-client` để test các tính năng realtime

## Coverage Report

Để xem chi tiết coverage report sau khi chạy tests:

```bash
npm run test:coverage
```

Report sẽ được tạo trong thư mục `coverage/`

## Troubleshooting

### Lỗi: Cannot find module 'socket.io-client'
```bash
npm install --save-dev socket.io-client
```

### Lỗi: Jest timeout
Tăng timeout trong jest.config.js:
```javascript
module.exports = {
  testTimeout: 30000, // 30 seconds
};
```

### Lỗi: Port already in use
Socket tests tạo HTTP server trên port ngẫu nhiên, nếu gặp lỗi hãy thử chạy lại test.

## Tác giả

Được tạo bởi team QLDA
