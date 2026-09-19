#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
if command -v node >/dev/null 2>&1; then
  cognix_node="$(command -v node)"
elif [ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]; then
  cognix_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  echo 'Please install Node.js 22.13 or newer, then reopen this file.'
  read -r -p 'Press Return to close.'
  exit 1
fi
"$cognix_node" --env-file-if-exists=.env server.mjs
