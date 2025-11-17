const sgMail = require('@sendgrid/mail');

// 1. Đặt API key (lấy từ .env)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (options) => {
    // 2. Định nghĩa nội dung email
    const msg = {
        to: options.email,
        from: process.env.SENDGRID_FROM_EMAIL, // <-- Email bạn đã xác thực trên SendGrid
        subject: options.subject,
        text: options.message,
        // html: '<strong>Bạn có thể dùng HTML ở đây</strong>',
    };

    // 3. Gửi email
    try {
        await sgMail.send(msg);
        console.log(`Email đã gửi thành công đến ${options.email}`);
    } catch (error) {
        console.error('Lỗi khi gửi mail SendGrid:', error);

        // In ra lỗi chi tiết từ SendGrid (rất hữu ích)
        if (error.response) {
            console.error(error.response.body);
        }
        throw new Error('Lỗi máy chủ khi gửi email.');
    }
};

module.exports = sendEmail;
