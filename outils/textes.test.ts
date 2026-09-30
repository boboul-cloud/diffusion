// npm test : les textes, les canaux et le .zip, sans navigateur ni reseau.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  casPhrase,
  contexte,
  deduireSousTitre,
  extrairePoints,
  generer,
  hashtag,
  longueur,
  recoller,
} from '../public/js/textes.js';
import { CANAUX, ORDRE_LANCEMENT, canal } from '../public/js/canaux.js';
import { creerZip } from '../public/js/zip.js';

const APP = {
  slug: 'sentier',
  enLigne: true,
  lien: 'https://apps.apple.com/fr/app/sentier/id123',
  lienInternational: 'https://apps.apple.com/app/id123',
  gratuit: true,
  prix: '',
  achats: true,
  categorie: 'TRAVEL',
  genre: { fr: 'Voyages', en: 'Travel' },
  appareils: ['iphone', 'ipad'],
  iosMin: '17.0',
  note: null,
  sortie: new Date().toISOString(),
  version: '1.2',
  developpeur: 'Robert Oulhen',
  site: 'https://exemple.github.io/sentier/',
  icone: 'data/apps/sentier/icone.png',
  languePrincipale: 'fr',
  langues: {
    fr: {
      nom: 'Sentier',
      sousTitre: 'Portsall – Mont-Saint-Michel',
      promo: '41 étapes, cartes IGN hors ligne, suivi GPS et hébergements.',
      description:
        'Sentier accompagne la randonnée du GR 34, de la préparation à l’arrivée, et fonctionne sans\nréseau sur le sentier.\n\nCHAQUE ÉTAPE, DOCUMENTÉE\n\n• Distance et dénivelé.\n\nPRÉPARER LE VOYAGE\n\n• Dans les deux sens.\n\nSUR LE SENTIER, MÊME SANS RÉSEAU\n\n• Cartes IGN.',
      motsCles: ['randonnée', 'hors ligne', 'gps'],
      nouveautes: '• Un nouveau plateau.\n• Des cartes plus nettes.\n• Moins de batterie.',
      captures: { iphone: [], ipad: [] },
    },
  },
};

const REGLAGES = { nom: 'Robert Oulhen', ville: 'Portsall', email: 'moi@exemple.fr' };

test('les intertitres en capitales deviennent des phrases, sigles compris', () => {
  assert.equal(casPhrase('GESTION DE MATCH EN TEMPS RÉEL'), 'Gestion de match en temps réel');
  assert.equal(casPhrase('CARTES IGN ET SUIVI GPS'), 'Cartes IGN et suivi GPS');
});

test('les points forts viennent des intertitres, sans Markdown', () => {
  assert.deepEqual(extrairePoints(APP.langues.fr.description, 'Sentier'), [
    'Chaque étape, documentée',
    'Préparer le voyage',
    'Sur le sentier, même sans réseau',
  ]);
  const markdown = '> **Titre en tête.**\n>\n> **AU JEU DE TAROT**\n>\n> texte\n>\n> **UN ADVERSAIRE QUI JOUE**\n>\n> texte\n>\n> **TROIS PLATEAUX**\n>\n> texte';
  assert.deepEqual(extrairePoints(markdown, 'X'), ['Au jeu de tarot', 'Un adversaire qui joue', 'Trois plateaux']);
});

test('à défaut d’intertitres, les puces', () => {
  const d = 'Une app.\n\n• Premier point utile\n• Deuxième point utile\n• Troisième point utile';
  assert.deepEqual(extrairePoints(d, 'X'), ['Premier point utile', 'Deuxième point utile', 'Troisième point utile']);
});

test('les lignes coupées à 80 colonnes sont recollées, pas les intertitres', () => {
  const d = 'Blocgenda est un bloc-notes qui pense comme une additionneuse de comptoir : une\nbande de papier sans fin.\n\nUNE SEULE BARRE\n\n• un point';
  assert.equal(recoller(d).split('\n')[0], 'Blocgenda est un bloc-notes qui pense comme une additionneuse de comptoir : une bande de papier sans fin.');
  assert.match(recoller(d), /\nUNE SEULE BARRE\n/);
});

test('le sous-titre déduit ne répète pas le nom de l’app', () => {
  assert.equal(deduireSousTitre('Blocgenda est un bloc-notes malin.', 'Blocgenda'), 'Un bloc-notes malin');
  assert.equal(deduireSousTitre('MonPetitRéseau, c’est le réseau de la famille.', 'MonPetitReseau'), 'Le réseau de la famille');
  assert.equal(deduireSousTitre('StopPhone détecte la conduite.', 'StopPhone'), 'Détecte la conduite');
});

test('hashtags en CamelCase, sigles respectés', () => {
  assert.equal(hashtag('hors ligne'), '#HorsLigne');
  assert.equal(hashtag('gps'), '#GPS');
  assert.equal(hashtag('2026'), '');
});

test('X compte un lien pour 23 caractères', () => {
  assert.equal(longueur('Salut https://apps.apple.com/fr/app/un-tres-long-nom/id1234567890', 'x'), 6 + 23);
});

test('chaque canal, chaque langue, chaque version : dans les limites, rien d’indéfini', () => {
  for (const L of ['fr', 'en']) {
    const c = contexte(APP, L, {}, REGLAGES, { nbApps: 23 });
    for (const k of CANAUX) {
      for (const v of [0, 1, 2]) {
        const champs = generer(k, c, v);
        assert.ok(champs.length, `${k.id} sans champ`);
        for (const ch of champs) {
          assert.doesNotMatch(ch.valeur, /undefined|null|\[object|NaN/, `${k.id}/${ch.cle} : ${ch.valeur}`);
          if (ch.limite) assert.ok(longueur(ch.valeur, ch.compte) <= ch.limite, `${k.id}/${ch.cle} trop long en ${L}`);
        }
        const adresse = k.ouvrir?.(champs, c, { mobile: false, ios: true });
        if (adresse && /^https?:/.test(adresse)) assert.doesNotThrow(() => new URL(adresse), k.id);
      }
    }
  }
});

test('les liens de partage emmènent le texte', () => {
  const c = contexte(APP, 'fr', {}, REGLAGES);
  const x = canal('x');
  const url = new URL(x.ouvrir(generer(x, c), c, {}));
  assert.equal(url.hostname, 'x.com');
  assert.match(url.searchParams.get('text') ?? '', /Sentier/);
  const mail = canal('pitch').ouvrir(generer(canal('pitch'), c), c, {});
  assert.match(mail, /^mailto:\?subject=.+&body=.+%0D%0A/);
  assert.match(canal('mastodon').ouvrir(generer(canal('mastodon'), c), c, {}), /^https:\/\/share\.joinmastodon\.org\/#text=/);
  assert.match(canal('mastodon').ouvrir(generer(canal('mastodon'), c), c, { mastodon: 'https://piaille.fr/' }), /^https:\/\/piaille\.fr\/share\?text=/);
  assert.match(canal('sms').ouvrir(generer(canal('sms'), c), c, { ios: true }), /^sms:&body=/);
});

test('français : contractions, espaces insécables, pas d’accord au masculin', () => {
  const c = contexte(APP, 'fr', {}, REGLAGES, { nbApps: 23 });
  const tout = CANAUX.flatMap((k) => [0, 1, 2].flatMap((v) => generer(k, c, v).map((ch) => ch.valeur))).join('\n');
  assert.match(tout, /aux voyageurs et aux randonneurs/);
  assert.doesNotMatch(tout, /à les |de les /);
  assert.doesNotMatch(tout, /\b(ravi|heureux|fier|preneur|créateur)\b/i);
  assert.match(tout, /Sentier : Portsall/);
  // « Portsall » est un nom propre : pas de minuscule apres les deux-points.
  assert.doesNotMatch(tout, /portsall/);
});

test('une app sortie depuis longtemps ne se dit pas « nouvelle »', () => {
  const ancienne = { ...APP, sortie: '2024-01-01T00:00:00Z' };
  const c = contexte(ancienne, 'fr', {}, REGLAGES);
  const tout = CANAUX.flatMap((k) => [0, 1, 2].flatMap((v) => generer(k, c, v).map((ch) => ch.valeur))).join('\n');
  assert.doesNotMatch(tout, /je viens de publier|la dernière application|nouvelle app/i);
});

test('angle « Nouveautés » : les points forts viennent des nouveautés', () => {
  const c = contexte(APP, 'fr', { angle: 'nouveautes' }, REGLAGES);
  assert.deepEqual(c.pointsForts, ['Un nouveau plateau', 'Des cartes plus nettes', 'Moins de batterie']);
  assert.match(generer(canal('x'), c)[0].valeur, /Nouvelle version de Sentier/);
});

test('ce que tu retouches dans la fiche prime', () => {
  const c = contexte(APP, 'fr', { sousTitre: 'Le GR 34 en poche', public: 'les marcheurs', pointsForts: 'Un\nDeux' }, REGLAGES);
  assert.equal(c.sousTitre, 'Le GR 34 en poche');
  assert.deepEqual(c.pointsForts, ['Un', 'Deux']);
  assert.match(generer(canal('communique'), c)[1].valeur, /pensée pour les marcheurs/);
});

test('l’ordre de lancement ne cite que des canaux qui existent', () => {
  for (const id of ORDRE_LANCEMENT) assert.ok(canal(id), id);
  assert.equal(new Set(CANAUX.map((k) => k.id)).size, CANAUX.length);
});

test('le .zip du dossier de presse est valide', async () => {
  const blob = await creerZip([
    { nom: 'communique-fr.txt', donnees: 'Communiqué — accents compris' },
    { nom: 'captures/iphone-1.jpg', donnees: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) },
  ]);
  const fichier = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'diffusion-')), 'test.zip');
  fs.writeFileSync(fichier, Buffer.from(await blob.arrayBuffer()));
  const sortie = execFileSync('unzip', ['-t', fichier], { encoding: 'utf8' });
  assert.match(sortie, /No errors detected/);
  assert.equal(execFileSync('unzip', ['-p', fichier, 'communique-fr.txt'], { encoding: 'utf8' }), 'Communiqué — accents compris');
});

test('toutes les apps importées passent', { skip: !fs.existsSync(new URL('../public/data/apps.json', import.meta.url)) }, () => {
  const { apps } = JSON.parse(fs.readFileSync(new URL('../public/data/apps.json', import.meta.url), 'utf8'));
  for (const app of apps) {
    for (const L of ['fr', 'en']) {
      const c = contexte(app, L, {}, REGLAGES, { nbApps: 23 });
      for (const k of CANAUX) {
        for (const ch of generer(k, c, 0)) {
          if (ch.limite) assert.ok(longueur(ch.valeur, ch.compte) <= ch.limite, `${app.slug} ${L} ${k.id}/${ch.cle}`);
          assert.doesNotMatch(ch.valeur, /undefined|\[object/, `${app.slug} ${k.id}`);
        }
      }
    }
  }
});
