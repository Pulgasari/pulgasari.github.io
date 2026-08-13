// cache.js

const getContentHash = (str) => [...str].reduce((s,c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0).toString(36);


function createCache (options = {}) {
  
  const { name = 'cache', namespace = 'aufbau' } = options;
  const cacheName = namespace + ':' + name;

  return {
    
    async clear () {
      return (await caches?.delete(cacheName)) ?? false;
    },

    async delete (key) {
      const cache = (await caches?.open(cacheName)) ?? null;
      return        (await cache?.delete(key))      ?? false;
    },
    
    async get (key) {
      try {
        const cache = (await caches?.open(cacheName)) ?? null;
        const match = (await cache?.match(key))       ?? null;
        return        (await match?.text())           ?? null;
      } 
      catch (e) { return null; }
    },

    async set (key, content) {
      try {
        const response = new Response (content, { headers: { 'Content-Type': 'text/css; charset=utf-8' }});   
        const cache    = (await caches?.open(cacheName)) ?? null;
        await cache?.put(key, response);
      }
      catch (e) { console.error('Failed to write to CacheStorage:', e); }
    },

    async getMeta (key) {
      try {
        const cache = (await caches?.open(cacheName)) ?? null;
        const match = (await cache?.match(key))       ?? null;
        return        (await match?.json())           ?? null;
      } 
      catch (e) { return null; }
    },

    async setMeta (key, content, hash) {
      try {
        const payload  = JSON.stringify({ content, hash });
        const response = new Response(payload, { headers: { 'Content-Type': 'application/json; charset=utf-8' }});   
        const cache    = (await caches?.open(cacheName)) ?? null;
        await cache?.put(key, response);
      }
      catch (e) { console.error('Failed to write to CacheStorage:', e); }
    },
    
  };
}

export { createCache, getContentHash };
export default createCache;
