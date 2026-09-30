/**
 * Le dossier publication/ : ce que le robot de GitHub lit et ecrit.
 *
 *   plan.json      les apps choisies, les jours, l'heure (ecrit par l'app, sur le Mac)
 *   journal.json   chaque publication faite ou ratee (ecrit par le robot)
 *   etat.json      le compte Instagram relie a Buffer, le dernier probleme
 *   apps.json      les fiches des apps en ligne
 *   apps/<slug>/   icone et captures des apps choisies
 *   posts/         les images publiees (Instagram les telecharge ici)
 *
 * Tout ce dossier est public sur GitHub : rien que l'App Store ou Instagram
 * ne montre deja. Aucune cle ni mot de passe : la cle Buffer est un secret de GitHub.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const RACINE = path.resolve(import.meta.dirname, '..');
export const PUBLICATION = path.join(RACINE, 'publication');
const DONNEES_MAC = path.join(RACINE, 'public', 'data');

const lireJson = <T>(fichier: string, defaut: T): T => {
  try {
    return JSON.parse(fs.readFileSync(fichier, 'utf8'));
  } catch {
    return defaut;
  }
};

const ecrireJson = (fichier: string, valeur: unknown) => {
  fs.mkdirSync(path.dirname(fichier), { recursive: true });
  fs.writeFileSync(fichier, `${JSON.stringify(valeur, null, 1)}\n`);
};

export type Plan = {
  actif: boolean;
  apps: { slug: string; fiche?: Record<string, string>; visuel?: Record<string, unknown> }[];
  jours: number[];
  heure: string;
  langue: 'fr' | 'en';
  signature?: Record<string, string>;
};

export type Entree = {
  creneau: string;
  date: string;
  slug: string;
  reseau: 'instagram';
  statut: 'programme' | 'publie' | 'erreur';
  bufferId?: string;
  mode?: string;
  lien?: string;
  image?: string;
  legende?: string;
  erreur?: string;
};

export const PLAN_VIDE: Plan = { actif: false, apps: [], jours: [1, 3, 5], heure: '18:00', langue: 'fr' };

export const lirePlan = () => ({ ...PLAN_VIDE, ...lireJson<Partial<Plan>>(path.join(PUBLICATION, 'plan.json'), {}) });
export const lireJournal = () => lireJson<Entree[]>(path.join(PUBLICATION, 'journal.json'), []);
export const lireEtat = () => lireJson<Record<string, any>>(path.join(PUBLICATION, 'etat.json'), {});
export const lireApps = () => lireJson<{ apps: any[] }>(path.join(PUBLICATION, 'apps.json'), { apps: [] }).apps;

export const ecrireJournal = (j: Entree[]) => ecrireJson(path.join(PUBLICATION, 'journal.json'), j);
export const ecrireEtat = (e: Record<string, any>) => ecrireJson(path.join(PUBLICATION, 'etat.json'), e);

/**
 * Sur le Mac : enregistre le plan et recopie les fiches des apps en ligne,
 * avec les images des seules apps choisies (le depot reste leger).
 */
export function preparerPublication(plan: Plan): void {
  const { apps } = lireJson<{ apps: any[] }>(path.join(DONNEES_MAC, 'apps.json'), { apps: [] });
  const enLigne = apps.filter((a) => a.enLigne);
  const choisies = new Set(plan.apps.map((a) => a.slug));
  plan.apps = plan.apps.filter((a) => enLigne.some((x) => x.slug === a.slug));

  // Les chemins d'images restent « data/apps/… » : le robot les lit depuis publication/.
  ecrireJson(path.join(PUBLICATION, 'apps.json'), { genere: new Date().toISOString(), apps: enLigne });
  ecrireJson(path.join(PUBLICATION, 'plan.json'), plan);

  const dossierApps = path.join(PUBLICATION, 'apps');
  fs.mkdirSync(dossierApps, { recursive: true });
  for (const d of fs.readdirSync(dossierApps)) {
    if (!choisies.has(d)) fs.rmSync(path.join(dossierApps, d), { recursive: true, force: true });
  }
  for (const slug of choisies) {
    const source = path.join(DONNEES_MAC, 'apps', slug);
    if (fs.existsSync(source)) fs.cpSync(source, path.join(dossierApps, slug), { recursive: true });
  }
}

/** Le chemin d'une image de l'app, vu depuis la racine du projet (pour le rendu). */
export const cheminImage = (src: string) => `/publication/${src.replace(/^data\//, '').replace(/\?.*$/, '')}`;

// ---------------------------------------------------------------
//  Git
// ---------------------------------------------------------------

export function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export const depotPret = () => {
  try {
    return !!git('remote', 'get-url', 'origin');
  } catch {
    return false;
  }
};

/** Envoie publication/ sur GitHub ; reprend les nouveautes du robot avant. */
export function envoyer(message: string): boolean {
  git('add', 'publication');
  const rien = (() => {
    try {
      git('diff', '--cached', '--quiet');
      return true;
    } catch {
      return false;
    }
  })();
  if (!rien) git('commit', '-m', message);
  git('pull', '--rebase', '--autostash', 'origin', 'main');
  git('push', 'origin', 'HEAD:main');
  return !rien;
}
