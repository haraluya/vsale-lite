const { Storage } = require('@google-cloud/storage');
const fs = require('fs');

const credentials = JSON.parse(process.env.GCS_CREDENTIALS || '{}');
const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: credentials
});

const bucketName = process.env.GCS_BUCKET_NAME;
const filename = 'vsale-backup-20260109-080442.sql.gz';

async function download() {
  const bucket = storage.bucket(bucketName);
  await bucket.file(filename).download({ destination: './downloaded-backup.sql.gz' });
  console.log('✅ 備份已下載:', filename);
}

download().catch(console.error);
