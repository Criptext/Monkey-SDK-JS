// import EventEmitter from './bower_components/eventEmitter/EventEmitter.js';

/*!
* Monkey v0.0.8
* Apache 2.0 - http://www.apache.org/licenses/LICENSE-2.0.html
* Gianni Carlo - http://oli.me.uk/
* @preserve
*/

const EventEmitter = require('events');
const MonkeyEnums = require('./libs/MonkeyEnums.js');
const MOKMessage = require('./libs/MOKMessage.js');
const monkeyKeystore = require('./libs/MonkeyKeystore.js');
const watchdog = require('./libs/watchdog.js');
const apiconnector = require('./libs/ApiConnector.js');
const Log = require('./libs/Log.js');
const db = require('./libs/db.js');
const NodeRSA = require('node-rsa');
const CryptoJS = require('node-cryptojs-aes').CryptoJS;
const async = require('async');
const Push = require('push.js');

/* global Offline */
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
const CONVERSATION_STATUS_CHANGE_EVENT = 'ConversationStatusChange';
const CONVERSATION_CLOSE_EVENT = 'ConversationClose';

const EXIT_EVENT = 'Exit';

require('es6-promise').polyfill();

(function () {
  'use strict';

  /**
  * Class for managing Monkey communication.
  * Can be extended to provide event functionality in other classes.
  *
  * @class Monkey Manages everything.
  */
  function Monkey() {}

  // Shortcuts to improve speed and size
  let proto = Monkey.prototype;
  let exports = this;


  proto.enums = new MonkeyEnums();
  // let originalGlobalValue = exports.Monkey;
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
    let emitter = this._getEmitter();
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
    let emitter = this._getEmitter();
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
    debug: false,
    stage: false,
    autoSave: true
  }

  /*
  * Session stuff
  */

  proto.init = function init(appKey, appSecret, userObj, ignoreHook, shouldExpireSession, isStaging, autoSync, autoSave, callback){
    if (appKey == null || appSecret == null) {
      throw 'Monkey - To initialize Monkey, you must provide your App Id and App Secret';
    }

    callback = typeof callback === "function" ? callback : function () { };

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

    if (isStaging) {
      this.session.debug = true;
      this.session.stage = true;
      this.domainUrl = 'monkey.criptext.com'
    }

    //this.keyStore={};
    apiconnector.init(this);

    //setup socketConnection
    this.socketConnection= null

    Offline.options = {checks: {xhr: {url: 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url=www.google.com&format=json'}}};
    //setup offline events
    Offline.on('confirmed-up', function () {
      let storedMonkeyId = db.getMonkeyId();

      //if no user logged in, do nothing
      if (storedMonkeyId == null || storedMonkeyId === '') {
        return;
      }

      if (this.socketConnection == null && storedMonkeyId != null && storedMonkeyId !== '') {
        this.startConnection();
        return;
      }
    }.bind(this));

    Offline.on('confirmed-down', function () {
      if (this.socketConnection != null) {
        this.socketConnection.onclose = function(){};
        this.socketConnection.close();
        this.socketConnection = null;
      }

      this.status=this.enums.Status.OFFLINE;
      this._getEmitter().emit(STATUS_CHANGE_EVENT, this.status);
      this._getEmitter().emit(DISCONNECT_EVENT, this.status);
    }.bind(this));

    let storedMonkeyId = db.getMonkeyId();

    if (storedMonkeyId != null && storedMonkeyId === userObj.monkeyId) {
      let user = this.getUser();

      this.startConnection();
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
    let args = {
      app_id: this.appKey,
      rid: recipientMonkeyId,
      props: JSON.stringify(props),
      params: JSON.stringify(optionalParams)
    };

    switch (typeof optionalPush){
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

    let storedMonkeyId = db.getMonkeyId();

    if (storedMonkeyId == null || storedMonkeyId === '') {
      this.socketConnection.onclose = function(){};
      this.socketConnection.close();
      //emit event
      this._getEmitter().emit(EXIT_EVENT, this.session.user);
      return;
    }

    if(this.status !== this.enums.Status.ONLINE){
      return;
    }

    let finalMessage = JSON.stringify({cmd:command,args:args});
    Log.m(this.session.debug, "================");
    Log.m(this.session.debug, "Monkey - sending message: "+finalMessage);
    Log.m(this.session.debug, "================");

    try {
      this.socketConnection.send(finalMessage);
    } catch (e) {
      //reset watchdog state, probably there was a disconnection
      Log.m(this.session.debug, 'Monkey - Error sending message: '+e);
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
    let props = {
      device: "web",
      encr: shouldEncrypt? 1 : 0,
      encoding: 'utf8'
    };

    //encode to base64 if not encrypted to preserve special characters
    if (!shouldEncrypt) {
      text = new Buffer(text).toString('base64');
      props.encoding = 'base64';
    }
    let args = this.prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
    args.msg = text;
    args.type = this.enums.MessageType.TEXT;

    let message = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, args);

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
        this.startConnection()
      }.bind(this), 5000);
    }.bind(this));

    return message;
  }

  proto.sendNotification = function sendNotification(recipientMonkeyId, optionalParams, optionalPush){
    let props = {
      device: "web"
    };

    let args = this.prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
    args.type = this.enums.MessageType.NOTIF;

    let message = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, args);

    args.id = message.id;
    args.oldId = message.oldId;

    this.sendCommand(this.enums.ProtocolCommand.MESSAGE, args);

    return message;
  }

  proto.sendTemporalNotification = function sendTemporalNotification(recipientMonkeyId, optionalParams, optionalPush){
    let props = {
      device: "web"
    };

    let args = this.prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
    args.type = this.enums.MessageType.TEMP_NOTE;

    let message = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, args);

    args.id = message.id;
    args.oldId = message.oldId;

    this.sendCommand(this.enums.ProtocolCommand.MESSAGE, args);

    return message;
  }

  proto.publish = function publish(text, channelName, optionalParams){
    let props = {
      device: "web",
      encr: 0
    };

    return this.sendText(this.enums.ProtocolCommand.PUBLISH, text, channelName, props, optionalParams);
  }

  proto.sendFile = function sendFile(data, recipientMonkeyId, fileName, mimeType, fileType, shouldCompress, optionalParams, optionalPush, callback){

    callback = typeof callback === "function" ? callback : function () { };
    data = this.cleanFilePrefix(data);
    let binData = new Buffer(data, 'base64');

    let props = {
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

    let mokMessage = this.createFileMessage(recipientMonkeyId, fileName, props, optionalParams, optionalPush);

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

          callbackAsync(null, message);
        }.bind(this));
      }.bind(this)],function(error, message){
      callback(error, message);
    });

    return mokMessage;
  }

  proto.sendEncryptedFile = function sendEncryptedFile(data, recipientMonkeyId, fileName, mimeType, fileType, shouldCompress, optionalParams, optionalPush, callback){

    callback = typeof callback === "function" ? callback : function () { };
    data = this.cleanFilePrefix(data);
    let binData = new Buffer(data, 'base64');

    let props = {
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

    let mokMessage = this.createFileMessage(recipientMonkeyId, fileName, props, optionalParams, optionalPush);

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

          callbackAsync(null, message);
        }.bind(this));
      }.bind(this)],function(error, message){
      callback(error, message);
    });

    return mokMessage;
  }

  proto.uploadFile = function uploadFile(fileData, recipientMonkeyId, fileName, props, optionalParams, optionalPush, optionalId, callback) {

    callback = typeof callback === "function" ? callback : function () { };

    let args = this.prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
    args.msg = fileName;
    args.sid = this.session.id;
    args.type = this.enums.MessageType.FILE;

    let message = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, args);

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

    let fileToSend = new Blob([fileData.toString()], {type: message.props.file_type});
    fileToSend.name=fileName;

    let data = new FormData();
    //agrega el archivo y la info al form
    data.append('file', fileToSend);
    data.append('data', JSON.stringify(args) );

    apiconnector.basicRequest('POST', '/file/new/base64',data, true, function(err,respObj){
      if (err) {
        Log.m(this.session.debug, 'Monkey - upload file Fail');
        this._getEmitter().emit(MESSAGE_FAIL_EVENT, message.id);
        return callback(err.toString(), message);
      }
      Log.m(this.session.debug, 'Monkey - upload file OK');
      message.id = respObj.data.messageId;
      callback(null, message);

    }.bind(this));

    return message;
  }

  proto.createFileMessage = function createFileMessage(recipientMonkeyId, fileName, props, optionalParams, optionalPush){

    let args = this.prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
    args.msg = fileName;
    //set sid only for files
    args.sid = this.session.id;
    args.type = this.enums.MessageType.FILE;

    let message = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, args);

    args.id = message.id;
    args.oldId = message.oldId;

    message.args = args;
    return message;
  };

  proto.getPendingMessages = function getPendingMessages(timestamp){
    let finalTimestamp = timestamp || this.session.lastTimestamp;
    this.requestMessagesSinceTimestamp(Math.trunc(finalTimestamp), 15, false);
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
    Log.m(this.session.debug, "===========================");
    Log.m(this.session.debug, "MONKEY - Message in process: "+message.id+" type: "+message.protocolType);
    Log.m(this.session.debug, "===========================");

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

        this._getEmitter().emit(MESSAGE_UNSEND_EVENT, {id: message.props.message_id, senderId: message.senderId, recipientId: message.recipientId});
        break;
      }
      default:{

        if (message.id > 0 && message.datetimeCreation > this.session.lastTimestamp) {
          this.session.lastTimestamp = Math.trunc(message.datetimeCreation);
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
    let paramsGroup;
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
        Log.m(this.session.debug, "===========================");
        Log.m(this.session.debug, "MONKEY - Fail decrypting: "+message.id+" type: "+message.protocolType);
        Log.m(this.session.debug, "===========================");
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
      if (message.props.encoding != null && message.props.encoding !== 'utf8') {
        let decodedText = new Buffer(message.encryptedText, message.props.encoding).toString('utf8');
        message.text = decodedText;
      }
    }

    let currentTimestamp = this.session.lastTimestamp;

    if (message.id > 0 && message.datetimeCreation > this.session.lastTimestamp) {
      this.session.lastTimestamp = Math.trunc(message.datetimeCreation);

      if (this.session.autoSave) {
        db.storeUser(this.session.id, this.session);
      }
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
    if (currentTimestamp === 0 && this.session.lastTimestamp > 0) {
      this.getPendingMessages();
    }
  }

  proto.createPush = function createPush(title, body, timeout, tag, icon, onClick){

    let myTitle = title || 'New Message';
    let myTag = tag || new Date().getTime() / 1000;
    onClick = typeof onClick === "function" ? onClick : function () { Push.close(myTag) };

    let params = {
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
      this.session.lastTimestamp = Math.trunc(message.datetimeCreation);
      if (this.session.autoSave) {
        db.storeUser(this.session.id, this.session);
      }
    }

    this._getEmitter().emit(MESSAGE_EVENT, message);
  }

  proto.processMOKProtocolACK = function processMOKProtocolACK(message){
    Log.m(this.session.debug, "===========================");
    Log.m(this.session.debug, "MONKEY - ACK in process");
    Log.m(this.session.debug, "===========================");

    if(parseInt(message.props.status) === 52){
      message.readByUser = true;
    }

    if(message.id !== "0"){
      let storedMessage = db.getMessageById(message.oldId);

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
      }

    }

    let ackParams = {};

    if (message.protocolType === this.enums.ProtocolCommand.OPEN) {
      ackParams.lastOpenMe = message.props.last_open_me;
      ackParams.lastSeen = message.props.last_seen;
      if (message.props.members_online){
        ackParams.online = message.props.members_online;
      }else{
        ackParams.online = parseInt(message.props.online) === 1;
      }
      this._getEmitter().emit(CONVERSATION_STATUS_CHANGE_EVENT, ackParams);
      return;
    }

    ackParams.newId = message.props.new_id;
    ackParams.oldId = message.props.old_id;
    ackParams.senderId = message.senderId;
    ackParams.recipientId = message.recipientId;
    ackParams.conversationId = message.conversationId(this.session.user.monkeyId);
    ackParams.status = message.props.status

    this._getEmitter().emit(ACKNOWLEDGE_EVENT, ackParams);

  }

  proto.resendPendingMessages = function resendPendingMessages(){
    let arrayMessages = db.getPendingMessages();

    for (let i = 0; i < arrayMessages.length; i++) {
      let msg = arrayMessages[i];
      this.sendCommand(msg.protocolCommand, msg.args);
    }

    //set watchdog
    if (arrayMessages.length > 0) {
      watchdog.messageInTransit(function(){
        this.socketConnection.onclose = function(){};
        this.socketConnection.close();
        setTimeout(function(){
          this.startConnection();
        }.bind(this), 5000);
      }.bind(this));

      //resend pending messages just in case
      setTimeout(function(){
        this.resendPendingMessages();
      }.bind(this), 5000);
    }
  }

  proto.requestMessagesSinceTimestamp = function requestMessagesSinceTimestamp(lastTimestamp, quantity, withGroups){
    // if (this.socketConnection == null) {
    //
    // }
    let args={
      since: lastTimestamp,
      qty: quantity
    };

    if (withGroups === true) {
      args.groups = 1;
    }

    watchdog.startWatchingSync(function(){
      this.socketConnection.onclose = function(){};
      this.socketConnection.close();
      setTimeout(function(){
        this.startConnection()
      }.bind(this), 5000);
    }.bind(this));

    this.sendCommand(this.enums.ProtocolCommand.SYNC, args);
  }

  proto.startConnection = function startConnection(){
    let monkey_id = db.getMonkeyId();

    if (monkey_id == null || monkey_id === '') {
      throw 'Monkey - Trying to connect to socket when there\'s no local session';
    }

    //disconnect socket if it's already connected
    if (this.socketConnection != null) {
      this.socketConnection.onclose = function(){};
      this.socketConnection.close();
      this.socketConnection = null;
    }

    this.status = this.enums.Status.CONNECTING;
    this._getEmitter().emit(STATUS_CHANGE_EVENT, this.status);
    let token=this.appKey+":"+this.appSecret;

    if(this.session.stage){ //no ssl
      this.socketConnection = new WebSocket('ws://'+this.domainUrl+'/websockets?monkey_id='+monkey_id+'&p='+token,'criptext-protocol');
    }
    else{
      this.socketConnection = new WebSocket('wss://'+this.domainUrl+'/websockets?monkey_id='+monkey_id+'&p='+token,'criptext-protocol');
    }

    this.socketConnection.onopen = function () {
      this.status=this.enums.Status.ONLINE;
      this._getEmitter().emit(STATUS_CHANGE_EVENT, this.status);
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
      let storedMonkeyId = db.getMonkeyId();

      if (storedMonkeyId == null || storedMonkeyId === '') {
        this.socketConnection.onclose = function(){};
        this.socketConnection.close();
        //emit event
        this._getEmitter().emit(EXIT_EVENT, this.session.user);
        return;
      }

      Log.m(this.session.debug, 'Monkey - incoming message: '+evt.data);
      let jsonres=JSON.parse(evt.data);

      if (jsonres.args.app_id == null) {
        jsonres.args.app_id = this.appKey;
      }

      let msg = new MOKMessage(jsonres.cmd, jsonres.args);
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
          if (parseInt(jsonres.args.type) === this.enums.GetType.GROUPS) {
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
              let arrayMessages = jsonres.args.messages;
              let remaining = jsonres.args.remaining_messages;

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
        Log.m(this.session.debug, 'Monkey - Websocket closed - Connection closed... '+ evt);
        this.socketConnection = null;
        this.status=this.enums.Status.LOGOUT;
      }else{
        //web server crashed, reconnect
        Log.m(this.session.debug, 'Monkey - Websocket closed - Reconnecting... '+ evt);
        this.status=this.enums.Status.OFFLINE;
        setTimeout(function(){
          this.startConnection()
        }.bind(this), 2000 );
      }
      this._getEmitter().emit(STATUS_CHANGE_EVENT, this.status);
      this._getEmitter().emit(DISCONNECT_EVENT, this.status);
    }.bind(this);
  }

  /*
  * Security
  */

  proto.getAESkeyFromUser = function getAESkeyFromUser(monkeyId, pendingMessage, callback){

    callback = typeof callback === "function" ? callback : function () { };
    apiconnector.basicRequest('POST', '/user/key/exchange',{ monkey_id:this.session.id, user_to:monkeyId}, false, function(err,respObj){

      if(err){
        Log.m(this.session.debug, 'Monkey - error on getting aes keys '+err);
        return callback(null);
      }

      let oldParamKeys = monkeyKeystore.getData(monkeyId, this.session.myKey, this.session.myIv);

      Log.m(this.session.debug, 'Monkey - Received new aes keys');
      let newParamKeys = this.aesDecrypt(respObj.data.convKey, this.session.id).split(":");
      let newAESkey = newParamKeys[0];
      let newIv = newParamKeys[1];

      //same keys
      if (oldParamKeys.key === newAESkey && oldParamKeys.iv === newIv) {
        return callback(null);
      }

      //this.keyStore[respObj.data.session_to] = {key:newParamKeys[0],iv:newParamKeys[1]};
      monkeyKeystore.storeData(respObj.data.session_to, newAESkey+":"+newIv, this.session.myKey, this.session.myIv);

      return callback(pendingMessage);
    }.bind(this));
  }

  proto.requestEncryptedTextForMessage = function requestEncryptedTextForMessage(message, callback){

    callback = typeof callback === "function" ? callback : function () { };
    apiconnector.basicRequest('GET', '/message/'+message.id+'/open/secure',{}, false, function(err,respObj){
      if(err){
        Log.m(this.session.debug, 'Monkey - error on requestEncryptedTextForMessage: '+err);
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
          this.session.lastTimestamp = Math.trunc(message.datetimeCreation);
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
    let aesObj = monkeyKeystore.getData(monkeyId, this.session.myKey, this.session.myIv);
    let aesKey = CryptoJS.enc.Base64.parse(aesObj.key);
    let initV = CryptoJS.enc.Base64.parse(aesObj.iv);
    let cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(dataToDecrypt) });
    let decrypted = CryptoJS.AES.decrypt(cipherParams, aesKey, { iv: initV }).toString(CryptoJS.enc.Utf8);

    return decrypted;
  }

  proto.decryptFile = function decryptFile (fileToDecrypt, monkeyId) {
    //var aesObj = this.keyStore[monkeyId];
    let aesObj = monkeyKeystore.getData(monkeyId, this.session.myKey, this.session.myIv);

    let aesKey=CryptoJS.enc.Base64.parse(aesObj.key);
    let initV= CryptoJS.enc.Base64.parse(aesObj.iv);

    let decrypted = CryptoJS.AES.decrypt(fileToDecrypt, aesKey, { iv: initV }).toString(CryptoJS.enc.Base64);

    // Log.m(this.session.debug, 'el tipo del archivo decriptado: '+ typeof(decrypted));
    return decrypted;
  }

  proto.aesEncrypt = function aesEncrypt(dataToEncrypt, monkeyId){
    //var aesObj = this.keyStore[monkeyId];
    let aesObj = monkeyKeystore.getData(monkeyId, this.session.myKey, this.session.myIv);
    let aesKey=CryptoJS.enc.Base64.parse(aesObj.key);
    let initV= CryptoJS.enc.Base64.parse(aesObj.iv);

    let encryptedData = CryptoJS.AES.encrypt(dataToEncrypt, aesKey, { iv: initV });

    return encryptedData.toString();
  }

  proto.decryptBulkMessages = function decryptBulkMessages(messages, decryptedMessages, onComplete){
    onComplete = typeof onComplete === "function" ? onComplete : function () { };
    if(!(typeof messages !== "undefined" && messages != null && messages.length > 0)){
      return onComplete(decryptedMessages);
    }

    let message = messages.shift();

    if (message.isEncrypted() && message.protocolType !== this.enums.MessageType.FILE) {
      try{
        message.text = this.aesDecryptIncomingMessage(message);
      }
      catch(error){
        Log.m(this.session.debug, "===========================");
        Log.m(this.session.debug, "MONKEY - Fail decrypting: "+message.id+" type: "+message.protocolType);
        Log.m(this.session.debug, "===========================");
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

          this.decryptBulkMessages(messages, decryptedMessages, onComplete);
        }.bind(this));
        return;
      }
    }else{
      message.text = message.encryptedText;
      //check if it needs decoding
      if (message.props.encoding != null && message.props.encoding !== 'utf8') {
        let decodedText = new Buffer(message.encryptedText, message.props.encoding).toString('utf8');
        message.text = decodedText;
      }
    }

    decryptedMessages.push(message);

    this.decryptBulkMessages(messages, decryptedMessages, onComplete);
  }

  proto.decryptDownloadedFile = function decryptDownloadedFile(fileData, message, callback){

    callback = typeof callback === "function" ? callback : function () { };
    if (message.isEncrypted()) {
      let decryptedData = null;
      try{
        let currentSize = fileData.length;
        Log.m(this.session.debug, "Monkey - encrypted file size: "+currentSize);

        //temporal fix for media sent from web
        if (message.props.device === "web") {
          decryptedData = this.aesDecrypt(fileData, message.senderId);
        }else{
          decryptedData = this.decryptFile(fileData, message.senderId);
        }

        Log.m(this.session.debug, "Monkey - decrypted file size: " + decryptedData.length);
      }
      catch(error){
        Log.m(this.session.debug, "===========================");
        Log.m(this.session.debug, "MONKEY - Fail decrypting: "+message.id+" type: "+message.protocolType);
        Log.m(this.session.debug, "===========================");
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

        let binData = new Buffer(decompressedData, 'base64');
        if (parseInt(message.props.size) !== binData.length) {
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

    callback = typeof callback === "function" ? callback : function () { };

    zlib.gzip(binData, function(error, result){
      let compressedBase64 = this.mok_arrayBufferToBase64(result);
      callback(error, compressedBase64);
    }.bind(this));
  }

  proto.decompress = function(fileData, callback){

    callback = typeof callback === "function" ? callback : function () { };
    let binData = new Buffer(fileData, 'base64');
    zlib.gunzip(binData, function(error, result){
      let decompressedBase64 = this.mok_arrayBufferToBase64(result);
      callback(error, decompressedBase64);
    }.bind(this));
  }

  proto.generateAndStoreAES = function generateAndStoreAES(){
    let key = CryptoJS.enc.Hex.parse(this.randomString(32));//256 bits
    let iv = CryptoJS.enc.Hex.parse(this.randomString(16));//128 bits
    this.session.myKey=btoa(key);
    this.session.myIv=btoa(iv);
    //now you have to encrypt
    return this.session.myKey+":"+this.session.myIv;
  }

  proto.randomString = function randomString(length){
    let key = "";
    let hex = "0123456789abcdef";
    for (let i = 0; i < length; i++) {
      key += hex.charAt(Math.floor(Math.random() * 16));
    }
    return key;
  }

  /*
  * API CONNECTOR
  */

  proto.requestSession = function requestSession(callback){
    this.exchangeKeys = new NodeRSA({ b: 2048 }, {encryptionScheme: 'pkcs1'});
    let isSync = false;
    let endpoint = '/user/session';
    let params={ user_info:this.session.user,monkey_id:this.session.id,expiring:this.session.expireSession};

    if (this.session.id != null) {
      endpoint = '/user/key/sync';
      isSync = true;
      params.public_key = this.exchangeKeys.exportKey('public');
    }

    this.status = this.enums.Status.HANDSHAKE;
    this._getEmitter().emit(STATUS_CHANGE_EVENT, this.status);
    apiconnector.basicRequest('POST', endpoint, params, false, function(err,respObj){

      if(err){
        Log.m(this.session.debug, 'Monkey - '+err);
        return callback(err);
      }

      if (isSync) {
        Log.m(this.session.debug, 'Monkey - reusing Monkey ID : '+this.session.id);

        if (respObj.data.info != null) {
          this.session.user = respObj.data.info;
        }

        if (respObj.data.last_time_synced == null) {
          respObj.data.last_time_synced = 0;
        }

        let decryptedAesKeys = this.exchangeKeys.decrypt(respObj.data.keys, 'utf8');

        let myAesKeys=decryptedAesKeys.split(":");
        this.session.myKey=myAesKeys[0];
        this.session.myIv=myAesKeys[1];

        this.session.lastTimestamp = Math.trunc(respObj.data.last_time_synced);

        db.storeUser(this.session.id, this.session);

        monkeyKeystore.storeData(this.session.id, this.session.myKey+":"+this.session.myIv, this.session.myKey, this.session.myIv);

        this.startConnection();

        callback(null, this.session.user);
        return;
      }

      if (respObj.data.monkeyId == null) {
        Log.m(this.session.debug, 'Monkey - no Monkey ID returned');
        return;
      }

      this.session.id = respObj.data.monkeyId;
      this.session.user.monkeyId = respObj.data.monkeyId;
      db.storeMonkeyId(respObj.data.monkeyId);

      let connectParams = {
        monkey_id:this.session.id
      };

      this._getEmitter().emit(SESSION_EVENT, connectParams);

      let myKeyParams=this.generateAndStoreAES();// generates local AES KEY

      let key = new NodeRSA(respObj.data.publicKey, 'public', {encryptionScheme: 'pkcs1'});
      let encryptedAES = key.encrypt(myKeyParams, 'base64');

      connectParams.usk = encryptedAES;
      connectParams.ignore_params = this.session.ignore;

      //this.keyStore[this.session.id]={key:this.session.myKey, iv:this.session.myIv};

      apiconnector.basicRequest('POST', '/user/connect', connectParams, false, function(error){
        if(error){
          Log.m(this.session.debug, 'Monkey - '+error);
          return callback(error);
        }

        monkeyKeystore.storeData(this.session.id, this.session.myKey+":"+this.session.myIv, this.session.myKey, this.session.myIv);
        db.storeUser(respObj.data.monkeyId, this.session);

        this.startConnection();
        callback(null, this.session.user);
      }.bind(this));
    }.bind(this));
  }/// end of function requestSession

  proto.subscribe = function subscribe(channel, callback){

    callback = typeof callback === "function" ? callback : function () { };
    apiconnector.basicRequest('POST', '/channel/subscribe/'+channel ,{ monkey_id:this.session.id}, false, function(err,respObj){
      if(err){
        Log.m(this.session.debug, 'Monkey - '+err);
        return;
      }
      this._getEmitter().emit(CHANNEL_SUBSCRIBE_EVENT, respObj);
    }.bind(this));
  }

  proto.getConversations = function getConversations(since, quantity, onComplete){
    let params = {
      'monkeyId': this.session.id,
      'qty': quantity.toString()
    };

    if (since != null) {
      params.timestamp = since;
    }
    apiconnector.basicRequest('POST', '/user/conversations',params, false, function(err,respObj){
      if (err) {
        Log.m(this.session.debug, 'Monkey - FAIL TO GET ALL CONVERSATIONS');
        onComplete(err.toString());
        return;
      }
      Log.m(this.session.debug, 'Monkey - GET ALL CONVERSATIONS');

      this.processConversationList(respObj.data.conversations, onComplete);
    }.bind(this));
  }

  //deprecated, use for testing purposes only
  proto.getAllConversations = function getAllConversations (onComplete) {

    apiconnector.basicRequest('GET', '/user/'+this.session.id+'/conversations',{}, false, function(err,respObj){
      if (err) {
        Log.m(this.session.debug, 'Monkey - FAIL TO GET ALL CONVERSATIONS');
        onComplete(err.toString());
        return;
      }
      Log.m(this.session.debug, 'Monkey - GET ALL CONVERSATIONS');

      this.processConversationList(respObj.data.conversations, onComplete);
    }.bind(this));
  }

  proto.processConversationList = function processConversationList(conversations, onComplete){

    async.each(conversations, function(conversation, callback) {
      if(conversation.last_message == null || Object.keys(conversation.last_message).length === 0){
        return callback(null);
      }

      conversation.last_message = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, conversation.last_message);

      let message = conversation.last_message;
      let gotError = false;

      if (message.isEncrypted() && message.protocolType !== this.enums.MessageType.FILE) {
        try{
          message.text = this.aesDecryptIncomingMessage(message);
          if(message.text == null || message.text === ""){
            throw "Fail decrypt";
          }
          return callback(null);
        }
        catch(error){
          gotError = true;
          Log.m(this.session.debug, "===========================");
          Log.m(this.session.debug, "MONKEY - Fail decrypting: "+message.id+" type: "+message.protocolType);
          Log.m(this.session.debug, "===========================");
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
        if (message.props.encoding != null && message.props.encoding !== 'utf8') {
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
        conversations = conversations.reduce(function(result, conversation){
          if (conversation.last_message.protocolType === this.enums.MessageType.TEXT && conversation.last_message.isEncrypted() && conversation.last_message.encryptedText === conversation.last_message.text) {
            return result;
          }

          result.push(conversation);

          return result;
        }.bind(this),[]);

        onComplete(null, conversations);
      }
    }.bind(this));
  }

  proto.getConversationMessages = function getConversationMessages(conversationId, numberOfMessages, lastTimestamp, onComplete) {

    onComplete = typeof onComplete === "function" ? onComplete : function () { };
    if (lastTimestamp == null) {
      lastTimestamp = '';
    }

    apiconnector.basicRequest('GET', '/conversation/messages/'+this.session.id+'/'+conversationId+'/'+numberOfMessages+'/'+lastTimestamp,{}, false, function(err,respObj){
      if (err) {
        Log.m(this.session.debug, 'FAIL TO GET CONVERSATION MESSAGES');
        onComplete(err.toString());
        return;
      }
      Log.m(this.session.debug, 'GET CONVERSATION MESSAGES');

      let messages = respObj.data.messages;

      let messagesArray = messages.reduce(function(result, message){
        let msg = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, message);

        msg.datetimeOrder = msg.datetimeCreation;

        result.push(msg);
        return result;
      }.bind(this),[]);

      this.decryptBulkMessages(messagesArray, [], function(decryptedMessages){
        onComplete(null, decryptedMessages);
      }.bind(this));
    }.bind(this));
  }

  proto.getMessagesSince = function getMessagesSince (timestamp, onComplete) {
    onComplete = typeof onComplete === "function" ? onComplete : function () { };
    apiconnector.basicRequest('GET', '/user/'+this.session.id+'/messages/'+timestamp,{}, false, function(err,respObj){
      if (err) {
        Log.m(this.session.debug, 'Monkey - FAIL TO GET MESSAGES');
        onComplete(err.toString());
        return;
      }
      Log.m(this.session.debug, 'Monkey - GET MESSAGES');
      onComplete(null, respObj);
    }.bind(this));
  }

  proto.downloadFile = function downloadFile(message, onComplete){
    onComplete = typeof onComplete === "function" ? onComplete : function () { };
    apiconnector.basicRequest('GET', '/file/open/'+message.text+'/base64',{}, true, function(err,fileData){
      if (err) {
        Log.m(this.session.debug, 'Monkey - Download File Fail');
        onComplete(err.toString());
        return;
      }
      Log.m(this.session.debug, 'Monkey - Download File OK');
      this.decryptDownloadedFile(fileData, message, function(error, finalData){
        if (error) {
          Log.m(this.session.debug, 'Monkey - Fail to decrypt downloaded file');
          onComplete(error);
          return;
        }
        onComplete(null, finalData);
      }.bind(this));
    }.bind(this));
  }/// end of function downloadFile

  proto.updateUser = function updateUser(params, callback){

    callback = typeof callback === "function" ? callback : function () { };

    let paramsRequest = {
      monkeyId:this.session.id,
      params: params
    };

    apiconnector.basicRequest('POST', '/user/update' ,paramsRequest, false, function(err,respObj){
      if(err){
        Log.m(this.session.debug, 'Monkey - error update user info: '+err);
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
        Log.m(this.session.debug, err);
        return;
      }

      if(parseInt(respObj.status)===0){
        // now you can start the long polling calls or the websocket connection you are ready.
        // we need to do a last validation here with an encrypted data that is sent from the server at this response, to validate keys are correct and the session too.
        Log.m(this.session.debug, "Message sent is "+JSON.stringify(respObj));
        Log.m(this.session.debug, "Message sent is "+respObj.data.messageId);
      }
      else{
        //throw error
        Log.m(this.session.debug, "Error in postMessage "+respObj.message);
      }
    }.bind(this));
  }

  proto.deleteConversation = function deleteConversation(conversationId, callback){

    callback = typeof callback === "function" ? callback : function () { };

    if (conversationId == null) {
      Log.m(this.session.debug, 'ConversationId to delete is undefined');
      return callback('ConversationId to delete is undefined');
    }

    apiconnector.basicRequest('POST', '/user/delete/conversation',{conversation_id: conversationId, monkey_id: this.session.id}, false, function(err, respObj){
      if (err) {
        Log.m(this.session.debug, "Monkey - error creating group: "+err);
        return callback(err);
      }

      callback(null, respObj.data);
    })
  }

  proto.createGroup = function createGroup(members, groupInfo, optionalPush, optionalId, callback){

    callback = typeof callback === "function" ? callback : function () { };
    //check if I'm already in the proposed members
    if (members.indexOf(this.session.id) === -1) {
      members.push(this.session.id);
    }

    let params = {
      monkey_id:this.session.id,
      members: members.join(),
      info: groupInfo,
      group_id: optionalId,
      push_all_members: optionalPush
    };

    apiconnector.basicRequest('POST', '/group/create',params, false, function(err,respObj){
      if(err){
        Log.m(this.session.debug, "Monkey - error creating group: "+err);
        return callback(err);
      }
      Log.m(this.session.debug, "Monkey - Success creating group"+ respObj.data.group_id);

      return callback(null, respObj.data);
    }.bind(this));
  }

  proto.addMemberToGroup = function addMemberToGroup(groupId, newMemberId, optionalPushNewMember, optionalPushExistingMembers, callback){

    callback = typeof callback === "function" ? callback : function () { };
    let params = {
      monkey_id:this.session.id,
      new_member: newMemberId,
      group_id: groupId,
      push_new_member: optionalPushNewMember,
      push_all_members: optionalPushExistingMembers
    };

    apiconnector.basicRequest('POST', '/group/addmember', params, false, function(err,respObj){
      if(err){
        Log.m(this.session.debug, 'Monkey - error adding member: '+err);
        return callback(err);
      }

      return callback(null, respObj.data);
    }.bind(this));
  }

  proto.removeMemberFromGroup = function removeMemberFromGroup(groupId, memberId, callback){

    callback = typeof callback === "function" ? callback : function () { };
    apiconnector.basicRequest('POST', '/group/delete',{ monkey_id:memberId, group_id:groupId }, false, function(err,respObj){
      if(err){
        Log.m(this.session.debug, 'Monkey - error removing member: '+err);
        return callback(err);
      }

      return callback(null, respObj.data);
    }.bind(this));
  }

  proto.editGroupInfo = function editGroupInfo(groupId, newInfo, callback){
    callback = typeof callback === "function" ? callback : function () { };
    apiconnector.basicRequest('POST', '/group/update',{ group_id:groupId, info:newInfo }, false, function(err,respObj){
      if(err){
        Log.m(this.session.debug, 'Monkey - error updating group: '+err);
        return callback(err);
      }

      return callback(null, respObj.data);
    }.bind(this));
  }

  proto.editUserInfo = function editUserInfo(newParams, callback){
    callback = typeof callback === "function" ? callback : function () { };

    apiconnector.basicRequest('POST', '/user/update',{ monkeyId:this.session.id, params:newParams }, false, function(err,respObj){
      if(err){
        Log.m(this.session.debug, 'Monkey - error updating user: '+err);
        return callback(err);
      }

      Object.keys(newParams).forEach(function(param){
        this.session.user[param] = newParams[param];
      }.bind(this));

      db.storeUser(this.session.id, this.session);

      return callback(null, respObj.data);
    }.bind(this));
  }

  proto.getInfoById = function getInfoById(monkeyId, callback){

    callback = typeof callback === "function" ? callback : function () { };
    let endpoint = '/info/'+monkeyId;

    //check if it's a group
    if (monkeyId.indexOf("G:") >-1) {
      endpoint = '/group'+endpoint;
    }else{
      endpoint = '/user'+endpoint;
    }

    apiconnector.basicRequest('GET', endpoint ,{}, false, function(err,respObj){
      if(err){
        Log.m(this.session.debug, 'Monkey - error get info: '+err);
        return callback(err);
      }

      if (respObj.data == null) {
        respObj.data = {};
      }

      return callback(null, respObj.data);
    }.bind(this));
  }

  proto.getInfoByIds = function getInfoByIds(monkeyIds, callback){

    callback = typeof callback === "function" ? callback : function () { };

    if (Array.isArray(monkeyIds)) {
      monkeyIds = monkeyIds.join();
    }

    apiconnector.basicRequest('POST', '/users/info/' ,{monkey_ids: monkeyIds}, false, function(err,respObj){
      if(err){
        Log.m(this.session.debug, 'Monkey - error get users info: '+err);
        return callback(err);
      }

      return callback(null, respObj.data);
    }.bind(this));
  }

  proto.getAllStoredMessages = function getAllStoredMessages(){
    let messageArgs = db.getAllStoredMessages();
    let messages = [];

    for (let i = 0; i < messageArgs.length; i++) {
      let storedArgs = messageArgs[i];
      let msg = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, storedArgs);
      messages.push(msg);
    }

    return messages;
  }

  proto.getConversationStoredMessages = function getConversationStoredMessages(id){
    let messageArgs = db.getConversationStoredMessages(this.session.id, id);
    let messages = [];

    for (let i = 0; i < messageArgs.length; i++) {
      let storedArgs = messageArgs[i];
      let msg = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, storedArgs);
      messages.push(msg);
    }

    return messages;
  }

  proto.getMessageById = function getMessageById(id){
    let args = db.getMessageById(id);

    let msg = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, args);
    return msg;
  }

  proto.getMessagesInTransit = function getMessagesInTransit(id){
    let messageArgs = db.getMessagesInTransit(id);

    let messages = [];

    for (let i = 0; i < messageArgs.length; i++) {
      let storedArgs = messageArgs[i];
      let msg = new MOKMessage(this.enums.ProtocolCommand.MESSAGE, storedArgs);
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
    let session = db.getUser(db.getMonkeyId());

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
      Log.m(this.session.debug, 'Monkey - terminating session and clearing data');
    }

    db.clear(db.getMonkeyId());

    if (this.socketConnection != null) {
      this.socketConnection.onclose = function(){};
      this.socketConnection.close();
      this.socketConnection = null;
    }

    this.session = {};
  }

  proto.close = alias('logout');

  proto.exit = alias('logout');
  /*
  * Utils
  */

  proto.generateStandardPush = function generateStandardPush (stringMessage){
    /* eslint-disable comma-dangle */
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
    /* eslint-enable comma-dangle */
  }

  proto.generateLocalizedPush = function generateLocalizedPush (locKey, locArgs, defaultText, sound){
    /* eslint-disable comma-dangle */
    let localizedPush = {
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
    /* eslint-enable comma-dangle */
    return localizedPush;
  }

  proto.checkStatus = function checkStatus(response) {
    if (response.status >= 200 && response.status < 300) {
      return response
    } else {
      let error = new Error(response.statusText)
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
    let binary = '';
    let bytes = new Uint8Array( buffer );
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
  }

  proto.cleanFilePrefix = function cleanFilePrefix(fileData){
    let cleanFileData = fileData;

    //check for possible ;base64,
    if (fileData.indexOf(",") > -1) {
      cleanFileData = fileData.slice(fileData.indexOf(",")+1);
    }

    return cleanFileData;
  }

  proto.mok_getFileExtension = function mok_getFileExtension(fileName){
    let arr = fileName.split('.');
    let extension= arr[arr.length-1];

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
  // Monkey.noConflict = function noConflict() {
  //   exports.Monkey = originalGlobalValue;
  //   return Monkey;
  // };

  // Expose the class either via AMD, CommonJS or the global object

  /* global define */
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
