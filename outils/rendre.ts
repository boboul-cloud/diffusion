/**
 * Dessine les visuels hors de toute fenetre : Chrome sans ecran, pilote par
 * son protocole de debogage, avec le code de dessin de l'app (visuels.js).
 * Sert au robot de publication sur GitHub, et marche aussi sur le Mac :
 *
 *   node outils/rendre.ts <slug> [format] [modele]     → un JPEG dans /tmp
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

const RACINE = path.resolve(import.meta.dirname, '..');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.css': 'text/css',
};

function trouverChrome(): string {
  const candidats = [
    process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  const c = candidats.find((x) => x && fs.existsSync(x));
  if (!c) throw new Error('Chrome est introuvable (variable CHROME pour indiquer son chemin).');
  return c;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Rendeur {
  private serveur?: http.Server;
  private chrome?: ChildProcess;
  private ws?: WebSocket;
  private id = 0;
  private attente = new Map<number, (r: any) => void>();
  private profil = fs.mkdtempSync(path.join(os.tmpdir(), 'diffusion-chrome-'));

  async demarrer(): Promise<void> {
    // Un petit serveur sur la racine du projet : la page charge visuels.js et les images.
    this.serveur = http.createServer((req, res) => {
      const chemin = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
      const fichier = path.resolve(RACINE, `.${chemin}`);
      if (!fichier.startsWith(RACINE + path.sep) || !fs.existsSync(fichier) || !fs.statSync(fichier).isFile()) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(fichier).toLowerCase()] ?? 'application/octet-stream' });
      fs.createReadStream(fichier).pipe(res);
    });
    await new Promise<void>((ok) => this.serveur!.listen(0, '127.0.0.1', ok));
    const port = (this.serveur.address() as { port: number }).port;

    const portDebogage = 9400 + Math.floor(Math.random() * 400);
    this.chrome = spawn(
      trouverChrome(),
      [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
        ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
        `--remote-debugging-port=${portDebogage}`, `--user-data-dir=${this.profil}`, 'about:blank',
      ],
      { stdio: 'ignore' },
    );

    let cible: { webSocketDebuggerUrl: string } | undefined;
    for (let i = 0; i < 100 && !cible; i++) {
      await pause(150);
      try {
        const liste = (await (await fetch(`http://127.0.0.1:${portDebogage}/json/list`)).json()) as any[];
        cible = liste.find((t) => t.type === 'page');
      } catch {
        // Chrome demarre encore.
      }
    }
    if (!cible) throw new Error('Chrome n’a pas démarré.');

    this.ws = new WebSocket(cible.webSocketDebuggerUrl);
    await new Promise((ok, ko) => {
      this.ws!.onopen = ok;
      this.ws!.onerror = ko;
    });
    this.ws.onmessage = (m) => {
      const j = JSON.parse(String(m.data));
      const f = this.attente.get(j.id);
      if (f) {
        this.attente.delete(j.id);
        f(j);
      }
    };
    await this.commande('Page.navigate', { url: `http://127.0.0.1:${port}/outils/rendu.html` });
    for (let i = 0; i < 100; i++) {
      const r = await this.evaluer('window.pret === true');
      if (r === true) return;
      await pause(100);
    }
    throw new Error('La page de rendu ne s’est pas chargée.');
  }

  private commande(method: string, params: object = {}): Promise<any> {
    return new Promise((ok) => {
      const id = ++this.id;
      this.attente.set(id, ok);
      this.ws!.send(JSON.stringify({ id, method, params }));
    });
  }

  private async evaluer(expression: string): Promise<unknown> {
    const r = await this.commande('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'Erreur de rendu');
    return r.result?.result?.value;
  }

  /** o : les options de dessiner() ; les images en chemins depuis la racine du projet. */
  async image(o: Record<string, unknown>): Promise<Buffer> {
    const url = (await this.evaluer(`rendre(${JSON.stringify(o)})`)) as string;
    if (!url?.startsWith('data:image/jpeg;base64,')) throw new Error('Rendu vide.');
    return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  }

  async fermer(): Promise<void> {
    this.ws?.close();
    this.chrome?.kill();
    this.serveur?.close();
    await pause(200);
    fs.rmSync(this.profil, { recursive: true, force: true });
  }
}

// Essai a la main : node outils/rendre.ts riskelo instagram trio
if (import.meta.main) {
  const [slug = 'riskelo', format = 'instagram', modele = 'vitrine'] = process.argv.slice(2);
  const { apps } = JSON.parse(fs.readFileSync(path.join(RACINE, 'public/data/apps.json'), 'utf8'));
  const app = apps.find((a: any) => a.slug === slug);
  if (!app) throw new Error(`App inconnue : ${slug}`);
  const l = app.langues[app.languePrincipale];
  const chemin = (s: string) => `/public/${s}`;
  const r = new Rendeur();
  await r.demarrer();
  const jpeg = await r.image({
    format, modele, icone: chemin(app.icone), captures: l.captures.iphone.slice(0, 3).map(chemin),
    titre: l.nom, sousTitre: l.sousTitre, accroche: l.promo, bandeau: 'Gratuit sur l’App Store',
  });
  await r.fermer();
  const sortie = path.join(os.tmpdir(), `${slug}-${format}-${modele}.jpg`);
  fs.writeFileSync(sortie, jpeg);
  console.log(sortie);
}
