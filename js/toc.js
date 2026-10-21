(function(){ "use strict";

  this.toc = ( obj ) => {

    let container = obj.container || document.getElementById('toc');
    let selectors = obj.selectors || 'h1, h2, h3, h4, h5, h6';

    const menu = container;
    if (!menu) return;

    const headlines = document.querySelectorAll(selectors);
    const toc = document.createElement('ul');

    headlines.forEach( headline => {
      const   a = document.createElement('a');
      const  li = document.createElement('li');
      const  id = headline.innerText.replace(/\s+/g, '-').toLowerCase();
      const tag = headline.tagName;
      
      headline.id = id;
      a.href = `#${id}`;
      a.innerText = headline.innerText;

       li.classList.add(tag);
       li.appendChild(a);
      toc.appendChild(li);
    });

    menu.appendChild(toc);
  }

}).call(this);
