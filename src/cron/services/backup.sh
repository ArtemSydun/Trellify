#!/bin/bash

set -ex

source "F:/trello_notification_bot_node/.env"

: ${MONGODUMP:="F:/trello_notification_bot_node/src/cron/services/mongodump"} # Path to mongodump tool

DATA_DIR="data"
BACKUP_ROOT="F:/mongo/backup"


BACKUP_TIMESTAMP="$(date '+%Y%m%d-%H%M')"
BACKUP_DIR_NAME="mongodb-backup-${BACKUP_TIMESTAMP}"
BACKUP_DIR_PATH="${BACKUP_ROOT}/${BACKUP_DIR_NAME}"
BACKUP_FILE_DIR="archives"
BACKUP_FILE_NAME="${BACKUP_DIR_NAME}.tar.xz"
BACKUP_FILE_PATH="${BACKUP_ROOT}/${BACKUP_FILE_DIR}/${BACKUP_FILE_NAME}"

cd "F:/mongo"
mkdir -p "${BACKUP_DIR_PATH}"

# MongoDB backup
MONGO_HOST=$MONGODB_HOSTNAME # Replace with your MongoDB host
MONGO_PORT=$MONGODB_PORT     # Replace with your MongoDB port
MONGO_USER=$MONGODB_USERNAME     # Replace with your MongoDB username
MONGO_PASS=$MONGODB_PASSWORD  # Replace with your MongoDB password
MONGO_DB=$MONGODB_NAME        # Replace with the database you want to back up

${MONGODUMP} --host="${MONGO_HOST}" \
             --port="${MONGO_PORT}" \
             --username="${MONGO_USER}" \
             --password="${MONGO_PASS}" \
             --authenticationDatabase="admin" \
             --db="${MONGO_DB}" \
             --out="${BACKUP_DIR_PATH}"

# Archive and compress the backup
tar -cJf "${BACKUP_FILE_PATH}" -C "${BACKUP_ROOT}/${BACKUP_DIR_NAME}"
rm -rf "${BACKUP_DIR_PATH}"
openssl md5 "${BACKUP_FILE_PATH}"
shasum -a 1 "${BACKUP_FILE_PATH}"
