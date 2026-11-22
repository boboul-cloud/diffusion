// npm test : la liste des apps a promouvoir (ajouter, enlever, remettre) et la page « lien en bio ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adresseWeb, cleApp, dejaLa, enlever, lireAjout, remettre, repartir, type Choix, type Donnees } from './liste.ts';
import { pageBio, postsBio, adresseBio } from './bio.ts';

const app = (slug: string, extra: Record<string, unknown> = {}) =>
  ({
    slug,
    bundleId: `com.exemple.${slug}`,
    enLigne: true,
    lien: `https://apps.apple.com/fr/app/${slug}/id100${slug.length}`,
    lienInternational: `https://apps.apple.com/app/id100${slug.length}`,
    languePrincipale: 'fr',
    langues: { fr: { nom: slug.charAt(0).toUpperCase() + slug.slice(1), sousTitre: `Sous-titre de ${slug}` } },
    ...extra,
  }) as any;

const web = (slug: string, url: string) => app(slug, { bundleId: '', plateforme: 'web', lien: url, lienInternational: url });

test('ce qu’on colle dans « Ajouter » : lien App Store, numéro, adresse web', () => {
  assert.deepEqual(lireAjout('https://apps.apple.com/fr/app/riskelo/id6806804539?l=en'), { type: 'appstore', id: 6806804539 });
  assert.deepEqual(lireAjout(' 6806804539 '), { type: 'appstore', id: 6806804539 });
  assert.deepEqual(lireAjout('https://tclp.riskelo-salon.workers.dev'), { type: 'web', url: 'https://tclp.riskelo-salon.workers.dev/' });
  assert.deepEqual(lireAjout('ecoloto.pages.dev/?utm=x#a'), { type: 'web', url: 'https://ecoloto.pages.dev/' });
  assert.equal(lireAjout('https://apps.apple.com/fr/developer/robert/'), null, 'une page App Store sans numéro d’app');
  assert.equal(lireAjout('pas une adresse'), null);
  assert.equal(lireAjout(''), null);
});

test('une app se reconnaît à son identifiant, ou à son adresse pour le web', () => {
  assert.equal(cleApp(app('riskelo')), 'com.exemple.riskelo');
  assert.equal(cleApp(web('web-tclp', 'https://tclp.exemple.dev')), 'web:https://tclp.exemple.dev/');
  assert.equal(adresseWeb('https://x.dev/jeu/index.html?a=1'), 'https://x.dev/jeu/index.html');
});

test('enlever puis remettre : l’app change de colonne, le choix est retenu', () => {
  const donnees: Donnees = { genere: '', apps: [app('riskelo'), app('canonball'), web('web-tclp', 'https://tclp.exemple.dev/')] };
  const choix: Choix = { enlevees: [], ajoutees: [] };

  enlever(donnees, choix, 'canonball');
  assert.deepEqual(donnees.apps.map((a) => a.slug), ['riskelo', 'web-tclp']);
  assert.deepEqual(donnees.enlevees!.map((a) => a.slug), ['canonball']);
  assert.deepEqual(choix.enlevees, [{ cle: 'com.exemple.canonball', nom: 'Canonball' }]);

  enlever(donnees, choix, 'web-tclp');
  assert.equal(choix.enlevees[1].cle, 'web:https://tclp.exemple.dev/');
  assert.throws(() => enlever(donnees, choix, 'web-tclp'), /pas dans la liste/);

  // Le prochain import range de la meme facon.
  const r = repartir([app('riskelo'), app('canonball'), web('web-tclp', 'https://tclp.exemple.dev')], choix);
  assert.deepEqual(r.apps.map((a) => a.slug), ['riskelo']);
  assert.deepEqual(r.enlevees.map((a) => a.slug), ['canonball', 'web-tclp']);

  remettre(donnees, choix, 'canonball');
  assert.deepEqual(donnees.apps.map((a) => a.slug), ['canonball', 'riskelo']);
  assert.deepEqual(choix.enlevees.map((e) => e.cle), ['web:https://tclp.exemple.dev/']);
  assert.throws(() => remettre(donnees, choix, 'riskelo'), /pas parmi les apps enlevées/);
});

test('ajouter une app déjà là, ou enlevée, ne fait pas de doublon', () => {
  const donnees: Donnees = { genere: '', apps: [app('riskelo')], enlevees: [web('web-tclp', 'https://tclp.exemple.dev/')] };
  assert.equal(dejaLa(donnees, { type: 'appstore', id: 1007 })?.a.slug, 'riskelo');
  assert.equal(dejaLa(donnees, { type: 'web', url: 'https://tclp.exemple.dev/' })?.enlevee, true);
  assert.equal(dejaLa(donnees, { type: 'appstore', id: 42 }), null);
});

test('lien en bio : le dernier post paru en haut, ceux à venir cachés', () => {
  const apps = [app('riskelo'), app('canonball'), web('web-tclp', 'https://tclp.exemple.dev/')];
  const journal = [
    { creneau: '2026-11-20T17:00:00.000Z', date: '', slug: 'riskelo', reseau: 'instagram', statut: 'publie', image: 'posts/a.jpg', lien: 'https://www.instagram.com/p/A/' },
    { creneau: '2026-11-21T17:00:00.000Z', date: '', slug: 'web-tclp', reseau: 'instagram', statut: 'publie', image: 'posts/b.jpg' },
    { creneau: '2026-11-22T17:00:00.000Z', date: '', slug: 'canonball', reseau: 'instagram', statut: 'programme', image: 'posts/c.jpg' },
    { creneau: '2026-11-19T17:00:00.000Z', date: '', slug: 'riskelo', reseau: 'instagram', statut: 'erreur' },
  ] as any[];
  const posts = postsBio(journal, apps);
  assert.deepEqual(posts.map((p) => p.slug), ['canonball', 'web-tclp', 'riskelo'], 'les ratés n’y sont pas');

  const html = pageBio({ apps, journal, depot: 'boboul-cloud/diffusion', icones: new Set(['riskelo']), maintenant: new Date('2026-11-22T10:00:00Z') });
  const unes = [...html.matchAll(/<article class="une" data-t="([^"]+)" ([^>]*)>/g)].map((m) => [m[1], m[2].includes('hidden')]);
  assert.deepEqual(unes, [
    ['2026-11-22T17:00:00.000Z', true],
    ['2026-11-21T17:00:00.000Z', false],
    ['2026-11-20T17:00:00.000Z', true],
  ]);
  assert.match(html, /Ouvrir l’appli/);
  assert.match(html, /Télécharger sur l’App Store/);
  assert.match(html, /https:\/\/raw\.githubusercontent\.com\/boboul-cloud\/diffusion\/main\/publication\/posts\/b\.jpg/);
  assert.match(html, /<h3>Sur le web, sans rien installer<\/h3>/);
  assert.match(html, /icones\/riskelo\.png/);
  assert.match(html, /<span class="icone vide"[^>]*>C<\/span>/, 'sans icône : l’initiale');
  assert.doesNotMatch(html, /undefined/);
  assert.equal(adresseBio('boboul-cloud/diffusion'), 'https://boboul-cloud.github.io/diffusion/');
});
