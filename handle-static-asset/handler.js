const AWS = require('aws-sdk');
const mime = require('mime-types');
const url = require('url');

const BUCKET_NAME = 'api-gateway-s3-pwa-kit'

exports.handler = async (event) => {
    try {
        const s3 = new AWS.S3();
        const path = url.parse(event.path).pathname;
        const s3Key = path.substring(1); // Remove leading slash

        await s3.headObject({ Bucket: BUCKET_NAME, Key: s3Key }).promise();
        const file = await s3.getObject({ Bucket: BUCKET_NAME, Key: s3Key }).promise();
        const contentType = mime.lookup(s3Key) || 'application/octet-stream'; // Determine MIME type

        return {
            statusCode: 200,
            headers: { 'Content-Type': contentType },
            body: file.Body.toString('utf-8'),
        };
    } catch (err) {
        const path = url.parse(event.path).pathname;

        return {
            statusCode: 404,
            body: JSON.stringify({ message: `File not found. path: ${path}` })
        };
    }
};
