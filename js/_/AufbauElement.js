
import setAttr       from '@domina/methods/setAttr.js';

import getStyleToken from '@domina/methods/getStyleToken.js';
import setStyleToken from '@domina/methods/setStyleToken.js';

class AufbauElement {
  getToken  (name)        { return getStyleToken  (name, this); }
  setToken  (name, value) { return setStyleToken  (name, value, this); }
  setTokens (map)         { return setStyleTokens (map, this); }

  getToken (name, fallback) { return getComputedStyle(this).getPropertyValue(name).trim() || fallback; }
  
  varPrefix () {
    const raw = this.getConfig('varPrefix', 'aufbau', [...configKeys(this.tag, 'varPrefix'), 'var-prefix']);
    return raw === false || raw === 'false' ? '' : raw === true || raw === 'true' ? 'aufbau' : String(raw);
  }

  cssVar (name) {
    const base   = name.startsWith('--') ? name.slice(2) : name;
    const prefix = this.varPrefix();
    return `--${prefix && base !== prefix && !base.startsWith(`${prefix}-`) ? `${prefix}-${base}` : base}`;
  }

  getVar (name, fallback) {
    const value = getComputedStyle(this).getPropertyValue(this.cssVar(name)).trim();
    return value || fallback;
    //return getStyleToken(name, this) || fallback;
  }

  getVars (names = []) {
    const style = getComputedStyle(this);
    const out   = {};
    for (const name of names) out[name] = style.getPropertyValue(this.cssVar(name)).trim() || undefined;
    //for (const name of names) out[name] = this.getVar(name);
    return out;
  }

  setVar (name, value) {
    if (isBlank(value)) this.style.removeProperty(this.cssVar(name));
    else this.style.setProperty(this.cssVar(name), String(value));
    return this;
  }

  setVars (map) {
    for (const name in map) this.setVar(name, map[name]);
    return this;
  }

  // reflect every `var`-flagged attribute onto its css custom property
  applyVars () {
    for (const [name, entry] of Object.entries(this.schema)) {
      const key = entry.var === true ? name : entry.var;
      if (entry.var) this.setVar(key, this.getAttr(name));
    }
        }
}
