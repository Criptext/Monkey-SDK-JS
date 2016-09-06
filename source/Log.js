
'use strict';

module.exports = (function() {

  let Log = {};

  Log.m = function(debugmode, message){
    if(debugmode)
      console.log(message); //eslint-disable-line no-console
  }

  return Log;

}())
