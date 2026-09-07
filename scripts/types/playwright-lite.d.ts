/**
 * Tipi minimi per la sola porzione di Playwright usata dagli script di
 * manutenzione in questa cartella (rigenerazione di icone e loghi).
 *
 * Playwright non è una dipendenza del progetto — pesa centinaia di MB e serve
 * a poche persone, di rado — quindi non c'è il pacchetto reale da cui prendere
 * i tipi. Chi deve lanciare questi script lo installa al momento
 * (`npm i -D playwright`); questo file esiste solo perché `tsc --noEmit`
 * continui a funzionare (e questi script restino TypeScript vero, non solo
 * JavaScript rinominato) anche quando playwright NON è installato.
 *
 * Copre solo le chiamate che questi script usano davvero: non è, e non vuole
 * essere, un sostituto dei tipi ufficiali.
 */
declare module "playwright" {
  export interface Locator {
    screenshot(options?: {
      path?: string;
      omitBackground?: boolean;
    }): Promise<Buffer>;
  }

  export interface Page {
    goto(url: string): Promise<unknown>;
    setContent(html: string): Promise<void>;
    locator(selector: string): Locator;
    evaluate<T, Arg>(
      pageFunction: (arg: Arg) => T | Promise<T>,
      arg: Arg,
    ): Promise<T>;
    close(): Promise<void>;
  }

  export interface Browser {
    newPage(options?: {
      viewport?: { width: number; height: number };
      deviceScaleFactor?: number;
    }): Promise<Page>;
    close(): Promise<void>;
  }

  export const chromium: {
    launch(options?: {
      executablePath?: string;
      args?: string[];
    }): Promise<Browser>;
  };
}
