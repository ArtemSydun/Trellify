#!/bin/bash
set -e

docker network create app-network || true

# Запуск бази даних
docker run --name mongodb --network app-network -d \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:latest
sleep 10

cp .env.example .env

# Побудова Docker-образу
docker build -t backend:staging -f .docker/Dockerfile .

# Запуск тестового контейнера
docker run --name backend-test --network app-network -d \
  --env-file .env \
  -p 8080:3000 \
  backend:staging
sleep 20

# Перевірка доступності
curl -f http://localhost:8080 || (docker logs backend-test && exit 1)

# # Очищення контейнерів
# docker stop backend-test mongodb
# docker rm backend-test mongodb

