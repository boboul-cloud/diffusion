// npm test : quand publier et quelle app, heure de Paris comprise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aProgrammer, appSuivante, creneaux, rotation } from '../public/js/planning.js';

const PLAN = { actif: true, apps: [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }], jours: [1, 3, 5], heure: '18:00', langue: 'fr' };

test('les créneaux tombent à 18 h à Paris, été comme hiver', () => {
  // Mercredi 30 septembre 2026 : heure d'été (UTC+2).
  const ete = creneaux(PLAN, new Date('2026-09-30T10:00:00Z'), 3).map((d) => d.toISOString());
  assert.deepEqual(ete, ['2026-09-30T16:00:00.000Z', '2026-10-02T16:00:00.000Z', '2026-10-05T16:00:00.000Z']);
  // Lundi 26 octobre 2026 : heure d'hiver (UTC+1), le changement a eu lieu la veille.
  assert.equal(creneaux(PLAN, new Date('2026-10-26T00:00:00Z'), 1)[0].toISOString(), '2026-10-26T17:00:00.000Z');
});

test('on confie à Buffer les créneaux des prochaines 24 h, une seule fois', () => {
  // Mercredi 30 septembre, 10 h UTC : le créneau de 18 h (16 h UTC) est dans les 24 h, pas celui de vendredi.
  const t = aProgrammer(PLAN, [], new Date('2026-09-30T10:00:00Z')).map((d) => d.toISOString());
  assert.deepEqual(t, ['2026-09-30T16:00:00.000Z']);
  const fait = [{ creneau: '2026-09-30T16:00:00.000Z', slug: 'a', statut: 'programme', date: '2026-09-30T10:07:00Z' }];
  assert.deepEqual(aProgrammer(PLAN, fait, new Date('2026-09-30T11:00:00Z')), []);
  // Trois échecs sur ce créneau : on arrête d'insister.
  const rates = [1, 2, 3].map(() => ({ creneau: '2026-09-30T16:00:00.000Z', slug: 'a', statut: 'erreur', date: 'x' }));
  assert.deepEqual(aProgrammer(PLAN, rates, new Date('2026-09-30T12:00:00Z')), []);
  // Trop tard pour programmer proprement un créneau dans 2 minutes.
  assert.deepEqual(aProgrammer(PLAN, [], new Date('2026-09-30T15:58:00Z')), []);
});

test('en pause ou sans app : rien', () => {
  assert.deepEqual(aProgrammer({ ...PLAN, actif: false }, [], new Date('2026-09-30T10:00:00Z')), []);
  assert.deepEqual(aProgrammer({ ...PLAN, apps: [] }, [], new Date('2026-09-30T10:00:00Z')), []);
});

test('les apps passent à tour de rôle, dans l’ordre choisi', () => {
  const j = [];
  const ordre = [];
  for (let i = 0; i < 5; i++) {
    const a = appSuivante(PLAN, j);
    ordre.push(a.slug);
    j.push({ slug: a.slug, statut: i % 2 ? 'publie' : 'programme', creneau: `2026-10-0${i + 1}T16:00:00Z` });
  }
  assert.deepEqual(ordre, ['a', 'b', 'c', 'a', 'b']);
  // Une publication ratée ne compte pas : l'app repasse.
  assert.equal(appSuivante(PLAN, [{ slug: 'a', statut: 'erreur', creneau: '2026-10-01T16:00:00Z' }]).slug, 'a');
});

test('texte, modèle et capture changent à chaque passage d’une app', () => {
  const j = [{ slug: 'a', statut: 'publie', date: 'x' }];
  assert.deepEqual(rotation([], 'a'), { variante: 0, modele: 'vitrine', capture: 0 });
  assert.deepEqual(rotation(j, 'a'), { variante: 1, modele: 'trio', capture: 1 });
});
