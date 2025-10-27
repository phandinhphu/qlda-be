# Unit Tests cho Controllers

## Cấu trúc thư mục

```
tests/
├── setup.js                          # Setup chung cho tất cả tests (MongoDB in-memory)
├── helpers/
│   ├── testHelpers.js               # Helper functions dùng chung
│   └── mockData.js                  # Mock data dùng chung
└── unit/
    ├── controllers/
    │   ├── README.md                # Hướng dẫn này
    │   ├── auth.test.js            # Tests cho Auth Controller
    │   ├── project.test.js         # TODO: Tests cho Project Controller
    │   ├── task.test.js            # TODO: Tests cho Task Controller
    │   └── chat.test.js            # TODO: Tests cho Chat Controller
    └── models/                      # TODO: Tests cho Models (nếu cần)
```

## Hướng dẫn viết test cho thành viên nhóm

### 1. Tạo file test mới

Mỗi controller nên có một file test riêng. Đặt tên file theo format: `<tên-controller>.test.js`

Ví dụ:
- `auth.test.js` - Tests cho AuthController
- `project.test.js` - Tests cho ProjectController
- `task.test.js` - Tests cho TaskController

### 2. Template cơ bản cho file test

```javascript
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');

// Import models cần thiết
const YourModel = require('../../../src/apis/models/YourModel');

// Import routes
const yourRoutes = require('../../../src/routes/your-route');

// Import helpers
const {
    createTestUser,
    createTestUserWithToken,
} = require('../../helpers/testHelpers');

// Setup Express app cho testing
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/your-route', yourRoutes);

describe('Your Controller Tests', () => {
    describe('GET /your-route/endpoint', () => {
        it('Nên làm gì đó khi điều kiện nào đó', async () => {
            // Arrange: Setup dữ liệu test
            const { user, token } = await createTestUserWithToken();

            // Act: Gọi API
            const response = await request(app)
                .get('/your-route/endpoint')
                .set('Cookie', [`token=${token}`])
                .expect(200);

            // Assert: Kiểm tra kết quả
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toBeTruthy();
        });
    });
});
```

### 3. Các helper functions có sẵn

File `tests/helpers/testHelpers.js` cung cấp:

- `createTestUser(userData)` - Tạo user mẫu trong database
- `generateTestToken(userId)` - Tạo JWT token cho user
- `createTestUserWithToken(userData)` - Tạo user và token cùng lúc
- `getCookieFromResponse(response, cookieName)` - Lấy cookie từ response

### 4. Sử dụng mock data

Thêm mock data của bạn vào `tests/helpers/mockData.js`:

```javascript
const mockProjects = {
    validProject: {
        name: 'Test Project',
        description: 'A test project',
        // ... các field khác
    },
};

module.exports = {
    // ... existing exports
    mockProjects,
};
```

### 5. Cấu trúc một test case tốt

Sử dụng pattern **AAA (Arrange-Act-Assert)**:

```javascript
it('Mô tả test case bằng tiếng Việt', async () => {
    // Arrange: Setup dữ liệu
    const testData = { ... };
    
    // Act: Thực hiện hành động
    const response = await request(app)
        .post('/api/endpoint')
        .send(testData)
        .expect(200);
    
    // Assert: Kiểm tra kết quả
    expect(response.body).toHaveProperty('message');
    expect(response.body.data).toBeTruthy();
});
```

### 6. Test các trường hợp (Test Cases)

Mỗi endpoint nên test:
- ✅ **Happy path**: Trường hợp thành công
- ❌ **Error cases**: Các trường hợp lỗi
  - Thiếu dữ liệu bắt buộc
  - Dữ liệu không hợp lệ
  - Không có quyền truy cập
  - Resource không tồn tại

### 7. Chạy tests

```bash
# Chạy tất cả tests
npm test

# Chạy tests với coverage report
npm run test:coverage

# Chạy tests cho một file cụ thể
npm test -- auth.test.js

# Chạy tests trong watch mode (tự động chạy lại khi có thay đổi)
npm test -- --watch
```

### 8. Best Practices

1. **Mô tả test case rõ ràng**: Dùng tiếng Việt để dễ hiểu
2. **Một test case test một điều**: Không test quá nhiều thứ trong một test
3. **Cleanup sau mỗi test**: `setup.js` đã tự động cleanup, không cần lo
4. **Sử dụng helpers**: Tái sử dụng code qua helpers thay vì copy-paste
5. **Mock external services**: Không gọi API thật, database thật (trừ MongoDB in-memory)
6. **Test cả success và error cases**: Đảm bảo code xử lý lỗi đúng

### 9. Ví dụ test cho endpoint có authentication

```javascript
describe('POST /projects', () => {
    it('Nên tạo project thành công khi đã đăng nhập', async () => {
        const { user, token } = await createTestUserWithToken();
        
        const projectData = {
            name: 'New Project',
            description: 'Test description',
        };

        const response = await request(app)
            .post('/projects')
            .set('Cookie', [`token=${token}`])
            .send(projectData)
            .expect(201);

        expect(response.body).toHaveProperty('project');
        expect(response.body.project.name).toBe(projectData.name);
    });

    it('Nên trả về lỗi 401 khi chưa đăng nhập', async () => {
        const projectData = {
            name: 'New Project',
            description: 'Test description',
        };

        const response = await request(app)
            .post('/projects')
            .send(projectData)
            .expect(401);

        expect(response.body).toHaveProperty('message');
    });
});
```

### 10. Câu hỏi thường gặp

**Q: Database test có ảnh hưởng đến database thật không?**
A: Không, chúng ta dùng MongoDB in-memory server, hoàn toàn độc lập.

**Q: Tôi có cần tự xóa dữ liệu test không?**
A: Không, `setup.js` đã tự động cleanup sau mỗi test.

**Q: Làm sao để test route cần authentication?**
A: Dùng `createTestUserWithToken()` để tạo user và token, rồi set cookie trong request.

**Q: Test chạy chậm, làm sao tăng tốc?**
A: Giảm số lượng `beforeEach`/`afterEach` không cần thiết, sử dụng `beforeAll` khi có thể.

## Liên hệ

Nếu có vấn đề hoặc câu hỏi về testing, liên hệ người viết Auth tests để được hỗ trợ.
