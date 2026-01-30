#!/usr/bin/env bash
set -e

# Make workspace group-writable so ralph (in root group) can edit
chmod -R g+w /workspace 2>/dev/null || true

# Copy host claude config to writable location
if [[ -d /claude-host ]]; then
  cp -r /claude-host/. /home/ralph/.claude/ 2>/dev/null || true
  chown -R ralph:ralph /home/ralph/.claude
fi
mkdir -p /home/ralph/.claude/projects/-workspace
chown -R ralph:ralph /home/ralph/.claude/projects

# Trust the bind-mounted workspace for git
su ralph -c "git config --global --add safe.directory /workspace"

# Run command as ralph in nix devshell
CMD=$(printf '%q ' "$@")
exec su ralph -c ". ~/.nix-profile/etc/profile.d/nix.sh && exec nix develop /ralph --command $CMD"
