/* pulgasari.github.io/sw.js

classic script on purpose — a service worker has no import map, so bare specifiers
never resolve there. importScripts() performs no specifier resolution at all and
is how a worker shares code. see aufbau/sw.js for the reasoning in full.

register WITHOUT type: 'module'.
*/

importScripts('./aufbau/sw.js');

aufbauServiceWorker({
  // highest fan-in modules of this page's graph, measured with aufbau/test/graph.mjs.
  // they sit on level 2-4, so the browser discovers them late even though nearly
  // every import chain runs through them.
  precache: [
    './aufbau/js/index.js',
    './aufbau/kits/aufbau.js',
    './domina/core/index.js',
  ],
});
