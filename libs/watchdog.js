
'use strict';

module.exports = (function() {

  var store = require('./store.js');
  var watchdog = {};
  var working = false;
  var TIMEOUT = 5000;
  var myTimeout;
  var reconnect;

  watchdog.didResponseSync = false;

  watchdog.addMessageToWatchdog = function(args, reconnectFunction){
    
    reconnect = reconnectFunction;
    store.set("pending_"+args.id, args);
    if(!working){
    	this.startWatching();
    }

  }

  watchdog.removeMessageFromWatchdog = function(messageid){

  	store.remove("pending_"+messageid);

  }

  watchdog.removeAllMessagesFromWatchdog = function(){

  	store.forEach(function(key, val) {
	    if(key.indexOf("pending_") != -1){
	    	store.remove(key);
	    }
	  });

  }

  watchdog.startWatchingSync = function(reconnectFunction){
  	
  	reconnect = reconnectFunction;
  	watchdog.didResponseSync = false;
  	if(!working){
    	this.startWatching();
    }

  }

  watchdog.startWatching = function(){

  	if(myTimeout!=null)
  		clearTimeout(myTimeout);

  	myTimeout = window.setTimeout(function(){
		
		if(watchdog.getTotalPendingMessages() > 0 || !watchdog.didResponseSync){
			if(reconnect!=null)
				reconnect();
		}
  			
  		working = false;

	}, TIMEOUT);

	working = true;

  }

  watchdog.getTotalPendingMessages = function(){

  	var total=0;
  	store.forEach(function(key, val) {
	    if(key.indexOf("pending_") != -1){
	    	total++;
	    }
	});
	return total;

  }

  return watchdog;

}())