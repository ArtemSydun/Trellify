#!/bin/bash

set -e

: ${BACKUP_ROOT:="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"}

PROJECT_ROOT="$(cd "${BACKUP_ROOT}/../.." && pwd)"

source "${PROJECT_ROOT}/.env.production"
source "${BACKUP_ROOT}/backup.conf"

if [[ -z "$1" ]]; then
    echo "❌ Error: You need to pass the name of the backup file!"
    exit 1
fi

ARCHIVES_DIR="archives"
ENCRYPTED_ARCHIVE_FILENAME="$1"
ENCRYPTED_ARCHIVE_FILE_PATH="${BACKUP_ROOT}/${ARCHIVES_DIR}/${ENCRYPTED_ARCHIVE_FILENAME}"
RESTORE_DATABASE_DIR="dump"

MONGO_PORT=$MONGODB_HOST_PORT
MONGO_USER=$MONGODB_USERNAME
MONGO_PASS=$MONGODB_PASSWORD

cd "${BACKUP_ROOT}"
mkdir -p "${ARCHIVES_DIR}"

echo "1️⃣ Uploading encrypted archive from remote cloud using RCLONE"
for dest in "${RCLONE_DESTS[@]}"; do
    if ${RCLONE} copy "${dest}/${ENCRYPTED_ARCHIVE_FILENAME}" "${ARCHIVES_DIR}"; then
        success=$((success + 1))
        echo "✅ Uploading is successful"
    else
        echo "❌ Uploading is unsuccessful"
        exit 1
    fi
done

echo "2️⃣ Calculating SHA-256 hash of file: ${ENCRYPTED_ARCHIVE_FILE_PATH}"
shasum -a 256 "${ENCRYPTED_ARCHIVE_FILE_PATH}"

echo "3️⃣ Decrypting file using AGE: ${ENCRYPTED_ARCHIVE_FILE_PATH}"
if [[ "${ENCRYPTED_ARCHIVE_FILE_PATH}" == *.age ]]; then
    DECRYPTED_ARCHIVE_FILE_PATH="${ENCRYPTED_ARCHIVE_FILE_PATH%.age}"
    ${AGE} --decrypt -i "${AGE_SECRET_KEY_FILE}" "${ENCRYPTED_ARCHIVE_FILE_PATH}" > "${DECRYPTED_ARCHIVE_FILE_PATH}"
    echo "️️4️⃣ Calculating SHA-256 hash of file: ${DECRYPTED_ARCHIVE_FILE_PATH}"
    shasum -a 256 "${DECRYPTED_ARCHIVE_FILE_PATH}"
    echo "✅ AGE decryption is successful: ${DECRYPTED_ARCHIVE_FILE_PATH}"
fi

echo "5️⃣ Unpacking ${DECRYPTED_ARCHIVE_FILE_PATH} into ${RESTORE_DATABASE_DIR}"
tar -xJf "${DECRYPTED_ARCHIVE_FILE_PATH}"
extracted_item=$(tar -tf "${DECRYPTED_ARCHIVE_FILE_PATH}" | head -1 | cut -d '/' -f1)
mv "${extracted_item}" "${RESTORE_DATABASE_DIR}"


echo "6️⃣ Importing into MongoDB"
${MONGORESTORE} --authenticationDatabase="admin" \
                --host="localhost" \
                --port="${MONGO_PORT}" \
                --username="${MONGO_USER}" \
                --password="${MONGO_PASS}" \
                --drop \
                --dir="${RESTORE_DATABASE_DIR}"

send_telegram_message() {
    local message=$1
    curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -d chat_id="${CHAT_ID}" \
        -d text="${message}" \
        -d parse_mode="MarkdownV2"
}

echo "9️⃣ Sending a message to a Telegram bot"
message="✅ *Trellify backup restored successfully* ✅
File: \`${ENCRYPTED_ARCHIVE_FILENAME}\`
Database successfully restored"

send_telegram_message "${message}"
echo "✅ The recovery was successfully completed!"

set +e
echo "8️⃣ Removing archives directory: ${BACKUP_ROOT}/${ARCHIVES_DIR}"
rm -rf "${ARCHIVES_DIR}"
echo "9️⃣ Removing dump directory: ${BACKUP_ROOT}/${RESTORE_DATABASE_DIR}"
rm -rf "${RESTORE_DATABASE_DIR}"

exit 0
