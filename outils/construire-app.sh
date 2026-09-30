#!/bin/zsh
# Construit Diffusion.app (l'icone du Dock) : l'AppleScript compile, puis son icone.
cd "$(dirname "$0")/.." || exit 1
set -e
rm -rf Diffusion.app
osacompile -s -o Diffusion.app outils/Diffusion.applescript
[[ -f outils/icone-mac-1024.png ]] || python3 outils/icones.py
SET=$(mktemp -d)/Diffusion.iconset
mkdir -p "$SET"
for t in 16 32 128 256 512; do
  sips -z $t $t outils/icone-mac-1024.png --out "$SET/icon_${t}x${t}.png" >/dev/null
  sips -z $((t * 2)) $((t * 2)) outils/icone-mac-1024.png --out "$SET/icon_${t}x${t}@2x.png" >/dev/null
done
iconutil -c icns "$SET" -o Diffusion.app/Contents/Resources/applet.icns
# L'icone par defaut d'osacompile (Assets.car) passerait devant la notre.
rm -f Diffusion.app/Contents/Resources/Assets.car
plutil -remove CFBundleIconName Diffusion.app/Contents/Info.plist 2>/dev/null || true
codesign --force --sign - Diffusion.app 2>/dev/null
touch Diffusion.app
echo "Diffusion.app construite : glisse-la dans le Dock."
