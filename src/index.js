const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const routes = require('./routes');
const { FRONTEND_URL, PORT } = require('./util/constants');

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

// Xử lý tắt server và đóng kết nối
const gracefulShutdown = async () => {
    console.log('\n⏳ Gracefully shutting down...');
    try {
        // Nếu có kết nối cơ sở dữ liệu, đóng nó ở đây
    } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
    }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
