#!/usr/bin/env bash
set -eo pipefail
# shellcheck source=ensure-node24.sh
source "$(dirname "$0")/ensure-node24.sh"
exec "$@"
