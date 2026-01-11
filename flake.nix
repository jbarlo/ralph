{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            pnpm
            git
            jq
            just
            # claude-code installed via npm in shellHook
          ];

          shellHook = ''
            export PATH="$PWD/node_modules/.bin:$PATH"

            # Install claude-code if not present
            if ! command -v claude &> /dev/null; then
              echo "Installing claude-code..."
              npm install -g @anthropic-ai/claude-code
            fi
          '';
        };
      });
}
