/**
 * Le robot de publication automatique, lance par GitHub toutes les heures.
 * Il confie a Buffer, un jour a l'avance, les publications Instagram des
 * apps choisies dans Diffusion (plan.json) ; Buffer publie a l'heure pile.
 * Tu vois et peux annuler ce qui est prevu dans l'app Buffer.
 *
 *   node outils/automatique.ts --verifier       y a-t-il quelque chose a faire ? (sortie GitHub du=oui|non)
 *   node outils/automatique.ts --programmer     programme les 24 h a venir, releve ce qui est parti
 *   node outils/automatique.ts --programmer --maintenant [slug]   une publication dans 5 minutes (essai)
 *   node outils/automatique.ts --essai [slug]   sur le Mac : image et legende dans /tmp, rien n'est envoye
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { aProgrammer, appSuivante, rotation } from '../public/js/planning.js';
import { contexte, generer } from '../public/js/textes.js';
import { canal } from '../public/js/canaux.js';
import { Rendeur } from './rendre.ts';
import { canalInstagram, programmer as confierABuffer, statut } from './buffer.ts';
import {
  PUBLICATION,
  RACINE,
  cheminImage,
  ecrireEtat,
  ecrireJournal,
  envoyer,
  git,
  lireApps,
  lireEtat,
  lireJournal,
  lirePlan,
  type Entree,
  type Plan,
} from './publication.ts';

const args = process.argv.slice(2);
const option = (nom: string) => args.includes(nom);
const valeurApres = (nom: string) => {
  const i = args.indexOf(nom);
  const v = args[i + 1];
  return i >= 0 && v && !v.startsWith('--') ? v : undefined;
};

const JOURS_GARDE_IMAGES = 60;

const joursDepuis = (iso?: string) => (iso ? (Date.now() - new Date(iso).getTime()) / 864e5 : Infinity);

function sortieGitHub(cle: string, valeur: string) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${cle}=${valeur}\n`);
  console.log(`${cle}=${valeur}`);
}

/** Ce qui partira : l'app, la legende, les options du visuel. */
function preparer(plan: Plan, journal: Entree[], apps: any[], slugForce: string | undefined, racineImages: (s: string) => string) {
  const choix = slugForce ? (plan.apps.find((a) => a.slug === slugForce) ?? { slug: slugForce }) : appSuivante(plan, journal);
  if (!choix) throw new Error('Aucune app choisie pour la mise en avant.');
  const app = apps.find((a) => a.slug === choix.slug);
  if (!app) throw new Error(`L'app ${choix.slug} n'est pas (ou plus) en ligne.`);

  const L = plan.langue ?? 'fr';
  const r = rotation(journal, app.slug);
  const c = contexte(app, L, (choix as any).fiche ?? {}, plan.signature ?? {}, { nbApps: apps.length });
  const legende = generer(canal('instagram-post'), c, r.variante)[0].valeur;

  const visuel = ((choix as any).visuel ?? {}) as Record<string, any>;
  const l = app.langues[L]?.captures?.iphone?.length ? app.langues[L] : app.langues[app.languePrincipale];
  const ipad = visuel.appareil === 'ipad' && l.captures.ipad.length;
  const liste: string[] = ipad ? l.captures.ipad : l.captures.iphone.length ? l.captures.iphone : l.captures.ipad;
  const debut = liste.length ? ((visuel.capture ?? 0) + r.capture) % liste.length : 0;
  const captures = [...liste.slice(debut), ...liste.slice(0, debut)].slice(0, 3).map(racineImages);

  return {
    app,
    legende,
    description: `${c.nom} : ${c.sousTitre}`.slice(0, 300),
    options: {
      format: 'instagram',
      modele: r.modele,
      icone: racineImages(app.icone),
      captures,
      titre: c.nom,
      sousTitre: c.sousTitre,
      accroche: c.accroche,
      bandeau: L === 'fr' ? `${c.prix} sur l’App Store` : `${c.prix} on the App Store`,
      couleur: visuel.couleur ?? '',
    },
  };
}

async function dessiner(options: Record<string, unknown>): Promise<Buffer> {
  const r = new Rendeur();
  await r.demarrer();
  try {
    return await r.image(options);
  } finally {
    await r.fermer();
  }
}

/** raw.githubusercontent.com met quelques secondes a servir un fichier qui vient d'arriver. */
async function attendreEnLigne(url: string) {
  for (let i = 0; i < 30; i++) {
    const r = await fetch(url, { method: 'HEAD' }).catch(() => null);
    if (r?.ok) return;
    await new Promise((ok) => setTimeout(ok, 3000));
  }
  throw new Error(`L'image n'est pas visible en ligne : ${url}`);
}

/** Les images des publications passees s'en vont apres 60 jours ; celles en attente restent. */
function nettoyerImages(journal: Entree[]) {
  const dossier = path.join(PUBLICATION, 'posts');
  if (!fs.existsSync(dossier)) return;
  const enAttente = new Set(journal.filter((e) => e.statut === 'programme').map((e) => e.image));
  for (const f of fs.readdirSync(dossier)) {
    const date = f.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    if (date && joursDepuis(date) > JOURS_GARDE_IMAGES && !enAttente.has(`posts/${f}`)) fs.rmSync(path.join(dossier, f));
  }
}

const enAttenteDeReleve = (journal: Entree[], maintenant: Date) =>
  journal.filter((e) => e.statut === 'programme' && new Date(e.creneau).getTime() < maintenant.getTime() - 5 * 60e3);

// ---------------------------------------------------------------

async function verifier() {
  const maintenant = new Date();
  const journal = lireJournal();
  const a = aProgrammer(lirePlan(), journal, maintenant);
  const releve = enAttenteDeReleve(journal, maintenant);
  sortieGitHub('du', a.length || releve.length ? 'oui' : 'non');
  if (a.length) console.log(`À confier à Buffer : ${a.map((t) => t.toISOString()).join(', ')}`);
  if (releve.length) console.log(`À relever : ${releve.length} publication(s) passée(s).`);
  if (!a.length && !releve.length) console.log('Rien à faire pour l’instant.');
}

async function programmerCreneaux() {
  const cle = process.env.BUFFER_API_KEY;
  if (!cle) throw new Error('Le secret BUFFER_API_KEY manque dans les réglages du dépôt GitHub.');
  const plan = lirePlan();
  const journal = lireJournal();
  const etat = lireEtat();
  const apps = lireApps();
  const maintenant = new Date();
  const force = option('--maintenant');
  const slugForce = force ? valeurApres('--maintenant') : undefined;
  const aFaire = force ? [new Date(maintenant.getTime() + 5 * 60e3)] : aProgrammer(plan, journal, maintenant);
  const depot = process.env.GITHUB_REPOSITORY ?? 'boboul-cloud/diffusion';

  if (aFaire.length) {
    const canal = await canalInstagram(cle);
    etat.buffer = { canal: canal.nom, verifie: maintenant.toISOString() };

    for (const quand of aFaire.slice(0, 3)) {
      const entree: Entree = { creneau: quand.toISOString(), date: maintenant.toISOString(), slug: '', reseau: 'instagram', statut: 'erreur' };
      try {
        const p = preparer(plan, journal, apps, slugForce, cheminImage);
        entree.slug = p.app.slug;
        entree.legende = p.legende;

        const nom = `${quand.toISOString().slice(0, 10)}-${p.app.slug}-${Date.now().toString(36)}.jpg`;
        fs.mkdirSync(path.join(PUBLICATION, 'posts'), { recursive: true });
        fs.writeFileSync(path.join(PUBLICATION, 'posts', nom), await dessiner(p.options));
        entree.image = `posts/${nom}`;
        envoyer(`Image pour Instagram : ${p.app.slug}, ${quand.toISOString().slice(0, 16)}`);

        // Adresse figee sur ce commit : Buffer va chercher l'image au moment de publier.
        const url = `https://raw.githubusercontent.com/${depot}/${git('rev-parse', 'HEAD')}/publication/posts/${nom}`;
        await attendreEnLigne(url);

        const r = await confierABuffer(cle, canal.id, { texte: p.legende, image: url, description: p.description, quand });
        Object.assign(entree, { statut: 'programme', bufferId: r.id, mode: r.mode });
        console.log(`Confié à Buffer : ${p.app.slug} pour ${quand.toISOString()} (${r.mode})`);
        if (r.mode !== 'automatic') {
          etat.derniereErreur = {
            date: maintenant.toISOString(),
            message: 'Buffer publiera en mode « notification » (un rappel sur ton téléphone) : vérifie que ton Instagram est un compte professionnel et que « Enable Notifications by default » est désactivé dans Buffer.',
          };
        }
      } catch (e) {
        entree.erreur = (e as Error).message;
        etat.derniereErreur = { date: new Date().toISOString(), message: entree.erreur };
        console.error(`Échec : ${entree.erreur}`);
      }
      journal.push(entree);
    }
  }

  // Ce qui devait partir : parti (avec son lien) ou rate.
  for (const e of enAttenteDeReleve(journal, maintenant)) {
    try {
      const s = await statut(cle, (e as any).bufferId);
      if (s.statut === 'sent') Object.assign(e, { statut: 'publie', lien: s.lien, publieLe: new Date().toISOString() });
      else if (s.statut === 'error') {
        Object.assign(e, { statut: 'erreur', erreur: s.erreur || 'Buffer n’a pas pu publier.' });
        etat.derniereErreur = { date: new Date().toISOString(), message: `${e.slug} : ${e.erreur}` };
      }
    } catch (err) {
      console.error(`Relevé impossible pour ${e.slug} : ${(err as Error).message}`);
    }
  }
  if (journal.some((e) => e.statut === 'publie') && etat.derniereErreur && journal.at(-1)?.statut !== 'erreur') {
    // Une publication reussie depuis le dernier probleme : on ne l'affiche plus.
    const dernierePublication = journal.filter((e) => e.statut === 'publie').at(-1)!;
    if ((dernierePublication as any).publieLe > etat.derniereErreur.date) delete etat.derniereErreur;
  }

  nettoyerImages(journal);
  ecrireJournal(journal);
  ecrireEtat(etat);
  envoyer('Journal des publications');
  if (aFaire.length && journal.slice(-aFaire.length).every((e) => e.statut === 'erreur')) process.exitCode = 1;
}

/** Sur le Mac, sans rien publier : ce qui partirait. */
async function essai() {
  const publication = fs.existsSync(path.join(PUBLICATION, 'apps.json'));
  const apps = publication ? lireApps() : JSON.parse(fs.readFileSync(path.join(RACINE, 'public/data/apps.json'), 'utf8')).apps.filter((a: any) => a.enLigne);
  const slug = valeurApres('--essai');
  const plan = lirePlan();
  if (!plan.apps.length && !slug) plan.apps = apps.slice(0, 1).map((a: any) => ({ slug: a.slug }));
  const racine = (s: string) =>
    publication && fs.existsSync(path.join(PUBLICATION, 'apps', s.split('/')[2] ?? '')) ? cheminImage(s) : `/public/${s.replace(/\?.*$/, '')}`;
  const p = preparer(plan, lireJournal(), apps, slug, racine);
  const image = path.join(os.tmpdir(), `diffusion-essai-${p.app.slug}.jpg`);
  fs.writeFileSync(image, await dessiner(p.options));
  console.log(`App : ${p.app.slug} (modèle ${p.options.modele})\nImage : ${image}\n\nLégende :\n${p.legende}`);
}

if (option('--verifier')) await verifier();
else if (option('--programmer')) await programmerCreneaux();
else if (option('--essai')) await essai();
else console.log('Options : --verifier, --programmer [--maintenant [slug]], --essai [slug]');
