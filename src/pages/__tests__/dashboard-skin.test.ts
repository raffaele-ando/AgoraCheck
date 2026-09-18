import { test } from "node:test";
import assert from "node:assert";

/** Un browser finto: abbastanza per readSkin, che legge indirizzo e memoria. */
const makeWindow = (search: string, saved?: string) => {
  const store = new Map<string, string>();
  if (saved !== undefined) store.set("ac_dashboard_skin", saved);
  return {
    location: { search, href: "https://agora.theproject.world/dashboard" + search },
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
    store,
  } as any;
};

const load = async (win: any) => {
  (globalThis as any).window = win;
  const mod = await import(`../Dashboard?${Math.random()}`);
  return mod.readSkin as () => string;
};

test("senza indicazioni si apre il disegno nuovo", async () => {
  const readSkin = await load(makeWindow(""));
  assert.strictEqual(readSkin(), "next");
});

test("?ui=classic riporta al disegno precedente", async () => {
  const win = makeWindow("?ui=classic");
  const readSkin = await load(win);
  assert.strictEqual(readSkin(), "classic");
  assert.strictEqual(
    win.store.get("ac_dashboard_skin"),
    "classic",
    "la scelta fatta dall'indirizzo va anche ricordata",
  );
});

test("la scelta ricordata vale anche senza parametro nell'indirizzo", async () => {
  const readSkin = await load(makeWindow("", "classic"));
  assert.strictEqual(readSkin(), "classic");
});

test("l'indirizzo vince sulla scelta ricordata", async () => {
  const readSkin = await load(makeWindow("?ui=next", "classic"));
  assert.strictEqual(readSkin(), "next");
});

test("un valore inventato non rompe nulla, si torna al predefinito", async () => {
  const readSkin = await load(makeWindow("?ui=banana", "anche-questo-inventato"));
  assert.strictEqual(readSkin(), "next");
});

test("se il browser nega la memoria, la pagina si apre lo stesso", async () => {
  const win = makeWindow("?ui=classic");
  win.localStorage.setItem = () => {
    throw new Error("navigazione privata");
  };
  const readSkin = await load(win);
  assert.strictEqual(readSkin(), "classic");
});

test("i modi ragionevoli di scrivere la scelta valgono tutti", async () => {
  for (const [scritto, atteso] of [
    ["classico", "classic"],
    ["CLASSIC", "classic"],
    [" precedente ", "classic"],
    ["1", "classic"],
    ["nuovo", "next"],
    ["2", "next"],
  ] as [string, string][]) {
    const readSkin = await load(makeWindow(`?ui=${encodeURIComponent(scritto)}`));
    assert.strictEqual(readSkin(), atteso, `?ui=${scritto}`);
  }
});

test("un refuso non azzera la scelta gia' fatta", async () => {
  // «?ui=classicnext» nasce da un copia-incolla andato storto: prima
  // ricadeva in silenzio sul predefinito, facendo sembrare rotto
  // l'interruttore proprio a chi lo stava usando.
  const readSkin = await load(makeWindow("?ui=classicnext", "classic"));
  assert.strictEqual(readSkin(), "classic");
});
