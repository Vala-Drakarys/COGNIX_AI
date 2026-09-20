#!/bin/sh
# Run with an installed Node, or the existing Codex bundled Node on this Mac.
set -eu
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if command -v node >/dev/null 2>&1; then
  engine_node=$(command -v node)
elif [ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]; then
  engine_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  echo 'Node.js 22.13 or newer is required. Install Node, then run this command again.' >&2
  exit 1
fi
if [ "${1:-}" = "--test" ]; then
  cd "$script_dir/../.."
  exec "$engine_node" --test tests/*.test.mjs
fi
exec "$engine_node" "$script_dir/run.mjs" "$@"
