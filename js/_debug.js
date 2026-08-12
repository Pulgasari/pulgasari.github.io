// Read 'debug' flag from URL and make it available globally across all scripts
window.DEBUG = new URLSearchParams(window.location.search).get('debug') === 'true';

// Enables debug if '?debug' or '?debug=true' exists in the URL
window.DEBUG = new URLSearchParams(window.location.search).has('debug');

if (window !== undefined) {
  window.DEBUG = new URLSearchParams(window.location.search).has('debug');      
}


globalThis.DEBUG = new URLSearchParams(window.location.search).has('debug');




// Safe access across Browser, Web Workers, and Service Workers
const search = globalThis.location?.search ?? '';
globalThis.DEBUG = new URLSearchParams(search).has('debug');



// Universal check across Browser, Workers, and Node.js
function checkDebugMode() {
  if (typeof location !== 'undefined') {
    return new URLSearchParams(location.search).has('debug');
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.DEBUG === 'true';
  }
  return false;
}

globalThis.DEBUG = checkDebugMode();


// geht auch
// Safe alternative using globalThis
// Works safely in any environment
if (globalThis.location !== undefined)


  
