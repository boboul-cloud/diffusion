# Trouve node, a sourcer : definit NODE (vide s'il est introuvable).
# Lance depuis le Finder ou par macOS, le PATH ne le contient pas :
# on prend le plus recent de nvm, puis celui de Homebrew.
NODE=$(command -v node)
[[ -x "$NODE" ]] || NODE=$(ls -d "$HOME"/.nvm/versions/node/*/bin/node(N) 2>/dev/null | sort -V | tail -1)
for c in /opt/homebrew/bin/node /usr/local/bin/node; do
  [[ -x "$NODE" ]] || { [[ -x $c ]] && NODE=$c; }
done
