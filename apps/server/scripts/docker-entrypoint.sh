#!/bin/sh
set -e
pnpm --filter @p42/server run migrate
pnpm --filter @p42/server run start
