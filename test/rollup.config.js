import serve from '../mod.ts'

export default { 
  input: './entry.js',
  plugins: [
    serve({
      open: true,
      port: 3000,
      openPage: '/frames.html',
      historyApiFallback: '/fallback.html',
      contentBase: ['.', 'base1', 'base2'],
      onListening({protocol, host, port}) {
        // by using a bound function, we can access options as `this`
        console.log(`Server listening at ${protocol}://${host}:${port}/`)
      }
    })
  ],
  output: {
    file: 'dest.js',
    format: 'iife'
  },
  watch: {
    clearScreen: true,
  }
}
