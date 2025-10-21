const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const routes = require('./routes');
const { FRONTEND_URL, PORT } = require('./util/constants');
const mongoose = require('mongoose');

const app = express();
const port = PORT || 5000;

app.use(
    cors({
        credentials: true,
        origin: FRONTEND_URL || 'http://localhost:3000',
    }),
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(
    helmet({
        crossOriginResourcePolicy: false,
    }),
);

// Routes init
app.use('/api', routes);

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});

let isShuttingDown = false; // Cờ kiểm soát shutdown

const gracefulShutdown = async () => {
    if (isShuttingDown) return; // Nếu đã bắt đầu shutdown, không xử lý lại
    isShuttingDown = true; // Đặt cờ để ngăn việc gọi lại

    console.log('\nGracefully shutting down...');
    try {
        // Đóng kết nối MongoDB
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');

        // Thoát ứng dụng
        process.exit(0); // Thoát ứng dụng với mã thành công
    } catch (err) {
        process.exit(1);
    }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
