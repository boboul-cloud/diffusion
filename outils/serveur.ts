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
    const resume = lignes.find((l) => /apps prêtes/.test(l))?.trim() ?? lignes.at(-1);
    return json(res, r.ok ? 200 : 500, r.ok ? { resume, sortie: r.sortie } : { erreur: lignes.slice(-3).join(' '), sortie: r.sortie });
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
          git('pull', '--rebase', '--autostash', '--quiet', 'origin', 'main');
        } catch {
          // Hors ligne : on montre ce qu'on a.
        }
      }
      return json(res, 200, { plan: lirePlan(), journal: lireJournal(), etat: lireEtat(), depot: { ok: depotPret(), url: adresseDepot() } });
    }
    if (req.method === 'POST') {
      try {
        const plan = JSON.parse(await lireCorps(req)) as Plan;
        if (!Array.isArray(plan.apps) || !Array.isArray(plan.jours) || !/^\d{2}:\d{2}$/.test(plan.heure)) throw new Error('Planning illisible.');
        preparerPublication(plan);
        if (!depotPret()) return json(res, 200, { message: 'Planning enregistré sur le Mac (pas encore de dépôt GitHub).' });
        envoyer(`Planning : ${plan.apps.map((a) => a.slug).join(', ') || 'aucune app'}${plan.actif ? '' : ' (en pause)'}`);
        return json(res, 200, { message: plan.actif ? 'Planning envoyé : le robot suivra ces réglages.' : 'Planning envoyé, publication en pause.' });
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
