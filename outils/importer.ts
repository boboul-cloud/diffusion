/**
 * Rassemble ce que Diffusion montre de chaque app, dans public/data/.
 *
 * - Les apps en ligne : leur fiche publique de l'App Store (nom, description,
 *   icone, captures, lien, en francais et en anglais quand elle existe).
 * - Toutes : la feuille SOUMISSION.md du projet, lue par AgentDouble, pour ce
 *   que l'App Store ne publie pas (sous-titre, texte promotionnel, mots-cles),
 *   et pour tout le reste quand l'app n'est pas encore publiee.
 * - Tes apps de l'App Store dont le projet n'est pas sur le Bureau : leur
 *   fiche publique seule (la page developpeur les donne toutes).
 * - Les apps web du Dico de nos creations (/Volumes/Travail/Dico) : nom,
 *   definition, icone, et des captures prises en ligne par Chrome sans ecran.
 * - Ce que tu as ajoute ou enleve dans « Ajouter ou enlever » (liste-apps.json) :
 *   les apps enlevees restent pretes a revenir, a part.
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
import { pathToFileURL } from 'node:url';
import { discover, type Discovered } from '../../AgentDouble/src/commands/scan.ts';
import {
  lireDocument,
  trouverCaptures,
  trouverDocument,
  trouverFeuilleAchats,
  type Lecture,
} from '../../AgentDouble/src/app/document.ts';
import { adresseWeb, cleApp, ecrireJson, lireChoix, repartir, type Choix } from './liste.ts';
import { Capteur } from './capturer.ts';

const RACINE = path.resolve(import.meta.dirname, '..');
const DATA = path.join(RACINE, 'public', 'data');
const BUREAU = path.join(os.homedir(), 'Desktop');

const options = new Set(process.argv.slice(2));
const SEULEMENT_EN_LIGNE = options.has('--en-ligne');
const FORCER = options.has('--forcer');
const SANS_ASC = options.has('--sans-asc');
const AGENT_DOUBLE = path.resolve(RACINE, '..', 'AgentDouble');
const DICO = process.env.DICO ?? '/Volumes/Travail/Dico';

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
  /** appstore : une app iPhone, iPad ou Mac ; web : une app qui s'ouvre dans le navigateur. */
  plateforme: 'appstore' | 'web';
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
  /** Marquee « nouveau » dans le Dico : les textes la disent toute recente. */
  nouveau?: boolean;
  /**
   * La recherche de l'App Store la trouve-t-elle par son nom ? Les legendes
   * sans lien cliquable (Instagram, TikTok) ne disent « cherchez … » que si oui.
   */
  recherche?: { nom: string; trouvee: boolean };
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
  artistId?: number;
  sellerUrl?: string;
  wrapperType?: string;
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

/** Les fiches, par bundle id ; `par: 'id'` pour chercher par numero App Store (ou numero de developpeur). */
async function ficheApple(cles: (string | number)[], langue: 'fr' | 'en', par: 'bundleId' | 'id' = 'bundleId'): Promise<Map<string, FicheApple>> {
  const fiches = new Map<string, FicheApple>();
  // Des paquets de 25 : l'adresse reste courte, et une erreur n'emporte pas tout.
  for (let i = 0; i < cles.length; i += 25) {
    const lot = cles.slice(i, i + 25).join(',');
    const url = `https://itunes.apple.com/lookup?${par}=${lot}&country=fr&entity=software&limit=200${langue === 'en' ? '&lang=en_us' : ''}`;
    const reponse = await fetch(url);
    if (!reponse.ok) throw new Error(`App Store : ${reponse.status} pour ${url}`);
    const json = (await reponse.json()) as { results: FicheApple[] };
    for (const r of json.results) if (r.bundleId && r.wrapperType !== 'artist') fiches.set(r.bundleId, r);
  }
  return fiches;
}

/**
 * Chaque app publiee est-elle dans les 3 premiers resultats quand on tape
 * son nom dans l'App Store ? Une fois par nom : le resultat est garde d'un
 * import a l'autre (--forcer refait tout). Apple refuse au-dela d'une
 * vingtaine de recherches par minute : on va doucement, et une recherche
 * refusee reste « on ne sait pas » (pas de « cherchez … » dans les textes).
 */
async function verifierRecherche(apps: AppDiffusion[], ancien: Ancien): Promise<void> {
  const avant = new Map([...(ancien.apps ?? []), ...(ancien.enlevees ?? [])].map((a) => [a.slug, a.recherche]));
  let faites = 0;
  for (const app of apps) {
    if (app.plateforme !== 'appstore' || !app.enLigne) continue;
    const nom = app.langues[app.languePrincipale]?.nom?.trim();
    const id = Number(/id(\d+)/.exec(app.lienInternational || app.lien)?.[1]);
    if (!nom || !id) continue;
    const garde = avant.get(app.slug);
    if (!FORCER && garde?.nom === nom) {
      app.recherche = garde;
      continue;
    }
    const url = `https://itunes.apple.com/search?${new URLSearchParams({ term: nom, country: 'fr', entity: 'software', limit: '3' })}`;
    for (const attente of [0, 30_000]) {
      await new Promise((ok) => setTimeout(ok, attente || (faites ? 3_000 : 0)));
      faites++;
      try {
        const reponse = await fetch(url, { signal: delai() });
        if (!reponse.ok) continue;
        const json = (await reponse.json()) as { results: { trackId: number }[] };
        app.recherche = { nom, trouvee: json.results.some((r) => r.trackId === id) };
        break;
      } catch {
        // Hors ligne ou trop lent : on reessaie une fois.
      }
    }
    if (!app.recherche && garde?.nom === nom) app.recherche = garde;
  }
  const introuvables = apps.filter((a) => a.recherche && !a.recherche.trouvee);
  if (introuvables.length) {
    console.log(`Pas dans les 3 premiers résultats de la recherche de l'App Store (les textes ne disent pas « cherchez… ») : ${introuvables.map((a) => a.recherche!.nom).join(', ')}.`);
  }
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

  /** Les images deja faites a partir de cette source (les captures d'une app web), dans l'ordre. */
  existantes(source: string): string[] {
    if (FORCER) return [];
    const noms = Object.entries(this.sources)
      .filter(([nom, s]) => s === source && fs.existsSync(path.join(this.dossier, nom)))
      .map(([nom]) => nom)
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    for (const nom of noms) this.nouvelles[nom] = source;
    return noms;
  }

  /** Une image faite ici (une capture d'app web), ramenee a la taille des autres. */
  contenu(nom: string, source: string, octets: Buffer, cote: number, format: 'jpeg' | 'png' = 'jpeg'): string {
    this.nouvelles[nom] = source;
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'diffusion-')), nom);
    fs.writeFileSync(tmp, octets);
    convertir(tmp, path.join(this.dossier, nom), cote, format);
    fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
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
  // Une app de l'App Store sans projet sur le Bureau : sa fiche publique seule.
  const doc = d.projectPath ? trouverDocument(d.projectPath) : null;
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
    plateforme: 'appstore',
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

// ---------------------------------------------------------------
//  Les apps de l'App Store sans projet sur le Bureau
// ---------------------------------------------------------------

/** « Lièvre – Demi-fond et VMA » → « lievre » */
function slugifier(nom: string): string {
  return nom
    .split(/\s[–—:-]\s|:/)[0]
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'app';
}

function slugLibre(base: string, pris: Set<string>): string {
  let slug = base;
  for (let n = 2; pris.has(slug); n++) slug = `${base}-${n}`;
  pris.add(slug);
  return slug;
}

/**
 * Tes apps publiees que le Bureau ne connait pas (projet range ailleurs),
 * et celles ajoutees a la main par leur lien App Store.
 */
async function appsSansProjet(
  projets: Discovered[],
  fr: Map<string, FicheApple>,
  choix: Choix,
): Promise<Discovered[]> {
  const connus = new Set(projets.map((p) => p.bundleId));
  const pris = new Set(projets.map((p) => p.slug));
  const developpeurs = [...new Set([...fr.values()].map((f) => f.artistId).filter((x): x is number => !!x))];
  const ajouts = choix.ajoutees.filter((a) => a.type === 'appstore').map((a) => (a as { id: number }).id);

  const trouvees = new Map<string, FicheApple>();
  if (developpeurs.length) for (const [id, f] of await ficheApple(developpeurs, 'fr', 'id')) trouvees.set(id, f);
  if (ajouts.length) for (const [id, f] of await ficheApple(ajouts, 'fr', 'id')) trouvees.set(id, f);

  const sans: Discovered[] = [];
  for (const f of trouvees.values()) {
    if (connus.has(f.bundleId)) continue;
    connus.add(f.bundleId);
    fr.set(f.bundleId, f);
    sans.push({
      slug: slugLibre(slugifier(f.trackName), pris),
      projectName: f.trackName,
      projectPath: '',
      bundleId: f.bundleId,
      version: f.version ?? '',
      build: '',
      platform: 'ios',
    });
  }
  return sans;
}

// ---------------------------------------------------------------
//  Les apps web : celles du Dico, et celles ajoutees par leur adresse
// ---------------------------------------------------------------

/** La famille du Dico → la categorie de l'App Store (public, emoji, hashtags). */
const FAMILLES_DICO: Record<string, string> = {
  jeux: 'GAMES',
  ecole: 'EDUCATION',
  outils: 'UTILITIES',
  maison: 'PRODUCTIVITY',
  sport: 'SPORTS',
  famille: 'LIFESTYLE',
};

type EntreeWeb = {
  id: string;
  nom: string;
  sousTitre: string;
  promo: string;
  description: string;
  motsCles: string[];
  lien: string;
  site: string;
  categorie: string;
  iconeLocale: string;
  iconeSvg: string;
  nouveau: boolean;
  source: 'dico' | 'ajout';
};

const delai = () => AbortSignal.timeout(20_000);
const decoder = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();

/** Ce que la page d'une app web dit d'elle : titre, description, manifeste, icone. */
async function lirePage(url: string) {
  const html = await (await fetch(url, { signal: delai() })).text();
  const balise = (re: RegExp) => html.match(re)?.[1];
  const attribut = (tag: string, nom: string) => tag.match(new RegExp(`${nom}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
  const liens = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const lien = (rel: RegExp) => {
    const tag = liens.find((t) => rel.test(attribut(t, 'rel') ?? ''));
    const href = tag && attribut(tag, 'href');
    return href ? new URL(href, url).toString() : '';
  };
  const meta = (nom: string) => {
    const tag = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).find((t) => (attribut(t, 'name') ?? attribut(t, 'property'))?.toLowerCase() === nom);
    return tag ? decoder(attribut(tag, 'content') ?? '') : '';
  };

  let manifeste: { name?: string; short_name?: string; description?: string; icons?: { src: string; sizes?: string; type?: string; purpose?: string }[] } = {};
  const adresseManifeste = lien(/(^|\s)manifest(\s|$)/i);
  if (adresseManifeste) {
    try {
      manifeste = await (await fetch(adresseManifeste, { signal: delai() })).json();
    } catch {
      // Pas de manifeste lisible : le titre de la page suffira.
    }
  }
  const icones = (manifeste.icons ?? [])
    .filter((i) => !/maskable/.test(i.purpose ?? '') || /any/.test(i.purpose ?? ''))
    .filter((i) => /png/i.test(i.type ?? '') || /\.png(\?|$)/i.test(i.src))
    .map((i) => ({ src: new URL(i.src, adresseManifeste).toString(), cote: Math.max(...(i.sizes ?? '0x0').split(/\s+/).map((t) => Number(t.split('x')[0]) || 0)) }))
    .sort((a, b) => b.cote - a.cote);

  return {
    titre: decoder(balise(/<title[^>]*>([^<]*)<\/title>/i) ?? ''),
    description: meta('description') || meta('og:description'),
    nom: manifeste.name || manifeste.short_name || meta('application-name') || meta('apple-mobile-web-app-title'),
    descriptionManifeste: manifeste.description ?? '',
    icone: icones[0]?.src || lien(/apple-touch-icon/i),
    iconeSvg: (() => {
      const tag = liens.find((t) => /(^|\s)icon(\s|$)/i.test(attribut(t, 'rel') ?? '') && /svg/i.test(`${attribut(t, 'type') ?? ''} ${attribut(t, 'href') ?? ''}`));
      const href = tag && attribut(tag, 'href');
      return href ? (href.startsWith('data:') ? href : new URL(href, url).toString()) : '';
    })(),
  };
}

/** Le texte d'une icone SVG : un fichier du Dico, une adresse, ou une adresse « data: ». */
async function lireSvg(source: string): Promise<string> {
  if (source.startsWith('data:')) {
    const [entete, corps] = source.split(',', 2);
    return /;base64/.test(entete) ? Buffer.from(corps, 'base64').toString('utf8') : decodeURIComponent(corps);
  }
  if (/^https?:/.test(source)) return (await fetch(source, { signal: delai() })).text();
  return fs.readFileSync(source, 'utf8');
}

/** Les apps web du Dico : son fichier js/data.js, lu tel quel. */
async function entreesDico(): Promise<EntreeWeb[] | null> {
  const fichier = path.join(DICO, 'js', 'data.js');
  if (!fs.existsSync(fichier)) return null;
  const { APPS } = (await import(pathToFileURL(fichier).href)) as { APPS: any[] };
  return APPS.filter((a) => a.type === 'web' && a.lien).map((a) => {
    const icone = a.icone ? path.join(DICO, 'icones', a.icone) : '';
    return {
      id: a.id,
      nom: a.nom,
      sousTitre: a.dom ?? '',
      promo: a.def ?? '',
      description: [a.def, a.detail].filter(Boolean).join('\n\n'),
      motsCles: [a.dom].filter(Boolean),
      lien: adresseWeb(a.lien),
      site: a.site ?? '',
      categorie: FAMILLES_DICO[a.fam] ?? 'UTILITIES',
      iconeLocale: icone && /\.(png|jpe?g)$/i.test(icone) && fs.existsSync(icone) ? icone : '',
      iconeSvg: icone && /\.svg$/i.test(icone) && fs.existsSync(icone) ? icone : '',
      nouveau: !!a.nouveau,
      source: 'dico' as const,
    };
  });
}

/** Une app web ajoutee par son adresse : ce que sa page dit d'elle. */
async function entreeAjout(url: string, nomDonne: string): Promise<EntreeWeb> {
  const p = await lirePage(url);
  const nom = p.nom || p.titre.split(/\s[–—|-]\s/)[0] || nomDonne || new URL(url).hostname.split('.')[0];
  const description = p.descriptionManifeste || p.description;
  return {
    id: new URL(url).hostname.split('.')[0],
    nom,
    sousTitre: '',
    promo: description,
    description: description || `${nom}.`,
    motsCles: [],
    lien: url,
    site: '',
    categorie: 'UTILITIES',
    iconeLocale: '',
    iconeSvg: '',
    nouveau: false,
    source: 'ajout',
  };
}

let capteur: Capteur | null = null;
async function capteurPret(): Promise<Capteur> {
  if (!capteur) {
    capteur = new Capteur();
    await capteur.demarrer();
  }
  return capteur;
}
const capturer = async (url: string) => (await capteurPret()).capturer(url);

async function assemblerWeb(e: EntreeWeb, slug: string, developpeur: string): Promise<AppDiffusion> {
  const dossier = path.join(DATA, 'apps', slug);
  const images = new Images(dossier);
  const web = (nom: string) => `data/apps/${slug}/${nom}?v=${images.version(nom)}`;

  // Les captures : prises une fois, refaites avec --forcer.
  const source = `capture:${e.lien}`;
  let noms = images.existantes(source);
  if (!noms.length) {
    console.log(`    captures de ${e.nom}…`);
    const c = await capturer(e.lien);
    noms = [
      ...c.iphone.map((b, i) => images.contenu(`fr-iphone-${i + 1}.jpg`, source, b, 1600)),
      ...c.ipad.map((b, i) => images.contenu(`fr-ipad-${i + 1}.jpg`, source, b, 1600)),
    ];
  }

  // L'icone : celle du Dico, sinon celle que la page declare ; une icone SVG est dessinee en PNG.
  let icone = '';
  try {
    const page = e.iconeLocale ? null : await lirePage(e.lien);
    if (e.iconeLocale) icone = web(images.locale('icone.png', e.iconeLocale, 512, 'png'));
    else if (page?.icone) icone = web(images.distante('icone.png', page.icone));
    else if (e.iconeSvg || page?.iconeSvg) {
      const svg = await lireSvg(e.iconeSvg || page!.iconeSvg);
      const source = `svg:${createHash('sha1').update(svg).digest('hex')}`;
      const deja = images.existantes(source);
      icone = web(deja[0] ?? images.contenu('icone.png', source, await (await capteurPret()).svgEnPng(svg), 512, 'png'));
    }
  } catch {
    // Sans icone, les visuels prennent la couleur par defaut.
  }
  await images.terminer();

  const [genreFr, genreEn] = LIBELLES[e.categorie] ?? ['', ''];
  return {
    slug,
    bundleId: '',
    plateforme: 'web',
    enLigne: true,
    lien: e.lien,
    lienInternational: e.lien,
    gratuit: true,
    prix: '',
    achats: false,
    categorie: e.categorie,
    genre: { fr: genreFr, en: genreEn },
    appareils: ['web'],
    iosMin: '',
    note: null,
    sortie: '',
    version: '',
    developpeur,
    site: e.site,
    assistance: '',
    confidentialite: '',
    icone,
    languePrincipale: 'fr',
    langues: {
      fr: {
        nom: e.nom,
        sousTitre: e.sousTitre,
        promo: e.promo,
        description: e.description,
        motsCles: e.motsCles,
        nouveautes: '',
        captures: {
          iphone: noms.filter((n) => n.includes('-iphone-')).map(web),
          ipad: noms.filter((n) => n.includes('-ipad-')).map(web),
        },
      },
    },
    nouveau: e.nouveau,
  };
}

type Ancien = { apps?: AppDiffusion[]; enlevees?: AppDiffusion[] };

function lireAncien(): Ancien {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, 'apps.json'), 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Les apps web : celles du Dico, puis les ajouts. Le disque Travail
 * debranche, on garde les apps web du Dico de l'import precedent.
 */
async function appsWeb(choix: Choix, ancien: Ancien, pris: Set<string>, developpeur: string, ignorees: { slug: string; raison: string }[]) {
  const anciennes = [...(ancien.apps ?? []), ...(ancien.enlevees ?? [])].filter((a) => a.plateforme === 'web');
  const slugAncien = new Map(anciennes.map((a) => [adresseWeb(a.lien), a.slug]));
  const apps: AppDiffusion[] = [];

  let entrees = await entreesDico();
  const dicoLu = !!entrees;
  if (!entrees) {
    console.log(`Le Dico est introuvable (${DICO}) : le disque Travail n'est pas branché ? Les apps web de l'import précédent restent.`);
    const ajouts = new Set(choix.ajoutees.filter((a) => a.type === 'web').map((a) => adresseWeb((a as { url: string }).url)));
    for (const a of anciennes) {
      if (ajouts.has(adresseWeb(a.lien))) continue;
      pris.add(a.slug);
      apps.push(a);
    }
    entrees = [];
  }

  const vues = new Set(entrees.map((e) => e.lien));
  for (const a of choix.ajoutees) {
    if (a.type !== 'web') continue;
    const url = adresseWeb(a.url);
    if (vues.has(url)) continue;
    vues.add(url);
    try {
      entrees.push(await entreeAjout(url, a.nom));
    } catch (e) {
      ignorees.push({ slug: url, raison: `erreur : page illisible (${(e as Error).message})` });
    }
  }

  for (const e of entrees) {
    const slug = slugAncien.get(e.lien) ?? slugLibre(`web-${slugifier(e.id)}`, pris);
    pris.add(slug);
    try {
      apps.push(await assemblerWeb(e, slug, developpeur));
      console.log(`  ◆ ${e.nom}  (web${e.source === 'ajout' ? ', ajoutée à la main' : ''})`);
    } catch (err) {
      ignorees.push({ slug, raison: `erreur : ${(err as Error).message}` });
    }
  }
  return { apps, dicoLu };
}

async function main() {
  const choix = lireChoix();
  const ancien = lireAncien();

  console.log('Recherche des projets Xcode du Bureau…');
  const projets = discover([BUREAU]);
  const ids = projets.map((p) => p.bundleId);

  console.log(`${projets.length} projets. Lecture de leurs fiches sur l'App Store…`);
  const [fr, en] = await Promise.all([ficheApple(ids, 'fr'), ficheApple(ids, 'en')]);

  // Tes autres apps publiees (projet ailleurs qu'au Bureau), et celles ajoutees par leur lien.
  let sansProjet: Discovered[] = [];
  try {
    sansProjet = await appsSansProjet(projets, fr, choix);
    if (sansProjet.length) {
      for (const [id, f] of await ficheApple(sansProjet.map((p) => p.bundleId), 'en')) en.set(id, f);
      console.log(`${sansProjet.length} app(s) de l'App Store sans projet sur le Bureau : ${sansProjet.map((p) => p.projectName).join(', ')}.`);
    }
  } catch (e) {
    console.log(`Page développeur de l'App Store illisible (${(e as Error).message}) : on fait sans.`);
  }
  const tous = [...projets, ...sansProjet];

  let asc = new Map<string, FicheAsc>();
  try {
    const publiees = tous.map((p) => p.bundleId).filter((id) => fr.has(id));
    asc = await lireAppStoreConnect(publiees);
    if (asc.size) console.log(`Sous-titres et mots-clés lus dans App Store Connect pour ${asc.size} apps.`);
  } catch (e) {
    console.log(`App Store Connect n'a pas répondu (${(e as Error).message.split('\n')[0]}) : on fait sans.`);
  }

  const assemblees: AppDiffusion[] = [];
  const ignorees: { slug: string; raison: string }[] = [];
  for (const p of tous) {
    try {
      const r = await assembler(p, fr.get(p.bundleId), en.get(p.bundleId), asc.get(p.bundleId));
      if (typeof r === 'string') ignorees.push({ slug: p.slug, raison: r });
      else {
        assemblees.push(r);
        const l = r.langues[r.languePrincipale]!;
        const nb = l.captures.iphone.length + l.captures.ipad.length;
        console.log(`  ${r.enLigne ? '●' : '○'} ${l.nom || r.slug}  (${nb} captures${r.langues.en ? ', anglais' : ''}${p.projectPath ? '' : ', sans projet'})`);
      }
    } catch (e) {
      ignorees.push({ slug: p.slug, raison: `erreur : ${(e as Error).message}` });
    }
  }

  console.log('Les apps web…');
  const developpeur = assemblees.find((a) => a.enLigne && a.developpeur)?.developpeur ?? '';
  const pris = new Set(assemblees.map((a) => a.slug));
  try {
    const web = await appsWeb(choix, ancien, pris, developpeur, ignorees);
    assemblees.push(...web.apps);
  } finally {
    await capteur?.fermer();
  }

  // Ce que tu as enleve reste pret a revenir, a part.
  const { apps, enlevees } = repartir(assemblees, choix);

  console.log('La recherche de l’App Store trouve-t-elle chaque app par son nom ?');
  await verifierRecherche(apps, ancien);

  // Les dossiers d'images d'apps disparues de la liste s'en vont aussi.
  const gardes = new Set(assemblees.map((a) => a.slug));
  const dossierApps = path.join(DATA, 'apps');
  for (const f of fs.existsSync(dossierApps) ? fs.readdirSync(dossierApps) : []) {
    if (!gardes.has(f)) fs.rmSync(path.join(dossierApps, f), { recursive: true, force: true });
  }

  // Les apps arrivees depuis l'import precedent.
  const avant = new Set([...(ancien.apps ?? []), ...(ancien.enlevees ?? [])].map((a) => cleApp(a)));
  const nouvelles = avant.size ? apps.filter((a) => !avant.has(cleApp(a))).map((a) => a.slug) : [];

  const tri = (a: AppDiffusion, b: AppDiffusion) => Number(b.enLigne) - Number(a.enLigne) || a.slug.localeCompare(b.slug);
  apps.sort(tri);
  enlevees.sort(tri);
  fs.mkdirSync(DATA, { recursive: true });
  ecrireJson(path.join(DATA, 'apps.json'), { genere: new Date().toISOString(), apps, enlevees, ignorees, nouvelles });

  const nom = (a: AppDiffusion) => a.langues[a.languePrincipale]?.nom || a.slug;
  const enLigne = apps.filter((a) => a.enLigne && a.plateforme === 'appstore').length;
  const web = apps.filter((a) => a.plateforme === 'web').length;
  console.log(`\n${apps.length} apps prêtes (${enLigne} sur l'App Store, ${web} web, ${apps.length - enLigne - web} pas encore publiées)${enlevees.length ? `, ${enlevees.length} enlevée(s) de la liste` : ''}.`);
  if (nouvelles.length) console.log(`Nouvelles apps : ${nouvelles.map((s) => nom(apps.find((a) => a.slug === s)!)).join(', ')}.`);
  const erreurs = ignorees.filter((i) => i.raison.startsWith('erreur'));
  if (erreurs.length) {
    console.log('\nProblèmes :');
    for (const i of erreurs) console.log(`  ${i.slug} : ${i.raison}`);
    process.exitCode = 1;
  }
  console.log(`${ignorees.length - erreurs.length} projets écartés (ni publiés ni décrits dans une feuille).`);
}

await main();
