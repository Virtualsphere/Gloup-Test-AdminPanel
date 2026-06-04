# Stage 1: Build stage
FROM node:22-alpine AS build
WORKDIR /app

# Enable corepack to support pnpm if needed
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy manifest files
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install dependencies based on lock files
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; \
    fi

# Copy the rest of the application files
COPY . .

# Build-time environment variables for Vite
ARG VITE_API_BASE_URL
ARG VITE_IMAGE_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_IMAGE_BASE_URL=$VITE_IMAGE_BASE_URL

# Build the project
RUN if [ -f pnpm-lock.yaml ]; then pnpm run build; \
    else npm run build; \
    fi

# Stage 2: Production runner
FROM nginx:stable-alpine AS runner

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration for SPA routing fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
