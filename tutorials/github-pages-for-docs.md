# Create a Docs Website for a Project

## Goals:
* deploy from regular `/docs` folder in your project's repository
* no duplicated doc files: one could read docs in repository or on the website –both is served from the exact same files
* no build-steps / no workflows / no bullshit from the "modern web"
* inject custom css
* inject custom js

### additional goals:

Because i was building a docs-website for my coding language i also wanted to achieve this:

* use preact + htm
* provide syntax highlighting for the code blocks in my docs for my language

---



`custom.js`

```javascript
import hljs          from 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/+esm';
import { h, render } from 'https://cdn.jsdelivr.net/npm/preact@10.19.3/+esm';
import { signal }    from 'https://cdn.jsdelivr.net/npm/@preact/signals-core@1.5.0/+esm';
import htm           from 'https://cdn.jsdelivr.net/npm/htm@3.1.1/+esm'; 
const html = htm.bind(h);


const app = { name: 'POO' };

// Syntax Highlighting Setup
hljs.registerLanguage('poo', function (hljs) {
  return {
    name: "Poo",
    case_insensitive: false,
    keywords: {
      keyword  : "as|and|break|catch|continue|cpy|do|fail|fn|fn\*|fn\^|if|kill|loop|in|new|obj|or|pkg|ref|return|skip|static|switch|use|val|yield",
      literal  : "false|null|true|undefined",
      built_in : "Array|Blob|Bool|Char|Color|Date|Enum|Generator|List|Map|Number|Queue|Pattern|Record|RegExp|Set|Stack|String|Store|Symbol|Tree|Tuple|Union"
    },
    contains: [
      hljs.COMMENT('//', '$'),
      { className: 'string', begin: '"', end: '"', contains: [hljs.BACKSLASH_ESCAPE] },
      { className: 'string', begin: "'", end: "'", contains: [hljs.BACKSLASH_ESCAPE] },
      { className: 'string', begin: '`', end: '`', contains: [hljs.BACKSLASH_ESCAPE] },
      { className: 'number', begin: '0[xX][0-9a-fA-F_]+|0[bB][01_]+|\\d[\\d_]*\\.\\d[\\d_]*(?:[eE][+-]?\\d+)?|\\d[\\d_]*' },
      { className: 'operator', begin: '\\?\\?=|~==|===|!==|<=>|>>>|>=<|\\+=|-=|\\*=|/=|#=|~=|==|!=|=<|>=|\\|\\||&&|\\?\\?|>>|\\|\\?|\\|>|\\|\\.|=|<|>|\\+|-|\\*|/|%' }
    ]
  };
});

const menuItems = signal([
  { label: 'Home'    , href: '/'      },
  { label: 'Docs'    , href: '/docs/' },
  { label: '@GitHub' , href: 'https://github.com/pulgasari/poo/' },
]);

function Menu() {
  return html`
    <nav class="sticky-top">
      <div class="menu-container">
        <div class="menu-brand">${app.name} (preact in docs)</div>
        <div class="menu-items">
          ${menuItems.value.map(item => 
            html`<a href="${item.href}">${item.label}</a>`
          )}
        </div>
      </div>
    </nav>
  `;
}

// run when dom had loaded
window.addEventListener('DOMContentLoaded', () => {

  // apply syntax highlighting
  hljs.highlightAll();

  // render preact component
  const $target    = document.getElementById('app-body') || document.body;
  const $container = document.createElement('div');
  
  $target.prepend(container);
  render(html`<${Menu} />`, $target);
});
```

