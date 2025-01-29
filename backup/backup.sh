#!/bin/bash

set -e

: ${MONGODUMP:="/usr/local/bin/mongodump"}
: ${GPG:="/usr/bin/gpg"}
: ${AGE:="/usr/local/bin/age"}
: ${RCLONE:="/usr/local/bin/rclone"}
: ${BACKUP_ROOT:="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"}

PROJECT_ROOT="$(cd "${BACKUP_ROOT}/.." && pwd)"

source "${PROJECT_ROOT}/.env.production"
source "${BACKUP_ROOT}/backup.conf"

MONGO_DIR_NAME="mongodb-backup-${BACKUP_TIMESTAMP}"
MONGO_DIR_PATH="${BACKUP_ROOT}/${MONGO_DIR_NAME}"
BACKUP_ARCHIVES_DIR="archives"
BACKUP_ARCHIVE_NAME="${MONGO_DIR_NAME}.tar.xz"
BACKUP_ARCHIVE_PATH="${BACKUP_ROOT}/${BACKUP_ARCHIVES_DIR}/${BACKUP_ARCHIVE_NAME}"
STABLE_BACKUP_ARCHIVE_PATH="${BACKUP_ROOT}/${BACKUP_ARCHIVES_DIR}/${BACKUP_ARCHIVE_NAME}"

MONGO_PORT=$MONGODB_HOST_PORT
MONGO_USER=$MONGODB_USERNAME
MONGO_PASS=$MONGODB_PASSWORD

cd "${BACKUP_ROOT}"
mkdir -p "${BACKUP_ARCHIVES_DIR}"

${MONGODUMP} --authenticationDatabase="admin" \
             --host="localhost" \
             --port="${MONGO_PORT}" \
             --username="${MONGO_USER}" \
             --password="${MONGO_PASS}" \
             --out="${MONGO_DIR_PATH}"

tar -cJf "${BACKUP_ARCHIVE_PATH}" -C "${BACKUP_ROOT}" "${MONGO_DIR_NAME}"
rm -rf "${MONGO_DIR_PATH}"
openssl md5 "${BACKUP_ARCHIVE_PATH}"
shasum -a 1 "${BACKUP_ARCHIVE_PATH}"

if [[ -n ${GPG_PASSPHRASE} ]]; then
    printf '%s' "${GPG_PASSPHRASE}"
    ${GPG} -c --cipher-algo "${GPG_CIPHER_ALGO}" --batch --passphrase-fd 0 "${BACKUP_ARCHIVE_PATH}"
    BACKUP_ARCHIVE_NAME+=".gpg"
    BACKUP_ARCHIVE_PATH+=".gpg"
    openssl md5 "${BACKUP_ARCHIVE_PATH}"
    shasum "${BACKUP_ARCHIVE_PATH}"
    echo "✅ GPG encryption is successful"
elif [[ -n ${AGE_SECRET_KEY} ]]; then
    export AGE_PASSPHRASE
    ${AGE} -r "${AGE_SECRET_KEY}" -o "${BACKUP_ARCHIVE_PATH}.age" "${BACKUP_ARCHIVE_PATH}"
    BACKUP_ARCHIVE_NAME+=".age"
    BACKUP_ARCHIVE_PATH+=".age"
    openssl md5 "${BACKUP_ARCHIVE_PATH}"
    shasum "${BACKUP_ARCHIVE_PATH}"
    echo "✅ AGE encryption is successful"
fi

set +e

rm "${STABLE_BACKUP_ARCHIVE_PATH}"

set -ex

success=0
for dest in "${RCLONE_DESTS[@]}"; do
    if ${RCLONE} -vv --no-check-dest copy "${BACKUP_ARCHIVE_PATH}" "${dest}"; then
        (( success++ ))
        echo "✅ RCLONE is successful"
    else
        echo "❌ RCLONE is unsuccessful"
    fi
done

send_telegram_message() {
    local message=$1
    curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -d chat_id="${CHAT_ID}" \
        -d text="${message}" \
        -d parse_mode="MarkdownV2"
}

if [[ ${success} == ${#RCLONE_DESTS[@]} ]]; then
    message="✅*Trellify backup completed successfully* ✅
    File: \`${BACKUP_ARCHIVE_NAME}\`
    Done: ${success}/${#RCLONE_DESTS[@]}
    [Link to cloud](https://nx62236.your-storageshare.de/apps/files/files/177577?dir=/Trellify)"
    send_telegram_message "${message}"
    echo "✅ Backup successfully copied to all destinations."
    exit 0
else
    message="⚠️*Trellify backup partially successful*
    File: \`${BACKUP_ARCHIVE_NAME}\`
    Done: ${success}/${#RCLONE_DESTS[@]}
    [Link to cloud](https://nx62236.your-storageshare.de/apps/files/files/177577?dir=/Trellify)"
    send_telegram_message "${message}"
    echo "⚠️ Backup successfully copied to ${success} of ${#RCLONE_DESTS[@]} destinations."
    exit 1
fi

