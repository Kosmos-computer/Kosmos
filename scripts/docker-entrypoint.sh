#!/bin/sh
set -eu

DATA_DIR="${ARCO_DATA_DIR:-/data}"
SSH_DIR="${KOSMOS_SSH_DIR:-$DATA_DIR/.ssh}"

if [ -d "$SSH_DIR" ]; then
  chmod 700 "$SSH_DIR"

  find "$SSH_DIR" -type f \( -name "id_*" ! -name "*.pub" \) -exec chmod 600 {} \;
  [ ! -f "$SSH_DIR/config" ] || chmod 600 "$SSH_DIR/config"
  [ ! -f "$SSH_DIR/known_hosts" ] || chmod 644 "$SSH_DIR/known_hosts"

  if [ -z "${GIT_SSH_COMMAND:-}" ]; then
    KEY_PATH="${KOSMOS_SSH_KEY_PATH:-}"
    if [ -z "$KEY_PATH" ]; then
      for candidate in \
        "$SSH_DIR/id_ed25519" \
        "$SSH_DIR/id_ecdsa" \
        "$SSH_DIR/id_rsa"
      do
        if [ -f "$candidate" ]; then
          KEY_PATH="$candidate"
          break
        fi
      done
    fi

    if [ -n "$KEY_PATH" ] && [ -f "$KEY_PATH" ]; then
      export GIT_SSH_COMMAND="ssh -i $KEY_PATH -o IdentitiesOnly=yes -o UserKnownHostsFile=$SSH_DIR/known_hosts -o StrictHostKeyChecking=accept-new"
    fi
  fi
fi

exec "$@"
