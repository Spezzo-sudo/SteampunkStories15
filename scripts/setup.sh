#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env.local ]; then
  cat <<'ENV' > .env.local
VITE_BASE_URL=/
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_WORLD_ID=playtest-world
ENV
  echo "Created .env.local with placeholder Firebase configuration."
fi

if [ ! -d node_modules ]; then
  echo "Installing web dependencies…"
  npm install
fi

if [ ! -d functions/node_modules ]; then
  echo "Installing Cloud Functions dependencies…"
  (cd functions && npm install)
fi

echo "Setup complete. Populate .env.local with your Firebase credentials before starting the dev server."
