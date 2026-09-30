// Diffusion : l'interface.
//
// Une page par app, un canal par ligne. Ouvrir un canal montre le texte
// (modifiable), le visuel, et les boutons qui publient : copier, ouvrir
// le reseau deja rempli, partager l'image, ecrire l'e-mail. Rien ne part
// sans ton clic.

import { CANAUX, GROUPES, FORMATS, ORDRE_LANCEMENT, canal as trouverCanal, conseils } from './canaux.js';
import { contexte, generer, texteComplet, longueur } from './textes.js';
import { dessiner, versFichier, MODELES, dessinerQr, chargerImage } from './visuels.js';
import { lire, ecrire, modifier, exporter, importer } from './stockage.js';
import { creerZip } from './zip.js';
import { creneaux, appSuivante, rotation, JOURS } from './planning.js';

const $ = (sel, racine = document) => racine.querySelector(sel);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const etat = {
  donnees: null,
  apps: [],
  route: { page: 'accueil' },
  ouvert: null,
  groupe: 'tous',
  statut: 'tous',
  recherche: '',
  filtreApps: 'toutes',
  tri: 'moins',
  apercus: new Map(),
  local: false,
  installation: null,
};

const env = {
  ios: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  mobile: matchMedia('(pointer: coarse)').matches,
  partage: (() => {
    try {
      return !!navigator.canShare?.({ files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] });
    } catch {
      return false;
    }
  })(),
};

// ---------------------------------------------------------------
//  Donnees
// ---------------------------------------------------------------

const reglages = () => lire('reglages', {});
const nbEnLigne = () => etat.apps.filter((a) => a.enLigne).length;
const appDe = (slug) => etat.apps.find((a) => a.slug === slug);

function langueDe(app) {
  return lire('langues', {})[app.slug] ?? (app.langues.fr ? 'fr' : app.languePrincipale);
}

function ctx(app, L) {
  const fiche = lire('fiches', {})[app.slug]?.[L] ?? {};
  const angle = lire('angles', {})[app.slug];
  return contexte(app, L, { ...fiche, angle }, reglages(), { nbApps: nbEnLigne() });
}

const cleTexte = (slug, canalId, L, cle) => `${slug}|${canalId}|${L}|${cle}`;
const cleVariante = (slug, canalId, L) => `${slug}|${canalId}|${L}`;

/** Les champs d'un canal : generes, puis remplaces par tes retouches. */
function champsDe(app, canal, L) {
  const c = ctx(app, L);
  const variante = lire('variantes', {})[cleVariante(app.slug, canal.id, L)] ?? 0;
  const retouches = lire('textes', {});
  return generer(canal, c, variante).map((ch) => {
    const r = retouches[cleTexte(app.slug, canal.id, L, ch.cle)];
    return r != null ? { ...ch, valeur: r, retouche: true } : ch;
  });
}

const langueCanal = (app, canal) => canal.langue ?? langueDe(app);
const suiviDe = (slug) => lire('suivi', {})[slug] ?? {};
const faits = (slug) => Object.keys(suiviDe(slug)).filter((id) => trouverCanal(id)).length;

function capturesDe(app, L) {
  const v = lire('visuels', {})[app.slug] ?? {};
  const l = app.langues[L]?.captures?.iphone?.length ? app.langues[L] : app.langues[app.languePrincipale] ?? Object.values(app.langues)[0];
  const ipad = v.appareil === 'ipad' && l.captures.ipad.length;
  const liste = ipad ? l.captures.ipad : l.captures.iphone.length ? l.captures.iphone : l.captures.ipad;
  const debut = Math.min(v.capture ?? 0, Math.max(liste.length - 1, 0));
  return [...liste.slice(debut), ...liste.slice(0, debut)];
}

function reglagesVisuel(app) {
  return { modele: 'vitrine', couleur: '', qr: false, ...(lire('visuels', {})[app.slug] ?? {}) };
}

function optionsVisuel(app, format, L) {
  const c = ctx(app, L);
  const v = reglagesVisuel(app);
  const bandeau = c.enLigne
    ? L === 'fr' ? `${c.prix} sur l’App Store` : `${c.prix} on the App Store`
    : L === 'fr' ? 'Bientôt sur l’App Store' : 'Coming soon to the App Store';
  return {
    format,
    modele: v.modele,
    icone: app.icone,
    captures: capturesDe(app, L).slice(0, 3),
    titre: c.nom,
    sousTitre: c.sousTitre,
    accroche: c.accroche,
    bandeau,
    couleur: v.couleur,
    qr: v.qr && c.lien ? c.lien : null,
  };
}

/** Le visuel d'un format, dessine une fois, garde pret pour le partage. */
async function visuel(app, format, L) {
  const o = optionsVisuel(app, format, L);
  const cle = JSON.stringify([app.slug, L, o]);
  if (!etat.apercus.has(cle)) {
    etat.apercus.set(
      cle,
      (async () => {
        const canvas = await dessiner(document.createElement('canvas'), o);
        const fichier = await versFichier(canvas, `${app.slug}-${format}.jpg`);
        return { fichier, url: URL.createObjectURL(fichier) };
      })(),
    );
  }
  return etat.apercus.get(cle);
}

// ---------------------------------------------------------------
//  Petits services : copier, telecharger, partager, prevenir
// ---------------------------------------------------------------

function toast(message, type = '') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.setAttribute('role', 'status');
  t.textContent = message;
  $('#toasts').append(t);
  setTimeout(() => t.classList.add('part'), 3200);
  setTimeout(() => t.remove(), 3700);
}

/** Copie sans attendre : le geste reste disponible pour ouvrir ou partager juste apres. */
function copier(texte) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(texte).catch(() => copierAncien(texte));
      return true;
    }
  } catch {
    // On passe a la methode d'avant.
  }
  return copierAncien(texte);
}

function copierAncien(texte) {
  const zone = document.createElement('textarea');
  zone.value = texte;
  zone.setAttribute('readonly', '');
  zone.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
  document.body.append(zone);
  zone.select();
  zone.setSelectionRange(0, texte.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  zone.remove();
  return ok;
}

function telecharger(blob, nom) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function ouvrirAdresse(url) {
  if (!url) return;
  if (/^(mailto|sms):/.test(url)) location.href = url;
  else window.open(url, '_blank', 'noopener');
}

// ---------------------------------------------------------------
//  Rendu
// ---------------------------------------------------------------

function route() {
  const [page, slug, onglet, canalId] = location.hash.replace(/^#\/?/, '').split('/');
  if (page === 'app' && slug) return { page: 'app', slug: decodeURIComponent(slug), onglet: onglet || 'publier', canal: canalId };
  if (page === 'journal' || page === 'reglages' || page === 'automatique') return { page };
  return { page: 'accueil' };
}

function rendre() {
  const r = etat.route;
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('actif', a.dataset.page === r.page || (r.page === 'app' && a.dataset.page === 'accueil')));
  const main = $('#principal');
  if (!etat.donnees) {
    main.innerHTML = `<p class="vide">Chargement…</p>`;
    return;
  }
  if (r.page === 'app') {
    const app = appDe(r.slug);
    main.innerHTML = app ? pageApp(app, r.onglet) : `<p class="vide">Cette app n’est plus dans la liste. <a href="#/">Retour</a></p>`;
    if (app) apresRenduApp(app, r.onglet);
  } else if (r.page === 'journal') main.innerHTML = pageJournal();
  else if (r.page === 'reglages') main.innerHTML = pageReglages();
  else if (r.page === 'automatique') {
    main.innerHTML = pageAutomatique();
    apresRenduAutomatique();
  }
  else main.innerHTML = pageAccueil();
}

// ---------------- Accueil ----------------

function pageAccueil() {
  const total = CANAUX.length;
  let apps = etat.apps.filter((a) => {
    if (etat.filtreApps === 'enligne' && !a.enLigne) return false;
    if (etat.filtreApps === 'bientot' && a.enLigne) return false;
    const q = etat.recherche.trim().toLocaleLowerCase('fr');
    if (!q) return true;
    const l = a.langues[a.languePrincipale] ?? {};
    return `${l.nom} ${l.sousTitre} ${a.slug}`.toLocaleLowerCase('fr').includes(q);
  });
  apps = apps.sort((a, b) => {
    if (etat.tri === 'az') return nomApp(a).localeCompare(nomApp(b), 'fr');
    if (etat.tri === 'recentes') return (b.sortie || '9999').localeCompare(a.sortie || '9999');
    return faits(a.slug) - faits(b.slug) || nomApp(a).localeCompare(nomApp(b), 'fr');
  });
  const publications = etat.apps.reduce((n, a) => n + faits(a.slug), 0);

  return `
    <section class="bandeau-accueil">
      <h1>Mes apps</h1>
      <p>${etat.apps.length} apps · ${nbEnLigne()} en ligne · ${publications} publication${publications > 1 ? 's' : ''} faite${publications > 1 ? 's' : ''}</p>
    </section>
    <div class="outils">
      <input type="search" placeholder="Chercher une app" value="${esc(etat.recherche)}" data-action="rechercher" aria-label="Chercher une app">
      <select data-action="filtre-apps" aria-label="Filtrer">
        <option value="toutes" ${etat.filtreApps === 'toutes' ? 'selected' : ''}>Toutes</option>
        <option value="enligne" ${etat.filtreApps === 'enligne' ? 'selected' : ''}>En ligne</option>
        <option value="bientot" ${etat.filtreApps === 'bientot' ? 'selected' : ''}>Pas encore publiées</option>
      </select>
      <select data-action="tri" aria-label="Trier">
        <option value="moins" ${etat.tri === 'moins' ? 'selected' : ''}>Les moins diffusées d’abord</option>
        <option value="recentes" ${etat.tri === 'recentes' ? 'selected' : ''}>Les plus récentes</option>
        <option value="az" ${etat.tri === 'az' ? 'selected' : ''}>De A à Z</option>
      </select>
    </div>
    <div class="grille-apps">
      ${apps.map((a) => carteApp(a, total)).join('') || '<p class="vide">Aucune app ne correspond.</p>'}
    </div>
    ${piedDonnees()}`;
}

const nomApp = (a) => a.langues[a.languePrincipale]?.nom || a.slug;

function carteApp(a, total) {
  const l = a.langues[a.languePrincipale] ?? {};
  const n = faits(a.slug);
  const c = ctx(a, a.languePrincipale);
  return `
    <a class="carte-app" href="#/app/${encodeURIComponent(a.slug)}">
      <img class="icone-app" src="${esc(a.icone)}" alt="" loading="lazy" width="56" height="56">
      <span class="infos">
        <strong>${esc(l.nom || a.slug)}</strong>
        <span class="sous">${esc(c.sousTitre)}</span>
        <span class="meta">
          <span class="badge ${a.enLigne ? 'ok' : 'attente'}">${a.enLigne ? 'En ligne' : 'Pas encore publiée'}</span>
          <span class="progres" style="--p:${(n / total) * 100}%" aria-label="${n} canaux sur ${total}"><i></i></span>
          <span class="compte">${n}/${total}</span>
        </span>
      </span>
    </a>`;
}

function piedDonnees() {
  const date = new Date(etat.donnees.genere);
  const quand = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(date);
  return `
    <footer class="pied">
      <p>Fiches importées le ${quand}.</p>
      ${etat.local ? `<button class="btn" data-action="importer-apps">Mettre à jour depuis mes projets</button>` : `<p class="discret">Pour les mettre à jour : <code>npm run importer</code> sur le Mac.</p>`}
    </footer>`;
}

// ---------------- Page d'une app ----------------

function pageApp(app, onglet) {
  const L = langueDe(app);
  const c = ctx(app, L);
  const n = faits(app.slug);
  const angle = lire('angles', {})[app.slug] ?? 'presentation';
  const nouveautes = app.langues[L]?.nouveautes || app.langues[app.languePrincipale]?.nouveautes;
  return `
    <a class="retour" href="#/">‹ Mes apps</a>
    <header class="tete-app">
      <img class="icone-app grande" src="${esc(app.icone)}" alt="" width="88" height="88">
      <div class="titres">
        <h1>${esc(c.nom)}</h1>
        <p class="sous">${esc(c.sousTitre)}</p>
        <p class="liens">
          <span class="badge ${app.enLigne ? 'ok' : 'attente'}">${app.enLigne ? 'En ligne' : 'Pas encore publiée'}</span>
          ${app.lien ? `<a href="${esc(app.lien)}" target="_blank" rel="noopener">App Store ↗</a>` : ''}
          ${app.site ? `<a href="${esc(app.site)}" target="_blank" rel="noopener">Site ↗</a>` : ''}
          <span class="discret">${n} canal${n > 1 ? 'aux' : ''} sur ${CANAUX.length}</span>
        </p>
      </div>
    </header>
    <div class="reglettes">
      <div class="segments" role="group" aria-label="Langue des textes">
        ${['fr', 'en'].map((x) => `<button data-action="langue" data-valeur="${x}" aria-pressed="${L === x}">${x.toUpperCase()}</button>`).join('')}
      </div>
      ${nouveautes ? `
      <div class="segments" role="group" aria-label="Sujet">
        <button data-action="angle" data-valeur="presentation" aria-pressed="${angle !== 'nouveautes'}">Présentation</button>
        <button data-action="angle" data-valeur="nouveautes" aria-pressed="${angle === 'nouveautes'}">Nouveautés${app.version ? ` ${esc(app.version)}` : ''}</button>
      </div>` : ''}
    </div>
    ${!c.traduite ? `<p class="alerte">Cette app n’a pas de fiche en ${L === 'en' ? 'anglais' : 'français'} : les textes reprennent l’autre langue. Traduis le sous-titre, l’accroche et les points forts dans l’onglet <a href="#/app/${encodeURIComponent(app.slug)}/fiche">Fiche</a>.</p>` : ''}
    <nav class="onglets" aria-label="Sections">
      ${[['publier', 'Publier'], ['visuels', 'Visuels'], ['fiche', 'Fiche']].map(([id, nom]) => `<a href="#/app/${encodeURIComponent(app.slug)}/${id}" aria-current="${onglet === id ? 'page' : 'false'}">${nom}</a>`).join('')}
    </nav>
    ${onglet === 'visuels' ? ongletVisuels(app, L) : onglet === 'fiche' ? ongletFiche(app, L) : ongletPublier(app, L)}`;
}

// ---------------- Publier ----------------

function ongletPublier(app, L) {
  const suivi = suiviDe(app.slug);
  const prochains = ORDRE_LANCEMENT.filter((id) => !suivi[id]).slice(0, 4).map(trouverCanal);
  const liste = CANAUX.filter((k) => (etat.groupe === 'tous' || k.groupe === etat.groupe) && (etat.statut === 'tous' || (etat.statut === 'faits' ? suivi[k.id] : !suivi[k.id])));

  return `
    ${prochains.length ? `
    <section class="prochains">
      <h2>Par où continuer</h2>
      <div class="puces">${prochains.map((k) => `<button class="puce" data-action="ouvrir-canal" data-canal="${k.id}">${badge(k)} ${esc(nomCanal(k))}</button>`).join('')}</div>
    </section>` : '<p class="bravo">Tous les canaux conseillés sont faits. Bravo !</p>'}
    <div class="filtres">
      <div class="puces defilantes" role="group" aria-label="Familles de canaux">
        <button class="puce" data-action="groupe" data-valeur="tous" aria-pressed="${etat.groupe === 'tous'}">Tous</button>
        ${GROUPES.map((g) => `<button class="puce" data-action="groupe" data-valeur="${g.id}" aria-pressed="${etat.groupe === g.id}">${esc(g.nom)}</button>`).join('')}
      </div>
      <select data-action="statut" aria-label="Afficher">
        <option value="tous" ${etat.statut === 'tous' ? 'selected' : ''}>Tout</option>
        <option value="afaire" ${etat.statut === 'afaire' ? 'selected' : ''}>À faire</option>
        <option value="faits" ${etat.statut === 'faits' ? 'selected' : ''}>Faits</option>
      </select>
    </div>
    ${GROUPES.map((g) => {
      const ks = liste.filter((k) => k.groupe === g.id);
      if (!ks.length) return '';
      return `<section class="groupe"><h2>${esc(g.nom)}</h2><ul class="canaux">${ks.map((k) => ligneCanal(app, k, suivi[k.id])).join('')}</ul></section>`;
    }).join('') || '<p class="vide">Rien à afficher avec ces filtres.</p>'}`;
}

const nomCanal = (k) => (k.precision ? `${k.nom} · ${k.precision}` : k.nom);
const badge = (k) => `<span class="sigle" style="--c:${k.couleur};--e:${k.encre ?? '#fff'}" aria-hidden="true">${esc(k.sigle)}</span>`;
const dateCourte = (iso) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso));

function ligneCanal(app, k, fait) {
  const ouvert = etat.ouvert === k.id;
  return `
    <li class="canal ${ouvert ? 'ouvert' : ''} ${fait ? 'fait' : ''}" id="canal-${k.id}">
      <button class="ligne" data-action="ouvrir-canal" data-canal="${k.id}" aria-expanded="${ouvert}">
        ${badge(k)}
        <span class="nom">${esc(k.nom)}${k.precision ? ` <small>${esc(k.precision)}</small>` : ''}${k.langue === 'en' ? ' <small class="en">EN</small>' : ''}</span>
        <span class="etat">${fait ? `✓ ${dateCourte(fait.date)}` : ''}</span>
        <span class="chevron" aria-hidden="true">›</span>
      </button>
      ${ouvert ? carteCanal(app, k, fait) : ''}
    </li>`;
}

function carteCanal(app, k, fait) {
  const L = langueCanal(app, k);
  const c = ctx(app, L);
  const champs = champsDe(app, k, L);
  const retouche = champs.some((ch) => ch.retouche);
  const destinations = k.destinations?.(c, app) ?? [];
  const f = k.format && FORMATS[k.format];

  const boutons = [];
  if (k.fichier === 'mailto') boutons.push(`<button class="btn primaire" data-action="publier" data-canal="${k.id}">Écrire l’e-mail</button>`);
  else if (k.fichier === 'txt') {
    boutons.push(`<button class="btn primaire" data-action="telecharger-texte" data-canal="${k.id}">Télécharger (.txt)</button>`);
    boutons.push(`<button class="btn" data-action="imprimer-communique" data-canal="${k.id}">Imprimer ou PDF</button>`);
  } else if (k.fichier === 'zip') boutons.push(`<button class="btn primaire" data-action="dossier-presse">Télécharger le dossier (.zip)</button>`);
  else if (k.fichier === 'html') boutons.push(`<button class="btn primaire" data-action="site-web" data-canal="${k.id}">Télécharger la page (index.html)</button>`);
  else if (k.fichier === 'imprimer') boutons.push(`<button class="btn primaire" data-action="imprimer-affiche" data-canal="${k.id}">Imprimer l’affiche</button>`);

  const partageImage = k.partage && env.partage && f;
  if (partageImage) boutons.push(`<button class="btn ${env.mobile ? 'primaire' : ''}" data-action="partager" data-canal="${k.id}">Partager l’image${k.copie ? ' (texte copié)' : ''}</button>`);
  if (k.ouvrir && !k.fichier) {
    const adresse = k.ouvrir(champs, c, envCanal(app));
    if (adresse) boutons.push(`<button class="btn ${partageImage && env.mobile ? '' : 'primaire'}" data-action="publier" data-canal="${k.id}">Ouvrir ${esc(k.nom)}${k.copie ? ' (texte copié)' : ''}</button>`);
  }
  boutons.push(`<button class="btn" data-action="copier-tout" data-canal="${k.id}">Copier le texte</button>`);
  if (f) boutons.push(`<button class="btn" data-action="enregistrer-image" data-canal="${k.id}">Enregistrer l’image</button>`);

  return `
    <div class="carte-canal">
      ${k.langue === 'en' && !app.langues.en ? `<p class="alerte">Ce canal est en anglais et cette app n’a pas de fiche anglaise : traduis les passages en français avant de publier (onglet Fiche, langue EN).</p>` : ''}
      <div class="corps ${f ? 'avec-visuel' : ''}">
        <div class="champs">
          ${champs.map((ch) => champHtml(ch)).join('')}
          <div class="petits">
            <button class="lien-btn" data-action="variante" data-canal="${k.id}">↻ Autre version</button>
            ${retouche ? `<button class="lien-btn" data-action="retablir" data-canal="${k.id}">Rétablir le texte proposé</button>` : ''}
          </div>
        </div>
        ${f ? `
        <figure class="visuel">
          <img id="apercu-${k.id}" alt="Visuel ${esc(f.nom)}" style="aspect-ratio:${f.l}/${f.h}">
          <figcaption>${esc(f.nom)} · ${f.l} × ${f.h} · <a href="#/app/${encodeURIComponent(app.slug)}/visuels">changer</a></figcaption>
        </figure>` : ''}
      </div>
      <div class="actions">${boutons.join('')}</div>
      ${destinations.length ? `
      <div class="destinations">
        <h3>Où publier</h3>
        <ul>${destinations.map((d, i) => `<li><button class="lien-btn" data-action="destination" data-canal="${k.id}" data-index="${i}">${esc(d.nom)} ↗</button>${d.note ? ` <span class="discret">${esc(d.note)}</span>` : ''}</li>`).join('')}</ul>
      </div>` : ''}
      <ul class="conseils">${conseils(k, c).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="suivi-canal">
        <label class="case"><input type="checkbox" data-action="fait" data-canal="${k.id}" ${fait ? 'checked' : ''}> C’est publié${fait ? ` le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(fait.date))}` : ''}</label>
        ${fait ? `<input type="url" placeholder="Lien de la publication (facultatif)" value="${esc(fait.lien ?? '')}" data-action="lien-publication" data-canal="${k.id}">` : ''}
      </div>
    </div>`;
}

function champHtml(ch) {
  const n = longueur(ch.valeur, ch.compte);
  const compteur = ch.limite ? `<span class="compteur ${n > ch.limite ? 'trop' : ''}" data-compteur="${ch.cle}">${n} / ${ch.limite}</span>` : '';
  const lignes = Math.min(18, Math.max(3, ch.valeur.split('\n').length + Math.ceil(ch.valeur.length / 60)));
  return `
    <div class="champ">
      <label for="champ-${ch.cle}"><span>${esc(ch.label)}</span>${compteur}<button class="lien-btn" data-action="copier-champ" data-cle="${ch.cle}">Copier</button></label>
      ${ch.ligne
        ? `<input id="champ-${ch.cle}" data-champ="${ch.cle}" value="${esc(ch.valeur)}" data-limite="${ch.limite ?? ''}" data-compte="${ch.compte ?? ''}">`
        : `<textarea id="champ-${ch.cle}" data-champ="${ch.cle}" rows="${lignes}" data-limite="${ch.limite ?? ''}" data-compte="${ch.compte ?? ''}">${esc(ch.valeur)}</textarea>`}
    </div>`;
}

function envCanal(app) {
  const capture = capturesDe(app, app.languePrincipale)[0];
  return {
    ...env,
    mastodon: reglages().mastodon,
    // Pinterest demande une image deja en ligne : possible seulement quand Diffusion l'est.
    imagePublique: location.protocol === 'https:' && capture ? new URL(capture, location.href).href : null,
  };
}

function apresRenduApp(app, onglet) {
  if (onglet === 'publier' && etat.ouvert) {
    const k = trouverCanal(etat.ouvert);
    if (k?.format) {
      visuel(app, k.format, langueCanal(app, k)).then(({ url }) => {
        const img = $(`#apercu-${k.id}`);
        if (img) img.src = url;
      });
    }
  }
  if (onglet === 'visuels') {
    const L = langueDe(app);
    for (const format of Object.keys(FORMATS)) {
      visuel(app, format, L).then(({ url }) => {
        const img = $(`#visuel-${format}`);
        if (img) img.src = url;
      });
    }
  }
}

// ---------------- Visuels ----------------

function ongletVisuels(app, L) {
  const v = reglagesVisuel(app);
  const l = app.langues[L]?.captures?.iphone?.length ? app.langues[L] : app.langues[app.languePrincipale];
  const ipad = v.appareil === 'ipad' && l.captures.ipad.length;
  const liste = ipad ? l.captures.ipad : l.captures.iphone.length ? l.captures.iphone : l.captures.ipad;
  return `
    <section class="reglages-visuel">
      <div class="rang">
        <span class="etiquette">Modèle</span>
        <div class="segments">${MODELES.map((m) => `<button data-action="visuel" data-cle="modele" data-valeur="${m.id}" aria-pressed="${v.modele === m.id}">${m.nom}</button>`).join('')}</div>
      </div>
      ${l.captures.ipad.length && l.captures.iphone.length ? `
      <div class="rang">
        <span class="etiquette">Appareil</span>
        <div class="segments">
          <button data-action="visuel" data-cle="appareil" data-valeur="iphone" aria-pressed="${!ipad}">iPhone</button>
          <button data-action="visuel" data-cle="appareil" data-valeur="ipad" aria-pressed="${!!ipad}">iPad</button>
        </div>
      </div>` : ''}
      <div class="rang">
        <span class="etiquette">Capture principale</span>
        <div class="vignettes">${liste.map((src, i) => `<button data-action="visuel" data-cle="capture" data-valeur="${i}" aria-pressed="${(v.capture ?? 0) === i}"><img src="${esc(src)}" alt="Capture ${i + 1}" loading="lazy"></button>`).join('') || '<span class="discret">Aucune capture : l’icône les remplace.</span>'}</div>
      </div>
      <div class="rang">
        <span class="etiquette">Couleur</span>
        <input type="color" value="${esc(v.couleur && v.couleur.startsWith('#') ? v.couleur : '#3355aa')}" data-action="couleur" aria-label="Couleur du fond">
        <button class="lien-btn" data-action="visuel" data-cle="couleur" data-valeur="" aria-pressed="${!v.couleur}">Celle de l’icône</button>
      </div>
      <div class="rang">
        <label class="case"><input type="checkbox" data-action="qr" ${v.qr ? 'checked' : ''}> QR code vers l’App Store</label>
      </div>
    </section>
    <div class="grille-visuels">
      ${Object.entries(FORMATS).map(([id, f]) => `
        <figure class="carte-visuel">
          <img id="visuel-${id}" alt="Visuel ${esc(f.nom)}" style="aspect-ratio:${f.l}/${f.h}">
          <figcaption>
            <strong>${esc(f.nom)}</strong> <span class="discret">${f.l} × ${f.h}</span><br>
            <span class="discret">${esc(f.usage)}</span>
          </figcaption>
          <div class="actions">
            <button class="btn" data-action="enregistrer-format" data-format="${id}">Enregistrer</button>
            ${env.partage ? `<button class="btn" data-action="partager-format" data-format="${id}">Partager</button>` : ''}
          </div>
        </figure>`).join('')}
    </div>`;
}

// ---------------- Fiche ----------------

const CHAMPS_FICHE = [
  ['nom', 'Nom', 'ligne'],
  ['sousTitre', 'Sous-titre, ou phrase qui dit ce qu’elle fait', 'ligne'],
  ['accroche', 'Accroche (deux phrases au plus)', 'texte'],
  ['pointsForts', 'Points forts (un par ligne)', 'texte'],
  ['public', 'Public visé (« pour … »)', 'ligne'],
  ['hashtags', 'Hashtags (séparés par des espaces)', 'ligne'],
  ['lien', 'Lien à partager', 'ligne'],
];

function ongletFiche(app, L) {
  const fiche = lire('fiches', {})[app.slug]?.[L] ?? {};
  const auto = contexte(app, L, {}, reglages(), { nbApps: nbEnLigne() });
  const valeurAuto = {
    nom: auto.nom, sousTitre: auto.sousTitre, accroche: auto.accroche, pointsForts: auto.pointsForts.join('\n'),
    public: auto.public, hashtags: auto.hashtags.join(' '), lien: auto.lien,
  };
  const l = app.langues[L] ?? {};
  return `
    <p class="intro">Ce que les textes et les visuels reprennent, en <strong>${L === 'fr' ? 'français' : 'anglais'}</strong>. Laisse un champ vide pour garder la proposition automatique (en gris).</p>
    <form class="fiche" onsubmit="return false">
      ${CHAMPS_FICHE.map(([cle, label, type]) => `
        <label class="champ">
          <span>${esc(label)}</span>
          ${type === 'ligne'
            ? `<input data-fiche="${cle}" value="${esc(fiche[cle] ?? '')}" placeholder="${esc(valeurAuto[cle])}">`
            : `<textarea data-fiche="${cle}" rows="${cle === 'pointsForts' ? 6 : 3}" placeholder="${esc(valeurAuto[cle])}">${esc(fiche[cle] ?? '')}</textarea>`}
        </label>`).join('')}
      <button class="btn" data-action="fiche-retablir">Tout rétablir</button>
    </form>
    <section class="infos-app">
      <h2>Fiche importée</h2>
      <dl>
        <dt>Catégorie</dt><dd>${esc(app.genre?.fr || '—')}</dd>
        <dt>Appareils</dt><dd>${esc(app.appareils.map((x) => (x === 'ipad' ? 'iPad' : 'iPhone')).join(', '))}</dd>
        <dt>Prix</dt><dd>${esc(auto.prix)}${app.achats ? ', achats intégrés' : ''}</dd>
        ${app.version ? `<dt>Version</dt><dd>${esc(app.version)}</dd>` : ''}
        ${app.sortie ? `<dt>Sortie</dt><dd>${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(app.sortie))}</dd>` : ''}
        ${app.note ? `<dt>Note</dt><dd>${String(app.note.moyenne).replace('.', ',')} ★ (${app.note.avis} avis)</dd>` : ''}
        <dt>Bundle</dt><dd><code>${esc(app.bundleId)}</code></dd>
      </dl>
      ${l.description ? `<details><summary>Description de l’App Store</summary><pre>${esc(l.description)}</pre></details>` : ''}
      ${l.nouveautes ? `<details><summary>Nouveautés de la version ${esc(app.version)}</summary><pre>${esc(l.nouveautes)}</pre></details>` : ''}
    </section>`;
}

// ---------------- Journal ----------------

function pageJournal() {
  const suivi = lire('suivi', {});
  const entrees = [];
  for (const [slug, canaux] of Object.entries(suivi)) {
    const app = appDe(slug);
    if (!app) continue;
    for (const [id, f] of Object.entries(canaux)) {
      const k = trouverCanal(id);
      if (k) entrees.push({ app, k, ...f });
    }
  }
  entrees.sort((a, b) => b.date.localeCompare(a.date));
  const parJour = new Map();
  for (const e of entrees) {
    const jour = e.date.slice(0, 10);
    if (!parJour.has(jour)) parJour.set(jour, []);
    parJour.get(jour).push(e);
  }
  return `
    <section class="bandeau-accueil"><h1>Journal</h1><p>${entrees.length} publication${entrees.length > 1 ? 's' : ''}, de la plus récente à la plus ancienne.</p></section>
    ${[...parJour].map(([jour, es]) => `
      <section class="jour">
        <h2>${new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(jour))}</h2>
        <ul class="journal">${es.map((e) => `
          <li>
            <img class="icone-app petite" src="${esc(e.app.icone)}" alt="" width="32" height="32">
            <a href="#/app/${encodeURIComponent(e.app.slug)}">${esc(nomApp(e.app))}</a>
            ${badge(e.k)} <span>${esc(nomCanal(e.k))}</span>
            ${e.lien ? `<a class="discret" href="${esc(e.lien)}" target="_blank" rel="noopener">voir ↗</a>` : ''}
          </li>`).join('')}
        </ul>
      </section>`).join('') || '<p class="vide">Rien encore. Coche « C’est publié » sous un canal pour le retrouver ici.</p>'}`;
}

// ---------------- Reglages ----------------

const CHAMPS_REGLAGES = [
  ['nom', 'Ton nom (signature, communiqués)', 'text', 'Robert Oulhen'],
  ['email', 'E-mail de contact pour la presse', 'email', ''],
  ['telephone', 'Téléphone (facultatif, communiqués)', 'tel', ''],
  ['ville', 'Ta ville (presse locale, communiqués)', 'text', ''],
  ['site', 'Ton site (facultatif)', 'url', ''],
  ['bio', 'Présentation (« À propos » des communiqués)', 'textarea', ''],
  ['hashtags', 'Hashtags ajoutés partout', 'text', '#IndieDev'],
  ['mastodon', 'Ton serveur Mastodon (ex. mastodon.social)', 'text', ''],
];

function pageReglages() {
  const r = reglages();
  const defauts = { nom: etat.apps.find((a) => a.developpeur)?.developpeur ?? '' };
  return `
    <section class="bandeau-accueil"><h1>Réglages</h1><p>Enregistrés sur cet appareil seulement.</p></section>
    <form class="fiche" onsubmit="return false">
      ${CHAMPS_REGLAGES.map(([cle, label, type, exemple]) => `
        <label class="champ">
          <span>${esc(label)}</span>
          ${type === 'textarea'
            ? `<textarea data-reglage="${cle}" rows="3" placeholder="Laisse vide pour la présentation automatique">${esc(r[cle] ?? '')}</textarea>`
            : `<input type="${type}" data-reglage="${cle}" value="${esc(r[cle] ?? '')}" placeholder="${esc(defauts[cle] ?? exemple)}">`}
        </label>`).join('')}
    </form>
    <section class="bloc">
      <h2>Sauvegarde</h2>
      <p>Le suivi, tes textes retouchés et tes réglages restent dans ce navigateur. Pour les retrouver sur un autre appareil, sauvegarde ici puis restaure là-bas.</p>
      <div class="actions">
        <button class="btn" data-action="sauvegarder">Sauvegarder (.json)</button>
        <label class="btn">Restaurer…<input type="file" accept="application/json,.json" data-action="restaurer" hidden></label>
      </div>
    </section>
    <section class="bloc">
      <h2>Installer Diffusion</h2>
      ${etat.installation ? `<button class="btn primaire" data-action="installer">Installer l’app</button>` : `
      <p>Sur iPhone et iPad : dans Safari, bouton Partager ▸ « Sur l’écran d’accueil ».<br>
      Sur Mac : Safari ▸ Fichier ▸ « Ajouter au Dock ». Chrome ou Edge : l’icône d’installation dans la barre d’adresse.<br>
      Sur Android : menu ⋮ ▸ « Installer l’application ».</p>`}
      ${!window.isSecureContext ? `<p class="alerte">Cette adresse n’est pas sécurisée (http) : le partage d’images et l’installation ne marchent qu’en https, ou sur ce Mac.</p>` : ''}
    </section>
    ${piedDonnees()}`;
}

// ---------------- Automatique ----------------

etat.auto = { charge: false, plan: null, journal: [], etat: {}, depot: {}, modifie: false, envoi: false, erreur: '' };

async function chargerAutomatique() {
  try {
    const r = await fetch('api/automatique', { cache: 'no-store' });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erreur || 'Seulement depuis le Mac.');
    Object.assign(etat.auto, await r.json(), { charge: true, modifie: false, erreur: '' });
  } catch (e) {
    Object.assign(etat.auto, { charge: true, erreur: e.message });
  }
  if (etat.route.page === 'automatique') rendre();
}

const heureFr = (d) => {
  const t = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(d);
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Les prochaines publications, en simulant la rotation. */
function prochaines(plan, journal, n = 5) {
  const simule = [...journal];
  return creneaux(plan, new Date(), n).map((t) => {
    const deja = journal.find((e) => e.creneau === t.toISOString() && e.statut === 'programme');
    if (deja) return { t, app: appDe(deja.slug), programme: true };
    const choix = appSuivante(plan, simule);
    if (!choix) return { t, app: null };
    simule.push({ slug: choix.slug, statut: 'programme', creneau: t.toISOString() });
    return { t, app: appDe(choix.slug), choix };
  });
}

function pageAutomatique() {
  const a = etat.auto;
  const titre = `<section class="bandeau-accueil"><h1>Publication automatique</h1><p>Diffusion publie seul sur Instagram les apps que tu choisis, aux jours et à l’heure choisis, depuis GitHub : ton Mac peut rester éteint.</p></section>`;
  if (!a.charge) return `${titre}<p class="vide">Chargement…</p>`;
  if (a.erreur) return `${titre}<p class="alerte">${esc(a.erreur)} Le planning se règle depuis l’app Diffusion du Mac.</p>`;

  const plan = a.plan;
  const choisies = new Set(plan.apps.map((x) => x.slug));
  const enLigne = etat.apps.filter((x) => x.enLigne);
  const ig = a.etat.buffer;
  const suite = prochaines(plan, a.journal);
  const prochaineLibre = suite.find((x) => !x.programme);
  const journal = [...a.journal].reverse().slice(0, 30);

  return `
    ${titre}
    <section class="bloc-auto statut">
      <label class="case interrupteur"><input type="checkbox" data-action="auto-actif" ${plan.actif ? 'checked' : ''}> ${plan.actif ? 'Activée' : 'En pause'}</label>
      <p>${ig ? `Instagram, par Buffer : <strong>${esc(ig.canal)}</strong> <span class="discret">(vérifié le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(ig.verifie))})</span>` : 'Instagram : <strong>pas encore relié</strong>. Voir « Relier Instagram » plus bas.'}</p>
      ${a.etat.derniereErreur ? `<p class="alerte">Dernier problème (${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(a.etat.derniereErreur.date))}) : ${esc(a.etat.derniereErreur.message)}</p>` : ''}
    </section>

    <section class="bloc-auto">
      <h2>Les apps à mettre en avant</h2>
      <p class="discret">Coche les apps ; elles passent à tour de rôle, dans cet ordre. Leurs textes et visuels suivent ce que tu as réglé dans leurs onglets Fiche et Visuels.</p>
      ${plan.apps.length ? `<ol class="ordre">${plan.apps.map((x, i) => {
        const app = appDe(x.slug);
        return app ? `<li><img class="icone-app petite" src="${esc(app.icone)}" alt="" width="32" height="32"><span>${esc(nomApp(app))}</span>
          <button class="lien-btn" data-action="auto-monter" data-index="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Monter">↑</button>
          <button class="lien-btn" data-action="auto-descendre" data-index="${i}" ${i === plan.apps.length - 1 ? 'disabled' : ''} aria-label="Descendre">↓</button>
          <button class="lien-btn" data-action="auto-retirer" data-slug="${esc(x.slug)}">Retirer</button></li>` : '';
      }).join('')}</ol>` : '<p class="alerte">Aucune app choisie pour l’instant.</p>'}
      <details ${plan.apps.length ? '' : 'open'}>
        <summary>Choisir parmi mes ${enLigne.length} apps en ligne</summary>
        <div class="choix-apps">${enLigne.map((app) => `
          <label class="case"><input type="checkbox" data-action="auto-app" data-slug="${esc(app.slug)}" ${choisies.has(app.slug) ? 'checked' : ''}>
          <img class="icone-app petite" src="${esc(app.icone)}" alt="" width="32" height="32"> ${esc(nomApp(app))}</label>`).join('')}
        </div>
      </details>
    </section>

    <section class="bloc-auto">
      <h2>Quand</h2>
      <div class="jours" role="group" aria-label="Jours de publication">
        ${[1, 2, 3, 4, 5, 6, 0].map((j) => `<button class="puce" data-action="auto-jour" data-jour="${j}" aria-pressed="${plan.jours.includes(j)}">${JOURS[j].slice(0, 3)}.</button>`).join('')}
      </div>
      <label class="rang">à <input type="time" step="900" value="${esc(plan.heure)}" data-action="auto-heure" style="width:auto"> <span class="discret">heure de Paris ; GitHub part parfois avec quelques minutes de retard.</span></label>
      <div class="rang">
        <span class="etiquette">Langue</span>
        <div class="segments">${['fr', 'en'].map((x) => `<button data-action="auto-langue" data-valeur="${x}" aria-pressed="${plan.langue === x}">${x.toUpperCase()}</button>`).join('')}</div>
      </div>
    </section>

    <div class="actions envoi">
      <button class="btn primaire" data-action="auto-envoyer" ${a.envoi ? 'disabled' : ''}>${a.envoi ? 'Envoi…' : a.modifie ? 'Enregistrer et envoyer sur GitHub' : 'Renvoyer sur GitHub'}</button>
      ${a.modifie ? '<span class="alerte">Modifications pas encore envoyées.</span>' : ''}
      ${a.depot?.url ? `<a class="discret" href="${esc(a.depot.url)}/actions" target="_blank" rel="noopener">Voir le robot sur GitHub ↗</a>` : ''}
    </div>
    ${a.depot?.ok && plan.apps.length ? `
    <div class="actions">
      <button class="btn" data-action="auto-essai" ${a.essai ? 'disabled' : ''}>${a.essai ? 'Demande envoyée…' : `Essai : publier « ${esc(nomApp(appDe(appSuivante(plan, a.journal)?.slug) ?? etat.apps[0]))} » dans 5 minutes`}</button>
      <span class="discret">Publie vraiment sur Instagram, par Buffer : pour vérifier que tout est bien relié.</span>
    </div>` : ''}

    <section class="bloc-auto">
      <h2>Prochaines publications</h2>
      ${plan.actif && suite.length ? `<ul class="prochaines">${suite.map((x) => `<li><span>${esc(heureFr(x.t))}</span> ${x.app ? `<img class="icone-app petite" src="${esc(x.app.icone)}" alt="" width="24" height="24"> ${esc(nomApp(x.app))}` : '—'}${x.programme ? ' <span class="badge ok">confiée à Buffer</span>' : ''}</li>`).join('')}</ul>` : `<p class="discret">${plan.actif ? 'Choisis au moins un jour.' : 'La publication est en pause.'}</p>`}
      <p class="discret">Chaque publication est confiée à Buffer la veille : tu la vois, et tu peux la modifier ou l’annuler, dans l’app Buffer.</p>
      ${prochaineLibre?.app ? `
      <div class="corps avec-visuel apercu-auto">
        <div><h3>Aperçu de la prochaine</h3><pre class="legende">${esc(legendeAuto(prochaineLibre.app, prochaineLibre.choix))}</pre></div>
        <figure class="visuel"><img id="apercu-auto" alt="Prochain visuel" style="aspect-ratio:1080/1350"></figure>
      </div>` : ''}
    </section>

    <section class="bloc-auto">
      <h2>Déjà publié</h2>
      ${journal.length ? `<ul class="journal">${journal.map((e) => {
        const app = appDe(e.slug);
        return `<li>${app ? `<img class="icone-app petite" src="${esc(app.icone)}" alt="" width="32" height="32">` : ''}
          <span>${esc(app ? nomApp(app) : e.slug || '—')}</span>
          <span class="discret">${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(e.publieLe ?? e.creneau ?? e.date))}</span>
          ${e.statut === 'publie'
            ? `<span class="badge ok">publié</span>${e.lien ? ` <a href="${esc(e.lien)}" target="_blank" rel="noopener">voir ↗</a>` : ''}`
            : e.statut === 'programme'
              ? `<span class="badge ok">programmé</span> <span class="discret">pour le ${esc(heureFr(new Date(e.creneau)))}</span>`
              : `<span class="badge attente" title="${esc(e.erreur ?? '')}">raté</span> <span class="discret">${esc(e.erreur ?? '')}</span>`}
        </li>`;
      }).join('')}</ul>` : '<p class="discret">Rien encore.</p>'}
    </section>

    <section class="bloc-auto" id="relier">
      <h2>Relier Instagram</h2>
      ${guideInstagram()}
    </section>`;
}

/** La legende de la prochaine publication, telle que le robot l'ecrira. */
function legendeAuto(app, choix) {
  const L = etat.auto.plan.langue ?? 'fr';
  const c = contexte(app, L, choix?.fiche ?? lire('fiches', {})[app.slug]?.[L] ?? {}, { hashtags: reglages().hashtags }, { nbApps: nbEnLigne() });
  return generer(trouverCanal('instagram-post'), c, rotation(etat.auto.journal, app.slug).variante)[0].valeur;
}

function apresRenduAutomatique() {
  const a = etat.auto;
  if (!a.charge) {
    chargerAutomatique();
    return;
  }
  const x = a.plan && prochaines(a.plan, a.journal, 5).find((y) => !y.programme);
  if (!x?.app) return;
  const L = a.plan.langue ?? 'fr';
  const o = { ...optionsVisuel(x.app, 'instagram', L), modele: rotation(a.journal, x.app.slug).modele, qr: null };
  const cle = JSON.stringify(['auto', o]);
  if (!etat.apercus.has(cle)) {
    etat.apercus.set(cle, dessiner(document.createElement('canvas'), o).then(async (c) => ({ url: URL.createObjectURL(await versFichier(c, 'apercu.jpg')) })));
  }
  etat.apercus.get(cle).then(({ url }) => {
    const img = $('#apercu-auto');
    if (img) img.src = url;
  });
}

function modifierPlan(fn) {
  fn(etat.auto.plan);
  etat.auto.modifie = true;
  rendre();
}

async function envoyerPlan() {
  const a = etat.auto;
  const L = a.plan.langue ?? 'fr';
  // Les retouches faites dans l'app (fiche, visuel) partent avec le plan : le robot n'a pas ce navigateur.
  const plan = {
    ...a.plan,
    apps: a.plan.apps.map(({ slug }) => ({ slug, fiche: lire('fiches', {})[slug]?.[L] ?? {}, visuel: lire('visuels', {})[slug] ?? {} })),
    signature: { hashtags: reglages().hashtags ?? '' },
  };
  a.envoi = true;
  rendre();
  try {
    const r = await fetch('api/automatique', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plan) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.erreur || 'échec');
    a.modifie = false;
    toast(j.message || 'Planning envoyé sur GitHub.');
  } catch (e) {
    toast(`Envoi impossible : ${e.message}`, 'erreur');
  }
  a.envoi = false;
  rendre();
}

function guideInstagram() {
  const depot = etat.auto.depot?.url || 'https://github.com/boboul-cloud/diffusion';
  return `
    <p>Diffusion passe par <strong>Buffer</strong>, qui publie sur Instagram à l’heure prévue : ni compte Facebook, ni démarche chez Meta. À faire une seule fois :</p>
    <ol class="guide">
      <li><strong>Instagram en compte professionnel</strong> (gratuit, réversible) : dans l’app Instagram, ton profil ▸ menu ☰ ▸ « Type de compte et outils » ▸ « Passer à un compte professionnel » ▸ <em>Créateur</em>. Sans cela, Buffer n’envoie qu’un rappel au lieu de publier.</li>
      <li><strong>Un compte Buffer gratuit</strong> sur <a href="https://buffer.com" target="_blank" rel="noopener">buffer.com</a>, puis valide l’e-mail que Buffer t’envoie (obligatoire pour la suite).</li>
      <li><strong>Relier Instagram à Buffer, sur ce Mac</strong> : connecte-toi d’abord sur <a href="https://www.instagram.com" target="_blank" rel="noopener">instagram.com</a>, puis dans Buffer ▸ <em>Channels</em> ▸ <em>Connect Channel</em> ▸ <em>Instagram</em> ▸ <em>Connect to Instagram</em>, tes identifiants Instagram, et <em>Allow</em>.</li>
      <li>Dans les réglages du canal Instagram de Buffer, si l’option <em>Enable Notifications by default</em> est cochée, décoche-la.</li>
      <li><strong>La clé Buffer</strong> : <a href="https://publish.buffer.com/settings/api" target="_blank" rel="noopener">publish.buffer.com/settings/api</a> ▸ créer une clé, durée <em>1 an</em>, avec les droits de lecture du compte et de lecture/écriture des posts. Copie-la : elle ne s’affiche qu’une fois.</li>
      <li><strong>La confier à GitHub</strong> : <a href="${esc(depot)}/settings/secrets/actions/new" target="_blank" rel="noopener">ouvre cette page</a>, nom <code>BUFFER_API_KEY</code>, colle la clé, <em>Add secret</em>. Elle y reste secrète : ni Diffusion ni personne ne peut la relire.</li>
      <li>Ici : coche tes apps, règle les jours, <em>Enregistrer et envoyer sur GitHub</em>, puis le bouton <em>Essai</em>. Cinq minutes après, la publication est sur ton Instagram.</li>
    </ol>
    <p class="discret">Chaque année, Buffer t’écrit avant que la clé expire : refais les étapes 5 et 6.</p>`;
}

// ---------------------------------------------------------------
//  Actions
// ---------------------------------------------------------------

/** Les champs tels qu'ils sont a l'ecran, retouches comprises. */
function champsActuels(app, k) {
  return champsDe(app, k, langueCanal(app, k));
}

async function publier(app, k) {
  const L = langueCanal(app, k);
  const champs = champsActuels(app, k);
  const c = ctx(app, L);
  if (k.copie) copier(texteComplet(champs.filter((ch) => ch.cle !== 'lien' || champs.length === 1)));
  const adresse = k.ouvrir?.(champs, c, envCanal(app));
  if (adresse) ouvrirAdresse(adresse);
  if (k.copie) toast('Texte copié : colle-le dans la fenêtre qui s’ouvre.');
}

async function partagerFichier(fichier, texteACopier) {
  if (texteACopier) copier(texteACopier);
  try {
    await navigator.share({ files: [fichier] });
    if (texteACopier) toast('Texte copié : colle-le en légende.');
  } catch (e) {
    if (e?.name !== 'AbortError') toast('Le partage n’a pas abouti. Enregistre l’image, puis ajoute-la dans l’app.', 'erreur');
  }
}

function texteDeCanal(app, k) {
  const champs = champsActuels(app, k);
  const principal = champs.find((ch) => ['texte', 'corps', 'description'].includes(ch.cle));
  return principal ? principal.valeur : texteComplet(champs);
}

// ---------------- Fichiers ----------------

async function dossierPresse(app) {
  toast('Préparation du dossier…');
  const fichiers = [];
  const communique = trouverCanal('communique');
  for (const L of ['fr', 'en']) {
    const texte = champsDe(app, communique, L).find((ch) => ch.cle === 'texte').valeur;
    fichiers.push({ nom: L === 'fr' ? 'communique-fr.txt' : 'press-release-en.txt', donnees: texte });
  }
  const c = ctx(app, 'fr');
  fichiers.push({
    nom: 'fiche.txt',
    donnees: [
      `${c.nom} — ${c.sousTitre}`,
      '',
      `App Store : ${app.lien || 'bientôt'}`,
      app.site ? `Site : ${app.site}` : '',
      `Prix : ${c.prix}${app.achats ? ', achats intégrés facultatifs' : ''}`,
      `Appareils : ${c.appareils}${c.iosMin ? `, iOS ${c.iosMin} ou ultérieur` : ''}`,
      `Catégorie : ${app.genre?.fr ?? ''}`,
      app.version ? `Version : ${app.version}` : '',
      '',
      'Contact',
      c.auteur,
      c.email,
      c.telephone,
    ].filter((x) => x !== undefined).join('\n'),
  });
  const telecharge = async (src, nom) => {
    const r = await fetch(src);
    if (r.ok) fichiers.push({ nom, donnees: await r.blob() });
  };
  if (app.icone) await telecharge(app.icone, 'icone.png');
  const l = app.langues[app.languePrincipale];
  await Promise.all([
    ...l.captures.iphone.map((src, i) => telecharge(src, `captures/iphone-${i + 1}.jpg`)),
    ...l.captures.ipad.map((src, i) => telecharge(src, `captures/ipad-${i + 1}.jpg`)),
  ]);
  for (const format of ['carre', 'portrait', 'story', 'paysage']) {
    const { fichier } = await visuel(app, format, 'fr');
    fichiers.push({ nom: `visuels/${app.slug}-${format}.jpg`, donnees: fichier });
  }
  telecharger(await creerZip(fichiers), `${app.slug}-dossier-de-presse.zip`);
}

/** Une petite image en data: pour la page web autonome. */
async function imageReduite(src, largeur, type = 'image/jpeg') {
  const img = await chargerImage(src);
  if (!img) return '';
  const c = document.createElement('canvas');
  c.width = Math.min(largeur, img.naturalWidth);
  c.height = Math.round((img.naturalHeight / img.naturalWidth) * c.width);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL(type, 0.85);
}

async function pageWeb(app, k) {
  const L = langueCanal(app, k);
  const c = ctx(app, L);
  const champs = champsActuels(app, k);
  const v = (cle) => champs.find((ch) => ch.cle === cle)?.valeur ?? '';
  const icone = await imageReduite(app.icone, 256, 'image/png');
  const captures = await Promise.all(capturesDe(app, L).slice(0, 4).map((s) => imageReduite(s, 600)));
  const fr = L === 'fr';
  const html = `<!doctype html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(v('titre'))}</title>
<meta name="description" content="${esc(v('accroche'))}">
<meta property="og:title" content="${esc(v('titre'))}">
<meta property="og:description" content="${esc(v('accroche'))}">
${app.lien ? `<meta name="apple-itunes-app" content="app-id=${esc(app.lienInternational.split('id').pop())}">` : ''}
<link rel="icon" href="${icone}">
<style>
  :root { color-scheme: light dark; --fond:#f5f5f7; --texte:#1d1d1f; --doux:#6e6e73; --carte:#fff; }
  @media (prefers-color-scheme: dark) { :root { --fond:#000; --texte:#f5f5f7; --doux:#a1a1a6; --carte:#1c1c1e; } }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background:var(--fond); color:var(--texte); line-height:1.5; }
  main { max-width: 960px; margin: 0 auto; padding: 48px 20px 64px; }
  header { text-align:center; }
  header img { width:120px; height:120px; border-radius:27px; box-shadow:0 8px 30px rgba(0,0,0,.18); }
  h1 { font-size: clamp(32px, 6vw, 52px); margin: 20px 0 6px; letter-spacing:-.02em; }
  .sous { font-size: 20px; color: var(--doux); margin:0 0 20px; }
  .accroche { font-size: 18px; max-width: 640px; margin: 0 auto 28px; }
  .bouton { display:inline-block; background:#0071e3; color:#fff; text-decoration:none; padding:14px 26px; border-radius:999px; font-weight:600; font-size:17px; }
  .captures { display:flex; gap:16px; overflow-x:auto; padding: 40px 4px 24px; scroll-snap-type:x mandatory; }
  .captures img { height: 520px; max-height: 70vh; border-radius: 22px; scroll-snap-align:center; box-shadow:0 10px 30px rgba(0,0,0,.15); }
  ul.points { list-style:none; padding:0; display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:12px; }
  ul.points li { background:var(--carte); padding:16px 18px; border-radius:14px; }
  footer { text-align:center; color:var(--doux); font-size:14px; margin-top:48px; }
  footer a { color:inherit; }
</style>
</head>
<body>
<main>
  <header>
    <img src="${icone}" alt="">
    <h1>${esc(c.nom)}</h1>
    <p class="sous">${esc(c.sousTitre)}</p>
    <p class="accroche">${esc(v('accroche'))}</p>
    ${app.lien ? `<a class="bouton" href="${esc(fr ? app.lien : app.lienInternational)}">${fr ? 'Télécharger sur l’App Store' : 'Download on the App Store'}</a>` : `<p><strong>${fr ? 'Bientôt sur l’App Store' : 'Coming soon to the App Store'}</strong></p>`}
  </header>
  <div class="captures">${captures.filter(Boolean).map((s, i) => `<img src="${s}" alt="${fr ? 'Capture d’écran' : 'Screenshot'} ${i + 1}">`).join('')}</div>
  <ul class="points">${v('points').split('\n').filter(Boolean).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
  <footer>
    <p>© ${new Date().getFullYear()} ${esc(c.auteur)}${app.assistance ? ` · <a href="${esc(app.assistance)}">${fr ? 'Assistance' : 'Support'}</a>` : ''}${app.confidentialite ? ` · <a href="${esc(app.confidentialite)}">${fr ? 'Confidentialité' : 'Privacy'}</a>` : ''}</p>
  </footer>
</main>
</body>
</html>
`;
  telecharger(new Blob([html], { type: 'text/html' }), 'index.html');
}

function imprimer(html) {
  const zone = $('#impression');
  zone.innerHTML = html;
  document.body.classList.add('impression');
  const fin = () => {
    document.body.classList.remove('impression');
    zone.innerHTML = '';
    window.removeEventListener('afterprint', fin);
  };
  window.addEventListener('afterprint', fin);
  // Laisse les images se charger avant d'ouvrir la fenetre d'impression.
  setTimeout(() => window.print(), 300);
}

async function imprimerAffiche(app, k) {
  const L = langueCanal(app, k);
  const c = ctx(app, L);
  const champs = champsActuels(app, k);
  const v = (cle) => champs.find((ch) => ch.cle === cle)?.valeur ?? '';
  let qr = '';
  if (c.lien) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 600;
    if (dessinerQr(canvas.getContext('2d'), c.lien, 0, 0, 600)) qr = canvas.toDataURL('image/png');
  }
  const captures = capturesDe(app, L).slice(0, 2);
  imprimer(`
    <article class="affiche">
      <img class="affiche-icone" src="${esc(app.icone)}" alt="">
      <h1>${esc(v('titre'))}</h1>
      <p class="affiche-sous">${esc(v('sousTitre'))}</p>
      <div class="affiche-captures">${captures.map((s) => `<img src="${esc(s)}" alt="">`).join('')}</div>
      <ul>${v('points').split('\n').filter(Boolean).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      <div class="affiche-bas">
        ${qr ? `<img class="affiche-qr" src="${qr}" alt="QR code">` : ''}
        <div><p class="affiche-appel">${esc(v('appel'))}</p><p class="affiche-lien">${esc(c.lien || c.site)}</p></div>
      </div>
    </article>`);
}

function imprimerCommunique(app, k) {
  const champs = champsActuels(app, k);
  const texte = champs.find((ch) => ch.cle === 'texte').valeur;
  imprimer(`<article class="communique"><img class="communique-icone" src="${esc(app.icone)}" alt=""><pre>${esc(texte)}</pre></article>`);
}

// ---------------- Mises a jour depuis le Mac ----------------

async function importerApps() {
  const bouton = $('[data-action="importer-apps"]');
  if (bouton) {
    bouton.disabled = true;
    bouton.textContent = 'Import en cours… (environ 30 s)';
  }
  try {
    const r = await fetch('api/importer', { method: 'POST' });
    const j = await r.json();
    if (!r.ok) throw new Error(j.erreur || 'échec');
    await chargerDonnees();
    etat.apercus.clear();
    toast(j.resume || 'Apps mises à jour.');
  } catch (e) {
    toast(`Import impossible : ${e.message}`, 'erreur');
  }
  rendre();
}

// ---------------------------------------------------------------
//  Evenements
// ---------------------------------------------------------------

document.addEventListener('click', async (e) => {
  const cible = e.target.closest('[data-action]');
  if (!cible || cible.matches('input, select, textarea')) return;
  const action = cible.dataset.action;
  const app = etat.route.page === 'app' ? appDe(etat.route.slug) : null;
  const k = cible.dataset.canal ? trouverCanal(cible.dataset.canal) : null;

  switch (action) {
    case 'ouvrir-canal': {
      if (!cible.classList.contains('ligne')) {
        // Depuis « Par où continuer » : le canal doit etre visible, quels que soient les filtres.
        etat.groupe = 'tous';
        etat.statut = 'tous';
      }
      etat.ouvert = etat.ouvert === k.id && cible.classList.contains('ligne') ? null : k.id;
      // L'adresse garde le canal ouvert (favori, retour), sans recharger la page.
      history.replaceState(null, '', `#/app/${encodeURIComponent(app.slug)}/publier${etat.ouvert ? `/${etat.ouvert}` : ''}`);
      etat.route = route();
      rendre();
      if (etat.ouvert) $(`#canal-${k.id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      break;
    }
    case 'groupe':
      etat.groupe = cible.dataset.valeur;
      rendre();
      break;
    case 'langue':
      modifier('langues', (l) => void (l[app.slug] = cible.dataset.valeur));
      rendre();
      break;
    case 'angle':
      modifier('angles', (a) => void (a[app.slug] = cible.dataset.valeur));
      rendre();
      break;
    case 'publier':
      await publier(app, k);
      break;
    case 'partager': {
      const { fichier } = await visuel(app, k.format, langueCanal(app, k));
      await partagerFichier(fichier, k.copie ? texteDeCanal(app, k) : '');
      break;
    }
    case 'copier-tout': {
      const champs = champsActuels(app, k);
      copier(texteComplet(champs));
      toast('Texte copié.');
      break;
    }
    case 'copier-champ': {
      const zone = cible.closest('.champ').querySelector('[data-champ]');
      copier(zone.value);
      toast('Copié.');
      break;
    }
    case 'enregistrer-image': {
      const { fichier } = await visuel(app, k.format, langueCanal(app, k));
      telecharger(fichier, fichier.name);
      break;
    }
    case 'enregistrer-format': {
      const { fichier } = await visuel(app, cible.dataset.format, langueDe(app));
      telecharger(fichier, fichier.name);
      break;
    }
    case 'partager-format': {
      const { fichier } = await visuel(app, cible.dataset.format, langueDe(app));
      await partagerFichier(fichier, '');
      break;
    }
    case 'variante': {
      const L = langueCanal(app, k);
      modifier('variantes', (v) => void (v[cleVariante(app.slug, k.id, L)] = (v[cleVariante(app.slug, k.id, L)] ?? 0) + 1));
      // Une autre version remplace les retouches de ce canal.
      modifier('textes', (t) => {
        for (const cle of Object.keys(t)) if (cle.startsWith(`${app.slug}|${k.id}|${L}|`)) delete t[cle];
      });
      rendre();
      break;
    }
    case 'retablir': {
      const L = langueCanal(app, k);
      modifier('textes', (t) => {
        for (const cle of Object.keys(t)) if (cle.startsWith(`${app.slug}|${k.id}|${L}|`)) delete t[cle];
      });
      rendre();
      break;
    }
    case 'destination': {
      const L = langueCanal(app, k);
      const champs = champsActuels(app, k);
      const d = k.destinations(ctx(app, L), app)[Number(cible.dataset.index)];
      if (k.copie) {
        copier(texteDeCanal(app, k));
        toast('Texte copié.');
      }
      ouvrirAdresse(d.url(champs));
      break;
    }
    case 'telecharger-texte': {
      const champs = champsActuels(app, k);
      const L = langueCanal(app, k);
      telecharger(new Blob([champs.find((ch) => ch.cle === 'texte').valeur], { type: 'text/plain;charset=utf-8' }), `${app.slug}-${L === 'fr' ? 'communique' : 'press-release'}.txt`);
      break;
    }
    case 'imprimer-communique':
      imprimerCommunique(app, k);
      break;
    case 'imprimer-affiche':
      await imprimerAffiche(app, k);
      break;
    case 'dossier-presse':
      await dossierPresse(app);
      break;
    case 'site-web':
      await pageWeb(app, k);
      break;
    case 'visuel': {
      const cle = cible.dataset.cle;
      const valeur = cle === 'capture' ? Number(cible.dataset.valeur) : cible.dataset.valeur;
      modifier('visuels', (v) => {
        v[app.slug] = { ...(v[app.slug] ?? {}), [cle]: valeur };
        if (cle === 'appareil') v[app.slug].capture = 0;
      });
      rendre();
      break;
    }
    case 'fiche-retablir':
      modifier('fiches', (f) => {
        if (f[app.slug]) delete f[app.slug][langueDe(app)];
      });
      rendre();
      toast('Fiche rétablie.');
      break;
    case 'importer-apps':
      await importerApps();
      break;
    case 'auto-jour':
      modifierPlan((p) => {
        const j = Number(cible.dataset.jour);
        p.jours = p.jours.includes(j) ? p.jours.filter((x) => x !== j) : [...p.jours, j].sort();
      });
      break;
    case 'auto-langue':
      modifierPlan((p) => void (p.langue = cible.dataset.valeur));
      break;
    case 'auto-monter':
    case 'auto-descendre': {
      const i = Number(cible.dataset.index);
      const j = action === 'auto-monter' ? i - 1 : i + 1;
      modifierPlan((p) => ([p.apps[i], p.apps[j]] = [p.apps[j], p.apps[i]]));
      break;
    }
    case 'auto-retirer':
      modifierPlan((p) => void (p.apps = p.apps.filter((x) => x.slug !== cible.dataset.slug)));
      break;
    case 'auto-envoyer':
      await envoyerPlan();
      break;
    case 'auto-essai': {
      if (etat.auto.modifie) {
        toast('Envoie d’abord tes modifications sur GitHub.', 'erreur');
        break;
      }
      etat.auto.essai = true;
      rendre();
      try {
        const r = await fetch('api/automatique/essai', { method: 'POST' });
        const j = await r.json();
        if (!r.ok) throw new Error(j.erreur || 'échec');
        toast(j.message);
      } catch (e) {
        toast(`Essai impossible : ${e.message}`, 'erreur');
      }
      setTimeout(() => {
        etat.auto.essai = false;
        rendre();
      }, 60_000);
      break;
    }
    case 'sauvegarder':
      telecharger(new Blob([JSON.stringify(exporter(), null, 2)], { type: 'application/json' }), `diffusion-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`);
      break;
    case 'installer':
      etat.installation?.prompt();
      etat.installation = null;
      break;
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  const app = etat.route.page === 'app' ? appDe(etat.route.slug) : null;

  if (t.dataset.champ && app && etat.ouvert) {
    const k = trouverCanal(etat.ouvert);
    const L = langueCanal(app, k);
    modifier('textes', (x) => void (x[cleTexte(app.slug, k.id, L, t.dataset.champ)] = t.value));
    const compteur = t.closest('.champ').querySelector('.compteur');
    if (compteur && t.dataset.limite) {
      const n = longueur(t.value, t.dataset.compte || undefined);
      compteur.textContent = `${n} / ${t.dataset.limite}`;
      compteur.classList.toggle('trop', n > Number(t.dataset.limite));
    }
    return;
  }
  if (t.dataset.fiche && app) {
    const L = langueDe(app);
    modifier('fiches', (f) => {
      f[app.slug] ??= {};
      f[app.slug][L] ??= {};
      if (t.value.trim()) f[app.slug][L][t.dataset.fiche] = t.value;
      else delete f[app.slug][L][t.dataset.fiche];
    });
    etat.apercus.clear();
    return;
  }
  if (t.dataset.reglage) {
    modifier('reglages', (r) => void (r[t.dataset.reglage] = t.value));
    etat.apercus.clear();
    return;
  }
  if (t.dataset.action === 'rechercher') {
    etat.recherche = t.value;
    const pos = t.selectionStart;
    rendre();
    const champ = $('[data-action="rechercher"]');
    champ.focus();
    champ.setSelectionRange(pos, pos);
  }
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  const app = etat.route.page === 'app' ? appDe(etat.route.slug) : null;
  switch (t.dataset.action) {
    case 'filtre-apps':
      etat.filtreApps = t.value;
      rendre();
      break;
    case 'tri':
      etat.tri = t.value;
      rendre();
      break;
    case 'statut':
      etat.statut = t.value;
      rendre();
      break;
    case 'fait':
      modifier('suivi', (s) => {
        s[app.slug] ??= {};
        if (t.checked) s[app.slug][t.dataset.canal] = { date: new Date().toISOString() };
        else delete s[app.slug][t.dataset.canal];
      });
      if (t.checked) toast('Noté dans le journal.');
      rendre();
      break;
    case 'lien-publication':
      modifier('suivi', (s) => {
        if (s[app.slug]?.[t.dataset.canal]) s[app.slug][t.dataset.canal].lien = t.value.trim();
      });
      break;
    case 'couleur':
      modifier('visuels', (v) => void (v[app.slug] = { ...(v[app.slug] ?? {}), couleur: t.value }));
      rendre();
      break;
    case 'qr':
      modifier('visuels', (v) => void (v[app.slug] = { ...(v[app.slug] ?? {}), qr: t.checked }));
      rendre();
      break;
    case 'auto-actif':
      modifierPlan((p) => void (p.actif = t.checked));
      break;
    case 'auto-app':
      modifierPlan((p) => {
        if (t.checked && !p.apps.some((x) => x.slug === t.dataset.slug)) p.apps.push({ slug: t.dataset.slug });
        if (!t.checked) p.apps = p.apps.filter((x) => x.slug !== t.dataset.slug);
      });
      break;
    case 'auto-heure':
      if (t.value) modifierPlan((p) => void (p.heure = t.value));
      break;
    case 'restaurer': {
      try {
        importer(JSON.parse(await t.files[0].text()));
        etat.apercus.clear();
        toast('Sauvegarde restaurée.');
        rendre();
      } catch (err) {
        toast(err.message, 'erreur');
      }
      break;
    }
  }
});

window.addEventListener('hashchange', () => {
  const avant = etat.route;
  etat.route = route();
  if (avant.slug !== etat.route.slug) etat.ouvert = null;
  if (etat.route.canal && trouverCanal(etat.route.canal)) etat.ouvert = etat.route.canal;
  rendre();
  if (avant.page !== etat.route.page || avant.slug !== etat.route.slug) window.scrollTo(0, 0);
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  etat.installation = e;
});

window.addEventListener('error', (e) => toast(`Erreur : ${e.message}`, 'erreur'));
window.addEventListener('unhandledrejection', (e) => toast(`Erreur : ${e.reason?.message ?? e.reason}`, 'erreur'));

// ---------------------------------------------------------------
//  Demarrage
// ---------------------------------------------------------------

async function chargerDonnees() {
  const r = await fetch('data/apps.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('data/apps.json introuvable : lance « npm run importer » sur le Mac.');
  etat.donnees = await r.json();
  etat.apps = etat.donnees.apps;
}

async function demarrer() {
  etat.route = route();
  if (etat.route.canal && trouverCanal(etat.route.canal)) etat.ouvert = etat.route.canal;
  rendre();
  try {
    await chargerDonnees();
  } catch (e) {
    $('#principal').innerHTML = `<p class="vide">${esc(e.message)}</p>`;
    return;
  }
  // Servi par le Mac (npm run app) : on peut relancer l'import depuis la page.
  fetch('api/ping', { cache: 'no-store' })
    .then((r) => r.ok && r.json())
    .then((j) => {
      etat.local = !!j?.local;
      if (etat.local && (etat.route.page === 'accueil' || etat.route.page === 'reglages')) rendre();
    })
    .catch(() => {});
  rendre();

  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

demarrer();
