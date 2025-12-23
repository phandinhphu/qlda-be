/**
 * TEST SUITE: DuyToan.test.js
 * 
 * Kiểm thử tích hợp cho:
 * 1. ListController (Create, Get, Update, Delete, Reorder, Member Access)
 * 2. ProjectController (Search, GetProjectsUserJoined)
 * 3. TaskController (UpdateDueDate, UpdateReminderDate)
 * 4. UserController (getUserStats)
 * Log output: backend/test_DuyToan.txt
 */

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Models
const List = require('../../../src/apis/models/List');
const Project = require('../../../src/apis/models/Project');
const ProjectMember = require('../../../src/apis/models/ProjectMember');
const User = require('../../../src/apis/models/User');
const Task = require('../../../src/apis/models/Task');

// Routes
const listRoutes = require('../../../src/routes/listRoutes');
const projectRoutes = require('../../../src/routes/projectRoutes');
const taskRoutes = require('../../../src/routes/taskRoutes');
const userRoutes = require('../../../src/routes/userRoutes');

// Constants & Helpers
const { JWT_SECRET } = require('../../../src/util/constants');
const { createTestUserWithToken } = require('../../helpers/testHelpers');

// Logger setup
const LOG_FILE = path.join(__dirname, '../../../test_DuyToan.txt');

// Test Counter
let testCount = 0;

const logToFile = (msg) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
};

// Initialize log file
fs.writeFileSync(LOG_FILE, '=== START COMBINED DUYTOAN TEST RUN ===\n');

// Setup Express app
const app = express();
app.use(express.json());
app.use(cookieParser());

// Mock Auth Middleware
app.use(async (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.id);
            if (user) req.user = user;
        } catch (err) {
            // Ignore
        }
    }
    next();
});

// Mount Routes
app.use('/lists', listRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes); // Mount task routes
app.use('/api/users', userRoutes); // Mount user routes

describe('DuyToan.test.js - Project & List Controller Tests', () => {
    // Shared Variables
    let userOwner, tokenOwner;
    let userMember, tokenMember;
    let userOutsider, tokenOutsider;
    let project1; // For List tests

    // For Project Search/Join tests
    let user1, token1;
    let user2, token2;
    let projectA, projectB;

    beforeAll(() => {
        logToFile('INFO: Initializing Test Suite...');
    });

    afterAll(() => {
        logToFile('=== END COMBINED DUYTOAN TEST RUN ===');
        logToFile(`SUMMARY: Tổng testcase thực hiện: ${testCount}`);
        console.log(`Tổng testcase thực hiện: ${testCount}`);
    });

    beforeEach(async () => {
        try {
            // --- SETUP FOR LIST CONTROLLER TESTS ---
            // 1. Owner
            const authOwner = await createTestUserWithToken({ name: 'Owner', email: 'owner@example.com' });
            userOwner = authOwner.user;
            tokenOwner = authOwner.token;

            // 2. Member
            const authMember = await createTestUserWithToken({ name: 'Member', email: 'member@example.com' });
            userMember = authMember.user;
            tokenMember = authMember.token;

            // 3. Outsider
            const authOutsider = await createTestUserWithToken({ name: 'Outsider', email: 'outsider@example.com' });
            userOutsider = authOutsider.user;
            tokenOutsider = authOutsider.token;

            // Create Project 1 (Owned by Owner, Member is Member)
            project1 = await Project.create({ project_name: 'Test Project', created_by: userOwner._id });
            await ProjectMember.create({ project_id: project1._id, user_id: userMember._id, role: 'member' });

            // --- SETUP FOR PROJECT CONTROLLER TESTS ---
            // Create separate users to avoid confusion, or reuse. let's create separate for safety as per original file.
            const auth1 = await createTestUserWithToken({ name: 'User 1', email: 'u1@test.com' });
            user1 = auth1.user;
            token1 = auth1.token;

            const auth2 = await createTestUserWithToken({ name: 'User 2', email: 'u2@test.com' });
            user2 = auth2.user;
            token2 = auth2.token;

            // User 1 creates Project A and B
            projectA = await Project.create({ project_name: 'Alpha Project', created_by: user1._id });
            await ProjectMember.create({ project_id: projectA._id, user_id: user1._id, role: 'owner' });

            projectB = await Project.create({ project_name: 'Beta Project', created_by: user1._id });
            await ProjectMember.create({ project_id: projectB._id, user_id: user1._id, role: 'owner' });

            // User 2 joins Project A
            await ProjectMember.create({ project_id: projectA._id, user_id: user2._id, role: 'member' });

        } catch (error) {
            logToFile(`SETUP FAILED: ${error.message}`);
            throw error;
        }
    });

    // ==========================================
    // SECTION 1: LIST CONTROLLER TESTS
    // ==========================================
    describe('SECTION 1: LIST CONTROLLER TESTS', () => {
        describe('POST /lists/:projectId (Create List)', () => {
            const funcName = 'createList';

            it('Nên tạo List thành công khi là OWNER', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Owner Create List ---`);
                try {
                    const response = await request(app)
                        .post(`/lists/${project1._id}`)
                        .set('Cookie', [`token=${tokenOwner}`])
                        .send({ name: 'Owner List' })
                        .expect(201);

                    expect(response.body.success).toBe(true);
                    expect(response.body.data.title).toBe('Owner List');
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });

            it('Nên tạo List thành công khi là MEMBER (checkProjectMember)', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Member Create List (Access Check) ---`);
                try {
                    const response = await request(app)
                        .post(`/lists/${project1._id}`)
                        .set('Cookie', [`token=${tokenMember}`])
                        .send({ name: 'Member List' })
                        .expect(201);

                    expect(response.body.success).toBe(true);
                    expect(response.body.data.title).toBe('Member List');
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });

            it('Nên lỗi 403 khi là OUTSIDER', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Outsider Create List (Forbidden) ---`);
                try {
                    await request(app)
                        .post(`/lists/${project1._id}`)
                        .set('Cookie', [`token=${tokenOutsider}`])
                        .send({ name: 'Hacker List' })
                        .expect(403);
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });
        });

        describe('GET /lists/:projectId (Get Lists)', () => {
            const funcName = 'getListsByProject';

            it('Nên lấy danh sách List thành công (MEMBER Access)', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Member Get Lists ---`);
                try {
                    await List.create({ title: 'L1', project_id: project1._id });
                    const response = await request(app)
                        .get(`/lists/${project1._id}`)
                        .set('Cookie', [`token=${tokenMember}`])
                        .expect(200);

                    expect(response.body.data).toHaveLength(1);
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });

            it('Nên trả về 400 nếu ProjectId không hợp lệ', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Invalid ProjectId ---`);
                try {
                    const response = await request(app)
                        .get('/lists/invalid-id')
                        .set('Cookie', [`token=${tokenOwner}`])
                        .expect(400);

                    expect(response.body.message).toContain('không hợp lệ');
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });

            it('Nên trả về 404 nếu Project không tồn tại', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Project Not Found ---`);
                try {
                    const randomId = new mongoose.Types.ObjectId();
                    const response = await request(app)
                        .get(`/lists/${randomId}`)
                        .set('Cookie', [`token=${tokenOwner}`])
                        .expect(404);

                    expect(response.body.message).toContain('Không tìm thấy dự án');
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });
        });

        describe('PUT /lists/:listId (Update List)', () => {
            const funcName = 'updateList';

            it('Nên cập nhật thành công (MEMBER Access)', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Member Update List ---`);
                try {
                    const list = await List.create({ title: 'Old', project_id: project1._id });
                    const response = await request(app)
                        .put(`/lists/${list._id}`)
                        .set('Cookie', [`token=${tokenMember}`])
                        .send({ title: 'New' })
                        .expect(200);

                    expect(response.body.data.title).toBe('New');
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });

            it('Nên trả về 404 nếu List không tồn tại', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] List Not Found ---`);
                try {
                    const randomId = new mongoose.Types.ObjectId();
                    await request(app)
                        .put(`/lists/${randomId}`)
                        .set('Cookie', [`token=${tokenOwner}`])
                        .send({ title: 'New' })
                        .expect(404);
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });

            it('Nên trả về 400 nếu Title rỗng', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Empty Title ---`);
                try {
                    const list = await List.create({ title: 'Valid', project_id: project1._id });
                    await request(app)
                        .put(`/lists/${list._id}`)
                        .set('Cookie', [`token=${tokenOwner}`])
                        .send({ title: '' })
                        .expect(400);
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });
        });

        describe('DELETE /lists/:listId', () => {
            const funcName = 'deleteList';
            it('Nên xóa OK (OWNER)', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Owner Delete ---`);
                try {
                    const list = await List.create({ title: 'Del', project_id: project1._id });
                    await request(app)
                        .delete(`/lists/${list._id}`)
                        .set('Cookie', [`token=${tokenOwner}`])
                        .expect(200);
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });
        });

        describe('PUT /lists/reorder', () => {
            const funcName = 'reorderLists';
            it('Update OK', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Reorder OK ---`);
                try {
                    const l1 = await List.create({ title: 'A', project_id: project1._id, position: 0 });
                    const l2 = await List.create({ title: 'B', project_id: project1._id, position: 1 });
                    await request(app)
                        .put('/lists/reorder')
                        .set('Cookie', [`token=${tokenOwner}`])
                        .send({ orderedListIds: [l2._id, l1._id] })
                        .expect(200);
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });
        });
    });

    // ==========================================
    // SECTION 2: PROJECT CONTROLLER TESTS
    // ==========================================
    describe('SECTION 2: PROJECT CONTROLLER TESTS', () => {
        describe('GET /api/projects/search (searchProjectsByName)', () => {
            const funcName = 'searchProjectsByName';

            it('Nên tìm thấy dự án theo tên (User 1 find Alpha)', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Find 'Alpha' by Creator ---`);
                try {
                    const response = await request(app)
                        .get('/api/projects/search?name=Alpha')
                        .set('Cookie', [`token=${token1}`])
                        .expect(200);

                    expect(response.body.success).toBe(true);
                    expect(response.body.data).toHaveLength(1);
                    expect(response.body.data[0].project_name).toBe('Alpha Project');
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });

            it('Nên tìm thấy nhiều dự án nếu từ khóa khớp (User 1 find Project)', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Find 'Project' (Multiple) ---`);
                try {
                    const response = await request(app)
                        .get('/api/projects/search?name=Project')
                        .set('Cookie', [`token=${token1}`])
                        .expect(200);

                    // Should find Alpha and Beta (both created by User 1)
                    expect(response.body.success).toBe(true);
                    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });

            it('Không tìm thấy dự án không thuộc về mình (User 2 find Beta)', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] User 2 finds Beta (Created by User 1, Not Member? Wait, search only finds created_by?) ---`);
                // NOTE: searchProjectsByName logic: created_by: userId (line 44 in ProjectController)
                // It ONLY finds projects created by the current user. NOT projects they are members of.
                // verifying: const condition = { created_by: userId, ... }

                try {
                    const response = await request(app)
                        .get('/api/projects/search?name=Beta')
                        .set('Cookie', [`token=${token2}`]) // User 2 did NOT create Beta
                        .expect(200);

                    expect(response.body.data).toHaveLength(0);
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });

            it('Trả về rỗng nếu không có từ khóa khớp', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] No Match ---`);
                try {
                    const response = await request(app)
                        .get('/api/projects/search?name=Gamma')
                        .set('Cookie', [`token=${token1}`])
                        .expect(200);

                    expect(response.body.data).toHaveLength(0);
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });
        });

        describe('GET /api/projects/projectsUserJoined (getProjectsUserJoined)', () => {
            const funcName = 'getProjectsUserJoined';

            it('Nên lấy danh sách dự án user đã tham gia (User 2 joins Project A)', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] User 2 joined Project A ---`);
                try {
                    const response = await request(app)
                        .get('/api/projects/projectsUserJoined')
                        .set('Cookie', [`token=${token2}`])
                        .expect(200);

                    // User 2 joined Project A only (Project B is created by User 1 but U2 not member)
                    expect(Array.isArray(response.body)).toBe(true);
                    expect(response.body).toHaveLength(1);
                    expect(response.body[0].project_name).toBe('Alpha Project');
                    expect(response.body[0]).toHaveProperty('percentage'); // Should have stats
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });

            it('User 1 cũng là member của dự án mình tạo (Owner role)', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] User 1 sees own projects ---`);
                try {
                    const response = await request(app)
                        .get('/api/projects/projectsUserJoined')
                        .set('Cookie', [`token=${token1}`])
                        .expect(200);

                    // User 1 created A and B and is added as 'owner' in ProjectMember
                    expect(response.body.length).toBeGreaterThanOrEqual(2);
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });

            it('Tính toán phần trăm (percentage) chính xác', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Stats Calculation ---`);
                try {
                    // Setup: Add tasks to Project A assigned to User 2
                    // 1. Create List in Project A
                    const list = await List.create({ title: 'List A', project_id: projectA._id });

                    // 2. Create Task 1 (Done) assigned to User 2
                    await Task.create({
                        title: 'Task Done',
                        list_id: list._id,
                        project_id: projectA._id,
                        assigned_to: [user2._id],
                        status: 'done'
                    });

                    // 3. Create Task 2 (Todo) assigned to User 2
                    await Task.create({
                        title: 'Task Todo',
                        list_id: list._id,
                        project_id: projectA._id,
                        assigned_to: [user2._id],
                        status: 'todo'
                    });

                    const response = await request(app)
                        .get('/api/projects/projectsUserJoined')
                        .set('Cookie', [`token=${token2}`])
                        .expect(200);

                    const projectStats = response.body.find(p => p.project_id === projectA._id.toString());
                    expect(projectStats).toBeTruthy();
                    expect(projectStats.totalTasks).toBe(2);
                    expect(projectStats.doneTasks).toBe(1);
                    expect(projectStats.percentage).toBe(50); // 1/2 = 50%

                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });
        });
    });

    // ==========================================
    // SECTION 3: TASK CONTROLLER TESTS
    // ==========================================
    describe('SECTION 3: TASK CONTROLLER TESTS', () => {
        let task1;

        beforeEach(async () => {
            // Setup: Create a task for testing dates
            // Need a list first (project1 created in main beforeEach)
            const list = await List.create({ title: 'Task List', project_id: project1._id });
            task1 = await Task.create({
                title: 'Date Test Task',
                list_id: list._id,
                project_id: project1._id,
                assigned_to: [userOwner._id]
            });
        });

        describe('PATCH /api/tasks/:taskId/due-date', () => {
            const funcName = 'updateDueDate';

            it('Nên cập nhật ngày hết hạn thành công', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Set Due Date ---`);
                try {
                    const newDueDate = new Date('2025-12-31').toISOString();
                    const response = await request(app)
                        .patch(`/api/tasks/${task1._id}/due-date`)
                        .set('Cookie', [`token=${tokenOwner}`])
                        .send({ due_date: newDueDate })
                        .expect(200);

                    expect(response.body.success).toBe(true);
                    expect(response.body.data.due_date).toBe(newDueDate);

                    // Verify DB
                    const updatedTask = await Task.findById(task1._id);
                    expect(updatedTask.due_date.toISOString()).toBe(newDueDate);

                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });

            it('Nên trả về 404 nếu task không tồn tại', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Task Not Found ---`);
                try {
                    const randomId = new mongoose.Types.ObjectId();
                    await request(app)
                        .patch(`/api/tasks/${randomId}/due-date`)
                        .set('Cookie', [`token=${tokenOwner}`])
                        .send({ due_date: new Date() })
                        .expect(404);
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });
        });

        describe('PATCH /api/tasks/:taskId/reminder-date', () => {
            const funcName = 'updateReminderDate';

            it('Nên cập nhật ngày nhắc nhở thành công', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Set Reminder Date ---`);
                try {
                    const newReminderDate = new Date('2025-12-30').toISOString();
                    const response = await request(app)
                        .patch(`/api/tasks/${task1._id}/reminder-date`)
                        .set('Cookie', [`token=${tokenOwner}`])
                        .send({ reminder_date: newReminderDate })
                        .expect(200);

                    expect(response.body.success).toBe(true);
                    expect(response.body.data.reminder_date).toBe(newReminderDate);
                    // Check logic: reminded_users should be cleared
                    expect(response.body.data.reminded_users).toHaveLength(0);

                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });

            it('Nên trả về 404 nếu task không tồn tại', async () => {
                testCount++;
                logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Task Not Found ---`);
                try {
                    const randomId = new mongoose.Types.ObjectId();
                    await request(app)
                        .patch(`/api/tasks/${randomId}/reminder-date`)
                        .set('Cookie', [`token=${tokenOwner}`])
                        .send({ reminder_date: new Date() })
                        .expect(404);
                    logToFile('RESULT: PASS');
                } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
            });
        });
    });

    // ==========================================
    // SECTION 4: USER CONTROLLER TESTS
    // ==========================================
    describe('SECTION 4: USER CONTROLLER TESTS', () => {
        const funcName = 'getUserStats';

        it('Nên lấy thống kê user thành công (Total, Todo, Percentage)', async () => {
            testCount++;
            logToFile(`\n--- TEST CASE ${testCount}: [${funcName}] Get User Stats ---`);
            try {
                // Setup: Ensure User Owner has tasks
                // In previous tests (Task section), we created 'task1' assigned to userOwner
                // task1 (Date Test Task) is created in Section 3 beforeEach.
                // However, tests run sequentially? No, beforeEach runs before EACH test.
                // Section 3 beforeEach creates a task. But Section 4 is outside Section 3.
                // So I need to create tasks here for User Owner.

                // 1. Create List for User Owner (using project1 from main setup)
                const list = await List.create({ title: 'Stat List', project_id: project1._id });

                // 2. Create 1 Done task
                await Task.create({
                    title: 'Task Done',
                    list_id: list._id,
                    project_id: project1._id,
                    assigned_to: [userOwner._id],
                    status: 'done'
                });

                // 3. Create 3 Todo tasks
                await Task.create({ title: 'Task 1', list_id: list._id, project_id: project1._id, assigned_to: [userOwner._id], status: 'todo' });
                await Task.create({ title: 'Task 2', list_id: list._id, project_id: project1._id, assigned_to: [userOwner._id], status: 'todo' });
                await Task.create({ title: 'Task 3', list_id: list._id, project_id: project1._id, assigned_to: [userOwner._id], status: 'todo' });

                // Total: 4. Todo: 3. Percentage: (1 - 3/4)*100 = 25%

                const response = await request(app)
                    .get('/api/users/me/stats')
                    .set('Cookie', [`token=${tokenOwner}`])
                    .expect(200);

                expect(response.body.totalTasks).toBe(4);
                expect(response.body.todoTasks).toBe(3);
                expect(response.body.percentage).toBe(25);

                logToFile('RESULT: PASS');
            } catch (err) { logToFile(`RESULT: FAIL - ${err.message}`); throw err; }
        });
    });
});
