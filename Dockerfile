FROM docker.io/debian:bookworm-slim

# Match the host uid/gid of whoever runs `ralph build`, so podman's
# --userns=keep-id maps host user → container `agent` cleanly. Defaults to
# 1000/1000; overridden by `ralph build` via --build-arg.
ARG AGENT_UID=1000
ARG AGENT_GID=1000

# System deps + Playwright Chromium runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl xz-utils git bash ca-certificates \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libatspi2.0-0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Agent user matches host uid/gid so podman's --userns=keep-id maps the host
# user 1:1 to this user inside the container. Nix is installed as agent so
# /nix is owned by the runtime user from the start — no retroactive chmod.
RUN (getent group $AGENT_GID || groupadd -g $AGENT_GID agent) && \
    useradd -m -u $AGENT_UID -g $AGENT_GID agent && \
    mkdir /nix && chown agent:$AGENT_GID /nix

USER agent
ENV USER=agent HOME=/home/agent
RUN curl -L https://nixos.org/nix/install | sh -s -- --no-daemon

# Global nix config so flakes are enabled.
USER root
RUN mkdir -p /etc/nix && \
    echo "experimental-features = nix-command flakes" > /etc/nix/nix.conf

# Node is needed to bootstrap the global claude-code install.
USER agent
RUN . /home/agent/.nix-profile/etc/profile.d/nix.sh && \
    nix-env -iA nixpkgs.nodejs_22

USER root
ENV PATH="/home/agent/.nix-profile/bin:/usr/local/bin:/usr/bin:/bin"

# Install claude-code to /opt and expose as claude-real; the wrapper below
# occupies /usr/local/bin/claude.
RUN npm config set prefix /opt/claude-code && \
    npm install -g @anthropic-ai/claude-code && \
    ln -s /opt/claude-code/bin/claude /usr/local/bin/claude-real

# Playwright browsers baked to a stable path so any runtime uid can use them.
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
RUN mkdir -p $PLAYWRIGHT_BROWSERS_PATH && npx playwright install chromium

# claude wrapper: activates workspace flake if present, else bare claude-real.
COPY claude-wrapper.sh /usr/local/bin/claude
RUN chmod +x /usr/local/bin/claude

# ralph CLI itself, so the agent can use `ralph refs`, `ralph tickets`, etc.
# Dockerfile is intentionally NOT shipped alongside — `ralph loop`/`once`
# locate it via ralphDir(), so those subcommands cannot recurse from inside.
COPY ralph /usr/local/bin/ralph
RUN chmod +x /usr/local/bin/ralph

RUN mkdir -p /home/agent/workspace && chown agent:$AGENT_GID /home/agent/workspace

# Redirect nix per-user state into HOME so nix doesn't try to write to
# /nix/var/nix/profiles/per-user across container restarts.
ENV NIX_STATE_DIR=/home/agent/.nix-state

WORKDIR /home/agent/workspace

# No USER, ENTRYPOINT, or CMD — sandcastle owns lifecycle + user mapping.
