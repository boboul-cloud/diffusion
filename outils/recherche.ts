/**
 * La recherche de l'App Store trouve-t-elle chaque app par son nom ?
 *
 * Les legendes sans lien cliquable (Instagram, TikTok) ajoutent « ou cherchez
 * … sur l'App Store » seulement pour les apps qui sortent dans les 3 premiers
 * resultats quand on tape leur nom.
 *
 * Lancee par l'import (npm run importer). Seule, sans refaire l'import :
 *   node outils/recherche.ts            met a jour public/data/apps.json
 *   node outils/recherche.ts --forcer   reverifie toutes les apps
 */
import fs from 'node:fs';
import path from 'node:path';
import type { AppDiffusion } from './importer.ts';
import { RACINE, ecrireJson } from './liste.ts';

type Donnees = { apps?: AppDiffusion[]; enlevees?: AppDiffusion[] };

const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Une fois par nom : le resultat est garde d'un import a l'autre (`forcer`
 * refait tout). Apple refuse au-dela d'une vingtaine de recherches par
 * minute : on va doucement, et une recherche refusee reste « on ne sait pas »
 * (pas de « cherchez … » dans les textes).
 */
export async function verifierRecherche(apps: AppDiffusion[], ancien: Donnees, forcer = false): Promise<void> {
  const avant = new Map([...(ancien.apps ?? []), ...(ancien.enlevees ?? [])].map((a) => [a.slug, a.recherche]));
  let faites = 0;
  for (const app of apps) {
    if (app.plateforme !== 'appstore' || !app.enLigne) continue;
    const nom = app.langues[app.languePrincipale]?.nom?.trim();
    const id = Number(/id(\d+)/.exec(app.lienInternational || app.lien)?.[1]);
    if (!nom || !id) continue;
    const garde = avant.get(app.slug);
    if (!forcer && garde?.nom === nom) {
      app.recherche = garde;
      continue;
    }
    const url = `https://itunes.apple.com/search?${new URLSearchParams({ term: nom, country: 'fr', entity: 'software', limit: '3' })}`;
    for (const attente of [faites ? 3_000 : 0, 30_000]) {
      await pause(attente);
      faites++;
      try {
        const reponse = await fetch(url, { signal: AbortSignal.timeout(20_000) });
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
  const inconnues = apps.filter((a) => a.plateforme === 'appstore' && a.enLigne && !a.recherche);
  if (inconnues.length) console.log(`Recherche pas vérifiée (Apple n'a pas répondu) : ${inconnues.map((a) => a.slug).join(', ')}.`);
}

if (import.meta.main) {
  const fichier = path.join(RACINE, 'public', 'data', 'apps.json');
  const donnees = JSON.parse(fs.readFileSync(fichier, 'utf8'));
  await verifierRecherche(donnees.apps ?? [], donnees, process.argv.includes('--forcer'));
  await verifierRecherche(donnees.enlevees ?? [], donnees, process.argv.includes('--forcer'));
  ecrireJson(fichier, donnees);
  const toutes = [...(donnees.apps ?? []), ...(donnees.enlevees ?? [])].filter((a: AppDiffusion) => a.recherche);
  console.log(`${toutes.filter((a: AppDiffusion) => a.recherche!.trouvee).length} apps sur ${toutes.length} trouvées par leur nom dans l'App Store.`);
}
