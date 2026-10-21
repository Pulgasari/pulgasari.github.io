(function(){ "use strict";

  this.evilmagic = ( url, selectors ) => {
  
    url = url || document.URL;
    selectors = selectors || 'html';
    selectors = Array.isArray(selectors) ? selectors : [ selectors ];
  
    fetch(url)
    .then( response => { // The API call was successful!
      return response.text();
    })
    .then( html => { // This is the HTML from our response as a text string
      
      let dom = new DOMParser().parseFromString( html, 'text/html' );
      
      selectors.forEach( selector => {
        let newElement = dom.querySelector(selector);
        let oldElement = document.querySelector(selector);
        // Apply
        oldElement.replaceWith( newElement );
      });
  
    })
    .catch( err => { // There was an error
      console.warn('Something went wrong.', err);
    });
  
  }

}).call(this);
