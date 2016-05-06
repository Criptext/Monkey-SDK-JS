
'use strict';

module.exports = (function() {

  var Log = {};
  
  Log.m = function(debugmode, message){
    if(debugmode)
      console.log(message);
  }

  return Log;

}())