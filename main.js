// import EventEmitter from './bower_components/eventEmitter/EventEmitter.js';

/*!
* Monkey v0.0.8
* Apache 2.0 - http://www.apache.org/licenses/LICENSE-2.0.html
* Gianni Carlo - http://oli.me.uk/
* @preserve
*/

var EventEmitter = require('events');
var MonkeyEnums = require('./libs/MonkeyEnums.js');
var MOKMessage = require('./libs/MOKMessage.js');
var monkeyKeystore = require('./libs/MonkeyKeystore.js');
var watchdog = require('./libs/watchdog.js');
var apiconnector = require('./libs/ApiConnector.js');
var Log = require('./libs/Log.js');
var db = require('./libs/db.js');
var NodeRSA = require('node-rsa');
var CryptoJS = require('node-cryptojs-aes').CryptoJS;
var async = require("async");

require('es6-promise').polyfill();

;(function () {
  'use strict';

  /**
  * Class for managing Monkey communication.
  * Can be extended to provide event functionality in other classes.
  *
  * @class Monkey Manages everything.
  */
  function Monkey() {}

  // Shortcuts to improve speed and size
  var proto = Monkey.prototype;
  var exports = this;
  

  proto.enums = new MonkeyEnums();
  // var originalGlobalValue = exports.Monkey;
  /**
  * Alias a method while keeping the context correct, to allow for overwriting of target method.
  *
  * @param {String} name The name of the target method.
  * @return {Function} The aliased method
  * @api private
  */
  function alias(name) {
    return function aliasClosure() {
      return this[name].apply(this, arguments);
    };
  }

  proto.addListener = function addListener(evt, callback){
    var emitter = this._getEmitter();
    emitter.addListener(evt, callback);

    return this;
  }

  proto._getEmitter = function _getEmitter() {
    if (this.emitter == null) {
      this.emitter = new EventEmitter();
    }
    return this.emitter;
  };

  proto.removeEvent = function removeEvent(evt){
    var emitter = this._getEmitter();
    emitter.removeEvent(evt);
    return this;
  }

  proto.status = 0;

  proto.session = {
    id:null,
    user: null,
    lastTimestamp: 0,
    lastMessageId: 0,
    expireSession: 0,
    debuggingMode: false
  }

  /*
  * Session stuff
  */

  proto.init = function init(appKey, appSecret, userObj, shouldExpireSession, isDebugging, autoSync){
    if (appKey == null || appSecret == null) {
      throw 'Monkey - To initialize Monkey, you must provide your App Id and App Secret';
      return;
    }

    this.appKey = appKey;
    this.appSecret = appSecret;
    this.autoSync = autoSync;

    //setup session
    if (userObj != null) {
      this.session.user = userObj;
      this.session.id = userObj.monkeyId;
      db.storeMonkeyId(userObj.monkeyId);
      db.storeUser(userObj.monkeyId, userObj);
    }

    if (shouldExpireSession) {
      this.session.expireSession = 1;
    }

    this.domainUrl = 'monkey.criptext.com';

    if (isDebugging) {
      this.session.debuggingMode = true;
      this.domainUrl = 'stage.monkey.criptext.com'
    }

    //this.keyStore={};
    apiconnector.init(this);

    //setup socketConnection
    this.socketConnection= null

    this.requestSession();
    return this;
    // this.session =
  }

  /*
   * COMMUNICATION
   */

  proto.prepareMessageArgs = function prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush){
    var args = {
      app_id: this.appKey,
      sid: this.session.id,
      rid: recipientMonkeyId,
      props: JSON.stringify(props),
      params: JSON.stringify(optionalParams)
    };

    switch (typeof(optionalPush)){
      case "object":{
        if (optionalPush == null) {
          optionalPush = {};
        }
        break;
      }
      case "string":{
        optionalPush = this.generateStandardPush(optionalPush);
        break;
      }
      default:
      optionalPush = {};
      break;
    }

    args["push"] = JSON.stringify(optionalPush);

    return args;
  }

  proto.sendCommand = function sendCommand(command, args){
    var finalMessage = JSON.stringify({cmd:command,args:args});
    Log.m(this.session.debuggingMode, "================");
    Log.m(this.session.debuggingMode, "Monkey - sending message: "+finalMessage);
    Log.m(this.session.debuggingMode, "================");
    this.socketConnection.send(finalMessage);

    return this;
  }

  proto.sendOpenToUser = function sendOpenToUser(monkeyId){
    this.sendCommand(this.enums.MOKMessageProtocolCommand.OPEN, {rid: monkeyId});
  }

  proto.sendMessage = function sendMessage(text, recipientMonkeyId, optionalParams, optionalPush){
    var props = {
      device: "web",
      encr: 0,
    };

    return this.sendText(this.enums.MOKMessageProtocolCommand.MESSAGE, text, recipientMonkeyId, props, optionalParams, optionalPush);
  }

  proto.sendEncryptedMessage = function sendEncryptedMessage(text, recipientMonkeyId, optionalParams, optionalPush){
    var props = {
      device: "web",
      encr: 1,
    };

    return this.sendText(this.enums.MOKMessageProtocolCommand.MESSAGE, text, recipientMonkeyId, props, optionalParams, optionalPush);
  }

  proto.sendText = function sendText(cmd, text, recipientMonkeyId, props, optionalParams, optionalPush){
    var args = this.prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
    args.msg = text;
    args.type = this.enums.MOKMessageType.TEXT;

    var message = new MOKMessage(cmd, args);

    args.id = message.id;
    args.oldId = message.oldId;

    if (message.isEncrypted()) {
      message.encryptedText = this.aesEncrypt(text, this.session.id);
      args.msg = message.encryptedText;
    }

    watchdog.addMessageToWatchdog(args, function(){
      this.socketConnection.close();
      setTimeout(this.startConnection(this.session.id), 2000);
    }.bind(this));

    db.storeMessage(message);

    this.sendCommand(cmd, args);

    return message;
  }

  proto.sendNotification = function sendNotification(recipientMonkeyId, optionalParams, optionalPush){
    var props = {
      device: "web"
    };

    var args = prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
    args.type = this.enums.MOKMessageType.NOTIF;

    var message = new MOKMessage(this.enums.MOKMessageProtocolCommand.MESSAGE, args);

    args.id = message.id;
    args.oldId = message.oldId;

    this.sendCommand(this.enums.MOKMessageProtocolCommand.MESSAGE, args);

    return message;
  }

  proto.publish = function publish(text, channelName, optionalParams){
    var props = {
      device: "web",
      encr: 0
    };

    return this.sendText(this.enums.MOKMessageProtocolCommand.PUBLISH, text, channelName, props, optionalParams);
  }

  proto.sendFile = function sendFile(data, recipientMonkeyId, fileName, mimeType, fileType, shouldCompress, optionalParams, optionalPush, callback){
    var props = {
      device: "web",
      encr: 0,
      file_type: fileType,
      ext: this.mok_getFileExtension(fileName),
      filename: fileName
    };

    if (shouldCompress) {
      props.cmpr = "gzip";
    }

    if (mimeType) {
      props.mime_type = mimeType;
    }

    return this.uploadFile(data, recipientMonkeyId, fileName, props, optionalParams, function(error, message){
      if (error) {
        callback(error, message);
      }

      db.storeMessage(message);
      callback(null, message);
    });
  }

  proto.sendEncryptedFile = function sendEncryptedFile(data, recipientMonkeyId, fileName, mimeType, fileType, shouldCompress, optionalParams, optionalPush, callback){
    var props = {
      device: "web",
      encr: 1,
      file_type: fileType,
      ext: this.mok_getFileExtension(fileName),
      filename: fileName
    };

    if (shouldCompress) {
      props.cmpr = "gzip";
    }

    if (mimeType) {
      props.mime_type = mimeType;
    }

    return this.uploadFile(data, recipientMonkeyId, fileName, props, optionalParams, optionalPush, function(error, message){
      if (error) {
        callback(error, message);
      }

      callback(null, message);
    });
  }

  proto.uploadFile = function uploadFile(fileData, recipientMonkeyId, fileName, props, optionalParams, optionalPush, callback) {
    fileData = this.cleanFilePrefix(fileData);

    var binData = this.mok_convertDataURIToBinary(fileData);
    props.size = binData.size;

    var args = this.prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
    args.msg = fileName;
    args.type = this.enums.MOKMessageType.FILE;

    var message = new MOKMessage(this.enums.MOKMessageProtocolCommand.MESSAGE, args);

    args.id = message.id;
    args.oldId = message.oldId;
    args.props = message.props;
    args.params = message.params;

    if (message.isCompressed()) {
      fileData = this.compress(fileData);
    }

    if (message.isEncrypted()) {
      fileData = this.aesEncrypt(fileData, this.session.id);
    }

    var fileToSend = new Blob([fileData.toString()], {type: message.props.file_type});
    fileToSend.name=fileName;

    var data = new FormData();
    //agrega el archivo y la info al form
    data.append('file', fileToSend);
    data.append('data', JSON.stringify(args) );

    apiconnector.basicRequest('POST', '/file/new/base64',data, true, function(err,respObj){
      if (err) {
        Log.m(this.session.debuggingMode, 'Monkey - upload file Fail');
        callback(err.toString(), message);
        return;
      }
      Log.m(this.session.debuggingMode, 'Monkey - upload file OK');
      message.id = respObj.data.messageId;
      callback(null, message);

    }.bind(this));

    return message;
  }

  proto.getPendingMessages = function getPendingMessages(){
    this.requestMessagesSinceTimestamp(this.session.lastTimestamp, 15, false);
  }

  proto.processGetMessages = function processGetMessages(messages, remaining){
    this.processMultipleMessages(messages);

    if (remaining > 0) {
      this.requestMessagesSinceId(this.session.lastMessageId, 15, false);
    }
  }

  proto.processSyncMessages = function processSyncMessages(messages, remaining){
    this.processMultipleMessages(messages);

    if (remaining > 0) {
      this.requestMessagesSinceTimestamp(this.session.lastTimestamp, 15, false);
    }
  }

  proto.processMultipleMessages = function processMultipleMessages(messages){
    messages.map(function(message){
      let msg = new MOKMessage(this.enums.MOKMessageProtocolCommand.MESSAGE, message);
      this.processMOKProtocolMessage(msg);
    }.bind(this));
  }

  proto.processMOKProtocolMessage = function processMOKProtocolMessage(message){
    Log.m(this.session.debuggingMode, "===========================");
    Log.m(this.session.debuggingMode, "MONKEY - Message in process: "+message.id+" type: "+message.protocolType);
    Log.m(this.session.debuggingMode, "===========================");

    switch(message.protocolType){
      case this.enums.MOKMessageType.TEXT:{
        this.incomingMessage(message);
        db.storeMessage(message);
        break;
      }
      case this.enums.MOKMessageType.FILE:{
        this.fileReceived(message);
        db.storeMessage(message);
        break;
      }
      default:{
        this._getEmitter().emit('onNotification', message);
        break;
      }
    }
  }

  proto.incomingMessage = function incomingMessage(message){
    if (message.isEncrypted()) {
      try{
        message.text = this.aesDecryptIncomingMessage(message);
      }
      catch(error){
        Log.m(this.session.debuggingMode, "===========================");
        Log.m(this.session.debuggingMode, "MONKEY - Fail decrypting: "+message.id+" type: "+message.protocolType);
        Log.m(this.session.debuggingMode, "===========================");
        //get keys
        this.getAESkeyFromUser(message.senderId, message, function(response){
          if (response != null) {
            this.incomingMessage(message);
          }
        }.bind(this));
        return;
      }

      if (message.text == null || message.text == "") {
        //get keys
        this.getAESkeyFromUser(message.senderId, message, function(response){
          if (response != null) {
            this.incomingMessage(message);
          }
        }.bind(this));
        return;
      }
    }else{
      message.text = message.encryptedText;
    }

    if (message.id > 0) {
      this.session.lastTimestamp = message.datetimeCreation;
      this.session.lastMessageId = message.id;
    }

    switch (message.protocolCommand){
      case this.enums.MOKMessageProtocolCommand.MESSAGE:{
        this._getEmitter().emit('onMessage', message);
        break;
      }
      case this.enums.MOKMessageProtocolCommand.PUBLISH:{
        this._getEmitter().emit('onChannelMessages', message);
        break;
      }
    }
  }

  proto.fileReceived = function fileReceived(message){
    if (message.id > 0) {
      this.session.lastTimestamp = message.datetimeCreation;
      this.session.lastMessageId = message.id;
    }

    this._getEmitter().emit('onMessage', message);
  }

  proto.processMOKProtocolACK = function processMOKProtocolACK(message){
    Log.m(this.session.debuggingMode, "===========================");
    Log.m(this.session.debuggingMode, "MONKEY - ACK in process");
    Log.m(this.session.debuggingMode, "===========================");

    //Aditional treatment can be done here
    this._getEmitter().emit('onAcknowledge', message);

    if(message.props.status == "52")
      message.readByUser = true;

    if(message.id != "0"){
      watchdog.removeMessageFromWatchdog(message.oldId);
      db.deleteMessageById(message.oldId);
      db.storeMessage(message);
    }

  }

  proto.requestMessagesSinceTimestamp = function requestMessagesSinceTimestamp(lastTimestamp, quantity, withGroups){
    
    var args={
      since: lastTimestamp,
      qty: quantity
    };

    if (withGroups == true) {
      args.groups = 1;
    }

    watchdog.startWatchingSync(function(){
      this.socketConnection.close();
      setTimeout(this.startConnection(this.session.id), 2000);
    }.bind(this));

    this.sendCommand(this.enums.MOKMessageProtocolCommand.SYNC, args);

  }

  proto.requestMessagesSinceId = function requestMessagesSinceId(lastMessageId, quantity, withGroups){
    var args = {
      messages_since: lastMessageId,
      qty:  quantity
    }

    if (withGroups == true) {
      args.groups = 1;
    }

    this.sendCommand(this.enums.MOKMessageProtocolCommand.GET, args);

    watchdog.startWatchingSync(function(){
      this.socketConnection.close();
      setTimeout(this.startConnection(this.session.id), 2000);
    }.bind(this));
  }

  proto.startConnection = function startConnection(monkey_id){
    this.status = this.enums.Status.CONNECTING;
    var token=this.appKey+":"+this.appSecret;

    if(this.session.debuggingMode){ //no ssl
      this.socketConnection = new WebSocket('ws://'+this.domainUrl+'/websockets?monkey_id='+monkey_id+'&p='+token,'criptext-protocol');
    }
    else{
      this.socketConnection = new WebSocket('wss://'+this.domainUrl+'/websockets?monkey_id='+monkey_id+'&p='+token,'criptext-protocol');
    }

    this.socketConnection.onopen = function () {
      this.status=this.enums.Status.ONLINE;

      if (this.session.user == null) {
        this.session.user = {};
      }
      this.session.user.monkeyId = this.session.id;
      this._getEmitter().emit('onConnect', this.session.user);

      this.sendCommand(this.enums.MOKMessageProtocolCommand.SET, {online:1});
      
      if(this.autoSync)
        this.getPendingMessages();
    }.bind(this);

    this.socketConnection.onmessage = function (evt)
    {
      Log.m(this.session.debuggingMode, 'Monkey - incoming message: '+evt.data);
      var jsonres=JSON.parse(evt.data);

      if (jsonres.args.app_id == null) {
        jsonres.args.app_id = this.appKey;
      }

      var msg = new MOKMessage(jsonres.cmd, jsonres.args);
      switch (parseInt(jsonres.cmd)){
        case this.enums.MOKMessageProtocolCommand.MESSAGE:{
          this.processMOKProtocolMessage(msg);
          break;
        }
        case this.enums.MOKMessageProtocolCommand.PUBLISH:{
          this.processMOKProtocolMessage(msg);
          break;
        }
        case this.enums.MOKMessageProtocolCommand.ACK:{
          //msg.protocolCommand = MOKMessageProtocolCommand.ACK;
          //msg.monkeyType = set status value from props
          this.processMOKProtocolACK(msg);
          break;
        }
        case this.enums.MOKMessageProtocolCommand.GET:{
          //notify watchdog
          switch(jsonres.args.type){
            case this.enums.MOKGetType.HISTORY:{
              var arrayMessages = jsonres.args.messages;
              var remaining = jsonres.args.remaining_messages;

              watchdog.didResponseSync=true;
              watchdog.removeAllMessagesFromWatchdog();

              this.processGetMessages(arrayMessages, remaining);

              break;
            }
            case this.enums.MOKGetType.GROUPS:{
              msg.protocolCommand= this.enums.MOKMessageProtocolCommand.GET;
              msg.protocolType = this.enums.MOKMessageType.NOTIF;
              //monkeyType = MOKGroupsJoined;
              msg.text = jsonres.args.messages;

              this._getEmitter().emit('onNotification', msg);
              break;
            }
          }

          break;
        }
        case this.enums.MOKMessageProtocolCommand.SYNC:{
          //notify watchdog
          switch(jsonres.args.type){
            case this.enums.MOKSyncType.HISTORY:{
              var arrayMessages = jsonres.args.messages;
              var remaining = jsonres.args.remaining_messages;

              watchdog.didResponseSync=true;
              watchdog.removeAllMessagesFromWatchdog();
              
              this.processSyncMessages(arrayMessages, remaining);

              break;
            }
            case this.enums.MOKSyncType.GROUPS:{
              msg.protocolCommand= this.enums.MOKMessageProtocolCommand.GET;
              msg.protocolType = this.enums.MOKMessageType.NOTIF;
              //monkeyType = MOKGroupsJoined;
              msg.text = jsonres.args.messages;
              this._getEmitter().emit('onNotification', msg);
              break;
            }
          }

          break;
        }
        case this.enums.MOKMessageProtocolCommand.OPEN:{
          msg.protocolCommand = this.enums.MOKMessageProtocolCommand.OPEN;
          this._getEmitter().emit('onNotification', msg);
          db.setAllMessagesToRead(msg.senderId);
          break;
        }
        default:{
          this._getEmitter().emit('onNotification', msg);
          break;
        }
      }
    }.bind(this);

    this.socketConnection.onclose = function(evt)
    {
      //check if the web server disconnected me
      if (evt.wasClean) {
        Log.m(this.session.debuggingMode, 'Monkey - Websocket closed - Connection closed... '+ evt);
        this.status=this.enums.Status.OFFLINE;
      }else{
        //web server crashed, reconnect
        Log.m(this.session.debuggingMode, 'Monkey - Websocket closed - Reconnecting... '+ evt);
        this.status=this.enums.Status.CONNECTING;
        setTimeout(this.startConnection(monkey_id), 2000 );
      }
      this._getEmitter().emit('onDisconnect');
    }.bind(this);
  }

  /*
  * Security
  */

  proto.getAESkeyFromUser = function getAESkeyFromUser(monkeyId, pendingMessage, callback){
    apiconnector.basicRequest('POST', '/user/key/exchange',{ monkey_id:this.session.id, user_to:monkeyId}, false, function(err,respObj){
      
      if(err){
        Log.m(this.session.debuggingMode, 'Monkey - error on getting aes keys '+err);
        return callback(null);
      }

      Log.m(this.session.debuggingMode, 'Monkey - Received new aes keys');
      var newParamKeys = this.aesDecrypt(respObj.data.convKey, this.session.id).split(":");
      var newAESkey = newParamKeys[0];
      var newIv = newParamKeys[1];

      //var currentParamKeys = this.keyStore[respObj.data.session_to];
      var currentParamKeys = monkeyKeystore.getData(respObj.data.session_to, this.session.myKey, this.session.myIv);

      //this.keyStore[respObj.data.session_to] = {key:newParamKeys[0],iv:newParamKeys[1]};
      monkeyKeystore.storeData(respObj.data.session_to, newParamKeys[0]+":"+newParamKeys[1], this.session.myKey, this.session.myIv);

      if (typeof(currentParamKeys) == 'undefined') {
        return callback(pendingMessage);
      }

      //check if it's the same key
      if (newParamKeys[0] == currentParamKeys.key && newParamKeys[1] == currentParamKeys.iv) {
        this.requestEncryptedTextForMessage(pendingMessage, function(decryptedMessage){
          return callback(decryptedMessage);
        }.bind(this));
      }
      else{
        //it's a new key
        Log.m(this.session.debuggingMode, 'Monkey - it is a new key');
        return callback(pendingMessage);
      }

    }.bind(this));
  }

  proto.requestEncryptedTextForMessage = function requestEncryptedTextForMessage(message, callback){
    apiconnector.basicRequest('GET', '/message/'+message.id+'/open/secure',{}, false, function(err,respObj){
      if(err){
        Log.m(this.session.debuggingMode, 'Monkey - error on requestEncryptedTextForMessage: '+err);
        return callback(null);
      }

      message.encryptedText = respObj.data.message;
      message.text = message.encryptedText;
      message.encryptedText = this.aesDecrypt(message.encryptedText, this.session.id);
      if (message.encryptedText == null) {
        if (message.id > 0) {
          this.session.lastTimestamp = message.datetimeCreation;
          this.session.lastMessageId = message.id;
        }
        return callback(null);
      }
      message.text = message.encryptedText;
      message.setEncrypted(false);
      return callback(message);
    }.bind(this));
  }

  proto.aesDecryptIncomingMessage = function aesDecryptIncomingMessage(message){
    return this.aesDecrypt(message.encryptedText, message.senderId);
  }

  proto.aesDecrypt = function aesDecrypt(dataToDecrypt, monkeyId){
    //var aesObj = this.keyStore[monkeyId];
    var aesObj = monkeyKeystore.getData(monkeyId, this.session.myKey, this.session.myIv);
    var aesKey = CryptoJS.enc.Base64.parse(aesObj.key);
    var initV = CryptoJS.enc.Base64.parse(aesObj.iv);
    var cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(dataToDecrypt) });
    var decrypted = CryptoJS.AES.decrypt(cipherParams, aesKey, { iv: initV }).toString(CryptoJS.enc.Utf8);

    return decrypted;
  }

  proto.decryptFile = function decryptFile (fileToDecrypt, monkeyId) {
    //var aesObj = this.keyStore[monkeyId];
    var aesObj = monkeyKeystore.getData(monkeyId, this.session.myKey, this.session.myIv);

    var aesKey=CryptoJS.enc.Base64.parse(aesObj.key);
    var initV= CryptoJS.enc.Base64.parse(aesObj.iv);

    var decrypted = CryptoJS.AES.decrypt(fileToDecrypt, aesKey, { iv: initV }).toString(CryptoJS.enc.Base64);

    // Log.m(this.session.debuggingMode, 'el tipo del archivo decriptado: '+ typeof(decrypted));
    return decrypted;
  }

  proto.aesEncrypt = function aesEncrypt(dataToEncrypt, monkeyId){
    //var aesObj = this.keyStore[monkeyId];
    var aesObj = monkeyKeystore.getData(monkeyId, this.session.myKey, this.session.myIv);
    var aesKey=CryptoJS.enc.Base64.parse(aesObj.key);
    var initV= CryptoJS.enc.Base64.parse(aesObj.iv);

    var encryptedData = CryptoJS.AES.encrypt(dataToEncrypt, aesKey, { iv: initV });

    return encryptedData.toString();
  }

  proto.decryptBulkMessages = function decryptBulkMessages(messages, decryptedMessages, onComplete){
    if(!(typeof messages != "undefined" && messages != null && messages.length > 0)){
      return onComplete(decryptedMessages);
    }

    var message = messages.shift();

    if (message.isEncrypted() && message.protocolType != MOKMessageType.FILE) {
      try{
        message.text = this.aesDecryptIncomingMessage(message);
      }
      catch(error){
        Log.m(this.session.debuggingMode, "===========================");
        Log.m(this.session.debuggingMode, "MONKEY - Fail decrypting: "+message.id+" type: "+message.protocolType);
        Log.m(this.session.debuggingMode, "===========================");
        //get keys
        this.getAESkeyFromUser(message.senderId, message, function(response){
          if (response != null) {
            messages.unshift(message);
          }

          this.decryptBulkMessages(messages, decryptedMessages, onComplete);
        });
        return;
      }

      if (message.text == null || message.text == "") {
        //get keys
        this.getAESkeyFromUser(message.senderId, message, function(response){
          if (response != null) {
            messages.unshift(message);
          }

          this.decryptBulkMessages(message, decryptedMessages, onComplete);
        });
        return;
      }
    }else{
      message.text = message.encryptedText;
    }

    decryptedMessages.push(message);

    this.decryptBulkMessages(messages, decryptedMessages, onComplete);
  }

  proto.decryptDownloadedFile = function decryptDownloadedFile(fileData, message, callback){
    if (message.isEncrypted()) {
      var decryptedData = null;
      try{
        var currentSize = fileData.length;
        Log.m(this.session.debuggingMode, "Monkey - encrypted file size: "+currentSize);

        //temporal fix for media sent from web
        if (message.props.device == "web") {
          decryptedData = this.aesDecrypt(fileData, message.senderId);
        }else{
          decryptedData = this.decryptFile(fileData, message.senderId);
        }

        var newSize = decryptedData.length;
        Log.m(this.session.debuggingMode, "Monkey - decrypted file size: "+newSize);

        if (currentSize == newSize) {
          this.getAESkeyFromUser(message.senderId, message, function(response){
            if (response != null) {
              this.decryptDownloadedFile(fileData, message, callback);
            }else{
              callback("Error decrypting downloaded file");
            }
          });
          return;
        }
      }
      catch(error){
        Log.m(this.session.debuggingMode, "===========================");
        Log.m(this.session.debuggingMode, "MONKEY - Fail decrypting: "+message.id+" type: "+message.protocolType);
        Log.m(this.session.debuggingMode, "===========================");
        //get keys
        this.getAESkeyFromUser(message.senderId, message, function(response){
          if (response != null) {
            this.decryptDownloadedFile(fileData, message, callback);
          }else{
            callback("Error decrypting downloaded file");
          }
        });
        return;
      }

      if (decryptedData == null) {
        //get keys
        this.getAESkeyFromUser(message.senderId, message, function(response){
          if (response != null) {
            this.decryptDownloadedFile(fileData, message, callback);
            return;
          }
          callback("Error decrypting downloaded file");
        });
        return;
      }

      fileData = decryptedData;
    }

    if (message.isCompressed()) {
      fileData = decompress(fileData);
    }

    callback(null, fileData);
  }

  proto.compress = function(fileData){
    var binData = this.mok_convertDataURIToBinary(fileData);
    var gzip = new Zlib.Gzip(binData);
    var compressedBinary = gzip.compress(); //descompress
    // Uint8Array to base64
    var compressedArray = new Uint8Array(compressedBinary);
    var compressedBase64 = this.mok_arrayBufferToBase64(compressedArray);

    //this should be added by client 'data:image/png;base64'
    return compressedBase64;
  }

  proto.decompress = function(fileData){
    var binData = this.mok_convertDataURIToBinary(fileData);
    var gunzip = new Zlib.Gunzip(binData);
    var decompressedBinary = gunzip.decompress(); //descompress
    // Uint8Array to base64
    var decompressedArray = new Uint8Array(decompressedBinary);
    var decompressedBase64 = this.mok_arrayBufferToBase64(decompressedArray);

    //this should be added by client 'data:image/png;base64'
    return decompressedBase64;
  }

  proto.generateAndStoreAES = function generateAndStoreAES(){
    var key = CryptoJS.enc.Hex.parse(this.randomString(32));//256 bits
    var iv  = CryptoJS.enc.Hex.parse(this.randomString(16));//128 bits
    this.session.myKey=btoa(key);
    this.session.myIv=btoa(iv);
    //now you have to encrypt
    return this.session.myKey+":"+this.session.myIv;
  }

  proto.randomString = function randomString(length){
    var key = "";
    var hex = "0123456789abcdef";
    for (var i = 0; i < length; i++) {
      key += hex.charAt(Math.floor(Math.random() * 16));
    }
    return key;
  }

  /*
  * API CONNECTOR
  */

  proto.requestSession = function requestSession(){
    this.session.exchangeKeys = new NodeRSA({ b: 2048 }, {encryptionScheme: 'pkcs1'});
    var isSync = false;
    var endpoint = '/user/session';
    var params={ user_info:this.session.user,monkey_id:this.session.id,expiring:this.session.expireSession};

    if (this.session.id != null) {
      endpoint = '/user/key/sync';
      isSync = true;
      params['public_key'] = this.session.exchangeKeys.exportKey('public');
    }

    this.status = this.enums.Status.HANDSHAKE;

    apiconnector.basicRequest('POST', endpoint, params, false, function(err,respObj){

      if(err){
        Log.m(this.session.debuggingMode, 'Monkey - '+err);
        return;
      }

      if (isSync) {
        Log.m(this.session.debuggingMode, 'Monkey - reusing Monkey ID : '+this.session.id);

        this.session.lastTimestamp = respObj.data.last_time_synced;
        this.session.lastMessageId = respObj.data.last_message_id;

        var decryptedAesKeys = this.session.exchangeKeys.decrypt(respObj.data.keys, 'utf8');

        var myAesKeys=decryptedAesKeys.split(":");
        this.session.myKey=myAesKeys[0];
        this.session.myIv=myAesKeys[1];
        
        //var myKeyParams=generateSessionKey();// generates local AES KEY
        //this.keyStore[this.session.id]={key:this.session.myKey,iv:this.session.myIv};
        monkeyKeystore.storeData(this.session.id, this.session.myKey+":"+this.session.myIv, this.session.myKey, this.session.myIv);

        this.startConnection(this.session.id);
        return;
      }

      if (respObj.data.monkeyId == null) {
        Log.m(this.session.debuggingMode, 'Monkey - no Monkey ID returned');
        return;
      }

      this.session.id=respObj.data.monkeyId;
      db.storeMonkeyId(respObj.data.monkeyId);

      var connectParams = {monkey_id:this.session.id};

      this._getEmitter().emit('onSession', connectParams);

      var myKeyParams=this.generateAndStoreAES();// generates local AES KEY

      var key = new NodeRSA(respObj.data.publicKey, 'public', {encryptionScheme: 'pkcs1'});
      var encryptedAES = key.encrypt(myKeyParams, 'base64');

      connectParams['usk'] = encryptedAES;

      //this.keyStore[this.session.id]={key:this.session.myKey, iv:this.session.myIv};
      monkeyKeystore.storeData(this.session.id, this.session.myKey+":"+this.session.myIv, this.session.myKey, this.session.myIv);

      apiconnector.basicRequest('POST', '/user/connect', connectParams, false, function(error, response){
        if(error){
          Log.m(this.session.debuggingMode, 'Monkey - '+error);
          return;
        }
        this.startConnection(this.session.id);
      }.bind(this));
    }.bind(this));
  }/// end of function requestSession

  proto.subscribe = function subscribe(channel, callback){
    apiconnector.basicRequest('POST', '/channel/subscribe/'+channel ,{ monkey_id:this.session.id}, false, function(err,respObj){
      if(err){
        Log.m(this.session.debuggingMode, 'Monkey - '+err);
        return;
      }
      this._getEmitter().emit('onSubscribe', respObj);
    }.bind(this));
  }

  proto.getAllConversations = function getAllConversations (onComplete) {

    apiconnector.basicRequest('GET', '/user/'+this.session.id+'/conversations',{}, false, function(err,respObj){
      if (err) {
        Log.m(this.session.debuggingMode, 'Monkey - FAIL TO GET ALL CONVERSATIONS');
        onComplete(err.toString());
        return;
      }
      Log.m(this.session.debuggingMode, 'Monkey - GET ALL CONVERSATIONS');
      
      var processFunctions = respObj.data.conversations.reduce(function(result, conversation){
        
        result.push(function(callback){

          conversation.last_message = new MOKMessage(this.enums.MOKMessageProtocolCommand.MESSAGE, conversation.last_message);
          var message = conversation.last_message;
          var gotError = false;
          
          if (message.isEncrypted() && message.protocolType != this.enums.MOKMessageType.FILE) {
            try{
              message.text = this.aesDecryptIncomingMessage(message);
              return callback();
            }
            catch(error){
              gotError = true;
              Log.m(this.session.debuggingMode, "===========================");
              Log.m(this.session.debuggingMode, "MONKEY - Fail decrypting: "+message.id+" type: "+message.protocolType);
              Log.m(this.session.debuggingMode, "===========================");
              //get keys
              this.getAESkeyFromUser(message.senderId, message, function(response){
                if (response != null) {
                  message.text = this.aesDecryptIncomingMessage(message);
                  return callback();
                }
                else{
                  return callback();
                }
              }.bind(this));
            }

            if (!gotError && (message.text == null || message.text == "")) {
              //get keys
              this.getAESkeyFromUser(message.senderId, message, function(response){
                if (response != null) {
                  message.text = this.aesDecryptIncomingMessage(message);
                  return callback();
                }
                else{
                  return callback();
                }
              }.bind(this));
            }
          }
          else{
            message.text = message.encryptedText;
            return callback();       
          }

        }.bind(this));
        
        return result;

      }.bind(this),[]);

      async.waterfall(processFunctions, function(error, result){
          if(error){
            onComplete(error.toString(), null);
          }
          else{
            //NOW DELETE CONVERSATIONS WITH LASTMESSAGE NO DECRYPTED
            respObj.data.conversations = respObj.data.conversations.reduce(function(result, conversation){
              
              if(conversation.last_message.protocolType == this.enums.MOKMessageType.TEXT
                && conversation.last_message.encryptedText != conversation.last_message.text )
                result.push(conversation);
              else if(conversation.last_message.protocolType != this.enums.MOKMessageType.TEXT)
                result.push(conversation);

              return result;
            }.bind(this),[]);

            onComplete(null, respObj);
          }
      }.bind(this));

    }.bind(this));
  }

  proto.getConversationMessages = function getConversationMessages(conversationId, numberOfMessages, lastMessageId, onComplete) {
    if (lastMessageId == null) {
      lastMessageId = '';
    }

    apiconnector.basicRequest('GET', '/conversation/messages/'+this.session.id+'/'+conversationId+'/'+numberOfMessages+'/'+lastMessageId,{}, false, function(err,respObj){
      if (err) {
        Log.m(this.session.debuggingMode, 'FAIL TO GET CONVERSATION MESSAGES');
        onComplete(err.toString());
        return;
      }
      Log.m(this.session.debuggingMode, 'GET CONVERSATION MESSAGES');

      var messages = respObj.data.messages;

      var messagesArray = messages.reduce(function(result, message){
        let msg = new MOKMessage(this.enums.MOKMessageProtocolCommand.MESSAGE, message);
        result.push(msg);
        return result;
      },[]);

      this.decryptBulkMessages(messagesArray, [], function(decryptedMessages){
        onComplete(null, decryptedMessages);
      }.bind(this));
    }.bind(this));
  }

  proto.getMessagesSince = function getMessagesSince (timestamp, onComplete) {
    apiconnector.basicRequest('GET', '/user/'+this.session.id+'/messages/'+timestamp,{}, false, function(err,respObj){
      if (err) {
        Log.m(this.session.debuggingMode, 'Monkey - FAIL TO GET MESSAGES');
        onComplete(err.toString());
        return;
      }
      Log.m(this.session.debuggingMode, 'Monkey - GET MESSAGES');
      onComplete(null, respObj);
    }.bind(this));
  }

  proto.downloadFile = function downloadFile(message, onComplete){
    apiconnector.basicRequest('GET', '/file/open/'+message.text+'/base64',{}, false, function(err,fileData){
      if (err) {
        Log.m(this.session.debuggingMode, 'Monkey - Download File Fail');
        onComplete(err.toString());
        return;
      }
      Log.m(this.session.debuggingMode, 'Monkey - Download File OK');
      this.decryptDownloadedFile(fileData, message, function(error, finalData){
        if (error) {
          Log.m(this.session.debuggingMode, 'Monkey - Fail to decrypt downloaded file');
          onComplete(error);
          return;
        }
        onComplete(null, finalData);
      });
    }.bind(this));
  }/// end of function downloadFile

  proto.postMessage = function postMessage(messageObj){
    apiconnector.basicRequest('POST', '/message/new',messageObj, false, function(err,respObj){
      if(err){
        Log.m(this.session.debuggingMode, err);
        return;
      }

      if(parseInt(respObj.status)==0){
        // now you can start the long polling calls or the websocket connection you are ready.
        // we need to do a last validation here with an encrypted data that is sent from the server at this response, to validate keys are correct and the session too.
        Log.m(this.session.debuggingMode, "Message sent is "+JSON.stringify(respObj));
        Log.m(this.session.debuggingMode, "Message sent is "+respObj.data.messageId);
      }
      else{
        //throw error
        Log.m(this.session.debuggingMode, "Error in postMessage "+respObj.message);
      }
    }.bind(this));
  }

  proto.createGroup = function createGroup(members, groupInfo, optionalPush, optionalId, callback){
  //check if I'm already in the proposed members
  if (members.indexOf(this.session.id) == -1) {
    members.push(this.session.id);
  }

  var params = {
    monkey_id:this.session.id,
    members: members.join(),
    info: groupInfo,
    group_id: optionalId,
    push_all_members: optionalPush
  };

  apiconnector.basicRequest('POST', '/group/create',params, false, function(err,respObj){
      if(err){
        Log.m(this.session.debuggingMode, "Monkey - error creating group: "+err);
        return callback(err);
      }
      Log.m(this.session.debuggingMode, "Monkey - Success creating group"+ respObj.data.group_id);

      return callback(null, respObj.data);
    }.bind(this));
  }

  proto.addMemberToGroup = function addMemberToGroup(groupId, newMemberId, optionalPushNewMember, optionalPushExistingMembers, callback){
    var params = {
      monkey_id:this.session.id,
      new_member: newMemberId,
      group_id: groupId,
      push_new_member: optionalPushNewMember,
      push_all_members: optionalPushExistingMembers
    };

    apiconnector.basicRequest('POST', '/group/addmember', params, false, function(err,respObj){
        if(err){
          Log.m(this.session.debuggingMode, 'Monkey - error adding member: '+err);
          return callback(err);
        }

        return callback(null, respObj.data);
    }.bind(this));
  }

  proto.removeMemberFromGroup = function removeMemberFromGroup(groupId, memberId, callback){
    apiconnector.basicRequest('POST', '/group/delete',{ monkey_id:memberId, group_id:groupId }, false, function(err,respObj){
      if(err){
        Log.m(this.session.debuggingMode, 'Monkey - error removing member: '+err);
        return callback(err);
      }

      return callback(null, respObj.data);
    }.bind(this));
  }

  proto.getInfoById = function getInfoById(monkeyId, callback){
    var endpoint = '/info/'+monkeyId;

    //check if it's a group
    if (monkeyId.indexOf("G:") >-1) {
      endpoint = '/group'+endpoint;
    }else{
      endpoint = '/user'+endpoint;
    }

    apiconnector.basicRequest('GET', endpoint ,{}, false, function(err,respObj){
      if(err){
        Log.m(this.session.debuggingMode, 'Monkey - error get info: '+err);
        return callback(err);
      }

      return callback(null, respObj.data);
    }.bind(this));
  }

  proto.getAllMessages = function getAllMessages(){
    return db.getAllMessages();
  }

  proto.getAllMessagesByMonkeyId = function getAllMessagesByMonkeyId(id){
    return db.getAllMessagesByMonkeyId(id);
  }

  proto.getTotalWithoutRead = function getTotalWithoutRead(id){
    return db.getTotalWithoutRead(id);
  }

  proto.getAllMessagesSending = function getAllMessagesSending(){
    return db.getAllMessagesSending();
  }

  proto.deleteAllMessagesFromMonkeyId = function deleteAllMessagesFromMonkeyId(id){
    return db.deleteAllMessagesFromMonkeyId(id);
  }

  proto.setAllMessagesToRead = function setAllMessagesToRead(id){
    return db.setAllMessagesToRead(id);
  }

  proto.getMonkeyId = function getMonkeyId(){
    return db.getMonkeyId();
  }

  proto.getUser = function getUser(){
    return db.getUser(db.getMonkeyId());
  }

  /*
  * Utils
  */

  proto.generateStandardPush = function generateStandardPush (stringMessage){
    return {
      "text": stringMessage,
      "iosData": {
        "alert": stringMessage,
        "sound":"default"
      },
      "andData": {
        "alert": stringMessage
      }
    };
  }

  proto.generateLocalizedPush = function generateLocalizedPush (locKey, locArgs, defaultText, sound){
    var localizedPush = {
      "iosData": {
        "alert": {
          "loc-key": locKey,
          "loc-args": locArgs
        },
        "sound":sound? sound : "default"
      },
      "andData": {
        "loc-key": locKey,
        "loc-args": locArgs
      }
    };

    if (defaultText) {
      localizedPush.text = defaultText;
    }

    return localizedPush;
  }

  proto.checkStatus = function checkStatus(response) {
    if (response.status >= 200 && response.status < 300) {
      return response
    } else {
      var error = new Error(response.statusText)
      error.response = response
      throw error
    }
  }

  proto.parseJSON = function parseJSON(response) {
    return response.json()
  }

  proto.mok_convertDataURIToBinary = function mok_convertDataURIToBinary(dataURI) {
    var raw = window.atob(dataURI);
    var rawLength = raw.length;
    var array = new Uint8Array(new ArrayBuffer(rawLength));

    for(var i = 0; i < rawLength; i++) {
      array[i] = raw.charCodeAt(i);
    }
    return array;
  }

  proto.mok_arrayBufferToBase64 = function mok_arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
  }

  proto.cleanFilePrefix = function cleanFilePrefix(fileData){
    var cleanFileData = fileData;

    //check for possible ;base64,
    if (fileData.indexOf(",") > -1) {
      cleanFileData = fileData.slice(fileData.indexOf(",")+1);
    }

    return cleanFileData;
  }

  proto.mok_getFileExtension = function mok_getFileExtension(fileName){
    var arr = fileName.split('.');
    var extension= arr[arr.length-1];

    return extension;
  }

  /**
  * Alias of addListener
  */
  proto.on = alias('addListener');

  /**
  * Reverts the global {@link Monkey} to its previous value and returns a reference to this version.
  *
  * @return {Function} Non conflicting EventEmitter class.
  */
  Monkey.noConflict = function noConflict() {
    exports.Monkey = originalGlobalValue;
    return Monkey;
  };

  // Expose the class either via AMD, CommonJS or the global object
  if (typeof define === 'function' && define.amd) {
    define(function () {
      return Monkey;
    });
  }
  else if (typeof module === 'object' && module.exports){
    module.exports = Monkey;
  }
  else {
    exports.Monkey = Monkey;
  }
})();
