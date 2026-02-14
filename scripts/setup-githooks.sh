#!/usr/bin/env sh
set -e

git config core.hooksPath .githooks
echo "Configured git hooks path: .githooks"
