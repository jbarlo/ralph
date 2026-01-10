FROM nixos/nix:latest

# Enable flakes
RUN echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf

# Copy flake files
COPY flake.nix /ralph/
WORKDIR /ralph

# Build the devshell and cache deps
RUN nix develop --command true

# Install claude-code globally
RUN nix develop --command npm install -g @anthropic-ai/claude-code

# Copy scripts
COPY ralph-once.sh ralph-loop.sh prompt.md /ralph/
RUN chmod +x /ralph/*.sh

# Workspace is where the user's project gets mounted
WORKDIR /workspace

# Default to loop mode, can override with ralph-once.sh
ENTRYPOINT ["nix", "develop", "/ralph", "--command"]
CMD ["/ralph/ralph-loop.sh"]
