const cloudinary = require('../config/cloudinary');

const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const isImage = file.mimetype.startsWith('image/');
        const resourceType = isImage ? 'image' : 'raw';

        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'uploads',
                resource_type: resourceType,
                public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            },
        );

        stream.end(file.buffer);
    });
};

const buildViewUrl = (result) => {
    // Trả về URL để xem file (cả image và document)
    return result.secure_url;
};

module.exports = { uploadToCloudinary, buildViewUrl };
