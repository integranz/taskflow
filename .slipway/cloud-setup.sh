#!/usr/bin/env bash
# Setup script for a Claude Code cloud environment (claude.ai/code → environment → setup script) for taskflow.
# Cloud sessions start from a fresh clone; toolchains outside the default image are installed here (runs once, cached ~7 days).
# Must finish within 5 minutes. No secrets here: this file is committed and visible to anyone using the environment.
set -euo pipefail
dotnet tool install -g nbgv >/dev/null 2>&1 || true
# Terraform for read-only plan/validate (apply is never run from a cloud session)
TF_VERSION="$(curl -fsSL https://checkpoint-api.hashicorp.com/v1/check/terraform | sed -E 's/.*"current_version":"([^"]+)".*/\1/')"
curl -fsSL "https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip" -o /tmp/tf.zip && mkdir -p "$HOME/.local/bin" && unzip -oq /tmp/tf.zip -d "$HOME/.local/bin" && export PATH="$HOME/.local/bin:$PATH"
npm ci --prefix . --no-audit --no-fund >/dev/null
echo "toolchain ready: $(command -v dotnet >/dev/null && dotnet --version || echo no-dotnet) terraform $(terraform version -json | sed -E 's/.*"terraform_version":"([^"]+)".*/\1/')"
