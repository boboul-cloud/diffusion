/**
 * Sert Diffusion depuis le Mac : http://127.0.0.1:4848 sur le Mac, et
 * l'adresse du Mac sur le Wi-Fi pour l'iPhone ou l'iPad.
 *
 *   npm run serveur           (ou l'icone Diffusion du Dock)
 *
 * Seul le Mac lui-meme peut relancer l'import des apps ; les autres
 * appareils lisent, c'est tout.
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { depotPret, envoyer, git, lireEtat, lireJournal, lirePlan, preparerPublication, type Plan } from './publication.ts';
import { adresseBio, ecrireBio } from './bio.ts';
import { FICHIER_APPS, FICHIER_LISTE, dejaLa, ecrireJson, enlever, lireAjout, lireChoix, nomApp, remettre, type Donnees } from './liste.ts';

const RACINE = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(RACINE, 'public');
const PORT = Number(process.env.DIFFUSION_PORT ?? 4848);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

const depuisLeMac = (req: http.IncomingMessage) => {
  const a = req.socket.remoteAddress ?? '';
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
};

function json(res: http.ServerResponse, statut: number, corps: unknown) {
  res.writeHead(statut, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(corps));
}

function lireCorps(req: http.IncomingMessage): Promise<string> {
  return new Promise((ok, ko) => {
    let corps = '';
    req.on('data', (d) => {
      corps += d;
      if (corps.length > 2_000_000) ko(new Error('Trop gros'));
    });
    req.on('end', () => ok(corps));
    req.on('error', ko);
  });
}

function adresseDepot(): string {
  try {
    return git('remote', 'get-url', 'origin').replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/');
  } catch {
    return '';
  }
}

let importEnCours: Promise<{ ok: boolean; sortie: string }> | null = null;

/** Une chose a la fois avec git et apps.json : les clics rapproches attendent leur tour. */
let file: Promise<unknown> = Promise.resolve();
function enFile<T>(travail: () => Promise<T>): Promise<T> {
  const r = file.then(travail, travail);
  file = r.catch(() => {});
  return r;
}

/**
 * Apres un changement de la liste ou un import : le robot et la page « lien
 * en bio » suivent. Une app enlevee sort aussi de la publication automatique.
 */
function synchroniser(message: string): { retirees: string[]; note: string } {
  // D'abord ce que le robot a publie : la page « lien en bio » part du dernier journal.
  if (depotPret()) {
    try {
      git('pull', '--rebase', '--autostash', '--quiet', '-X', 'theirs', 'origin', 'main');
    } catch {
      // Hors ligne : on fait avec ce qu'on a.
    }
  }
  const plan = lirePlan();
  const avant = plan.apps.map((a) => a.slug);
  preparerPublication(plan);
  ecrireBio();
  const retirees = avant.filter((s) => !plan.apps.some((a) => a.slug === s));
  if (!depotPret()) return { retirees, note: '' };
  try {
    envoyer(retirees.length ? `${message} (retirée${retirees.length > 1 ? 's' : ''} d'Instagram : ${retirees.join(', ')})` : message);
    return { retirees, note: '' };
  } catch (e) {
    return { retirees, note: ` GitHub n’a pas répondu (${String((e as any).stderr ?? (e as Error).message).trim().split('\n')[0]}) : la page « lien en bio » suivra au prochain envoi.` };
  }
}

const lireDonnees = (): Donnees => JSON.parse(fs.readFileSync(FICHIER_APPS, 'utf8'));

/** Avant d'ajouter : l'app existe-t-elle ? Son nom, pour le message. */
async function verifierAjout(a: NonNullable<ReturnType<typeof lireAjout>>): Promise<string> {
  if (a.type === 'appstore') {
    const r = await fetch(`https://itunes.apple.com/lookup?id=${a.id}&country=fr`, { signal: AbortSignal.timeout(15_000) });
    const j = (await r.json()) as { results: { trackName?: string }[] };
    const nom = j.results?.[0]?.trackName;
    if (!nom) throw new Error('Aucune app avec ce numéro sur l’App Store français.');
    return nom;
  }
  const r = await fetch(a.url, { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Cette adresse répond ${r.status}.`);
  if (!/text\/html/.test(r.headers.get('content-type') ?? '')) throw new Error('Cette adresse n’est pas une page web.');
  const titre = (await r.text()).match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
  return titre || new URL(a.url).hostname;
}

function importer() {
  importEnCours ??= new Promise((ok) => {
    const p = spawn(process.execPath, [path.join(RACINE, 'outils', 'importer.ts')], { cwd: RACINE });
    let sortie = '';
    p.stdout.on('data', (d) => (sortie += d));
    p.stderr.on('data', (d) => (sortie += d));
    p.on('close', (code) => {
      importEnCours = null;
      ok({ ok: code === 0, sortie });
    });
  });
  return importEnCours;
}

const serveur = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname === '/api/ping') return json(res, 200, { local: depuisLeMac(req) });

  if (url.pathname === '/api/importer') {
    if (req.method !== 'POST') return json(res, 405, { erreur: 'POST attendu' });
    if (!depuisLeMac(req)) return json(res, 403, { erreur: 'Seulement depuis le Mac.' });
    const r = await importer();
    const lignes = r.sortie.trim().split('\n');
    const nouvelles = lignes.find((l) => /^Nouvelles apps/.test(l))?.trim() ?? '';
    const resume = [lignes.find((l) => /apps prêtes/.test(l))?.trim() ?? lignes.at(-1), nouvelles].filter(Boolean).join(' ');
    if (!r.ok) return json(res, 500, { erreur: lignes.slice(-3).join(' '), sortie: r.sortie });
    const s = await enFile(async () => synchroniser('Apps mises à jour'));
    return json(res, 200, { resume: resume + s.note, sortie: r.sortie });
  }

  if (url.pathname === '/api/liste') {
    if (!depuisLeMac(req)) return json(res, 403, { erreur: 'La liste se modifie depuis le Mac.' });
    if (req.method === 'GET') return json(res, 200, { instagram: lirePlan().apps.map((a) => a.slug), bio: adresseBio() });
    if (req.method !== 'POST') return json(res, 405, { erreur: 'GET ou POST' });
    try {
      const { action, slug, lien } = JSON.parse(await lireCorps(req)) as { action: string; slug?: string; lien?: string };
      if (importEnCours) await importEnCours;
      const r = await enFile(async () => {
        const donnees = lireDonnees();
        const choix = lireChoix();
        if (action === 'enlever' || action === 'remettre') {
          const app = action === 'enlever' ? enlever(donnees, choix, String(slug)) : remettre(donnees, choix, String(slug));
          ecrireJson(FICHIER_LISTE, choix);
          ecrireJson(FICHIER_APPS, donnees);
          const s = synchroniser(`${action === 'enlever' ? 'Enlevée de la liste' : 'Remise dans la liste'} : ${app.slug}`);
          const instagram = s.retirees.includes(app.slug) ? ' Elle ne passera plus sur Instagram.' : '';
          return { message: `${nomApp(app)} ${action === 'enlever' ? 'est enlevée de la liste.' : 'est de retour dans la liste.'}${instagram}${s.note}` };
        }
        if (action === 'ajouter') {
          const a = lireAjout(String(lien ?? ''));
          if (!a) throw new Error('Colle le lien de la fiche App Store (…/id6812345678) ou l’adresse de l’app web (https://…).');
          const deja = dejaLa(donnees, a);
          if (deja && !deja.enlevee) return { message: `${nomApp(deja.a as any)} est déjà dans la liste.` };
          if (deja) {
            const app = remettre(donnees, choix, deja.a.slug);
            ecrireJson(FICHIER_LISTE, choix);
            ecrireJson(FICHIER_APPS, donnees);
            const s = synchroniser(`Remise dans la liste : ${app.slug}`);
            return { message: `${nomApp(app)} était enlevée : elle est de retour.${s.note}` };
          }
          const nom = await verifierAjout(a);
          choix.ajoutees.push(a.type === 'appstore' ? { type: 'appstore', id: a.id, nom } : { type: 'web', url: a.url, nom });
          ecrireJson(FICHIER_LISTE, choix);
          const i = await importer();
          if (!i.ok) throw new Error(`L’import a échoué : ${i.sortie.trim().split('\n').slice(-2).join(' ')}`);
          const s = synchroniser(`Ajoutée à la liste : ${nom}`);
          return { message: `${nom} est ajoutée.${s.note}` };
        }
        throw new Error('Action inconnue.');
      });
      return json(res, 200, r);
    } catch (e) {
      return json(res, 400, { erreur: (e as Error).message.split('\n')[0] });
    }
  }

  if (url.pathname === '/api/automatique/essai') {
    if (!depuisLeMac(req) || req.method !== 'POST') return json(res, 403, { erreur: 'Seulement depuis le Mac.' });
    try {
      // Le robot de GitHub, lance tout de suite : il confie la prochaine app a Buffer pour dans 5 minutes.
      const depot = adresseDepot().replace('https://github.com/', '');
      execFileSync('gh', ['workflow', 'run', 'instagram.yml', '--repo', depot, '-f', 'maintenant=true'], { stdio: 'pipe' });
      return json(res, 200, { message: 'Robot lancé sur GitHub : la publication part dans 5 à 10 minutes. Le journal se met à jour ensuite.' });
    } catch (e) {
      return json(res, 500, { erreur: String((e as any).stderr ?? (e as Error).message).trim().split('\n')[0] });
    }
  }

  if (url.pathname === '/api/automatique') {
    if (!depuisLeMac(req)) return json(res, 403, { erreur: 'Le planning se règle depuis le Mac.' });
    if (req.method === 'GET') {
      // Ce que le robot a publie depuis la derniere fois.
      if (depotPret()) {
        try {
          git('pull', '--rebase', '--autostash', '--quiet', '-X', 'theirs', 'origin', 'main');
        } catch {
          // Hors ligne : on montre ce qu'on a.
        }
      }
      return json(res, 200, { plan: lirePlan(), journal: lireJournal(), etat: lireEtat(), depot: { ok: depotPret(), url: adresseDepot() }, bio: adresseBio() });
    }
    if (req.method === 'POST') {
      try {
        const plan = JSON.parse(await lireCorps(req)) as Plan;
        if (!Array.isArray(plan.apps) || !Array.isArray(plan.jours) || !/^\d{2}:\d{2}$/.test(plan.heure)) throw new Error('Planning illisible.');
        return await enFile(async () => {
          preparerPublication(plan);
          ecrireBio();
          if (!depotPret()) return json(res, 200, { message: 'Planning enregistré sur le Mac (pas encore de dépôt GitHub).' });
          envoyer(`Planning : ${plan.apps.map((a) => a.slug).join(', ') || 'aucune app'}${plan.actif ? '' : ' (en pause)'}`);
          return json(res, 200, { message: plan.actif ? 'Planning envoyé : le robot suivra ces réglages.' : 'Planning envoyé, publication en pause.' });
        });
      } catch (e) {
        return json(res, 500, { erreur: (e as Error).message.split('\n')[0] });
      }
    }
    return json(res, 405, { erreur: 'GET ou POST' });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { erreur: 'Méthode non prise en charge' });

  let chemin = decodeURIComponent(url.pathname);
  if (chemin.endsWith('/')) chemin += 'index.html';
  const fichier = path.resolve(PUBLIC, `.${chemin}`);
  if (!fichier.startsWith(PUBLIC + path.sep)) return json(res, 403, { erreur: 'Interdit' });

  fs.stat(fichier, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': TYPES['.txt'] });
      return res.end('Introuvable');
    }
    const ext = path.extname(fichier).toLowerCase();
    const image = ['.png', '.jpg', '.jpeg'].includes(ext) && chemin.startsWith('/data/');
    res.writeHead(200, {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      'Content-Length': st.size,
      // Le code change souvent pendant qu'on travaille : toujours revalide.
      'Cache-Control': image ? 'public, max-age=3600' : 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(fichier).pipe(res);
  });
});

serveur.listen(PORT, '0.0.0.0', () => {
  console.log(`Diffusion : http://127.0.0.1:${PORT}`);
  for (const liste of Object.values(os.networkInterfaces())) {
    for (const i of liste ?? []) {
      if (i.family === 'IPv4' && !i.internal) console.log(`  sur le Wi-Fi (iPhone, iPad) : http://${i.address}:${PORT}`);
    }
  }
});
