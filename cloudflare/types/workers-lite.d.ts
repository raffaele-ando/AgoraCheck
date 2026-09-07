/**
 * Tipi minimi per la sola porzione dell'ambiente Cloudflare Workers usata da
 * worker.ts: i bind KV e R2, e il contesto di esecuzione.
 *
 * Il pacchetto ufficiale (`@cloudflare/workers-types`) ridichiara anche
 * `Request`, `Response` e `Headers` a livello globale con forme non identiche
 * a quelle del lib "DOM" — che il resto del progetto (l'applicazione React nel
 * browser) usa per gli stessi nomi. Aggiungerlo al progetto condiviso
 * rischierebbe di far scontrare le due dichiarazioni globali nello stesso
 * controllo dei tipi, per un singolo file che non le usa nemmeno: il worker
 * legge da `req.headers`, `req.method`, `req.body` — tutto già coperto dal
 * `Request` di lib.dom.d.ts, identico nell'uso che se ne fa qui.
 *
 * Restano da tipizzare solo KV, R2 e il contesto di esecuzione, che il DOM non
 * conosce: è tutto quello che c'è in questo file.
 */

interface KVPutOptions {
  expirationTtl?: number;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: KVPutOptions): Promise<void>;
}

interface R2HttpMetadata {
  contentType?: string;
}

interface R2PutOptions {
  httpMetadata?: R2HttpMetadata;
}

interface R2ObjectBody {
  readonly body: ReadableStream;
  readonly httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
}

interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null,
    options?: R2PutOptions,
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

/** I bind dichiarati in wrangler.toml. */
interface Env {
  MEDIA?: R2Bucket;
  IDENTITY?: KVNamespace;
  ID_SECRET?: string;
}
