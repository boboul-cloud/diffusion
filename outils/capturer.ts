/**
 * Les captures d'ecran d'une app web, prises en ligne par Chrome sans ecran :
 * l'accueil sur un telephone (et un deuxieme ecran si la page defile), puis
 * sur une tablette. Sert a l'import (les apps web n'ont pas de fiche App Store).
 *
 *   node outils/capturer.ts https://tclp.riskelo-salon.workers.dev/   → des JPEG dans /tmp
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Navigateur, pause } from './rendre.ts';

const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const SAFARI_IPAD =
  'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

export const APPAREILS = {
  // Un iPhone de 6,1 pouces : 1170 × 2532, la forme des captures de l'App Store.
  iphone: { width: 390, height: 844, deviceScaleFactor: 3, mobile: true, ua: SAFARI_IPHONE },
  ipad: { width: 820, height: 1180, deviceScaleFactor: 2, mobile: true, ua: SAFARI_IPAD },
} as const;

export type Captures = { iphone: Buffer[]; ipad: Buffer[] };

/** Le temps que les pages en 3D se dessinent et que les animations d'entree finissent. */
const ATTENTE_MS = 4500;

export class Capteur extends Navigateur {
  async demarrer(): Promise<void> {
    await this.ouvrir(true);
    await this.commande('Page.enable');
    // Comme une app deja installee sur l'ecran d'accueil : pas de bandeau « Installez l'app ».
    await this.commande('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        try { Object.defineProperty(navigator, 'standalone', { get: () => true }); } catch (e) {}
        const mm = window.matchMedia.bind(window);
        window.matchMedia = (q) => /display-mode\s*:\s*(standalone|fullscreen)/.test(q)
          ? mm('(min-width: 0px)')
          : mm(q);
      `,
    });
    // Toujours le theme clair : les visuels sont plus lisibles, et c'est l'allure par defaut.
    await this.commande('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  }

  private async charger(url: string, appareil: keyof typeof APPAREILS): Promise<void> {
    const a = APPAREILS[appareil];
    await this.commande('Emulation.setDeviceMetricsOverride', {
      width: a.width, height: a.height, deviceScaleFactor: a.deviceScaleFactor, mobile: a.mobile,
    });
    await this.commande('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await this.commande('Emulation.setUserAgentOverride', { userAgent: a.ua, platform: appareil === 'ipad' ? 'iPad' : 'iPhone' });
    // Une visite neuve : pas de donnees d'un essai precedent (localStorage, cache).
    await this.commande('Storage.clearDataForOrigin', { origin: new URL(url).origin, storageTypes: 'all' });
    await this.commande('Page.navigate', { url });
    for (let i = 0; i < 100; i++) {
      if ((await this.evaluer('document.readyState')) === 'complete') break;
      await pause(150);
    }
    await pause(ATTENTE_MS);
  }

  private async photo(): Promise<Buffer> {
    const r = await this.commande('Page.captureScreenshot', { format: 'jpeg', quality: 86 });
    if (!r.result?.data) throw new Error('Capture vide.');
    return Buffer.from(r.result.data, 'base64');
  }

  /** Une icone en SVG (celle de Gares de Paris…) dessinee en PNG carre. */
  async svgEnPng(svg: string, cote = 512): Promise<Buffer> {
    await this.commande('Emulation.setDeviceMetricsOverride', { width: cote, height: cote, deviceScaleFactor: 1, mobile: false });
    const img = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    const html = `<!doctype html><body style="margin:0"><img src="${img}" width="${cote}" height="${cote}" style="display:block">`;
    await this.commande('Page.navigate', { url: `data:text/html;base64,${Buffer.from(html).toString('base64')}` });
    await pause(600);
    const r = await this.commande('Page.captureScreenshot', { format: 'png' });
    if (!r.result?.data) throw new Error('Icône vide.');
    return Buffer.from(r.result.data, 'base64');
  }

  /** L'accueil sur iPhone (et l'ecran d'en dessous s'il y en a un), puis sur iPad. */
  async capturer(url: string): Promise<Captures> {
    await this.charger(url, 'iphone');
    const iphone = [await this.photo()];
    const hauteur = Number(await this.evaluer('Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0)'));
    if (hauteur > APPAREILS.iphone.height * 1.6) {
      await this.evaluer(`window.scrollTo(0, ${Math.round(APPAREILS.iphone.height * 0.9)})`);
      await pause(900);
      iphone.push(await this.photo());
    }
    await this.charger(url, 'ipad');
    const ipad = [await this.photo()];
    return { iphone, ipad };
  }
}

// Essai a la main : node outils/capturer.ts <adresse>
if (import.meta.main) {
  const url = process.argv[2];
  if (!url) throw new Error('Donne l’adresse de l’app web.');
  const c = new Capteur();
  await c.demarrer();
  try {
    const r = await c.capturer(url);
    for (const [appareil, liste] of Object.entries(r)) {
      liste.forEach((b, i) => {
        const f = path.join(os.tmpdir(), `capture-${appareil}-${i + 1}.jpg`);
        fs.writeFileSync(f, b);
        console.log(f);
      });
    }
  } finally {
    await c.fermer();
  }
}
