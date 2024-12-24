FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS test

WORKDIR /app
COPY package.json  .
COPY --from=builder /app/node_modules  ./node_modules
COPY . .

CMD ["npm", "run", "test:e2e"]

FROM node:20-alpine AS development

WORKDIR /app
COPY package.json  .
COPY --from=builder /app/node_modules  ./node_modules
COPY . .
EXPOSE ${BACKEND_PORT}

CMD ["npm", "run", "start:dev"]

FROM node:20-alpine AS staging

WORKDIR /app
COPY package.json  .
COPY --from=builder /app/node_modules  ./node_modules
COPY --from=builder /app/dist  ./dist
EXPOSE ${BACKEND_PORT}

CMD ["npm", "run", "start:staging"]

FROM node:20-alpine AS production

WORKDIR /app
COPY package.json  .
COPY --from=builder /app/node_modules  ./node_modules
COPY --from=builder /app/dist  ./dist
EXPOSE ${BACKEND_PORT}

CMD ["npm", "run", "start:prod"]