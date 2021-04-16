import { MimeTypeMap } from 'https://deno.land/x/mimetypes@v1.0.0/src/mime.ts';
import { HTTPSOptions } from 'https://deno.land/std@0.92.0/http/server.ts';

export interface ServeOptions<T = unknown> {
  contentBase: Array<string>,
  port: number,
  host: string,
  headers: Record<string, string>,
  https?: HTTPSOptions,
  openPage: string,
  onListening: (adress: Record<string, string | number>) => void,
  mimeTypes?: MimeTypeMap,
  defaultType: string,
  verbose: boolean,
  open: boolean,
  historyApiFallback?: (string | boolean)
}

export type Defined<T> = Exclude<T, undefined>;

export type Inner<T extends ServeOptions<unknown>> = T extends ServeOptions<infer X> ? X
  : never;


export type ReadReturn = {
  err: ErrorConstructor | null,
  filePath: string,
  size: string | null,
  content: Uint8Array | null
}