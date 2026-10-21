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

/*
// some examples for the <evilmagic.js> in the main directory,
// so first you have to include it to your website

// LOAD ALL INTERNAL LINKS IN AJAX STYLE
document.addEventListener( "click", event => {
  // checking if the clicked element is a link
  if( event.target.tagName === "A" ){
    const currentDomain = window.location.origin;
    const linkHref = event.target.href;
    // check if the link belongs to the same domain
    if( linkHref.startsWith(currentDomain) ){
      event.preventDefault(); // prevent the default link behavior
      evilmagic( linkHref, 'main' ); // or use 'html', 'body' or any other selector
    }
  }
});
*/
