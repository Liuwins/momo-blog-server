#!/bin/bash
# 清理未引用的图片文件（文章删除/编辑后遗留的）
# 每周执行一次

set -e

IMAGES_DIR="/var/www/momo-blog/images"
DB="/root/web/opencode/pyq-opencode/momo-blog-server/data/momoblog.db"
LOG="/var/log/momo-blog-cleanup.log"

echo "$(date '+%Y-%m-%d %H:%M:%S') 开始清理..." >> "$LOG"

# 收集所有引用的图片路径（/posts 里的 /images/xxx）
REFERENCES=$(sqlite3 "$DB" "
  SELECT images FROM posts WHERE images != '';
  SELECT avatar FROM users WHERE avatar != '';
" | tr ',' '\n' | sed 's|^/images/||' | sort -u)

if [ -z "$REFERENCES" ]; then
  echo "没有引用，跳过" >> "$LOG"
  exit 0
fi

# 统计
DELETED=0
DELETED_SIZE=0

# 检查所有文件和目录
for item in "$IMAGES_DIR"/*; do
  name=$(basename "$item")
  
  # og-cover 和 .开头的隐藏文件跳过
  if [[ "$name" == "og-cover"* ]] || [[ "$name" == .* ]]; then
    continue
  fi
  
  # 检查是否被引用
  found=false
  while IFS= read -r ref; do
    if [[ "$ref" == "$name" ]] || [[ "$ref" == "$name/"* ]]; then
      found=true
      break
    fi
  done <<< "$REFERENCES"
  
  if [ "$found" = false ]; then
    # 未引用，删除
    size=$(du -sb "$item" 2>/dev/null | awk '{print $1}')
    if [ -d "$item" ]; then
      rm -rf "$item"
      echo "删除目录: $name ($(numfmt --to=iec $size 2>/dev/null || echo ${size}B))" >> "$LOG"
    else
      rm -f "$item"
      echo "删除文件: $name ($(numfmt --to=iec $size 2>/dev/null || echo ${size}B))" >> "$LOG"
    fi
    DELETED=$((DELETED + 1))
    DELETED_SIZE=$((DELETED_SIZE + size))
  fi
done

if [ $DELETED -gt 0 ]; then
  echo "清理完成：删除 $DELETED 项，释放 $(numfmt --to=iec $DELETED_SIZE 2>/dev/null || echo ${DELETED_SIZE}B)" >> "$LOG"
else
  echo "清理完成：无需删除" >> "$LOG"
fi
