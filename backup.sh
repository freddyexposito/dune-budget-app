#!/bin/bash
set -e

APP_DIR="/home/freddy/dune-budget-app"
BACKUP_DIR="$APP_DIR/backups"

mkdir -p "$BACKUP_DIR"

sqlite3 "$APP_DIR/budget.db" "PRAGMA wal_checkpoint(TRUNCATE);"

cp "$APP_DIR/budget.db" "$BACKUP_DIR/budget_$(date +%Y-%m-%d).db"

find "$BACKUP_DIR" -name "*.db" -mtime +60 -delete

rclone copy "$BACKUP_DIR" gdrive-titan:dune-budget-backups
