const { readFile } = Deno
import { ServeOptions, ReadReturn } from './types.ts'
import { mime } from 'https://deno.land/x/mimetypes@v1.0.0/src/mime.ts';
import { open } from "https://deno.land/x/opener/mod.ts";
import { 
  serve, 
  serveTLS,
  ServerRequest, 
  Response, 
  Server } from "https://deno.land/std@0.92.0/http/server.ts";
import { normalize, resolve } from 'https://deno.land/std@0.92.0/path/mod.ts'
import type {
  Plugin,
} from 'https://deno.land/x/drollup@2.42.3+0.17.1/mod.ts'

/**
 * Serve your rolled up bundle like webpack-dev-server
 * @param {ServeOptions|string|string[]} options
 */

const decoder = new TextDecoder()

class BuildServer {
  options: ServeOptions = {
    contentBase: [''],
    port: 10001,
    host: 'localhost',
    headers: {},
    openPage: '',
    open: true,
    defaultType: 'text/plain',
    verbose: true,
    onListening () {}
  };
  server: Server;
  #p?: Promise<void>;
  first = true
  constructor (initOptions: ServeOptions | string | Array<string>) {
    if (Array.isArray(initOptions) || typeof initOptions === 'string') {
      this.options.contentBase = typeof initOptions === 'string' ? [initOptions] : initOptions;
    }
    Object.assign(this.options, initOptions)
    if (this.options?.mimeTypes) {
      mime.define(this.options?.mimeTypes, true);
    }
    this.server = this.options.https
    ? serveTLS(this.options.https)
    : serve({port: this.options.port, hostname: this.options.host})
  }

  async requestHandler(req: ServerRequest) {
    const response: Response = {
      headers: new Headers(this.options.headers)
    }; 
    // Remove querystring
    const unsafePath = decodeURI(req.url.split('?')[0]);
    // Don't allow path traversal
    const urlPath = normalize(unsafePath)
    const { content, err, filePath } = await readFileFromContentBase(this.options.contentBase, urlPath)
    if (!err && content) return req.respond(this.found(response, filePath, content))
    if (err) {
      response.status = 500;
      response.body = '500 Internal Server Error' +
        '\n\n' + filePath +
        '\n\n' + /*Object.values(err).join('\n')*/ err +
        '\n\n(rollup-plugin-serve)';
      return req.respond(response)
    }
    if (this.options.historyApiFallback) { 
      const fallbackPath = typeof this.options.historyApiFallback === 'string' ? this.options.historyApiFallback : '/index.html'
      const { content: bContent, err: bError, filePath: bFilepath } = await readFileFromContentBase(this.options.contentBase, fallbackPath)
        if (bError) {
          return req.respond(this.notFound(response, filePath))
        } else {
          return req.respond(this.found(response, bFilepath, bContent || new Uint8Array(0)))
        }
    } else {
      return req.respond(this.notFound(response, filePath))
    }
  }
  async serve() {
    if (this.options.onListening) this.options.onListening({
      port: this.options.port, 
      host: this.options.host,
      protocol: this.options.https ? 'https' : 'http'
    })
    for await(const req of this.server) {
      this.requestHandler(req);
    }
  }
  closeServerOnTermination () {
    const terminationSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGHUP']
    terminationSignals.forEach((signal: string) => {
      (async () => {
        /* @ts-ignore */
        for await (const _ of Deno.signal(Deno.Signal[signal])) {
          if (this.server) {
            this.server.close()
            Deno.exit()
          }
        }
      })()
    })
  }
  notFound(response: Response, filePath: string): Response {
    response.status = 404;
    response.body = '404 Not Found' +
      '\n\n' + filePath +
      '\n\n(rollup-plugin-serve)';
    return response;
  }
  
  found(response: Response, filePath: string, content: Uint8Array): Response {
    response.status = 200;
    if (response.headers) response.headers.append('Content-Type', mime.getType(filePath) || this.options.defaultType);
    response.body = decoder.decode(content);
    return response;
  }
  
  green(text: string) {
    return '\u001b[1m\u001b[32m' + text + '\u001b[39m\u001b[22m'
  }

  rollup() {
    //if (this.server) this.closeServerOnTermination()
    const url = (this.options.https ? 'https' : 'http') + '://' + (this.options.host || 'localhost') + ':' + this.options.port
    let first = true;
    const options = this.options,
    green = this.green;
    this.serve()
    return {
      name: 'serve',
      generateBundle() {
        if (first) {
          first = false
          // Log which url to visit
          if (options.verbose !?? false) {
            options.contentBase.forEach((base: string) => {
              console.log(green(url) + ' -> ' + resolve(base));
            })
          }
          // Open browser
          if (options.open) {
            /* @ts-ignore */
            if (/https?:\/\/.+/.test(options.openPage)) {
              /* @ts-ignore */
              open(options.openPage)
            } else {
              open(url + options.openPage)
            }
          }
        }
      }
    }
  }
}

const readFileFromContentBase = async (contentBase:Array<string>, urlPath: string): Promise<ReadReturn> => {
  let filePath = resolve(contentBase[0] || '.', '.' + urlPath)

  // Load index.html in directories
  if (urlPath.endsWith('/')) {
    filePath = resolve(filePath, 'index.html')
  }
  // Try Read
  try {
    const content = await readFile(filePath)
    return {
      err: null,
      filePath,
      content      
    }
  } catch (err) {
    if (err && contentBase.length > 1) return readFileFromContentBase(contentBase.slice(1), urlPath)
    // We know enough
    else return {
      err,
      filePath,
      content: null
    }
  }
}

export default (initOptions: ServeOptions | string | Array<string> ): Plugin => {
  const server = new BuildServer(initOptions);
  const plugin = server.rollup();
  return plugin;
}

/**
 * @typedef {Object} ServeOptions
 * @property {boolean} [open=false] Launch in browser (default: `false`)
 * @property {string} [openPage=''] Page to navigate to when opening the browser. Will not do anything if `open` is `false`. Remember to start with a slash e.g. `'/different/page'`
 * @property {boolean} [verbose=true] Show server address in console (default: `true`)
 * @property {string|string[]} [contentBase=''] Folder(s) to serve files from
 * @property {string|boolean} [historyApiFallback] Path to fallback page. Set to `true` to return index.html (200) instead of error page (404)
 * @property {string} [host='localhost'] Server host (default: `'localhost'`)
 * @property {number} [port=10001] Server port (default: `10001`)
 * @property {function} [onListening] Execute a function when server starts listening for connections on a port
 * @property {ServeOptionsHttps} [https=false] By default server will be served over HTTP (https: `false`). It can optionally be served over HTTPS
 * @property {{[header:string]: string}} [headers] Set headers
 */

/**
 * @typedef {Object} ServeOptionsHttps
 * @property {string|Buffer|Buffer[]|Object[]} key
 * @property {string|Buffer|Array<string|Buffer>} cert
 * @property {string|Buffer|Array<string|Buffer>} ca
 * @see https.ServerOptions
 */