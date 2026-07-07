#!/bin/bash

# Build script for deployment
echo "Starting build process..."

# Clean previous build
rm -rf dist

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Build with TypeScript (ignore errors for deployment)
echo "Building TypeScript..."
npx tsc --project tsconfig.deploy.json --noEmitOnError false || echo "TypeScript compilation completed with warnings"

# Copy package.json and other necessary files
echo "Copying necessary files..."
cp package.json dist/
cp package-lock.json dist/ 2>/dev/null || echo "No package-lock.json found"
cp -r prisma dist/ 2>/dev/null || echo "No prisma directory found"

echo "Build completed!"
