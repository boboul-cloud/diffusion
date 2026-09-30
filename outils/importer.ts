/**
 * Rassemble ce que Diffusion montre de chaque app, dans public/data/.
 *
 * - Les apps en ligne : leur fiche publique de l'App Store (nom, description,
 *   icone, captures, lien, en francais et en anglais quand elle existe).
 * - Toutes : la feuille SOUMISSION.md du projet, lue par AgentDouble, pour ce
 *   que l'App Store ne publie pas (sous-titre, texte promotionnel, mots-cles),
 *   et pour tout le reste quand l'app n'est pas encore publiee.
 *
 *   npm run importer                    toutes les apps
 *   npm run importer -- --en-ligne      seulement les apps publiees
 *   npm run importer -- --forcer        retelecharge toutes les images
 *   npm run importer -- --sans-asc      sans lire App Store Connect
 *
 * Ne modifie jamais les projets : il les lit, c'est tout.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { discover, type Discovered } from '../../AgentDouble/src/commands/scan.ts';
import {
  lireDocument,
  trouverCaptures,
  trouverDocument,
  trouverFeuilleAchats,
  type Lecture,
} from '../../AgentDouble/src/app/document.ts';

const RACINE = path.resolve(import.meta.dirname, '..');
const DATA = path.join(RACINE, 'public', 'data');
const BUREAU = path.join(os.homedir(), 'Desktop');

const options = new Set(process.argv.slice(2));
const SEULEMENT_EN_LIGNE = options.has('--en-ligne');
const FORCER = options.has('--forcer');
const SANS_ASC = options.has('--sans-asc');
const AGENT_DOUBLE = path.resolve(RACINE, '..', 'AgentDouble');

const MAX_IPHONE = 6;
const MAX_IPAD = 3;

// ---------------------------------------------------------------
//  Types
// ---------------------------------------------------------------

type Captures = { iphone: string[]; ipad: string[] };

type Langue = {
  nom: string;
  sousTitre: string;
  promo: string;
  description: string;
  motsCles: string[];
  nouveautes: string;
  captures: Captures;
};

export type AppDiffusion = {
  slug: string;
  bundleId: string;
  enLigne: boolean;
  lien: string;
  lienInternational: string;
  gratuit: boolean;
  prix: string;
  achats: boolean;
  categorie: string;
  genre: { fr: string; en: string };
  appareils: string[];
  iosMin: string;
  note: { moyenne: number; avis: number } | null;
  sortie: string;
  version: string;
  developpeur: string;
  site: string;
  assistance: string;
  confidentialite: string;
  icone: string;
  languePrincipale: 'fr' | 'en';
  langues: { fr?: Langue; en?: Langue };
};

type FicheApple = {
  trackId: number;
  trackName: string;
  bundleId: string;
  trackViewUrl: string;
  artworkUrl512: string;
  screenshotUrls: string[];
  ipadScreenshotUrls: string[];
  description: string;
  releaseNotes?: string;
  price: number;
  formattedPrice: string;
  primaryGenreId: number;
  primaryGenreName: string;
  supportedDevices?: string[];
  minimumOsVersion?: string;
  averageUserRating?: number;
  userRatingCount?: number;
  releaseDate?: string;
  version?: string;
  artistName?: string;
  sellerUrl?: string;
};

// ---------------------------------------------------------------
//  Categories
// ---------------------------------------------------------------

/** primaryGenreId de l'App Store → la cle de categorie qu'utilise AgentDouble. */
const GENRES_APPLE: Record<number, string> = {
  6000: 'BUSINESS',
  6001: 'WEATHER',
  6002: 'UTILITIES',
  6003: 'TRAVEL',
  6004: 'SPORTS',
  6005: 'SOCIAL_NETWORKING',
  6006: 'REFERENCE',
  6007: 'PRODUCTIVITY',
  6008: 'PHOTO_AND_VIDEO',
  6009: 'NEWS',
  6010: 'NAVIGATION',
  6011: 'MUSIC',
  6012: 'LIFESTYLE',
  6013: 'HEALTH_AND_FITNESS',
  6014: 'GAMES',
  6015: 'FINANCE',
  6016: 'ENTERTAINMENT',
  6017: 'EDUCATION',
  6018: 'BOOKS',
  6020: 'MEDICAL',
  6021: 'MAGAZINES_AND_NEWSPAPERS',
  6023: 'FOOD_AND_DRINK',
  6024: 'SHOPPING',
  6026: 'DEVELOPER_TOOLS',
  6027: 'GRAPHICS_AND_DESIGN',
};

/** Pour les apps pas encore publiees : le libelle que l'App Store afficherait. */
const LIBELLES: Record<string, [string, string]> = {
  BUSINESS: ['Économie et entreprise', 'Business'],
  WEATHER: ['Météo', 'Weather'],
  UTILITIES: ['Utilitaires', 'Utilities'],
  TRAVEL: ['Voyages', 'Travel'],
  SPORTS: ['Sports', 'Sports'],
  SOCIAL_NETWORKING: ['Réseaux sociaux', 'Social Networking'],
  REFERENCE: ['Référence', 'Reference'],
  PRODUCTIVITY: ['Productivité', 'Productivity'],
  PHOTO_AND_VIDEO: ['Photo et vidéo', 'Photo & Video'],
  NEWS: ['Actualités', 'News'],
  NAVIGATION: ['Navigation', 'Navigation'],
  MUSIC: ['Musique', 'Music'],
  LIFESTYLE: ['Style de vie', 'Lifestyle'],
  HEALTH_AND_FITNESS: ['Forme et santé', 'Health & Fitness'],
  GAMES: ['Jeux', 'Games'],
  FINANCE: ['Finance', 'Finance'],
  ENTERTAINMENT: ['Divertissement', 'Entertainment'],
  EDUCATION: ['Éducation', 'Education'],
  BOOKS: ['Livres', 'Books'],
  MEDICAL: ['Médecine', 'Medical'],
  MAGAZINES_AND_NEWSPAPERS: ['Journaux', 'Magazines & Newspapers'],
  FOOD_AND_DRINK: ['Cuisine et boissons', 'Food & Drink'],
  SHOPPING: ['Shopping', 'Shopping'],
  DEVELOPER_TOOLS: ['Outils de développement', 'Developer Tools'],
  GRAPHICS_AND_DESIGN: ['Graphisme et design', 'Graphics & Design'],
};

// ---------------------------------------------------------------
//  App Store : la recherche publique, sans compte ni cle
// ---------------------------------------------------------------

async function ficheApple(bundleIds: string[], langue: 'fr' | 'en'): Promise<Map<string, FicheApple>> {
  const fiches = new Map<string, FicheApple>();
  // Des paquets de 25 : l'adresse reste courte, et une erreur n'emporte pas tout.
  for (let i = 0; i < bundleIds.length; i += 25) {
    const lot = bundleIds.slice(i, i + 25).join(',');
    const url = `https://itunes.apple.com/lookup?bundleId=${lot}&country=fr&entity=software${langue === 'en' ? '&lang=en_us' : ''}`;
    const reponse = await fetch(url);
    if (!reponse.ok) throw new Error(`App Store : ${reponse.status} pour ${url}`);
    const json = (await reponse.json()) as { results: FicheApple[] };
    for (const r of json.results) fiches.set(r.bundleId, r);
  }
  return fiches;
}

// ---------------------------------------------------------------
//  App Store Connect, en lecture seule, avec la cle d'AgentDouble :
//  ce que la recherche publique ne donne pas (sous-titre, texte
//  promotionnel, mots-cles) pour les versions en ligne.
// ---------------------------------------------------------------

type TextesAsc = { nom: string; sousTitre: string; promo: string; description: string; motsCles: string[] };
type FicheAsc = Partial<Record<'fr' | 'en', TextesAsc>>;

const langueDe = (locale: string): 'fr' | 'en' | null =>
  /^fr/i.test(locale) ? 'fr' : /^en/i.test(locale) ? 'en' : null;

/** en-US passe avant en-GB, fr-FR avant fr-CA. */
const prioriteLocale = (locale: string) => (/^(fr-FR|en-US)$/.test(locale) ? 0 : 1);

async function lireAppStoreConnect(bundleIds: string[]): Promise<Map<string, FicheAsc>> {
  const fiches = new Map<string, FicheAsc>();
  const env = path.join(AGENT_DOUBLE, '.env');
  if (SANS_ASC || !bundleIds.length || !fs.existsSync(env)) return fiches;

  process.loadEnvFile(env);
  const cle = process.env.ASC_PRIVATE_KEY_PATH;
  if (cle && !path.isAbsolute(cle)) process.env.ASC_PRIVATE_KEY_PATH = path.resolve(AGENT_DOUBLE, cle);

  const { loadCredentials } = await import('../../AgentDouble/src/config.ts');
  const { AscClient } = await import('../../AgentDouble/src/asc/client.ts');
  const client = new AscClient(loadCredentials());

  const apps = await client.list('/v1/apps', { 'filter[bundleId]': bundleIds.join(','), 'fields[apps]': 'bundleId' });
  const enLigne = (r: { attributes?: Record<string, any> }) =>
    r.attributes?.state === 'READY_FOR_DISTRIBUTION' ||
    r.attributes?.appVersionState === 'READY_FOR_DISTRIBUTION' ||
    r.attributes?.appStoreState === 'READY_FOR_SALE';

  await Promise.all(
    apps.map(async (app) => {
      const fiche: FicheAsc = {};
      const poser = (locale: string, champs: Partial<TextesAsc>) => {
        const l = langueDe(locale);
        if (!l) return;
        const t = (fiche[l] ??= { nom: '', sousTitre: '', promo: '', description: '', motsCles: [] });
        for (const [k, v] of Object.entries(champs)) {
          if (v && !(t as any)[k]?.length) (t as any)[k] = v;
        }
      };

      const infos = await client.list(`/v1/apps/${app.id}/appInfos`);
      const info = infos.find(enLigne);
      if (info) {
        const locs = await client.list(`/v1/appInfos/${info.id}/appInfoLocalizations`);
        locs.sort((a, b) => prioriteLocale(a.attributes?.locale) - prioriteLocale(b.attributes?.locale));
        for (const l of locs) poser(l.attributes?.locale, { nom: l.attributes?.name, sousTitre: l.attributes?.subtitle });
      }

      const versions = await client.list(`/v1/apps/${app.id}/appStoreVersions`, { 'filter[platform]': 'IOS' });
      const version = versions.find(enLigne);
      if (version) {
        const locs = await client.list(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`);
        locs.sort((a, b) => prioriteLocale(a.attributes?.locale) - prioriteLocale(b.attributes?.locale));
        for (const l of locs) {
          poser(l.attributes?.locale, {
            promo: l.attributes?.promotionalText?.trim(),
            description: l.attributes?.description?.trim(),
            motsCles: motsCles(l.attributes?.keywords ?? ''),
          });
        }
      }
      fiches.set(app.attributes?.bundleId, fiche);
    }),
  );
  return fiches;
}

/** Les images de l'App Store se demandent a la taille voulue par la fin de l'adresse. */
const taille = (url: string, suffixe: string) => url.replace(/\/[^/]+$/, `/${suffixe}`);

// ---------------------------------------------------------------
//  Images : copiees une fois dans public/data/apps/<slug>/
// ---------------------------------------------------------------

type Sources = Record<string, string>;

function lireSources(dossier: string): Sources {
  try {
    return JSON.parse(fs.readFileSync(path.join(dossier, 'sources.json'), 'utf8'));
  } catch {
    return {};
  }
}

/** Une capture d'ecran du projet : ramenee a 1600 px et en JPEG, pour rester legere en ligne. */
function convertir(source: string, cible: string, cote: number, format: 'jpeg' | 'png'): void {
  const args = ['-s', 'format', format];
  if (format === 'jpeg') args.push('-s', 'formatOptions', '84');
  execFileSync('sips', [...args, '-Z', String(cote), source, '--out', cible], { stdio: 'ignore' });
}

class Images {
  private sources: Sources;
  private nouvelles: Sources = {};
  private telechargements: Promise<void>[] = [];
  private dossier: string;

  constructor(dossier: string) {
    this.dossier = dossier;
    fs.mkdirSync(dossier, { recursive: true });
    this.sources = lireSources(dossier);
  }

  private dejaLa(nom: string, source: string): boolean {
    this.nouvelles[nom] = source;
    return !FORCER && this.sources[nom] === source && fs.existsSync(path.join(this.dossier, nom));
  }

  distante(nom: string, url: string): string {
    if (!this.dejaLa(nom, url)) {
      this.telechargements.push(
        (async () => {
          const r = await fetch(url);
          if (!r.ok) throw new Error(`${r.status} pour ${url}`);
          fs.writeFileSync(path.join(this.dossier, nom), Buffer.from(await r.arrayBuffer()));
        })(),
      );
    }
    return nom;
  }

  locale(nom: string, fichier: string, cote: number, format: 'jpeg' | 'png'): string {
    const empreinte = `${fichier}@${fs.statSync(fichier).mtimeMs}`;
    if (!this.dejaLa(nom, empreinte)) convertir(fichier, path.join(this.dossier, nom), cote, format);
    return nom;
  }

  /** Une empreinte de la source : une image remplacee change d'adresse, le cache ne la garde pas. */
  version(nom: string): string {
    return createHash('sha1').update(this.nouvelles[nom] ?? '').digest('hex').slice(0, 8);
  }

  async terminer(): Promise<void> {
    await Promise.all(this.telechargements);
    // Les images qui ne servent plus (capture retiree de l'App Store…) s'en vont.
    for (const f of fs.readdirSync(this.dossier)) {
      if (f !== 'sources.json' && !(f in this.nouvelles)) fs.rmSync(path.join(this.dossier, f));
    }
    fs.writeFileSync(path.join(this.dossier, 'sources.json'), JSON.stringify(this.nouvelles, null, 2));
  }
}

// ---------------------------------------------------------------
//  Le projet Xcode : icone et captures des apps pas encore publiees
// ---------------------------------------------------------------

const IGNORES = new Set(['build', 'DerivedData', 'node_modules', 'Pods', '.git', 'soumission', 'captures']);

const ICTOOL = '/Applications/Xcode.app/Contents/Applications/Icon Composer.app/Contents/Executables/ictool';

/**
 * L'icone du projet : le plus grand PNG de AppIcon.appiconset, ou, pour une
 * icone Icon Composer (AppIcon.icon, Xcode 26), son rendu par ictool.
 */
function trouverIcone(projetXcode: string, dossierTemp: string): string | null {
  const racine = path.dirname(projetXcode);
  const trouves: string[] = [];
  const composer: string[] = [];
  const parcourir = (dir: string, profondeur: number) => {
    let entrees: fs.Dirent[];
    try {
      entrees = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entrees) {
      if (!e.isDirectory() || e.name.startsWith('.') || IGNORES.has(e.name)) continue;
      const plein = path.join(dir, e.name);
      if (e.name === 'AppIcon.appiconset') trouves.push(plein);
      else if (e.name === 'AppIcon.icon') composer.push(plein);
      else if (profondeur < 5) parcourir(plein, profondeur + 1);
    }
  };
  parcourir(racine, 0);

  let meilleure: { fichier: string; cote: number } | null = null;
  for (const set of trouves) {
    for (const f of fs.readdirSync(set)) {
      if (!/\.png$/i.test(f)) continue;
      const fichier = path.join(set, f);
      const sortie = execFileSync('sips', ['-g', 'pixelWidth', fichier], { encoding: 'utf8' });
      const cote = Number(sortie.match(/pixelWidth: (\d+)/)?.[1] ?? 0);
      if (!meilleure || cote > meilleure.cote) meilleure = { fichier, cote };
    }
  }
  if (meilleure) return meilleure.fichier;

  if (composer.length && fs.existsSync(ICTOOL)) {
    const sortie = path.join(dossierTemp, 'icone-composer.png');
    try {
      execFileSync(ICTOOL, [composer[0], '--export-image', '--output-file', sortie, '--platform', 'iOS', '--rendition', 'Default', '--width', '512', '--height', '512', '--scale', '1'], { stdio: 'ignore' });
      return fs.existsSync(sortie) ? sortie : null;
    } catch {
      return null;
    }
  }
  return null;
}

const IMAGE = /\.(png|jpe?g)$/i;
const ECARTES = /^(_|achats$|mac$)/i;

/**
 * captures/iphone-6.9/, captures/fr/iphone-6.9/, captures/iPhone-6.9/… :
 * pour une langue, le dossier iPhone (le plus grand ecran) et le dossier iPad.
 */
function capturesLocales(dossier: string, langue: 'fr' | 'en'): { iphone: string[]; ipad: string[] } {
  const sous = (dir: string) =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && !ECARTES.test(e.name))
      : [];
  const parLangue = sous(dossier).find((e) => e.name.toLowerCase() === langue);
  const base = parLangue ? path.join(dossier, parLangue.name) : langue === 'fr' ? dossier : null;
  if (!base) return { iphone: [], ipad: [] };

  const appareil = (re: RegExp) => {
    const dirs = sous(base)
      .filter((e) => re.test(e.name))
      .map((e) => e.name)
      .sort((a, b) => Number(b.match(/[\d.]+/)?.[0] ?? 0) - Number(a.match(/[\d.]+/)?.[0] ?? 0));
    if (!dirs.length) return [];
    const dir = path.join(base, dirs[0]);
    return fs
      .readdirSync(dir)
      .filter((f) => IMAGE.test(f))
      .sort()
      .map((f) => path.join(dir, f));
  };
  return { iphone: appareil(/iphone/i), ipad: appareil(/ipad/i) };
}

// ---------------------------------------------------------------
//  Assemblage
// ---------------------------------------------------------------

const REMPLIR = /a completer|à compléter/i;
const propre = (s: string | undefined) => (s && !REMPLIR.test(s) ? s.trim() : '');
const motsCles = (s: string | undefined) =>
  propre(s)
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

/** « robert Oulhen » → « Robert Oulhen » */
const nomPropre = (s: string) => s.replace(/(^|[\s-])(\p{Ll})/gu, (_, a, b) => a + b.toUpperCase());

const lienPropre = (url: string) => url.replace(/\?.*$/, '');

function langueVide(): Langue {
  return { nom: '', sousTitre: '', promo: '', description: '', motsCles: [], nouveautes: '', captures: { iphone: [], ipad: [] } };
}

function depuisFeuille(l: Langue, lu: Lecture): void {
  l.nom ||= propre(lu.champs.name);
  l.sousTitre ||= propre(lu.champs.subtitle);
  l.promo ||= propre(lu.champs.promotionalText);
  l.description ||= propre(lu.champs.description);
  if (!l.motsCles.length) l.motsCles = motsCles(lu.champs.keywords);
}

async function assembler(
  d: Discovered,
  fr: FicheApple | undefined,
  en: FicheApple | undefined,
  asc: FicheAsc | undefined,
): Promise<AppDiffusion | string> {
  const doc = trouverDocument(d.projectPath);
  const lu = doc ? lireDocument(fs.readFileSync(doc, 'utf8')) : null;
  const langueFeuille: 'fr' | 'en' = lu?.locale === 'en-US' ? 'en' : 'fr';

  if (!fr && !lu) return 'ni publiée, ni feuille de soumission';
  if (!fr && SEULEMENT_EN_LIGNE) return 'pas encore publiée';
  if (!fr && !propre(lu?.champs.description)) return 'feuille sans description';

  const dossier = path.join(DATA, 'apps', d.slug);
  const images = new Images(dossier);
  const web = (nom: string) => `data/apps/${d.slug}/${nom}?v=${images.version(nom)}`;

  const langues: AppDiffusion['langues'] = {};

  if (fr) {
    const l = (langues.fr = langueVide());
    l.nom = fr.trackName;
    l.description = fr.description.trim();
    l.nouveautes = fr.releaseNotes?.trim() ?? '';
    l.captures.iphone = fr.screenshotUrls
      .slice(0, MAX_IPHONE)
      .map((u, i) => web(images.distante(`fr-iphone-${i + 1}.jpg`, taille(u, '1600x1600bb.jpg'))));
    l.captures.ipad = fr.ipadScreenshotUrls
      .slice(0, MAX_IPAD)
      .map((u, i) => web(images.distante(`fr-ipad-${i + 1}.jpg`, taille(u, '1600x1600bb.jpg'))));

    // L'App Store rend la fiche francaise quand l'app n'a pas d'anglais.
    if (en && en.description.trim() !== fr.description.trim()) {
      const e = (langues.en = langueVide());
      e.nom = en.trackName;
      e.description = en.description.trim();
      e.nouveautes = en.releaseNotes?.trim() ?? '';
      const memes = en.screenshotUrls.join() === fr.screenshotUrls.join();
      if (!memes) {
        e.captures.iphone = en.screenshotUrls
          .slice(0, MAX_IPHONE)
          .map((u, i) => web(images.distante(`en-iphone-${i + 1}.jpg`, taille(u, '1600x1600bb.jpg'))));
        e.captures.ipad = en.ipadScreenshotUrls
          .slice(0, MAX_IPAD)
          .map((u, i) => web(images.distante(`en-ipad-${i + 1}.jpg`, taille(u, '1600x1600bb.jpg'))));
      }
    }
  }

  // La version en ligne, lue dans App Store Connect : elle fait foi pour
  // ce que la recherche publique ne donne pas.
  for (const langue of ['fr', 'en'] as const) {
    const t = asc?.[langue];
    if (!t || !fr) continue;
    const l = langues[langue] ?? (t.description ? (langues[langue] = langueVide()) : undefined);
    if (!l) continue;
    l.nom ||= t.nom;
    l.description ||= t.description;
    l.sousTitre ||= t.sousTitre;
    l.promo ||= t.promo;
    if (!l.motsCles.length) l.motsCles = t.motsCles;
  }

  if (lu) {
    // Une app publiee en francais dont la feuille est en anglais : la feuille
    // decrit l'anglais. Sinon elle complete la langue principale.
    const l = (langues[langueFeuille] ??= langueVide());
    depuisFeuille(l, lu);
  }

  if (!fr && doc && lu) {
    const dossierCaptures = trouverCaptures(doc, d.projectPath);
    if (dossierCaptures) {
      for (const langue of ['fr', 'en'] as const) {
        const l = langues[langue];
        if (!l) continue;
        const c = capturesLocales(dossierCaptures, langue);
        l.captures.iphone = c.iphone
          .slice(0, MAX_IPHONE)
          .map((f, i) => web(images.locale(`${langue}-iphone-${i + 1}.jpg`, f, 1600, 'jpeg')));
        l.captures.ipad = c.ipad
          .slice(0, MAX_IPAD)
          .map((f, i) => web(images.locale(`${langue}-ipad-${i + 1}.jpg`, f, 1600, 'jpeg')));
      }
    }
  }

  let icone = '';
  if (fr) icone = web(images.distante('icone.png', taille(fr.artworkUrl512, '512x512bb.png')));
  else {
    const fichier = trouverIcone(d.projectPath, fs.mkdtempSync(path.join(os.tmpdir(), 'diffusion-')));
    if (fichier) icone = web(images.locale('icone.png', fichier, 512, 'png'));
  }

  await images.terminer();

  const categorie = (fr && GENRES_APPLE[fr.primaryGenreId]) || lu?.primaryCategory || 'UTILITIES';
  const [genreFr, genreEn] = LIBELLES[categorie] ?? ['', ''];
  const appareils = fr
    ? [
        ...(fr.supportedDevices?.some((s) => /^iPhone/i.test(s)) ? ['iphone'] : []),
        ...(fr.supportedDevices?.some((s) => /^iPad/i.test(s)) || fr.ipadScreenshotUrls.length ? ['ipad'] : []),
      ]
    : ['iphone', ...(Object.values(langues).some((l) => l.captures.ipad.length) ? ['ipad'] : [])];

  const achats = !!(doc && trouverFeuilleAchats(doc, d.projectPath));
  const nbAvis = fr?.userRatingCount ?? 0;

  return {
    slug: d.slug,
    bundleId: d.bundleId,
    enLigne: !!fr,
    lien: fr ? lienPropre(fr.trackViewUrl) : '',
    lienInternational: fr ? `https://apps.apple.com/app/id${fr.trackId}` : '',
    gratuit: fr ? fr.price === 0 : true,
    prix: fr && fr.price > 0 ? fr.formattedPrice : '',
    achats,
    categorie,
    genre: { fr: genreFr, en: genreEn },
    appareils: appareils.length ? appareils : ['iphone'],
    iosMin: fr?.minimumOsVersion ?? '',
    note: nbAvis >= 3 ? { moyenne: Math.round((fr!.averageUserRating ?? 0) * 10) / 10, avis: nbAvis } : null,
    sortie: fr?.releaseDate ?? '',
    version: fr?.version ?? d.version,
    developpeur: nomPropre(fr?.artistName ?? lu?.copyright?.replace(/^\d{4}\s*/, '') ?? ''),
    site: propre(lu?.champs.marketingUrl) || fr?.sellerUrl || '',
    assistance: propre(lu?.champs.supportUrl),
    confidentialite: propre(lu?.champs.privacyPolicyUrl),
    icone,
    languePrincipale: fr ? 'fr' : langueFeuille,
    langues,
  };
}

async function main() {
  console.log('Recherche des projets Xcode du Bureau…');
  const projets = discover([BUREAU]);
  const ids = projets.map((p) => p.bundleId);

  console.log(`${projets.length} projets. Lecture de leurs fiches sur l'App Store…`);
  const [fr, en] = await Promise.all([ficheApple(ids, 'fr'), ficheApple(ids, 'en')]);

  let asc = new Map<string, FicheAsc>();
  try {
    const publiees = ids.filter((id) => fr.has(id));
    asc = await lireAppStoreConnect(publiees);
    if (asc.size) console.log(`Sous-titres et mots-clés lus dans App Store Connect pour ${asc.size} apps.`);
  } catch (e) {
    console.log(`App Store Connect n'a pas répondu (${(e as Error).message.split('\n')[0]}) : on fait sans.`);
  }

  const apps: AppDiffusion[] = [];
  const ignorees: { slug: string; raison: string }[] = [];
  for (const p of projets) {
    try {
      const r = await assembler(p, fr.get(p.bundleId), en.get(p.bundleId), asc.get(p.bundleId));
      if (typeof r === 'string') ignorees.push({ slug: p.slug, raison: r });
      else {
        apps.push(r);
        const l = r.langues[r.languePrincipale]!;
        const nb = l.captures.iphone.length + l.captures.ipad.length;
        console.log(`  ${r.enLigne ? '●' : '○'} ${l.nom || r.slug}  (${nb} captures${r.langues.en ? ', anglais' : ''})`);
      }
    } catch (e) {
      ignorees.push({ slug: p.slug, raison: `erreur : ${(e as Error).message}` });
    }
  }

  // Les dossiers d'images d'apps disparues de la liste s'en vont aussi.
  const gardes = new Set(apps.map((a) => a.slug));
  const dossierApps = path.join(DATA, 'apps');
  for (const f of fs.existsSync(dossierApps) ? fs.readdirSync(dossierApps) : []) {
    if (!gardes.has(f)) fs.rmSync(path.join(dossierApps, f), { recursive: true, force: true });
  }

  apps.sort((a, b) => Number(b.enLigne) - Number(a.enLigne) || a.slug.localeCompare(b.slug));
  const sortie = { genere: new Date().toISOString(), apps, ignorees };
  fs.mkdirSync(DATA, { recursive: true });
  const tmp = path.join(DATA, 'apps.json.tmp');
  fs.writeFileSync(tmp, JSON.stringify(sortie, null, 1));
  fs.renameSync(tmp, path.join(DATA, 'apps.json'));

  const enLigne = apps.filter((a) => a.enLigne).length;
  console.log(`\n${apps.length} apps prêtes (${enLigne} en ligne, ${apps.length - enLigne} pas encore publiées).`);
  const erreurs = ignorees.filter((i) => i.raison.startsWith('erreur'));
  if (erreurs.length) {
    console.log('\nProblèmes :');
    for (const i of erreurs) console.log(`  ${i.slug} : ${i.raison}`);
    process.exitCode = 1;
  }
  console.log(`${ignorees.length - erreurs.length} projets écartés (ni publiés ni décrits dans une feuille).`);
}

await main();
