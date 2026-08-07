#!/bin/bash
# SSL 证书到期检查 + 自动续期
DOMAINS="blog.codx.top"
LOG="/var/log/cert-renew.log"
THRESHOLD_DAYS=20

for domain in $DOMAINS; do
  CERT="/etc/letsencrypt/live/$domain/fullchain.pem"
  if [ ! -f "$CERT" ]; then
    echo "$(date '+%F %T') [WARN] $domain 证书文件不存在" >> $LOG
    continue
  fi

  # 计算到期剩余天数
  EXPIRY=$(openssl x509 -enddate -noout -in "$CERT" | cut -d= -f2)
  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

  echo "$(date '+%F %T') $domain 证书剩余 ${DAYS_LEFT} 天 (到期 $EXPIRY)" >> $LOG

  if [ "$DAYS_LEFT" -le "$THRESHOLD_DAYS" ]; then
    echo "$(date '+%F %T') [RENEW] $domain 续期证书..." >> $LOG
    certbot renew --quiet --non-interactive >> $LOG 2>&1
    if [ $? -eq 0 ]; then
      echo "$(date '+%F %T') [OK] $domain 续期成功" >> $LOG
      systemctl reload nginx
    else
      echo "$(date '+%F %T') [FAIL] $domain 续期失败!" >> $LOG
    fi
  fi
done