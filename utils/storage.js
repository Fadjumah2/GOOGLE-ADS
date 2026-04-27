import { Storage } from '@google-cloud/storage';
import logger from './logger.js';

/**
 * Simple GCS persistence layer for Synapse settings and data.
 */
class GcsStorage {
    constructor() {
        this.bucketName = process.env.GCS_BUCKET_NAME;
        this.storage = new Storage();
        this.isConfigured = !!this.bucketName;

        if (!this.isConfigured) {
            logger.warn('GCS_BUCKET_NAME not set. Storage will operate in-memory only (non-persistent).');
        }
    }

    async save(filename, data) {
        if (!this.isConfigured) {
            logger.warn(`Storage not configured. Cannot save ${filename} persistently.`);
            return false;
        }
        try {
            const bucket = this.storage.bucket(this.bucketName);
            const file = bucket.file(filename);
            await file.save(JSON.stringify(data, null, 2), {
                contentType: 'application/json',
                resumable: false
            });
            logger.info(`GCS: Saved ${filename} successfully.`);
            return true;
        } catch (error) {
            logger.error(`GCS Save Failed (${filename}): ${error.message}`);
            return false;
        }
    }

    async load(filename) {
        if (!this.isConfigured) {
            logger.warn(`Storage not configured. Cannot load ${filename} persistently.`);
            return null;
        }
        try {
            const bucket = this.storage.bucket(this.bucketName);
            const file = bucket.file(filename);
            const [exists] = await file.exists();
            if (!exists) {
                logger.info(`GCS: File ${filename} does not exist yet.`);
                return null;
            }

            const [content] = await file.download();
            logger.info(`GCS: Loaded ${filename} successfully.`);
            return JSON.parse(content.toString());
        } catch (error) {
            logger.error(`GCS Load Failed (${filename}): ${error.message}`);
            return null;
        }
    }
}

export default new GcsStorage();
