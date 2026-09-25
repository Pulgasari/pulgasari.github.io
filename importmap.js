// pulgasari.github.io
// because my mobile browser doesn't support multiple importmaps -.-
(() => {

const createElement = (tag, props) => Object.assign(document.createElement(tag), props);    

const PRELOAD_CRITICAL = [
//  '@bunker/core',
//  '@bunker/policy',
//  '@domina/core',
//  '@aufbau/elements',
//  '@aufbau/kits',
];

const P = 'https://esm.sh/jsr/@pulgasari/';
const pulgasari = ['is', 'logger', 'str'];

const map = { imports: {
  "@aufbau/api"             : "./aufbau/api/index.js",
  "@aufbau/ass"             : "./aufbau/ass/index.js",
  "@aufbau/ass/"            : "./aufbau/ass/",
  "@aufbau/builders/docs"   : "./aufbau/builders/docs/index.js",
  "@aufbau/builders/docs/"  : "./aufbau/builders/docs/",
  "@aufbau/elements"        : "./aufbau/elements/index.js",
  "@aufbau/elements/"       : "./aufbau/elements/",
  "@aufbau/filters"         : "./aufbau/filters/index.js",
  "@aufbau/gestures"        : "./aufbau/gestures/index.js",
  "@aufbau/gestures/"       : "./aufbau/gestures/",
  "@aufbau/gestures/preact" : "./aufbau/gestures/adapters/preact.js",
  "@aufbau/gui"             : "./aufbau/gui/index.js",
  "@aufbau/icons"           : "./aufbau/icons/index.js",
  "@aufbau/icons/"          : "./aufbau/icons/",
  "@aufbau/import"          : "./aufbau/import/index.js",
  //"@aufbau/kits/preact-htm" : "./aufbau/kits/preact-htm.js",
  "@aufbau/patterns"        : "./aufbau/patterns/index.js",
  "@aufbau/runtime"         : "./aufbau/runtime/index.js",
  "@aufbau/runtime/"        : "./aufbau/runtime/",
  "@aufbau/signals"         : "./aufbau/signals/index.js",
  "@aufbau/store"           : "./aufbau/store/index.js",
  "@aufbau/stylescript"     : "./aufbau/stylescript/index.js",
  "@aufbau/stylescript/"    : "./aufbau/stylescript/",
  "@aufbau/stylesheet"      : "./aufbau/stylesheet/index.js",
  "@aufbau/stylesheet/"     : "./aufbau/stylesheet/",
  "@aufbau/svg/"            : "./aufbau/svg/",
  "@aufbau/webfonts"        : "./aufbau/webfonts/index.js",
  "@aufbau/webfonts/"       : "./aufbau/webfonts/",
  "@aufbau/webfonts/google" : "./aufbau/webfonts/google.js",

  "@bunker/cache"   : "./bunker/cache/index.js",
  "@bunker/core"    : "./bunker/core/index.js",
  "@bunker/db"      : "./bunker/db/index.js",
  "@bunker/kit"     : "./bunker/kit/index.js",
  "@bunker/opfs"    : "./bunker/opfs/index.js",
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

  "@domina/core"     : "./domina/core/index.js",
  "@domina/core/"    : "./domina/core/",

  "@domina/element"      : "./domina/packages/element/index.js",
  "@domina/element/lazy" : "./domina/packages/element/lazy.js",
  "@domina/fonts"        : "./domina/packages/fonts/index.js",
  "@domina/form"         : "./domina/packages/form/index.js",
  "@domina/meta"         : "./domina/packages/meta/index.js",
  "@domina/methods"      : "./domina/packages/methods/index.js",
  "@domina/methods/"     : "./domina/packages/methods/",
  "@domina/observer"     : "./domina/packages/observer/index.js",
  "@domina/raf"          : "./domina/packages/raf/index.js",
  "@domina/stylesheet"   : "./domina/packages/stylesheet/index.js",

  "@htx/htx"    : "./htx/packages/htx/index.js",
  "@htx/js"     : "./htx/packages/js/index.js",
  "@htx/preact" : "./htx/packages/preact/index.js",
  
  "@poo/compiler" : "./poo/js-packages/compiler/index.js",
  "@poo/hljs"     : "./poo/js-packages/hljs/index.js",

  "@pulgasari/arr"              : "./js-packages/arr/index.js",
  "@pulgasari/arr/fp"           : "./js-packages/arr/fp.js",
  "@pulgasari/canonicalmap"     : "./js-packages/obj/CanonicalMap.js",
  "@pulgasari/coerce"           : "./js-packages/coerce/index.js",
  "@pulgasari/hash"             : "./js-packages/hash/index.js",
  "@pulgasari/is"               : P + 'is',
  "@pulgasari/logger"           : P + 'logger',
  "@pulgasari/num"              : "./js-packages/num/index.js",
  "@pulgasari/obj"              : "./js-packages/obj/index.js",
  "@pulgasari/obj/CanonicalMap" : "./js-packages/obj/CanonicalMap.js",
  "@pulgasari/random"           : "./js-packages/random/index.js",
  "@pulgasari/str"              : P + 'str',
  "@pulgasari/timing"           : "./js-packages/timing/index.js",
  "@pulgasari/url"              : "./js-packages/url/index.js",

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
