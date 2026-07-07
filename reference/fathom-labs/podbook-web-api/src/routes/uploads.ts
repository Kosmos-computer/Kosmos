// @ts-nocheck
const { Router } = require('express');
const { prisma } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

const router = Router();

// CORS is handled by the main app configuration

// Bulk-create uploads from selected RSS episodes
// Body: { projectId: string, userId: string, episodes: Array<{ id: string, title: string, link?: string, duration?: string, pubDate?: string }> }
router.post('/rss', authMiddleware, async (req, res) => {
  try {
    const { projectId, episodes } = req.body || {};
    const userId = (req.user && req.user.id) || null;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!projectId || !Array.isArray(episodes) || episodes.length === 0) {
      return res.status(400).json({ error: 'projectId and episodes are required' });
    }

    const created = await prisma.upload.createMany({
      data: episodes.map((ep) => ({
        filename: ep.title || 'RSS Episode',
        url: ep.link || ep.id,
        size: ep.duration ? BigInt(ep.duration) : BigInt(0),
        contentType: 'audio/mpeg',
        source: 'RSS',
        status: 'UPLOADED',
        projectId,
        userId,
      })),
      skipDuplicates: true,
    });

    return res.status(201).json({ count: created.count });
  } catch (error) {
    console.error('Failed to save RSS uploads:', error);
    return res.status(500).json({ error: 'Failed to save uploads' });
  }
});

// Presign upload URL for direct-to-R2 uploads
router.post('/presign', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { filename, contentType, projectId } = req.body || {};
    if (!filename || !contentType || !projectId) {
      return res.status(400).json({ error: 'filename, contentType, projectId are required' });
    }

    const bucket = process.env.R2_BUCKET;
    const endpoint = process.env.R2_ENDPOINT; // e.g., https://<accountid>.r2.cloudflarestorage.com
    const region = 'auto';
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const publicBase = process.env.R2_PUBLIC_BASE; // e.g., https://pub-xxxx.r2.dev

    if (!bucket || !endpoint || !accessKeyId || !secretAccessKey || !publicBase) {
      return res.status(500).json({ error: 'R2 configuration missing on server' });
    }

    const key = `${userId}/${projectId}/${Date.now()}-${uuidv4()}-${filename}`;

    const s3 = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });

    // Generate presigned PUT URL (for upload)
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });

    // Permanent public URL (for serving later)
    const fileUrl = `${publicBase}/${key}`;

    return res.json({
      uploadUrl: presignedUrl, // <-- only use for PUT
      fileUrl,                 // <-- save this, use for GETs
      key,
    });
  } catch (error) {
    console.error('Failed to presign R2 upload URL:', error);
    return res.status(500).json({ error: 'Failed to create presigned URL' });
  }
});

// Save uploaded files (different from RSS episodes)
router.post('/files', authMiddleware, async (req, res) => {
  try {
    const { projectId, files } = req.body || {};
    const userId = (req.user && req.user.id) || null;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!projectId || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'projectId and files are required' });
    }

    console.log('Saving uploaded files:', files);
    const created = await prisma.upload.createMany({
      data: files.map((file) => ({
        filename: file.filename || 'Uploaded File',
        url: file.url || '',
        size: BigInt(file.size || 0),
        contentType: file.contentType || 'application/octet-stream',
        source: 'UPLOAD',
        status: 'UPLOADED',
        projectId,
        userId,
      })),
      skipDuplicates: true,
    });

    return res.status(201).json({ count: created.count });
  } catch (error) {
    console.error('Failed to save uploaded files:', error);
    return res.status(500).json({ error: 'Failed to save uploads' });
  }
});

module.exports = router;
  


