#!/bin/bash

: ${BACKUP_ROOT:="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"}

source "${BACKUP_ROOT}/backup.conf"

BACKUP_LOGS="${BACKUP_ROOT}/logs"

mkdir -p "${BACKUP_LOGS}"

if "${BACKUP_ROOT}"/backup.sh >"${BACKUP_ROOT}"/backup.log 2>&1; then
    RESULT="success"
    EXITCODE=0
else
    RESULT="failure"
    EXITCODE=1
fi

cp -a "${BACKUP_ROOT}"/backup.log "${BACKUP_LOGS}"/backup-${RESULT}-${BACKUP_TIMESTAMP}.log
exit ${EXITCODE}
