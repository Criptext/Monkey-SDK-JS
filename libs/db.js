
'use strict';

module.exports = (function() {

  var db = {};
  var store = require('./store.js');

  //SETTERS

  db.storeMessage = function(mokmessage){
    store.set("message_"+mokmessage.id, mokmessage);
  }

  db.storeMonkeyId = function(monkey_id){
    store.set("monkey_id", monkey_id);
  }

  db.storeUser = function(monkey_id, userObj){
    store.set("user_"+monkey_id, userObj);
  }

  //UPDATERS

  db.updateMessageReadStatus = function(id){
    var mokmessage = this.getMessageById(id);
    if(mokmessage != ""){
      mokmessage.readByUser = true;
      this.storeMessage(mokmessage);
    }
  }

  db.setAllMessagesToRead = function(id){

    var arrayMessages = this.getAllMessages();
    arrayMessages.reduce(function(result, message){
      if(message.senderId == id && !message.readByUser)
      this.updateMessageReadStatus(message.id);
      return result;
    }.bind(this),0);

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

  db.getMonkeyId = function(){
    return store.get("monkey_id", null);
  }

  db.getUser = function(monkey_id){
    return store.get("user_"+monkey_id, null);
  }

  //DELETERS

  db.deleteMessageById = function(id){
    store.remove("message_"+id);
  }

  db.deleteAllMessagesFromMonkeyId = function(id) {

    var arrayMessages = this.getAllMessagesByMonkeyId(id);
    arrayMessages.reduce(function(result, message){
      this.deleteMessageById(message.id);
      return result;
    }.bind(this),[]);

  }
  db.clear = function(){
    return store.clear();
  }
  return db;

}())
