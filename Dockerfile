FROM alpine:latest

# Install deps for nix and basic tools
RUN apk add --no-cache curl xz git bash shadow coreutils

# Create non-root user and nix directory
RUN useradd -m -u 1000 ralph && \
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

# Install claude-code to user's home
RUN mkdir -p ~/.npm-global && \
    . ~/.nix-profile/etc/profile.d/nix.sh && \
    nix develop --command bash -c "npm config set prefix ~/.npm-global && npm install -g @anthropic-ai/claude-code"
ENV PATH="/home/ralph/.npm-global/bin:$PATH"

# Copy scripts
USER root
COPY ralph-once.sh ralph-loop.sh prompt.md /ralph/
RUN mkdir -p /workspace && chown -R ralph:ralph /workspace /ralph && chmod +x /ralph/*.sh

# Switch to non-root user
USER ralph
WORKDIR /workspace

# Default to loop mode
ENTRYPOINT ["/bin/bash", "-c", ". ~/.nix-profile/etc/profile.d/nix.sh && nix develop /ralph --command \"$@\"", "--"]
CMD ["/ralph/ralph-loop.sh"]
