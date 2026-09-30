#!/bin/sh
# Remplace sendmail pendant les tests : écrit chaque e-mail dans tests/.tmp/mail.log.
DIR="$(cd "$(dirname "$0")/.." && pwd)/.tmp"
mkdir -p "$DIR"
{
  echo "=== MAIL $(date +%s) ARGS: $*"
  cat
  echo "=== FIN"
} >> "$DIR/mail.log"
