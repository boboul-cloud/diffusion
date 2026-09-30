// Ce que Diffusion retient, dans le navigateur de chaque appareil :
// reglages, suivi des publications, textes retouches, choix de visuels.
// Rien ne part sur un serveur. Pour passer d'un appareil a l'autre :
// Reglages ▸ Sauvegarder, puis Restaurer sur l'autre.

const PREFIXE = 'diffusion.';
const memoire = new Map();

export const CLES = ['reglages', 'suivi', 'textes', 'fiches', 'visuels', 'variantes', 'langues', 'angles'];

export function lire(cle, defaut) {
  try {
    const brut = localStorage.getItem(PREFIXE + cle);
    if (brut != null) return JSON.parse(brut);
  } catch {
    // Navigation privee, stockage bloque : on garde en memoire le temps de la visite.
  }
  return memoire.has(cle) ? memoire.get(cle) : defaut;
}

export function ecrire(cle, valeur) {
  memoire.set(cle, valeur);
  try {
    localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur));
  } catch {
    // Idem : la valeur reste en memoire.
  }
}

/** Modifie une entree d'un objet stocke : modifier('suivi', s => …). */
export function modifier(cle, fn) {
  const v = structuredClone(lire(cle, {}));
  const r = fn(v);
  ecrire(cle, r === undefined ? v : r);
}

export function exporter() {
  return {
    app: 'Diffusion',
    version: 1,
    date: new Date().toISOString(),
    donnees: Object.fromEntries(CLES.map((k) => [k, lire(k, null)]).filter(([, v]) => v != null)),
  };
}

export function importer(json) {
  if (json?.app !== 'Diffusion' || typeof json.donnees !== 'object') {
    throw new Error('Ce fichier n’est pas une sauvegarde de Diffusion.');
  }
  for (const [k, v] of Object.entries(json.donnees)) if (CLES.includes(k)) ecrire(k, v);
}
