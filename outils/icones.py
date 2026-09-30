"""L'icone de Diffusion : un point qui emet des ondes, sur un degrade.

    python3 outils/icones.py     (ou npm run icones)

Ecrit public/icones/ : 192, 512, masquable 512 (Android) et apple-touch-icon (180).
"""
from pathlib import Path
from PIL import Image, ImageDraw

SORTIE = Path(__file__).resolve().parent.parent / "public" / "icones"
T = 2048  # dessine en grand, reduit ensuite : bords lisses


def degrade(taille):
    haut_gauche, bas_droite, milieu = (255, 122, 69), (91, 63, 217), (214, 51, 132)
    img = Image.new("RGB", (taille, taille))
    px = img.load()
    for y in range(taille):
        for x in range(taille):
            t = (x + y) / (2 * (taille - 1))
            a, b, u = (haut_gauche, milieu, t * 2) if t < 0.5 else (milieu, bas_droite, (t - 0.5) * 2)
            px[x, y] = tuple(round(a[i] + (b[i] - a[i]) * u) for i in range(3))
    return img


def symbole(img, echelle):
    """Un point a gauche, trois ondes vers la droite."""
    d = ImageDraw.Draw(img)
    t = img.size[0]
    cx, cy = t * 0.36, t * 0.5
    blanc = (255, 255, 255)
    r = t * 0.085 * echelle
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=blanc)
    epaisseur = round(t * 0.058 * echelle)
    for i, rayon in enumerate((0.2, 0.31, 0.42)):
        R = t * rayon * echelle
        d.arc([cx - R, cy - R, cx + R, cy + R], start=-48, end=48, fill=blanc, width=epaisseur)
        # Bouts arrondis
        import math
        for angle in (-48, 48):
            a = math.radians(angle)
            m = R - epaisseur / 2
            bx, by = cx + m * math.cos(a), cy + m * math.sin(a)
            e = epaisseur / 2
            d.ellipse([bx - e, by - e, bx + e, by + e], fill=blanc)


def arrondi(img, rayon):
    masque = Image.new("L", img.size, 0)
    ImageDraw.Draw(masque).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=rayon, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), masque)
    return out


def main():
    SORTIE.mkdir(parents=True, exist_ok=True)
    base = degrade(T // 4).resize((T, T), Image.BICUBIC)

    pleine = base.copy()
    symbole(pleine, 1.0)
    arrondie = arrondi(pleine, round(T * 0.225))
    for cote in (192, 512):
        arrondie.resize((cote, cote), Image.LANCZOS).save(SORTIE / f"icone-{cote}.png")
    # iOS arrondit lui-meme : un carre plein.
    pleine.resize((180, 180), Image.LANCZOS).save(SORTIE / "apple-touch-icon.png")

    # Android decoupe un cercle ou une goutte : le symbole reste dans les 80 % du centre.
    masquable = base.copy()
    symbole(masquable, 0.78)
    masquable.resize((512, 512), Image.LANCZOS).save(SORTIE / "icone-masquable-512.png")
    # L'icone du Dock (Diffusion.app) : la grille macOS laisse une marge autour.
    mac = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    mac.paste(arrondie.resize((824, 824), Image.LANCZOS), (100, 100))
    mac.save(Path(__file__).resolve().parent / "icone-mac-1024.png")
    print("Icônes écrites dans", SORTIE)


if __name__ == "__main__":
    main()
