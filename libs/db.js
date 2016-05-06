
'use strict';

module.exports = (function() {

  var db = {};
  var store = require('./store.js');

  //SETTERS

  db.storeMessage = function(mokmessage){
    store.set("message_"+mokmessage.id, mokmessage);
  }

  //UPDATERS

  db.updateMessageReadStatus = function(id){
    var mokmessage = this.getMessageById("message_"+id);
    mokmessage.readByUser = true;
    this.storeMessage(mokmessage);
  }

  db.setAllMessagesToRead = function(id){

  }

  //GETTERS

  db.getMessageById = function(id){
    return store.get("message_"+id, "");
  }

  db.getAllMessages = function(){
    
    var arrayMessages = [];
    
    store.forEach(function(key, val) {
      if(key.indexOf("message_") != -1){
        arrayMessages.push(val);
      }
    });

    return arrayMessages;
  }

  db.getAllMessagesByMonkeyId = function(id){

    var arrayMessages = this.getAllMessages();

    if(id.indexOf("G:") != -1){
      
      arrayMessages = arrayMessages.reduce(function(result, message){
        if(message.senderId == id || message.recipientId == id)
          result.push(message);
        return result;
      },[]);  

    }
    else{

      arrayMessages = arrayMessages.reduce(function(result, message){
        if( (message.recipientId.indexOf(id)>=0 && message.senderId.indexOf("G:")==-1) 
            || (message.senderId == id && message.recipientId.indexOf("G:")==-1) )
          result.push(message);
        return result;
      },[]);  

    }
    
    return arrayMessages;

  }

  db.getAllMessagesSending = function(){

    var arrayMessages = this.getAllMessages();
    arrayMessages = arrayMessages.reduce(function(result, message){
      if(parseInt(message.id) < 0)
        result.push(message);
      return result;
    },[]);  

    return arrayMessages;

  }

  db.getTotalWithoutRead = function(id){

    var arrayMessages = this.getAllMessages();
    var total = arrayMessages.reduce(function(result, message){
      if(message.senderId == id && !message.readByUser)
        result++;
      return result;
    },0);  

    return total;

  }

  //DELETERS

  db.deleteMessageById = function(id){
    store.remove("message_"+id);
  }

  db.deleteAllMessagesFromMonkeyId = function(id) {

  }

  return db;

}())