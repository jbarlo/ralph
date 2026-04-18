#!/usr/bin/env bash
set -e

# Make workspace group-writable so ralph (in root group) can edit
chmod -R g+w /workspace 2>/dev/null || true

# Copy host claude config to writable location
if [[ -d /claude-host ]]; then
  cp -r /claude-host/. /home/ralph/.claude/ 2>/dev/null || true
  chown -R ralph:ralph /home/ralph/.claude
fi
if [[ -f /claude-host.json ]]; then
  cp /claude-host.json /home/ralph/.claude.json 2>/dev/null || true
  chown ralph:ralph /home/ralph/.claude.json
fi
mkdir -p /home/ralph/.claude/projects/-workspace
chown -R ralph:ralph /home/ralph/.claude/projects

# Trust the bind-mounted workspace for git.
# sharedRepository=group ensures new .git/objects are group-writable, so
# rootless Docker UID remapping doesn't create objects only ralph can access.
# Set globally (not per-repo) to avoid mutating the host's .git/config.
# Use /tmp to avoid "Device or resource busy" on /home/ralph/.gitconfig
export GIT_CONFIG_GLOBAL="/tmp/ralph-gitconfig"
su ralph -c "git config --global --add safe.directory /workspace && git config --global core.sharedRepository group && git config --global user.name ralph && git config --global user.email ralph@noreply.local"

# Run command as ralph in nix devshell
CMD=$(printf '%q ' "$@")
exec su ralph -c ". ~/.nix-profile/etc/profile.d/nix.sh && exec nix develop /ralph --command $CMD"
