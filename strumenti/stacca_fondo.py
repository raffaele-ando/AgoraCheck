"""
Stacca un segno di colore pieno dal suo fondo pieno.

La formula giusta non e' "quanto sei lontano dal fondo" normalizzata sul
nero: un segno grigio su crema e' a meta' strada dal nero, e verrebbe
fuori semitrasparente. E' "quanto sei lontano dal fondo, sulla retta che
porta al colore del segno" — cosi' l'interno delle lettere e' opaco e a
sfumare restano solo i bordi.
"""
from PIL import Image
import numpy as np

def stacca(im: Image.Image, fondo=None):
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    if fondo is None:
        # il colore piu' frequente e' il fondo
        q = im.convert("RGB").quantize(colors=8).convert("RGB")
        fondo = max(q.getcolors(1 << 20))[1]
    fondo = np.array(fondo, dtype=np.float32)
    d = np.linalg.norm(a - fondo, axis=2)
    # il colore del segno: la media dei pixel piu' lontani dal fondo
    soglia = np.percentile(d, 99.5)
    inchiostro = a[d >= soglia].mean(axis=0)
    portata = np.linalg.norm(inchiostro - fondo)
    alfa = np.clip(d / max(portata, 1e-6), 0, 1)
    out = np.zeros((*alfa.shape, 4), dtype=np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = inchiostro.astype(np.uint8)
    out[..., 3] = (alfa * 255).astype(np.uint8)
    rgba = Image.fromarray(out, "RGBA")
    return rgba.crop(rgba.getbbox()), tuple(inchiostro.astype(int)), tuple(fondo.astype(int))


def stacca_colorato(im, fondo):
    """
    Come `stacca`, ma per un disegno a PIU' colori (un'emoji).

    `stacca` impone a tutti i pixel un colore solo: giusto per una parola
    o un marchio, sbagliato per un bersaglio rosso e blu, che verrebbe
    fuori tutto blu. Qui il colore di ogni pixel si conserva.

    Il conto: ogni pixel visto e' `p = a*F + (1-a)*B`, con B il fondo noto,
    F il colore vero e `a` l'opacita'. Due incognite e un'equazione, quindi
    serve un'ipotesi: dentro il disegno `a` vale 1, e a sfumare sono solo i
    bordi. Si stima `a` dalla distanza dal fondo normalizzata sul tipico
    dei pixel pieni, poi si ricava F togliendo il fondo — altrimenti i
    bordi restano sporchi del colore su cui erano stati disegnati.
    """
    import numpy as np
    from PIL import Image
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    B = np.array(fondo, dtype=np.float32)
    d = np.linalg.norm(a - B, axis=2)
    tipica = np.percentile(d[d > 0], 92) if (d > 0).any() else 1.0
    alfa = np.clip(d / max(tipica, 1e-6), 0, 1)
    with np.errstate(invalid="ignore", divide="ignore"):
        F = (a - (1 - alfa)[..., None] * B) / np.maximum(alfa, 1e-3)[..., None]
    F = np.clip(np.nan_to_num(F), 0, 255)
    out = np.zeros((*alfa.shape, 4), dtype=np.uint8)
    out[..., :3] = F.astype(np.uint8)
    out[..., 3] = (alfa * 255).astype(np.uint8)
    rgba = Image.fromarray(out, "RGBA")
    return rgba.crop(rgba.getbbox())


def isola_macchia(rgba, punto=None):
    """
    Tiene solo la macchia di inchiostro collegata al punto indicato.

    Serve quando si ritaglia un glifo da una pagina: il riquadro di un
    glifo non e' il riquadro del disegno, quindi o si taglia stretto e si
    perde un pezzo, o si taglia largo e si portano dentro i vicini. Con un
    margine abbondante e questa scrematura si ottiene il disegno intero e
    nient'altro.
    """
    import numpy as np
    from collections import deque
    from PIL import Image
    a = np.asarray(rgba)
    pieno = a[..., 3] > 24
    h, w = pieno.shape
    if punto is None:
        punto = (h // 2, w // 2)
    y, x = punto
    if not pieno[y, x]:
        # il centro puo' cadere in un buco del disegno: cerco il pieno piu' vicino
        ys, xs = np.nonzero(pieno)
        if len(ys) == 0:
            return rgba
        i = np.argmin((ys - y) ** 2 + (xs - x) ** 2)
        y, x = int(ys[i]), int(xs[i])
    visto = np.zeros_like(pieno)
    coda = deque([(y, x)])
    visto[y, x] = True
    while coda:
        cy, cx = coda.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and pieno[ny, nx] and not visto[ny, nx]:
                visto[ny, nx] = True
                coda.append((ny, nx))
    fuori = a.copy()
    fuori[..., 3] = np.where(visto, a[..., 3], 0)
    out = Image.fromarray(fuori, "RGBA")
    return out.crop(out.getbbox())
