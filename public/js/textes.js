// Les textes de chaque publication, tires de la fiche de l'app.
//
// Aucun appel au reseau, aucun acces a la page : des fonctions pures, que
// l'app appelle a chaque affichage et que les tests verifient.
// Rien n'est invente : tout vient de la fiche (nom, sous-titre, texte
// promotionnel, description, mots-cles) ou des reglages. Ce qui manque
// reste visible entre crochets, a completer.

// ---------------------------------------------------------------
//  Par categorie : le public, l'emoji, les hashtags de base
// ---------------------------------------------------------------

const PUBLICS = {
  EDUCATION: ['les élèves, les parents et les enseignants', 'students, parents and teachers'],
  GAMES: ['tous ceux qui aiment jouer', 'anyone who loves games'],
  PRODUCTIVITY: ['ceux qui veulent gagner du temps', 'anyone who wants to save time'],
  BUSINESS: ['les pros et les indépendants', 'professionals and freelancers'],
  FINANCE: ['ceux qui veulent y voir clair dans leurs comptes', 'anyone who wants clear finances'],
  UTILITIES: ['tous ceux qui aiment les outils pratiques', 'anyone who likes handy tools'],
  LIFESTYLE: ['ceux qui veulent se simplifier la vie', 'anyone who wants a simpler life'],
  TRAVEL: ['les voyageurs et les randonneurs', 'travelers and hikers'],
  SPORTS: ['les sportifs, les clubs et les éducateurs', 'athletes, clubs and coaches'],
  HEALTH_AND_FITNESS: ['ceux qui prennent soin de leur santé', 'anyone who cares about their health'],
  MEDICAL: ['les patients et les soignants', 'patients and caregivers'],
  GRAPHICS_AND_DESIGN: ['les créatifs', 'creative people'],
  PHOTO_AND_VIDEO: ['les amateurs de photo et de vidéo', 'photo and video lovers'],
  BOOKS: ['les lecteurs et les auteurs', 'readers and writers'],
  REFERENCE: ['les curieux', 'curious minds'],
  MUSIC: ['les musiciens et les mélomanes', 'musicians and music lovers'],
  SOCIAL_NETWORKING: ['ceux qui aiment partager', 'people who love to share'],
  FOOD_AND_DRINK: ['les gourmands et les cuisiniers', 'food lovers and home cooks'],
  SHOPPING: ['les acheteurs malins', 'smart shoppers'],
  NAVIGATION: ['ceux qui se déplacent', 'people on the move'],
  NEWS: ['ceux qui veulent rester informés', 'people who want to stay informed'],
  WEATHER: ['ceux qui surveillent le ciel', 'weather watchers'],
  ENTERTAINMENT: ['ceux qui veulent se divertir', 'anyone looking for fun'],
  DEVELOPER_TOOLS: ['les développeurs', 'developers'],
  MAGAZINES_AND_NEWSPAPERS: ['les lecteurs', 'readers'],
};

const EMOJIS = {
  EDUCATION: '📚', GAMES: '🎲', PRODUCTIVITY: '✅', BUSINESS: '💼', FINANCE: '💶',
  UTILITIES: '🛠️', LIFESTYLE: '🏡', TRAVEL: '🧭', SPORTS: '⚽', HEALTH_AND_FITNESS: '💪',
  MEDICAL: '🩺', GRAPHICS_AND_DESIGN: '🎨', PHOTO_AND_VIDEO: '📸', BOOKS: '📖',
  REFERENCE: '🔎', MUSIC: '🎵', SOCIAL_NETWORKING: '💬', FOOD_AND_DRINK: '🍽️',
  SHOPPING: '🛍️', NAVIGATION: '🗺️', NEWS: '📰', WEATHER: '🌤️', ENTERTAINMENT: '🎉',
  DEVELOPER_TOOLS: '💻', MAGAZINES_AND_NEWSPAPERS: '📰',
};

const TAGS_CATEGORIE = {
  EDUCATION: [['#Éducation', '#Apprendre'], ['#EdTech', '#Learning']],
  GAMES: [['#JeuMobile', '#JeuxIPhone'], ['#MobileGame', '#iOSGaming']],
  PRODUCTIVITY: [['#Productivité', '#Organisation'], ['#Productivity', '#Organization']],
  BUSINESS: [['#Entrepreneur', '#Pro'], ['#SmallBusiness', '#Business']],
  FINANCE: [['#Budget', '#Finances'], ['#Budgeting', '#PersonalFinance']],
  UTILITIES: [['#Astuce', '#Pratique'], ['#Utility', '#Tools']],
  LIFESTYLE: [['#Maison', '#Quotidien'], ['#Lifestyle', '#Home']],
  TRAVEL: [['#Voyage', '#Randonnée'], ['#Travel', '#Hiking']],
  SPORTS: [['#Sport', '#Football'], ['#Sports', '#Coaching']],
  HEALTH_AND_FITNESS: [['#Santé', '#BienÊtre'], ['#Health', '#Wellness']],
  MEDICAL: [['#Santé', '#Soins'], ['#Health', '#Care']],
  GRAPHICS_AND_DESIGN: [['#Design', '#Créativité'], ['#Design', '#Creativity']],
  PHOTO_AND_VIDEO: [['#Photo', '#Vidéo'], ['#Photography', '#Video']],
  BOOKS: [['#Lecture', '#Livres'], ['#Books', '#Reading']],
  REFERENCE: [['#Culture', '#Savoir'], ['#Knowledge', '#Reference']],
  MUSIC: [['#Musique'], ['#Music']],
  SOCIAL_NETWORKING: [['#Partage'], ['#Social']],
  FOOD_AND_DRINK: [['#Cuisine', '#Recette'], ['#Cooking', '#Recipes']],
  SHOPPING: [['#BonPlan'], ['#Shopping']],
  NAVIGATION: [['#Navigation'], ['#Navigation']],
  ENTERTAINMENT: [['#Divertissement'], ['#Entertainment']],
  DEVELOPER_TOOLS: [['#Dev', '#Code'], ['#DevTools', '#Coding']],
};

/** Qui parler a ces gens, par categorie : pour les groupes et forums. */
export const COMMUNAUTES = {
  EDUCATION: ['groupes d’enseignants', 'associations de parents d’élèves', 'forums de profs'],
  GAMES: ['groupes de joueurs', 'clubs et associations de jeux', 'forums de jeux mobiles'],
  SPORTS: ['groupes d’éducateurs et d’entraîneurs', 'pages de clubs', 'forums de ta discipline'],
  TRAVEL: ['groupes de randonneurs', 'groupes de voyageurs', 'offices de tourisme'],
  BUSINESS: ['groupes d’entrepreneurs', 'réseaux d’indépendants', 'chambres de commerce'],
  FINANCE: ['groupes d’entraide budget', 'forums d’épargne'],
  PRODUCTIVITY: ['groupes d’organisation', 'communautés de freelances'],
  LIFESTYLE: ['groupes de travaux et bricolage', 'groupes de quartier'],
  GRAPHICS_AND_DESIGN: ['groupes de créatifs', 'communautés d’illustrateurs'],
  BOOKS: ['clubs de lecture', 'groupes d’auteurs', 'bibliothèques et médiathèques'],
  MEDICAL: ['associations de patients', 'groupes de soignants'],
  HEALTH_AND_FITNESS: ['groupes de sport et de bien-être'],
  REFERENCE: ['groupes de culture générale', 'forums de passionnés'],
};

// ---------------------------------------------------------------
//  Petits outils de texte
// ---------------------------------------------------------------

const ACRONYMES = new Set([
  'PDF', 'IA', 'AI', 'GPS', 'SMS', 'IGN', 'GR', 'QR', 'TVA', 'USB', 'VAR', 'iOS', 'iPhone', 'iPad', 'Mac',
  'CSV', 'HD', 'NFC', 'OCR', 'RGPD', 'PMR', 'TGV', 'SNCF', 'RER', 'UEFA', 'FIFA', 'CE1', 'CE2', 'CM1', 'CM2', 'CP',
]);

/** « GESTION DE MATCH EN TEMPS RÉEL » → « Gestion de match en temps réel » */
export function casPhrase(titre) {
  const mots = titre.trim().split(/\s+/).map((m) => {
    const nu = m.replace(/[^\p{L}\d]/gu, '');
    const connu = [...ACRONYMES].find((a) => a.toUpperCase() === nu.toUpperCase());
    return connu ? m.replace(nu, connu) : m.toLocaleLowerCase('fr');
  });
  const phrase = mots.join(' ');
  return phrase.charAt(0).toLocaleUpperCase('fr') + phrase.slice(1);
}

const estMajuscules = (l) => /\p{Lu}/u.test(l) && l === l.toLocaleUpperCase('fr') && /\p{L}{2}/u.test(l);
const PUCE = /^\s*(?:[•·▪◦►▶→✓✔☑✅★☆◆◇■□–\-*]|\d+[.)])\s*/u;
const EMOJI_DEBUT = /^\s*\p{Extended_Pictographic}️?\s*/u;
const FIN = /[.!?…:;,]$/;

/** Les intertitres qui ne disent rien de ce que fait l'app. */
const TITRE_GENERIQUE =
  /^(fonctionnalit|features|comment ça marche|comment ca marche|how it works|pourquoi|why|confidentialit|vie privée|privacy|premium|contact|nouveaut|what'?s new|abonnement|achats?|in-app|support|assistance|à propos|a propos|about|ce qu|what you|et aussi|and more|en résumé|en bref|conditions|terms|remarque|note|important|compatibilit|langues?|languages?)/i;

/** « Détection GPS — S'active au-dessus d'un seuil… » garde son debut si c'est trop long. */
function raccourcir(texte, max = 110) {
  let t = texte.replace(/\s+/g, ' ').trim().replace(/[.;,:]$/, '');
  if ([...t].length <= max) return t;
  for (const sep of [' — ', ' – ', ' : ', '. ', ', ', ' (']) {
    const i = t.indexOf(sep);
    if (i > 12 && i <= max) return t.slice(0, i).replace(/[.;,:]$/, '');
  }
  return couper(t, max);
}

/** Coupe au dernier mot entier, avec des points de suspension. */
export function couper(texte, max) {
  const car = [...texte];
  if (car.length <= max) return texte;
  const debut = car.slice(0, max - 1).join('');
  const espace = debut.lastIndexOf(' ');
  return (espace > max * 0.6 ? debut.slice(0, espace) : debut).replace(/[\s,;:.—–-]+$/, '') + '…';
}

export function phrases(texte) {
  return texte
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+(?=[\p{Lu}«"“\d])/u)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Les lignes utiles d'une description : sans les blancs ni les espaces de bord. */
const lignes = (texte) =>
  (texte ?? '')
    .split('\n')
    .map((l) => l.replace(/^\s*>\s?/, '').replace(/\*\*|__|`/g, '').trim());

/**
 * Recolle les paragraphes coupes a 80 colonnes (les feuilles de soumission
 * le font, et l'App Store garde parfois ces retours). Une ligne longue suivie
 * d'une ligne qui n'est ni une puce, ni un intertitre, c'est le meme paragraphe.
 */
export function recoller(texte) {
  const ls = lignes(texte);
  const out = [];
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    const prec = out.at(-1);
    const suivante = ls[i + 1] ?? '';
    const intertitre = [...l].length < 60 && !FIN.test(l) && [...suivante].length > [...l].length;
    const coupee = prec && [...prec.split('\n').at(-1)].length >= 60 && !estMajuscules(prec);
    if (coupee && l && !PUCE.test(l) && !EMOJI_DEBUT.test(l) && !estMajuscules(l) && !intertitre) {
      out[out.length - 1] = `${prec}${/\p{L}-$/u.test(prec) ? '' : ' '}${l}`;
    } else out.push(l);
  }
  return out.join('\n');
}

/**
 * Ce que l'app fait, en quelques lignes, lu dans sa description :
 * les intertitres (en capitales ou courts et suivis d'un paragraphe),
 * sinon les puces, sinon les premieres phrases.
 */
export function extrairePoints(description, nom = '', max = 5) {
  const ls = lignes(description);
  const nomMaj = nom.toLocaleUpperCase('fr');

  const titres = [];
  const puces = [];
  ls.forEach((l, i) => {
    if (!l) return;
    if (PUCE.test(l) || EMOJI_DEBUT.test(l)) {
      const t = l.replace(PUCE, '').replace(EMOJI_DEBUT, '').trim();
      // « 12,50 × 3 → un calcul » : un exemple, pas un point fort.
      if (t.length > 3 && !/^[\d\s,.×x*+%€$-]+→/.test(t)) puces.push(raccourcir(estMajuscules(t) ? casPhrase(t) : t));
      return;
    }
    const avant = ls[i - 1] ?? '';
    const apres = ls.slice(i + 1).find((x) => x) ?? '';
    const court = [...l].length <= 60 && !FIN.test(l);
    const titreMaj = estMajuscules(l) && court;
    const titreCourt =
      court && !avant && i > 0 && /^\p{Lu}/u.test(l) && !estMajuscules(l) && apres.length > l.length && !estMajuscules(apres);
    if ((titreMaj || titreCourt) && !TITRE_GENERIQUE.test(l) && l.toLocaleUpperCase('fr') !== nomMaj) {
      titres.push(raccourcir(titreMaj ? casPhrase(l) : l));
    }
  });

  const uniques = (liste) => [...new Map(liste.map((x) => [x.toLocaleLowerCase('fr'), x])).values()];
  if (uniques(titres).length >= 3) return uniques(titres).slice(0, max);
  if (uniques(puces).length >= 3) return uniques(puces).slice(0, max);

  const corps = ls.filter((l) => l && !estMajuscules(l)).slice(1).join(' ');
  const trouves = uniques([...titres, ...puces, ...phrases(corps).map((p) => raccourcir(p))]);
  return trouves.slice(0, max);
}

/**
 * Une phrase d'accroche quand l'app n'a pas de sous-titre :
 * « Blocgenda est un bloc-notes qui… » → « Un bloc-notes qui… »
 */
export function deduireSousTitre(description, nom) {
  const premiere = lignes(description).find(
    (l) => l && !estMajuscules(l) && l.toLocaleUpperCase('fr') !== nom.toLocaleUpperCase('fr'),
  );
  if (!premiere) return '';
  let p = phrases(premiere)[0] ?? premiere;
  // « MonPetitRéseau, c'est… » pour l'app « MonPetitReseau », « Opérations est… » pour « operations plus »
  const base = (x) => x.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const nomCourt = nom.replace(/[^\p{L}\d]+$/u, '').trim();
  const candidats = [nom, nomCourt, nomCourt.split(/\s+/)[0]].filter((n) => n.length >= 4);
  const trouve = candidats.find((n) => base(p).startsWith(base(n)) && !/[\p{L}\d]/u.test(p.charAt(n.length)));
  if (trouve) p = p.slice(trouve.length).replace(/^\s*(?:[-–—:,]\s*)?(?:est\s+|is\s+|c['’]est\s+)?/i, '');
  p = p.replace(/[.!…]+$/, '');
  p = p.charAt(0).toLocaleUpperCase('fr') + p.slice(1);
  return raccourcir(p, 100);
}

/** « hors ligne » → « #HorsLigne » ; rien de plus de 24 lettres, ni de nombre seul. */
export function hashtag(mot) {
  const t = mot
    .replace(/^#/, '')
    .split(/[\s\-_'’.]+/)
    .filter(Boolean)
    .map((m) => [...ACRONYMES].find((x) => x.toUpperCase() === m.toUpperCase()) ?? m.charAt(0).toLocaleUpperCase('fr') + m.slice(1))
    .join('')
    .replace(/[^\p{L}\d]/gu, '');
  if (!t || /^\d+$/.test(t) || t.length > 24) return '';
  return `#${t}`;
}

// ---------------------------------------------------------------
//  Longueur telle que la compte chaque reseau
// ---------------------------------------------------------------

const URL_RE = /https?:\/\/\S+/g;

/**
 * X compte une adresse pour 23, et double les emojis et les ecritures
 * non latines ; Bluesky compte des graphemes ; les autres, des caracteres.
 */
export function longueur(texte, mode = 'caracteres') {
  if (mode === 'x') {
    const sansUrl = texte.replace(URL_RE, '');
    const urls = (texte.match(URL_RE) ?? []).length;
    let n = urls * 23;
    for (const c of sansUrl) {
      const p = c.codePointAt(0);
      const simple = p <= 0x10ff || (p >= 0x2000 && p <= 0x200d) || (p >= 0x2010 && p <= 0x201f) || (p >= 0x2032 && p <= 0x2037);
      n += simple ? 1 : 2;
    }
    // Les selecteurs de variante (️) ne comptent pas.
    n -= (sansUrl.match(/️/g) ?? []).length * 2;
    return n;
  }
  if (mode === 'graphemes' && typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(texte)].length;
  }
  return [...texte].length;
}

/** La version la plus riche qui tient ; a defaut, la plus courte coupee proprement. */
function premierQuiTient(versions, limite, mode) {
  const candidates = versions.map((v) => nettoyerBlancs(v)).filter(Boolean);
  if (!limite) return candidates[0] ?? '';
  const ok = candidates.find((v) => longueur(v, mode) <= limite);
  if (ok) return ok;
  let v = candidates.at(-1) ?? '';
  while (longueur(v, mode) > limite && v.length > 10) v = couper(v, [...v].length - 5);
  return v;
}

const nettoyerBlancs = (t) =>
  (t ?? '')
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** Espace insecable avant « : ! ? ; » en francais : la ponctuation ne part pas seule a la ligne. */
export function typo(texte) {
  return texte
    .replace(/ ([:;!?»])/g, ' $1')
    .replace(/« /g, '« ');
}

// ---------------------------------------------------------------
//  Le contexte : tout ce dont les textes ont besoin, une fois
// ---------------------------------------------------------------

const DATE = (L) =>
  new Intl.DateTimeFormat(L === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

/**
 * app : une entree de data/apps.json
 * L : 'fr' | 'en'
 * fiche : ce que tu as retouche dans l'onglet Fiche pour cette langue
 * reglages : tes reglages (nom, e-mail, ville…)
 */
export function contexte(app, L, fiche = {}, reglages = {}, options = {}) {
  const brute = app.langues[L] ?? app.langues[app.languePrincipale] ?? Object.values(app.langues)[0] ?? {};
  const l = { ...brute, description: recoller(brute.description), nouveautes: recoller(brute.nouveautes) };
  const traduite = !!app.langues[L];
  const i = L === 'fr' ? 0 : 1;
  const nom = (fiche.nom || l.nom || app.slug).trim();
  const angle = fiche.angle === 'nouveautes' && l.nouveautes ? 'nouveautes' : 'presentation';

  const sousTitre = (fiche.sousTitre || l.sousTitre || deduireSousTitre(l.description ?? '', nom)).trim();
  const premieres = phrases(lignes(l.description).filter((x) => x && !estMajuscules(x)).join(' ')).slice(0, 2).join(' ');
  const accroche = (fiche.accroche || l.promo || couper(premieres, 200)).trim();

  const pointsSource = angle === 'nouveautes' ? l.nouveautes : l.description;
  const pointsForts = fiche.pointsForts
    ? fiche.pointsForts.split('\n').map((x) => x.trim()).filter(Boolean)
    : extrairePoints(pointsSource ?? '', nom);

  const motsCles = l.motsCles ?? [];
  const hashtags = fiche.hashtags
    ? fiche.hashtags.split(/[\s,]+/).map(hashtag).filter(Boolean)
    : [
        ...motsCles.slice(0, 2).map(hashtag),
        ...(TAGS_CATEGORIE[app.categorie]?.[i] ?? []).slice(0, 1),
        '#iPhone',
        ...(reglages.hashtags ?? '#IndieDev').split(/[\s,]+/).map(hashtag),
        ...motsCles.slice(2).map(hashtag),
        ...(TAGS_CATEGORIE[app.categorie]?.[i] ?? []).slice(1),
      ].filter(Boolean);

  const ipad = app.appareils?.includes('ipad');
  const appareils = ipad ? (L === 'fr' ? 'iPhone et iPad' : 'iPhone and iPad') : 'iPhone';
  const lien = (fiche.lien || (L === 'fr' ? app.lien : app.lienInternational || app.lien) || app.site || '').trim();

  const sortie = app.sortie ? new Date(app.sortie) : null;
  const recente = !app.enLigne || (sortie && Date.now() - sortie.getTime() < 120 * 864e5);

  const motsMinuscules = new Set(
    ((l.description ?? '') + ' ' + (l.promo ?? '')).match(/(?<![\p{L}])\p{Ll}[\p{L}'’-]*/gu) ?? [],
  );

  return {
    L,
    traduite,
    motsMinuscules,
    angle,
    nom,
    sousTitre,
    accroche,
    pointsForts,
    public: (fiche.public || PUBLICS[app.categorie]?.[i] || (L === 'fr' ? 'tout le monde' : 'everyone')).trim(),
    communautes: COMMUNAUTES[app.categorie] ?? ['groupes de passionnés du sujet'],
    motsCles,
    hashtags: [...new Map(hashtags.map((h) => [h.toLocaleLowerCase('fr'), h])).values()],
    lien,
    enLigne: !!app.enLigne,
    recente,
    gratuit: app.gratuit !== false,
    prix: app.gratuit !== false ? (L === 'fr' ? 'Gratuit' : 'Free') : app.prix,
    achats: !!app.achats,
    appareils,
    ipad,
    genre: app.genre?.[L] || '',
    emoji: EMOJIS[app.categorie] ?? '📱',
    version: app.version ?? '',
    nouveautes: l.nouveautes ?? '',
    iosMin: app.iosMin ?? '',
    note: app.note,
    site: app.site ?? '',
    assistance: app.assistance ?? '',
    auteur: (reglages.nom || app.developpeur || '').trim() || (L === 'fr' ? '[ton nom]' : '[your name]'),
    email: (reglages.email || '').trim(),
    telephone: (reglages.telephone || '').trim(),
    ville: (reglages.ville || '').trim(),
    sitePerso: (reglages.site || '').trim(),
    bio: (reglages.bio || '').trim(),
    nbApps: options.nbApps ?? 0,
    date: DATE(L),
  };
}

// ---------------------------------------------------------------
//  Morceaux communs
// ---------------------------------------------------------------

const T = (c, fr, en) => (c.L === 'fr' ? fr : en);
const hashtags = (c, n) => c.hashtags.slice(0, n).join(' ');
const points = (c, n, puce = '•') => c.pointsForts.slice(0, n).map((p) => `${puce} ${p}`).join('\n');
const minuscule = (s) => (s ? s.charAt(0).toLocaleLowerCase('fr') + s.slice(1) : s);

const MOTS_OUTILS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'votre', 'vos', 'ton', 'tes', 'mon', 'ma', 'mes', 'notre', 'nos',
  'ce', 'cet', 'cette', 'ces', 'tout', 'tous', 'toute', 'toutes', 'pour', 'avec', 'sans', 'en', 'au', 'aux',
  'the', 'a', 'an', 'your', 'my', 'our', 'all', 'every', 'for', 'with', 'without', 'gratuit', 'free',
]);

/**
 * Met en minuscule le debut d'un sous-titre place apres « : » ou une
 * virgule, sauf si c'est un nom propre : « Conquête et culture » devient
 * « conquête et culture », « Portsall – Mont-Saint-Michel » reste tel quel.
 * Un mot que la description ecrit en minuscule n'est pas un nom propre.
 */
function min(c, s) {
  if (!s) return s;
  const mot = s.match(/^[\p{L}'’-]+/u)?.[0] ?? '';
  const bas = mot.toLocaleLowerCase('fr');
  if (mot.length > 1 && mot === mot.toLocaleUpperCase('fr')) return s; // sigle
  if (MOTS_OUTILS.has(bas) || c.motsMinuscules?.has(bas)) return minuscule(s);
  return s;
}

/** « à les élèves » → « aux élèves » */
function a(groupe) {
  if (/^les /.test(groupe)) return `aux ${groupe.slice(4)}`.replace(/(,| et| ou) les /g, '$1 aux ');
  if (/^le /.test(groupe)) return `au ${groupe.slice(3)}`;
  return `à ${groupe}`;
}
const aCompleter = (c, fr, en) => `[${T(c, fr, en)}]`;

function prixLong(c) {
  if (!c.gratuit) return T(c, `${c.prix}`, `${c.prix}`);
  return c.achats ? T(c, 'Gratuit, avec des achats intégrés facultatifs', 'Free, with optional in-app purchases') : T(c, 'Gratuit', 'Free');
}

/** Ou la trouver : le lien si l'app est en ligne, sinon « bientot ». */
function appel(c, v = 0) {
  if (!c.enLigne) {
    const bientot = T(c, 'Bientôt sur l’App Store.', 'Coming soon to the App Store.');
    return c.lien ? `${bientot} ${c.lien}` : bientot;
  }
  const fr = [
    `${c.prix} sur ${c.appareils} 👉 ${c.lien}`,
    `À télécharger sur l’App Store : ${c.lien}`,
    `Disponible sur l’App Store (${minuscule(c.prix)}) : ${c.lien}`,
  ];
  const en = [
    `${c.prix} on ${c.appareils} 👉 ${c.lien}`,
    `Get it on the App Store: ${c.lien}`,
    `Now on the App Store (${minuscule(c.prix)}): ${c.lien}`,
  ];
  return T(c, fr, en)[v % 3];
}

/** Sur Instagram ou TikTok, un lien dans la legende n'est pas cliquable. */
function appelSansLien(c, v = 0) {
  if (!c.enLigne) return T(c, 'Bientôt sur l’App Store.', 'Coming soon to the App Store.');
  const fr = [
    `${c.prix} sur l’App Store : lien en bio 👆`,
    `Cherche « ${c.nom} » sur l’App Store 🔎`,
    `Le lien est dans ma bio 👆`,
  ];
  const en = [`${c.prix} on the App Store: link in bio 👆`, `Search “${c.nom}” on the App Store 🔎`, `Link in bio 👆`];
  return T(c, fr, en)[v % 3];
}

/** La premiere ligne d'une publication. */
function accroche(c, v = 0) {
  if (c.angle === 'nouveautes') {
    return T(c, [
      `✨ Nouvelle version de ${c.nom}${c.version ? ` (${c.version})` : ''}`,
      `${c.nom} ${c.version} est disponible ${c.emoji}`,
      `Du nouveau dans ${c.nom} ${c.emoji}`,
    ], [
      `✨ New version of ${c.nom}${c.version ? ` (${c.version})` : ''}`,
      `${c.nom} ${c.version} is out ${c.emoji}`,
      `What’s new in ${c.nom} ${c.emoji}`,
    ])[v % 3];
  }
  const fr = [
    c.sousTitre ? `${c.emoji} ${c.nom} : ${min(c, c.sousTitre)}` : `${c.emoji} ${c.nom}`,
    c.enLigne
      ? c.recente
        ? `Je viens de publier ${c.nom} sur l’App Store ${c.emoji}`
        : `Vous connaissez ${c.nom} ? ${c.emoji}`
      : `${c.nom} arrive bientôt sur l’App Store ${c.emoji}`,
    `Pour ${c.public} : ${c.nom} ${c.emoji}`,
  ];
  const en = [
    c.sousTitre ? `${c.emoji} ${c.nom}: ${c.sousTitre}` : `${c.emoji} ${c.nom}`,
    c.enLigne
      ? c.recente
        ? `I just released ${c.nom} on the App Store ${c.emoji}`
        : `Have you tried ${c.nom}? ${c.emoji}`
      : `${c.nom} is coming soon to the App Store ${c.emoji}`,
    `For ${c.public}: ${c.nom} ${c.emoji}`,
  ];
  return T(c, fr, en)[v % 3];
}

const avis = (c) =>
  c.enLigne
    ? T(c, 'Si elle te plaît, une note sur l’App Store m’aiderait beaucoup 🙏', 'If you like it, a rating on the App Store would help a lot 🙏')
    : '';

// ---------------------------------------------------------------
//  Les styles : un par facon d'ecrire
// ---------------------------------------------------------------

const champ = (cle, label, valeur, extra = {}) => ({ cle, label, valeur, ...extra });

/** X, Bluesky, Threads, Mastodon, Tumblr : court, un lien, peu de hashtags. */
function court(c, v, canal) {
  const n = canal.hashtags ?? 2;
  const tags = hashtags(c, n);
  const versions = [
    `${accroche(c, v)}\n\n${c.accroche}\n\n${points(c, 2, '→')}\n\n${appel(c, v)}\n\n${tags}`,
    `${accroche(c, v)}\n\n${c.accroche}\n\n${appel(c, v)}\n\n${tags}`,
    `${accroche(c, v)}\n\n${points(c, 3, '→')}\n\n${appel(c, v)}\n\n${hashtags(c, 1)}`,
    `${accroche(c, v)}\n\n${points(c, 2, '→')}\n\n${appel(c, v)}`,
    `${accroche(c, v)}\n\n${appel(c, v)}`,
  ];
  return [champ('texte', T(c, 'Texte', 'Text'), premierQuiTient(versions, canal.limite, canal.compte))];
}

/** Facebook : un peu plus long, un ton de conversation. */
function social(c, v, canal) {
  const texte = [
    accroche(c, v),
    c.accroche,
    points(c, 4, '✅'),
    appel(c, v),
    avis(c) ? T(c, 'Vos avis et vos idées sont les bienvenus en commentaire 💬', 'Your feedback and ideas are welcome in the comments 💬') : '',
    hashtags(c, canal.hashtags ?? 3),
  ].join('\n\n');
  return [champ('texte', T(c, 'Texte', 'Text'), premierQuiTient([texte], canal.limite, canal.compte))];
}

/** Instagram (publication) et Snapchat : la legende, sans lien cliquable. */
function legende(c, v, canal) {
  const texte = [
    accroche(c, v),
    c.accroche,
    points(c, 4, '✅'),
    appelSansLien(c, v),
    hashtags(c, canal.hashtags ?? 5),
  ].join('\n\n');
  return [champ('texte', T(c, 'Légende', 'Caption'), premierQuiTient([texte], canal.limite, canal.compte))];
}

/** Story : quelques mots a poser sur l'image, et le lien pour l'autocollant. */
function story(c, v) {
  return [
    champ('texte', T(c, 'Texte à poser sur la story', 'Text for the story'), [accroche(c, v), c.enLigne ? T(c, 'Lien ici 👇', 'Link here 👇') : ''].filter(Boolean).join('\n')),
    champ('lien', T(c, 'Lien de l’autocollant « Lien »', 'Link sticker URL'), c.lien || aCompleter(c, 'lien', 'link'), { ligne: true }),
  ];
}

/** LinkedIn : le recit du createur, pro mais personnel. */
function pro(c, v, canal) {
  const ouverture = c.angle === 'nouveautes'
    ? T(c, `Nouvelle version de ${c.nom}${c.version ? ` (${c.version})` : ''}, mon app pour ${c.public}.`, `A new version of ${c.nom}${c.version ? ` (${c.version})` : ''}, my app for ${c.public}.`)
    : T(c, [
        c.enLigne ? (c.recente ? `J’ai publié une nouvelle app : ${c.nom}.` : `Je vous présente une de mes apps : ${c.nom}.`) : `Je prépare la sortie de ma prochaine app : ${c.nom}.`,
        `Je développe des applications iPhone en indépendant. ${c.recente ? 'La dernière' : 'L’une d’elles'} s’appelle ${c.nom}.`,
        `${c.nom}, c’est ${min(c, c.sousTitre || c.accroche)}.`,
      ], [
        c.enLigne ? (c.recente ? `I’ve released a new app: ${c.nom}.` : `Let me introduce one of my apps: ${c.nom}.`) : `I’m getting ready to release my next app: ${c.nom}.`,
        `I build iPhone apps as an independent developer. ${c.recente ? 'The latest one' : 'One of them'} is called ${c.nom}.`,
        `${c.nom} is ${min(c, c.sousTitre || c.accroche)}.`,
      ])[v % 3];
  const texte = [
    ouverture,
    c.accroche,
    T(c, 'Ce qu’elle fait :', 'What it does:'),
    points(c, 5, '→'),
    T(c, `Pensée pour ${c.public}, elle fonctionne sur ${c.appareils}.`, `Built for ${c.public}, it runs on ${c.appareils}.`),
    c.enLigne ? `${prixLong(c)}${c.achats ? ',' : ''}${T(c, ' sur l’App Store : ', ' on the App Store: ')}${c.lien}` : appel(c, v),
    T(c, 'Vos retours m’intéressent : dites-moi ce que vous en pensez en commentaire.', 'I’d love your feedback: tell me what you think in the comments.'),
    hashtags(c, canal.hashtags ?? 3),
  ].join('\n\n');
  return [champ('texte', T(c, 'Texte', 'Text'), premierQuiTient([texte], canal.limite, canal.compte))];
}

/** Groupes Facebook, forums, Discord : on partage, on ne vend pas. */
function communaute(c, v, canal) {
  const texte = T(c,
    [
      `Bonjour à tous 👋`,
      `Je développe des applications en indépendant et je voulais partager ${c.recente ? 'la dernière' : 'l’une d’elles'} avec vous, parce qu’elle peut servir ${a(c.public)} : ${c.nom}.`,
      c.accroche,
      points(c, 4, '•'),
      c.enLigne ? `${prixLong(c)}, sur ${c.appareils} : ${c.lien}` : appel(c, v),
      `Toutes les remarques sont les bienvenues, c’est comme ça qu’elle s’améliore. Merci aux admins d’accepter ce message !`,
    ],
    [
      `Hi everyone 👋`,
      `I build apps as an independent developer and wanted to share ${c.recente ? 'my latest one' : 'one of them'}, since it may help ${c.public}: ${c.nom}.`,
      c.accroche,
      points(c, 4, '•'),
      c.enLigne ? `${prixLong(c)}, on ${c.appareils}: ${c.lien}` : appel(c, v),
      `Any feedback is welcome, that’s how it gets better. Thanks to the mods for allowing this post!`,
    ],
  ).join('\n\n');
  return [champ('texte', T(c, 'Message', 'Message'), premierQuiTient([texte], canal.limite, canal.compte))];
}

/** Reddit : un titre sobre, un texte a la premiere personne. */
function reddit(c, v, canal) {
  const titre = T(c,
    [`J’ai créé ${c.nom}, ${min(c, c.sousTitre || c.accroche)}`, `${c.nom} : ${min(c, c.sousTitre || c.accroche)} (${minuscule(prixLong(c))}, ${c.appareils})`],
    [`I made ${c.nom}, ${min(c, c.sousTitre || c.accroche)}`, `${c.nom}: ${c.sousTitre || c.accroche} (${minuscule(prixLong(c))}, ${c.appareils})`],
  )[v % 2];
  const texte = T(c,
    [
      `Bonjour ! Je développe des apps iPhone en indépendant. ${c.recente ? `Je viens de terminer ${c.nom}.` : `Voici ${c.nom}, l’une de mes apps.`}`,
      c.accroche,
      `Ce qu’elle fait :\n\n${points(c, 5, '-')}`,
      c.enLigne ? `${prixLong(c)} : ${c.lien}` : appel(c, v),
      `Tous vos retours m’intéressent, bons ou mauvais.`,
    ],
    [
      `Hi! I’m an independent iOS developer. ${c.recente ? `I just finished ${c.nom}.` : `This is ${c.nom}, one of my apps.`}`,
      c.accroche,
      `What it does:\n\n${points(c, 5, '-')}`,
      c.enLigne ? `${prixLong(c)}: ${c.lien}` : appel(c, v),
      `I’d love any feedback, good or bad.`,
    ],
  ).join('\n\n');
  return [
    champ('titre', T(c, 'Titre', 'Title'), couper(titre, 300), { limite: 300, ligne: true }),
    champ('texte', T(c, 'Texte', 'Body'), texte),
  ];
}

/** Product Hunt : nom, tagline 60, description 260, premier commentaire du createur. */
function producthunt(c) {
  return [
    champ('nom', 'Name', c.nom, { limite: 40, ligne: true }),
    champ('tagline', 'Tagline', couper(c.sousTitre || c.accroche, 60), { limite: 60, ligne: true }),
    champ('description', 'Description', premierQuiTient([`${c.accroche} ${prixLong(c)} on ${c.appareils}.`, c.accroche], 260), { limite: 260 }),
    champ(
      'commentaire',
      'First comment (maker)',
      [
        `Hi Product Hunt 👋`,
        `I’m ${c.auteur}, an independent iOS developer. I built ${c.nom} for ${c.public}.`,
        c.accroche,
        `What you can do with it:\n${points(c, 5, '•')}`,
        `${prixLong(c)} on ${c.appareils}. I’d love your feedback and I’ll be here all day to answer questions!`,
      ].join('\n\n'),
    ),
    champ('lien', 'Link', c.lien || aCompleter(c, 'lien', 'link'), { ligne: true }),
  ];
}

/** Show HN : un titre de 80 caracteres, le lien, un premier commentaire. */
function hackernews(c) {
  return [
    champ('titre', 'Title', couper(`Show HN: ${c.nom} – ${c.sousTitre || c.accroche}`, 80), { limite: 80, ligne: true }),
    champ('lien', 'URL', c.site || c.lien || aCompleter(c, 'lien', 'link'), { ligne: true }),
    champ(
      'commentaire',
      'First comment',
      [
        `Hi HN, I’m ${c.auteur}, an independent developer. ${c.nom} is ${min(c, c.sousTitre || c.accroche)}.`,
        c.accroche,
        points(c, 5, '-'),
        `It runs on ${c.appareils}${c.iosMin ? ` (iOS ${c.iosMin}+)` : ''}. Happy to answer questions about how it’s built.`,
      ].join('\n\n'),
    ),
  ];
}

/** Indie Hackers, AlternativeTo et les annuaires : titre + texte factuel. */
function annuaire(c) {
  return [
    champ('nom', T(c, 'Nom', 'Name'), c.nom, { ligne: true }),
    champ('court', T(c, 'Description courte', 'Short description'), couper(c.sousTitre || c.accroche, 140), { limite: 140 }),
    champ('description', 'Description', [c.accroche, points(c, 6, '•'), `${prixLong(c)} — ${c.appareils}.`].join('\n\n')),
    champ('tags', 'Tags', c.motsCles.slice(0, 8).join(', ') || c.genre, { ligne: true }),
    champ('lien', T(c, 'Lien', 'Link'), c.lien || aCompleter(c, 'lien', 'link'), { ligne: true }),
  ];
}

function indiehackers(c) {
  return [
    champ('titre', 'Title', `${c.recente ? 'I launched' : 'Meet'} ${c.nom}, ${min(c, c.sousTitre || c.accroche)}`, { ligne: true }),
    champ(
      'texte',
      'Post',
      [
        `Hi IH! I’m ${c.auteur} and I build iOS apps on my own.`,
        `${c.nom} is ${min(c, c.sousTitre || c.accroche)}. ${c.accroche}`,
        `Main features:\n${points(c, 5, '-')}`,
        `Pricing: ${minuscule(prixLong(c))}.`,
        `I’d love feedback on the positioning and on how you’d get it in front of ${c.public}.`,
        c.lien,
      ].join('\n\n'),
    ),
  ];
}

/** TikTok, Reels, Shorts : un script plan par plan, puis la legende. */
function script(c, v, canal) {
  const pf = c.pointsForts.length ? c.pointsForts : [aCompleter(c, 'ce que fait l’app', 'what the app does')];
  const plans = T(c,
    [
      `🎬 Script vertical (20 à 30 s)`,
      `0–3 s · Texte à l’écran : « ${c.sousTitre || c.accroche} »\nFilme l’iPhone en main, ou montre directement l’écran de l’app.`,
      `3–8 s · Voix : « ${c.nom}, ${min(c, c.sousTitre || 'une app pour ' + c.public)}. »\nÉcran : l’accueil de l’app.`,
      ...pf.slice(0, 3).map((p, i) => `${8 + i * 5}–${13 + i * 5} s · ${p}\nÉcran : la capture qui le montre, avec ces mots incrustés.`),
      `Fin · Icône de l’app + « ${c.enLigne ? `${c.prix} sur l’App Store` : 'Bientôt sur l’App Store'} »\nVoix : « ${c.enLigne ? `Cherchez ${c.nom} sur l’App Store.` : 'Abonnez-vous pour la sortie.'} »`,
    ],
    [
      `🎬 Vertical script (20 to 30 s)`,
      `0–3 s · On-screen text: “${c.sousTitre || c.accroche}”\nFilm the iPhone in hand, or show the app screen directly.`,
      `3–8 s · Voice: “${c.nom}, ${min(c, c.sousTitre || 'an app for ' + c.public)}.”\nScreen: the app’s home screen.`,
      ...pf.slice(0, 3).map((p, i) => `${8 + i * 5}–${13 + i * 5} s · ${p}\nScreen: the screenshot that shows it, with these words on top.`),
      `End · App icon + “${c.enLigne ? `${c.prix} on the App Store` : 'Coming soon to the App Store'}”\nVoice: “${c.enLigne ? `Search ${c.nom} on the App Store.` : 'Follow for the launch.'}”`,
    ],
  ).join('\n\n');
  const legendeTexte = [accroche(c, v), c.accroche, appelSansLien(c, v), hashtags(c, canal.hashtags ?? 5)].join('\n\n');
  return [
    champ('script', T(c, 'Script de la vidéo', 'Video script'), plans),
    champ('texte', T(c, 'Légende', 'Caption'), premierQuiTient([legendeTexte], canal.limite, canal.compte), { limite: canal.limite }),
  ];
}

/** YouTube : titre 100, description avec le lien. */
function youtube(c, v, canal) {
  const court = canal.id === 'youtube-shorts';
  const titre = couper(`${c.nom} : ${c.sousTitre || c.accroche}`.replace(' : ', T(c, ' : ', ': ')), 100);
  const description = [
    c.accroche,
    points(c, 5, '✅'),
    c.enLigne ? `📲 ${prixLong(c)} ${T(c, 'sur l’App Store', 'on the App Store')} : ${c.lien}` : appel(c, v),
    court ? '' : T(c, 'Chapitres :\n0:00 Présentation\n0:20 [première fonction]\n1:00 [deuxième fonction]', 'Chapters:\n0:00 Intro\n0:20 [first feature]\n1:00 [second feature]'),
    hashtags(c, 3),
  ].join('\n\n');
  const champs = [
    champ('titre', T(c, 'Titre', 'Title'), titre, { limite: 100, ligne: true }),
    champ('description', 'Description', nettoyerBlancs(description), { limite: 5000 }),
  ];
  if (!court) {
    champs.push(
      champ(
        'plan',
        T(c, 'Plan de la vidéo de démo (1 à 2 min)', 'Demo video outline (1–2 min)'),
        [
          T(c, `1. Le problème que l’app résout, en une phrase.`, `1. The problem the app solves, in one sentence.`),
          ...c.pointsForts.slice(0, 4).map((p, i) => `${i + 2}. ${p}`),
          T(c, `${Math.min(c.pointsForts.length, 4) + 2}. Où la trouver, et ce qu’elle coûte.`, `${Math.min(c.pointsForts.length, 4) + 2}. Where to get it, and what it costs.`),
        ].join('\n'),
      ),
    );
  }
  return champs;
}

/** Pinterest : titre 100, description 500, le lien de l'epingle. */
function pinterest(c, v, canal) {
  return [
    champ('titre', T(c, 'Titre', 'Title'), couper(`${c.nom} – ${c.sousTitre || c.accroche}`, 100), { limite: 100, ligne: true }),
    champ('description', 'Description', premierQuiTient([
      `${c.accroche}\n\n${points(c, 3, '•')}\n\n${hashtags(c, canal.hashtags ?? 5)}`,
      `${c.accroche}\n\n${hashtags(c, 3)}`,
    ], 500), { limite: 500 }),
    champ('lien', T(c, 'Lien de destination', 'Destination link'), c.lien || aCompleter(c, 'lien', 'link'), { ligne: true }),
  ];
}

/** WhatsApp, Telegram, SMS : un message d'ami. */
function message(c, v) {
  const texte = T(c,
    [
      `Salut ! ${c.recente ? 'Je viens de sortir' : 'Je te fais découvrir'} ${c.nom}, ${min(c, c.sousTitre || c.accroche)}. ${c.emoji}`,
      c.enLigne ? `C’est ${minuscule(c.prix)}, sur ${c.appareils} : ${c.lien}` : appel(c, v),
      avis(c),
    ],
    [
      `Hi! ${c.recente ? 'I just released' : 'Let me show you'} ${c.nom}, ${min(c, c.sousTitre || c.accroche)}. ${c.emoji}`,
      c.enLigne ? `It’s ${minuscule(c.prix)} on ${c.appareils}: ${c.lien}` : appel(c, v),
      avis(c),
    ],
  ).filter(Boolean).join('\n\n');
  return [champ('texte', 'Message', texte)];
}

/** E-mail aux proches : on demande un essai et un avis. */
function emailProches(c, v) {
  return [
    champ('objet', T(c, 'Objet', 'Subject'), T(c, `${c.recente ? 'Ma nouvelle app' : 'Une de mes apps'} : ${c.nom}`, `${c.recente ? 'My new app' : 'One of my apps'}: ${c.nom}`), { ligne: true }),
    champ(
      'corps',
      T(c, 'Message', 'Body'),
      T(c,
        [
          `Bonjour,`,
          `Je voulais vous faire découvrir ${c.nom}, ${c.recente ? 'la dernière application que j’ai créée' : 'une des applications que j’ai créées'} : ${min(c, c.sousTitre || c.accroche)}.`,
          c.accroche,
          points(c, 3, '•'),
          c.enLigne ? `Elle est ${minuscule(prixLong(c))}, sur ${c.appareils} : ${c.lien}` : appel(c, v),
          c.enLigne ? `Deux choses m’aideraient énormément : l’essayer et laisser une note sur l’App Store, et la faire suivre à quelqu’un à qui elle peut servir.` : `Je vous préviendrai dès sa sortie.`,
          `Merci !\n${c.auteur}`,
        ],
        [
          `Hi,`,
          `I wanted to show you ${c.nom}, ${c.recente ? 'the latest app I’ve made' : 'one of the apps I’ve made'}: ${min(c, c.sousTitre || c.accroche)}.`,
          c.accroche,
          points(c, 3, '•'),
          c.enLigne ? `It’s ${minuscule(prixLong(c))} on ${c.appareils}: ${c.lien}` : appel(c, v),
          c.enLigne ? `Two things would help enormously: trying it and leaving a rating on the App Store, and forwarding it to someone who could use it.` : `I’ll let you know as soon as it’s out.`,
          `Thanks!\n${c.auteur}`,
        ],
      ).join('\n\n'),
    ),
  ];
}

/** Newsletter : un vrai petit article. */
function newsletter(c, v) {
  return [
    champ('objet', T(c, 'Objet', 'Subject'), T(c, `${c.emoji} ${c.nom} : ${min(c, c.sousTitre || c.accroche)}`, `${c.emoji} ${c.nom}: ${c.sousTitre || c.accroche}`), { ligne: true }),
    champ(
      'corps',
      T(c, 'Contenu', 'Content'),
      [
        T(c, `Bonjour,`, `Hello,`),
        c.angle === 'nouveautes'
          ? T(c, `${c.nom} vient de passer en version ${c.version}. Voici ce qui change :`, `${c.nom} has just been updated to version ${c.version}. Here’s what’s new:`)
          : T(c, `Je vous présente ${c.nom}, ${min(c, c.sousTitre || c.accroche)}.`, `Meet ${c.nom}, ${min(c, c.sousTitre || c.accroche)}.`),
        c.accroche,
        points(c, 5, '•'),
        T(c, `Pour qui ? Pour ${c.public}.`, `Who is it for? ${c.public.charAt(0).toUpperCase() + c.public.slice(1)}.`),
        c.enLigne ? `👉 ${prixLong(c)} ${T(c, 'sur l’App Store', 'on the App Store')} : ${c.lien}` : appel(c, v),
        T(c, `À bientôt,\n${c.auteur}`, `See you soon,\n${c.auteur}`),
      ].join('\n\n'),
    ),
  ];
}

// ---------------------------------------------------------------
//  Presse
// ---------------------------------------------------------------

function contactPresse(c) {
  const lignesContact = [
    c.auteur,
    c.email || aCompleter(c, 'ton e-mail : à renseigner dans Réglages', 'your e-mail: set it in Settings'),
    c.telephone,
    c.sitePerso || c.site,
  ].filter(Boolean);
  return lignesContact.join('\n');
}

function aPropos(c) {
  if (c.bio) return c.bio;
  return T(c,
    `${c.auteur} crée des applications pour iPhone et iPad en indépendant${c.ville ? `, depuis ${c.ville}` : ''}.${c.nbApps > 1 ? ` ${c.nbApps} de ses applications sont disponibles sur l’App Store.` : ''}`,
    `${c.auteur} is an independent developer of iPhone and iPad apps${c.ville ? ` based in ${c.ville}` : ''}.${c.nbApps > 1 ? ` ${c.nbApps} of their apps are available on the App Store.` : ''}`,
  );
}

/** Le communique : titre, chapo, corps, disponibilite, a propos, contact. */
function communique(c) {
  const titre = c.angle === 'nouveautes'
    ? T(c, `${c.nom} ${c.version} : du nouveau pour ${c.public}`, `${c.nom} ${c.version} brings new features for ${c.public}`)
    : `${c.nom} : ${c.sousTitre || c.accroche}`.replace(' : ', T(c, ' : ', ': '));
  const chapo = T(c,
    `${c.auteur}, qui crée des applications en indépendant, ${c.enLigne ? 'publie' : 'annonce'} ${c.nom}, une application${c.genre ? ` de la catégorie ${c.genre}` : ''} pensée pour ${c.public}. ${c.accroche}`,
    `Independent developer ${c.auteur} ${c.enLigne ? 'releases' : 'announces'} ${c.nom}, ${c.genre ? `a ${c.genre} app` : 'an app'} built for ${c.public}. ${c.accroche}`,
  );
  const corps = [
    T(c, `COMMUNIQUÉ DE PRESSE — ${c.ville ? `${c.ville}, le ` : ''}${c.date}`, `PRESS RELEASE — ${c.ville ? `${c.ville}, ` : ''}${c.date}`),
    titre.toLocaleUpperCase(c.L === 'fr' ? 'fr' : 'en'),
    chapo,
    T(c, 'Les points forts', 'Key features'),
    points(c, 6, '•'),
    T(c, 'Disponibilité et prix', 'Pricing and availability'),
    c.enLigne
      ? T(c,
          `${c.nom} est disponible dès maintenant sur l’App Store, pour ${c.appareils}${c.iosMin ? ` (iOS ${c.iosMin} ou ultérieur)` : ''}. ${prixLong(c)}.\n${c.lien}`,
          `${c.nom} is available now on the App Store for ${c.appareils}${c.iosMin ? ` (iOS ${c.iosMin} or later)` : ''}. ${prixLong(c)}.\n${c.lien}`,
        )
      : T(c, `${c.nom} sortira prochainement sur l’App Store, pour ${c.appareils}.`, `${c.nom} will be released soon on the App Store for ${c.appareils}.`),
    c.site ? T(c, `Site de l’application : ${c.site}`, `Website: ${c.site}`) : '',
    T(c, `Visuels et captures d’écran : dans le dossier de presse, ou sur simple demande.`, `Screenshots and artwork: in the press kit, or on request.`),
    T(c, `À propos de ${c.auteur}`, `About ${c.auteur}`),
    aPropos(c),
    T(c, 'Contact presse', 'Press contact'),
    contactPresse(c),
  ].filter(Boolean);
  return [
    champ('titre', T(c, 'Titre', 'Headline'), titre, { ligne: true }),
    champ('texte', T(c, 'Communiqué complet', 'Full press release'), corps.join('\n\n')),
  ];
}

/** L'e-mail a un journaliste : court, et on propose le dossier. */
function pitch(c) {
  return [
    champ('objet', T(c, 'Objet', 'Subject'), T(c, `${c.nom} : ${min(c, c.sousTitre || c.accroche)} (app iPhone)`, `${c.nom}: ${c.sousTitre || c.accroche} (iPhone app)`), { ligne: true }),
    champ(
      'corps',
      T(c, 'Message', 'Body'),
      T(c,
        [
          `Bonjour,`,
          `J’ai le plaisir de vous présenter ${c.nom}, une application ${c.enLigne ? (c.recente ? 'que je viens de publier' : 'que j’ai publiée') : 'qui sort bientôt'} sur l’App Store, pour ${c.appareils}.`,
          `En une phrase : ${min(c, c.accroche)}`,
          `Ce qui la distingue :\n${points(c, 3, '•')}`,
          c.enLigne ? `${prixLong(c)}. Lien : ${c.lien}` : '',
          `Je peux vous envoyer le dossier de presse (communiqué, captures, visuels) ou répondre à vos questions.`,
          `Merci pour votre attention,\n${contactPresse(c)}`,
        ],
        [
          `Hello,`,
          `I’d like to introduce ${c.nom}, an app I ${c.enLigne ? (c.recente ? 'just released' : 'released') : 'will soon release'} on the App Store for ${c.appareils}.`,
          `In one sentence: ${c.accroche}`,
          `What makes it different:\n${points(c, 3, '•')}`,
          c.enLigne ? `${prixLong(c)}. Link: ${c.lien}` : '',
          `I’m happy to send the press kit (release, screenshots, artwork) or answer any questions.`,
          `Thank you for your time,\n${contactPresse(c)}`,
        ],
      ).filter(Boolean).join('\n\n'),
    ),
  ];
}

/** La presse regionale : l'angle, c'est toi et ta ville. */
function presseLocale(c) {
  const ville = c.ville || aCompleter(c, 'ta ville : dans Réglages', 'your town: in Settings');
  return [
    champ('objet', T(c, 'Objet', 'Subject'), T(c, `${ville} : ${c.auteur} publie l’application ${c.nom}`, `${ville}: ${c.auteur} releases the app ${c.nom}`), { ligne: true }),
    champ(
      'corps',
      T(c, 'Message', 'Body'),
      T(c,
        [
          `Bonjour,`,
          `J’habite ${ville} et je crée des applications pour iPhone en indépendant.${c.nbApps > 1 ? ` ${c.nbApps} d’entre elles sont sur l’App Store.` : ''}`,
          `${c.recente ? 'La dernière' : 'L’une d’elles'} s’appelle ${c.nom} : ${min(c, c.sousTitre || c.accroche)}. ${c.accroche}`,
          `Elle s’adresse ${a(c.public)}${c.enLigne ? ` et elle est ${minuscule(prixLong(c))} : ${c.lien}` : ''}.`,
          `Ce serait un plaisir de vous en parler, de vous la montrer ou de répondre à vos questions. Je peux aussi vous envoyer des visuels.`,
          `Bien cordialement,\n${contactPresse(c)}`,
        ],
        [
          `Hello,`,
          `I live in ${ville} and I build iPhone apps as an independent developer.`,
          `${c.recente ? 'My latest' : 'One of them'} is called ${c.nom}: ${c.sousTitre || c.accroche}. ${c.accroche}`,
          `It’s for ${c.public}${c.enLigne ? ` and it’s ${minuscule(prixLong(c))}: ${c.lien}` : ''}.`,
          `I’d be glad to tell you more, show it to you, or send artwork.`,
          `Best regards,\n${contactPresse(c)}`,
        ],
      ).join('\n\n'),
    ),
  ];
}

/** Blogueurs, YouTubeurs, podcasts : on propose un essai. */
function createurs(c) {
  return [
    champ('objet', T(c, 'Objet', 'Subject'), T(c, `Une app pour ${c.public} à tester : ${c.nom}`, `An app for ${c.public} to try: ${c.nom}`), { ligne: true }),
    champ(
      'corps',
      T(c, 'Message', 'Body'),
      T(c,
        [
          `Bonjour,`,
          `Je suis votre travail sur [sujet de sa chaîne ou de son blog] et je pense que ${c.nom} pourrait intéresser votre public.`,
          `${c.nom}, c’est ${min(c, c.sousTitre || c.accroche)}. ${c.accroche}`,
          points(c, 3, '•'),
          `${c.enLigne ? `Elle est ${minuscule(prixLong(c))} : ${c.lien}` : 'Elle sort bientôt, je peux vous donner un accès en avant-première.'}`,
          `Aucune obligation, bien sûr : si elle vous plaît et que vous en parlez, je relaierai avec plaisir. Je reste disponible pour une démo ou des visuels.`,
          `Merci !\n${c.auteur}${c.email ? `\n${c.email}` : ''}`,
        ],
        [
          `Hello,`,
          `I follow your work on [their channel or blog topic] and I think ${c.nom} could interest your audience.`,
          `${c.nom} is ${min(c, c.sousTitre || c.accroche)}. ${c.accroche}`,
          points(c, 3, '•'),
          `${c.enLigne ? `It’s ${minuscule(prixLong(c))}: ${c.lien}` : 'It’s coming soon and I can give you early access.'}`,
          `No strings attached: if you like it and talk about it, I’ll happily share it. I’m available for a demo or artwork.`,
          `Thanks!\n${c.auteur}${c.email ? `\n${c.email}` : ''}`,
        ],
      ).join('\n\n'),
    ),
  ];
}

// ---------------------------------------------------------------
//  Apple, web, imprime
// ---------------------------------------------------------------

function nomination(c) {
  return [
    champ('nom', T(c, 'Nom de la nomination', 'Nomination name'), `${c.nom} — ${c.angle === 'nouveautes' ? `${T(c, 'version', 'version')} ${c.version}` : T(c, 'lancement', 'launch')}`, { ligne: true }),
    champ('type', 'Type', c.angle === 'nouveautes' ? 'App Enhancements' : c.enLigne && !c.recente ? 'New Content' : 'App Launch', { ligne: true }),
    champ(
      'description',
      T(c, 'Description (ce qui la rend remarquable)', 'Description (what makes it stand out)'),
      [
        `${c.nom}: ${c.sousTitre || c.accroche}.`,
        c.accroche,
        points(c, 4, '•'),
        T(c,
          `Conçue et développée en indépendant, pour ${c.public}.`,
          `Designed and built by an independent developer, for ${c.public}.`,
        ),
      ].join('\n\n'),
    ),
  ];
}

function signature(c) {
  return [
    champ('texte', T(c, 'Signature', 'Signature'), `${c.auteur}\n📱 ${T(c, 'Mon app', 'My app')} ${c.nom} : ${min(c, c.sousTitre || c.accroche)}\n${c.lien || c.site}`.replace(' : ', T(c, ' : ', ': '))),
  ];
}

function siteWeb(c) {
  return [
    champ('titre', T(c, 'Titre de la page', 'Page title'), `${c.nom} — ${c.sousTitre || c.accroche}`, { ligne: true }),
    champ('accroche', T(c, 'Accroche', 'Tagline'), c.accroche),
    champ('points', T(c, 'Points forts (un par ligne)', 'Features (one per line)'), c.pointsForts.join('\n')),
  ];
}

function affiche(c) {
  return [
    champ('titre', T(c, 'Titre', 'Title'), c.nom, { ligne: true }),
    champ('sousTitre', T(c, 'Sous-titre', 'Subtitle'), c.sousTitre || c.accroche, { ligne: true }),
    champ('points', T(c, 'Trois points forts', 'Three highlights'), c.pointsForts.slice(0, 3).join('\n')),
    champ('appel', T(c, 'Appel', 'Call to action'), c.enLigne ? T(c, `${c.prix} sur l’App Store — scannez le code`, `${c.prix} on the App Store — scan the code`) : T(c, 'Bientôt sur l’App Store', 'Coming soon to the App Store'), { ligne: true }),
  ];
}

function dossierPresse(c) {
  return [
    champ('contenu', T(c, 'Contenu du dossier', 'Kit contents'), T(c,
      `• communique-fr.txt et communique-en.txt\n• icone.png\n• les captures d’écran\n• les visuels (carré, portrait, story, paysage)\n• fiche.txt : liens, prix, appareils, contact`,
      `• press-release-fr.txt and press-release-en.txt\n• icon.png\n• the screenshots\n• artwork (square, portrait, story, landscape)\n• factsheet.txt: links, price, devices, contact`,
    )),
  ];
}

// ---------------------------------------------------------------

export const STYLES = {
  court, social, legende, story, pro, communaute, reddit, producthunt, hackernews,
  annuaire, indiehackers, script, youtube, pinterest, message, emailProches, newsletter,
  communique, pitch, presseLocale, createurs, nomination, signature, siteWeb, affiche, dossierPresse,
};

/**
 * Les champs d'une publication, prets a afficher.
 * Chaque champ : { cle, label, valeur, limite?, ligne? }
 */
export function generer(canal, c, variante = 0) {
  const style = STYLES[canal.style];
  if (!style) throw new Error(`Style inconnu : ${canal.style}`);
  return style(c, variante, canal).map((ch) => {
    const valeur = nettoyerBlancs(c.L === 'fr' ? typo(ch.valeur) : ch.valeur);
    const limite = ch.limite ?? (ch.cle === 'texte' ? canal.limite : undefined);
    return { ...ch, valeur, limite, compte: canal.compte };
  });
}

/** Le texte a copier d'un coup : les champs mis bout a bout. */
export function texteComplet(champs) {
  if (champs.length === 1) return champs[0].valeur;
  return champs.map((ch) => (ch.ligne ? `${ch.label} : ${ch.valeur}` : `${ch.label}\n${ch.valeur}`)).join('\n\n');
}
