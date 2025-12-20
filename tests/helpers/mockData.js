/**
 * File chứa dữ liệu mẫu cho testing
 * Tất cả thành viên nhóm có thể thêm mock data của mình vào đây
 */

const Project = require('../../src/apis/models/Project');
const ChatRoom = require('../../src/apis/models/ChatRoom');
const ChatMessage = require('../../src/apis/models/ChatMessage');

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
    groupChat: {
        name: 'Test Group Chat',
        type: 'group',
    },
    directChat: {
        name: 'Test Direct Chat',
        type: 'direct',
    },
    message: {
        message: 'This is a test message',
    },
};

/**
 * Tạo project mẫu cho testing
 * @param {Object} projectData - Dữ liệu project tùy chỉnh
 * @returns {Promise<Object>} Project đã được tạo
 */
const createTestProject = async (projectData = {}) => {
    const defaultProject = {
        project_name: 'Test Project',
        description: 'Test project description',
        created_by: projectData.project_manager || projectData.created_by,
    };

    const project = new Project({ ...defaultProject, ...projectData });
    await project.save();
    return project;
};

/**
 * Tạo chat room mẫu cho testing
 * @param {Object} roomData - Dữ liệu room tùy chỉnh
 * @returns {Promise<Object>} ChatRoom đã được tạo
 */
const createTestChatRoom = async (roomData = {}) => {
    const defaultRoom = {
        name: 'Test Chat Room',
        type: 'group',
    };

    const room = new ChatRoom({ ...defaultRoom, ...roomData });
    await room.save();
    return room;
};

/**
 * Tạo chat message mẫu cho testing
 * @param {Object} messageData - Dữ liệu message tùy chỉnh
 * @returns {Promise<Object>} ChatMessage đã được tạo
 */
const createTestChatMessage = async (messageData = {}) => {
    const defaultMessage = {
        message: 'Test message',
    };

    const message = new ChatMessage({ ...defaultMessage, ...messageData });
    await message.save();
    return message;
};

module.exports = {
    mockUsers,
    mockProjects,
    mockTasks,
    mockChats,
    createTestProject,
    createTestChatRoom,
    createTestChatMessage,
};
