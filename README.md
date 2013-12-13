mean-comments
=============

A simple drop in comment system built using a MEAN stack, with the Mongo part replaced with Tingo so that the Database is embedded.

**For the client:**
  * Include all the js and css files / dependencies.
  * Make *'gvtAPIcomments'* the ng-app or add it as a dependency to your Angular app.
  * Add ```<div ng-include="./partials/commentBlock.html"></div>``` somewhere on the page.

**For the server:**
  * run node ./server/commentServer.js

Originally created for the Galavantier inc. internal API Docs.
