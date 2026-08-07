#!/bin/bash
# MomoBlog 数据库每日备份 + 上传到阿里云 OSS
DB_DIR="/root/web/opencode/pyq-opencode/momo-blog-server/data"
BACKUP_DIR="/root/web/opencode/pyq-opencode/momo-blog-server/backups"
mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y%m%d_%H%M)
BACKUP_FILE="$BACKUP_DIR/momoblog.db.$DATE.bak"

# 保留本地最近7天
find "$BACKUP_DIR" -name "momoblog.db.*" -mtime +7 -delete

# 用 sqlite backup 命令保证一致性
sqlite3 "$DB_DIR/momoblog.db" ".backup '$BACKUP_FILE'" 2>/dev/null || \
  cp "$DB_DIR/momoblog.db" "$BACKUP_FILE"

echo "本地备份完成: $BACKUP_FILE"

# 上传到 OSS（从 .env 读 AccessKey）
export $(grep -E "^ALIYUN_AK_ID=|^ALIYUN_AK_SECRET=" /root/.hermes/.env 2>/dev/null)
if [ -n "$ALIYUN_AK_ID" ] && [ -n "$ALIYUN_AK_SECRET" ]; then
  python3 - "$BACKUP_FILE" "$DATE" << 'PYEOF'
import oss2, sys, os
from oss2.resumable import resumable_upload

local_file = sys.argv[1]
date_str = sys.argv[2]
object_key = f"backups/momoblog.db.{date_str}.bak"

auth = oss2.Auth(os.environ['ALIYUN_AK_ID'], os.environ['ALIYUN_AK_SECRET'])
bucket = oss2.Bucket(auth, 'https://oss-cn-hangzhou.aliyuncs.com', 'codx-top-blog-backup')

resumable_upload(bucket, object_key, local_file)
print(f"OSS 上传成功: {object_key}")
PYEOF
else
  echo "警告: 未找到 AccessKey，跳过 OSS 上传"
fi