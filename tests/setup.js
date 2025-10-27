const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Setup trước khi chạy tất cả tests
beforeAll(async () => {
    // Tạo MongoDB in-memory server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Kết nối đến MongoDB in-memory
    await mongoose.connect(mongoUri);
});

// Cleanup sau mỗi test
afterEach(async () => {
    // Xóa tất cả collections sau mỗi test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
});

// Cleanup sau khi chạy tất cả tests
afterAll(async () => {
    // Đóng kết nối MongoDB
    await mongoose.disconnect();
    
    // Dừng MongoDB in-memory server
    if (mongoServer) {
        await mongoServer.stop();
    }
});
