import { Request, Response } from 'express';
// Use shared Prisma instance
const { prisma } = require('../config/database');

export const saveProjectData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const projectData = req.body;

    // Normalize incoming payload from frontend into schema fields
    const normalizedData: any = {
      title: projectData?.details?.title ?? projectData?.title ?? 'Untitled Project',
      description: projectData?.details?.description ?? projectData?.description ?? null,
      bookType: projectData?.type ?? projectData?.bookType ?? null,
      targetPages: Array.isArray(projectData?.specs?.targetPages)
        ? projectData.specs.targetPages[0]
        : projectData?.targetPages ?? null,
      targetChapters: Array.isArray(projectData?.specs?.targetChapters)
        ? projectData.specs.targetChapters[0]
        : projectData?.targetChapters ?? null,
      format: (projectData?.specs?.format ?? projectData?.format ?? 'PDF').toString().toUpperCase(),
      rssFeed: projectData?.content?.rssFeed ?? projectData?.rssFeed ?? null,
      textContent: projectData?.content?.textContent ?? projectData?.textContent ?? null,
      authorName: projectData?.details?.author ?? projectData?.authorName ?? null,
      targetAudience: projectData?.details?.audience ?? projectData?.targetAudience ?? null,
    };

    // Find existing project or create a new one
    let result;
    if (projectData.id) {
      // Ensure project belongs to user, then update by unique id
      if (!projectData.id || typeof projectData.id !== 'string') {
        return res.status(400).json({ success: false, error: 'Invalid project id' });
      }
      const existing = await prisma.project.findFirst({
        where: { id: projectData.id, userId },
      });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      result = await prisma.project.update({
        where: { id: projectData.id as string },
        data: normalizedData,
      });
    } else {
      // Create new project with deduplication check
      // Check if a similar project was created recently (within last 5 minutes)
      const recentProject = await prisma.project.findFirst({
        where: {
          userId,
          title: normalizedData.title,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (recentProject) {
        console.log('Duplicate project creation prevented, returning existing project:', recentProject.id);
        result = recentProject;
      } else {
        result = await prisma.project.create({
          data: {
            ...normalizedData,
            userId,
            status: 'DRAFT'
          }
        });
      }
    }

    res.json({
      success: true,
      data: result,
      message: 'Project data saved successfully'
    });
  } catch (error: any) {
    // Improve server-side diagnostics while keeping client message stable
    console.error('Error saving project data:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    res.status(500).json({ success: false, error: 'Failed to save project data' });
  }
};

export const getProjectData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { 
        id: projectId,
        userId 
      }
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    // Fetch uploads associated with this project
    const uploads = await prisma.upload.findMany({
      where: {
        projectId: projectId
      }
    });

    // Convert BigInt size to number for JSON serialization
    const uploadsWithSerializedSize = uploads.map((upload: any) => ({
      ...upload,
      size: Number(upload.size)
    }));

    res.json({
      success: true,
      data: {
        ...project,
        uploads: uploadsWithSerializedSize
      }
    });
  } catch (error) {
    console.error('Error fetching project data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project data'
    });
  }
};

export const completeProjectSetup = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;
    const projectData = req.body;

    // Ensure ownership first
    const existing = await prisma.project.findFirst({
      where: { id: projectId as string, userId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const result = await prisma.project.update({
      where: { id: projectId as string },
      data: {
        // Accept minimal updates from body if provided (e.g., title/description)
        title: projectData?.title ?? existing.title,
        description: projectData?.description ?? existing.description,
        // Mark project as completed and set processingCompletedAt
        status: projectData?.status ?? 'COMPLETED',
        estimatedCost: projectData?.estimatedCost ?? existing.estimatedCost,
        processingStartedAt: projectData?.processingStartedAt ?? existing.processingStartedAt,
        processingCompletedAt: new Date(),
      }
    });

    res.json({
      success: true,
      data: result,
      message: 'Project setup completed successfully'
    });
  } catch (error) {
    console.error('Error completing project setup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete project setup'
    });
  }
};

export const listUserProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ success: false, error: 'Failed to list projects' });
  }
};

export default {
  saveProjectData,
  getProjectData,
  completeProjectSetup,
  listUserProjects
};
