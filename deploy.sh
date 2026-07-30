#!/bin/sh

# CodingHub deployment entry point. The deployment validator requires this
# script to expose a deploy command from the repository root.
exec "$(dirname "$0")/.codinghub/deploy.sh" deploy "$@"
