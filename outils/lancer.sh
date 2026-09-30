#!/bin/zsh
# Demarre le serveur de Diffusion (s'il ne tourne pas deja) et ouvre la
# page dans le navigateur. `lancer.sh arreter` l'eteint.
# Appele par Diffusion.app ; utilisable aussi a la main (npm run app).

cd "$(dirname "$0")/.." || exit 1
PORT=${DIFFUSION_PORT:-4848}
URL="http://127.0.0.1:$PORT"
PID_FILE=.diffusion.pid

en_route() { curl -fs "$URL/api/ping" >/dev/null 2>&1; }

if [[ "$1" == "arreter" ]]; then
  [[ -f $PID_FILE ]] && kill "$(cat $PID_FILE)" 2>/dev/null
  rm -f $PID_FILE
  exit 0
fi

if ! en_route; then
  # Lance depuis le Finder, le PATH ne contient pas node : on le cherche.
  NODE=$(command -v node)
  [[ -x "$NODE" ]] || NODE=$(ls -d "$HOME"/.nvm/versions/node/*/bin/node(N) 2>/dev/null | sort -V | tail -1)
  for c in /opt/homebrew/bin/node /usr/local/bin/node; do
    [[ -x "$NODE" ]] || { [[ -x $c ]] && NODE=$c; }
  done
  if [[ ! -x "$NODE" ]]; then
    echo "Node.js est introuvable sur ce Mac." >&2
    exit 1
  fi

  nohup "$NODE" outils/serveur.ts > .diffusion.log 2>&1 &
  echo $! > $PID_FILE
  for i in {1..50}; do en_route && break; sleep 0.1; done
  if ! en_route; then
    echo "Le serveur n'a pas demarre. Voir .diffusion.log" >&2
    exit 1
  fi
fi

[[ -z "$SANS_NAVIGATEUR" ]] && open "$URL"
exit 0
