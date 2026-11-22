/**
 * Les apps a promouvoir : ce que tu as enleve de la liste, ce que tu y as
 * ajoute a la main. Le reste vient tout seul a l'import : tes projets Xcode
 * du Bureau, tes apps de l'App Store, les apps web du Dico.
 *
 *   liste-apps.json (sur le Mac seulement, pas sur GitHub)
 *   {
 *     "enlevees": [{ "cle": "com.oulhen.pngtojpg", "nom": "pngtojpg" }],
 *     "ajoutees": [{ "type": "appstore", "id": 6812345678, "nom": "…" },
 *                  { "type": "web", "url": "https://….workers.dev/", "nom": "…" }]
 *   }
 *
 * Une app se reconnait a sa cle : son identifiant (bundle id) pour l'App
 * Store, « web:<adresse> » pour une app web. Le nom n'est la que pour toi.
 */
import fs from 'node:fs';
import path from 'node:path';

export const RACINE = path.resolve(import.meta.dirname, '..');
export const FICHIER_LISTE = path.join(RACINE, 'liste-apps.json');
export const FICHIER_APPS = path.join(RACINE, 'public', 'data', 'apps.json');

export type Ajout = { type: 'appstore'; id: number; nom: string } | { type: 'web'; url: string; nom: string };
export type Choix = { enlevees: { cle: string; nom: string }[]; ajoutees: Ajout[] };

type App = { slug: string; bundleId: string; plateforme?: string; lien: string; langues: Record<string, { nom?: string }>; languePrincipale: string; enLigne: boolean };
export type Donnees = { genere: string; apps: App[]; enlevees?: App[]; ignorees?: unknown[]; nouvelles?: string[] };

export function lireChoix(fichier = FICHIER_LISTE): Choix {
  try {
    const j = JSON.parse(fs.readFileSync(fichier, 'utf8'));
    return { enlevees: Array.isArray(j.enlevees) ? j.enlevees : [], ajoutees: Array.isArray(j.ajoutees) ? j.ajoutees : [] };
  } catch {
    return { enlevees: [], ajoutees: [] };
  }
}

export function ecrireJson(fichier: string, valeur: unknown): void {
  const tmp = `${fichier}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(valeur, null, 1)}\n`);
  fs.renameSync(tmp, fichier);
}

/** « https://tclp.riskelo-salon.workers.dev » et « …dev/ » sont la meme app. */
export const adresseWeb = (url: string) => {
  const u = new URL(url.trim());
  u.hash = '';
  u.search = '';
  if (!u.pathname.endsWith('/') && !/\.[a-z0-9]+$/i.test(u.pathname)) u.pathname += '/';
  return u.toString();
};

export const cleApp = (app: Pick<App, 'bundleId' | 'plateforme' | 'lien'>) =>
  app.plateforme === 'web' ? `web:${adresseWeb(app.lien)}` : app.bundleId;

export const nomApp = (app: App) => app.langues[app.languePrincipale]?.nom || app.slug;

/**
 * Ce qu'on colle dans le champ « Ajouter » :
 * - un lien App Store (…/app/nom/id6812345678, ou le numero seul) → une app App Store ;
 * - toute autre adresse https → une app web.
 */
export function lireAjout(texte: string): { type: 'appstore'; id: number } | { type: 'web'; url: string } | null {
  const t = texte.trim();
  if (/^\d{6,12}$/.test(t)) return { type: 'appstore', id: Number(t) };
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null;
  if (/(^|\.)apps\.apple\.com$|(^|\.)itunes\.apple\.com$/.test(u.hostname)) {
    const id = u.pathname.match(/\/id(\d{6,12})/)?.[1];
    return id ? { type: 'appstore', id: Number(id) } : null;
  }
  return { type: 'web', url: adresseWeb(u.toString()) };
}

/** Separe les apps gardees et les apps enlevees, d'apres tes choix. */
export function repartir<T extends App>(apps: T[], choix: Choix): { apps: T[]; enlevees: T[] } {
  const cles = new Set(choix.enlevees.map((e) => e.cle));
  return { apps: apps.filter((a) => !cles.has(cleApp(a))), enlevees: apps.filter((a) => cles.has(cleApp(a))) };
}

const parNom = (a: App, b: App) =>
  Number(b.enLigne) - Number(a.enLigne) || nomApp(a).localeCompare(nomApp(b), 'fr', { sensitivity: 'base' });

/** Enleve une app : elle passe dans « enlevees », tout de suite, sans refaire l'import. */
export function enlever(donnees: Donnees, choix: Choix, slug: string): App {
  const app = donnees.apps.find((a) => a.slug === slug);
  if (!app) throw new Error('Cette app n’est pas dans la liste.');
  const cle = cleApp(app);
  if (!choix.enlevees.some((e) => e.cle === cle)) choix.enlevees.push({ cle, nom: nomApp(app) });
  donnees.apps = donnees.apps.filter((a) => a !== app);
  donnees.enlevees = [...(donnees.enlevees ?? []), app].sort(parNom);
  return app;
}

/** Remet une app enlevee dans la liste. */
export function remettre(donnees: Donnees, choix: Choix, slug: string): App {
  const app = (donnees.enlevees ?? []).find((a) => a.slug === slug);
  if (!app) throw new Error('Cette app n’est pas parmi les apps enlevées.');
  const cle = cleApp(app);
  choix.enlevees = choix.enlevees.filter((e) => e.cle !== cle);
  donnees.enlevees = (donnees.enlevees ?? []).filter((a) => a !== app);
  donnees.apps = [...donnees.apps, app].sort(parNom);
  return app;
}

/** L'app deja connue qui correspond a un ajout, ou rien. */
export function dejaLa(donnees: Donnees, ajout: { type: 'appstore'; id: number } | { type: 'web'; url: string }) {
  const toutes = [...donnees.apps.map((a) => ({ a, enlevee: false })), ...(donnees.enlevees ?? []).map((a) => ({ a, enlevee: true }))];
  return (
    toutes.find(({ a }) =>
      ajout.type === 'web'
        ? a.plateforme === 'web' && adresseWeb(a.lien) === ajout.url
        : a.plateforme !== 'web' && (a as any).lienInternational?.endsWith(`/id${ajout.id}`),
    ) ?? null
  );
}
