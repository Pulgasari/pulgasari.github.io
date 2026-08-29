// pulgasari.github.io
// because my mobile browser doesn't support multiple importmaps -.-
(() => {

const createElement = (tag, props) => Object.assign(document.createElement(tag), props);    

const PRELOAD_CRITICAL = [
  '@bunker/core',
  '@bunker/policy',
  '@domina/core',
  '@aufbau/elements',
  '@aufbau/kits',
];

const map = { imports: {
  "@aufbau/builders/docs"   : "./aufbau/builders/docs/index.js",
  "@aufbau/builders/docs/"  : "./aufbau/builders/docs/",
  "@aufbau/elements"        : "./aufbau/elements/index.js",
  "@aufbau/elements/"       : "./aufbau/elements/",
  "@aufbau/filters"         : "./aufbau/filters/index.js",
  "@aufbau/gestures"        : "./aufbau/gestures/index.js",
  "@aufbau/gestures/"       : "./aufbau/gestures/",
  "@aufbau/gestures/preact" : "./aufbau/gestures/adapters/preact.js",
  "@aufbau/import"          : "./aufbau/import/index.js",
  "@aufbau/js"              : "./aufbau/js/index.js",
  "@aufbau/kits/preact-htm" : "./aufbau/kits/preact-htm.js",
  "@aufbau/patterns"        : "./aufbau/patterns/index.js",
  "@aufbau/runtime"         : "./aufbau/runtime/index.js",
  "@aufbau/runtime/"        : "./aufbau/runtime/",
  "@aufbau/stylescript"     : "./aufbau/stylescript/index.js",
  "@aufbau/stylescript/"    : "./aufbau/stylescript/",
  "@aufbau/stylesheet"      : "./aufbau/stylesheet/index.js",
  "@aufbau/stylesheet/"     : "./aufbau/stylesheet/",
  "@aufbau/svg/"            : "./aufbau/svg/",
  "@aufbau/utils"           : "./aufbau/js/index.js",
  "@aufbau/webfonts"        : "./aufbau/webfonts/index.js",
  "@aufbau/webfonts/google" : "./aufbau/webfonts/google.js",

  "@bunker/cache"   : "./bunker/cache/index.js",
  "@bunker/core"    : "./bunker/core/index.js",
  "@bunker/db"      : "./bunker/db/index.js",
  "@bunker/kit"     : "./bunker/kit/index.js",
  "@bunker/policy"  : "./bunker/policy/index.js",
  "@bunker/storage" : "./bunker/storage/index.js",
  "@bunker/utils"   : "./bunker/utils/index.js",
  "@bunker/utils/"  : "./bunker/utils/",

  "@cosmonaut/compiler" : "./cosmonaut/packages/compiler/index.js",
  "@cosmonaut/ebnf"     : "./cosmonaut/packages/ebnf/index.js",
  "@cosmonaut/layouter" : "./cosmonaut/packages/layouter/index.js",
  "@cosmonaut/lsd"      : "./cosmonaut/packages/lsd/index.js",
  "@cosmonaut/parsers"  : "./cosmonaut/packages/parsers/index.js",
  "@cosmonaut/parsers/"  : "./cosmonaut/packages/parsers/",
  "@cosmonaut/layouter/" : "./cosmonaut/packages/layouter/",
  "@cosmonaut/compiler/" : "./cosmonaut/packages/compiler/",

  "@domina/core" : "./domina/core/index.js",
  
  "@poo/compiler" : "./poo/js-packages/compiler/index.js",
  "@poo/hljs"     : "./poo/js-packages/hljs/index.js",

  "@pulgasari/array"  : "./js/array.js",
  "@pulgasari/arr"    : "./js/arr.js",
  "@pulgasari/is"     : "./js/is.js",
  "@pulgasari/logger" : "./js/logger.js",
  "@pulgasari/obj"    : "./js/obj.js",
  "@pulgasari/random" : "./js/random.js",
  "@pulgasari/str"    : "./js/str.js",
  "@pulgasari/timing" : "./js/timing.js",
  "@pulgasari/url"    : "./js/url.js",

  "htm"              : "https://esm.sh/htm@3.1.1",
  "preact"           : "https://esm.sh/preact@10.20.1",
  "preact/hooks"     : "https://esm.sh/preact@10.20.1/hooks",
  "@preact/signals"  : "https://esm.sh/@preact/signals@1.2.2?external=preact",
    
  "hljs" : "https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/+esm"
}};

const mapURL = document.currentScript?.src;
if (!mapURL) throw new Error('[aufbau] importmap injector must be a classic script');

// rebase relative urls against this file, not the host page
const rebase = m => { for (const k in m) m[k] = new URL(m[k], mapURL).href; return m; };
rebase(map.imports);
//for (const scope in map.scopes ?? {}) rebase(map.scopes[scope]);

document.currentScript.after(
  createElement('script', { type: 'importmap', textContent: JSON.stringify(map) })
);




// Inject <link rel="modulepreload"> for critical modules
const fragment = document.createDocumentFragment();
for (const key of PRELOAD_CRITICAL) {
  const href = map.imports[key];
  if (href) {
    const link = createElement('link', { href, rel: 'modulepreload' });
    fragment.appendChild(link);
  }
}

if (fragment.childNodes.length > 0) {
  document.head.appendChild(fragment);
}

})();
