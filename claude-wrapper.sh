#!/bin/sh
# Activate the workspace flake if present; otherwise invoke claude directly.
if [ -f flake.nix ]; then
  exec nix develop --command claude-real "$@"
else
  exec claude-real "$@"
fi
