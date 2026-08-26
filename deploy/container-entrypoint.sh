#!/bin/sh

set -eu
umask 077

validate_and_install() {
  target="$1"
  candidate="$2"
  label="$3"

  if ! node -e 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))' "$candidate"; then
    rm -f "$candidate"
    echo "Invalid JSON in ${label}; refusing to start" >&2
    exit 1
  fi

  chmod 600 "$candidate"
  mv -f "$candidate" "$target"
}

materialize_auth() {
  target="$1"
  encoded="$2"
  source_file="$3"
  label="$4"
  target_dir=$(dirname "$target")

  if [ -n "$encoded" ]; then
    mkdir -p "$target_dir"
    candidate="${target}.tmp.$$"
    if ! printf '%s' "$encoded" | base64 -d > "$candidate"; then
      rm -f "$candidate"
      echo "Invalid base64 in ${label}; refusing to start" >&2
      exit 1
    fi
    validate_and_install "$target" "$candidate" "$label"
  elif [ -f "$source_file" ]; then
    mkdir -p "$target_dir"
    candidate="${target}.tmp.$$"
    cp "$source_file" "$candidate"
    validate_and_install "$target" "$candidate" "$source_file"
  fi
}

# Credentials are intentionally materialized at container startup. Never put
# either JSON file in a Docker build context, Dockerfile, or image layer.
materialize_auth \
  "${CODEX_HOME:-/home/open-design/.codex}/auth.json" \
  "${CODEX_AUTH_JSON_B64:-}" \
  "${CODEX_AUTH_FILE:-/etc/secrets/codex-auth.json}" \
  "Codex authentication"

materialize_auth \
  "${HOME:-/home/open-design}/.local/share/opencode/auth.json" \
  "${OPENCODE_AUTH_JSON_B64:-}" \
  "${OPENCODE_AUTH_FILE:-/etc/secrets/opencode-auth.json}" \
  "OpenCode authentication"

exec "$@"
