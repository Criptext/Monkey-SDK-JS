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
var NodeRSA = require('node-rsa');
var CryptoJS = require('node-cryptojs-aes').CryptoJS;

require('es6-promise').polyfill();
require('isomorphic-fetch');

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

  proto.init = function init(appKey, appSecret, userObj, shouldExpireSession, isDebugging){
    if (appKey == null || appSecret == null) {
      throw 'Monkey - To initialize Monkey, you must provide your App Id and App Secret';
      return;
    }

    this.appKey = appKey;
    this.appSecret = appSecret;

    //setup session
    if (userObj != null) {
      this.session.user = userObj;
      this.session.id = userObj.monkeyId;
    }

    if (shouldExpireSession) {
      this.session.expireSession = 1;
    }

    if (isDebugging) {
      this.session.debuggingMode = true;
    }

    this.keyStore={};

    this.domainUrl = 'monkey.criptext.com';
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
    console.log("================");
    console.log("Monkey - sending message: "+finalMessage);
    console.log("================");
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
      message.encryptedText = aesEncrypt(text, this.session.id);
      args.msg = message.encryptedText;
    }

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

    var message = new MOKMessage(MOKMessageProtocolCommand.MESSAGE, args);

    args.id = message.id;
    args.oldId = message.oldId;
    args.props = message.props;
    args.params = message.params;

    if (message.isCompressed()) {
      fileData = this.compress(fileData);
    }

    if (message.isEncrypted()) {
      fileData = this.aesEncrypt(fileData, monkey.session.id);
    }

    var fileToSend = new Blob([fileData.toString()], {type: message.props.file_type});
    fileToSend.name=fileName;

    var data = new FormData();
    //agrega el archivo y la info al form
    data.append('file', fileToSend);
    data.append('data', JSON.stringify(args) );

    this.basicRequest('POST', '/file/new/base64',data, true, function(err,respObj){
      if (err) {
        console.log('Monkey - upload file Fail');
        onComplete(err.toString(), message);
        return;
      }
      console.log('Monkey - upload file OK');
      message.id = respObj.data.messageId;
      onComplete(null, message);

    });

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
    });
  }

  proto.processMOKProtocolMessage = function processMOKProtocolMessage(message){
    console.log("===========================");
    console.log("MONKEY - Message in process: "+message.id+" type: "+message.protocolType);
    console.log("===========================");

    switch(message.protocolType){
      case this.enums.MOKMessageType.TEXT:{
        this.incomingMessage(message);
        break;
      }
      case this.enums.MOKMessageType.FILE:{
        fileReceived(message);
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
        console.log("===========================");
        console.log("MONKEY - Fail decrypting: "+message.id+" type: "+message.protocolType);
        console.log("===========================");
        //get keys
        this.getAESkeyFromUser(message.senderId, message, function(response){
          if (response != null) {
            this.incomingMessage(message);
          }
        });
        return;
      }

      if (message.text == null) {
        //get keys
        this.getAESkeyFromUser(message.senderId, message, function(response){
          if (response != null) {
            this.incomingMessage(message);
          }
        });
      }

      return;
    }

    message.text = message.encryptedText;

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
    console.log("===========================");
    console.log("MONKEY - ACK in process");
    console.log("===========================");

    //Aditional treatment can be done here
    this._getEmitter().emit('onAcknowledge', message);
  }

  proto.requestMessagesSinceTimestamp = function requestMessagesSinceTimestamp(lastTimestamp, quantity, withGroups){
    var args={
      since: lastTimestamp,
      qty: quantity
    };

    if (withGroups == true) {
      args.groups = 1;
    }

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
      this._getEmitter().emit('onConnect', {monkey_id:this.session.id});

      this.sendCommand(this.enums.MOKMessageProtocolCommand.SET, {online:1});
      this.getPendingMessages();
    }.bind(this);

    this.socketConnection.onmessage = function (evt)
    {
      console.log('Monkey - incoming message: '+evt.data);
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
        console.log('Monkey - Websocket closed - Connection closed... '+ evt);
        this.status=this.enums.Status.OFFLINE;
      }else{
        //web server crashed, reconnect
        console.log('Monkey - Websocket closed - Reconnecting... '+ evt);
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
    this.basicRequest('POST', '/user/key/exchange',{ monkey_id:this.session.id, user_to:monkeyId}, false, function(err,respObj){
      if(err){
        console.log('Monkey - error on getting aes keys '+err);
        return;
      }

      console.log('Monkey - Received new aes keys');
      var newParamKeys = this.aesDecrypt(respObj.data.convKey, this.session.id).split(":");
      var newAESkey = newParamKeys[0];
      var newIv = newParamKeys[1];

      var currentParamKeys = this.keyStore[respObj.data.session_to];

      this.keyStore[respObj.data.session_to] = {key:newParamKeys[0],iv:newParamKeys[1]};

      if (typeof(currentParamKeys) == 'undefined') {
        return callback(pendingMessage);
      }

      //check if it's the same key
      if (newParamKeys[0] == currentParamKeys.key && newParamKeys[1] == currentParamKeys.iv) {
        this.requestEncryptedTextForMessage(pendingMessage, function(decryptedMessage){
          callback(decryptedMessage);
        });
        return;
      }
      //it's a new key
      callback(pendingMessage);

    });
  }

  proto.requestEncryptedTextForMessage = function requestEncryptedTextForMessage(message, callback){
    this.basicRequest('GET', '/message/'+message.id+'/open/secure',{}, false, function(err,respObj){
      if(err){
        console.log('Monkey - error on requestEncryptedTextForMessage: '+err);
        return callback(null);
      }

      console.log(respObj);
      message.encryptedText = respObj.data.message;
      message.encryptedText = this.aesDecrypt(message.encryptedText, this.session.id);
      if (message.encryptedText == null) {
        if (message.id > 0) {
          this.session.lastTimestamp = message.datetimeCreation;
          this.session.lastMessageId = message.id;
        }
        return callback(null);
      }
      message.encryptedText = message.text;
      message.setEncrypted(false);
      return callback(message);
    });
  }

  proto.aesDecryptIncomingMessage = function aesDecryptIncomingMessage(message){
    return this.aesDecrypt(message.encryptedText, message.senderId);
  }

  proto.aesDecrypt = function aesDecrypt(dataToDecrypt, monkeyId){
    var aesObj = this.keyStore[monkeyId];
    var aesKey = CryptoJS.enc.Base64.parse(aesObj.key);
    var initV = CryptoJS.enc.Base64.parse(aesObj.iv);
    var cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(dataToDecrypt) });
    var decrypted = CryptoJS.AES.decrypt(cipherParams, aesKey, { iv: initV }).toString(CryptoJS.enc.Utf8);

    return decrypted;
  }

  proto.decryptFile = function decryptFile (fileToDecrypt, monkeyId) {
    var aesObj = this.keyStore[monkeyId];

    var aesKey=CryptoJS.enc.Base64.parse(aesObj.key);
    var initV= CryptoJS.enc.Base64.parse(aesObj.iv);

    var decrypted = CryptoJS.AES.decrypt(fileToDecrypt, aesKey, { iv: initV }).toString(CryptoJS.enc.Base64);

    // console.log('el tipo del archivo decriptado: '+ typeof(decrypted));
    return decrypted;
  }

  proto.aesEncrypt = function aesEncrypt(dataToEncrypt, monkeyId){
    var aesObj = this.keyStore[monkeyId];
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
        console.log("===========================");
        console.log("MONKEY - Fail decrypting: "+message.id+" type: "+message.protocolType);
        console.log("===========================");
        //get keys
        this.getAESkeyFromUser(message.senderId, message, function(response){
          if (response != null) {
            messages.unshift(message);
          }

          this.decryptBulkMessages(messages, decryptedMessages, onComplete);
        });
        return;
      }

      if (message.text == null) {
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
        console.log("Monkey - encrypted file size: "+currentSize);

        //temporal fix for media sent from web
        if (message.props.device == "web") {
          decryptedData = this.aesDecrypt(fileData, message.senderId);
        }else{
          decryptedData = this.decryptFile(fileData, message.senderId);
        }

        var newSize = decryptedData.length;
        console.log("Monkey - decrypted file size: "+newSize);

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
        console.log("===========================");
        console.log("MONKEY - Fail decrypting: "+message.id+" type: "+message.protocolType);
        console.log("===========================");
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

  function compress(fileData){
    var binData = this.mok_convertDataURIToBinary(fileData);
    var gzip = new Zlib.Gzip(binData);
    var compressedBinary = gzip.compress(); //descompress
    // Uint8Array to base64
    var compressedArray = new Uint8Array(compressedBinary);
    var compressedBase64 = this.mok_arrayBufferToBase64(compressedArray);

    //this should be added by client 'data:image/png;base64'
    return compressedBase64;
  }

  function decompress(fileData){
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
    this.session.exchangeKeys = new NodeRSA({b: 2048});
    var isSync = false;
    var endpoint = '/user/session';
    var params={ user_info:this.session.user,monkey_id:this.session.id,expiring:this.session.expireSession};

    if (this.session.id != null) {
      endpoint = '/user/key/sync';
      isSync = true;
      params['public_key'] = this.session.exchangeKeys.exportKey('public');
    }

    this.status = this.enums.Status.HANDSHAKE;

    this.basicRequest('POST', endpoint, params, false, function(err,respObj){

      if(err){
        console.log('Monkey - '+err);
        return;
      }

      if (respObj.data.monkeyId == null) {
        console.log('Monkey - no Monkey ID returned');
        return;
      }

      if (isSync) {
        console.log('Monkey - reusing Monkey ID : '+this.session.id);

        this.session.lastTimestamp = respObj.data.last_time_synced;
        this.session.lastMessageId = respObj.data.last_message_id;

        var decryptedAesKeys = this.session.exchangeKeys.decrypt(respObj.data.keys, 'utf8');

        var myAesKeys=decryptedAesKeys.split(":");
        this.session.myKey=myAesKeys[0];
        this.session.myIv=myAesKeys[1];
        //var myKeyParams=generateSessionKey();// generates local AES KEY
        this.keyStore[monkeyId]={key:this.session.myKey,iv:this.session.myIv};

        this.startConnection(monkeyId);
        return;
      }

      this.session.id=respObj.data.monkeyId;

      var connectParams = {monkey_id:this.session.id};

      this._getEmitter().emit('onSession', connectParams);

      var myKeyParams=this.generateAndStoreAES();// generates local AES KEY

      var key = new NodeRSA(respObj.data.publicKey, 'public');
      var encryptedAES = key.encrypt(myKeyParams, 'base64');

      connectParams['usk'] = encryptedAES;

      this.keyStore[this.session.id]={key:this.session.myKey, iv:this.session.myIv};

      this.basicRequest('POST', '/user/connect', connectParams, false, function(error, response){
        if(error){
          console.log('Monkey - '+error);
          return;
        }
        this.startConnection(this.session.id);
      }.bind(this));
    }.bind(this));
  }/// end of function requestSession

  proto.subscribe = function subscribe(channel, callback){
    this.basicRequest('POST', '/channel/subscribe/'+channel ,{ monkey_id:this.session.id}, false, function(err,respObj){
      if(err){
        console.log('Monkey - '+err);
        return;
      }
      this._getEmitter().emit('onSubscribe', respObj);
    }.bind(this));
  }

  proto.getAllConversations = function getAllConversations (onComplete) {
    this.basicRequest('GET', '/user/'+this.session.id+'/conversations',{}, false, function(err,respObj){
      if (err) {
        console.log('Monkey - FAIL TO GET ALL CONVERSATIONS');
        onComplete(err.toString());
        return;
      }
      console.log('Monkey - GET ALL CONVERSATIONS');
      onComplete(null, respObj);

    });
  }

  proto.getConversationMessages = function getConversationMessages(conversationId, numberOfMessages, lastMessageId, onComplete) {
    if (lastMessageId == null) {
      lastMessageId = '';
    }

    this.basicRequest('GET', '/conversation/messages/'+monkey.session.id+'/'+conversationId+'/'+numberOfMessages+'/'+lastMessageId,{}, false, function(err,respObj){
      if (err) {
        console.log('FAIL TO GET CONVERSATION MESSAGES');
        onComplete(err.toString());
        return;
      }
      console.log('GET CONVERSATION MESSAGES');

      var messages = respObj.data.messages;

      var messagesArray = messages.reduce(function(result, message){
        let msg = new MOKMessage(MOKMessageProtocolCommand.MESSAGE, message);
        result.push(msg);
        return result;
      },[]);

      this.decryptBulkMessages(messagesArray, [], function(decryptedMessages){
        onComplete(null, decryptedMessages);
      });
    });
  }

  proto.getMessagesSince = function getMessagesSince (timestamp, onComplete) {
    this.basicRequest('GET', '/user/'+this.session.id+'/messages/'+timestamp,{}, false, function(err,respObj){
      if (err) {
        console.log('Monkey - FAIL TO GET MESSAGES');
        onComplete(err.toString());
        return;
      }
      console.log('Monkey - GET MESSAGES');
      onComplete(null, respObj);
    });
  }

  proto.downloadFile = function downloadFile(message, onComplete){
    this.basicRequest('GET', '/file/open/'+message.text+'/base64',{}, false, function(err,fileData){
      if (err) {
        console.log('Monkey - Download File Fail');
        onComplete(err.toString());
        return;
      }
      console.log('Monkey - Download File OK');
      this.decryptDownloadedFile(fileData, message, function(error, finalData){
        if (error) {
          console.log('Monkey - Fail to decrypt downloaded file');
          onComplete(error);
          return;
        }
        onComplete(null, finalData);
      });
    });
  }/// end of function downloadFile

  proto.postMessage = function postMessage(messageObj){
    this.basicRequest('POST', '/message/new',messageObj, false, function(err,respObj){
      if(err){
        console.log(err);
        return;
      }

      if(parseInt(respObj.status)==0){
        // now you can start the long polling calls or the websocket connection you are ready.
        // we need to do a last validation here with an encrypted data that is sent from the server at this response, to validate keys are correct and the session too.
        console.log("Message sent is "+JSON.stringify(respObj));
        console.log("Message sent is "+respObj.data.messageId);
      }
      else{
        //throw error
        console.log("Error in postMessage "+respObj.message);
      }
    });
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

  this.basicRequest('POST', '/group/create',params, false, function(err,respObj){
      if(err){
        console.log("Monkey - error creating group: "+err);
        return callback(err);
      }
      console.log("Monkey - Success creating group"+ respObj.data.group_id);

      return callback(null, respObj.data);
    });
  }

  proto.addMemberToGroup = function addMemberToGroup(groupId, newMemberId, optionalPushNewMember, optionalPushExistingMembers, callback){
    var params = {
      monkey_id:this.session.id,
      new_member: newMemberId,
      group_id: groupId,
      push_new_member: optionalPushNewMember,
      push_all_members: optionalPushExistingMembers
    };

    this.basicRequest('POST', '/group/addmember', params, false, function(err,respObj){
        if(err){
          console.log('Monkey - error adding member: '+err);
          return callback(err);
        }

        return callback(null, respObj.data);
    });
  }

  proto.removeMemberFromGroup = function removeMemberFromGroup(groupId, memberId, callback){
    this.basicRequest('POST', '/group/delete',{ monkey_id:memberId, group_id:groupId }, false, function(err,respObj){
      if(err){
        console.log('Monkey - error removing member: '+err);
        return callback(err);
      }

      return callback(null, respObj.data);
    });
  }

  proto.getInfoById = function getInfoById(monkeyId, callback){
    var endpoint = '/info/'+monkeyId;

    //check if it's a group
    if (monkeyId.indexOf("G:") >-1) {
      endpoint = '/group'+endpoint;
    }else{
      endpoint = '/user'+endpoint;
    }

    this.basicRequest('GET', endpoint ,{}, false, function(err,respObj){
      if(err){
        console.log('Monkey - error get info: '+err);
        return callback(err);
      }

      return callback(null, respObj.data);
    });
  }

  proto.basicRequest = function basicRequest(method, endpoint, params, isFile, callback){

    var basic= this.getAuthParamsBtoA(this.appKey+":"+this.appSecret);

    var reqUrl = this.domainUrl+endpoint;

    if (this.session.debuggingMode) {
      reqUrl = 'http://'+reqUrl;
    }else{
      reqUrl = 'https://'+reqUrl;
    }

    var headersReq = {
      'Accept': '*/*',
      'Authorization': 'Basic '+ basic
    };

    var data = params;
    //check if it's not file
    if (!isFile) {
      headersReq['Content-Type'] = 'application/json';
      data = JSON.stringify({ data: JSON.stringify(params) });
    }

    fetch(reqUrl, {
      method: method,
      credentials: 'include',
      headers: headersReq,
      body: data
    }).then(this.checkStatus)
    .then(this.parseJSON)
    .then(function(respObj) {
      callback(null,respObj);
    }).catch(function(error) {
      callback(error);
    });// end of AJAX CALL
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

  proto.getAuthParamsBtoA = function getAuthParamsBtoA(connectAuthParamsString){

    //window.btoa not supported in <=IE9
    if (window.btoa) {
      var basic = window.btoa(connectAuthParamsString);
    }
    else{
      //for <= IE9
      var base64 = {};
      base64.PADCHAR = '=';
      base64.ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

      base64.makeDOMException = function() {
        // sadly in FF,Safari,Chrome you can't make a DOMException
        var e, tmp;

        try {
          return new DOMException(DOMException.INVALID_CHARACTER_ERR);
        } catch (tmp) {
          // not available, just passback a duck-typed equiv
          // https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Error
          // https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Error/prototype
          var ex = new Error("DOM Exception 5");

          // ex.number and ex.description is IE-specific.
          ex.code = ex.number = 5;
          ex.name = ex.description = "INVALID_CHARACTER_ERR";

          // Safari/Chrome output format
          ex.toString = function() { return 'Error: ' + ex.name + ': ' + ex.message; };
          return ex;
        }
      }

      base64.getbyte64 = function(s,i) {
        // This is oddly fast, except on Chrome/V8.
        //  Minimal or no improvement in performance by using a
        //   object with properties mapping chars to value (eg. 'A': 0)
        var idx = base64.ALPHA.indexOf(s.charAt(i));
        if (idx === -1) {
          throw base64.makeDOMException();
        }
        return idx;
      }

      base64.decode = function(s) {
        // convert to string
        s = '' + s;
        var getbyte64 = base64.getbyte64;
        var pads, i, b10;
        var imax = s.length
        if (imax === 0) {
          return s;
        }

        if (imax % 4 !== 0) {
          throw base64.makeDOMException();
        }

        pads = 0
        if (s.charAt(imax - 1) === base64.PADCHAR) {
          pads = 1;
          if (s.charAt(imax - 2) === base64.PADCHAR) {
            pads = 2;
          }
          // either way, we want to ignore this last block
          imax -= 4;
        }

        var x = [];
        for (i = 0; i < imax; i += 4) {
          b10 = (getbyte64(s,i) << 18) | (getbyte64(s,i+1) << 12) |
          (getbyte64(s,i+2) << 6) | getbyte64(s,i+3);
          x.push(String.fromCharCode(b10 >> 16, (b10 >> 8) & 0xff, b10 & 0xff));
        }

        switch (pads) {
          case 1:
          b10 = (getbyte64(s,i) << 18) | (getbyte64(s,i+1) << 12) | (getbyte64(s,i+2) << 6);
          x.push(String.fromCharCode(b10 >> 16, (b10 >> 8) & 0xff));
          break;
          case 2:
          b10 = (getbyte64(s,i) << 18) | (getbyte64(s,i+1) << 12);
          x.push(String.fromCharCode(b10 >> 16));
          break;
        }
        return x.join('');
      }

      base64.getbyte = function(s,i) {
        var x = s.charCodeAt(i);
        if (x > 255) {
          throw base64.makeDOMException();
        }
        return x;
      }

      base64.encode = function(s) {
        if (arguments.length !== 1) {
          throw new SyntaxError("Not enough arguments");
        }
        var padchar = base64.PADCHAR;
        var alpha   = base64.ALPHA;
        var getbyte = base64.getbyte;

        var i, b10;
        var x = [];

        // convert to string
        s = '' + s;

        var imax = s.length - s.length % 3;

        if (s.length === 0) {
          return s;
        }
        for (i = 0; i < imax; i += 3) {
          b10 = (getbyte(s,i) << 16) | (getbyte(s,i+1) << 8) | getbyte(s,i+2);
          x.push(alpha.charAt(b10 >> 18));
          x.push(alpha.charAt((b10 >> 12) & 0x3F));
          x.push(alpha.charAt((b10 >> 6) & 0x3f));
          x.push(alpha.charAt(b10 & 0x3f));
        }
        switch (s.length - imax) {
          case 1:
          b10 = getbyte(s,i) << 16;
          x.push(alpha.charAt(b10 >> 18) + alpha.charAt((b10 >> 12) & 0x3F) +
          padchar + padchar);
          break;
          case 2:
          b10 = (getbyte(s,i) << 16) | (getbyte(s,i+1) << 8);
          x.push(alpha.charAt(b10 >> 18) + alpha.charAt((b10 >> 12) & 0x3F) +
          alpha.charAt((b10 >> 6) & 0x3f) + padchar);
          break;
        }
        return x.join('');
      }
      basic = base64.encode(connectAuthParamsString);
    }

    return basic;
  }
  /**
  * Alias of addListener
  */
  // proto.on = alias('addListener');

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
