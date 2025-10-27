# Hướng dẫn Unit Testing cho QLDA Backend

## 📚 Tổng quan

Dự án sử dụng **Jest** và **Supertest** để viết unit tests cho các API endpoints. Tất cả tests được tổ chức trong thư mục `tests/` với cấu trúc rõ ràng để dễ quản lý và mở rộng.

## 🗂️ Cấu trúc thư mục

```
tests/
├── setup.js                          # Cấu hình chung cho tất cả tests
│                                     # - Setup MongoDB in-memory
│                                     # - Cleanup sau mỗi test
│
├── helpers/
│   ├── testHelpers.js               # Các helper functions dùng chung
│   │                                 # - createTestUser()
│   │                                 # - generateTestToken()
│   │                                 # - createTestUserWithToken()
│   │                                 # - getCookieFromResponse()
│   │
│   └── mockData.js                  # Mock data cho testing
│                                     # - mockUsers
│                                     # - mockProjects (TODO)
│                                     # - mockTasks (TODO)
│                                     # - mockChats (TODO)
│
└── unit/
    └── controllers/
        ├── README.md                # Hướng dẫn chi tiết viết test
        ├── auth.test.js            # ✅ Tests cho Auth API
        ├── project.test.js         # 📝 TODO: Tests cho Project API
        ├── task.test.js            # 📝 TODO: Tests cho Task API
        └── chat.test.js            # 📝 TODO: Tests cho Chat API
```

## 🚀 Bắt đầu

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Chạy tests

```bash
# Chạy tất cả tests
npm test

# Chạy tests với coverage report
npm run test:coverage

# Chạy tests trong watch mode (tự động chạy lại khi có thay đổi)
npm run test:watch

# Chạy tests cho một file cụ thể
npm test -- auth.test.js
```

## ✍️ Viết test mới

### Bước 1: Tạo file test

Tạo file mới trong `tests/unit/controllers/` với tên `<feature>.test.js`

### Bước 2: Sử dụng template

```javascript
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');

// Import models, routes, helpers
const YourModel = require('../../../src/apis/models/YourModel');
const yourRoutes = require('../../../src/routes/your-route');
const {
    createTestUserWithToken,
} = require('../../helpers/testHelpers');

// Setup Express app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/your-route', yourRoutes);

describe('Your Feature Tests', () => {
    describe('GET /your-route/endpoint', () => {
        it('Nên thành công khi có dữ liệu hợp lệ', async () => {
            // Arrange
            const { user, token } = await createTestUserWithToken();

            // Act
            const response = await request(app)
                .get('/your-route/endpoint')
                .set('Cookie', [`token=${token}`])
                .expect(200);

            // Assert
            expect(response.body).toHaveProperty('data');
        });
    });
});
```

### Bước 3: Test các trường hợp

Mỗi endpoint nên test:
- ✅ Happy path (thành công)
- ❌ Error cases (lỗi validation, unauthorized, not found, etc.)

## 🛠️ Helper Functions

### createTestUser(userData)
Tạo user mẫu trong database

```javascript
const user = await createTestUser({
    name: 'Test User',
    email: 'test@example.com',
});
```

### generateTestToken(userId)
Tạo JWT token cho user

```javascript
const token = generateTestToken(user._id);
```

### createTestUserWithToken(userData)
Tạo user và token cùng lúc (tiện nhất!)

```javascript
const { user, token } = await createTestUserWithToken({
    name: 'Test User',
    email: 'test@example.com',
});
```

### getCookieFromResponse(response, cookieName)
Lấy cookie từ response

```javascript
const token = getCookieFromResponse(response, 'token');
```

## 📊 Test Coverage

Kiểm tra test coverage để đảm bảo code được test đầy đủ:

```bash
npm run test:coverage
```

Report sẽ được tạo trong thư mục `coverage/`. Mở `coverage/lcov-report/index.html` để xem chi tiết.

## ✅ Best Practices

1. **Mô tả test rõ ràng**: Dùng tiếng Việt, mô tả chính xác test case
2. **AAA Pattern**: Arrange (setup) → Act (thực hiện) → Assert (kiểm tra)
3. **Một test, một mục đích**: Không test quá nhiều thứ trong một test case
4. **Sử dụng helpers**: Tái sử dụng code, không copy-paste
5. **Test cả success và error**: Đảm bảo xử lý lỗi đúng
6. **Cleanup tự động**: Không lo về cleanup, `setup.js` đã xử lý

## 🎯 Ví dụ: Test endpoint cần authentication

```javascript
describe('POST /projects', () => {
    it('Nên tạo project thành công khi đã đăng nhập', async () => {
        // Arrange
        const { user, token } = await createTestUserWithToken();
        const projectData = {
            name: 'New Project',
            description: 'Test description',
        };

        // Act
        const response = await request(app)
            .post('/projects')
            .set('Cookie', [`token=${token}`])
            .send(projectData)
            .expect(201);

        // Assert
        expect(response.body.project.name).toBe(projectData.name);
    });

    it('Nên trả về lỗi 401 khi chưa đăng nhập', async () => {
        // Arrange
        const projectData = { name: 'New Project' };

        // Act & Assert
        const response = await request(app)
            .post('/projects')
            .send(projectData)
            .expect(401);
    });
});
```

## ❓ FAQ

### Q: Database test có ảnh hưởng đến database thật không?
**A:** Không! Chúng ta dùng MongoDB in-memory server, hoàn toàn độc lập với database thật.

### Q: Tôi có cần tự xóa dữ liệu test không?
**A:** Không cần! File `setup.js` tự động xóa tất cả dữ liệu sau mỗi test.

### Q: Làm sao test route cần authentication?
**A:** Dùng `createTestUserWithToken()` để tạo user và token, rồi set cookie trong request:
```javascript
const { token } = await createTestUserWithToken();
await request(app)
    .get('/protected-route')
    .set('Cookie', [`token=${token}`])
    .expect(200);
```

### Q: Test chạy chậm, làm thế nào?
**A:** 
- Giảm số lượng `beforeEach`/`afterEach` không cần thiết
- Dùng `beforeAll` thay vì `beforeEach` khi có thể
- Chỉ test những gì cần thiết

### Q: Làm sao add mock data cho feature của tôi?
**A:** Thêm vào file `tests/helpers/mockData.js`:
```javascript
const mockYourFeature = {
    validData: { /* ... */ },
    invalidData: { /* ... */ },
};

module.exports = {
    // ... existing exports
    mockYourFeature,
};
```

## 📝 TODO cho team

- [ ] Viết tests cho Project API
- [ ] Viết tests cho Task API  
- [ ] Viết tests cho Chat API
- [ ] Viết tests cho Notification API
- [ ] Tăng test coverage lên 80%+

## 🤝 Đóng góp

Mỗi thành viên nhóm chịu trách nhiệm viết tests cho feature của mình:

1. Tạo file test mới trong `tests/unit/controllers/`
2. Viết tests theo template và best practices
3. Chạy `npm test` để đảm bảo tests pass
4. Chạy `npm run test:coverage` để check coverage
5. Commit và push code

## 📞 Hỗ trợ

Nếu gặp vấn đề về testing, tham khảo:
- `tests/unit/controllers/README.md` - Hướng dẫn chi tiết
- `tests/unit/controllers/auth.test.js` - Ví dụ hoàn chỉnh
- Hoặc hỏi người viết Auth tests

Happy Testing! 🎉
