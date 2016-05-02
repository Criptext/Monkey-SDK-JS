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
  NETWORKING
  */

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
      this.socketConnection = new WebSocket('ws://'+this.domainUrl+'/websockets?monkey_id='+monkey_id+'&p='+token,'criptext-protocol').bind(this);
    }
    else{
      this.socketConnection = new WebSocket('wss://'+this.domainUrl+'/websockets?monkey_id='+monkey_id+'&p='+token,'criptext-protocol').bind(this);
    }

    this.socketConnection.onopen = function () {
      this.status=this.enums.Status.ONLINE;
      this._getEmitter().emit('onConnect', {monkey_id:this.session.id});

      this.sendCommand(this.enums.MOKMessageProtocolCommand.SET, {online:1});
      this.getPendingMessages();
    };

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
    };

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
    };
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
