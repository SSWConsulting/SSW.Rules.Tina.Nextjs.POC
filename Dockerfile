FROM node:18-alpine AS base

FROM base AS deps
  RUN apk add --no-cache libc6-compat git-lfs
  WORKDIR /app
  COPY package*.json ./
  COPY yarn.lock* ./
  # Force fresh install every time (no cache)
  RUN if [ -f yarn.lock ]; then yarn --frozen-lockfile --cache-folder /tmp/yarn-cache; \
      elif [ -f package-lock.json ]; then npm ci --force --cache /tmp/npm-cache; \
      else npm install --force --cache /tmp/npm-cache; fi

  FROM base AS builder
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN git lfs pull || true

  # Build arguments for build info
  ARG BUILD_TIMESTAMP
  ARG VERSION_DEPLOYED
  ARG DEPLOYMENT_URL
  ARG BUILD_DATE
  ARG COMMIT_HASH

  # Existing build arguments
  ARG TINA_TOKEN
  ARG TINA_SEARCH_TOKEN
  ARG TINA_WEBHOOK_SECRET
  ARG NEXT_PUBLIC_TINA_CLIENT_ID
  ARG NEXT_PUBLIC_TINA_BRANCH
  ARG NEXT_PUBLIC_ALGOLIA_APP_ID
  ARG NEXT_PUBLIC_ALGOLIA_ADMIN_KEY
  ARG NEXT_PUBLIC_ALGOLIA_INDEX_NAME
  ARG NEXT_PUBLIC_ALGOLIA_API_KEY
  ARG NEXT_PUBLIC_API_BASE_URL
  ARG NEXT_PUBLIC_GITHUB_ORG
  ARG NEXT_PUBLIC_GITHUB_REPO
  ARG NEXT_PUBLIC_GISCUS_REPO_NAME
  ARG NEXT_PUBLIC_GISCUS_REPO_ID
  ARG NEXT_PUBLIC_GISCUS_CATEGORY_ID
  ARG NEXT_PUBLIC_GISCUS_THEME_URL
  ARG NEXT_PUBLIC_BASE_PATH

  # Environment variables for build info (available at build time and runtime)
  ENV BUILD_TIMESTAMP=$BUILD_TIMESTAMP \
        VERSION_DEPLOYED=$VERSION_DEPLOYED \
        DEPLOYMENT_URL=$DEPLOYMENT_URL \
        BUILD_DATE=$BUILD_DATE \
        COMMIT_HASH=$COMMIT_HASH \
        TINA_TOKEN=$TINA_TOKEN \
        TINA_SEARCH_TOKEN=$TINA_SEARCH_TOKEN \
        TINA_WEBHOOK_SECRET=$TINA_WEBHOOK_SECRET \
        NEXT_PUBLIC_TINA_CLIENT_ID=$NEXT_PUBLIC_TINA_CLIENT_ID \
        NEXT_PUBLIC_TINA_BRANCH=$NEXT_PUBLIC_TINA_BRANCH \
        NEXT_PUBLIC_ALGOLIA_APP_ID=$NEXT_PUBLIC_ALGOLIA_APP_ID \
        NEXT_PUBLIC_ALGOLIA_ADMIN_KEY=$NEXT_PUBLIC_ALGOLIA_ADMIN_KEY \
        NEXT_PUBLIC_ALGOLIA_INDEX_NAME=$NEXT_PUBLIC_ALGOLIA_INDEX_NAME \
        NEXT_PUBLIC_ALGOLIA_API_KEY=$NEXT_PUBLIC_ALGOLIA_API_KEY \
        NEXT_PUBLIC_GITHUB_ORG=$NEXT_PUBLIC_GITHUB_ORG \
        NEXT_PUBLIC_GITHUB_REPO=$NEXT_PUBLIC_GITHUB_REPO \
        NEXT_PUBLIC_GISCUS_REPO_NAME=$NEXT_PUBLIC_GISCUS_REPO_NAME \
        NEXT_PUBLIC_GISCUS_REPO_ID=$NEXT_PUBLIC_GISCUS_REPO_ID \
        NEXT_PUBLIC_GISCUS_CATEGORY_ID=$NEXT_PUBLIC_GISCUS_CATEGORY_ID \
        NEXT_PUBLIC_GISCUS_THEME_URL=$NEXT_PUBLIC_GISCUS_THEME_URL \
        NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
        NEXT_TELEMETRY_DISABLED=1

  # Fresh build every time
  RUN if [ -f yarn.lock ]; then yarn build; else npm run build; fi

  FROM base AS runner
  WORKDIR /app

  # Environment variables for runtime
  ENV NODE_ENV=production \
      NEXT_TELEMETRY_DISABLED=1 \
      PORT=3000 \
      HOSTNAME="0.0.0.0"

  # Copy build info to runtime stage
  ARG BUILD_TIMESTAMP
  ARG VERSION_DEPLOYED
  ARG DEPLOYMENT_URL
  ARG BUILD_DATE
  ARG COMMIT_HASH

  ENV BUILD_TIMESTAMP=$BUILD_TIMESTAMP \
      VERSION_DEPLOYED=$VERSION_DEPLOYED \
      DEPLOYMENT_URL=$DEPLOYMENT_URL \
      BUILD_DATE=$BUILD_DATE \
      COMMIT_HASH=$COMMIT_HASH

  RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001
  COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
  COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
  COPY --from=builder /app/public ./public
  USER nextjs
  EXPOSE 3000
  CMD ["node", "server.js"]
  EOF