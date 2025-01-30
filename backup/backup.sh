#!/bin/bash

set -e

: ${MONGODUMP:="/usr/local/bin/mongodump"}
: ${AGE:="/usr/local/bin/age"}
: ${RCLONE:="/usr/local/bin/rclone"}
: ${BACKUP_ROOT:="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"}

PROJECT_ROOT="$(cd "${BACKUP_ROOT}/.." && pwd)"

source "${PROJECT_ROOT}/.env.production"
source "${BACKUP_ROOT}/backup.conf"

DUMPS_DIR="dumps"
DATABASE_DUMP_DIRNAME="database-backup-${BACKUP_TIMESTAMP}"
DATABASE_DUMP_DIR_PATH="${BACKUP_ROOT}/${DUMPS_DIR}/${DATABASE_DUMP_DIRNAME}"
ARCHIVES_DIR="archives"
ARCHIVE_FILENAME="${DATABASE_DUMP_DIRNAME}.tar.xz"
ARCHIVE_FILE_PATH="${BACKUP_ROOT}/${ARCHIVES_DIR}/${ARCHIVE_FILENAME}"

MONGO_PORT=$MONGODB_HOST_PORT
MONGO_USER=$MONGODB_USERNAME
MONGO_PASS=$MONGODB_PASSWORD

cd "${BACKUP_ROOT}"
mkdir -p "${DUMPS_DIR}"
mkdir -p "${ARCHIVES_DIR}"

echo "1️⃣ Database dumping"
${MONGODUMP} --authenticationDatabase="admin" \
             --host="localhost" \
             --port="${MONGO_PORT}" \
             --username="${MONGO_USER}" \
             --password="${MONGO_PASS}" \
             --out="${DATABASE_DUMP_DIR_PATH}"

echo "2️⃣ Archiving to TAR: ${ARCHIVE_FILE_PATH}"
tar -cJf "${ARCHIVE_FILE_PATH}" -C "${BACKUP_ROOT}/${DUMPS_DIR}" "${DATABASE_DUMP_DIRNAME}"
echo "️3️⃣ Calculating SHA-256 hash of file: ${ARCHIVE_FILE_PATH}"
shasum -a 256 "${ARCHIVE_FILE_PATH}"

echo "️4️⃣ Encrypting archive using AGE: ${ARCHIVE_FILE_PATH}"
if [[ -n ${AGE_SECRET_KEY} ]]; then
    export AGE_PASSPHRASE
    ${AGE} -r "${AGE_SECRET_KEY}" -o "${ARCHIVE_FILE_PATH}.age" "${ARCHIVE_FILE_PATH}"
    ENCRYPTED_ARCHIVE_FILENAME="${ARCHIVE_FILENAME}.age"
    ENCRYPTED_ARCHIVE_FILE_PATH="${ARCHIVE_FILE_PATH}.age"
    echo "️5️⃣ Calculating SHA-256 hash of file: ${ENCRYPTED_ARCHIVE_FILE_PATH}"
    shasum -a 256 "${ENCRYPTED_ARCHIVE_FILE_PATH}"
    echo "✅ AGE encryption is successful: ${ENCRYPTED_ARCHIVE_FILE_PATH}"
fi

success=0
echo "6️⃣ Uploading encrypted archive to remote cloud using RCLONE: ${ENCRYPTED_ARCHIVE_FILE_PATH}"
for dest in "${RCLONE_DESTS[@]}"; do
    if ${RCLONE} -vv --no-check-dest copy "${ENCRYPTED_ARCHIVE_FILE_PATH}" "${dest}"; then
        (( success++ ))
        echo "✅ Uploading is successful"
    else
        echo "❌ Uploading is unsuccessful"
    fi
done

send_telegram_message() {
    local message=$1
    curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -d chat_id="${CHAT_ID}" \
        -d text="${message}" \
        -d parse_mode="MarkdownV2"
}

echo "7️⃣ Sending a message to a Telegram bot"
if [[ ${success} == ${#RCLONE_DESTS[@]} ]]; then
    message="✅*Trellify backup completed successfully* ✅
    File: \`${ENCRYPTED_ARCHIVE_FILENAME}\`
    Done: ${success}/${#RCLONE_DESTS[@]}
    [Link to cloud](https://nx62236.your-storageshare.de/apps/files/files/177577?dir=/Trellify)"
    send_telegram_message "${message}"
    echo "✅ Backup successfully copied to all destinations."
else
    message="⚠️*Trellify backup partially successful*
    File: \`${ENCRYPTED_ARCHIVE_FILENAME}\`
    Done: ${success}/${#RCLONE_DESTS[@]}
    [Link to cloud](https://nx62236.your-storageshare.de/apps/files/files/177577?dir=/Trellify)"
    send_telegram_message "${message}"
    echo "⚠️ Backup successfully copied to ${success} of ${#RCLONE_DESTS[@]} destinations."
fi

set +e
echo "8️⃣ Removing archives directory: ${BACKUP_ROOT}/${ARCHIVES_DIR}"
rm -rf "${ARCHIVES_DIR}"
echo "9️⃣ Removing dumps directory: ${BACKUP_ROOT}/${DUMPS_DIR}"
rm -rf "${DUMPS_DIR}"

exit 0