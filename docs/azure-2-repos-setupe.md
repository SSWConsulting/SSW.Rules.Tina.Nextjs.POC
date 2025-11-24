# TinaCMS Two-Repo Setup Guide - Azure Portal

## Introduction

This guide covers the essentials for setting up a **two-repository architecture** with TinaCMS in local and Azure Portal

- **Repository 1 (Website)**: Next.js application with TinaCMS configuration
- **Repository 2 (Content)**: Markdown/MDX content and media files

### Connection Mechanism

**Local**: Uses `LOCAL_CONTENT_PATH` environment variable to point to content repo  
**Azure**: GitHub Actions checks out both repos, embeds content in Docker image

---

## Azure Deployment Setup

### Prerequisites

- Azure account with active subscription
- Access to Azure Portal ([portal.azure.com](https://portal.azure.com))
- GitHub account with repository access

### Step 1: Create Resource Group

1. **Navigate to Azure Portal**: https://portal.azure.com
2. **Search for "Resource groups"** in the top search bar
3. **Click "+ Create"**
4. **Fill in the details:**
   - **Subscription**: Select your subscription
   - **Resource group name**: `my-website-rg`
   - **Region**: `East US` (or your preferred region)
5. **Click "Review + create"**
6. **Click "Create"**

---

### Step 2: Create Azure Container Registry (ACR)

1. **Search for "Container registries"** in the top search bar
2. **Click "+ Create"**
3. **Fill in the Basics tab:**
   - **Subscription**: Select your subscription
   - **Resource group**: Select `my-website-rg`
   - **Registry name**: `mywebsiteacr` (must be globally unique)
   - **Location**: Same as resource group (e.g., `East US`)
   - **SKU**: `Basic` (for development) or `Standard` (for production)
4. **Click "Review + create"**
5. **Click "Create"**
6. **Wait for deployment** to complete (~1-2 minutes)

**After creation:**
1. **Navigate to the Container Registry** you just created
2. **Go to "Settings" → "Access keys"** in the left menu
3. **Enable "Admin user"** toggle
4. **Copy the following values** (you'll need them later):
   - **Login server**: `mywebsiteacr.azurecr.io`
   - **Username**: `mywebsiteacr`
   - **Password**: (copy one of the passwords shown)

---

### Step 3: Create App Service Plan

1. **Search for "App Service plans"** in the top search bar
2. **Click "+ Create"**
3. **Fill in the Basics tab:**
   - **Subscription**: Select your subscription
   - **Resource group**: Select `my-website-rg`
   - **Name**: `my-website-plan`
   - **Operating System**: `Linux`
   - **Region**: Same as resource group (e.g., `East US`)
4. **Pricing tier:**
   - **Click "Explore pricing plans"**
   - **Select "Basic B1"** (for development)
   - Or **"Standard S1"** (for production)
   - **Click "Select"**
5. **Click "Review + create"**
6. **Click "Create"**
---

### Step 4: Create Web App for Containers

1. **Search for "App Services"** in the top search bar
2. **Click "+ Create"**
3. **Fill in the Basics tab:**
   - **Subscription**: Select your subscription
   - **Resource group**: Select `my-website-rg`
   - **Name**: `my-website-app` (this will be your URL: my-website-app.azurewebsites.net)
   - **Publish**: `Container`
   - **Operating System**: `Linux`
   - **Region**: Same as resource group (e.g., `East US`)
   - **App Service Plan**: Select `my-website-plan`

4. **Go to "Container" tab:**
   - **Image Source**: `Azure Container Registry`
   - **Registry**: Select `mywebsiteacr`
   - **Image**: Leave as `nginx` for now (we'll update after first build)
   - **Tag**: `latest`

5. **Click "Review + create"**
6. **Click "Create"**
7. **Wait for deployment** to complete (~2-3 minutes)

![Web App Container](https://learn.microsoft.com/en-us/azure/app-service/media/quickstart-custom-container/configure-custom-container-vs.png)

---

### Step 5: Create Service Principal for GitHub Actions

1. **Click on the Cloud Shell icon** (>_) in the top right of Azure Portal
2. **Select "Bash"** when prompted
3. **Run the following command** to create a service principal:

```bash
az ad sp create-for-rbac \
  --name "my-website-github-actions" \
  --role contributor \
  --scopes /subscriptions/{YOUR_SUBSCRIPTION_ID}/resourceGroups/my-website-rg \
  --sdk-auth
```

**To find your Subscription ID:**
- Search for "Subscriptions" in Azure Portal
- Copy the Subscription ID

4. **Copy the entire JSON output** - you'll need it for GitHub secrets:

```json
{
  "clientId": "xxx-xxx-xxx",
  "clientSecret": "xxx-xxx-xxx",
  "subscriptionId": "xxx-xxx-xxx",
  "tenantId": "xxx-xxx-xxx",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  ...
}
```

**Important values to save:**
- `clientId` → Will be `AZURE_CLIENT_ID`
- `clientSecret` → Will be `AZURE_CLIENT_SECRET`
- `subscriptionId` → Will be `AZURE_SUBSCRIPTION_ID`
- `tenantId` → Will be `AZURE_TENANT_ID`

---

### Step 6: Configure GitHub Repository Secrets

1. **Navigate to your website repository on GitHub**
2. **Go to "Settings" → "Secrets and variables" → "Actions"**
3. **Click "New repository secret"** for each of the following:

**Azure Secrets:**

| Secret Name | Value | Where to Find |
|------------|-------|---------------|
| `AZURE_CLIENT_ID` | From service principal output | `clientId` field |
| `AZURE_CLIENT_SECRET` | From service principal output | `clientSecret` field |
| `AZURE_SUBSCRIPTION_ID` | From service principal output | `subscriptionId` field |
| `AZURE_TENANT_ID` | From service principal output | `tenantId` field |
| `AZURE_REGISTRY_NAME` | `mywebsiteacr` | ACR name without .azurecr.io |
| `AZURE_WEBAPP_NAME` | `my-website-app` | Web App name |
| `AZURE_RESOURCE_GROUP` | `my-website-rg` | Resource group name |

**Content Repository Access:**

| Secret Name | Value | Where to Find |
|------------|-------|---------------|
| `CONTENT_REPO_TOKEN` | GitHub Personal Access Token | See instructions below |

#### How to create GitHub Personal Access Token:

1. **Go to GitHub Settings** → [Developer settings](https://github.com/settings/tokens) → Personal access tokens → Tokens (classic)
2. **Click "Generate new token (classic)"**
3. **Configure the token:**
   - **Note**: `Content Repository Access for CI/CD`
   - **Expiration**: `90 days` (or your preference)
   - **Select scopes**:
     - ✅ `repo` (Full control of private repositories)
4. **Click "Generate token"**
5. **Copy the token immediately** (you won't see it again)
6. **Add to GitHub secrets** as `CONTENT_REPO_TOKEN`

**TinaCMS Secrets:**

| Secret Name | Value | Where to Find |
|------------|-------|---------------|
| `TINA_TOKEN` | TinaCMS token | tina.io dashboard |
| `NEXT_PUBLIC_TINA_CLIENT_ID` | TinaCMS client ID | tina.io dashboard |

---

### Step 7: Create GitHub Actions Workflow

1. **In your website repository**, create the following file structure:

```
my-website/
└── .github/
    └── workflows/
        └── deploy-azure.yml
```

2. **Create/Edit `.github/workflows/deploy-azure.yml`** with the following content:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      content_branch:
        description: 'Content branch to deploy'
        required: false
        default: 'main'
        type: string

env:
  REGISTRY_NAME: ${{ secrets.AZURE_REGISTRY_NAME }}
  IMAGE_NAME: my-website
  WEBAPP_NAME: ${{ secrets.AZURE_WEBAPP_NAME }}
  RESOURCE_GROUP: ${{ secrets.AZURE_RESOURCE_GROUP }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      # ==========================================
      # 1. CHECKOUT REPOSITORIES
      # ==========================================
      - name: Checkout website repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Checkout content repository
        uses: actions/checkout@v4
        with:
          repository: your-org/my-content  # ⚠️ UPDATE THIS
          ref: ${{ github.event.inputs.content_branch || 'main' }}
          token: ${{ secrets.CONTENT_REPO_TOKEN }}
          path: content-temp
          fetch-depth: 0

      # ==========================================
      # 2. SETUP NODE.JS
      # ==========================================
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install content dependencies (if needed)
        run: |
          cd content-temp
          if [ -f package.json ]; then
            npm install
          fi

      # ==========================================
      # 3. PROCESS CONTENT
      # ==========================================
      - name: Process content
        run: |
          echo "📦 Processing content..."

          # If any, run content generation scripts
          cd content-temp
          if [ -f package.json ] && grep -q "generate-index" package.json; then
            npm run generate-index
          fi
          cd ..

          # Copy generated files to website root
          if [ -f content-temp/content-index.json ]; then
            cp content-temp/content-index.json ./
            echo "✓ Copied content-index.json"
          fi

          # Move content directory for Docker build
          mv content-temp content
          echo "✅ Content processing complete"

      # ==========================================
      # 4. AZURE LOGIN
      # ==========================================
      - name: Azure Login
        uses: azure/login@v2
        with:
          creds: |
            {
              "clientId": "${{ secrets.AZURE_CLIENT_ID }}",
              "clientSecret": "${{ secrets.AZURE_CLIENT_SECRET }}",
              "subscriptionId": "${{ secrets.AZURE_SUBSCRIPTION_ID }}",
              "tenantId": "${{ secrets.AZURE_TENANT_ID }}"
            }

      - name: Login to Azure Container Registry
        run: |
          echo ${{ secrets.AZURE_CLIENT_SECRET }} | docker login \
            ${{ env.REGISTRY_NAME }}.azurecr.io \
            --username ${{ secrets.AZURE_CLIENT_ID }} \
            --password-stdin

      # ==========================================
      # 5. BUILD AND PUSH DOCKER IMAGE
      # ==========================================
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ env.REGISTRY_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:latest
          build-args: |
            TINA_TOKEN=${{ secrets.TINA_TOKEN }}
            NEXT_PUBLIC_TINA_CLIENT_ID=${{ secrets.NEXT_PUBLIC_TINA_CLIENT_ID }}
            NEXT_PUBLIC_TINA_BRANCH=${{ github.event.inputs.content_branch || 'main' }}
          cache-from: type=registry,ref=${{ env.REGISTRY_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:cache
          cache-to: type=registry,ref=${{ env.REGISTRY_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:cache,mode=max

      # ==========================================
      # 6. DEPLOY TO AZURE WEB APP
      # ==========================================
      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.WEBAPP_NAME }}
          images: ${{ env.REGISTRY_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:latest

      # ==========================================
      # 7. VERIFY DEPLOYMENT
      # ==========================================
      - name: Verify deployment
        run: |
          echo "✅ Deployment complete!"
          echo "🌐 Website URL: https://${{ env.WEBAPP_NAME }}.azurewebsites.net"

          # Wait for app to be ready
          sleep 30

          # Check health
          curl -f https://${{ env.WEBAPP_NAME }}.azurewebsites.net || echo "⚠️ Site may still be starting..."
```

**⚠️ Important**: Update line 24 with your actual content repository:
```yaml
repository: your-org/my-content  # Change this!
```

---

### Step 8: Create Dockerfile

**In your website repository root**, create a file named `Dockerfile`:

```dockerfile
# Base Stage
FROM node:20-alpine AS base

# Dependencies Stage
FROM base AS deps
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --force

# Builder Stage
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Content is already present (copied by GitHub Actions)
# Verify content exists
RUN ls -la content/ || echo "⚠️ Warning: No content directory"

# Build arguments
ARG TINA_TOKEN
ARG NEXT_PUBLIC_TINA_CLIENT_ID
ARG NEXT_PUBLIC_TINA_BRANCH=main

# Set environment variables for build
ENV TINA_TOKEN=$TINA_TOKEN \
    NEXT_PUBLIC_TINA_CLIENT_ID=$NEXT_PUBLIC_TINA_CLIENT_ID \
    NEXT_PUBLIC_TINA_BRANCH=$NEXT_PUBLIC_TINA_BRANCH \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Build application
RUN npm run build

# Runner Stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup -S nodejs -g 1001 && \
    adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

---

### Step 9: Update Next.js Configuration

**Ensure `next.config.js`** (or `next.config.ts`) has standalone output:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker
  output: 'standalone',

  // Other configurations...
};

module.exports = nextConfig;
```

---

### Step 10: Deploy to Azure

#### Manual Deployment:

If you want to deploy a specific branch or re-deploy:

1. **Go to GitHub repository → Actions tab**
2. **Click on "Deploy to Azure" workflow**
3. **Click "Run workflow" button** (on the right)
4. **Choose branch** (default: main)
5. **Enter content branch** (default: main)
6. **Click "Run workflow"**

---

### Step 11: Configure Web App Environment Variables

After first successful deployment, you may want to add runtime environment variables:

1. **Go to Azure Portal** → App Services → `my-website-app`
2. **Click on "Settings" → "Environment variables"** in the left menu
3. **Click "+ Add" under "Application settings"**
4. **Add the following variables:**

| Name | Value |
|------|-------|
| `TINA_TOKEN` | (Copy from GitHub secrets) |
| `NEXT_PUBLIC_TINA_CLIENT_ID` | (Copy from GitHub secrets) |
| `NODE_ENV` | `production` |
| `WEBSITES_PORT` | `3000` |

5. **Click "Apply"** at the bottom
6. **Click "Confirm"** when prompted
7. **Wait for the app to restart** (~30 seconds)

---
