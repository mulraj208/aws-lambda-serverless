const AWS = require('aws-sdk');
const mime = require('mime-types');
const url = require('url');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BUCKET_NAME = 'api-gateway-s3-pwa-kit';
const CLOUDFRONT_URL = 'https://d1vwohv18012h9.cloudfront.net/';

const getFileFromBuildFolder = async (s3Key) => {

};

exports.get = async (event) => {
    const s3 = new AWS.S3();
    const pathname = url.parse(event.path).pathname;
    const s3Key = pathname.substring(1); // Remove leading slash
    const cloudfrontFileUrl = `${CLOUDFRONT_URL}${s3Key}`;

    const projectRoot = process.cwd();
    const fileName = s3Key.split('/').pop();
    const fullPath = path.join(projectRoot, 'build', fileName);

    // Check if the file exists
    if (!fs.existsSync(fullPath)) {
        return {
            statusCode: 404,
            body: `File not found. ${fullPath} ${projectRoot} ${s3Key}`,
        };
    }

    try {
        const file = fs.readFileSync(fullPath);
        const contentType = mime.lookup(fullPath) || 'application/octet-stream';

        return {
            statusCode: 200,
            headers: { 'Content-Type': contentType },
            body: file.toString('utf-8'),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: 'Error reading file',
        };
    }

    return
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
                body: JSON.stringify({ message: `File not found in both CloudFront and S3. Path: ${pathname}` }),
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
