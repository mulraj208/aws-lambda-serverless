const AWS = require('aws-sdk');
const url = require('url');

const BUCKET_NAME = 'api-gateway-s3-pwa-kit'

exports.handler = async (event) => {
    try {
        const s3 = new AWS.S3();
        const path = url.parse(event.path).pathname;
        const s3Key = path.substring(1); // Remove leading slash

        await s3.headObject({ Bucket: BUCKET_NAME, Key: s3Key }).promise();
        const objectUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;

        return {
            statusCode: 302,
            headers: {
                Location: objectUrl
            }
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'File not found' })
        };
    }
};
