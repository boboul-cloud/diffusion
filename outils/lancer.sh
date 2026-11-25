#!/bin/zsh
# Ouvre Diffusion : demarre le serveur s'il ne tourne pas, puis ouvre la
# fenetre de l'app Diffusion installee par Chrome (sinon la page dans le
# navigateur). `lancer.sh arreter` eteint un serveur lance par ce script.
# Appele par Diffusion.app ; utilisable aussi a la main (npm run app).
#
# Avec `npm run service`, l'app « Diffusion serveur » appelle ce script
# toutes les 30 s (SANS_NAVIGATEUR=1) : le serveur est relance s'il s'arrete.

cd "$(dirname "$0")/.." || exit 1
PORT=${DIFFUSION_PORT:-4848}
URL="http://127.0.0.1:$PORT"
PID_FILE=.diffusion.pid
APP_CHROME="$HOME/Applications/Chrome Apps.localized/Diffusion.app"

en_route() { curl -fs "$URL/api/ping" >/dev/null 2>&1; }

if [[ "$1" == "arreter" ]]; then
  [[ -f $PID_FILE ]] && kill "$(cat $PID_FILE)" 2>/dev/null
  rm -f $PID_FILE
  exit 0
fi

if ! en_route; then
  source outils/node.sh
  if [[ ! -x "$NODE" ]]; then
    echo "Node.js est introuvable sur ce Mac." >&2
    exit 1
  fi
  # Lance depuis une app, le PATH est minimal : le serveur a besoin de gh (Homebrew).
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
  nohup "$NODE" outils/serveur.ts > .diffusion.log 2>&1 &
  echo $! > $PID_FILE
  for i in {1..50}; do en_route && break; sleep 0.1; done
  if ! en_route; then
    echo "Le serveur n'a pas demarre. Voir .diffusion.log" >&2
    exit 1
  fi
fi

if [[ -z "$SANS_NAVIGATEUR" ]]; then
  if [[ -d "$APP_CHROME" ]]; then open "$APP_CHROME"; else open "$URL"; fi
fi
exit 0
