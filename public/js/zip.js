// Un .zip sans compression (les images le sont deja) : assez pour un
// dossier de presse, sans bibliotheque.

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(octets) {
  let c = 0xffffffff;
  for (let i = 0; i < octets.length; i++) c = TABLE[(c ^ octets[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dateDos(d) {
  const heure = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const jour = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return [heure, jour];
}

/** fichiers : [{ nom, donnees: Blob | string | Uint8Array }] → Blob */
export async function creerZip(fichiers) {
  const enc = new TextEncoder();
  const [heure, jour] = dateDos(new Date());
  const locaux = [];
  const central = [];
  let decalage = 0;

  for (const f of fichiers) {
    const donnees =
      f.donnees instanceof Uint8Array
        ? f.donnees
        : typeof f.donnees === 'string'
          ? enc.encode(f.donnees)
          : new Uint8Array(await f.donnees.arrayBuffer());
    const nom = enc.encode(f.nom);
    const crc = crc32(donnees);

    const tete = new DataView(new ArrayBuffer(30));
    tete.setUint32(0, 0x04034b50, true);
    tete.setUint16(4, 20, true);
    tete.setUint16(6, 0x0800, true); // noms en UTF-8
    tete.setUint16(8, 0, true); // stocke, sans compression
    tete.setUint16(10, heure, true);
    tete.setUint16(12, jour, true);
    tete.setUint32(14, crc, true);
    tete.setUint32(18, donnees.length, true);
    tete.setUint32(22, donnees.length, true);
    tete.setUint16(26, nom.length, true);
    tete.setUint16(28, 0, true);
    locaux.push(tete, nom, donnees);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, heure, true);
    c.setUint16(14, jour, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, donnees.length, true);
    c.setUint32(24, donnees.length, true);
    c.setUint16(28, nom.length, true);
    c.setUint32(42, decalage, true);
    central.push(c, nom);

    decalage += 30 + nom.length + donnees.length;
  }

  const tailleCentral = central.reduce((n, p) => n + p.byteLength, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, fichiers.length, true);
  fin.setUint16(10, fichiers.length, true);
  fin.setUint32(12, tailleCentral, true);
  fin.setUint32(16, decalage, true);

  return new Blob([...locaux, ...central, fin], { type: 'application/zip' });
}
