// @aufbau/hyperfetch

import { arrayfied } from './util.js';
import { isExternalUrl, isFn, isInternalUrl } from './is.js';
import { watch } from './observer.js';
import * as dom from './dom.js';

// may become util
let scrollToTop = () => window.scrollTo(0,0);

//===== HYPERFETCH.JS ===================//
// made by: Pulgasari                    //
// web: https://pulgasari.dev/hyperfetch //
//=======================================//

export let hyperfetch = async (options) => {
  let {
    url        = '',
    selectors  = ['main'],
    mode       = 'inner',
    clear      = false,
    scroll     = false,
    push       = false,
    transition = {},
    //
    headers    = {},
    ...rest // For custom metadata or future-proofing
  } = options;
  if (!url) return;
  let { onStart, onEnd } = transition;
  if (isFn(onStart)) onStart();
  if (clear) dom.clear(selectors);

  try {
    let response = await fetch(url, { headers: { 'X-Hyperfetch': 'true', ...headers }, ...rest });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let text = await response.text();
    let html = dom.parse(text);
    
    arrayfied(selectors).forEach( selector => {
      let $new =     html.querySelector(selector);
      let $old = document.querySelector(selector);
      if (!$new || !$old) return;
      // 
      if  (selector === 'title') document.title = $new.textContent;
      else if (mode === 'inner') $old.innerHTML = $new.innerHTML;
      else if (mode === 'outer') $old.replaceWith($new);
    });
    // optional: scroll to top
    if (scroll) scrollToTop();
    // optional: set new url to browser
    if (push && url !== window.location.href) {
      window.history.pushState(options, '', url);
    }
    // optional: run end of transition
    if (isFn(onEnd)) onEnd(html);
    // 
    return { url, html, success: true };
  } catch (error) {
    if (isFn(onEnd)) onEnd();
    return { url, error, success: false };
  }
};
export let hypernavigate = async (options={}) => {
  // do hyperfetch
  let hf = await hyperfetch({ push: true, scroll: true, selectors: ['main', 'title'], ...options });
  // on hyperfetch fail: load target url
  if (!hf.success) window.location.href = hf.url;
};
export let useNavigator = (options={}) => {
  let handler = event => {
    let link = event.currentTarget;
    // UX GUARD: Allow default browser behavior for modifier keys
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    // UX GUARD: Ignore right clicks
    if (event.button !== 0) return;
    // UX GUARD: Ignore downloads or new tabs
    if (link.hasAttribute('download')) return;
    if (link.target && link.target !== '_self') return;
    //
    event.preventDefault();
    hypernavigate({ url: link.href, ...options });
  };
  // observe document for internal links
  watch('a',{
    onAdd    : element => isInternalUrl(element.href) && element.   addEventListener('click', handler),
    onRemove : element => isInternalUrl(element.href) && element.removeEventListener('click', handler),
  });
  // handle "go back" button of browser
  window.addEventListener('popstate', event => {
    // If state is null (e.g. initial load), we might want to reload or fetch current href
    let state = event.state || { url: window.location.href };
    hypernavigate({ ...state, push: false });
  });
};

// ===== DEFAULT EXPORT
export default hyperfetch;
