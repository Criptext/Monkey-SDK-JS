/*
Main lib of monkey that will be bundled with webpack
*/

/*
The following libs in scripts are loaded using the module script-loader
of webpack, to be used as global scripts.
This is a replacement of <script tag>
*/

require('./libs/jsencrypt.min.js');
require('./libs/aes.js');
// import CryptoJS from './bower_components/cryptojslib/rollups/aes.js';
// require('./bower_components/zlib/zlib.js');
import Zlib from './bower_components/zlib/zlib.js';
// require('./bower_components/es6-promise/es6-promise.js').polyfill();
// import fetch from './bower_components/fetch/fetch.js';
require('./bower_components/fetch/fetch.js');
import EventEmitter from './bower_components/eventEmitter/EventEmitter.js';

import MOKMessage from './libs/MOKMessage.js';

window.MOKMessage = MOKMessage;

var STATUS = {
  OFFLINE:0,
  HANDSHAKE:1,
  CONNECTING:2,
  ONLINE:3
}

var MOKMessageProtocolCommand = {
  MESSAGE:200,
  GET:201,
  TRANSACTION:202,
  OPEN:203,
  SET:204,
  ACK:205,
  PUBLISH:206,
  DELETE:207,
  CLOSE:208,
  SYNC:209,
  MESSAGENOTDELIVERED:50,
  MESSAGEDELIVERED:51,
  MESSAGEREAD:52
}

var MOKMessageType = {
  TEXT:1,
  FILE:2,
  TEMP_NOTE:3,
  NOTIF:4,
  ALERT:5
}

var MOKMessageFileType = {
  AUDIO:1,
  VIDEO:2,
  PHOTO:3,
  ARCHIVE:4
}

var MOKGetType = {
  HISTORY:1,
  GROUPS:2
}

var MOKSyncType = {
  HISTORY:1,
  GROUPS:2
}

/* Start monkey,js implementation */

//updates from feeds

var socketConnection=null;

var monkey= new function(){

  this.session = {id:null, serverPublic:null, userData:null};
  this.appKey=null;
  this.secretKey=null;
  this.keyStore=null;
  this.session.expiring=0;
  this.domainUrl="monkey.criptext.com";
  this.status = STATUS.OFFLINE;// offline default
  this.lastTimestamp = 0;
  this.lastMessageId = 0;
  this.emitter = new EventEmitter();

  this.init=function (appKey, secretKey, userObj, optionalExpiring, optionalDebuging) {
    this.appKey=appKey;
    this.secretKey=secretKey;
    this.session.userData=userObj; // validate JSON String
    this.keyStore={};
    this.debugingMode=false;

    optionalExpiring ? this.session.expiring=1 : this.session.expiring=0;

    optionalDebuging ? this.debugingMode=true : this.debugingMode=false;

    if(userObj){
      userObj.monkey_id ? this.session.id=userObj.monkey_id : this.session.id=null;
    }


    console.log("====  init domain "+this.domainUrl);

    startSession();
  };

  this.addListener = function(event, callback){
    this.emitter.addListener(event, callback);
  };
  this.removeListener = function(event, callback){
    this.emitter.removeEvent(event);
  };

  this.generateLocalizedPush=generateLocalizedPush;
  //network
  this.sendMessage=sendMessage;
  this.sendEncryptedMessage=sendEncryptedMessage;
  this.sendOpenToUser=sendOpenToUser;
  this.sendNotification=sendNotification;
  this.publish=publish;
  this.getPendingMessages=getPendingMessages;

  //http
  this.subscribe=subscribe;
  this.sendFile=sendFile;
  this.sendEncryptedFile=sendEncryptedFile;
  this.downloadFile=downloadFile;
  this.createGroup=createGroup;
  this.addMemberToGroup=addMemberToGroup;
  this.removeMemberFromGroup=removeMemberFromGroup;
  this.getInfoById=getInfoById;
  this.getAllConversations=getAllConversations;
  this.getConversationMessages=getConversationMessages;
  //check if there's reason for this to exist
  this.getMessagesSince = getMessagesSince;
}

/*
NETWORKING
*/


function sendCommand(command,args){
  var finalMessage = JSON.stringify({cmd:command,args:args});
  console.log("================");
  console.log("Monkey - sending message: "+finalMessage);
  console.log("================");
  socketConnection.send(finalMessage);
}
function sendOpenToUser(monkeyId){
  sendCommand(MOKMessageProtocolCommand.OPEN, {rid: monkeyId});
}
function startConnection(monkey_id){

  var token=monkey.appKey+":"+monkey.secretKey;

  if(monkey.debugingMode){ //no ssl

    socketConnection = new WebSocket('ws://'+monkey.domainUrl+'/websockets?monkey_id='+monkey_id+'&p='+token,'criptext-protocol');
  }
  else{
    socketConnection = new WebSocket('wss://'+monkey.domainUrl+'/websockets?monkey_id='+monkey_id+'&p='+token,'criptext-protocol');
  }

  socketConnection.onopen = function () {
    monkey.status=STATUS.ONLINE;
    monkey.emitter.emitEvent('onConnect', {monkey_id:monkey.session.id});
    getPendingMessages();
  };

  socketConnection.onmessage = function (evt)
  {
    console.log("incoming message: "+evt.data);
    var jsonres=JSON.parse(evt.data);

    if (jsonres.args.app_id == null) {
      jsonres.args.app_id = monkey.appKey;
    }

    var msg = new MOKMessage(jsonres.cmd, jsonres.args);
    switch (parseInt(jsonres.cmd)){
      case MOKMessageProtocolCommand.MESSAGE:{
        processMOKProtocolMessage(msg);
        break;
      }
      case MOKMessageProtocolCommand.PUBLISH:{
        processMOKProtocolMessage(msg);
        break;
      }
      case MOKMessageProtocolCommand.ACK:{
        //msg.protocolCommand = MOKMessageProtocolCommand.ACK;
        //msg.monkeyType = set status value from props
        processMOKProtocolACK(msg);
        break;
      }
      case MOKMessageProtocolCommand.GET:{
        //notify watchdog
        switch(jsonres.args.type){
          case MOKGetType.HISTORY:{
            var arrayMessages = jsonres.args.messages;
            var remaining = jsonres.args.remaining_messages;

            processGetMessages(arrayMessages, remaining);
            break;
          }
          case MOKGetType.GROUPS:{
            msg.protocolCommand= MOKMessageProtocolCommand.GET;
            msg.protocolType = MOKMessageType.NOTIF;
            //monkeyType = MOKGroupsJoined;
            msg.text = jsonres.args.messages;

            monkey.emitter.emitEvent('onNotification', msg);
            break;
          }
        }

        break;
      }
      case MOKMessageProtocolCommand.SYNC:{
        //notify watchdog
        switch(jsonres.args.type){
          case MOKSyncType.HISTORY:{
            var arrayMessages = jsonres.args.messages;
            var remaining = jsonres.args.remaining_messages;

            processSyncMessages(arrayMessages, remaining);
            break;
          }
          case MOKSyncType.GROUPS:{
            msg.protocolCommand= MOKMessageProtocolCommand.GET;
            msg.protocolType = MOKMessageType.NOTIF;
            //monkeyType = MOKGroupsJoined;
            msg.text = jsonres.args.messages;
            monkey.emitter.emitEvent('onNotification', msg);
            break;
          }
        }

        break;
      }
      case MOKMessageProtocolCommand.OPEN:{
        msg.protocolCommand = MOKMessageProtocolCommand.OPEN;
        monkey.emitter.emitEvent('onNotification', msg);
        break;
      }
      default:{
        monkey.emitter.emitEvent('onNotification', msg);
        break;
      }
    }
  };

  socketConnection.onclose = function(evt)
  {
    //check if the web server disconnected me
    if (evt.wasClean) {
      console.log("Websocket closed - Connection closed... "+ evt);
      monkey.status=STATUS.OFFLINE;
    }else{
      //web server crashed, reconnect
      console.log("Websocket closed - Reconnecting... "+ evt);
      monkey.status=STATUS.CONNECTING;
      setTimeout(startConnection(monkey_id), 2000 );
    }
    monkey.emitter.emitEvent('onDisconnect');
  };
}

function processGetMessages(messages, remaining){
  processMultipleMessages(messages);

  if (remaining > 0) {
    requestMessagesSinceId(monkey.lastMessageId, 15, false);
  }
}

function processSyncMessages(messages, remaining){
  processMultipleMessages(messages);

  if (remaining > 0) {
    requestMessagesSinceTimestamp(monkey.lastTimestamp, 15, false);
  }
}

function getPendingMessages(){
  requestMessagesSinceTimestamp(monkey.lastTimestamp, 15, false);
}

function requestMessagesSinceId(lastMessageId, quantity, withGroups){
  var args = {
    messages_since: lastMessageId,
    qty:  quantity
  }

  if (withGroups == true) {
    args.groups = 1;
  }

  sendCommand(MOKMessageProtocolCommand.GET, args);
}

function requestMessagesSinceTimestamp(lastTimestamp, quantity, withGroups){
  var args = {
    since: lastTimestamp,
    qty:  quantity
  }

  if (withGroups == true) {
    args.groups = 1;
  }

  sendCommand(MOKMessageProtocolCommand.SYNC, args);
}

function processMOKProtocolMessage(message){
  console.log("===========================");
  console.log("MONKEY - Message in process: "+message.id+" type: "+message.protocolType);
  console.log("===========================");

  switch(message.protocolType){
    case MOKMessageType.TEXT:{
      incomingMessage(message);
      break;
    }
    case MOKMessageType.FILE:{
      fileReceived(message);
      break;
    }
    default:{
      monkey.emitter.emitEvent('onNotification', message);
      break;
    }
  }
}

function processMultipleMessages(messages){
  for (var i = messages.length - 1; i >= 0; i--) {
    let msg = new MOKMessage(MOKMessageProtocolCommand.MESSAGE, messages[i]);
    processMOKProtocolMessage(msg);
  }
}

function processMOKProtocolACK(message){
  console.log("===========================");
  console.log("MONKEY - ACK in process");
  console.log("===========================");

  //Aditional treatment can be done here
  monkey.emitter.emitEvent('onAcknowledge', message);
}

function incomingMessage(message){
  if (message.isEncrypted()) {
    try{
      message.text = aesDecryptIncomingMessage(message);
    }
    catch(error){
      console.log("===========================");
      console.log("MONKEY - Fail decrypting: "+message.id+" type: "+message.protocolType);
      console.log("===========================");
      //get keys
      getAESkeyFromUser(message.senderId, message, function(response){
        if (response != null) {
          incomingMessage(message);
        }
      });
      return;
    }

    if (message.text == null) {
      //get keys
      getAESkeyFromUser(message.senderId, message, function(response){
        if (response != null) {
          incomingMessage(message);
        }
      });
      return;
    }
  }else{
    message.text = message.encryptedText;
  }

  if (message.id > 0) {
    monkey.lastTimestamp = message.datetimeCreation;
    monkey.lastMessageId = message.id;
  }

  switch (message.protocolCommand){
    case MOKMessageProtocolCommand.MESSAGE:{
      monkey.emitter.emitEvent('onMessage', message);
      break;
    }
    case MOKMessageProtocolCommand.PUBLISH:{
      monkey.emitter.emitEvent('onChannelMessages', message);
      break;
    }
  }

}

function fileReceived(message){
  if (message.id > 0) {
    monkey.lastTimestamp = message.datetimeCreation;
    monkey.lastMessageId = message.id;
  }

  monkey.emitter.emitEvent('onMessage', message);
}

/*
API CONNECTOR
*/

/** Handling any type ajax request to api */

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response
  } else {
    var error = new Error(response.statusText)
    error.response = response
    throw error
  }
}

function parseJSON(response) {
  return response.json()
}

function basicRequest(methodName, endpointUrl, dataObj, isFile, onSuccess){

  console.log("Sending keys app "+monkey.appKey+" sec "+monkey.secretKey);
  console.log("==== domainUrl "+monkey.domainUrl+" endpointUrl "+endpointUrl);

  var basic=getAuthParamsBtoA(monkey.appKey+":"+monkey.secretKey);

  //setup request url
  var reqUrl = monkey.domainUrl+endpointUrl;
  if(monkey.debugingMode){ //no ssl
    reqUrl = "http://"+reqUrl;
  }else{
    reqUrl = "https://"+reqUrl;
  }

  var headersReq = {
	  	'Accept': '*/*',
	  	'Authorization': 'Basic '+ basic
	};

  var data = dataObj;
  //check if it's not file
  if (!isFile) {
  	headersReq['Content-Type'] = 'application/json';
    data = JSON.stringify({ data: JSON.stringify(dataObj) });
  }

  fetch(reqUrl, {
    method: methodName,
    credentials: 'include',
    headers: headersReq,
    body: data
  }).then(checkStatus)
  .then(parseJSON)
  .then(function(respObj) {
    onSuccess(null,respObj);
  }).catch(function(error) {
    onSuccess(error);
  });// end of AJAX CALL
}

function startSession(){

  var currentMonkeyId=null;

  if(monkey.session.id){
    currentMonkeyId=monkey.session.id;
  }

  var params={ user_info:monkey.session.userData,session_id:currentMonkeyId,expiring:monkey.session.expiring};

  monkey.status=STATUS.HANDSHAKE;

  basicRequest("POST", "/user/session",params, false, function(err,respObj){

    if(err){
      console.log(err);
      return;
    }

    if(respObj.data.monkeyId){

      monkey.session.id=respObj.data.monkeyId;
    }


    monkey.session.serverPublic=respObj.data.publicKey;

    monkey.emitter.emitEvent('onSession', {monkey_id:monkey.session.id});

    monkey.status=STATUS.CONNECTING;

    if(currentMonkeyId==monkey.session.id){

      console.log("Reusing Monkey ID : "+monkey.session.id);

      return syncKeys(monkey.session.id);
    }
    var myKeyParams=generateSessionKey();// generates local AES KEY
    var encryptedConnectParams=encryptSessionParams(myKeyParams, respObj.data.publicKey);

    monkey.keyStore[monkey.session.id]={key:monkey.session.myKey, iv:monkey.session.myIv};
    connect(monkey.session.id,encryptedConnectParams);

  });
}/// end of function startSession

function connect(monkeyId, usk){

  console.log(" MonkeyId "+monkeyId+" USK "+usk);
  basicRequest("POST", "/user/connect",{ monkey_id:monkeyId, usk:usk }, false, function(err,respObj){

    if(err){
      console.log(err);
      return;
    }

    console.log("Monkey - Connection to establish "+respObj);

    startConnection(monkeyId);
  });
}

function subscribe(channelname, callback) {

  basicRequest("POST", "/channel/subscribe/"+channelname ,{ monkey_id:monkey.session.id}, false, function(err,respObj){

    if(err){
      return;
    }
    monkey.emitter.emitEvent('onSubscribe', respObj);
  });
}

function syncKeys(monkeyId){

  // generate public key and private key for exchange
  // send public key to the server to encrypt the data at the server and then decrypt it
  generateExchangeKeys();
  basicRequest("POST", "/user/key/sync",{ monkey_id:monkeyId, public_key:monkey.session.exchangeKeys.getPublicKey() }, false, function(err,respObj){
    if(err){
      console.log(err);
      return;
    }
    console.log(respObj);
    console.log(JSON.stringify(respObj));

    monkey.lastTimestamp = respObj.data.last_time_synced;
    monkey.lastMessageId = respObj.data.last_message_id;

    var decryptedAesKeys=monkey.session.exchangeKeys.decrypt(respObj.data.keys);
    console.log("de "+decryptedAesKeys);
    var myAesKeys=decryptedAesKeys.split(":");
    monkey.session.myKey=myAesKeys[0];
    monkey.session.myIv=myAesKeys[1];
    //var myKeyParams=generateSessionKey();// generates local AES KEY
    monkey.keyStore[monkeyId]={key:monkey.session.myKey,iv:monkey.session.myIv};
    startConnection(monkeyId);
  });
}

function createGroup(members, groupInfo, optionalPush, optionalId, callback){
  //check if I'm already in the proposed members
  if (members.indexOf(monkey.session.id) == -1) {
    members.push(monkey.session.id);
  }

  basicRequest("POST", "/group/create",{
    monkey_id:monkey.session.id,
    members: members.join(),
    info: groupInfo,
    group_id: optionalId,
    push_all_members: optionalPush}, false, function(err,respObj){

      if(err){
        console.log("Monkey - error creating group: "+err);
        return callback(err);
      }
      console.log("Monkey - Success creating group"+ respObj.data.group_id);

      return callback(null, respObj.data);
    });
  }

  function addMemberToGroup(groupId, newMemberId, optionalPushNewMember, optionalPushExistingMembers, callback){

    basicRequest("POST", "/group/addmember",{
      monkey_id:monkey.session.id,
      new_member: newMemberId,
      group_id: groupId,
      push_new_member: optionalPushNewMember,
      push_all_members: optionalPushExistingMembers}, false, function(err,respObj){

        if(err){
          console.log("Monkey - error adding member: "+err);
          return callback(err);
        }

        return callback(null, respObj.data);
      });
    }

    function removeMemberFromGroup(groupId, memberId, callback){

      basicRequest("POST", "/group/delete",{ monkey_id:memberId, group_id:groupId }, false, function(err,respObj){

        if(err){
          console.log("Monkey - error removing member: "+err);
          return callback(err);
        }

        return callback(null, respObj.data);
      });
    }

    function getInfoById(monkeyId, callback){
      var endpoint = "/info/"+monkeyId;

      //check if it's a group
      if (monkeyId.indexOf("G:") >-1) {
        endpoint = "/group"+endpoint;
      }else{
        endpoint = "/user"+endpoint;
      }

      basicRequest("GET", endpoint ,{}, false, function(err,respObj){

        if(err){
          console.log("Monkey - error get info: "+err);
          return callback(err);
        }

        return callback(null, respObj.data);
      });
    }

    /*
    SECURITY
    */
    function getAESkeyFromUser(monkeyId, pendingMessage, callback){
      basicRequest("POST", "/user/key/exchange",{ monkey_id:monkey.session.id, user_to:monkeyId}, false, function(err,respObj){
        if(err){
          console.log("Monkey - error on getting aes keys "+err);
          return;
        }

        console.log("Monkey - Received new aes keys");
        var newParamKeys = aesDecrypt(respObj.data.convKey, monkey.session.id).split(":");
        var newAESkey = newParamKeys[0];
        var newIv = newParamKeys[1];

        var currentParamKeys = monkey.keyStore[respObj.data.session_to];

        monkey.keyStore[respObj.data.session_to] = {key:newParamKeys[0],iv:newParamKeys[1]};

        if (typeof(currentParamKeys) == "undefined") {
          return callback(pendingMessage);
        }

        //check if it's the same key
        if (newParamKeys[0] == currentParamKeys.key && newParamKeys[1] == currentParamKeys.iv) {
          requestEncryptedTextForMessage(pendingMessage, function(decryptedMessage){
            callback(decryptedMessage);
          });
        }else{//it's a new key
        callback(pendingMessage);
      }

    });
  }

  function requestEncryptedTextForMessage(message, callback){
    basicRequest("GET", "/message/"+message.id+"/open/secure",{}, false, function(err,respObj){
      if(err){
        console.log("Monkey - error on requestEncryptedTextForMessage: "+err);
        return callback(null);
      }

      console.log(respObj);
      message.encryptedText = respObj.data.message;
      message.encryptedText = aesDecrypt(message.encryptedText, monkey.session.id);
      if (message.encryptedText == null) {
        if (message.id > 0) {
          monkey.lastTimestamp = message.datetimeCreation;
          monkey.lastMessageId = message.id;
        }
        return callback(null);
      }
      message.encryptedText = message.text;
      message.setEncrypted(false);
      return callback(message);
    });
  }

  function aesDecryptIncomingMessage(message){
    return aesDecrypt(message.encryptedText, message.senderId);
  }

  function aesDecrypt(dataToDecrypt, monkeyId){
    var aesObj = monkey.keyStore[monkeyId];
    var aesKey = CryptoJS.enc.Base64.parse(aesObj.key);
    var initV = CryptoJS.enc.Base64.parse(aesObj.iv);
    var cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(dataToDecrypt) });
    var decrypted = CryptoJS.AES.decrypt(cipherParams, aesKey, { iv: initV }).toString(CryptoJS.enc.Utf8);

    return decrypted;
  }

  function decryptFile (fileToDecrypt, monkeyId) {

    var aesObj = monkey.keyStore[monkeyId];

    var aesKey=CryptoJS.enc.Base64.parse(aesObj.key);
    var initV= CryptoJS.enc.Base64.parse(aesObj.iv);

    var decrypted = CryptoJS.AES.decrypt(fileToDecrypt, aesKey, { iv: initV }).toString(CryptoJS.enc.Base64);

    // console.log('el tipo del archivo decriptado: '+ typeof(decrypted));

    return decrypted;
  }

  function aesEncrypt(dataToEncrypt, monkeyId){

    var aesObj = monkey.keyStore[monkeyId];
    var aesKey=CryptoJS.enc.Base64.parse(aesObj.key);
    var initV= CryptoJS.enc.Base64.parse(aesObj.iv);

    var encryptedData = CryptoJS.AES.encrypt(dataToEncrypt, aesKey, { iv: initV });

    return encryptedData.toString();
  }

  function compress(fileData){
    var binData = mok_convertDataURIToBinary(fileData);
    var gzip = new Zlib.Gzip(binData);
    var compressedBinary = gzip.compress(); //descompress
    // Uint8Array to base64
    var compressedArray = new Uint8Array(compressedBinary);
    var compressedBase64 = mok_arrayBufferToBase64(compressedArray);

    //this should be added by client 'data:image/png;base64'
    return compressedBase64;
  }

  function decompress(fileData){
    var binData = mok_convertDataURIToBinary(fileData);
    var gunzip = new Zlib.Gunzip(binData);
    var decompressedBinary = gunzip.decompress(); //descompress
    // Uint8Array to base64
    var decompressedArray = new Uint8Array(decompressedBinary);
    var decompressedBase64 = mok_arrayBufferToBase64(decompressedArray);

    //this should be added by client 'data:image/png;base64'
    return decompressedBase64;
  }

  /*
  TO BE DETERMINED
  */

  function generateTemporalId(){
    return Math.round((new Date().getTime()/1000)*-1);
  }

  function mok_convertDataURIToBinary(dataURI) {
    var raw = window.atob(dataURI);
    var rawLength = raw.length;
    var array = new Uint8Array(new ArrayBuffer(rawLength));

    for(var i = 0; i < rawLength; i++) {
      array[i] = raw.charCodeAt(i);
    }
    return array;
  }
  function mok_arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
  }
  function mok_getFileExtension(fileName){
    var arr = fileName.split('.');
    var extension= arr[arr.length-1];

    return extension;
  }

  function cleanFilePrefix(fileData){
    var cleanFileData = fileData;

    //check for possible ;base64,
    if (fileData.indexOf(",") > -1) {
      cleanFileData = fileData.slice(fileData.indexOf(",")+1);
    }

    return cleanFileData;
  }
  /*
  ARGS:{
  rid .- recipient monkey id
  msg .- message text to send
  params. JSON object with encr==1 if encrypted, eph=1 if ephemeral, compr:gzip
  type .- 1 messsage, 2 files, 3 temporal notes, 4 notifications, 5 alerts
}

params:{
encr:1,

}
*/

function sendMessage(text, recipientMonkeyId, optionalParams, optionalPush){
  var props = {
    device: "web",
    encr: 0,
  };

  return sendText(MOKMessageProtocolCommand.MESSAGE, text, recipientMonkeyId, props, optionalParams, optionalPush);
}

function sendEncryptedMessage(text, recipientMonkeyId, optionalParams, optionalPush){
  var props = {
    device: "web",
    encr: 1,
  };

  return sendText(MOKMessageProtocolCommand.MESSAGE, text, recipientMonkeyId, props, optionalParams, optionalPush);
}

function sendText(cmd, text, recipientMonkeyId, props, optionalParams, optionalPush){

  var args = prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
  args.msg = text;
  args.type = MOKMessageType.TEXT;

  var message = new MOKMessage(cmd, args);

  args.id = message.id;
  args.oldId = message.oldId;


  if (message.isEncrypted()) {
    message.encryptedText = aesEncrypt(text, monkey.session.id);
    args.msg = message.encryptedText;
  }

  sendCommand(cmd, args);

  return message;
}

function sendNotification(recipientMonkeyId, optionalParams, optionalPush){
  var props = {
    device: "web"
  };

  var args = prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
  args.type = MOKMessageType.NOTIF;

  var message = new MOKMessage(MOKMessageProtocolCommand.MESSAGE, args);

  args.id = message.id;
  args.oldId = message.oldId;

  sendCommand(MOKMessageProtocolCommand.MESSAGE, args);

  return message;
}

function prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush){
  var args = {
    app_id: monkey.appKey,
    sid: monkey.session.id,
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
      optionalPush = generateStandardPush(optionalPush);
      break;
    }
    default:
    optionalPush = {};
    break;
  }

  args["push"] = JSON.stringify(optionalPush);

  return args;
}


function publish(text, channelName, optionalParams){
  var props = {
    device: "web",
    encr: 0
  };

  return sendText(MOKMessageProtocolCommand.PUBLISH, text, channelName, props, optionalParams);
}

function sendFile(data, recipientMonkeyId, fileName, mimeType, fileType, shouldCompress, optionalParams, optionalPush, callback){
  var props = {
    device: "web",
    encr: 0,
    file_type: fileType,
    ext: mok_getFileExtension(fileName),
    filename: fileName
  };

  if (shouldCompress) {
    props.cmpr = "gzip";
  }

  if (mimeType) {
    props.mime_type = mimeType;
  }

  return uploadFile(data, recipientMonkeyId, fileName, props, optionalParams, function(error, message){
    if (error) {
      callback(error, message);
    }

    callback(null, message);
  });


}

function sendEncryptedFile(data, recipientMonkeyId, fileName, mimeType, fileType, shouldCompress, optionalParams, optionalPush, callback){
  var props = {
    device: "web",
    encr: 1,
    file_type: fileType,
    ext: mok_getFileExtension(fileName),
    filename: fileName
  };

  if (shouldCompress) {
    props.cmpr = "gzip";
  }

  if (mimeType) {
    props.mime_type = mimeType;
  }

  return uploadFile(data, recipientMonkeyId, fileName, props, optionalParams, optionalPush, function(error, message){
    if (error) {
      callback(error, message);
    }

    callback(null, message);
  });
}

function uploadFile(fileData, recipientMonkeyId, fileName, props, optionalParams, optionalPush, callback) {

  fileData = cleanFilePrefix(fileData);

  var binData = mok_convertDataURIToBinary(fileData);
  props.size = binData.size;

  var args = prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
  args.msg = fileName;
  args.type = MOKMessageType.FILE;

  var message = new MOKMessage(MOKMessageProtocolCommand.MESSAGE, args);

  args.id = message.id;
  args.oldId = message.oldId;
  args.props = message.props;
  args.params = message.params;

  if (message.isCompressed()) {
    fileData = compress(fileData);
  }

  if (message.isEncrypted()) {
    fileData = aesEncrypt(fileData, monkey.session.id);
  }

  var fileToSend = new Blob([fileData.toString()], {type: message.props.file_type});
  fileToSend.name=fileName;

  var basic=getAuthParamsBtoA(monkey.appKey+":"+monkey.secretKey);

  var data = new FormData();
  //agrega el archivo y la info al form
  data.append("file", fileToSend);
  data.append("data", JSON.stringify(args) );

  basicRequest("POST", "/file/new/base64",data, true, function(err,respObj){
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
function getAllConversations (onComplete) {
  basicRequest("GET", "/user/"+monkey.session.id+"/conversations",{}, false, function(err,respObj){
    if (err) {
      console.log('FAIL TO GET ALL CONVERSATIONS');
      onComplete(err.toString());
      return;
    }
    console.log("GET ALL CONVERSATIONS");
    onComplete(null, respObj);

  });
}

function getConversationMessages(conversationId, numberOfMessages, lastMessageId, onComplete) {

  if (lastMessageId == null) {
    lastMessageId = "";
  }

  basicRequest("GET", "/conversation/messages/"+monkey.session.id+"/"+conversationId+"/"+numberOfMessages+"/"+lastMessageId,{}, false, function(err,respObj){
    if (err) {
      console.log('FAIL TO GET CONVERSATION MESSAGES');
      onComplete(err.toString());
      return;
    }
    console.log("GET CONVERSATION MESSAGES");

    var messages = respObj.data.messages;

    var messagesArray = messages.reduce(function(result, message){
      let msg = new MOKMessage(MOKMessageProtocolCommand.MESSAGE, message);
      result.push(msg);
      return result;
    },[]);

    //TODO: decrypt bulk messages and send to callback
    decryptBulkMessages(messagesArray, [], function(decryptedMessages){
      onComplete(null, decryptedMessages);
    });
  });
}

//recursive function
function decryptBulkMessages(messages, decryptedMessages, onComplete){

  if(!(typeof messages != "undefined" && messages != null && messages.length > 0)){
    return onComplete(decryptedMessages);
  }

  var message = messages.shift();

  if (message.isEncrypted() && message.protocolType != MOKMessageType.FILE) {
    try{
      message.text = aesDecryptIncomingMessage(message);
    }
    catch(error){
      console.log("===========================");
      console.log("MONKEY - Fail decrypting: "+message.id+" type: "+message.protocolType);
      console.log("===========================");
      //get keys
      getAESkeyFromUser(message.senderId, message, function(response){
        if (response != null) {
          messages.unshift(message);
        }

        decryptBulkMessages(messages, decryptedMessages, onComplete);
      });
      return;
    }

    if (message.text == null) {
      //get keys
      getAESkeyFromUser(message.senderId, message, function(response){
        if (response != null) {
          messages.unshift(message);
        }

        decryptBulkMessages(message, decryptedMessages, onComplete);
      });
      return;
    }
  }else{
    message.text = message.encryptedText;
  }

  decryptedMessages.push(message);

  decryptBulkMessages(messages, decryptedMessages, onComplete);
}

function getMessagesSince (timestamp, onComplete) {

  basicRequest("GET", "/user/"+monkey.session.id+"/messages/"+timestamp,{}, false, function(err,respObj){
    if (err) {
      console.log('FAIL TO GET MESSAGES');
      onComplete(err.toString());
      return;
    }
    console.log("GET MESSAGES");
    onComplete(null, respObj);
  });
}

function generateStandardPush (stringMessage){
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

/*
locKey = string,
locArgs = array
*/
function generateLocalizedPush (locKey, locArgs, defaultText, sound){
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
function getExtention (filename){
  var arr = filename.split('.');
  var extension= arr[arr.length-1];

  return extension;
}
function downloadFile(message, onComplete){

  basicRequest("GET", "/file/open/"+message.text+"/base64",{}, false, function(err,fileData){
    if (err) {
      console.log('Monkey - Download File Fail');
      onComplete(err.toString());
      return;
    }
    console.log("Monkey - Download File OK");
    decryptDownloadedFile(fileData, message, function(error, finalData){
      if (error) {
        console.log("Monkey - Fail to decrypt downloaded file");
        onComplete(error);
        return;
      }
      onComplete(null, finalData);
    });
  });
}/// end of function downloadFile

function decryptDownloadedFile(fileData, message, callback){
  if (message.isEncrypted()) {
    var decryptedData = null;
    try{
      var currentSize = fileData.length;
      console.log("Monkey - encrypted file size: "+currentSize);

      //temporal fix for media sent from web
      if (message.props.device == "web") {
        decryptedData = aesDecrypt(fileData, message.senderId);
      }else{
        decryptedData = decryptFile(fileData, message.senderId);
      }

      var newSize = decryptedData.length;
      console.log("Monkey - decrypted file size: "+newSize);

      if (currentSize == newSize) {
        getAESkeyFromUser(message.senderId, message, function(response){
          if (response != null) {
            decryptDownloadedFile(fileData, message, callback);
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
      getAESkeyFromUser(message.senderId, message, function(response){
        if (response != null) {
          decryptDownloadedFile(fileData, message, callback);
        }else{
          callback("Error decrypting downloaded file");
        }
      });
      return;
    }

    if (decryptedData == null) {
      //get keys
      getAESkeyFromUser(message.senderId, message, function(response){
        if (response != null) {
          decryptDownloadedFile(fileData, message, callback);
        }else{
          callback("Error decrypting downloaded file");
        }
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
function postMessage(messageObj){
  /* {"cmd":"0","args":{"id":"-1423607192","rid":"i5zuxft2zkl3t35gjui60f6r","msg":"IX76YKyM90pXh+FL/R0cNQ=="}}*/
  console.log("MessageObj sending "+JSON.stringify(messageObj));
  basicRequest("POST", "/message/new",messageObj, false, function(err,respObj){
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


function generateSessionKey(){
  var key = CryptoJS.enc.Hex.parse(Generate_key(32));//256 bits
  var iv  = CryptoJS.enc.Hex.parse(Generate_key(16));//128 bits
  monkey.session.myKey=btoa(key);
  monkey.session.myIv=btoa(iv);
  //now you have to encrypt
  return monkey.session.myKey+":"+monkey.session.myIv;
}

function Generate_key(len){
  var key = "";
  var hex = "0123456789abcdef";
  for (var i = 0; i < len; i++) {
    key += hex.charAt(Math.floor(Math.random() * 16));
  }
  return key;
}

function generateExchangeKeys(){
  var jsencrypt = new JSEncrypt();

  //jsencrypt.getPublicKey()

  monkey.session.exchangeKeys=jsencrypt;
}

function encryptSessionParams(sessionParams, publicKey){
  var jsencrypt = new JSEncrypt();
  jsencrypt.setPublicKey(publicKey);
  var encryptedData=jsencrypt.encrypt(sessionParams);
  return encryptedData;
}

function getAuthParamsBtoA(connectAuthParamsString){

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

module.exports = monkey;



//  ===== END OF FILE
