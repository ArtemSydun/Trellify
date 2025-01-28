#!/bin/sh
DIR=`date +%y%m%d`
DEST=/mongodb_backups/$DIR
mkdir $DEST -p
mongodump -h mongodb -d test -u admin -p password --authenticationDatabase admin -o $DEST