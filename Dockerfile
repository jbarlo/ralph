FROM docker.io/debian:bookworm-slim

# System deps + Playwright Chromium runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl xz-utils git bash ca-certificates \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libatspi2.0-0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Dedicated user for the nix install. Runtime uid differs; the store is made
# world-accessible further down so any uid can use + extend it.
RUN useradd -m -u 1500 nixer && \
    mkdir -m 1777 /nix && chown nixer /nix

USER nixer
ENV USER=nixer HOME=/home/nixer
RUN curl -L https://nixos.org/nix/install | sh -s -- --no-daemon

# Global nix config so runtime users (any uid) see flakes enabled.
USER root
RUN mkdir -p /etc/nix && \
    echo "experimental-features = nix-command flakes" > /etc/nix/nix.conf

USER nixer

# Node is needed to bootstrap the global claude-code install.
RUN . /home/nixer/.nix-profile/etc/profile.d/nix.sh && \
    nix-env -iA nixpkgs.nodejs_22

USER root
ENV PATH="/home/nixer/.nix-profile/bin:/usr/local/bin:/usr/bin:/bin"

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

# Open /nix for runtime use by any uid. No sticky bit: nix needs to replace
# cached store entries (unlink + create), which the sticky bit would block
# for non-owners. Acceptable in an ephemeral container sandbox.
RUN chmod -R a+rwX /nix

# Agent user at uid 1000 so podman's --userns=keep-id maps host uid 1000 to
# this user inside the container (HOME is genuinely owned by runtime user).
USER root
RUN /usr/sbin/useradd -m -u 1000 -U agent && \
    mkdir -p /home/agent/workspace && \
    chown -R agent:agent /home/agent

# Redirect nix per-user state into HOME so nix doesn't try to chmod
# /nix/var/nix/profiles/per-user (which it doesn't own at runtime).
ENV NIX_STATE_DIR=/home/agent/.nix-state

WORKDIR /home/agent/workspace

# No USER, ENTRYPOINT, or CMD — sandcastle owns lifecycle + user mapping.
