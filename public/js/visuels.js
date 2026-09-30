// Les visuels de chaque publication, dessines dans le navigateur.
//
// Un fond dans la couleur de l'icone, l'icone, le nom, le sous-titre,
// et les captures dans un cadre d'iPhone ou d'iPad. Trois modeles :
//   vitrine   une capture, grande
//   trio      trois captures en eventail
//   accroche  la phrase d'accroche en grand, une capture
// Tout est calcule a partir de la taille du format : le meme dessin
// sert au carre d'Instagram comme a la galerie de Product Hunt.

import { FORMATS } from './canaux.js';

// Le robot (outils/rendu.html) impose sa police : les serveurs Linux n'ont pas celle d'Apple.
const POLICE = globalThis.POLICE_VISUELS ?? 'system-ui, -apple-system, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const MODELES = [
  { id: 'vitrine', nom: 'Vitrine' },
  { id: 'trio', nom: 'Trio' },
  { id: 'accroche', nom: 'Accroche' },
];

// ---------------------------------------------------------------
//  Images et couleur
// ---------------------------------------------------------------

const images = new Map();

export function chargerImage(src) {
  if (!src) return Promise.resolve(null);
  if (!images.has(src)) {
    images.set(
      src,
      new Promise((ok) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => ok(img);
        img.onerror = () => ok(null);
        img.src = src;
      }),
    );
  }
  return images.get(src);
}

function versHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

const couleurs = new Map();

/**
 * La teinte dominante de l'icone, ramenee a une couleur de fond sombre et
 * vive : le texte blanc reste lisible, quelle que soit l'icone.
 */
export async function couleurIcone(src) {
  if (couleurs.has(src)) return couleurs.get(src);
  const img = await chargerImage(src);
  let hsl = [225, 0.55, 0.4];
  if (img) {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, 32, 32);
    const px = ctx.getImageData(0, 0, 32, 32).data;
    // Les pixels vifs comptent plus : un fond blanc ou gris ne donne pas la teinte.
    let x = 0, y = 0, poids = 0, grisL = 0, n = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 128) continue;
      const [h, s, l] = versHsl(px[i], px[i + 1], px[i + 2]);
      grisL += l; n++;
      const w = s * (1 - Math.abs(l - 0.5) * 1.6);
      if (w <= 0.05) continue;
      x += Math.cos((h * Math.PI) / 180) * w;
      y += Math.sin((h * Math.PI) / 180) * w;
      poids += w;
    }
    if (poids > 20) {
      const h = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
      hsl = [h, 0.62, 0.42];
    } else {
      // Icone sans couleur : un gris bleute, plus ou moins sombre.
      hsl = [220, 0.14, Math.min(0.32, (grisL / Math.max(n, 1)) * 0.4)];
    }
  }
  const couleur = `hsl(${Math.round(hsl[0])} ${Math.round(hsl[1] * 100)}% ${Math.round(hsl[2] * 100)}%)`;
  couleurs.set(src, couleur);
  return couleur;
}

/** « hsl(210 62% 42%) » ou « #3355aa » → [h, s, l] */
function hslDe(couleur) {
  const m = couleur.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
  if (m) return [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
  const hex = couleur.replace('#', '');
  const v = hex.length === 3 ? hex.split('').map((c) => parseInt(c + c, 16)) : [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [h, s, l] = versHsl(...v);
  // Une couleur choisie trop claire est assombrie : le texte est blanc.
  return [h, s, Math.min(l, 0.46)];
}

const hsl = (h, s, l, a = 1) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(Math.max(0, Math.min(1, l)) * 100)}% / ${a})`;

// ---------------------------------------------------------------
//  Dessin
// ---------------------------------------------------------------

function arrondi(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function fond(ctx, W, H, couleur) {
  const [h, s, l] = hslDe(couleur);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, hsl(h - 8, s, l + 0.1));
  g.addColorStop(1, hsl(h + 14, s, l - 0.17));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Un halo en haut, pour la profondeur.
  const r = ctx.createRadialGradient(W * 0.2, H * 0.05, 0, W * 0.2, H * 0.05, Math.max(W, H) * 0.75);
  r.addColorStop(0, 'rgba(255,255,255,0.22)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
}

/** Decoupe un texte en lignes ; reduit la taille jusqu'a ce qu'il tienne. */
function paragraphe(ctx, texte, x, y, largeur, o) {
  if (!texte) return 0;
  let taille = o.taille;
  let lignes = [];
  for (; taille >= o.taille * 0.55; taille *= 0.94) {
    ctx.font = `${o.poids ?? 600} ${taille}px ${POLICE}`;
    lignes = couperLignes(ctx, texte, largeur);
    if (lignes.length <= (o.lignes ?? 2)) break;
  }
  if (lignes.length > (o.lignes ?? 2)) {
    lignes = lignes.slice(0, o.lignes ?? 2);
    let der = lignes.at(-1);
    while (ctx.measureText(`${der}…`).width > largeur && der.includes(' ')) der = der.slice(0, der.lastIndexOf(' '));
    lignes[lignes.length - 1] = `${der.replace(/[,;:.—–-]+$/, '')}…`;
  }
  ctx.fillStyle = o.couleur ?? '#fff';
  ctx.textBaseline = 'top';
  ctx.textAlign = o.align ?? 'left';
  const pas = taille * (o.interligne ?? 1.18);
  const ax = o.align === 'center' ? x + largeur / 2 : x;
  lignes.forEach((l, i) => ctx.fillText(l, ax, y + i * pas));
  return lignes.length * pas;
}

function couperLignes(ctx, texte, largeur) {
  const lignes = [];
  for (const bloc of texte.split('\n')) {
    let ligne = '';
    for (const mot of bloc.split(/\s+/)) {
      const essai = ligne ? `${ligne} ${mot}` : mot;
      if (ctx.measureText(essai).width <= largeur || !ligne) ligne = essai;
      else {
        lignes.push(ligne);
        ligne = mot;
      }
    }
    if (ligne) lignes.push(ligne);
  }
  return lignes;
}

function icone(ctx, img, x, y, taille) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = taille * 0.18;
  ctx.shadowOffsetY = taille * 0.05;
  arrondi(ctx, x, y, taille, taille, taille * 0.225);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
  if (img) {
    ctx.save();
    arrondi(ctx, x, y, taille, taille, taille * 0.225);
    ctx.clip();
    ctx.drawImage(img, x, y, taille, taille);
    ctx.restore();
  }
}

/** Un appareil (iPhone ou iPad, selon la forme de la capture) ; renvoie sa hauteur. */
function appareil(ctx, img, x, y, largeur) {
  const ratio = img.naturalHeight / img.naturalWidth;
  const ipad = ratio < 1.6;
  const bord = largeur * (ipad ? 0.03 : 0.04);
  const rayon = largeur * (ipad ? 0.06 : 0.14);
  const hauteur = (largeur - bord * 2) * ratio + bord * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.38)';
  ctx.shadowBlur = largeur * 0.12;
  ctx.shadowOffsetY = largeur * 0.04;
  arrondi(ctx, x, y, largeur, hauteur, rayon);
  ctx.fillStyle = '#0b0b0f';
  ctx.fill();
  ctx.restore();

  ctx.save();
  arrondi(ctx, x + bord, y + bord, largeur - bord * 2, hauteur - bord * 2, Math.max(rayon - bord, 2));
  ctx.clip();
  ctx.drawImage(img, x + bord, y + bord, largeur - bord * 2, hauteur - bord * 2);
  ctx.restore();

  ctx.save();
  arrondi(ctx, x + 1, y + 1, largeur - 2, hauteur - 2, rayon);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = Math.max(1, largeur * 0.006);
  ctx.stroke();
  ctx.restore();
  return hauteur;
}

const hauteurAppareil = (img, largeur) => {
  const ratio = img.naturalHeight / img.naturalWidth;
  const bord = largeur * (ratio < 1.6 ? 0.03 : 0.04);
  return (largeur - bord * 2) * ratio + bord * 2;
};

/** La pastille « Gratuit sur l'App Store » ; renvoie sa largeur. */
function pastille(ctx, texte, x, y, taille, align = 'left') {
  ctx.font = `700 ${taille}px ${POLICE}`;
  const l = ctx.measureText(texte).width + taille * 1.6;
  const h = taille * 2;
  const gx = align === 'center' ? x - l / 2 : x;
  arrondi(ctx, gx, y, l, h, h / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(texte, gx + taille * 0.8, y + h / 2 + taille * 0.04);
  return l;
}

/** Le QR code du lien, sur une carte blanche. */
export function dessinerQr(ctx, url, x, y, taille) {
  if (!url || typeof window === 'undefined' || !window.qrcode) return false;
  const q = window.qrcode(0, 'M');
  q.addData(url);
  q.make();
  const n = q.getModuleCount();
  const marge = taille * 0.08;
  arrondi(ctx, x, y, taille, taille, taille * 0.08);
  ctx.fillStyle = '#fff';
  ctx.fill();
  const pas = (taille - marge * 2) / n;
  ctx.fillStyle = '#000';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) ctx.fillRect(x + marge + c * pas, y + marge + r * pas, Math.ceil(pas), Math.ceil(pas));
    }
  }
  return true;
}

// ---------------------------------------------------------------
//  Les mises en page
// ---------------------------------------------------------------

/**
 * Dessine un visuel.
 * o = { format, modele, icone, captures: [src], titre, sousTitre, accroche,
 *       bandeau, couleur?, qr? (adresse) }
 */
export async function dessiner(canvas, o) {
  const f = FORMATS[o.format] ?? FORMATS.carre;
  const W = (canvas.width = f.l);
  const H = (canvas.height = f.h);
  const ctx = canvas.getContext('2d');

  const [img, ...caps] = await Promise.all([chargerImage(o.icone), ...(o.captures ?? []).map(chargerImage)]);
  const captures = caps.filter(Boolean);
  const couleur = o.couleur || (o.icone ? await couleurIcone(o.icone) : 'hsl(225 55% 40%)');

  fond(ctx, W, H, couleur);
  if (W / H > 1.12) paysage(ctx, W, H, img, captures, o);
  else vertical(ctx, W, H, img, captures, o);
  return canvas;
}

function vertical(ctx, W, H, img, captures, o) {
  const u = Math.min(W, H) / 100;
  const m = 6.5 * u;
  const tall = H / W > 1.5;
  const tailleIcone = (tall ? 15 : 13) * u;

  // En-tete : icone, nom, sous-titre.
  let y = m * (tall ? 1.6 : 1);
  icone(ctx, img, m, y, tailleIcone);
  const xTexte = m + tailleIcone + 4 * u;
  const largeurTexte = W - xTexte - m;
  const hTitre = paragraphe(ctx, o.titre, xTexte, y + tailleIcone * 0.08, largeurTexte, { taille: 8.2 * u, poids: 800, lignes: 1 });
  paragraphe(ctx, o.sousTitre, xTexte, y + tailleIcone * 0.08 + hTitre + 0.6 * u, largeurTexte, {
    taille: 4.3 * u, poids: 500, lignes: 2, couleur: 'rgba(255,255,255,0.88)',
  });
  y += tailleIcone + 4.5 * u;

  if (o.modele === 'accroche' && o.accroche) {
    y += paragraphe(ctx, o.accroche, m, y, W - m * 2, { taille: (tall ? 7 : 6) * u, poids: 750, lignes: tall ? 5 : 3, interligne: 1.14 }) + 3.5 * u;
  }

  if (o.bandeau) {
    pastille(ctx, o.bandeau, m, y, 3.6 * u);
    y += 7.2 * u + 4 * u;
  }

  const bas = H - (tall ? m * 1.4 : 0);
  if (!captures.length) {
    const t = Math.min(W * 0.45, bas - y - m);
    icone(ctx, img, (W - t) / 2, y + (bas - y - t) / 2, t);
  } else if (captures[0].naturalWidth > captures[0].naturalHeight) {
    // Captures en paysage (un jeu, un iPad a l'horizontale) : larges, empilees.
    const n = o.modele === 'trio' ? Math.min(3, captures.length) : 1;
    const zone = bas - y - (o.qr ? 18 * u : m * 0.6);
    let l = W * (n > 1 ? 0.8 : 0.9);
    const h = hauteurAppareil(captures[0], l);
    const pas = n > 1 ? Math.min(h * 0.78, (zone - h) / (n - 1)) : 0;
    if (h + pas * (n - 1) > zone) l *= zone / (h + pas * (n - 1));
    const hl = hauteurAppareil(captures[0], l);
    const pl = n > 1 ? Math.min(hl * 0.78, (zone - hl) / (n - 1)) : 0;
    const y0 = y + Math.max(0, (zone - hl - pl * (n - 1)) / 2);
    for (let i = n - 1; i >= 0; i--) {
      const decale = n > 1 ? (i % 2 ? 1 : -1) * W * 0.04 : 0;
      appareil(ctx, captures[i], (W - l) / 2 + decale, y0 + i * pl, l);
    }
  } else if (o.modele === 'trio' && captures.length >= 2) {
    trio(ctx, W, captures, y, bas, tall ? 1 : 1.25);
  } else {
    // Une capture, centree ; sur le carre elle deborde en bas, a la maniere de l'App Store.
    const cap = captures[0];
    const debord = tall ? 1 : 1.3;
    let l = W * (cap.naturalHeight / cap.naturalWidth < 1.6 ? 0.78 : 0.56);
    const h = hauteurAppareil(cap, l);
    if (h > (bas - y) * debord) l *= ((bas - y) * debord) / h;
    appareil(ctx, cap, (W - l) / 2, y, l);
  }

  if (o.qr) dessinerQr(ctx, o.qr, W - m - 17 * u, H - m - 17 * u, 17 * u);
}

function trio(ctx, W, captures, y, bas, debord) {
  const [a, b, c] = [captures[0], captures[1], captures[2] ?? captures[1]];
  let l = W * 0.44;
  const h = hauteurAppareil(a, l);
  if (h > (bas - y) * debord) l *= ((bas - y) * debord) / h;
  const cote = l * 0.84;
  const decalage = l * 0.62;
  const cx = W / 2;
  appareil(ctx, b, cx - decalage - cote / 2, y + l * 0.16, cote);
  appareil(ctx, c, cx + decalage - cote / 2, y + l * 0.16, cote);
  appareil(ctx, a, cx - l / 2, y, l);
}

function paysage(ctx, W, H, img, captures, o) {
  const u = H / 100;
  const m = 8 * u;
  const colonne = W * 0.5 - m;
  const tailleIcone = 17 * u;

  // A droite, les captures ; a gauche, le texte, centre verticalement.
  if (captures.length) {
    const zoneX = W * 0.52;
    const zoneL = W - zoneX - m * 0.6;
    if (o.modele === 'trio' && captures.length >= 2) {
      const [a, b, c] = [captures[0], captures[1], captures[2] ?? captures[1]];
      let l = Math.min(zoneL * 0.44, (H * 1.08) / (a.naturalHeight / a.naturalWidth));
      const cote = l * 0.84;
      const cx = zoneX + zoneL / 2;
      const y0 = m * 0.9;
      appareil(ctx, b, cx - l * 0.62 - cote / 2, y0 + l * 0.2, cote);
      appareil(ctx, c, cx + l * 0.62 - cote / 2, y0 + l * 0.2, cote);
      appareil(ctx, a, cx - l / 2, y0, l);
    } else {
      const cap = captures[0];
      const ratio = cap.naturalHeight / cap.naturalWidth;
      let l = ratio < 1.6 ? zoneL * 0.9 : Math.min(zoneL * 0.62, (H * 1.2) / ratio);
      const h = hauteurAppareil(cap, l);
      const y0 = ratio < 1.6 ? Math.max(m * 0.7, (H - h) / 2) : m * 0.9;
      appareil(ctx, cap, zoneX + (zoneL - l) / 2, y0, l);
    }
  } else {
    const t = H * 0.55;
    icone(ctx, img, W * 0.52 + (W * 0.48 - t) / 2, (H - t) / 2, t);
  }

  // Le bloc de texte, mesure puis centre.
  let hTotal = tailleIcone + 5 * u;
  const mesure = document.createElement('canvas').getContext('2d');
  const hTitre = paragraphe(mesure, o.titre, 0, 0, colonne, { taille: 9.5 * u, poids: 800, lignes: 2 });
  const hSous = paragraphe(mesure, o.sousTitre, 0, 0, colonne, { taille: 4.8 * u, poids: 500, lignes: 3 });
  const hAcc = o.modele === 'accroche' ? paragraphe(mesure, o.accroche, 0, 0, colonne, { taille: 4.4 * u, poids: 650, lignes: 4 }) : 0;
  hTotal += hTitre + 2 * u + hSous + (hAcc ? hAcc + 4 * u : 0) + (o.bandeau ? 12 * u : 0);
  let y = Math.max(m, (H - hTotal) / 2);
  const x = m;

  icone(ctx, img, x, y, tailleIcone);
  y += tailleIcone + 5 * u;
  y += paragraphe(ctx, o.titre, x, y, colonne, { taille: 9.5 * u, poids: 800, lignes: 2 }) + 2 * u;
  y += paragraphe(ctx, o.sousTitre, x, y, colonne, { taille: 4.8 * u, poids: 500, lignes: 3, couleur: 'rgba(255,255,255,0.88)' });
  if (hAcc) y += 4 * u + paragraphe(ctx, o.accroche, x, y + 4 * u, colonne, { taille: 4.4 * u, poids: 650, lignes: 4 });
  if (o.bandeau) {
    y += 5 * u;
    const lp = pastille(ctx, o.bandeau, x, y, 4 * u);
    if (o.qr) dessinerQr(ctx, o.qr, x + lp + 3 * u, y - 4 * u, 16 * u);
  } else if (o.qr) dessinerQr(ctx, o.qr, x, y + 4 * u, 16 * u);
}

// ---------------------------------------------------------------

/** L'image finale, en fichier : prete pour la feuille de partage ou le telechargement. */
export function versFichier(canvas, nom, type = 'image/jpeg') {
  return new Promise((ok, ko) =>
    canvas.toBlob(
      (blob) => (blob ? ok(new File([blob], nom, { type })) : ko(new Error('Image impossible à produire'))),
      type,
      0.92,
    ),
  );
}
