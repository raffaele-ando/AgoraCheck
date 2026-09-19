#!/usr/bin/env python3
"""
Stacca gli elementi singoli da un PDF esportato da Canva.

Serve perche' Canva non lascia esportare un elemento alla volta in PNG
trasparente senza abbonamento, ma lascia esportare tutto in PDF Print —
e li' dentro gli elementi sono ancora separati.

Come esportare da Canva perche' funzioni:
    Scarica -> PDF Print
    "Appiattisci PDF"            SPENTO   (appiattire fonde tutto in una
                                           sola immagine: e' esattamente
                                           il problema da cui si scappa)
    "Segni di taglio"            SPENTO   (aggiunge margini e sposta le
                                           coordinate)
    "Abbina ordine di lettura"   SPENTO   (scrive l'albero di
                                           accessibilita', che qui non si
                                           legge: nessun guadagno)
    Profilo colore               RGB

Uso:
    python3 strumenti/stacca-elementi.py originale.pdf public/studio/

Tira fuori due cose:
  1. le immagini incorporate, ricomposte con il loro canale di
     trasparenza — nel PDF sta in un oggetto separato, e chi lo ignora
     ottiene elementi con il fondo attaccato;
  2. un inventario della geometria di ogni pagina in percentuale del
     formato, che e' il sistema di coordinate dei modelli dello Studio.

Nota su `stacca_fondo`: la formula NON e' "quanto sei lontano dal fondo"
normalizzata sul nero. Un segno grigio o arancione su crema e' a meta'
strada dal nero e verrebbe fuori semitrasparente. E' "quanto sei lontano
dal fondo, sulla retta che porta al colore del segno": cosi' l'interno
delle lettere resta pieno e a sfumare restano solo i bordi.
"""
import hashlib
import pathlib
import sys

import numpy as np
import pymupdf
from PIL import Image


# Le tre funzioni di scontorno vivono in `stacca_fondo.py`, qui accanto:
# una per i segni a un colore solo (una parola, un marchio), una per i
# disegni multicolore (un'emoji), e una per isolare la macchia collegata
# quando il ritaglio si porta dentro i vicini.
def stacca_fondo(im: Image.Image, fondo=None):
    """Da un segno di colore pieno su fondo pieno ricava un PNG trasparente."""
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    if fondo is None:
        q = im.convert("RGB").quantize(colors=8).convert("RGB")
        fondo = max(q.getcolors(1 << 20))[1]
    fondo = np.array(fondo, dtype=np.float32)
    d = np.linalg.norm(a - fondo, axis=2)
    inchiostro = a[d >= np.percentile(d, 99.5)].mean(axis=0)
    portata = max(float(np.linalg.norm(inchiostro - fondo)), 1e-6)
    alfa = np.clip(d / portata, 0, 1)
    out = np.zeros((*alfa.shape, 4), dtype=np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = inchiostro.astype(np.uint8)
    out[..., 3] = (alfa * 255).astype(np.uint8)
    rgba = Image.fromarray(out, "RGBA")
    return rgba.crop(rgba.getbbox()), tuple(int(c) for c in inchiostro)


def estrai_immagini(doc, dove: pathlib.Path):
    dove.mkdir(parents=True, exist_ok=True)
    visti, n = set(), 0
    for pagina in doc:
        for xref, smask, *_ in pagina.get_images(full=True):
            if xref in visti:
                continue
            visti.add(xref)
            px = pymupdf.Pixmap(doc, xref)
            if smask:
                # La trasparenza sta in un oggetto suo: senza questo passaggio
                # ogni elemento esce con il proprio fondo attaccato.
                px = pymupdf.Pixmap(px, pymupdf.Pixmap(doc, smask))
            dati = px.tobytes("png")
            nome = hashlib.sha1(dati).hexdigest()[:10]
            (dove / f"{nome}.png").write_bytes(dati)
            n += 1
    return n


def inventario(doc):
    """La geometria di ogni pagina, in percentuale del formato."""
    for i, pagina in enumerate(doc):
        larg, alt = pagina.rect.width, pagina.rect.height
        print(f"\n=== pagina {i + 1} — {larg:.0f}x{alt:.0f} pt")

        def pc(r):
            return (f"x={100 * r.x0 / larg:6.2f} y={100 * r.y0 / alt:6.2f} "
                    f"l={100 * r.width / larg:6.2f} a={100 * r.height / alt:6.2f}")

        for d in pagina.get_drawings():
            f = d.get("fill")
            col = "#%02x%02x%02x" % tuple(int(c * 255) for c in f) if f else "—"
            print(f"  forma  {pc(d['rect'])}  {col}")
        for info in pagina.get_image_info():
            print(f"  imm    {pc(pymupdf.Rect(info['bbox']))}  {info['width']}x{info['height']}")
        for b in pagina.get_text("dict")["blocks"]:
            for riga in b.get("lines", []):
                for s in riga["spans"]:
                    print(f"  testo  {pc(pymupdf.Rect(s['bbox']))}  "
                          f"corpo={100 * s['size'] / alt:.2f}%  {s['font']:22} «{s['text']}»")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    doc = pymupdf.open(sys.argv[1])
    if len(sys.argv) > 2:
        n = estrai_immagini(doc, pathlib.Path(sys.argv[2]))
        print(f"{n} elementi staccati in {sys.argv[2]}", file=sys.stderr)
    inventario(doc)
