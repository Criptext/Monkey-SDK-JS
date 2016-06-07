
'use strict';

module.exports = (function() {

  var store = require('./store.js');
  var watchdog = {};
  var working = false;
  var TIMEOUT = 5000;
  var myTimeout;
  var reconnect;

  watchdog.didRespondSync = true;

  watchdog.messageInTransit = function(reconnectFunction){

    reconnect = reconnectFunction;

    if(!working){
      this.startWatching();
    }

  }

  watchdog.removeMessageFromWatchdog = function(messageid){

    store.remove('message_-'+messageid);

  }

  watchdog.removeAllMessagesFromWatchdog = function(){

    store.forEach(function(key, val) {
      if(key.indexOf('message_-') != -1){
        store.remove(key);
      }
    });

  }

  watchdog.startWatchingSync = function(reconnectFunction){

    reconnect = reconnectFunction;
    watchdog.didRespondSync = false;
    if(!working){
      this.startWatching();
    }

  }

  watchdog.startWatching = function(){

    if(myTimeout!=null){
      clearTimeout(myTimeout);
    }
    myTimeout = window.setTimeout(function(){

      if(watchdog.checkIfPendingMessages() || !watchdog.didRespondSync){
        if(reconnect!=null)
        reconnect();
      }

      working = false;

    }, TIMEOUT);

    working = true;

  }

  watchdog.checkIfPendingMessages = function(){
    return store.exists('message_-');
  }

  watchdog.getTotalPendingMessages = function(){

    var total=0;
    store.forEach(function(key, val) {
      if(key.indexOf('message_-') != -1){
        total++;
      }
    });
    return total;

  }

  return watchdog;

}())
