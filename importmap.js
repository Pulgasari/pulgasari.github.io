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
  "@aufbau/ass"             : "./aufbau/ass/index.js",
  "@aufbau/ass/"            : "./aufbau/ass/",
  "@aufbau/builders/docs"   : "./aufbau/builders/docs/index.js",
  "@aufbau/builders/docs/"  : "./aufbau/builders/docs/",
  "@aufbau/devtools"        : "./aufbau/devtools/index.js",
  "@aufbau/devtools/"       : "./aufbau/devtools/",
  "@aufbau/elements"        : "./aufbau/elements/index.js",
  "@aufbau/elements/htx"    : "./aufbau/elements/adapters/htx.js",
  "@aufbau/elements/"       : "./aufbau/elements/",
  "@aufbau/gestures"        : "./aufbau/gestures/index.js",
  "@aufbau/gestures/"       : "./aufbau/gestures/",
  "@aufbau/gestures/debug"    : "./aufbau/gestures/debug.js",
  "@aufbau/gestures/events"   : "./aufbau/gestures/adapters/events.js",
  "@aufbau/gestures/preact" : "./aufbau/gestures/adapters/preact.js",
  "@aufbau/gestures/simulate" : "./aufbau/gestures/simulate.js",
  "@aufbau/gui"             : "./aufbau/gui/index.js",
  "@aufbau/signals"         : "./aufbau/signals/index.js",
  "@aufbau/store"           : "./aufbau/store/index.js",
  "@aufbau/stylescript"     : "./aufbau/stylescript/index.js",
  "@aufbau/stylescript/"    : "./aufbau/stylescript/",
  "@aufbau/svg"             : "./aufbau/svg/index.js",
  "@aufbau/svg/"            : "./aufbau/svg/",

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

  "@domina/chain"               : "./domina/packages/chain/index.js",
  "@domina/element"             : "./domina/packages/element/index.js",
  "@domina/element/"            : "./domina/packages/element/",
  "@domina/fonts"               : "./domina/packages/fonts/index.js",
  "@domina/forms"               : "./domina/packages/forms/index.js",
  "@domina/meta"                : "./domina/packages/meta/index.js",
  "@domina/methods"             : "./domina/packages/methods/index.js",
  "@domina/methods/"            : "./domina/packages/methods/",
  "@domina/observer"            : "./domina/packages/observer/index.js",
  "@domina/prototypes"          : "./domina/packages/prototypes/index.js",
  "@domina/prototypes/observer" : "./domina/packages/prototypes/observer.js",
  "@domina/proxy"               : "./domina/packages/proxy/index.js",
  "@domina/raf"                 : "./domina/packages/raf/index.js",
  "@domina/render"              : "./domina/packages/render/index.js",
  "@domina/sheets"              : "./domina/packages/sheets/index.js",

  "@gestalt/core"            : "./gestalt/packages/core/index.js",
  "@gestalt/core/"           : "./gestalt/packages/core/",
  "@gestalt/filters"         : "./gestalt/packages/filters/index.js",
  "@gestalt/filters/"        : "./gestalt/packages/filters/lib/",
  "@gestalt/patterns"        : "./gestalt/packages/patterns/index.js",
  "@gestalt/patterns/"       : "./gestalt/packages/patterns/lib/",
  "@gestalt/webfonts"        : "./gestalt/packages/webfonts/index.js",
  "@gestalt/webfonts/"       : "./gestalt/packages/webfonts/",
  "@gestalt/webfonts/google" : "./gestalt/packages/webfonts/google.js",

  "@htx/compiler" : "./htx/packages/compiler/index.js",
  "@htx/elements" : "./htx/packages/elements/index.js",
  "@htx/htx"      : "./htx/packages/htx/index.js",
  "@htx/js"       : "./htx/packages/js/index.js",
  "@htx/js/render": "./htx/packages/js/render.js",
  "@htx/preact"   : "./htx/packages/preact/index.js",
  
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
  "@pulgasari/shift"            : "./js-packages/shift/index.js",
  "@pulgasari/str"              : P + 'str',
  "@pulgasari/timing"           : "./js-packages/timing/index.js",
  "@pulgasari/url"              : "./js-packages/url/index.js",

  "@rat/app"      : "./rat/packages/app/index.js",
  "@rat/commands" : "./rat/packages/commands/index.js",
  "@rat/compiler" : "./rat/packages/compiler/index.js",
  "@rat/hotkeys"  : "./rat/packages/hotkeys/index.js",
  "@rat/import"   : "./rat/packages/import/index.js",
  "@rat/runtime"  : "./rat/packages/runtime/index.js",
  "@rat/signals"  : "./rat/packages/signals/index.js",
  "@rat/types"    : "./rat/packages/types/index.js",

  "@rat/syntax"            : "./rat/packages/syntax/spec.js",
  "@rat/syntax/"           : "./rat/packages/syntax/",
  "@rat/syntax/codemirror" : "./rat/packages/syntax/targets/codemirror.js",
  "@rat/syntax/hljs"       : "./rat/packages/syntax/targets/hljs.js",
  "@rat/syntax/monaco"     : "./rat/packages/syntax/targets/monaco.js",

  "acorn"            : "https://esm.sh/acorn@8",
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
