# Diffusion

Fait connaître tes apps partout : réseaux sociaux, vidéo, forums, presse,
messages, Apple, web et affiches. Pour chaque app et chaque canal, Diffusion
écrit le texte, dessine le visuel et ouvre le bon écran déjà rempli.
**Il ne publie jamais à ta place : c'est toi qui cliques.**

## Ouvrir

- **Sur le Mac** : l'icône **Diffusion** du Dock (ou double-clic sur
  `Diffusion.app` dans ce dossier ; glisse-la dans le Dock la première fois).
  La page s'ouvre dans le navigateur. Quitter l'app (clic droit sur l'icône du
  Dock ▸ Quitter) l'éteint. Sans le Dock : `npm run app`.
- **Sur l'iPhone ou l'iPad, même Wi-Fi** : l'adresse « sur le Wi-Fi » écrite
  dans `.diffusion.log` (du genre `http://192.168.1.187:4848`). Tout marche
  sauf le partage d'images par la feuille de partage d'iOS et l'installation
  sur l'écran d'accueil : iOS les réserve aux sites en **https**.
- **Partout, installable** : mettre le dossier `public/` en ligne en https
  (GitHub Pages, comme les sites de tes apps). Voir plus bas.

## Utiliser

1. **Apps** : tes apps, les moins diffusées d'abord : celles de l'App Store,
   les **apps web** du Dico et celles pas encore publiées. **Ajouter ou enlever
   des apps** (sur le Mac) choisit lesquelles Diffusion fait connaître (voir
   plus bas).
2. Une app ▸ **Publier** : « Par où continuer » propose les canaux dans
   l'ordre conseillé pour un lancement. Un canal ouvert montre :
   - le texte, modifiable, avec le compteur de la limite du réseau ;
     « Autre version » en propose une autre ;
   - le visuel au bon format ;
   - les boutons : **Ouvrir** le réseau déjà rempli, **Partager l'image**
     (iPhone : la légende est copiée, colle-la), **Écrire l'e-mail**,
     **Copier**, **Enregistrer l'image** ;
   - pour Reddit et la presse, la liste des forums et des rédactions ;
   - les conseils propres au canal ;
   - **C'est publié** : la date va dans le **Journal**, avec le lien du post.
3. **FR / EN** en haut : la langue des textes. Product Hunt, Hacker News,
   Indie Hackers et AlternativeTo sont toujours en anglais.
   **Présentation / Nouveautés** : parler de l'app, ou de sa dernière version.
4. **Visuels** : les 7 formats d'un coup, avec le modèle (Vitrine, Trio,
   Accroche), la capture principale, iPhone ou iPad, la couleur et le QR code.
5. **Fiche** : ce que les textes reprennent (sous-titre, accroche, points
   forts, public, hashtags, lien). Un champ vide garde la proposition
   automatique. À faire en anglais pour les apps sans fiche anglaise.
6. **Réglages** : ton e-mail et ta ville (communiqués, presse locale), ta
   présentation, tes hashtags, ton serveur Mastodon ; sauvegarde du suivi.

## Les 37 canaux

| Famille | Canaux |
|---|---|
| Réseaux sociaux | Instagram (publication, story), Facebook, groupes Facebook, X, Threads, Bluesky, Mastodon, LinkedIn, Pinterest, Tumblr, Snapchat |
| Vidéo | TikTok, Instagram Reels, YouTube Shorts, YouTube (démo) : script plan par plan + légende |
| Communautés | Reddit, Product Hunt, Hacker News (Show HN), Indie Hackers, AlternativeTo, forums du thème, Discord |
| Presse et médias | Communiqué (.txt, impression/PDF), e-mail aux journalistes, presse et radio locales, blogueurs et YouTubeurs, dossier de presse (.zip) |
| Messages | E-mail aux proches, WhatsApp, Telegram, SMS/iMessage, newsletter, signature d'e-mail |
| Apple, web, imprimé | Nomination App Store Connect, page web de l'app (index.html autonome), affiche A4 avec QR code |

Ces canaux-là restent en « prépare, tu cliques ». Seul Instagram est automatique (voir plus bas) : sur Reddit, les forums ou la presse, un message automatique passe pour du spam.

Liens de partage et limites vérifiés en septembre 2026 (voir `public/js/canaux.js`).

## Ajouter ou enlever des apps

Bouton **Ajouter ou enlever des apps** en haut de la page Apps, sur le Mac.

- Arrivent d'elles-mêmes, à chaque « Mettre à jour » : tes apps de l'App Store
  (même si leur projet n'est plus sur le Mac : la page développeur les donne
  toutes), les **apps web du Dico** (`/Volumes/Travail/Dico/js/data.js`), et
  les apps pas encore publiées dont la feuille `SOUMISSION.md` est prête.
- **Ajouter** : pour une app que Diffusion ne trouve pas, colle le lien de sa
  fiche App Store, ou l'adresse d'une app web : son nom, sa description et
  son icône sont lus sur sa page.
- **Enlever** : l'app sort de Diffusion, de la page « lien en bio » et de la
  publication automatique. Elle reste en bas de la page, prête à revenir
  (« Remettre » ; pour Instagram, il faut la recocher dans Auto).

Tes choix sont dans `liste-apps.json`, sur le Mac seulement (pas sur GitHub).

## Les apps web

Elles viennent du Dico : nom, définition, domaine, icône. N'ayant pas de fiche
App Store, leurs **captures** sont prises en ligne par Chrome sans fenêtre,
comme sur un iPhone puis un iPad, 3D comprise (une seule fois : `npm run
importer -- --forcer` pour les refaire). Leurs textes disent « Gratuit, dans
ton navigateur » au lieu de l'App Store, et la nomination Apple ne les concerne
pas. Le disque Travail débranché, l'import garde les apps web de la fois
d'avant.

## La page « lien en bio »

Instagram ne rend pas cliquables les liens des légendes : elles disent « lien
en bio », puis « ou cherchez « Nom de l'app » sur l'App Store » pour les apps
que la recherche de l'App Store trouve par leur nom (dans les 3 premiers
résultats : vérifié à l'import, ou seul avec `node outils/recherche.ts`).
L'adresse à mettre dans la bio Instagram, une fois pour toutes :
**https://boboul-cloud.github.io/diffusion/** (GitHub Pages, dossier `docs/`).

En haut, l'app du dernier post, avec son bouton (App Store, ou l'app web
elle-même) ; puis les derniers posts, comme la grille d'Instagram (un toucher
ouvre l'app du post) ; puis toutes les apps, App Store et web. Le robot la
refait à chaque passage ; un post programmé la veille y apparaît tout seul à
son heure. Le Mac la refait aussi quand la liste change. À la main :
`node outils/bio.ts`.

## Publication automatique sur Instagram

Menu **Auto** : tu coches les apps à mettre en avant, leur ordre, les jours et
l'heure, puis **Enregistrer et envoyer sur GitHub**. Ensuite, plus rien à faire :

- un robot tourne sur GitHub toutes les heures, Mac éteint compris ;
- la veille de chaque créneau, il écrit la légende, dessine le visuel (4:5)
  et confie la publication à **Buffer**, qui la publie sur Instagram à l'heure
  pile. Tu la vois, et peux la modifier ou l'annuler, dans l'app Buffer ;
- les apps passent à tour de rôle ; texte, modèle de visuel et capture
  changent à chaque passage ;
- ce qui est parti (avec le lien Instagram) ou raté s'affiche dans la page Auto.

Pourquoi Buffer : Instagram n'autorise la publication automatique que par son
API, qui demande un compte Facebook et une app développeur Meta. Buffer a déjà
cet accès ; son offre gratuite suffit (3 réseaux, 10 publications en attente).

Mise en service, une seule fois : le guide « Relier Instagram » en bas de la
page Auto (compte Instagram professionnel, compte Buffer, clé Buffer à coller
dans les secrets du dépôt GitHub sous le nom `BUFFER_API_KEY`). La clé dure
un an au plus : Buffer prévient par e-mail avant l'échéance.

Le robot : `.github/workflows/instagram.yml` et `outils/automatique.ts`.
Essai sur le Mac sans rien publier : `node outils/automatique.ts --essai riskelo`.
Le dossier `publication/` (planning, journal, images publiées) est public sur
GitHub ; il ne contient ni clé ni mot de passe, ni les apps pas encore sorties.

## Mettre à jour les apps

Bouton **Mettre à jour depuis mes projets** en bas de la liste (sur le Mac),
ou `npm run importer`. L'import :

- trouve tes projets Xcode dans `/Volumes/Travail/Projets` et sur le Bureau
  (avec le code d'AgentDouble, pris dans `~/Desktop/AgentDouble`), et tes
  autres apps publiées par ta page développeur de l'App Store ; pour d'autres
  dossiers : `AGENTDOUBLE_PROJETS=/dossier1:/dossier2 npm run importer`, et
  `AGENT_DOUBLE=/chemin` si AgentDouble est ailleurs ;
- lit la fiche publique de l'App Store des apps en ligne : nom, description,
  icône, captures, lien, en français et en anglais ;
- lit dans **App Store Connect, en lecture seule**, avec la clé d'AgentDouble,
  le sous-titre, le texte promotionnel et les mots-clés de la version en ligne ;
- lit le `SOUMISSION.md` du projet pour les apps pas encore publiées
  (icône Icon Composer comprise) ;
- lit les apps web du Dico et les photographie en ligne ;
- copie icônes et captures dans `public/data/apps/`.

Options : `-- --en-ligne` (seulement les apps publiées), `-- --forcer`
(retélécharge les images), `-- --sans-asc` (sans App Store Connect).

## Mettre Diffusion en ligne (https)

Tout le site est dans `public/` : des fichiers statiques, sans serveur.
Avant de le publier, `npm run importer -- --en-ligne`, pour ne pas mettre en
ligne les descriptions des apps pas encore sorties. Ensuite, un dépôt GitHub
avec GitHub Pages sur ce dossier, et Diffusion s'installe sur l'iPhone
(Safari ▸ Partager ▸ Sur l'écran d'accueil), l'iPad, Android et les PC.

## Où sont les données

| | |
|---|---|
| `public/data/apps.json` | les fiches importées (et, à part, les apps enlevées) |
| `liste-apps.json` | tes choix : apps enlevées, apps ajoutées par leur lien (sur le Mac) |
| `docs/` | la page « lien en bio » (GitHub Pages) |
| `public/data/apps/<app>/` | icône et captures |
| le navigateur de chaque appareil | réglages, suivi, textes retouchés : Réglages ▸ Sauvegarder / Restaurer pour passer de l'un à l'autre |

## Ce que Diffusion ne fait jamais

- Publier, poster ou envoyer à ta place.
- Écrire chez Apple : App Store Connect est lu, rien n'y est modifié.
- Modifier tes projets Xcode : ils sont lus, c'est tout.

## Pour dépanner

- `npm test` : les textes de toutes tes apps sur tous les canaux, les limites
  des réseaux, les liens de partage, le .zip.
- `.diffusion.log` : le journal du serveur.
- Icône du Dock cassée après un déplacement du dossier : `npm run construire-app`.
- Nouvelle icône : `npm run icones`, puis `npm run construire-app`.
