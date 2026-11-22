/**
 * La page « lien en bio » d'Instagram : docs/index.html, servie par GitHub Pages.
 *
 * En haut, l'app du dernier post (celle que la personne vient de voir), avec
 * son bouton : l'App Store, ou l'app web elle-meme. Dessous, les derniers posts
 * comme sur Instagram (un toucher = l'app du post), puis toutes les apps.
 *
 * Le robot la refait a chaque passage, le Mac quand la liste change. Les posts
 * programmes a l'avance y sont deja, caches : la page les montre d'elle-meme
 * une fois leur heure passee, sans attendre le robot.
 *
 *   node outils/bio.ts      refait la page (sur le Mac : icones comprises)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PUBLICATION, RACINE, lireApps, lireJournal, type Entree } from './publication.ts';

export const DOCS = path.join(RACINE, 'docs');
const DONNEES_MAC = path.join(RACINE, 'public', 'data');
const NB_POSTS = 12;

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

type AppBio = {
  slug: string;
  plateforme?: string;
  enLigne: boolean;
  lien: string;
  appareils?: string[];
  languePrincipale: string;
  langues: Record<string, { nom?: string; sousTitre?: string; promo?: string; description?: string }>;
};

const fiche = (a: AppBio) => a.langues.fr ?? a.langues[a.languePrincipale] ?? Object.values(a.langues)[0] ?? {};
const nom = (a: AppBio) => fiche(a).nom || a.slug;
const web = (a: AppBio) => a.plateforme === 'web';

/** Le sous-titre, ou la premiere phrase de la description. */
function sousTitre(a: AppBio): string {
  const f = fiche(a);
  if (f.sousTitre) return f.sousTitre;
  const p = (f.promo || f.description || '').split('\n').find((l) => l.trim()) ?? '';
  const phrase = p.match(/^.{20,140}?[.!?](\s|$)/)?.[0] ?? p.slice(0, 120);
  return phrase.trim();
}

const bouton = (a: AppBio) => (web(a) ? 'Ouvrir l’appli' : 'Télécharger sur l’App Store');
const ou = (a: AppBio) =>
  web(a) ? 'Gratuite, dans le navigateur : rien à installer' : a.appareils?.includes('ipad') ? 'Sur l’App Store, pour iPhone et iPad' : 'Sur l’App Store, pour iPhone';

/** Les posts a montrer : publies ou programmes, du plus recent au plus ancien. */
export function postsBio(journal: Entree[], apps: AppBio[], n = NB_POSTS) {
  const parSlug = new Map(apps.map((a) => [a.slug, a]));
  return journal
    .filter((e) => (e.statut === 'publie' || e.statut === 'programme') && e.image && parSlug.has(e.slug))
    .sort((a, b) => b.creneau.localeCompare(a.creneau))
    .slice(0, n + 3) // les programmes a venir (au plus 3) ne prennent pas la place des derniers publies
    .map((e) => ({ t: e.creneau, slug: e.slug, image: e.image!, lien: e.lien ?? '' }));
}

export type DonneesBio = {
  apps: AppBio[];
  journal: Entree[];
  depot: string; // « boboul-cloud/diffusion »
  icones: Set<string>; // les slugs qui ont une icone dans docs/icones/
  maintenant?: Date;
};

export function pageBio({ apps, journal, depot, icones, maintenant = new Date() }: DonneesBio): string {
  const enLigne = apps.filter((a) => a.enLigne);
  const posts = postsBio(journal, enLigne);
  const parSlug = new Map(enLigne.map((a) => [a.slug, a]));
  const icone = (a: AppBio, taille: number) =>
    icones.has(a.slug)
      ? `<img class="icone" src="icones/${esc(a.slug)}.png" alt="" width="${taille}" height="${taille}" loading="lazy">`
      : `<span class="icone vide" style="width:${taille}px;height:${taille}px">${esc(nom(a).charAt(0))}</span>`;
  const imagePost = (image: string) => `https://raw.githubusercontent.com/${depot}/main/publication/${image}`;
  const futur = (t: string) => new Date(t).getTime() > maintenant.getTime();

  // L'app a la une : celle du dernier post deja paru (la page la recalcule a l'ouverture).
  const premier = posts.find((p) => !futur(p.t));

  const carteUne = (p: (typeof posts)[number]) => {
    const a = parSlug.get(p.slug)!;
    const f = fiche(a);
    return `
    <article class="une" data-t="${esc(p.t)}" ${p === premier ? '' : 'hidden'}>
      <p class="surtitre">Le dernier post</p>
      <a class="visuel" href="${esc(a.lien)}"><img src="${esc(imagePost(p.image))}" alt="${esc(nom(a))}" width="1080" height="1350"${p === premier ? '' : ' loading="lazy"'}></a>
      <div class="tete">
        ${icone(a, 64)}
        <div><h2>${esc(nom(a))}</h2><p>${esc(sousTitre(a))}</p></div>
      </div>
      ${f.promo && f.promo !== sousTitre(a) ? `<p class="accroche">${esc(f.promo)}</p>` : ''}
      <a class="bouton" href="${esc(a.lien)}">${bouton(a)}</a>
      <p class="ou">${ou(a)}</p>
      ${p.lien ? `<p class="discret"><a href="${esc(p.lien)}">Revoir le post sur Instagram</a></p>` : ''}
    </article>`;
  };

  const ligne = (a: AppBio) => `
      <li><a href="${esc(a.lien)}">${icone(a, 48)}<span><strong>${esc(nom(a))}</strong><small>${esc(sousTitre(a))}</small></span><i aria-hidden="true">›</i></a></li>`;

  const appStore = enLigne.filter((a) => !web(a)).sort((a, b) => nom(a).localeCompare(nom(b), 'fr', { sensitivity: 'base' }));
  const appsWeb = enLigne.filter(web).sort((a, b) => nom(a).localeCompare(nom(b), 'fr', { sensitivity: 'base' }));

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Mes apps</title>
<meta name="description" content="Les apps présentées sur Instagram : la dernière en haut, toutes les autres en dessous.">
<meta name="theme-color" content="#f6f6f8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#111114" media="(prefers-color-scheme: dark)">
<style>
  :root { --fond:#f6f6f8; --carte:#fff; --texte:#111114; --doux:#6b6b76; --trait:#e4e4ea; --accent:#0a66ff; --accent-texte:#fff; }
  @media (prefers-color-scheme: dark) { :root { --fond:#111114; --carte:#1c1c21; --texte:#f2f2f5; --doux:#9d9da8; --trait:#2c2c33; --accent:#4d8dff; } }
  * { box-sizing:border-box; }
  [hidden] { display:none !important; }
  body { margin:0; background:var(--fond); color:var(--texte); font:16px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; -webkit-text-size-adjust:100%; }
  main { max-width:560px; margin:0 auto; padding:max(20px, env(safe-area-inset-top)) 16px max(32px, env(safe-area-inset-bottom)); }
  h1 { font-size:26px; margin:4px 0 2px; letter-spacing:-0.01em; }
  .intro { color:var(--doux); margin:0 0 20px; }
  .une { background:var(--carte); border:1px solid var(--trait); border-radius:22px; padding:16px; margin-bottom:28px; }
  .surtitre { margin:0 0 10px; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--doux); }
  .visuel img { display:block; width:100%; height:auto; border-radius:14px; }
  .tete { display:flex; gap:14px; align-items:center; margin:16px 0 8px; }
  .tete h2 { margin:0; font-size:22px; line-height:1.2; }
  .tete p { margin:2px 0 0; color:var(--doux); }
  .accroche { margin:6px 0 14px; }
  .icone { border-radius:22%; flex:none; object-fit:cover; background:var(--trait); }
  .icone.vide { display:inline-flex; align-items:center; justify-content:center; font-weight:700; color:var(--doux); }
  .bouton { display:block; text-align:center; background:var(--accent); color:var(--accent-texte); text-decoration:none; font-weight:650; font-size:17px; padding:15px 18px; border-radius:14px; }
  .bouton:active { opacity:.85; }
  .ou { text-align:center; color:var(--doux); font-size:14px; margin:8px 0 0; }
  .discret { text-align:center; font-size:14px; margin:10px 0 0; }
  .discret a, footer a { color:var(--doux); }
  h3 { font-size:15px; text-transform:uppercase; letter-spacing:.06em; color:var(--doux); margin:28px 0 10px; }
  .grille { display:grid; grid-template-columns:repeat(3, 1fr); gap:3px; border-radius:14px; overflow:hidden; }
  .grille a { position:relative; display:block; aspect-ratio:4/5; background:var(--trait); }
  .grille img { width:100%; height:100%; object-fit:cover; display:block; }
  .apps { list-style:none; margin:0; padding:0; background:var(--carte); border:1px solid var(--trait); border-radius:16px; overflow:hidden; }
  .apps li + li { border-top:1px solid var(--trait); }
  .apps a { display:flex; align-items:center; gap:12px; padding:10px 14px; color:inherit; text-decoration:none; min-height:64px; }
  .apps span { flex:1; min-width:0; }
  .apps strong { display:block; font-weight:600; }
  .apps small { display:block; color:var(--doux); font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .apps i { color:var(--doux); font-style:normal; font-size:22px; }
  footer { text-align:center; color:var(--doux); font-size:14px; margin-top:32px; }
</style>
</head>
<body>
<main>
  <h1>Mes apps</h1>
  <p class="intro">Les apps présentées sur Instagram. Touche une app pour l’ouvrir.</p>
${posts.map(carteUne).join('')}
${posts.length ? `
  <h3>Les derniers posts</h3>
  <div class="grille">${posts.map((p) => {
    const a = parSlug.get(p.slug)!;
    return `<a href="${esc(a.lien)}" data-t="${esc(p.t)}" ${futur(p.t) ? 'hidden' : ''}><img src="${esc(imagePost(p.image))}" alt="${esc(nom(a))}" loading="lazy"></a>`;
  }).join('')}</div>` : ''}
${appStore.length ? `
  <h3>Sur l’App Store</h3>
  <ul class="apps">${appStore.map(ligne).join('')}
  </ul>` : ''}
${appsWeb.length ? `
  <h3>Sur le web, sans rien installer</h3>
  <ul class="apps">${appsWeb.map(ligne).join('')}
  </ul>` : ''}
  <footer><p>Toutes mes créations, de A à Z : <a href="https://dico.riskelo-salon.workers.dev/">le Dico</a></p></footer>
</main>
<script>
  // Les posts programmes a l'avance apparaissent une fois leur heure passee.
  (function () {
    var maintenant = Date.now();
    var paru = function (el) { return new Date(el.dataset.t).getTime() <= maintenant; };
    document.querySelectorAll('.grille [data-t]').forEach(function (el) { el.hidden = !paru(el); });
    var unes = Array.prototype.slice.call(document.querySelectorAll('.une')).filter(paru);
    unes.sort(function (a, b) { return a.dataset.t < b.dataset.t ? 1 : -1; });
    document.querySelectorAll('.une').forEach(function (el) { el.hidden = el !== unes[0]; });
    var grille = document.querySelector('.grille');
    if (grille) {
      var vus = Array.prototype.slice.call(grille.children).filter(function (el) { return !el.hidden; });
      vus.slice(${NB_POSTS}).forEach(function (el) { el.hidden = true; });
    }
  })();
</script>
</body>
</html>
`;
}

/** Les icones, petites, dans docs/icones/ : prises dans public/data sur le Mac, sinon dans publication/apps. */
function icones(apps: AppBio[]): Set<string> {
  const dossier = path.join(DOCS, 'icones');
  fs.mkdirSync(dossier, { recursive: true });
  const slugs = new Set(apps.map((a) => a.slug));
  for (const f of fs.readdirSync(dossier)) if (!slugs.has(f.replace(/\.png$/, ''))) fs.rmSync(path.join(dossier, f));

  const sips = process.platform === 'darwin';
  const presentes = new Set<string>();
  for (const a of apps) {
    const cible = path.join(dossier, `${a.slug}.png`);
    const sources = [path.join(DONNEES_MAC, 'apps', a.slug, 'icone.png'), path.join(PUBLICATION, 'apps', a.slug, 'icone.png')];
    const source = sources.find((s) => fs.existsSync(s));
    // Le Mac refait une icone dont la source a change ; le robot (sans sips) ne fait que les manquantes.
    const aFaire = !fs.existsSync(cible) || (sips && !!source && fs.statSync(source).mtimeMs > fs.statSync(cible).mtimeMs);
    if (source && aFaire) {
      if (sips) execFileSync('sips', ['-s', 'format', 'png', '-Z', '180', source, '--out', cible], { stdio: 'ignore' });
      else fs.copyFileSync(source, cible);
    }
    if (fs.existsSync(cible)) presentes.add(a.slug);
  }
  return presentes;
}

/** Refait docs/ ; renvoie l'adresse de la page. */
export function ecrireBio(depot = process.env.GITHUB_REPOSITORY ?? depotGit()): string {
  const apps = (lireApps() as AppBio[]).filter((a) => a.enLigne);
  const html = pageBio({ apps, journal: lireJournal(), depot, icones: icones(apps) });
  fs.mkdirSync(DOCS, { recursive: true });
  fs.writeFileSync(path.join(DOCS, 'index.html'), html);
  // GitHub Pages sert les fichiers tels quels (sans Jekyll).
  fs.writeFileSync(path.join(DOCS, '.nojekyll'), '');
  return adresseBio(depot);
}

function depotGit(): string {
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: RACINE, encoding: 'utf8' }).trim();
    return url.replace(/\.git$/, '').replace(/^.*github\.com[:/]/, '');
  } catch {
    return 'boboul-cloud/diffusion';
  }
}

/** « boboul-cloud/diffusion » → https://boboul-cloud.github.io/diffusion/ */
export const adresseBio = (depot = depotGit()) => {
  const [proprio, nomDepot] = depot.split('/');
  return `https://${proprio.toLowerCase()}.github.io/${nomDepot}/`;
};

if (import.meta.main) {
  console.log(ecrireBio());
}
