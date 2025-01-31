#!/bin/bash

: ${BACKUP_ROOT:="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"}

source "${BACKUP_ROOT}/backup.conf"

LOGS_DIR="logs"

cd "${BACKUP_ROOT}"
mkdir -p "${LOGS_DIR}"

if "${BACKUP_ROOT}"/backup.sh >"${BACKUP_ROOT}"/backup.log 2>&1; then
    RESULT="success"
    EXITCODE=0
else
    RESULT="failure"
    EXITCODE=1
fi

cp -a "${BACKUP_ROOT}"/backup.log "${LOGS_DIR}"/backup-${RESULT}-${BACKUP_TIMESTAMP}.log
rm backup.log
exit ${EXITCODE}
