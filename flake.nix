{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        # Use baseline bun on x86_64-linux (no AVX requirement)
        bun = if system == "x86_64-linux" then
          pkgs.bun.overrideAttrs (old: {
            src = pkgs.fetchurl {
              url = "https://github.com/oven-sh/bun/releases/download/bun-v${old.version}/bun-linux-x64-baseline.zip";
              hash = "sha256-a92s1qZYVWmLmBby10hx7aTdC3+pIRQMZEUkj5SnQv0=";
            };
          })
        else
          pkgs.bun;
      in {
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "ralph";
          version = "0.1.0";
          src = ./.;

          nativeBuildInputs = [ bun ];

          # Don't strip - bun binaries embed bytecode that gets corrupted
          dontStrip = true;

          buildPhase = ''
            runHook preBuild
            bun install --frozen-lockfile
            bun build src/cli.ts --compile --outfile ralph
            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall
            mkdir -p $out/bin
            cp ralph $out/bin/ralph
            runHook postInstall
          '';
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            jq
            podman
          ];
        };
      });
}
