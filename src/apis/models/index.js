// chứa model của các collection trong database

const User = require('./User');
const Project = require('./Project');
const ProjectMember = require('./ProjectMember');
const List = require('./List');
const Task = require('./Task');
const TaskStep = require('./TaskStep');
const TaskLabel = require('./TaskLabel');
const TaskComment = require('./TaskComment');
const TaskFile = require('./TaskFile');
const ChatRoom = require('./ChatRoom');
const ChatRoomMember = require('./ChatRoomMember');
const ChatMessage = require('./ChatMessage');
const Notification = require('./Notification');

module.exports = {
    User,
    Project,
    ProjectMember,
    List,
    Task,
    TaskStep,
    TaskLabel,
    TaskComment,
    TaskFile,
    ChatRoom,
    ChatRoomMember,
    ChatMessage,
    Notification,
};
