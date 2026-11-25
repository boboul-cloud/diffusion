#!/bin/zsh
# Garde le serveur de Diffusion toujours allume, pour que l'app Diffusion
# installee par Chrome marche a tout moment.
#
#   npm run service             installe (ou reinstalle)
#   npm run service -- enlever  enleve tout : le serveur ne tourne plus
#
# Installe « Diffusion serveur » dans ~/Applications : une app sans icone
# dans le Dock, qui demarre le serveur et le relance s'il s'arrete (voir
# outils/DiffusionServeur.applescript). macOS l'ouvre a chaque ouverture de
# session. Pourquoi une app plutot qu'un service macOS : un service
# d'arriere-plan n'a pas le droit de lire le disque Travail (disque externe),
# une app si, une fois autorisee.

cd "$(dirname "$0")/.." || exit 1
RACINE=$PWD
NOM="Diffusion serveur"
APP="$HOME/Applications/$NOM.app"
LABEL=local.diffusion.serveur
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAINE="gui/$(id -u)"
PORT=${DIFFUSION_PORT:-4848}

launchctl bootout "$DOMAINE/$LABEL" 2>/dev/null
pgrep -qf "$NOM.app/Contents/MacOS/applet" && osascript -e "quit app \"$NOM\"" 2>/dev/null

if [[ "$1" == "enlever" ]]; then
  rm -f "$PLIST"
  rm -rf "$APP"
  zsh outils/lancer.sh arreter
  echo "Service enlevé : le serveur de Diffusion ne tourne plus (l'icône Diffusion le relance pour une fois)."
  exit 0
fi

# L'app, avec le chemin de Diffusion dedans.
mkdir -p "$HOME/Applications"
TMP=$(mktemp -d)
sed "s|@RACINE@|$RACINE|g" outils/DiffusionServeur.applescript > "$TMP/serveur.applescript"
rm -rf "$APP"
osacompile -s -o "$APP" "$TMP/serveur.applescript" || exit 1
plutil -replace LSUIElement -bool true "$APP/Contents/Info.plist"
if [[ -f Diffusion.app/Contents/Resources/applet.icns ]]; then
  cp Diffusion.app/Contents/Resources/applet.icns "$APP/Contents/Resources/applet.icns"
  rm -f "$APP/Contents/Resources/Assets.car"
  plutil -remove CFBundleIconName "$APP/Contents/Info.plist" 2>/dev/null
fi
codesign --force --sign - "$APP" 2>/dev/null

# A chaque ouverture de session, macOS ouvre l'app (sans lire le disque Travail lui-meme).
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/open</string>
    <string>-g</string>
    <string>$APP</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
EOF
plutil -lint -s "$PLIST" || exit 1
launchctl bootstrap "$DOMAINE" "$PLIST" || exit 1

for i in {1..100}; do curl -fs "http://127.0.0.1:$PORT/api/ping" >/dev/null 2>&1 && break; sleep 0.2; done
if curl -fs "http://127.0.0.1:$PORT/api/ping" >/dev/null 2>&1; then
  echo "Service installé : le serveur de Diffusion tourne (http://127.0.0.1:$PORT), et tournera à chaque ouverture de session."
else
  echo "« $NOM » est installée mais le serveur ne répond pas encore. Si macOS demande l'autorisation d'accéder au disque Travail, clique sur Autoriser." >&2
  exit 1
fi
