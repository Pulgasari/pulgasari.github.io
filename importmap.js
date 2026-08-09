// pulgasari.github.io
// because my mobile browser doesn't support multiple importmaps -.-
(() => {

const pkg = ['compiler', 'hljs'];

const map = { imports: {
  "@poo/compiler" : "./poo/js-packages/compiler/index.js",
  "@poo/hljs"     : "./poo/js-packages/hljs/index.js",
}};

  const mapURL = document.currentScript?.src;
  if (!mapURL) throw new Error('[aufbau] importmap injector must be a classic script');

  // rebase relative urls against this file, not the host page
  const rebase = m => { for (const k in m) m[k] = new URL(m[k], mapURL).href; return m; };
  rebase(map.imports);
  for (const s in map.scopes ?? {}) rebase(map.scopes[s]);

  document.currentScript.after(
    Object.assign(
      document.createElement('script'), {
        type: 'importmap', 
        textContent: JSON.stringify(map)
      }
    )
  );

})();
