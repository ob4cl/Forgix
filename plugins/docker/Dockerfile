# Supported: node-api and express-ts only. Not Next/Vite/Python.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["npm", "start"]
