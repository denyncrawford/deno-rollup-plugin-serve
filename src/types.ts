import { MimeTypeMap } from 'https://deno.land/x/mimetypes@v1.0.0/src/mime.ts';
import { HTTPSOptions } from 'https://deno.land/std@0.92.0/http/server.ts';
export type ServeOptions = {
  contentBase: Array<string>,
  port: number,
  host: string,
  headers?: Record<string, string>,
  https?: HTTPSOptions,
  openPage?: string,
  onListening?: (adress: Record<string, string | number>) => void,
  mimeTypes?: MimeTypeMap,
  defaultType: string,
  verbose?: boolean,
  open?: boolean,
  historyApiFallback?: string
}

export type ReadReturn = {
  err: unknown | null,
  filePath: string,
  content: Uint8Array | null
}