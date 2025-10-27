/**
 * File chứa dữ liệu mẫu cho testing
 * Tất cả thành viên nhóm có thể thêm mock data của mình vào đây
 */

// Mock data cho Auth
const mockUsers = {
    validUser: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'Password@123',
    },
    invalidEmail: {
        name: 'Jane Doe',
        email: 'invalid-email',
        password: 'Password@123',
    },
    shortPassword: {
        name: 'Bob Smith',
        email: 'bob@example.com',
        password: '123',
    },
};

// Mock data cho Project (thành viên khác có thể thêm vào)
const mockProjects = {
    // TODO: Thêm mock data cho projects
};

// Mock data cho Task (thành viên khác có thể thêm vào)
const mockTasks = {
    // TODO: Thêm mock data cho tasks
};

// Mock data cho Chat (thành viên khác có thể thêm vào)
const mockChats = {
    // TODO: Thêm mock data cho chats
};

module.exports = {
    mockUsers,
    mockProjects,
    mockTasks,
    mockChats,
};
