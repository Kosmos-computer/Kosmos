-- Add authorName and targetAudience columns to projects table
ALTER TABLE "projects" ADD COLUMN "authorName" TEXT;
ALTER TABLE "projects" ADD COLUMN "targetAudience" TEXT;
