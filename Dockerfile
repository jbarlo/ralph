FROM debian:bookworm-slim

# Install deps for nix, basic tools, and Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl xz-utils git bash ca-certificates \
    # Playwright Chromium dependencies
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libatspi2.0-0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user and nix directory
RUN useradd -m -u 1000 -G root ralph && \
    mkdir -p /home/ralph/.claude && \
    chown -R ralph:ralph /home/ralph && \
    mkdir -m 0755 /nix && chown ralph /nix

# Install nix as ralph user (single-user mode)
USER ralph
RUN curl -L https://nixos.org/nix/install | sh -s -- --no-daemon
ENV PATH="/home/ralph/.nix-profile/bin:$PATH"

# Enable flakes
RUN mkdir -p ~/.config/nix && \
    echo "experimental-features = nix-command flakes" > ~/.config/nix/nix.conf

# Copy flake files
USER root
COPY flake.nix /ralph/
RUN chown -R ralph:ralph /ralph

USER ralph
WORKDIR /ralph

# Build the devshell and cache deps
RUN . ~/.nix-profile/etc/profile.d/nix.sh && nix develop --command true

# Install claude-code and playwright to user's home
RUN mkdir -p ~/.npm-global && \
    . ~/.nix-profile/etc/profile.d/nix.sh && \
    nix develop --command bash -c "npm config set prefix ~/.npm-global && npm install -g @anthropic-ai/claude-code"
ENV PATH="/home/ralph/.npm-global/bin:$PATH"

# Install Playwright with Chromium only
RUN . ~/.nix-profile/etc/profile.d/nix.sh && \
    nix develop --command npx playwright install chromium

# Copy scripts
USER root
COPY ralph-once.sh prompt.md entrypoint.sh /ralph/
RUN mkdir -p /workspace && chown -R ralph:ralph /workspace /ralph && chmod +x /ralph/*.sh

# Entrypoint starts as root to fix perms, then drops to ralph
USER root
WORKDIR /workspace
ENTRYPOINT ["/ralph/entrypoint.sh"]
CMD ["/ralph/ralph-once.sh"]
