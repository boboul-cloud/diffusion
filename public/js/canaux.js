// Tous les endroits ou faire connaitre une app, et comment y publier.
//
// Aucun reseau n'est appele : chaque canal sait ouvrir la bonne page,
// deja remplie quand le reseau le permet. Sinon le texte est copie et
// il n'y a plus qu'a le coller. Liens verifies en septembre 2026.

export const GROUPES = [
  { id: 'reseaux', nom: 'Réseaux sociaux' },
  { id: 'video', nom: 'Vidéo' },
  { id: 'communautes', nom: 'Communautés' },
  { id: 'presse', nom: 'Presse et médias' },
  { id: 'messages', nom: 'Messages et e-mail' },
  { id: 'web', nom: 'Apple, web et imprimé' },
];

/** Les formats d'image, au pixel pres. */
export const FORMATS = {
  portrait: { l: 1080, h: 1440, nom: 'Portrait 3:4', usage: 'Instagram, Threads, Tumblr' },
  instagram: { l: 1080, h: 1350, nom: 'Portrait 4:5', usage: 'Publication automatique Instagram' },
  carre: { l: 1080, h: 1080, nom: 'Carré', usage: 'Facebook, LinkedIn, WhatsApp' },
  story: { l: 1080, h: 1920, nom: 'Story 9:16', usage: 'Stories, TikTok, Reels, Shorts' },
  paysage: { l: 1600, h: 900, nom: 'Paysage 16:9', usage: 'X, Bluesky, Reddit, YouTube' },
  lien: { l: 1200, h: 630, nom: 'Aperçu de lien', usage: 'Site web, newsletter' },
  epingle: { l: 1000, h: 1500, nom: 'Épingle 2:3', usage: 'Pinterest' },
  galerie: { l: 1270, h: 760, nom: 'Galerie', usage: 'Product Hunt' },
};

const enc = encodeURIComponent;
const val = (champs, cle) => champs.find((c) => c.cle === cle)?.valeur ?? '';
const texte = (champs) => val(champs, 'texte');

/** Un e-mail pret a envoyer : objet et message, retours a la ligne compris. */
const mailto = (champs) =>
  `mailto:?subject=${enc(val(champs, 'objet'))}&body=${enc(val(champs, 'corps').replace(/\r?\n/g, '\r\n'))}`;

// ---------------------------------------------------------------
//  Ou envoyer : forums, medias
// ---------------------------------------------------------------

const SUBREDDITS = {
  en: [
    { nom: 'r/iosapps', sub: 'iosapps', note: 'le forum des apps iOS' },
    { nom: 'r/SideProject', sub: 'SideProject', note: 'projets personnels' },
    { nom: 'r/iOSProgramming', sub: 'iOSProgramming', note: 'autopromotion limitée : lis les règles' },
    { nom: 'r/AppHookup', sub: 'AppHookup', note: 'seulement pour une promo ou une app payante devenue gratuite' },
  ],
  fr: [{ nom: 'r/developpeurs', sub: 'developpeurs', note: 'communauté francophone de développeurs' }],
  GAMES: [{ nom: 'r/iosgaming', sub: 'iosgaming', note: 'jeux iOS' }],
  ipad: [{ nom: 'r/ipad', sub: 'ipad', note: 'si l’app brille sur iPad' }],
};

export const MEDIAS = {
  fr: [
    { nom: 'iGeneration', url: 'https://www.igen.fr' },
    { nom: 'iPhoneSoft', url: 'https://iphonesoft.fr' },
    { nom: 'iPhon.fr', url: 'https://www.iphon.fr' },
    { nom: 'iPhoneAddict', url: 'https://iphoneaddict.fr' },
    { nom: 'Mac4Ever', url: 'https://www.mac4ever.com' },
    { nom: 'Consomac', url: 'https://consomac.fr' },
    { nom: 'Journal du Geek', url: 'https://www.journaldugeek.com' },
    { nom: 'Presse-citron', url: 'https://www.presse-citron.net' },
    { nom: 'Korben', url: 'https://korben.info' },
    { nom: 'Numerama', url: 'https://www.numerama.com' },
    { nom: 'Clubic', url: 'https://www.clubic.com' },
    { nom: '01net', url: 'https://www.01net.com' },
    { nom: 'Les Numériques', url: 'https://www.lesnumeriques.com' },
  ],
  en: [
    { nom: 'MacStories', url: 'https://www.macstories.net' },
    { nom: '9to5Mac', url: 'https://9to5mac.com' },
    { nom: 'MacRumors', url: 'https://www.macrumors.com' },
    { nom: 'AppleInsider', url: 'https://appleinsider.com' },
    { nom: 'Cult of Mac', url: 'https://www.cultofmac.com' },
  ],
  EDUCATION: [
    { nom: 'Le Café pédagogique', url: 'https://www.cafepedagogique.net' },
    { nom: 'VousNousIls', url: 'https://www.vousnousils.fr' },
    { nom: 'Ludomag', url: 'https://www.ludomag.com' },
  ],
  GAMES: [
    { nom: 'Jeuxvideo.com', url: 'https://www.jeuxvideo.com' },
    { nom: 'Gamekult', url: 'https://www.gamekult.com' },
    { nom: 'Tric Trac (jeux de société)', url: 'https://www.trictrac.net' },
  ],
};

// ---------------------------------------------------------------
//  Les canaux
// ---------------------------------------------------------------
//
// style      la facon d'ecrire (voir textes.js)
// limite     caracteres du texte principal ; compte : 'x' ou 'graphemes'
// hashtags   combien au plus
// langue     'en' : ce canal ne se fait qu'en anglais
// format     le visuel qui l'accompagne (FORMATS)
// partage    true : sur telephone, l'image part par la feuille de partage
// ouvrir     l'adresse a ouvrir, deja remplie si possible
// copie      true : le texte est copie avant d'ouvrir (le reseau ne le reprend pas)
// fichier    'txt' | 'zip' | 'html' | 'imprimer' : ce que le bouton principal produit

export const CANAUX = [
  // ---------------- Reseaux sociaux ----------------
  {
    id: 'instagram-post', nom: 'Instagram', precision: 'publication', groupe: 'reseaux',
    couleur: '#E1306C', sigle: 'IG', style: 'legende', limite: 2200, hashtags: 5, format: 'portrait',
    partage: true, copie: true,
    ouvrir: () => 'https://www.instagram.com/',
    conseils: [
      'Sur iPhone, « Partager l’image » copie la légende puis ouvre la feuille de partage : choisis Instagram et colle la légende.',
      'Instagram ne garde que 5 hashtags par publication.',
      'Un lien dans une légende n’est pas cliquable : mets celui de l’App Store dans ta bio.',
    ],
  },
  {
    id: 'instagram-story', nom: 'Instagram', precision: 'story', groupe: 'reseaux',
    couleur: '#C13584', sigle: 'IG', style: 'story', format: 'story', partage: true, copie: true,
    ouvrir: () => 'https://www.instagram.com/',
    conseils: [
      'Ajoute l’autocollant « Lien » avec l’adresse ci-dessus : c’est le seul lien cliquable d’Instagram.',
      'Garde-la ensuite « À la une » sur ton profil.',
    ],
  },
  {
    id: 'facebook', nom: 'Facebook', precision: 'page ou profil', groupe: 'reseaux',
    couleur: '#1877F2', sigle: 'f', style: 'social', limite: 63206, hashtags: 3, format: 'carre',
    partage: true, copie: true,
    ouvrir: (ch, c) => (c.lien ? `https://www.facebook.com/sharer/sharer.php?u=${enc(c.lien)}` : 'https://www.facebook.com/'),
    conseils: [
      'Facebook ne reprend pas le texte d’un lien de partage : il est copié, colle-le dans la publication.',
      'Publie depuis ta page et depuis ton profil : tes proches partagent plus volontiers.',
    ],
  },
  {
    id: 'facebook-groupes', nom: 'Groupes Facebook', groupe: 'reseaux',
    couleur: '#0866FF', sigle: 'fG', style: 'communaute', format: 'carre', partage: true, copie: true,
    ouvrir: () => 'https://www.facebook.com/groups/feed/',
    conseils: [
      'Lis les règles du groupe : beaucoup demandent l’accord d’un admin avant de parler d’une app.',
      (c) => `Où chercher : ${c.communautes.join(', ')}.`,
      'Un message par groupe, jamais le même le même jour : Facebook bloque les copier-coller en série.',
    ],
  },
  {
    id: 'x', nom: 'X', groupe: 'reseaux',
    couleur: '#000000', sigle: '𝕏', style: 'court', limite: 280, compte: 'x', hashtags: 2, format: 'paysage',
    ouvrir: (ch) => `https://x.com/intent/tweet?text=${enc(texte(ch))}`,
    conseils: [
      'Un lien compte pour 23 caractères, quelle que soit sa longueur.',
      'Pour l’image : enregistre le visuel, puis ajoute-le dans la fenêtre de X.',
      'Épingle la publication sur ton profil pendant la semaine de lancement.',
    ],
  },
  {
    id: 'threads', nom: 'Threads', groupe: 'reseaux',
    couleur: '#101010', sigle: '@', style: 'court', limite: 500, hashtags: 1, format: 'portrait',
    ouvrir: (ch) => `https://www.threads.com/intent/post?text=${enc(texte(ch))}`,
    conseils: ['Threads n’accepte qu’un seul sujet (#) par publication.', 'Ajoute le visuel dans la fenêtre de Threads.'],
  },
  {
    id: 'bluesky', nom: 'Bluesky', groupe: 'reseaux',
    couleur: '#1185FE', sigle: '🦋', style: 'court', limite: 300, compte: 'graphemes', hashtags: 2, format: 'paysage',
    ouvrir: (ch) => `https://bsky.app/intent/compose?text=${enc(texte(ch))}`,
    conseils: ['300 caractères au plus, lien compris.', 'Ajoute le visuel dans la fenêtre de Bluesky.'],
  },
  {
    id: 'mastodon', nom: 'Mastodon', groupe: 'reseaux',
    couleur: '#6364FF', sigle: 'M', style: 'court', limite: 500, hashtags: 4, format: 'paysage',
    ouvrir: (ch, c, env) =>
      env.mastodon
        ? `https://${env.mastodon.replace(/^https?:\/\//, '').replace(/\/$/, '')}/share?text=${enc(texte(ch))}`
        : `https://share.joinmastodon.org/#text=${enc(texte(ch))}`,
    conseils: [
      'Sans serveur indiqué dans Réglages, Mastodon te demande le tien avant d’ouvrir la fenêtre.',
      'Les hashtags en CamelCase (#HorsLigne) sont bien lus par les lecteurs d’écran.',
    ],
  },
  {
    id: 'linkedin', nom: 'LinkedIn', groupe: 'reseaux',
    couleur: '#0A66C2', sigle: 'in', style: 'pro', limite: 3000, hashtags: 3, format: 'carre', copie: true,
    ouvrir: (ch, c, env) =>
      env.mobile
        ? c.lien
          ? `https://www.linkedin.com/sharing/share-offsite/?url=${enc(c.lien)}`
          : 'https://www.linkedin.com/feed/'
        : `https://www.linkedin.com/feed/?shareActive=true&text=${enc(texte(ch))}`,
    conseils: [
      'Sur ordinateur, LinkedIn s’ouvre avec le texte déjà rempli ; sur téléphone, colle le texte copié.',
      'Une image ou une courte vidéo : les publications avec un visuel sont bien plus vues.',
    ],
  },
  {
    id: 'pinterest', nom: 'Pinterest', groupe: 'reseaux',
    couleur: '#E60023', sigle: 'P', style: 'pinterest', hashtags: 5, format: 'epingle', partage: true,
    ouvrir: (ch, c, env) =>
      env.imagePublique
        ? `https://www.pinterest.com/pin/create/button/?url=${enc(val(ch, 'lien'))}&media=${enc(env.imagePublique)}&description=${enc(val(ch, 'description'))}`
        : 'https://www.pinterest.com/pin-creation-tool/',
    conseils: [
      'Enregistre l’épingle (2:3), puis dépose-la dans l’outil de création de Pinterest avec le titre, la description et le lien.',
      'Crée un tableau « Mes apps » pour les regrouper.',
    ],
  },
  {
    id: 'tumblr', nom: 'Tumblr', groupe: 'reseaux',
    couleur: '#36465D', sigle: 't', style: 'court', limite: 4096, hashtags: 5, format: 'portrait',
    ouvrir: (ch, c) =>
      `https://www.tumblr.com/widgets/share/tool?posttype=link&canonicalUrl=${enc(c.lien || c.site)}&content=${enc(c.lien || c.site)}&title=${enc(c.nom)}&caption=${enc(texte(ch))}&tags=${enc(c.hashtags.slice(0, 5).map((h) => h.slice(1)).join(','))}`,
    conseils: ['Les tags sont remplis à part : le texte peut s’en passer.'],
  },
  {
    id: 'snapchat', nom: 'Snapchat', groupe: 'reseaux',
    couleur: '#FFFC00', encre: '#000', sigle: '👻', style: 'story', format: 'story', partage: true, copie: true,
    ouvrir: () => null,
    conseils: ['Sur iPhone, « Partager l’image » propose Snapchat ; ajoute le lien avec l’outil trombone.'],
  },

  // ---------------- Video ----------------
  {
    id: 'tiktok', nom: 'TikTok', groupe: 'video',
    couleur: '#000000', sigle: '♪', style: 'script', limite: 2200, hashtags: 5, format: 'story', partage: true, copie: true,
    ouvrir: () => 'https://www.tiktok.com/upload',
    conseils: [
      'Enregistre l’écran de l’iPhone : Centre de contrôle ▸ Enregistrement de l’écran, puis monte dans TikTok.',
      'Incruste le texte : beaucoup regardent sans le son.',
      'Si TikTok n’apparaît pas dans la feuille de partage, enregistre l’image dans Photos puis ouvre TikTok.',
    ],
  },
  {
    id: 'reels', nom: 'Instagram Reels', groupe: 'video',
    couleur: '#833AB4', sigle: '▶', style: 'script', limite: 2200, hashtags: 5, format: 'story', partage: true, copie: true,
    ouvrir: () => 'https://www.instagram.com/',
    conseils: ['Même script que TikTok : filme une fois, publie aux deux endroits.', '5 hashtags au plus.'],
  },
  {
    id: 'youtube-shorts', nom: 'YouTube Shorts', groupe: 'video',
    couleur: '#FF0000', sigle: '▶', style: 'youtube', hashtags: 3, format: 'story', copie: true,
    ouvrir: () => 'https://www.youtube.com/upload',
    conseils: [
      'Vidéo verticale de moins d’une minute.',
      'Le lien d’une description de Short n’est pas cliquable : dis le nom de l’app à voix haute.',
    ],
  },
  {
    id: 'youtube', nom: 'YouTube', precision: 'vidéo de démo', groupe: 'video',
    couleur: '#CC0000', sigle: '▶', style: 'youtube', hashtags: 3, format: 'paysage', copie: true,
    ouvrir: () => 'https://www.youtube.com/upload',
    conseils: [
      'Le visuel paysage sert de miniature (1280 × 720 minimum, il est plus grand).',
      'Ajuste les minutes des chapitres après le montage : ils aident la recherche.',
    ],
  },

  // ---------------- Communautes ----------------
  {
    id: 'reddit', nom: 'Reddit', groupe: 'communautes',
    couleur: '#FF4500', sigle: 'r/', style: 'reddit', format: 'paysage', copie: true,
    ouvrir: (ch) => `https://www.reddit.com/submit?title=${enc(val(ch, 'titre'))}&text=${enc(val(ch, 'texte'))}`,
    destinations: (c, app) => [
      ...(c.L === 'fr' ? SUBREDDITS.fr : SUBREDDITS.en),
      ...(app.categorie === 'GAMES' ? SUBREDDITS.GAMES : []),
      ...(c.ipad ? SUBREDDITS.ipad : []),
    ].map((s) => ({ ...s, url: (ch) => `https://www.reddit.com/r/${s.sub}/submit?title=${enc(val(ch, 'titre'))}&text=${enc(val(ch, 'texte'))}` })),
    conseils: [
      'Chaque forum a ses règles d’autopromotion : lis-les avant de poster.',
      'Presque tout Reddit est en anglais : bascule sur EN en haut de la page.',
      'Le texte est aussi copié, au cas où Reddit ne le reprend pas.',
      'Reste pour répondre aux commentaires : c’est ce qui fait remonter le post.',
    ],
  },
  {
    id: 'producthunt', nom: 'Product Hunt', groupe: 'communautes', langue: 'en',
    couleur: '#DA552F', sigle: 'P', style: 'producthunt', format: 'galerie', copie: true,
    ouvrir: () => 'https://www.producthunt.com/posts/new',
    conseils: [
      'En anglais seulement.',
      'La journée commence à minuit heure de San Francisco (9 h du matin à Paris) : lance à ce moment-là pour avoir 24 h pleines.',
      'Il faut au moins 2 images de galerie en 1270 × 760 et une vignette carrée : l’icône.',
    ],
  },
  {
    id: 'hackernews', nom: 'Hacker News', precision: 'Show HN', groupe: 'communautes', langue: 'en',
    couleur: '#FF6600', sigle: 'Y', style: 'hackernews', copie: true,
    ouvrir: (ch) => `https://news.ycombinator.com/submitlink?u=${enc(val(ch, 'lien'))}&t=${enc(val(ch, 'titre'))}`,
    conseils: [
      'Titre sobre : ni majuscules criardes ni superlatifs.',
      'Publie ensuite le premier commentaire (copié) pour raconter comment l’app est faite.',
    ],
  },
  {
    id: 'indiehackers', nom: 'Indie Hackers', groupe: 'communautes', langue: 'en',
    couleur: '#1F364D', sigle: 'IH', style: 'indiehackers', format: 'paysage', copie: true,
    ouvrir: () => 'https://www.indiehackers.com/',
    conseils: ['Une communauté de créateurs indépendants : raconte le projet autant que l’app.'],
  },
  {
    id: 'alternativeto', nom: 'AlternativeTo', groupe: 'communautes', langue: 'en',
    couleur: '#1E88E5', sigle: 'A2', style: 'annuaire', format: 'paysage', copie: true,
    ouvrir: () => 'https://alternativeto.net/',
    conseils: ['Ajoute l’app comme alternative aux apps connues qui font la même chose : c’est ainsi qu’on la trouve.'],
  },
  {
    id: 'forums', nom: 'Forums du thème', groupe: 'communautes',
    couleur: '#5B6B7F', sigle: '💬', style: 'communaute', format: 'carre', copie: true,
    ouvrir: () => null,
    conseils: [
      (c) => `Où chercher : ${c.communautes.join(', ')}.`,
      'Présente-toi d’abord et participe : un premier message qui ne parle que de l’app passe mal.',
    ],
  },
  {
    id: 'discord', nom: 'Discord', groupe: 'communautes',
    couleur: '#5865F2', sigle: 'D', style: 'communaute', limite: 2000, format: 'paysage', copie: true,
    ouvrir: () => null,
    conseils: ['Poste dans le salon réservé aux projets (#showcase, #projets…), jamais dans le salon général.'],
  },

  // ---------------- Presse ----------------
  {
    id: 'communique', nom: 'Communiqué de presse', groupe: 'presse',
    couleur: '#2E3440', sigle: '📰', style: 'communique', fichier: 'txt',
    conseils: [
      '« Imprimer » permet aussi d’enregistrer en PDF.',
      'Ton e-mail, ta ville et ta présentation se règlent dans Réglages.',
    ],
  },
  {
    id: 'pitch', nom: 'E-mail aux journalistes', groupe: 'presse',
    couleur: '#4C566A', sigle: '✉︎', style: 'pitch', fichier: 'mailto',
    ouvrir: (ch) => mailto(ch),
    destinations: (c, app) =>
      [...(c.L === 'fr' ? MEDIAS.fr : MEDIAS.en), ...(c.L === 'fr' ? MEDIAS[app.categorie] ?? [] : [])].map((m) => ({
        nom: m.nom,
        note: 'adresse de la rédaction : page Contact du site',
        url: () => m.url,
      })),
    conseils: [
      'Un e-mail par rédaction, personnalisé : cite un de leurs articles récents.',
      'Propose le dossier de presse (canal suivant) plutôt que de joindre 10 Mo d’images.',
    ],
  },
  {
    id: 'presse-locale', nom: 'Presse et radio locales', groupe: 'presse',
    couleur: '#5E81AC', sigle: '📻', style: 'presseLocale', fichier: 'mailto',
    ouvrir: (ch) => mailto(ch),
    conseils: [
      'Le quotidien régional a un correspondant dans presque chaque commune : passe par l’agence locale.',
      'Pense aussi à la radio locale et au magazine de ta mairie.',
    ],
  },
  {
    id: 'createurs', nom: 'Blogueurs et YouTubeurs', groupe: 'presse',
    couleur: '#B48EAD', sigle: '🎙', style: 'createurs', fichier: 'mailto',
    ouvrir: (ch) => mailto(ch),
    conseils: [
      (c) => `Cherche « app iPhone ${c.genre.toLocaleLowerCase('fr')} » sur YouTube, TikTok et dans les blogs.`,
      'Remplace le passage entre crochets par quelque chose de précis : un message personnel a bien plus de chances.',
    ],
  },
  {
    id: 'dossier-presse', nom: 'Dossier de presse', precision: '.zip', groupe: 'presse',
    couleur: '#3B4252', sigle: '🗂', style: 'dossierPresse', fichier: 'zip',
    conseils: ['Tout ce qu’un journaliste demande, dans un seul fichier : joins-le ou dépose-le en ligne.'],
  },

  // ---------------- Messages ----------------
  {
    id: 'email-proches', nom: 'E-mail aux proches', groupe: 'messages',
    couleur: '#8E8E93', sigle: '✉︎', style: 'emailProches', fichier: 'mailto',
    ouvrir: (ch) => mailto(ch),
    conseils: [
      'Commence par là : les premières notes de l’App Store comptent beaucoup pour le classement.',
      'Mets les adresses en copie cachée (Cci).',
    ],
  },
  {
    id: 'whatsapp', nom: 'WhatsApp', groupe: 'messages',
    couleur: '#25D366', sigle: 'W', style: 'message', format: 'carre', partage: true,
    ouvrir: (ch) => `https://wa.me/?text=${enc(texte(ch))}`,
    conseils: ['Poste aussi le visuel carré en statut : tous tes contacts le voient.'],
  },
  {
    id: 'telegram', nom: 'Telegram', groupe: 'messages',
    couleur: '#26A5E4', sigle: '✈', style: 'message',
    ouvrir: (ch, c) => {
      const lien = c.lien || c.site;
      const sans = lien ? texte(ch).replace(lien, '').replace(/\s+:\s*$/m, '').replace(/\n{3,}/g, '\n\n').trim() : texte(ch);
      return lien ? `https://t.me/share/url?url=${enc(lien)}&text=${enc(sans)}` : null;
    },
    conseils: ['Pense aux groupes Telegram de ton thème, s’il y en a.'],
  },
  {
    id: 'sms', nom: 'SMS et iMessage', groupe: 'messages',
    couleur: '#34C759', sigle: '💬', style: 'message',
    ouvrir: (ch, c, env) => `sms:${env.ios ? '' : '?'}&body=${enc(texte(ch))}`,
    conseils: ['Sur Mac, l’app Messages s’ouvre avec le texte.'],
  },
  {
    id: 'newsletter', nom: 'Newsletter', groupe: 'messages',
    couleur: '#D08770', sigle: '📨', style: 'newsletter', format: 'lien', fichier: 'mailto',
    ouvrir: (ch) => mailto(ch),
    conseils: ['Mets le visuel en tête de l’e-mail.', 'Envoie-la à ta liste en copie cachée, ou colle-la dans ton outil de newsletter.'],
  },
  {
    id: 'signature', nom: 'Signature d’e-mail', groupe: 'messages',
    couleur: '#A3BE8C', sigle: '✍︎', style: 'signature',
    conseils: ['Sur Mac : Mail ▸ Réglages ▸ Signatures. Sur iPhone : Réglages ▸ Apps ▸ Mail ▸ Signature.', 'Chaque e-mail que tu envoies en parle, sans effort.'],
  },

  // ---------------- Apple, web, imprime ----------------
  {
    id: 'apple-nomination', nom: 'Mise en avant par Apple', precision: 'nomination', groupe: 'web',
    couleur: '#1D1D1F', sigle: '', style: 'nomination', copie: true,
    ouvrir: () => 'https://appstoreconnect.apple.com/apps',
    conseils: [
      'Dans App Store Connect : Apps ▸ ton app ▸ Featuring ▸ Nominations ▸ +.',
      'Au moins 3 semaines avant la date visée.',
      'App Launch pour une sortie, App Enhancements pour une mise à jour, New Content pour du nouveau contenu.',
    ],
  },
  {
    id: 'site-web', nom: 'Page web de l’app', groupe: 'web',
    couleur: '#0071E3', sigle: '🌐', style: 'siteWeb', fichier: 'html',
    conseils: [
      'Un fichier index.html complet, images comprises.',
      'Héberge-la sur GitHub Pages comme tes autres sites, puis mets son adresse en « URL marketing » dans App Store Connect.',
    ],
  },
  {
    id: 'affiche', nom: 'Affiche et flyer', precision: 'A4, QR code', groupe: 'web',
    couleur: '#EBCB8B', encre: '#000', sigle: '🖨', style: 'affiche', fichier: 'imprimer',
    conseils: [
      'Commerces, médiathèque, école, salle d’attente, office de tourisme : là où est ton public.',
      '« Imprimer » permet aussi d’enregistrer en PDF.',
    ],
  },
];

/** Par ou commencer : l'ordre conseille pour un lancement. */
export const ORDRE_LANCEMENT = [
  'email-proches', 'whatsapp', 'facebook', 'instagram-post', 'linkedin', 'x', 'threads', 'bluesky',
  'facebook-groupes', 'reddit', 'pitch', 'presse-locale', 'apple-nomination', 'tiktok', 'instagram-story',
  'producthunt', 'createurs', 'site-web', 'signature',
];

export const canal = (id) => CANAUX.find((c) => c.id === id);

export const conseils = (canal, c) => (canal.conseils ?? []).map((x) => (typeof x === 'function' ? x(c) : x));
