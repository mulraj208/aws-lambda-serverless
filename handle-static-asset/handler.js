const AWS = require('aws-sdk');
const mime = require('mime-types');
const url = require('url');
const https = require('https');

const BUCKET_NAME = 'api-gateway-s3-pwa-kit';
const CLOUDFRONT_URL = 'https://d1vwohv18012h9.cloudfront.net/';

exports.get = async (event) => {
    const s3 = new AWS.S3();
    const path = url.parse(event.path).pathname;
    const s3Key = path.substring(1); // Remove leading slash
    const cloudfrontFileUrl = `${CLOUDFRONT_URL}${s3Key}`;

    // Try to get the file from CloudFront
    try {
        const file = await getFromCloudFront(cloudfrontFileUrl);
        const contentType = mime.lookup(s3Key) || 'application/octet-stream';

        return {
            statusCode: 200,
            headers: { 'Content-Type': contentType },
            body: file,
        };
    } catch (cloudfrontError) {
        console.log(`CloudFront Error: ${cloudfrontError.message}`);

        // If CloudFront fails, fallback to S3
        try {
            await s3.headObject({ Bucket: BUCKET_NAME, Key: s3Key }).promise();
            const file = await s3.getObject({ Bucket: BUCKET_NAME, Key: s3Key }).promise();
            const contentType = mime.lookup(s3Key) || 'application/octet-stream';

            return {
                statusCode: 200,
                headers: { 'Content-Type': contentType },
                body: file.Body.toString('utf-8'),
            };
        } catch (s3Error) {
            console.log(`S3 Error: ${s3Error.message}`);

            return {
                statusCode: 404,
                body: JSON.stringify({ message: `File not found in both CloudFront and S3. Path: ${path}` }),
            };
        }
    }
};

// Helper function to get the file from CloudFront
const getFromCloudFront = (cloudfrontFileUrl) => {
    return new Promise((resolve, reject) => {
        https.get(cloudfrontFileUrl, (res) => {
            if (res.statusCode === 200) {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            } else {
                reject(new Error(`CloudFront request failed with status code ${res.statusCode}`));
            }
        }).on('error', (err) => {
            reject(err);
        });
    });
};
