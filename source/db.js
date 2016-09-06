
'use strict';

module.exports = (function() {

  let db = {};
  const store = require('../libs/store.js');

  //SETTERS

  db.storeMessage = function(mokmessage){
    store.set("message_"+mokmessage.id, mokmessage);
  }

  db.storeMonkeyId = function(monkey_id){
    store.set("monkey_id", monkey_id);
  }

  db.storeUser = function(monkey_id, userObj){
    store.set("monkey_id", monkey_id);
    store.set("user_"+monkey_id, userObj);
  }

  //UPDATERS

  db.updateMessageReadStatus = function(mokmessage){
    if(mokmessage !== ""){
      mokmessage.readByUser = true;
      this.storeMessage(mokmessage);
    }
  }

  db.setAllMessagesToRead = function(id){

    let arrayMessages = this.getAllStoredMessages();
    arrayMessages.reduce(function(result, message){
      if(message.senderId === id && !message.readByUser){
        this.updateMessageReadStatus(message);
      }
      return result;
    }.bind(this),0);

  }

  db.markReadConversationStoredMessages = function(myId, id){

    let count = 0;
    store.forEach(function(key, message) {
      if (message.recipientId == null) {
        return;
      }

      // (message.recipientId == id && message.senderId == myId) add to mark my own messages
      //check if it's a group
      if(message.recipientId.indexOf("G:") !== -1 && message.recipientId === id && message.senderId !== myId || message.recipientId === myId && message.senderId === id){
        if (!message.readByUser) {
          this.updateMessageReadStatus(message);
          count++;
        }

      }
    }.bind(this));

    return count;

  }

  db.countUnreadConversationStoredMessages = function(myId, id){

    let count = 0;
    store.forEach(function(key, message) {
      if (message.recipientId == null) {
        return;
      }

      //(message.recipientId == id && message.senderId == myId) add to count my messages too
      //check if it's a group
      if(message.recipientId.indexOf("G:") !== -1 && message.recipientId === id && message.senderId !== myId || message.recipientId === myId && message.senderId === id){
        if (!message.readByUser) {
          count++;
        }
      }
    }.bind(this));

    return count;
  }

  db.markReadStoredMessage = function(id){
    let mokmessage = this.getMessageById(id);

    this.updateMessageReadStatus(mokmessage);
  }

  //GETTERS

  db.getMessageById = function(id){
    return store.get("message_"+id, "");
  }

  db.getAllStoredMessages = function(){

    let arrayMessages = [];

    store.forEach(function(key, val) {
      if(key.indexOf("message_") !== -1){
        arrayMessages.push(val);
      }
    });

    return arrayMessages;
  }

  db.getPendingMessages = function(){
    let arrayMessages = [];

    store.forEach(function(key, val) {
      if(key.indexOf("message_-") !== -1){
        arrayMessages.push(val);
      }
    });

    return arrayMessages;
  }

  db.getConversationStoredMessages = function(myId, id){

    let arrayMessages = [];

    store.forEach(function(key, message) {
      if (message.recipientId == null) {
        return;
      }
      //check if it's a group
      if(message.recipientId.indexOf("G:") !== -1 && message.recipientId === id || message.recipientId === id && message.senderId === myId || message.recipientId === myId && message.senderId === id){
        arrayMessages.push(message);
      }
    });

    return arrayMessages;

  }

  db.getMessagesInTransit = function(){

    let arrayMessages = [];
    store.forEach(function(key, val) {
      if(key.indexOf("message_-") !== -1){
        arrayMessages.push(val);
      }
    });

    return arrayMessages;

  }

  db.getTotalWithoutRead = function(id){

    let arrayMessages = this.getAllStoredMessages();
    let total = arrayMessages.reduce(function(result, message){
      if(message.senderId === id && !message.readByUser){
        result++;
      }
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

  db.deleteStoredMessagesOfConversation = function(myId, id) {

    let arrayMessages = this.getConversationStoredMessages(myId, id);

    let count = arrayMessages.length;

    arrayMessages.reduce(function(result, message){
      this.deleteMessageById(message.id);
      return result;
    }.bind(this),[]);

    return count;
  }

  db.clear = function(monkeyId){
    store.remove("monkey_id");
    store.remove("user_"+monkeyId);

    store.forEach(function(key, val) {
      if(key.indexOf("message_-") !== -1){
        store.remove(key);
      }
    });
  }
  return db;

}())
