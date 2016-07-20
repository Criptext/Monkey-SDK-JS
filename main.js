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
var async = require('async');
var Push = require('push.js');
require('offline-js');

const zlib = require('zlib');

const MESSAGE_EVENT = 'Message';
const MESSAGE_FAIL_EVENT = 'MessageFail';
const MESSAGE_UNSEND_EVENT = 'MessageUnsend';
const ACKNOWLEDGE_EVENT = 'Acknowledge';
const NOTIFICATION_EVENT = 'Notification';

const GROUP_CREATE_EVENT = 'GroupCreate';
const GROUP_ADD_EVENT = 'GroupAdd';
const GROUP_REMOVE_EVENT = 'GroupRemove';
const GROUP_LIST_EVENT = 'GroupList';

const CHANNEL_SUBSCRIBE_EVENT = 'ChannelSubscribe';
const CHANNEL_MESSAGE_EVENT = 'ChannelMessage';

const STATUS_CHANGE_EVENT = 'StatusChange';

const SESSION_EVENT = 'Session';
const CONNECT_EVENT = 'Connect';
const DISCONNECT_EVENT = 'Disconnect';

const CONVERSATION_OPEN_EVENT = 'ConversationOpen';
const CONVERSATION_OPEN_RESPONSE_EVENT = 'ConversationOpenResponse';
const CONVERSATION_CLOSE_EVENT = 'ConversationClose'


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

  proto.exchangeKeys = 0;

  proto.session = {
    id:null,
    user: null,
    lastTimestamp: 0,
    expireSession: 0,
    debuggingMode: false,
    autoSave: true
  }

  /*
  * Session stuff
  */

  proto.init = function init(appKey, appSecret, userObj, ignoreHook, shouldExpireSession, isDebugging, autoSync, autoSave, callback){
    if (appKey == null || appSecret == null) {
      throw 'Monkey - To initialize Monkey, you must provide your App Id and App Secret';
    }

    callback = (typeof callback == "function") ? callback : function () { };

    if (userObj == null) {
      userObj = {};
    }

    this.appKey = appKey;
    this.appSecret = appSecret;
    this.autoSync = autoSync;

    if (shouldExpireSession) {
      this.session.expireSession = 1;
    }

    this.session.autoSave = autoSave || true;
    this.domainUrl = 'monkey.criptext.com';
    this.session.ignore = ignoreHook;

    if (isDebugging) {
      this.session.debuggingMode = true;
      this.domainUrl = 'stage.monkey.criptext.com'
    }

    //this.keyStore={};
    apiconnector.init(this);

    //setup socketConnection
    this.socketConnection= null

    Offline.options = {checks: {xhr: {url: 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url=www.google.com&format=json'}}};
    //setup offline events
    Offline.on('confirmed-up', function () {
      console.log('connectivity up!');
      var storedMonkeyId = db.getMonkeyId();

      if (this.socketConnection == null && storedMonkeyId != null && storedMonkeyId != '') {
        this.startConnection(this.session.id);
      }
    }.bind(this));

    Offline.on('confirmed-down', function () {
      console.log('connectivity down');
      if (this.socketConnection != null) {
        this.socketConnection.onclose = function(){};
        this.socketConnection.close();
        this.socketConnection = null;
      }

      this._getEmitter().emit(DISCONNECT_EVENT);
    }.bind(this));

    var storedMonkeyId = db.getMonkeyId();

    if (storedMonkeyId != null && storedMonkeyId == userObj.monkeyId) {
      var user = this.getUser();

      this.startConnection(this.session.id);
      return callback(null, user);
    }



    this.session.user = userObj || {};
    this.session.id = this.session.user.monkeyId;

    setTimeout(function(){
      this.requestSession(callback);
    }.bind(this),
    500);

    return this;
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

    args.push = JSON.stringify(optionalPush);

    return args;
  }

  proto.sendCommand = function sendCommand(command, args){
    var finalMessage = JSON.stringify({cmd:command,args:args});
    Log.m(this.session.debuggingMode, "================");
    Log.m(this.session.debuggingMode, "Monkey - sending message: "+finalMessage);
    Log.m(this.session.debuggingMode, "================");

    try {
      this.socketConnection.send(finalMessage);
    } catch (e) {
      //reset watchdog state, probably there was a disconnection
      console.log('Monkey - Error sending message: '+e);
      watchdog.didRespondSync = true;
    }

    return this;
  }

  proto.sendOpenToUser = function sendOpenToUser(monkeyId){
    this.sendCommand(this.enums.ProtocolCommand.OPEN, {rid: monkeyId});
  }

  proto.openConversation = alias('sendOpenToUser');

  proto.closeConversation = function closeConversation(monkeyId){
    this.sendCommand(this.enums.ProtocolCommand.CLOSE, {rid: monkeyId});
  }

  proto.sendMessage = function sendMessage(text, recipientMonkeyId, optionalParams, optionalPush){
    return this.sendText(text, recipientMonkeyId, false, optionalParams, optionalPush);
  }

  proto.sendEncryptedMessage = function sendEncryptedMessage(text, recipientMonkeyId, optionalParams, optionalPush){
    return this.sendText(text, recipientMonkeyId, true, optionalParams, optionalPush);
  }

  proto.sendText = function sendText(text, recipientMonkeyId, shouldEncrypt, optionalParams, optionalPush){
    var props = {
      device: "web",
      encr: shouldEncrypt? 1 : 0,
      encoding: 'utf8',
    };

    //encode to base64 if not encrypted to preserve special characters
    if (!shouldEncrypt) {
      text = new Buffer(text).toString('base64');
      props.encoding = 'base64';
    }
    var args = this.prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
    args.msg = text;
    args.type = this.enums.MessageType.TEXT;

    var message = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, args);

    args.id = message.id;
    args.oldId = message.oldId;

    if (message.isEncrypted()) {
      message.encryptedText = this.aesEncrypt(text, this.session.id);
      args.msg = message.encryptedText;
    }

    message.args = args;

    if (this.session.autoSave) {
      db.storeMessage(message);
    }

    this.sendCommand(this.enums.ProtocolCommand.MESSAGE, args);

    watchdog.messageInTransit(function(){
      this.socketConnection.onclose = function(){};
      this.socketConnection.close();
      setTimeout(function(){
        this.startConnection(this.session.id)
      }.bind(this), 5000);
    }.bind(this));

    return message;
  }

  proto.sendNotification = function sendNotification(recipientMonkeyId, optionalParams, optionalPush){
    var props = {
      device: "web"
    };

    var args = this.prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
    args.type = this.enums.MessageType.NOTIF;

    var message = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, args);

    args.id = message.id;
    args.oldId = message.oldId;

    this.sendCommand(this.enums.ProtocolCommand.MESSAGE, args);

    return message;
  }

  proto.sendTemporalNotification = function sendTemporalNotification(recipientMonkeyId, optionalParams, optionalPush){
    var props = {
      device: "web"
    };

    var args = this.prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
    args.type = this.enums.MessageType.TEMP_NOTE;

    var message = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, args);

    args.id = message.id;
    args.oldId = message.oldId;

    this.sendCommand(this.enums.ProtocolCommand.MESSAGE, args);

    return message;
  }

  proto.publish = function publish(text, channelName, optionalParams){
    var props = {
      device: "web",
      encr: 0
    };

    return this.sendText(this.enums.ProtocolCommand.PUBLISH, text, channelName, props, optionalParams);
  }

  proto.sendFile = function sendFile(data, recipientMonkeyId, fileName, mimeType, fileType, shouldCompress, optionalParams, optionalPush, callback){

    callback = (typeof callback == "function") ? callback : function () { };
    data = this.cleanFilePrefix(data);
    var binData = new Buffer(data, 'base64');

    var props = {
      device: "web",
      encr: 0,
      file_type: fileType,
      ext: this.mok_getFileExtension(fileName),
      filename: fileName,
      size: binData.length
    };

    if (mimeType) {
      props.mime_type = mimeType;
    }

    if (shouldCompress) {
      props.cmpr = "gzip";
    }

    var mokMessage = this.createFileMessage(recipientMonkeyId, fileName, props, optionalParams, optionalPush);

    async.waterfall([
      function(callbackAsync){
        if (!shouldCompress) {
          return callbackAsync(null, data);
        }

        this.compress(binData, function(error, compressedData){
          if (error) {
            return callbackAsync(error);
          }
          callbackAsync(null, compressedData);
        });
      }.bind(this),
      function(finalData, callbackAsync){
        this.uploadFile(finalData, recipientMonkeyId, fileName, props, optionalParams, optionalPush, mokMessage.id, function(error, message){
          if (error) {
            callbackAsync(error, message);
          }

          if (this.session.autoSave) {
            db.storeMessage(message);
          }
          callbackAsync(null, message);
        }.bind(this));
      }.bind(this)],function(error, message){
          callback(error, message);
    });

    return mokMessage;
  }

  proto.sendEncryptedFile = function sendEncryptedFile(data, recipientMonkeyId, fileName, mimeType, fileType, shouldCompress, optionalParams, optionalPush, callback){

    callback = (typeof callback == "function") ? callback : function () { };
    data = this.cleanFilePrefix(data);
    var binData = new Buffer(data, 'base64');

    var props = {
      device: "web",
      encr: 1,
      file_type: fileType,
      ext: this.mok_getFileExtension(fileName),
      filename: fileName,
      size: binData.length
    };

    if (mimeType) {
      props.mime_type = mimeType;
    }

    if (shouldCompress) {
      props.cmpr = "gzip";
    }

    var mokMessage = this.createFileMessage(recipientMonkeyId, fileName, props, optionalParams, optionalPush);

    async.waterfall([
      function(callbackAsync){
        if (!shouldCompress) {
          return callbackAsync(null, data);
        }

        this.compress(binData, function(error, compressedData){
          if (error) {
            return callbackAsync(error);
          }
          callbackAsync(null, compressedData);
        });
      }.bind(this),
      function(finalData, callbackAsync){
        this.uploadFile(finalData, recipientMonkeyId, fileName, props, optionalParams, optionalPush, mokMessage.id, function(error, message){
          if (error) {
            callbackAsync(error, message);
          }

          if (this.session.autoSave) {
            db.storeMessage(message);
          }
          callbackAsync(null, message);
        }.bind(this));
      }.bind(this)],function(error, message){
          callback(error, message);
    });

    return mokMessage;
  }

  proto.uploadFile = function uploadFile(fileData, recipientMonkeyId, fileName, props, optionalParams, optionalPush, optionalId, callback) {

    callback = (typeof callback == "function") ? callback : function () { };

    var args = this.prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
    args.msg = fileName;
    args.type = this.enums.MessageType.FILE;

    var message = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, args);

    if (optionalId != null) {
      message.id = optionalId;
      message.oldId = optionalId;
    }

    args.id = message.id;
    args.oldId = message.oldId;
    args.props = message.props;
    args.params = message.params;

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
        this._getEmitter().emit(MESSAGE_FAIL_EVENT, message.id);
        return callback(err.toString(), message);
      }
      Log.m(this.session.debuggingMode, 'Monkey - upload file OK');
      message.id = respObj.data.messageId;
      callback(null, message);

    }.bind(this));

    return message;
  }

  proto.createFileMessage = function createFileMessage(recipientMonkeyId, fileName, props, optionalParams, optionalPush){

    var args = this.prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
    args.msg = fileName;
    args.type = this.enums.MessageType.FILE;

    var message = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, args);

    args.id = message.id;
    args.oldId = message.oldId;

    message.args = args;
    return message;
  };

  proto.getPendingMessages = function getPendingMessages(timestamp){
    var finalTimestamp = timestamp || this.session.lastTimestamp;
    this.requestMessagesSinceTimestamp(finalTimestamp, 15, false);
  }

  proto.processSyncMessages = function processSyncMessages(messages, remaining){
    this.processMultipleMessages(messages);

    if (remaining > 0) {
      this.requestMessagesSinceTimestamp(this.session.lastTimestamp, 15, false);
    }
  }

  proto.processMultipleMessages = function processMultipleMessages(messages){
    messages.map(function(message){
      let msg = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, message);
      this.processMOKProtocolMessage(msg);
    }.bind(this));
  }

  proto.processMOKProtocolMessage = function processMOKProtocolMessage(message){
    Log.m(this.session.debuggingMode, "===========================");
    Log.m(this.session.debuggingMode, "MONKEY - Message in process: "+message.id+" type: "+message.protocolType);
    Log.m(this.session.debuggingMode, "===========================");

    switch(message.protocolType){
      case this.enums.MessageType.TEXT:{
        this.incomingMessage(message);
        break;
      }
      case this.enums.MessageType.FILE:{
        this.fileReceived(message);
        break;
      }
      case this.enums.MessageType.TEMP_NOTE:{
        this._getEmitter().emit(NOTIFICATION_EVENT, {senderId: message.senderId, recipientId: message.recipientId, params: message.params});
        break;
      }
      case this.enums.ProtocolCommand.DELETE:{

        this._getEmitter().emit(MESSAGE_UNSEND_EVENT, {id: msg.props.message_id, senderId: msg.senderId, recipientId: msg.recipientId});
        break;
      }
      default:{

        if (message.id > 0 && message.datetimeCreation > this.session.lastTimestamp) {
          this.session.lastTimestamp = message.datetimeCreation;
          if (this.session.autoSave) {
            db.storeUser(this.session.id, this.session);
          }
        }

        //check for group notifications
        if (message.props != null && message.props.monkey_action != null) {
          this.dispatchGroupNotification(message);
          return;
        }

        this._getEmitter().emit(NOTIFICATION_EVENT, {senderId: message.senderId, recipientId: message.recipientId, params: message.params});
        break;
      }
    }
  }

  proto.dispatchGroupNotification = function dispatchGroupNotification(message){
    var paramsGroup;
    switch (message.props.monkey_action) {
      case this.enums.GroupAction.CREATE:{
        paramsGroup = {
          'id': message.props.group_id,
          'members': message.props.members.split(','),
          'info': message.props.info
        };

        this._getEmitter().emit(GROUP_CREATE_EVENT, paramsGroup);
        break;
      }
      case this.enums.GroupAction.NEW_MEMBER:{
        paramsGroup = {
          'id': message.recipientId,
          'member': message.props.new_member
        };

        this._getEmitter().emit(GROUP_ADD_EVENT, paramsGroup);
        break;
      }
      case this.enums.GroupAction.REMOVE_MEMBER:{
        paramsGroup = {
          'id': message.recipientId,
          'member': message.senderId
        };

        this._getEmitter().emit(GROUP_REMOVE_EVENT, paramsGroup);
        break;
      }
      default:{
        this._getEmitter().emit(NOTIFICATION_EVENT, message);
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

      if (message.text == null || message.text === "") {
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
      //check if it needs decoding
      if (message.props.encoding != null && message.props.encoding != 'utf8') {
        let decodedText = new Buffer(message.encryptedText, message.props.encoding).toString('utf8');
        message.text = decodedText;
      }
    }

    var currentTimestamp = this.session.lastTimestamp;

    if (message.id > 0 && message.datetimeCreation > this.session.lastTimestamp) {
      this.session.lastTimestamp = message.datetimeCreation;

      if (this.session.autoSave) {
        db.storeUser(this.session.id, this.session);
      }
    }

    if (this.session.autoSave) {
      db.storeMessage(message);
    }

    switch (message.protocolCommand){
      case this.enums.ProtocolCommand.MESSAGE:{
        this._getEmitter().emit(MESSAGE_EVENT, message);
        break;
      }
      case this.enums.ProtocolCommand.PUBLISH:{
        this._getEmitter().emit(CHANNEL_MESSAGE_EVENT, message);
        break;
      }
    }

    //update last_time_synced if needed
    if (currentTimestamp == 0 && this.session.lastTimestamp > 0) {
      this.getPendingMessages();
    }
  }

  proto.createPush = function createPush(title, body, timeout, tag, icon, onClick){

    var myTitle = title || 'New Message';
    var myTag = tag || (new Date().getTime() / 1000);
    onClick = (typeof onClick == "function") ? onClick : function () { Push.close(myTag) };

    var params = {
      body: body || 'You received a new message',
      timeout: timeout || 3,
      tag: myTag,
      onClick: onClick
    };

    if (icon != null) {
      params.icon = {
        x16: icon,
        x32: icon
      };
    }

    Push.create(myTitle, params);
  }

  proto.closePush = function closePush(tag){
    Push.close(tag);
  }

  proto.fileReceived = function fileReceived(message){
    if (message.id > 0 && message.datetimeCreation > this.session.lastTimestamp) {
      this.session.lastTimestamp = message.datetimeCreation;
      if (this.session.autoSave) {
        db.storeUser(this.session.id, this.session);
      }
    }

    if (this.session.autoSave) {
      db.storeMessage(message);
    }

    this._getEmitter().emit(MESSAGE_EVENT, message);
  }

  proto.processMOKProtocolACK = function processMOKProtocolACK(message){
    Log.m(this.session.debuggingMode, "===========================");
    Log.m(this.session.debuggingMode, "MONKEY - ACK in process");
    Log.m(this.session.debuggingMode, "===========================");

    if(message.props.status == "52"){
      message.readByUser = true;
    }

    if(message.id != "0"){
      var storedMessage = db.getMessageById(message.oldId);

      //if message was already sent, then look for it with the other id
      if (storedMessage == null || storedMessage === "") {
        storedMessage = db.getMessageById(message.id);
      }

      //if message doesn't exists locally, sync messages
      if (storedMessage == null || storedMessage === "") {
        this.getPendingMessages();
      }else{

        storedMessage.id = message.id;
        db.deleteMessageById(message.oldId);

        if (this.session.autoSave) {
          db.storeMessage(storedMessage);
        }
      }

    }

    var ackParams = {};

    if (message.protocolType == this.enums.ProtocolCommand.OPEN) {
      ackParams.lastOpenMe = message.props.last_open_me;
      ackParams.lastSeen = message.props.last_seen;
      ackParams.online = message.props.online == 1;
      this._getEmitter().emit(CONVERSATION_OPEN_RESPONSE_EVENT, ackParams);
      return;
    }

    ackParams.newId = message.props.new_id;
    ackParams.oldId = message.props.old_id;
    ackParams.senderId = message.senderId;
    ackParams.recipientId = message.recipientId;
    ackParams.status = message.props.status

    this._getEmitter().emit(ACKNOWLEDGE_EVENT, ackParams);

  }

  proto.resendPendingMessages = function resendPendingMessages(){
    var arrayMessages = db.getPendingMessages();

    for (var i = 0; i < arrayMessages.length; i++) {
      var msg = arrayMessages[i];
      this.sendCommand(msg.protocolCommand, msg.args);
    }

    //set watchdog
    if (arrayMessages.length > 0) {
      watchdog.messageInTransit(function(){
        this.socketConnection.onclose = function(){};
        this.socketConnection.close();
        setTimeout(function(){
          this.startConnection(this.session.id);
        }.bind(this), 5000);
      }.bind(this));

      //resend pending messages just in case
      setTimeout(function(){
        this.resendPendingMessages();
      }.bind(this), 5000);
    }
  }

  proto.requestMessagesSinceTimestamp = function requestMessagesSinceTimestamp(lastTimestamp, quantity, withGroups){
    if (this.socketConnection == null) {

    }
    var args={
      since: lastTimestamp,
      qty: quantity
    };

    if (withGroups == true) {
      args.groups = 1;
    }

    watchdog.startWatchingSync(function(){
      this.socketConnection.onclose = function(){};
      this.socketConnection.close();
      setTimeout(function(){
        this.startConnection(this.session.id)
      }.bind(this), 5000);
    }.bind(this));

    this.sendCommand(this.enums.ProtocolCommand.SYNC, args);
  }

  proto.startConnection = function startConnection(monkey_id){
    var storedMonkeyId = db.getMonkeyId();

    if (storedMonkeyId == null || storedMonkeyId == '') {
      throw 'Monkey - Trying to connect to socket when there\'s no local session';
    }

    this.status = this.enums.Status.CONNECTING;
    this._getEmitter().emit(STATUS_CHANGE_EVENT);
    var token=this.appKey+":"+this.appSecret;

    if(this.session.debuggingMode){ //no ssl
      this.socketConnection = new WebSocket('ws://'+this.domainUrl+'/websockets?monkey_id='+monkey_id+'&p='+token,'criptext-protocol');
    }
    else{
      this.socketConnection = new WebSocket('wss://'+this.domainUrl+'/websockets?monkey_id='+monkey_id+'&p='+token,'criptext-protocol');
    }

    this.socketConnection.onopen = function () {
      this.status=this.enums.Status.ONLINE;
      this._getEmitter().emit(STATUS_CHANGE_EVENT);
      if (this.session.user == null) {
        this.session.user = {};
      }
      this.session.user.monkeyId = this.session.id;
      this._getEmitter().emit(CONNECT_EVENT, this.session.user);

      this.sendCommand(this.enums.ProtocolCommand.SET, {online:1});

      this.resendPendingMessages();

      if(this.autoSync){
        this.getPendingMessages();
      }
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
        case this.enums.ProtocolCommand.MESSAGE:{
          //check if sync is in process, discard any messages if so
          if (!watchdog.didRespondSync) {
            return;
          }
          this.processMOKProtocolMessage(msg);
          break;
        }
        case this.enums.ProtocolCommand.PUBLISH:{
          this.processMOKProtocolMessage(msg);
          break;
        }
        case this.enums.ProtocolCommand.ACK:{
          //msg.protocolCommand = ProtocolCommand.ACK;
          //msg.monkeyType = set status value from props
          this.processMOKProtocolACK(msg);
          break;
        }
        case this.enums.ProtocolCommand.GET:{
          if (jsonres.args.type == this.enums.GetType.GROUPS) {
            msg.protocolCommand= this.enums.ProtocolCommand.GET;
            msg.protocolType = this.enums.MessageType.NOTIF;
            //monkeyType = MOKGroupsJoined;
            msg.text = jsonres.args.messages;


            this._getEmitter().emit(GROUP_LIST_EVENT, {groups: msg.text.split(',')});
          }

          break;
        }
        case this.enums.ProtocolCommand.SYNC:{
          //notify watchdog
          switch(jsonres.args.type){
            case this.enums.SyncType.HISTORY:{
              var arrayMessages = jsonres.args.messages;
              var remaining = jsonres.args.remaining_messages;

              watchdog.didRespondSync=true;

              this.processSyncMessages(arrayMessages, remaining);

              break;
            }
            case this.enums.SyncType.GROUPS:{
              msg.protocolCommand= this.enums.ProtocolCommand.GET;
              msg.protocolType = this.enums.MessageType.NOTIF;
              //monkeyType = MOKGroupsJoined;
              msg.text = jsonres.args.messages;
              this._getEmitter().emit(GROUP_LIST_EVENT, {groups: msg.text.split(',')});
              break;
            }
          }

          break;
        }
        case this.enums.ProtocolCommand.OPEN:{
          msg.protocolCommand = this.enums.ProtocolCommand.OPEN;
          this._getEmitter().emit(CONVERSATION_OPEN_EVENT, msg);
          db.setAllMessagesToRead(msg.senderId);
          break;
        }
        case this.enums.ProtocolCommand.DELETE:{

          this._getEmitter().emit(MESSAGE_UNSEND_EVENT, {id: msg.id, senderId: msg.senderId, recipientId: msg.recipientId});
          break;
        }
        case this.enums.ProtocolCommand.CLOSE:{
          this._getEmitter().emit(CONVERSATION_CLOSE_EVENT, {senderId: msg.senderId, recipientId: msg.recipientId});
          break;
        }
        default:{
          this._getEmitter().emit(NOTIFICATION_EVENT, msg);
          break;
        }
      }
    }.bind(this);

    this.socketConnection.onclose = function(evt)
    {
      //reset watchdog state
      watchdog.didRespondSync = true;
      //check if the web server disconnected me
      if (evt.wasClean) {
        Log.m(this.session.debuggingMode, 'Monkey - Websocket closed - Connection closed... '+ evt);
        this.status=this.enums.Status.OFFLINE;
      }else{
        //web server crashed, reconnect
        Log.m(this.session.debuggingMode, 'Monkey - Websocket closed - Reconnecting... '+ evt);
        this.status=this.enums.Status.CONNECTING;
        setTimeout(function(){
          this.startConnection(monkey_id)
        }.bind(this), 2000 );
      }
      this._getEmitter().emit(STATUS_CHANGE_EVENT);
      this._getEmitter().emit(DISCONNECT_EVENT);
    }.bind(this);
  }

  /*
  * Security
  */

  proto.getAESkeyFromUser = function getAESkeyFromUser(monkeyId, pendingMessage, callback){

    callback = (typeof callback == "function") ? callback : function () { };
    apiconnector.basicRequest('POST', '/user/key/exchange',{ monkey_id:this.session.id, user_to:monkeyId}, false, function(err,respObj){

      if(err){
        Log.m(this.session.debuggingMode, 'Monkey - error on getting aes keys '+err);
        return callback(null);
      }

      Log.m(this.session.debuggingMode, 'Monkey - Received new aes keys');
      var newParamKeys = this.aesDecrypt(respObj.data.convKey, this.session.id).split(":");
      var newAESkey = newParamKeys[0];
      var newIv = newParamKeys[1];

      //this.keyStore[respObj.data.session_to] = {key:newParamKeys[0],iv:newParamKeys[1]};
      monkeyKeystore.storeData(respObj.data.session_to, newAESkey+":"+newIv, this.session.myKey, this.session.myIv);

      return callback(pendingMessage);
    }.bind(this));
  }

  proto.requestEncryptedTextForMessage = function requestEncryptedTextForMessage(message, callback){

    callback = (typeof callback == "function") ? callback : function () { };
    apiconnector.basicRequest('GET', '/message/'+message.id+'/open/secure',{}, false, function(err,respObj){
      if(err){
        Log.m(this.session.debuggingMode, 'Monkey - error on requestEncryptedTextForMessage: '+err);
        return callback(null);
      }

      message.encryptedText = respObj.data.message;
      message.text = message.encryptedText;

      //check if it's a group
      if (message.recipientId.indexOf("G:") >-1) {
        message.encryptedText = this.aesDecrypt(message.encryptedText, message.senderId);
      }else{
        message.encryptedText = this.aesDecrypt(message.encryptedText, this.session.id);
      }

      if (message.encryptedText == null) {
        if (message.id > 0 && message.datetimeCreation > this.session.lastTimestamp) {
          this.session.lastTimestamp = message.datetimeCreation;
          if (this.session.autoSave) {
            db.storeUser(this.session.id, this.session);
          }
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
    onComplete = (typeof onComplete == "function") ? onComplete : function () { };
    if(!(typeof messages != "undefined" && messages != null && messages.length > 0)){
      return onComplete(decryptedMessages);
    }

    var message = messages.shift();

    if (message.isEncrypted() && message.protocolType != this.enums.MessageType.FILE) {
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
        }.bind(this));
        return;
      }

      if (message.text == null || message.text === "") {
        //get keys
        this.getAESkeyFromUser(message.senderId, message, function(response){
          if (response != null) {
            messages.unshift(message);
          }

          this.decryptBulkMessages(message, decryptedMessages, onComplete);
        }.bind(this));
        return;
      }
    }else{
      message.text = message.encryptedText;
      //check if it needs decoding
      if (message.props.encoding != null && message.props.encoding != 'utf8') {
        let decodedText = new Buffer(message.encryptedText, message.props.encoding).toString('utf8');
        message.text = decodedText;
      }
    }

    decryptedMessages.push(message);

    this.decryptBulkMessages(messages, decryptedMessages, onComplete);
  }

  proto.decryptDownloadedFile = function decryptDownloadedFile(fileData, message, callback){

    callback = (typeof callback == "function") ? callback : function () { };
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
        }.bind(this));
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
        }.bind(this));
        return;
      }

      fileData = decryptedData;
    }

    if (message.isCompressed()) {
      fileData = this.decompress(fileData, function(err, decompressedData){
        if (err) {
          return callback(err);
        }

        var binData = new Buffer(decompressedData, 'base64');
        if (message.props.size != binData.length) {
          return callback('Error decrypting downloaded file');
        }
        callback(err, decompressedData);
      });
    }
    else{
      callback(null, fileData);
    }
  }

  proto.compress = function(binData, callback){

    callback = (typeof callback == "function") ? callback : function () { };

    zlib.gzip(binData, function(error, result){
      var compressedBase64 = this.mok_arrayBufferToBase64(result);
      callback(error, compressedBase64);
    }.bind(this));
  }

  proto.decompress = function(fileData, callback){

    callback = (typeof callback == "function") ? callback : function () { };
    var binData = new Buffer(fileData, 'base64');
    zlib.gunzip(binData, function(error, result){
      var decompressedBase64 = this.mok_arrayBufferToBase64(result);
      callback(error, decompressedBase64);
    }.bind(this));
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

  proto.requestSession = function requestSession(callback){
    this.exchangeKeys = new NodeRSA({ b: 2048 }, {encryptionScheme: 'pkcs1'});
    var isSync = false;
    var endpoint = '/user/session';
    var params={ user_info:this.session.user,monkey_id:this.session.id,expiring:this.session.expireSession};

    if (this.session.id != null) {
      endpoint = '/user/key/sync';
      isSync = true;
      params.public_key = this.exchangeKeys.exportKey('public');
    }

    this.status = this.enums.Status.HANDSHAKE;
    this._getEmitter().emit(STATUS_CHANGE_EVENT);
    apiconnector.basicRequest('POST', endpoint, params, false, function(err,respObj){

      if(err){
        Log.m(this.session.debuggingMode, 'Monkey - '+err);
        return callback(err);
      }

      if (isSync) {
        Log.m(this.session.debuggingMode, 'Monkey - reusing Monkey ID : '+this.session.id);

        if (respObj.data.info != null) {
          this.session.user = respObj.data.info;
        }

        if (respObj.data.last_time_synced == null) {
          respObj.data.last_time_synced = 0;
        }

        var decryptedAesKeys = this.exchangeKeys.decrypt(respObj.data.keys, 'utf8');

        var myAesKeys=decryptedAesKeys.split(":");
        this.session.myKey=myAesKeys[0];
        this.session.myIv=myAesKeys[1];

        this.session.lastTimestamp = respObj.data.last_time_synced;

        db.storeUser(this.session.id, this.session);

        monkeyKeystore.storeData(this.session.id, this.session.myKey+":"+this.session.myIv, this.session.myKey, this.session.myIv);

        this.startConnection(this.session.id);

        callback(null, this.session.user);
        return;
      }

      if (respObj.data.monkeyId == null) {
        Log.m(this.session.debuggingMode, 'Monkey - no Monkey ID returned');
        return;
      }

      this.session.id = respObj.data.monkeyId;
      this.session.user.monkeyId = respObj.data.monkeyId;
      db.storeMonkeyId(respObj.data.monkeyId);

      var connectParams = {
        monkey_id:this.session.id
      };

      this._getEmitter().emit(SESSION_EVENT, connectParams);

      var myKeyParams=this.generateAndStoreAES();// generates local AES KEY

      var key = new NodeRSA(respObj.data.publicKey, 'public', {encryptionScheme: 'pkcs1'});
      var encryptedAES = key.encrypt(myKeyParams, 'base64');

      connectParams.usk = encryptedAES;
      connectParams.ignore_params = this.session.ignore;

      //this.keyStore[this.session.id]={key:this.session.myKey, iv:this.session.myIv};

      apiconnector.basicRequest('POST', '/user/connect', connectParams, false, function(error){
        if(error){
          Log.m(this.session.debuggingMode, 'Monkey - '+error);
          return callback(error);
        }

        monkeyKeystore.storeData(this.session.id, this.session.myKey+":"+this.session.myIv, this.session.myKey, this.session.myIv);
        db.storeUser(respObj.data.monkeyId, this.session);

        this.startConnection(this.session.id);
        callback(null, this.session.user);
      }.bind(this));
    }.bind(this));
  }/// end of function requestSession

  proto.subscribe = function subscribe(channel, callback){

    callback = (typeof callback == "function") ? callback : function () { };
    apiconnector.basicRequest('POST', '/channel/subscribe/'+channel ,{ monkey_id:this.session.id}, false, function(err,respObj){
      if(err){
        Log.m(this.session.debuggingMode, 'Monkey - '+err);
        return;
      }
      this._getEmitter().emit(CHANNEL_SUBSCRIBE_EVENT, respObj);
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

      // assuming openFiles is an array of file names

      async.each(respObj.data.conversations, function(conversation, callback) {
        if(conversation.last_message == null || Object.keys(conversation.last_message).length == 0){
          return callback(null);
        }

        conversation.last_message = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, conversation.last_message);

        var message = conversation.last_message;
        var gotError = false;

        if (message.isEncrypted() && message.protocolType != this.enums.MessageType.FILE) {
          try{
            message.text = this.aesDecryptIncomingMessage(message);
            if(message.text == null || message.text === ""){
              throw "Fail decrypt";
            }
            return callback(null);
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
                return callback(null);
              }
              else{
                return callback(null);
              }
            }.bind(this));
          }

          if (!gotError && (message.text == null || message.text === "")) {
            //get keys
            this.getAESkeyFromUser(message.senderId, message, function(response){
              if (response != null) {
                message.text = this.aesDecryptIncomingMessage(message);
                return callback(null);
              }
              else{
                return callback(null);
              }
            }.bind(this));
          }
        }
        else{

          message.text = message.encryptedText;
          //check if it needs decoding
          if (message.props.encoding != null && message.props.encoding != 'utf8') {
            let decodedText = new Buffer(message.encryptedText, message.props.encoding).toString('utf8');
            message.text = decodedText;
          }
          return callback(null);
        }
      }.bind(this), function(error){
        if(error){
          onComplete(error.toString(), null);
        }
        else{
          //NOW DELETE CONVERSATIONS WITH LASTMESSAGE NO DECRYPTED
          respObj.data.conversations = respObj.data.conversations.reduce(function(result, conversation){
            if (conversation.last_message.protocolType == this.enums.MessageType.TEXT && conversation.last_message.isEncrypted() && conversation.last_message.encryptedText == conversation.last_message.text) {
              return result;
            }

            if (this.session.autoSave) {
              let stored = db.getMessageById(conversation.last_message.id);
              if (stored == null || stored === "") {
                db.storeMessage(conversation.last_message);
              }
            }

            result.push(conversation);

            return result;
          }.bind(this),[]);

          onComplete(null, respObj);
        }
      }.bind(this));

    }.bind(this));
  }

  proto.getConversationMessages = function getConversationMessages(conversationId, numberOfMessages, lastMessageId, onComplete) {

    onComplete = (typeof onComplete == "function") ? onComplete : function () { };
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
        let msg = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, message);

        msg.datetimeOrder = msg.datetimeCreation;

        result.push(msg);
        return result;
      }.bind(this),[]);

      this.decryptBulkMessages(messagesArray, [], function(decryptedMessages){
        for (var i = 0; i < decryptedMessages.length; i++) {
          var msg = decryptedMessages[i];
          if (this.session.autoSave) {
            let stored = db.getMessageById(msg.id);
            if (stored == null || stored === "") {
              db.storeMessage(msg);
            }
          }
        }
        onComplete(null, decryptedMessages);
      }.bind(this));
    }.bind(this));
  }

  proto.getMessagesSince = function getMessagesSince (timestamp, onComplete) {
    onComplete = (typeof onComplete == "function") ? onComplete : function () { };
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
    onComplete = (typeof onComplete == "function") ? onComplete : function () { };
    apiconnector.basicRequest('GET', '/file/open/'+message.text+'/base64',{}, true, function(err,fileData){
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
      }.bind(this));
    }.bind(this));
  }/// end of function downloadFile

  proto.updateUser = function updateUser(params, callback){

    callback = (typeof callback == "function") ? callback : function () { };

    var paramsRequest = {
      monkeyId:this.session.id,
      params: params
    };

    apiconnector.basicRequest('POST', '/user/update' ,paramsRequest, false, function(err,respObj){
      if(err){
        Log.m(this.session.debuggingMode, 'Monkey - error update user info: '+err);
        return callback(err);
      }

      if (respObj.data == null) {
        respObj.data = {};
      }

      return callback(null, respObj.data);
    }.bind(this));
  }

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

  proto.deleteConversation = function deleteConversation(conversationId, callback){

    callback = (typeof callback == "function") ? callback : function () { };

    if (conversationId == null) {
      Log.m(this.session.debuggingMode, 'ConversationId to delete is undefined');
      return callback('ConversationId to delete is undefined');
    }

    apiconnector.basicRequest('POST', '/user/delete/conversation',{conversation_id: conversationId, monkey_id: this.session.id}, false, function(err, respObj){
      if (err) {
        Log.m(this.session.debuggingMode, "Monkey - error creating group: "+err);
        return callback(err);
      }

      callback(null, respObj.data);
    })
  }

  proto.createGroup = function createGroup(members, groupInfo, optionalPush, optionalId, callback){

    callback = (typeof callback == "function") ? callback : function () { };
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

    callback = (typeof callback == "function") ? callback : function () { };
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

    callback = (typeof callback == "function") ? callback : function () { };
    apiconnector.basicRequest('POST', '/group/delete',{ monkey_id:memberId, group_id:groupId }, false, function(err,respObj){
      if(err){
        Log.m(this.session.debuggingMode, 'Monkey - error removing member: '+err);
        return callback(err);
      }

      return callback(null, respObj.data);
    }.bind(this));
  }

  proto.getInfoById = function getInfoById(monkeyId, callback){

    callback = (typeof callback == "function") ? callback : function () { };
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

      if (respObj.data == null) {
        respObj.data = {};
      }

      return callback(null, respObj.data);
    }.bind(this));
  }

  proto.getInfoByIds = function getInfoByIds(monkeyIds, callback){

    callback = (typeof callback == "function") ? callback : function () { };

    if (Array.isArray(monkeyIds)) {
      monkeyIds = monkeyIds.join();
    }

    apiconnector.basicRequest('POST', '/users/info/' ,{monkey_ids: monkeyIds}, false, function(err,respObj){
      if(err){
        Log.m(this.session.debuggingMode, 'Monkey - error get users info: '+err);
        return callback(err);
      }

      return callback(null, respObj.data);
    }.bind(this));
  }

  proto.getAllStoredMessages = function getAllStoredMessages(){
    var messageArgs = db.getAllStoredMessages();
    var messages = [];

    for (var i = 0; i < messageArgs.length; i++) {
      var storedArgs = messageArgs[i];
      var msg = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, storedArgs);
      messages.push(msg);
    }

    return messages;
  }

  proto.getConversationStoredMessages = function getConversationStoredMessages(id){
    var messageArgs = db.getConversationStoredMessages(this.session.id, id);
    var messages = [];

    for (var i = 0; i < messageArgs.length; i++) {
      var storedArgs = messageArgs[i];
      var msg = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, storedArgs);
      messages.push(msg);
    }

    return messages;
  }

  proto.getMessageById = function getMessageById(id){
    var args = db.getMessageById(id);

    var msg = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, args);
    return msg;
  }

  proto.getMessagesInTransit = function getMessagesInTransit(id){
    var messageArgs = db.getMessagesInTransit(id);

    var messages = [];

    for (var i = 0; i < messageArgs.length; i++) {
      var storedArgs = messageArgs[i];
      var msg = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, storedArgs);
      messages.push(msg);
    }

    return messages;
  }

  proto.deleteStoredMessagesOfConversation = function deleteStoredMessagesOfConversation(id){
    return db.deleteStoredMessagesOfConversation(this.session.id, id);
  }

  proto.markReadStoredMessage = function markReadStoredMessage(id){
    return db.markReadStoredMessage(id);
  }

  proto.markReadConversationStoredMessages = function markReadConversationStoredMessages(id){
    return db.markReadConversationStoredMessages(this.session.id, id);
  }

  proto.countUnreadConversationStoredMessages = function countUnreadConversationStoredMessages(id){
    return db.countUnreadConversationStoredMessages(this.session.id, id);
  }

  proto.getUser = function getUser(){
    var session = db.getUser(db.getMonkeyId());

    if (session == null) {
      return session;
    }

    this.session = session;

    if (this.session.user == null) {
      this.session.user = {};
    }

    this.session.user.monkeyId = this.session.id;

    return this.session.user;
  }

  proto.logout = function logout(){
    if (this.session != null) {
      Log.m(this.session.debuggingMode, 'Monkey - terminating session and clearing data');
    }

    db.clear();

    if (this.socketConnection != null) {
      this.socketConnection.onclose = function(){};
      this.socketConnection.close();
    }

    this.session = {};
  }

  proto.close = alias('logout');

  proto.exit = alias('logout');
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

  proto.parseFile = function parseJSON(response) {
    return response.text();
  };

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
