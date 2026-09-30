// La publication automatique : quand publier, et quelle app.
//
// Des fonctions pures, partagees par la page « Automatique » (apercu de la
// prochaine publication) et par le robot qui publie depuis GitHub.
//
// plan = {
//   actif: true,
//   apps: [{ slug, fiche?, visuel? }],   dans l'ordre de passage
//   jours: [1, 3, 5],                    0 = dimanche … 6 = samedi
//   heure: '18:00',                      heure de Paris
//   langue: 'fr',
// }
// journal = [{ creneau, date, slug, reseau, statut: 'programme' | 'publie' | 'erreur', … }]
//   programme : confiee a Buffer, qui publiera a l'heure du creneau
//   publie    : partie sur Instagram
//   erreur    : ratee (trois essais au plus par creneau)

const FUSEAU = 'Europe/Paris';

/** Decalage de Paris par rapport a UTC, en minutes, a un instant donne (+60 l'hiver, +120 l'ete). */
function decalage(date) {
  const nom = new Intl.DateTimeFormat('en-US', { timeZone: FUSEAU, timeZoneName: 'shortOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName').value; // « GMT+2 »
  const m = nom.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** La date du jour a Paris : { annee, mois, jour, jourSemaine }. */
function jourAParis(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: FUSEAU, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const semaine = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { annee: Number(parts.year), mois: Number(parts.month), jour: Number(parts.day), jourSemaine: semaine };
}

/** L'instant UTC qui correspond a « tel jour, telle heure, a Paris ». */
function instantParis(annee, mois, jour, heure) {
  const [h, min] = heure.split(':').map(Number);
  const approx = new Date(Date.UTC(annee, mois - 1, jour, h, min));
  return new Date(approx.getTime() - decalage(approx) * 60_000);
}

/** Les prochains creneaux de publication, a partir de `depuis` (inclus). */
export function creneaux(plan, depuis = new Date(), nombre = 5) {
  const jours = new Set(plan.jours ?? []);
  if (!jours.size || !plan.heure) return [];
  const out = [];
  for (let i = 0; i < 60 && out.length < nombre; i++) {
    const d = jourAParis(new Date(depuis.getTime() + i * 864e5));
    if (!jours.has(d.jourSemaine)) continue;
    const t = instantParis(d.annee, d.mois, d.jour, plan.heure);
    if (t >= depuis) out.push(t);
  }
  return out;
}

const compte = (e) => e.statut === 'publie' || e.statut === 'programme';

/**
 * Les creneaux a confier a Buffer maintenant : ceux des `horizonHeures`
 * a venir, pas encore programmes ni publies, ni rates trois fois.
 * Un jour d'avance : Buffer publie a l'heure pile, meme si GitHub est en retard.
 */
export function aProgrammer(plan, journal, maintenant = new Date(), horizonHeures = 24) {
  if (!plan.actif || !plan.apps?.length) return [];
  const fin = new Date(maintenant.getTime() + horizonHeures * 3600e3);
  // Un creneau a moins de 5 minutes n'est plus programmable proprement.
  const debut = new Date(maintenant.getTime() + 5 * 60e3);
  return creneaux(plan, debut, 10)
    .filter((t) => t <= fin)
    .filter((t) => {
      const essais = journal.filter((e) => e.creneau === t.toISOString());
      return !essais.some(compte) && essais.length < 3;
    });
}

/** L'app suivante : celle qui attend depuis le plus longtemps, dans l'ordre du plan. */
export function appSuivante(plan, journal) {
  const derniere = new Map();
  for (const e of journal) if (compte(e)) derniere.set(e.slug, e.creneau ?? e.date);
  let choix = null;
  for (const a of plan.apps ?? []) {
    const d = derniere.get(a.slug) ?? '';
    if (!choix || d < choix.d) choix = { app: a, d };
  }
  return choix?.app ?? null;
}

/**
 * Pour ne pas publier deux fois la meme chose : la version du texte, le
 * modele de visuel et la capture tournent a chaque passage de l'app.
 */
export function rotation(journal, slug) {
  const n = journal.filter((e) => e.slug === slug && compte(e)).length;
  const modeles = ['vitrine', 'trio', 'accroche'];
  return { variante: n, modele: modeles[n % modeles.length], capture: n };
}

export const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
