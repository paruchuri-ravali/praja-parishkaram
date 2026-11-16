FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm install --no-audit --no-fund
COPY server server
COPY web web
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production PORT=8080 WEB_DIR=/app/web/dist
WORKDIR /app/server
COPY --from=build /app/package.json /app/
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/server/package.json ./
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/drizzle ./drizzle
COPY --from=build /app/web/dist /app/web/dist
EXPOSE 8080
CMD ["npm", "start"]
