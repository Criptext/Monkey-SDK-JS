var monkey =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "monkey/dist/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	var _MOKMessage = __webpack_require__(1);

	var _MOKMessage2 = _interopRequireDefault(_MOKMessage);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	/*
		Main lib of monkey that will be bundled with webpack
	*/

	/*
		The following libs in scripts are loaded using the module script-loader 
		of webpack, to be used as global scripts.
		This is a replacement of <script tag>
	*/

	__webpack_require__(2);
	__webpack_require__(3);
	__webpack_require__(4);

	window.MOKMessage = _MOKMessage2.default;

	var STATUS = {
	    OFFLINE: 0,
	    HANDSHAKE: 1,
	    CONNECTING: 2,
	    ONLINE: 3
	};

	var MOKMessageProtocolCommand = {
	    MESSAGE: 200,
	    GET: 201,
	    TRANSACTION: 202,
	    OPEN: 203,
	    SET: 204,
	    ACK: 205,
	    PUBLISH: 206,
	    DELETE: 207,
	    CLOSE: 208,
	    SYNC: 209,
	    MESSAGENOTDELIVERED: 50,
	    MESSAGEDELIVERED: 51,
	    MESSAGEREAD: 52
	};

	var MOKMessageType = {
	    TEXT: 1,
	    FILE: 2,
	    TEMP_NOTE: 3,
	    NOTIF: 4,
	    ALERT: 5
	};

	var MOKMessageFileType = {
	    AUDIO: 1,
	    VIDEO: 2,
	    PHOTO: 3,
	    ARCHIVE: 4
	};

	var MOKGetType = {
	    HISTORY: 1,
	    GROUPS: 2
	};

	var MOKSyncType = {
	    HISTORY: 1,
	    GROUPS: 2
	};

	var $ = __webpack_require__(9);
	window.jQuery = $;
	window.$ = $;
	// var jQueryScriptOutputted = false;

	// function initJQuery() {

	//     //if the jQuery object isn't available
	//     if (typeof(jQuery) == 'undefined') {

	//         if (! jQueryScriptOutputted) {
	//             //only output the script once..
	//             jQueryScriptOutputted = true;
	//             var $script = require("scriptjs");
	//             $script("//ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min.js", function() {

	// 			  console.log("Monkey is ready");

	// 			});
	//         }
	//         //setTimeout("initJQuery()", 50);
	//     } else {

	//         $(function() { 
	//             //do anything that needs to be done on document.ready
	//             console.log("Monkey is ready");
	//         });
	//     }

	// }

	// initJQuery();

	/* Start monkey,js implementation */

	//updates from feeds

	var socketConnection = null;

	var monkey = new function () {

	    this.session = { id: null, serverPublic: null, userData: null };
	    this.appKey = null;
	    this.secretKey = null;
	    this.keyStore = null;
	    this.session.expiring = 0;
	    this.domainUrl = "secure.criptext.com";
	    this.status = STATUS.OFFLINE; // offline default
	    this.lastTimestamp = 0;
	    this.lastMessageId = 0;

	    this.init = function (appKey, secretKey, userObj, optionalExpiring, optionalDebuging) {
	        this.appKey = appKey;
	        this.secretKey = secretKey;
	        this.session.userData = userObj; // validate JSON String
	        this.keyStore = {};
	        this.debugingMode = false;

	        optionalExpiring ? this.session.expiring = 1 : this.session.expiring = 0;

	        optionalDebuging ? this.debugingMode = true : this.debugingMode = false;

	        if (userObj) {
	            userObj.monkey_id ? this.session.id = userObj.monkey_id : this.session.id = null;
	        }

	        console.log("====  init domain " + this.domainUrl);

	        startSession();
	    };

	    this.generateLocalizedPush = generateLocalizedPush;
	    //network
	    this.sendMessage = sendMessage;
	    this.sendEncryptedMessage = sendEncryptedMessage;
	    this.sendOpenToUser = sendOpenToUser;
	    this.sendNotification = sendNotification;
	    this.publish = publish;
	    this.getPendingMessages = getPendingMessages;

	    //http
	    this.subscribe = subscribe;
	    this.sendFile = sendFile;
	    this.sendEncryptedFile = sendEncryptedFile;
	    this.downloadFile = downloadFile;
	    this.createGroup = createGroup;
	    this.addMemberToGroup = addMemberToGroup;
	    this.removeMemberFromGroup = removeMemberFromGroup;
	    this.getInfoById = getInfoById;
	    this.getAllConversations = getAllConversations;
	    this.getConversationMessages = getConversationMessages;
	    //check if there's reason for this to exist
	    this.getMessagesSince = getMessagesSince;
	}();

	/*
	    NETWORKING
	 */

	function sendCommand(command, args) {
	    var finalMessage = JSON.stringify({ cmd: command, args: args });
	    console.log("================");
	    console.log("Monkey - sending message: " + finalMessage);
	    console.log("================");
	    socketConnection.send(finalMessage);
	}
	function sendOpenToUser(monkeyId) {
	    sendCommand(MOKMessageProtocolCommand.OPEN, { rid: monkeyId });
	}
	function startConnection(monkey_id) {

	    var token = monkey.appKey + ":" + monkey.secretKey;

	    if (monkey.debugingMode) {
	        //no ssl

	        socketConnection = new WebSocket('ws://' + monkey.domainUrl + '/websockets?monkey_id=' + monkey_id + '&p=' + token, 'criptext-protocol');
	    } else {
	        socketConnection = new WebSocket('wss://' + monkey.domainUrl + '/websockets?monkey_id=' + monkey_id + '&p=' + token, 'criptext-protocol');
	    }

	    socketConnection.onopen = function () {
	        monkey.status = STATUS.ONLINE;
	        $(monkey).trigger("onConnect", { monkey_id: monkey.session.id });
	        getPendingMessages();
	    };

	    socketConnection.onmessage = function (evt) {
	        console.log("incoming message: " + evt.data);
	        var jsonres = JSON.parse(evt.data);

	        if (jsonres.args.app_id == null) {
	            jsonres.args.app_id = monkey.appKey;
	        }

	        var msg = new _MOKMessage2.default(jsonres.cmd, jsonres.args);
	        switch (parseInt(jsonres.cmd)) {
	            case MOKMessageProtocolCommand.MESSAGE:
	                {
	                    processMOKProtocolMessage(msg);
	                    break;
	                }
	            case MOKMessageProtocolCommand.PUBLISH:
	                {
	                    processMOKProtocolMessage(msg);
	                    break;
	                }
	            case MOKMessageProtocolCommand.ACK:
	                {
	                    //msg.protocolCommand = MOKMessageProtocolCommand.ACK;
	                    //msg.monkeyType = set status value from props
	                    processMOKProtocolACK(msg);
	                    break;
	                }
	            case MOKMessageProtocolCommand.GET:
	                {
	                    //notify watchdog
	                    switch (jsonres.args.type) {
	                        case MOKGetType.HISTORY:
	                            {
	                                var arrayMessages = jsonres.args.messages;
	                                var remaining = jsonres.args.remaining_messages;

	                                processGetMessages(arrayMessages, remaining);
	                                break;
	                            }
	                        case MOKGetType.GROUPS:
	                            {
	                                msg.protocolCommand = MOKMessageProtocolCommand.GET;
	                                msg.protocolType = MOKMessageType.NOTIF;
	                                //monkeyType = MOKGroupsJoined;
	                                msg.text = jsonres.args.messages;

	                                $(monkey).trigger("onNotification", msg);
	                                break;
	                            }
	                    }

	                    break;
	                }
	            case MOKMessageProtocolCommand.SYNC:
	                {
	                    //notify watchdog
	                    switch (jsonres.args.type) {
	                        case MOKSyncType.HISTORY:
	                            {
	                                var arrayMessages = jsonres.args.messages;
	                                var remaining = jsonres.args.remaining_messages;

	                                processSyncMessages(arrayMessages, remaining);
	                                break;
	                            }
	                        case MOKSyncType.GROUPS:
	                            {
	                                msg.protocolCommand = MOKMessageProtocolCommand.GET;
	                                msg.protocolType = MOKMessageType.NOTIF;
	                                //monkeyType = MOKGroupsJoined;
	                                msg.text = jsonres.args.messages;

	                                $(monkey).trigger("onNotification", msg);
	                                break;
	                            }
	                    }

	                    break;
	                }
	            case MOKMessageProtocolCommand.OPEN:
	                {
	                    msg.protocolCommand = MOKMessageProtocolCommand.OPEN;
	                    $(monkey).trigger("onNotification", msg);
	                    break;
	                }
	            default:
	                {
	                    $(monkey).trigger("onNotification", msg);
	                    break;
	                }
	        }
	    };

	    socketConnection.onclose = function (evt) {
	        //check if the web server disconnected me
	        if (evt.wasClean) {
	            console.log("Websocket closed - Connection closed... " + evt);
	            monkey.status = STATUS.OFFLINE;
	        } else {
	            //web server crashed, reconnect
	            console.log("Websocket closed - Reconnecting... " + evt);
	            monkey.status = STATUS.CONNECTING;
	            setTimeout(startConnection(monkey_id), 2000);
	        }

	        $(monkey).trigger("onDisconnect");
	    };
	}

	function processGetMessages(messages, remaining) {
	    processMultipleMessages(messages);

	    if (remaining > 0) {
	        requestMessagesSinceId(monkey.lastMessageId, 15, false);
	    }
	}

	function processSyncMessages(messages, remaining) {
	    processMultipleMessages(messages);

	    if (remaining > 0) {
	        requestMessagesSinceTimestamp(monkey.lastTimestamp, 15, false);
	    }
	}

	function getPendingMessages() {
	    requestMessagesSinceTimestamp(monkey.lastTimestamp, 15, false);
	}

	function requestMessagesSinceId(lastMessageId, quantity, withGroups) {
	    var args = {
	        messages_since: lastMessageId,
	        qty: quantity
	    };

	    if (withGroups == true) {
	        args.groups = 1;
	    }

	    sendCommand(MOKMessageProtocolCommand.GET, args);
	}

	function requestMessagesSinceTimestamp(lastTimestamp, quantity, withGroups) {
	    var args = {
	        since: lastTimestamp,
	        qty: quantity
	    };

	    if (withGroups == true) {
	        args.groups = 1;
	    }

	    sendCommand(MOKMessageProtocolCommand.SYNC, args);
	}

	function processMOKProtocolMessage(message) {
	    console.log("===========================");
	    console.log("MONKEY - Message in process: " + message.id + " type: " + message.protocolType);
	    console.log("===========================");

	    switch (message.protocolType) {
	        case MOKMessageType.TEXT:
	            {
	                incomingMessage(message);
	                break;
	            }
	        case MOKMessageType.FILE:
	            {
	                fileReceived(message);
	                break;
	            }
	        default:
	            {
	                $(monkey).trigger("onNotification", message);
	                break;
	            }
	    }
	}

	function processMultipleMessages(messages) {
	    for (var i = messages.length - 1; i >= 0; i--) {
	        var msg = new _MOKMessage2.default(MOKMessageProtocolCommand.MESSAGE, messages[i]);
	        processMOKProtocolMessage(msg);
	    }
	}

	function processMOKProtocolACK(message) {
	    console.log("===========================");
	    console.log("MONKEY - ACK in process");
	    console.log("===========================");

	    //Aditional treatment can be done here

	    $(monkey).trigger("onAcknowledge", message);
	}

	function incomingMessage(message) {
	    if (message.isEncrypted()) {
	        try {
	            message.text = aesDecryptIncomingMessage(message);
	        } catch (error) {
	            console.log("===========================");
	            console.log("MONKEY - Fail decrypting: " + message.id + " type: " + message.protocolType);
	            console.log("===========================");
	            //get keys
	            getAESkeyFromUser(message.senderId, message, function (response) {
	                if (response != null) {
	                    incomingMessage(message);
	                }
	            });
	            return;
	        }

	        if (message.text == null) {
	            //get keys
	            getAESkeyFromUser(message.senderId, message, function (response) {
	                if (response != null) {
	                    incomingMessage(message);
	                }
	            });
	            return;
	        }
	    } else {
	        message.text = message.encryptedText;
	    }

	    if (message.id > 0) {
	        monkey.lastTimestamp = message.datetimeCreation;
	        monkey.lastMessageId = message.id;
	    }

	    switch (message.protocolCommand) {
	        case MOKMessageProtocolCommand.MESSAGE:
	            {
	                $(monkey).trigger("onMessage", message);
	                break;
	            }
	        case MOKMessageProtocolCommand.PUBLISH:
	            {
	                $(monkey).trigger("onChannelMessages", message);
	                break;
	            }
	    }
	}

	function fileReceived(message) {
	    if (message.id > 0) {
	        monkey.lastTimestamp = message.datetimeCreation;
	        monkey.lastMessageId = message.id;
	    }

	    $(monkey).trigger("onMessage", message);
	}

	/*
	    API CONNECTOR
	 */

	/** Handling any type ajax request to api */

	function basicAjaxRequest(methodName, endpointUrl, dataObj, onSuccess) {

	    console.log("Sending keys app " + monkey.appKey + " sec " + monkey.secretKey);
	    console.log("==== domainUrl " + monkey.domainUrl + " endpointUrl " + endpointUrl);

	    var basic = getAuthParamsBtoA(monkey.appKey + ":" + monkey.secretKey);

	    //setup request url
	    var reqUrl = monkey.domainUrl + endpointUrl;
	    if (monkey.debugingMode) {
	        //no ssl
	        reqUrl = "http://" + reqUrl;
	    } else {
	        reqUrl = "https://" + reqUrl;
	    }

	    $.ajax({
	        type: methodName,
	        url: reqUrl,
	        data: { data: JSON.stringify(dataObj) },
	        async: true,
	        xhrFields: { withCredentials: true },
	        beforeSend: function beforeSend(xhr) {
	            xhr.setRequestHeader('Accept', '*/*');
	            xhr.setRequestHeader("Authorization", "Basic " + basic);
	        },
	        success: function success(respObj) {
	            onSuccess(null, respObj);
	        },
	        error: function error(err) {
	            onSuccess(err);
	        }
	    }); // end of AJAX CALL
	}

	function startSession() {

	    var currentMonkeyId = null;

	    if (monkey.session.id) {
	        currentMonkeyId = monkey.session.id;
	    }

	    var params = { user_info: monkey.session.userData, session_id: currentMonkeyId, expiring: monkey.session.expiring };

	    monkey.status = STATUS.HANDSHAKE;

	    basicAjaxRequest("POST", "/user/session", params, function (err, respObj) {

	        if (err) {
	            console.log(err);
	            return;
	        }

	        if (respObj.data.monkeyId) {

	            monkey.session.id = respObj.data.monkeyId;
	        }

	        monkey.session.serverPublic = respObj.data.publicKey;

	        $(monkey).trigger("onSession", { monkey_id: monkey.session.id });

	        monkey.status = STATUS.CONNECTING;

	        if (currentMonkeyId == monkey.session.id) {

	            console.log("Reusing Monkey ID : " + monkey.session.id);

	            return syncKeys(monkey.session.id);
	        }
	        var myKeyParams = generateSessionKey(); // generates local AES KEY
	        var encryptedConnectParams = encryptSessionParams(myKeyParams, respObj.data.publicKey);

	        monkey.keyStore[monkey.session.id] = { key: monkey.session.myKey, iv: monkey.session.myIv };
	        connect(monkey.session.id, encryptedConnectParams);
	    });
	} /// end of function startSession

	function connect(monkeyId, usk) {

	    console.log(" MonkeyId " + monkeyId + " USK " + usk);
	    basicAjaxRequest("POST", "/user/connect", { monkey_id: monkeyId, usk: usk }, function (err, respObj) {

	        if (err) {
	            console.log(err);
	            return;
	        }

	        console.log("Monkey - Connection to establish " + respObj);

	        startConnection(monkeyId);
	    });
	}

	function subscribe(channelname, callback) {

	    basicAjaxRequest("POST", "/channel/subscribe/" + channelname, { monkey_id: monkey.session.id }, function (err, respObj) {

	        if (err) {
	            return;
	        }
	        $(monkey).trigger("onSubscribe", respObj);
	    });
	}

	function syncKeys(monkeyId) {

	    // generate public key and private key for exchange
	    // send public key to the server to encrypt the data at the server and then decrypt it
	    generateExchangeKeys();
	    basicAjaxRequest("POST", "/user/key/sync", { monkey_id: monkeyId, public_key: monkey.session.exchangeKeys.getPublicKey() }, function (err, respObj) {
	        if (err) {
	            console.log(err);
	            return;
	        }
	        console.log(respObj);
	        console.log(JSON.stringify(respObj));

	        monkey.lastTimestamp = respObj.data.last_time_synced;
	        monkey.lastMessageId = respObj.data.last_message_id;

	        var decryptedAesKeys = monkey.session.exchangeKeys.decrypt(respObj.data.keys);
	        console.log("de " + decryptedAesKeys);
	        var myAesKeys = decryptedAesKeys.split(":");
	        monkey.session.myKey = myAesKeys[0];
	        monkey.session.myIv = myAesKeys[1];
	        //var myKeyParams=generateSessionKey();// generates local AES KEY
	        monkey.keyStore[monkeyId] = { key: monkey.session.myKey, iv: monkey.session.myIv };
	        startConnection(monkeyId);
	    });
	}

	function createGroup(members, groupInfo, optionalPush, optionalId, callback) {
	    //check if I'm already in the proposed members
	    if (members.indexOf(monkey.session.id) == -1) {
	        members.push(monkey.session.id);
	    }

	    basicAjaxRequest("POST", "/group/create", {
	        monkey_id: monkey.session.id,
	        members: members.join(),
	        info: groupInfo,
	        group_id: optionalId,
	        push_all_members: optionalPush }, function (err, respObj) {

	        if (err) {
	            console.log("Monkey - error creating group: " + err);
	            return callback(err);
	        }
	        console.log("Monkey - Success creating group" + respObj.data.group_id);

	        return callback(null, respObj.data);
	    });
	}

	function addMemberToGroup(groupId, newMemberId, optionalPushNewMember, optionalPushExistingMembers, callback) {

	    basicAjaxRequest("POST", "/group/addmember", {
	        monkey_id: monkey.session.id,
	        new_member: newMemberId,
	        group_id: groupId,
	        push_new_member: optionalPushNewMember,
	        push_all_members: optionalPushExistingMembers }, function (err, respObj) {

	        if (err) {
	            console.log("Monkey - error adding member: " + err);
	            return callback(err);
	        }

	        return callback(null, respObj.data);
	    });
	}

	function removeMemberFromGroup(groupId, memberId, callback) {

	    basicAjaxRequest("POST", "/group/delete", { monkey_id: memberId, group_id: groupId }, function (err, respObj) {

	        if (err) {
	            console.log("Monkey - error removing member: " + err);
	            return callback(err);
	        }

	        return callback(null, respObj.data);
	    });
	}

	function getInfoById(monkeyId, callback) {
	    var endpoint = "/info/" + monkeyId;

	    //check if it's a group
	    if (monkeyId.indexOf("G:") > -1) {
	        endpoint = "/group" + endpoint;
	    } else {
	        endpoint = "/user" + endpoint;
	    }

	    basicAjaxRequest("GET", endpoint, {}, function (err, respObj) {

	        if (err) {
	            console.log("Monkey - error get info: " + err);
	            return callback(err);
	        }

	        return callback(null, respObj.data);
	    });
	}

	/*
	    SECURITY
	 */
	function getAESkeyFromUser(monkeyId, pendingMessage, callback) {
	    basicAjaxRequest("POST", "/user/key/exchange", { monkey_id: monkey.session.id, user_to: monkeyId }, function (err, respObj) {
	        if (err) {
	            console.log("Monkey - error on getting aes keys " + err);
	            return;
	        }

	        console.log("Monkey - Received new aes keys");
	        var newParamKeys = aesDecrypt(respObj.data.convKey, monkey.session.id).split(":");
	        var newAESkey = newParamKeys[0];
	        var newIv = newParamKeys[1];

	        var currentParamKeys = monkey.keyStore[respObj.data.session_to];

	        monkey.keyStore[respObj.data.session_to] = { key: newParamKeys[0], iv: newParamKeys[1] };

	        if (typeof currentParamKeys == "undefined") {
	            return callback(pendingMessage);
	        }

	        //check if it's the same key
	        if (newParamKeys[0] == currentParamKeys.key && newParamKeys[1] == currentParamKeys.iv) {
	            requestEncryptedTextForMessage(pendingMessage, function (decryptedMessage) {
	                callback(decryptedMessage);
	            });
	        } else {
	            //it's a new key
	            callback(pendingMessage);
	        }
	    });
	}

	function requestEncryptedTextForMessage(message, callback) {
	    basicAjaxRequest("GET", "/message/" + message.id + "/open/secure", {}, function (err, respObj) {
	        if (err) {
	            console.log("Monkey - error on requestEncryptedTextForMessage: " + err);
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

	function aesDecryptIncomingMessage(message) {
	    return aesDecrypt(message.encryptedText, message.senderId);
	}

	function aesDecrypt(dataToDecrypt, monkeyId) {
	    var aesObj = monkey.keyStore[monkeyId];
	    var aesKey = CryptoJS.enc.Base64.parse(aesObj.key);
	    var initV = CryptoJS.enc.Base64.parse(aesObj.iv);
	    var cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(dataToDecrypt) });
	    var decrypted = CryptoJS.AES.decrypt(cipherParams, aesKey, { iv: initV }).toString(CryptoJS.enc.Utf8);

	    return decrypted;
	}

	function decryptFile(fileToDecrypt, monkeyId) {

	    var aesObj = monkey.keyStore[monkeyId];

	    var aesKey = CryptoJS.enc.Base64.parse(aesObj.key);
	    var initV = CryptoJS.enc.Base64.parse(aesObj.iv);

	    var decrypted = CryptoJS.AES.decrypt(fileToDecrypt, aesKey, { iv: initV }).toString(CryptoJS.enc.Base64);

	    // console.log('el tipo del archivo decriptado: '+ typeof(decrypted));

	    return decrypted;
	}

	function aesEncrypt(dataToEncrypt, monkeyId) {

	    var aesObj = monkey.keyStore[monkeyId];
	    var aesKey = CryptoJS.enc.Base64.parse(aesObj.key);
	    var initV = CryptoJS.enc.Base64.parse(aesObj.iv);

	    var encryptedData = CryptoJS.AES.encrypt(dataToEncrypt, aesKey, { iv: initV });

	    return encryptedData.toString();
	}

	function compress(fileData) {
	    var binData = mok_convertDataURIToBinary(fileData);
	    var gzip = new Zlib.Gzip(binData);
	    var compressedBinary = gzip.compress(); //descompress
	    // Uint8Array to base64
	    var compressedArray = new Uint8Array(compressedBinary);
	    var compressedBase64 = mok_arrayBufferToBase64(compressedArray);

	    //this should be added by client 'data:image/png;base64'
	    return compressedBase64;
	}

	function decompress(fileData) {
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

	function generateTemporalId() {
	    return Math.round(new Date().getTime() / 1000 * -1);
	}

	function mok_convertDataURIToBinary(dataURI) {
	    var raw = window.atob(dataURI);
	    var rawLength = raw.length;
	    var array = new Uint8Array(new ArrayBuffer(rawLength));

	    for (var i = 0; i < rawLength; i++) {
	        array[i] = raw.charCodeAt(i);
	    }
	    return array;
	}
	function mok_arrayBufferToBase64(buffer) {
	    var binary = '';
	    var bytes = new Uint8Array(buffer);
	    var len = bytes.byteLength;
	    for (var i = 0; i < len; i++) {
	        binary += String.fromCharCode(bytes[i]);
	    }
	    return window.btoa(binary);
	}
	function mok_getFileExtension(fileName) {
	    var arr = fileName.split('.');
	    var extension = arr[arr.length - 1];

	    return extension;
	}

	function cleanFilePrefix(fileData) {
	    var cleanFileData = fileData;

	    //check for possible ;base64,
	    if (fileData.indexOf(",") > -1) {
	        cleanFileData = fileData.slice(fileData.indexOf(",") + 1);
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

	function sendMessage(text, recipientMonkeyId, optionalParams, optionalPush) {
	    var props = {
	        device: "web",
	        encr: 0
	    };

	    return sendText(MOKMessageProtocolCommand.MESSAGE, text, recipientMonkeyId, props, optionalParams, optionalPush);
	}

	function sendEncryptedMessage(text, recipientMonkeyId, optionalParams, optionalPush) {
	    var props = {
	        device: "web",
	        encr: 1
	    };

	    return sendText(MOKMessageProtocolCommand.MESSAGE, text, recipientMonkeyId, props, optionalParams, optionalPush);
	}

	function sendText(cmd, text, recipientMonkeyId, props, optionalParams, optionalPush) {

	    var args = prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
	    args.msg = text;
	    args.type = MOKMessageType.TEXT;

	    var message = new _MOKMessage2.default(cmd, args);

	    args.id = message.id;
	    args.oldId = message.oldId;

	    if (message.isEncrypted()) {
	        message.encryptedText = aesEncrypt(text, monkey.session.id);
	        args.msg = message.encryptedText;
	    }

	    sendCommand(cmd, args);

	    return message;
	}

	function sendNotification(recipientMonkeyId, optionalParams, optionalPush) {
	    var props = {
	        device: "web"
	    };

	    var args = prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
	    args.type = MOKMessageType.NOTIF;

	    var message = new _MOKMessage2.default(MOKMessageProtocolCommand.MESSAGE, args);

	    args.id = message.id;
	    args.oldId = message.oldId;

	    sendCommand(MOKMessageProtocolCommand.MESSAGE, args);

	    return message;
	}

	function prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush) {
	    var args = {
	        app_id: monkey.appKey,
	        sid: monkey.session.id,
	        rid: recipientMonkeyId,
	        props: JSON.stringify(props),
	        params: JSON.stringify(optionalParams)
	    };

	    switch (typeof optionalPush === 'undefined' ? 'undefined' : _typeof(optionalPush)) {
	        case "object":
	            {
	                if (optionalPush == null) {
	                    optionalPush = {};
	                }
	                break;
	            }
	        case "string":
	            {
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

	function publish(text, channelName, optionalParams) {
	    var props = {
	        device: "web",
	        encr: 0
	    };

	    return sendText(MOKMessageProtocolCommand.PUBLISH, text, channelName, props, optionalParams);
	}

	function sendFile(data, recipientMonkeyId, fileName, fileType, shouldCompress, optionalParams, optionalPush, callback) {
	    var props = {
	        device: "web",
	        encr: 0,
	        file_type: fileType,
	        ext: mok_getFileExtension(fileName)
	    };

	    if (shouldCompress) {
	        props.cmpr = "gzip";
	    }

	    return uploadFile(data, recipientMonkeyId, fileName, props, optionalParams, function (error, message) {
	        if (error) {
	            callback(error, message);
	        }

	        callback(null, message);
	    });
	}

	function sendEncryptedFile(data, recipientMonkeyId, fileName, fileType, shouldCompress, optionalParams, optionalPush, callback) {
	    var props = {
	        device: "web",
	        encr: 1,
	        file_type: fileType,
	        ext: mok_getFileExtension(fileName)
	    };

	    if (shouldCompress) {
	        props.cmpr = "gzip";
	    }

	    return uploadFile(data, recipientMonkeyId, fileName, props, optionalParams, optionalPush, function (error, message) {
	        if (error) {
	            callback(error, message);
	        }

	        callback(null, message);
	    });
	}

	function uploadFile(fileData, recipientMonkeyId, fileName, props, optionalParams, optionalPush, callback) {

	    fileData = cleanFilePrefix(fileData);

	    var args = prepareMessageArgs(recipientMonkeyId, props, optionalParams, optionalPush);
	    args.msg = fileName;
	    args.type = MOKMessageType.FILE;

	    var message = new _MOKMessage2.default(MOKMessageProtocolCommand.MESSAGE, args);

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

	    var fileToSend = new Blob([fileData.toString()], { type: message.props.file_type });
	    fileToSend.name = fileName;

	    var basic = getAuthParamsBtoA(monkey.appKey + ":" + monkey.secretKey);

	    var data = new FormData();
	    //agrega el archivo y la info al form
	    data.append("file", fileToSend);
	    data.append("data", JSON.stringify(args));

	    //setup request url
	    var reqUrl = monkey.domainUrl + "/file/new/base64";
	    if (monkey.debugingMode) {
	        //no ssl
	        reqUrl = "http://" + reqUrl;
	    } else {
	        reqUrl = "https://" + reqUrl;
	    }

	    $.ajax({
	        url: reqUrl,
	        type: "POST",
	        data: data,
	        cache: false,
	        dataType: "json",
	        processData: false,
	        contentType: false,

	        beforeSend: function beforeSend(xhr) {
	            xhr.setRequestHeader('Accept', '*/*');
	            xhr.setRequestHeader("Authorization", "Basic " + basic);
	        },
	        success: function success(respObj) {
	            console.log('Monkey - upload file OK');
	            message.id = respObj.data.messageId;
	            callback(null, message);
	        }, error: function error(errorMSg) {

	            console.log('Monkey - upload file Fail');
	            callback(errorMSg.toString(), message);
	        }
	    });

	    return message;
	}
	function getAllConversations(onComplete) {

	    var basic = getAuthParamsBtoA(monkey.appKey + ":" + monkey.secretKey);

	    //setup request url
	    var reqUrl = monkey.domainUrl + "/user/" + monkey.session.id + "/conversations";
	    if (monkey.debugingMode) {
	        //no ssl
	        reqUrl = "http://" + reqUrl;
	    } else {
	        reqUrl = "https://" + reqUrl;
	    }

	    $.ajax({
	        type: "GET",
	        url: reqUrl,
	        xhrFields: { withCredentials: true },
	        beforeSend: function beforeSend(xhr) {
	            xhr.setRequestHeader('Accept', '*/*');
	            xhr.setRequestHeader("Authorization", "Basic " + basic);
	        },
	        success: function success(respObj) {
	            console.log("GET ALL CONVERSATIONS");
	            onComplete(respObj);
	        },
	        error: function error(err) {
	            console.log('FAIL TO GET ALL CONVERSATIONS');
	            onComplete(null, err.toString());
	        }
	    }); // end of AJAX CALL
	}

	function getConversationMessages(conversationId, numberOfMessages, lastMessageId, onComplete) {

	    if (lastMessageId == null) {
	        lastMessageId = "";
	    }
	    var basic = getAuthParamsBtoA(monkey.appKey + ":" + monkey.secretKey);

	    //setup request url
	    var reqUrl = monkey.domainUrl + "/conversation/messages/" + monkey.session.id + "/" + conversationId + "/" + numberOfMessages + "/" + lastMessageId;
	    if (monkey.debugingMode) {
	        //no ssl
	        reqUrl = "http://" + reqUrl;
	    } else {
	        reqUrl = "https://" + reqUrl;
	    }

	    $.ajax({
	        type: "GET",
	        url: reqUrl,
	        xhrFields: { withCredentials: true },
	        beforeSend: function beforeSend(xhr) {
	            xhr.setRequestHeader('Accept', '*/*');
	            xhr.setRequestHeader("Authorization", "Basic " + basic);
	        },
	        success: function success(respObj) {
	            console.log("GET CONVERSATION MESSAGES");

	            var messages = respObj.data.messages;
	            var messagesArray = [];
	            for (var i = messages.length - 1; i >= 0; i--) {
	                var msg = new _MOKMessage2.default(MOKMessageProtocolCommand.MESSAGE, messages[i]);
	                messagesArray.push(msg);
	            }

	            //TODO: decrypt bulk messages and send to callback
	            decryptBulkMessages(messagesArray, [], function (decryptedMessages) {
	                onComplete(null, decryptedMessages);
	            });
	        },
	        error: function error(err) {
	            console.log('FAIL TO GET CONVERSATION MESSAGES');
	            onComplete(err);
	        }
	    }); // end of AJAX CALL
	}

	//recursive function
	function decryptBulkMessages(messages, decryptedMessages, onComplete) {

	    if (!(typeof messages != "undefined" && messages != null && messages.length > 0)) {
	        return onComplete(decryptedMessages);
	    }

	    var message = messages.shift();

	    if (message.isEncrypted() && message.protocolType != MOKMessageType.FILE) {
	        try {
	            message.text = aesDecryptIncomingMessage(message);
	        } catch (error) {
	            console.log("===========================");
	            console.log("MONKEY - Fail decrypting: " + message.id + " type: " + message.protocolType);
	            console.log("===========================");
	            //get keys
	            getAESkeyFromUser(message.senderId, message, function (response) {
	                if (response != null) {
	                    messages.unshift(message);
	                }

	                decryptBulkMessages(messages, decryptedMessages, onComplete);
	            });
	            return;
	        }

	        if (message.text == null) {
	            //get keys
	            getAESkeyFromUser(message.senderId, message, function (response) {
	                if (response != null) {
	                    messages.unshift(message);
	                }

	                decryptBulkMessages(message, decryptedMessages, onComplete);
	            });
	            return;
	        }
	    } else {
	        message.text = message.encryptedText;
	    }

	    decryptedMessages.push(message);

	    decryptBulkMessages(messages, decryptedMessages, onComplete);
	}

	function getMessagesSince(timestamp, onComplete) {

	    var basic = getAuthParamsBtoA(monkey.appKey + ":" + monkey.secretKey);

	    //setup request url
	    var reqUrl = monkey.domainUrl + "/user/" + monkey.session.id + "/messages/" + timestamp;
	    if (monkey.debugingMode) {
	        //no ssl
	        reqUrl = "http://" + reqUrl;
	    } else {
	        reqUrl = "https://" + reqUrl;
	    }

	    $.ajax({
	        type: "GET",
	        url: reqUrl,
	        xhrFields: { withCredentials: true },
	        beforeSend: function beforeSend(xhr) {
	            xhr.setRequestHeader('Accept', '*/*');
	            xhr.setRequestHeader("Authorization", "Basic " + basic);
	        },
	        success: function success(respObj) {
	            console.log("GET MESSAGES");
	            onComplete(respObj);
	        },
	        error: function error(err) {
	            console.log('FAIL TO GET MESSAGES');
	            onComplete(null, err.toString());
	        }
	    }); // end of AJAX CALL
	}

	function generateStandardPush(stringMessage) {
	    return {
	        "text": stringMessage,
	        "iosData": {
	            "alert": stringMessage,
	            "sound": "default"
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
	function generateLocalizedPush(locKey, locArgs) {
	    return {
	        "text": stringMessage,
	        "iosData": {
	            "alert": {
	                "loc-key": locKey,
	                "loc-args": locArgs
	            },
	            "sound": "default"
	        },
	        "andData": {
	            "loc-key": locKey,
	            "loc-args": locArgs
	        }
	    };
	}
	function getExtention(filename) {
	    var arr = filename.split('.');
	    var extension = arr[arr.length - 1];

	    return extension;
	}
	function downloadFile(message, onComplete) {

	    var basic = getAuthParamsBtoA(monkey.appKey + ":" + monkey.secretKey);

	    //setup request url
	    var reqUrl = monkey.domainUrl + "/file/open/" + message.text + "/base64";
	    if (monkey.debugingMode) {
	        //no ssl
	        reqUrl = "http://" + reqUrl;
	    } else {
	        reqUrl = "https://" + reqUrl;
	    }

	    $.ajax({
	        type: "GET",
	        url: reqUrl,
	        xhrFields: { withCredentials: true },
	        beforeSend: function beforeSend(xhr) {
	            xhr.setRequestHeader('Accept', '*/*');
	            xhr.setRequestHeader("Authorization", "Basic " + basic);
	        },
	        success: function success(fileData) {
	            console.log("Monkey - Download File OK");

	            decryptDownloadedFile(fileData, message, function (error, finalData) {
	                if (error) {
	                    console.log("Monkey - Fail to decrypt downloaded file");
	                    return onComplete(error);
	                }
	                onComplete(null, finalData);
	            });

	            // fileCont = monkey.decryptFile(respObj, sid);
	            // var gunzip = new Zlib.Gunzip(fileCont);
	            // var resp = gunzip.decompress(); //this is not working
	            //drawImageMessageBubble(btoa(String.fromCharCode.apply(null, fileCont)),sid,fileName);
	        },
	        error: function error(err) {
	            console.log('Monkey - Download File Fail');
	            onComplete(err);
	        }
	    }); // end of AJAX CALL
	} /// end of function downloadFile

	function decryptDownloadedFile(fileData, message, callback) {
	    if (message.isEncrypted()) {
	        var decryptedData = null;
	        try {
	            var currentSize = fileData.length;
	            console.log("Monkey - encrypted file size: " + currentSize);

	            //temporal fix for media sent from web
	            if (message.props.device == "web") {
	                decryptedData = aesDecrypt(fileData, message.senderId);
	            } else {
	                decryptedData = decryptFile(fileData, message.senderId);
	            }

	            var newSize = decryptedData.length;
	            console.log("Monkey - decrypted file size: " + newSize);

	            if (currentSize == newSize) {
	                getAESkeyFromUser(message.senderId, message, function (response) {
	                    if (response != null) {
	                        decryptDownloadedFile(fileData, message, callback);
	                    } else {
	                        callback("Error decrypting downloaded file");
	                    }
	                });
	                return;
	            }
	        } catch (error) {
	            console.log("===========================");
	            console.log("MONKEY - Fail decrypting: " + message.id + " type: " + message.protocolType);
	            console.log("===========================");
	            //get keys
	            getAESkeyFromUser(message.senderId, message, function (response) {
	                if (response != null) {
	                    decryptDownloadedFile(fileData, message, callback);
	                } else {
	                    callback("Error decrypting downloaded file");
	                }
	            });
	            return;
	        }

	        if (decryptedData == null) {
	            //get keys
	            getAESkeyFromUser(message.senderId, message, function (response) {
	                if (response != null) {
	                    decryptDownloadedFile(fileData, message, callback);
	                } else {
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
	function postMessage(messageObj) {
	    /* {"cmd":"0","args":{"id":"-1423607192","rid":"i5zuxft2zkl3t35gjui60f6r","msg":"IX76YKyM90pXh+FL/R0cNQ=="}}*/
	    console.log("MessageObj sending " + JSON.stringify(messageObj));
	    basicAjaxRequest("POST", "/message/new", messageObj, function (err, respObj) {

	        if (err) {
	            console.log(err);
	            return;
	        }

	        if (parseInt(respObj.status) == 0) {
	            // now you can start the long polling calls or the websocket connection you are ready.
	            // we need to do a last validation here with an encrypted data that is sent from the server at this response, to validate keys are correct and the session too.
	            console.log("Message sent is " + JSON.stringify(respObj));
	            console.log("Message sent is " + respObj.data.messageId);
	        } else {
	            //throw error
	            console.log("Error in postMessage " + respObj.message);
	        }
	    });
	}

	function generateSessionKey() {
	    var key = CryptoJS.enc.Hex.parse(Generate_key(32)); //256 bits
	    var iv = CryptoJS.enc.Hex.parse(Generate_key(16)); //128 bits
	    monkey.session.myKey = btoa(key);
	    monkey.session.myIv = btoa(iv);
	    //now you have to encrypt
	    return monkey.session.myKey + ":" + monkey.session.myIv;
	}

	function Generate_key(len) {
	    var key = "";
	    var hex = "0123456789abcdef";
	    for (var i = 0; i < len; i++) {
	        key += hex.charAt(Math.floor(Math.random() * 16));
	    }
	    return key;
	}

	function generateExchangeKeys() {
	    var jsencrypt = new JSEncrypt();

	    //jsencrypt.getPublicKey()

	    monkey.session.exchangeKeys = jsencrypt;
	}

	function encryptSessionParams(sessionParams, publicKey) {
	    var jsencrypt = new JSEncrypt();
	    jsencrypt.setPublicKey(publicKey);
	    var encryptedData = jsencrypt.encrypt(sessionParams);
	    return encryptedData;
	}

	function getAuthParamsBtoA(connectAuthParamsString) {

	    //window.btoa not supported in <=IE9
	    if (window.btoa) {
	        var basic = window.btoa(connectAuthParamsString);
	    } else {
	        //for <= IE9
	        var base64 = {};
	        base64.PADCHAR = '=';
	        base64.ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	        base64.makeDOMException = function () {
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
	                ex.toString = function () {
	                    return 'Error: ' + ex.name + ': ' + ex.message;
	                };
	                return ex;
	            }
	        };

	        base64.getbyte64 = function (s, i) {
	            // This is oddly fast, except on Chrome/V8.
	            //  Minimal or no improvement in performance by using a
	            //   object with properties mapping chars to value (eg. 'A': 0)
	            var idx = base64.ALPHA.indexOf(s.charAt(i));
	            if (idx === -1) {
	                throw base64.makeDOMException();
	            }
	            return idx;
	        };

	        base64.decode = function (s) {
	            // convert to string
	            s = '' + s;
	            var getbyte64 = base64.getbyte64;
	            var pads, i, b10;
	            var imax = s.length;
	            if (imax === 0) {
	                return s;
	            }

	            if (imax % 4 !== 0) {
	                throw base64.makeDOMException();
	            }

	            pads = 0;
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
	                b10 = getbyte64(s, i) << 18 | getbyte64(s, i + 1) << 12 | getbyte64(s, i + 2) << 6 | getbyte64(s, i + 3);
	                x.push(String.fromCharCode(b10 >> 16, b10 >> 8 & 0xff, b10 & 0xff));
	            }

	            switch (pads) {
	                case 1:
	                    b10 = getbyte64(s, i) << 18 | getbyte64(s, i + 1) << 12 | getbyte64(s, i + 2) << 6;
	                    x.push(String.fromCharCode(b10 >> 16, b10 >> 8 & 0xff));
	                    break;
	                case 2:
	                    b10 = getbyte64(s, i) << 18 | getbyte64(s, i + 1) << 12;
	                    x.push(String.fromCharCode(b10 >> 16));
	                    break;
	            }
	            return x.join('');
	        };

	        base64.getbyte = function (s, i) {
	            var x = s.charCodeAt(i);
	            if (x > 255) {
	                throw base64.makeDOMException();
	            }
	            return x;
	        };

	        base64.encode = function (s) {
	            if (arguments.length !== 1) {
	                throw new SyntaxError("Not enough arguments");
	            }
	            var padchar = base64.PADCHAR;
	            var alpha = base64.ALPHA;
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
	                b10 = getbyte(s, i) << 16 | getbyte(s, i + 1) << 8 | getbyte(s, i + 2);
	                x.push(alpha.charAt(b10 >> 18));
	                x.push(alpha.charAt(b10 >> 12 & 0x3F));
	                x.push(alpha.charAt(b10 >> 6 & 0x3f));
	                x.push(alpha.charAt(b10 & 0x3f));
	            }
	            switch (s.length - imax) {
	                case 1:
	                    b10 = getbyte(s, i) << 16;
	                    x.push(alpha.charAt(b10 >> 18) + alpha.charAt(b10 >> 12 & 0x3F) + padchar + padchar);
	                    break;
	                case 2:
	                    b10 = getbyte(s, i) << 16 | getbyte(s, i + 1) << 8;
	                    x.push(alpha.charAt(b10 >> 18) + alpha.charAt(b10 >> 12 & 0x3F) + alpha.charAt(b10 >> 6 & 0x3f) + padchar);
	                    break;
	            }
	            return x.join('');
	        };
	        basic = base64.encode(connectAuthParamsString);
	    }

	    return basic;
	}

	module.exports = monkey;

	//  ===== END OF FILE

/***/ },
/* 1 */
/***/ function(module, exports) {

	"use strict";

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/*
	    Protocol Enums
	 */

	/*
	    Start Message class definition
	 */

	module.exports = function () {
	    function MOKMessage(command, args) {
	        _classCallCheck(this, MOKMessage);

	        if (args.app_id != null) {
	            this.app_id = args.app_id;
	        }
	        this.protocolCommand = command;
	        this.protocolType = parseInt(args.type);

	        this.senderId = args.sid;
	        this.recipientId = args.rid;

	        this.datetimeOrder = this.getCurrentTimestamp();
	        this.datetimeCreation = args.datetime == null ? this.datetimeOrder : args.datetime;

	        this.readByUser = false;

	        //parse props
	        if (args.props != null && typeof args.props != "undefined" && args.props != "") {
	            if (typeof args.props === "string") {
	                this.props = JSON.parse(args.props);
	            } else {
	                this.props = args.props;
	            }
	        } else {
	            this.props = { encr: 0 };
	        }

	        //parse params
	        if (args.params != null && args.params != "" && typeof args.params != "undefined") {
	            if (typeof args.params === "string") {
	                this.params = JSON.parse(args.params);
	            } else {
	                this.params = args.params;
	            }
	        }

	        //parse message id
	        if (args.id == null) {
	            //didn't come from the socket
	            this.id = this.generateRandomMessageId();
	            this.oldId = this.id;

	            this.props.old_id = this.id;
	        } else {
	            //it came from the socket
	            this.id = args.id;
	            this.oldId = this.props.old_id;
	        }

	        this.encryptedText = args.msg;
	        this.text = args.msg;

	        switch (command) {
	            case 205:
	                {
	                    this.buildAcknowledge(this.props);
	                    break;
	                }
	            default:
	                {
	                    break;
	                }
	        }
	    }

	    _createClass(MOKMessage, [{
	        key: "generateRandomMessageId",
	        value: function generateRandomMessageId() {
	            return Math.round(new Date().getTime() / 1000 * -1) + Math.random().toString(36).substring(14);
	        }
	    }, {
	        key: "getCurrentTimestamp",
	        value: function getCurrentTimestamp() {
	            return new Date().getTime() / 1000;
	        }
	    }, {
	        key: "buildAcknowledge",
	        value: function buildAcknowledge(props) {
	            if (typeof props.message_id != "undefined" || props.message_id != null) {
	                this.id = props.message_id;
	            }
	            if (typeof props.new_id != "undefined" || props.new_id != null) {
	                this.id = props.new_id;
	            }
	            if (typeof props.old_id != "undefined" || props.old_id != null) {
	                this.oldId = props.old_id;
	            }
	        }
	    }, {
	        key: "compressionMethod",
	        value: function compressionMethod() {
	            if (this.isCompressed) {
	                return this.props.cmpr;
	            }
	            return null;
	        }
	    }, {
	        key: "isCompressed",
	        value: function isCompressed() {
	            if (this.props == null || typeof this.props.cmpr == "undefined" || this.props.cmpr == null) {
	                console.log("MONKEY - props null");
	                return false;
	            }
	            return this.props.cmpr ? true : false;
	        }
	    }, {
	        key: "isEncrypted",
	        value: function isEncrypted() {
	            if (this.props == null || typeof this.props.encr == "undefined" || this.props.encr == null) {
	                console.log("MONKEY - props null");
	                return false;
	            }
	            return this.props.encr == 1 ? true : false;
	        }
	    }]);

	    return MOKMessage;
	}();

/***/ },
/* 2 */
/***/ function(module, exports) {

	var JSEncryptExports = {};
	(function(exports) {
	function BigInteger(a,b,c){null!=a&&("number"==typeof a?this.fromNumber(a,b,c):null==b&&"string"!=typeof a?this.fromString(a,256):this.fromString(a,b))}function nbi(){return new BigInteger(null)}function am1(a,b,c,d,e,f){for(;--f>=0;){var g=b*this[a++]+c[d]+e;e=Math.floor(g/67108864),c[d++]=67108863&g}return e}function am2(a,b,c,d,e,f){for(var g=32767&b,h=b>>15;--f>=0;){var i=32767&this[a],j=this[a++]>>15,k=h*i+j*g;i=g*i+((32767&k)<<15)+c[d]+(1073741823&e),e=(i>>>30)+(k>>>15)+h*j+(e>>>30),c[d++]=1073741823&i}return e}function am3(a,b,c,d,e,f){for(var g=16383&b,h=b>>14;--f>=0;){var i=16383&this[a],j=this[a++]>>14,k=h*i+j*g;i=g*i+((16383&k)<<14)+c[d]+e,e=(i>>28)+(k>>14)+h*j,c[d++]=268435455&i}return e}function int2char(a){return BI_RM.charAt(a)}function intAt(a,b){var c=BI_RC[a.charCodeAt(b)];return null==c?-1:c}function bnpCopyTo(a){for(var b=this.t-1;b>=0;--b)a[b]=this[b];a.t=this.t,a.s=this.s}function bnpFromInt(a){this.t=1,this.s=0>a?-1:0,a>0?this[0]=a:-1>a?this[0]=a+DV:this.t=0}function nbv(a){var b=nbi();return b.fromInt(a),b}function bnpFromString(a,b){var c;if(16==b)c=4;else if(8==b)c=3;else if(256==b)c=8;else if(2==b)c=1;else if(32==b)c=5;else{if(4!=b)return void this.fromRadix(a,b);c=2}this.t=0,this.s=0;for(var d=a.length,e=!1,f=0;--d>=0;){var g=8==c?255&a[d]:intAt(a,d);0>g?"-"==a.charAt(d)&&(e=!0):(e=!1,0==f?this[this.t++]=g:f+c>this.DB?(this[this.t-1]|=(g&(1<<this.DB-f)-1)<<f,this[this.t++]=g>>this.DB-f):this[this.t-1]|=g<<f,f+=c,f>=this.DB&&(f-=this.DB))}8==c&&0!=(128&a[0])&&(this.s=-1,f>0&&(this[this.t-1]|=(1<<this.DB-f)-1<<f)),this.clamp(),e&&BigInteger.ZERO.subTo(this,this)}function bnpClamp(){for(var a=this.s&this.DM;this.t>0&&this[this.t-1]==a;)--this.t}function bnToString(a){if(this.s<0)return"-"+this.negate().toString(a);var b;if(16==a)b=4;else if(8==a)b=3;else if(2==a)b=1;else if(32==a)b=5;else{if(4!=a)return this.toRadix(a);b=2}var c,d=(1<<b)-1,e=!1,f="",g=this.t,h=this.DB-g*this.DB%b;if(g-->0)for(h<this.DB&&(c=this[g]>>h)>0&&(e=!0,f=int2char(c));g>=0;)b>h?(c=(this[g]&(1<<h)-1)<<b-h,c|=this[--g]>>(h+=this.DB-b)):(c=this[g]>>(h-=b)&d,0>=h&&(h+=this.DB,--g)),c>0&&(e=!0),e&&(f+=int2char(c));return e?f:"0"}function bnNegate(){var a=nbi();return BigInteger.ZERO.subTo(this,a),a}function bnAbs(){return this.s<0?this.negate():this}function bnCompareTo(a){var b=this.s-a.s;if(0!=b)return b;var c=this.t;if(b=c-a.t,0!=b)return this.s<0?-b:b;for(;--c>=0;)if(0!=(b=this[c]-a[c]))return b;return 0}function nbits(a){var b,c=1;return 0!=(b=a>>>16)&&(a=b,c+=16),0!=(b=a>>8)&&(a=b,c+=8),0!=(b=a>>4)&&(a=b,c+=4),0!=(b=a>>2)&&(a=b,c+=2),0!=(b=a>>1)&&(a=b,c+=1),c}function bnBitLength(){return this.t<=0?0:this.DB*(this.t-1)+nbits(this[this.t-1]^this.s&this.DM)}function bnpDLShiftTo(a,b){var c;for(c=this.t-1;c>=0;--c)b[c+a]=this[c];for(c=a-1;c>=0;--c)b[c]=0;b.t=this.t+a,b.s=this.s}function bnpDRShiftTo(a,b){for(var c=a;c<this.t;++c)b[c-a]=this[c];b.t=Math.max(this.t-a,0),b.s=this.s}function bnpLShiftTo(a,b){var c,d=a%this.DB,e=this.DB-d,f=(1<<e)-1,g=Math.floor(a/this.DB),h=this.s<<d&this.DM;for(c=this.t-1;c>=0;--c)b[c+g+1]=this[c]>>e|h,h=(this[c]&f)<<d;for(c=g-1;c>=0;--c)b[c]=0;b[g]=h,b.t=this.t+g+1,b.s=this.s,b.clamp()}function bnpRShiftTo(a,b){b.s=this.s;var c=Math.floor(a/this.DB);if(c>=this.t)return void(b.t=0);var d=a%this.DB,e=this.DB-d,f=(1<<d)-1;b[0]=this[c]>>d;for(var g=c+1;g<this.t;++g)b[g-c-1]|=(this[g]&f)<<e,b[g-c]=this[g]>>d;d>0&&(b[this.t-c-1]|=(this.s&f)<<e),b.t=this.t-c,b.clamp()}function bnpSubTo(a,b){for(var c=0,d=0,e=Math.min(a.t,this.t);e>c;)d+=this[c]-a[c],b[c++]=d&this.DM,d>>=this.DB;if(a.t<this.t){for(d-=a.s;c<this.t;)d+=this[c],b[c++]=d&this.DM,d>>=this.DB;d+=this.s}else{for(d+=this.s;c<a.t;)d-=a[c],b[c++]=d&this.DM,d>>=this.DB;d-=a.s}b.s=0>d?-1:0,-1>d?b[c++]=this.DV+d:d>0&&(b[c++]=d),b.t=c,b.clamp()}function bnpMultiplyTo(a,b){var c=this.abs(),d=a.abs(),e=c.t;for(b.t=e+d.t;--e>=0;)b[e]=0;for(e=0;e<d.t;++e)b[e+c.t]=c.am(0,d[e],b,e,0,c.t);b.s=0,b.clamp(),this.s!=a.s&&BigInteger.ZERO.subTo(b,b)}function bnpSquareTo(a){for(var b=this.abs(),c=a.t=2*b.t;--c>=0;)a[c]=0;for(c=0;c<b.t-1;++c){var d=b.am(c,b[c],a,2*c,0,1);(a[c+b.t]+=b.am(c+1,2*b[c],a,2*c+1,d,b.t-c-1))>=b.DV&&(a[c+b.t]-=b.DV,a[c+b.t+1]=1)}a.t>0&&(a[a.t-1]+=b.am(c,b[c],a,2*c,0,1)),a.s=0,a.clamp()}function bnpDivRemTo(a,b,c){var d=a.abs();if(!(d.t<=0)){var e=this.abs();if(e.t<d.t)return null!=b&&b.fromInt(0),void(null!=c&&this.copyTo(c));null==c&&(c=nbi());var f=nbi(),g=this.s,h=a.s,i=this.DB-nbits(d[d.t-1]);i>0?(d.lShiftTo(i,f),e.lShiftTo(i,c)):(d.copyTo(f),e.copyTo(c));var j=f.t,k=f[j-1];if(0!=k){var l=k*(1<<this.F1)+(j>1?f[j-2]>>this.F2:0),m=this.FV/l,n=(1<<this.F1)/l,o=1<<this.F2,p=c.t,q=p-j,r=null==b?nbi():b;for(f.dlShiftTo(q,r),c.compareTo(r)>=0&&(c[c.t++]=1,c.subTo(r,c)),BigInteger.ONE.dlShiftTo(j,r),r.subTo(f,f);f.t<j;)f[f.t++]=0;for(;--q>=0;){var s=c[--p]==k?this.DM:Math.floor(c[p]*m+(c[p-1]+o)*n);if((c[p]+=f.am(0,s,c,q,0,j))<s)for(f.dlShiftTo(q,r),c.subTo(r,c);c[p]<--s;)c.subTo(r,c)}null!=b&&(c.drShiftTo(j,b),g!=h&&BigInteger.ZERO.subTo(b,b)),c.t=j,c.clamp(),i>0&&c.rShiftTo(i,c),0>g&&BigInteger.ZERO.subTo(c,c)}}}function bnMod(a){var b=nbi();return this.abs().divRemTo(a,null,b),this.s<0&&b.compareTo(BigInteger.ZERO)>0&&a.subTo(b,b),b}function Classic(a){this.m=a}function cConvert(a){return a.s<0||a.compareTo(this.m)>=0?a.mod(this.m):a}function cRevert(a){return a}function cReduce(a){a.divRemTo(this.m,null,a)}function cMulTo(a,b,c){a.multiplyTo(b,c),this.reduce(c)}function cSqrTo(a,b){a.squareTo(b),this.reduce(b)}function bnpInvDigit(){if(this.t<1)return 0;var a=this[0];if(0==(1&a))return 0;var b=3&a;return b=b*(2-(15&a)*b)&15,b=b*(2-(255&a)*b)&255,b=b*(2-((65535&a)*b&65535))&65535,b=b*(2-a*b%this.DV)%this.DV,b>0?this.DV-b:-b}function Montgomery(a){this.m=a,this.mp=a.invDigit(),this.mpl=32767&this.mp,this.mph=this.mp>>15,this.um=(1<<a.DB-15)-1,this.mt2=2*a.t}function montConvert(a){var b=nbi();return a.abs().dlShiftTo(this.m.t,b),b.divRemTo(this.m,null,b),a.s<0&&b.compareTo(BigInteger.ZERO)>0&&this.m.subTo(b,b),b}function montRevert(a){var b=nbi();return a.copyTo(b),this.reduce(b),b}function montReduce(a){for(;a.t<=this.mt2;)a[a.t++]=0;for(var b=0;b<this.m.t;++b){var c=32767&a[b],d=c*this.mpl+((c*this.mph+(a[b]>>15)*this.mpl&this.um)<<15)&a.DM;for(c=b+this.m.t,a[c]+=this.m.am(0,d,a,b,0,this.m.t);a[c]>=a.DV;)a[c]-=a.DV,a[++c]++}a.clamp(),a.drShiftTo(this.m.t,a),a.compareTo(this.m)>=0&&a.subTo(this.m,a)}function montSqrTo(a,b){a.squareTo(b),this.reduce(b)}function montMulTo(a,b,c){a.multiplyTo(b,c),this.reduce(c)}function bnpIsEven(){return 0==(this.t>0?1&this[0]:this.s)}function bnpExp(a,b){if(a>4294967295||1>a)return BigInteger.ONE;var c=nbi(),d=nbi(),e=b.convert(this),f=nbits(a)-1;for(e.copyTo(c);--f>=0;)if(b.sqrTo(c,d),(a&1<<f)>0)b.mulTo(d,e,c);else{var g=c;c=d,d=g}return b.revert(c)}function bnModPowInt(a,b){var c;return c=256>a||b.isEven()?new Classic(b):new Montgomery(b),this.exp(a,c)}function bnClone(){var a=nbi();return this.copyTo(a),a}function bnIntValue(){if(this.s<0){if(1==this.t)return this[0]-this.DV;if(0==this.t)return-1}else{if(1==this.t)return this[0];if(0==this.t)return 0}return(this[1]&(1<<32-this.DB)-1)<<this.DB|this[0]}function bnByteValue(){return 0==this.t?this.s:this[0]<<24>>24}function bnShortValue(){return 0==this.t?this.s:this[0]<<16>>16}function bnpChunkSize(a){return Math.floor(Math.LN2*this.DB/Math.log(a))}function bnSigNum(){return this.s<0?-1:this.t<=0||1==this.t&&this[0]<=0?0:1}function bnpToRadix(a){if(null==a&&(a=10),0==this.signum()||2>a||a>36)return"0";var b=this.chunkSize(a),c=Math.pow(a,b),d=nbv(c),e=nbi(),f=nbi(),g="";for(this.divRemTo(d,e,f);e.signum()>0;)g=(c+f.intValue()).toString(a).substr(1)+g,e.divRemTo(d,e,f);return f.intValue().toString(a)+g}function bnpFromRadix(a,b){this.fromInt(0),null==b&&(b=10);for(var c=this.chunkSize(b),d=Math.pow(b,c),e=!1,f=0,g=0,h=0;h<a.length;++h){var i=intAt(a,h);0>i?"-"==a.charAt(h)&&0==this.signum()&&(e=!0):(g=b*g+i,++f>=c&&(this.dMultiply(d),this.dAddOffset(g,0),f=0,g=0))}f>0&&(this.dMultiply(Math.pow(b,f)),this.dAddOffset(g,0)),e&&BigInteger.ZERO.subTo(this,this)}function bnpFromNumber(a,b,c){if("number"==typeof b)if(2>a)this.fromInt(1);else for(this.fromNumber(a,c),this.testBit(a-1)||this.bitwiseTo(BigInteger.ONE.shiftLeft(a-1),op_or,this),this.isEven()&&this.dAddOffset(1,0);!this.isProbablePrime(b);)this.dAddOffset(2,0),this.bitLength()>a&&this.subTo(BigInteger.ONE.shiftLeft(a-1),this);else{var d=new Array,e=7&a;d.length=(a>>3)+1,b.nextBytes(d),e>0?d[0]&=(1<<e)-1:d[0]=0,this.fromString(d,256)}}function bnToByteArray(){var a=this.t,b=new Array;b[0]=this.s;var c,d=this.DB-a*this.DB%8,e=0;if(a-->0)for(d<this.DB&&(c=this[a]>>d)!=(this.s&this.DM)>>d&&(b[e++]=c|this.s<<this.DB-d);a>=0;)8>d?(c=(this[a]&(1<<d)-1)<<8-d,c|=this[--a]>>(d+=this.DB-8)):(c=this[a]>>(d-=8)&255,0>=d&&(d+=this.DB,--a)),0!=(128&c)&&(c|=-256),0==e&&(128&this.s)!=(128&c)&&++e,(e>0||c!=this.s)&&(b[e++]=c);return b}function bnEquals(a){return 0==this.compareTo(a)}function bnMin(a){return this.compareTo(a)<0?this:a}function bnMax(a){return this.compareTo(a)>0?this:a}function bnpBitwiseTo(a,b,c){var d,e,f=Math.min(a.t,this.t);for(d=0;f>d;++d)c[d]=b(this[d],a[d]);if(a.t<this.t){for(e=a.s&this.DM,d=f;d<this.t;++d)c[d]=b(this[d],e);c.t=this.t}else{for(e=this.s&this.DM,d=f;d<a.t;++d)c[d]=b(e,a[d]);c.t=a.t}c.s=b(this.s,a.s),c.clamp()}function op_and(a,b){return a&b}function bnAnd(a){var b=nbi();return this.bitwiseTo(a,op_and,b),b}function op_or(a,b){return a|b}function bnOr(a){var b=nbi();return this.bitwiseTo(a,op_or,b),b}function op_xor(a,b){return a^b}function bnXor(a){var b=nbi();return this.bitwiseTo(a,op_xor,b),b}function op_andnot(a,b){return a&~b}function bnAndNot(a){var b=nbi();return this.bitwiseTo(a,op_andnot,b),b}function bnNot(){for(var a=nbi(),b=0;b<this.t;++b)a[b]=this.DM&~this[b];return a.t=this.t,a.s=~this.s,a}function bnShiftLeft(a){var b=nbi();return 0>a?this.rShiftTo(-a,b):this.lShiftTo(a,b),b}function bnShiftRight(a){var b=nbi();return 0>a?this.lShiftTo(-a,b):this.rShiftTo(a,b),b}function lbit(a){if(0==a)return-1;var b=0;return 0==(65535&a)&&(a>>=16,b+=16),0==(255&a)&&(a>>=8,b+=8),0==(15&a)&&(a>>=4,b+=4),0==(3&a)&&(a>>=2,b+=2),0==(1&a)&&++b,b}function bnGetLowestSetBit(){for(var a=0;a<this.t;++a)if(0!=this[a])return a*this.DB+lbit(this[a]);return this.s<0?this.t*this.DB:-1}function cbit(a){for(var b=0;0!=a;)a&=a-1,++b;return b}function bnBitCount(){for(var a=0,b=this.s&this.DM,c=0;c<this.t;++c)a+=cbit(this[c]^b);return a}function bnTestBit(a){var b=Math.floor(a/this.DB);return b>=this.t?0!=this.s:0!=(this[b]&1<<a%this.DB)}function bnpChangeBit(a,b){var c=BigInteger.ONE.shiftLeft(a);return this.bitwiseTo(c,b,c),c}function bnSetBit(a){return this.changeBit(a,op_or)}function bnClearBit(a){return this.changeBit(a,op_andnot)}function bnFlipBit(a){return this.changeBit(a,op_xor)}function bnpAddTo(a,b){for(var c=0,d=0,e=Math.min(a.t,this.t);e>c;)d+=this[c]+a[c],b[c++]=d&this.DM,d>>=this.DB;if(a.t<this.t){for(d+=a.s;c<this.t;)d+=this[c],b[c++]=d&this.DM,d>>=this.DB;d+=this.s}else{for(d+=this.s;c<a.t;)d+=a[c],b[c++]=d&this.DM,d>>=this.DB;d+=a.s}b.s=0>d?-1:0,d>0?b[c++]=d:-1>d&&(b[c++]=this.DV+d),b.t=c,b.clamp()}function bnAdd(a){var b=nbi();return this.addTo(a,b),b}function bnSubtract(a){var b=nbi();return this.subTo(a,b),b}function bnMultiply(a){var b=nbi();return this.multiplyTo(a,b),b}function bnSquare(){var a=nbi();return this.squareTo(a),a}function bnDivide(a){var b=nbi();return this.divRemTo(a,b,null),b}function bnRemainder(a){var b=nbi();return this.divRemTo(a,null,b),b}function bnDivideAndRemainder(a){var b=nbi(),c=nbi();return this.divRemTo(a,b,c),new Array(b,c)}function bnpDMultiply(a){this[this.t]=this.am(0,a-1,this,0,0,this.t),++this.t,this.clamp()}function bnpDAddOffset(a,b){if(0!=a){for(;this.t<=b;)this[this.t++]=0;for(this[b]+=a;this[b]>=this.DV;)this[b]-=this.DV,++b>=this.t&&(this[this.t++]=0),++this[b]}}function NullExp(){}function nNop(a){return a}function nMulTo(a,b,c){a.multiplyTo(b,c)}function nSqrTo(a,b){a.squareTo(b)}function bnPow(a){return this.exp(a,new NullExp)}function bnpMultiplyLowerTo(a,b,c){var d=Math.min(this.t+a.t,b);for(c.s=0,c.t=d;d>0;)c[--d]=0;var e;for(e=c.t-this.t;e>d;++d)c[d+this.t]=this.am(0,a[d],c,d,0,this.t);for(e=Math.min(a.t,b);e>d;++d)this.am(0,a[d],c,d,0,b-d);c.clamp()}function bnpMultiplyUpperTo(a,b,c){--b;var d=c.t=this.t+a.t-b;for(c.s=0;--d>=0;)c[d]=0;for(d=Math.max(b-this.t,0);d<a.t;++d)c[this.t+d-b]=this.am(b-d,a[d],c,0,0,this.t+d-b);c.clamp(),c.drShiftTo(1,c)}function Barrett(a){this.r2=nbi(),this.q3=nbi(),BigInteger.ONE.dlShiftTo(2*a.t,this.r2),this.mu=this.r2.divide(a),this.m=a}function barrettConvert(a){if(a.s<0||a.t>2*this.m.t)return a.mod(this.m);if(a.compareTo(this.m)<0)return a;var b=nbi();return a.copyTo(b),this.reduce(b),b}function barrettRevert(a){return a}function barrettReduce(a){for(a.drShiftTo(this.m.t-1,this.r2),a.t>this.m.t+1&&(a.t=this.m.t+1,a.clamp()),this.mu.multiplyUpperTo(this.r2,this.m.t+1,this.q3),this.m.multiplyLowerTo(this.q3,this.m.t+1,this.r2);a.compareTo(this.r2)<0;)a.dAddOffset(1,this.m.t+1);for(a.subTo(this.r2,a);a.compareTo(this.m)>=0;)a.subTo(this.m,a)}function barrettSqrTo(a,b){a.squareTo(b),this.reduce(b)}function barrettMulTo(a,b,c){a.multiplyTo(b,c),this.reduce(c)}function bnModPow(a,b){var c,d,e=a.bitLength(),f=nbv(1);if(0>=e)return f;c=18>e?1:48>e?3:144>e?4:768>e?5:6,d=8>e?new Classic(b):b.isEven()?new Barrett(b):new Montgomery(b);var g=new Array,h=3,i=c-1,j=(1<<c)-1;if(g[1]=d.convert(this),c>1){var k=nbi();for(d.sqrTo(g[1],k);j>=h;)g[h]=nbi(),d.mulTo(k,g[h-2],g[h]),h+=2}var l,m,n=a.t-1,o=!0,p=nbi();for(e=nbits(a[n])-1;n>=0;){for(e>=i?l=a[n]>>e-i&j:(l=(a[n]&(1<<e+1)-1)<<i-e,n>0&&(l|=a[n-1]>>this.DB+e-i)),h=c;0==(1&l);)l>>=1,--h;if((e-=h)<0&&(e+=this.DB,--n),o)g[l].copyTo(f),o=!1;else{for(;h>1;)d.sqrTo(f,p),d.sqrTo(p,f),h-=2;h>0?d.sqrTo(f,p):(m=f,f=p,p=m),d.mulTo(p,g[l],f)}for(;n>=0&&0==(a[n]&1<<e);)d.sqrTo(f,p),m=f,f=p,p=m,--e<0&&(e=this.DB-1,--n)}return d.revert(f)}function bnGCD(a){var b=this.s<0?this.negate():this.clone(),c=a.s<0?a.negate():a.clone();if(b.compareTo(c)<0){var d=b;b=c,c=d}var e=b.getLowestSetBit(),f=c.getLowestSetBit();if(0>f)return b;for(f>e&&(f=e),f>0&&(b.rShiftTo(f,b),c.rShiftTo(f,c));b.signum()>0;)(e=b.getLowestSetBit())>0&&b.rShiftTo(e,b),(e=c.getLowestSetBit())>0&&c.rShiftTo(e,c),b.compareTo(c)>=0?(b.subTo(c,b),b.rShiftTo(1,b)):(c.subTo(b,c),c.rShiftTo(1,c));return f>0&&c.lShiftTo(f,c),c}function bnpModInt(a){if(0>=a)return 0;var b=this.DV%a,c=this.s<0?a-1:0;if(this.t>0)if(0==b)c=this[0]%a;else for(var d=this.t-1;d>=0;--d)c=(b*c+this[d])%a;return c}function bnModInverse(a){var b=a.isEven();if(this.isEven()&&b||0==a.signum())return BigInteger.ZERO;for(var c=a.clone(),d=this.clone(),e=nbv(1),f=nbv(0),g=nbv(0),h=nbv(1);0!=c.signum();){for(;c.isEven();)c.rShiftTo(1,c),b?(e.isEven()&&f.isEven()||(e.addTo(this,e),f.subTo(a,f)),e.rShiftTo(1,e)):f.isEven()||f.subTo(a,f),f.rShiftTo(1,f);for(;d.isEven();)d.rShiftTo(1,d),b?(g.isEven()&&h.isEven()||(g.addTo(this,g),h.subTo(a,h)),g.rShiftTo(1,g)):h.isEven()||h.subTo(a,h),h.rShiftTo(1,h);c.compareTo(d)>=0?(c.subTo(d,c),b&&e.subTo(g,e),f.subTo(h,f)):(d.subTo(c,d),b&&g.subTo(e,g),h.subTo(f,h))}return 0!=d.compareTo(BigInteger.ONE)?BigInteger.ZERO:h.compareTo(a)>=0?h.subtract(a):h.signum()<0?(h.addTo(a,h),h.signum()<0?h.add(a):h):h}function bnIsProbablePrime(a){var b,c=this.abs();if(1==c.t&&c[0]<=lowprimes[lowprimes.length-1]){for(b=0;b<lowprimes.length;++b)if(c[0]==lowprimes[b])return!0;return!1}if(c.isEven())return!1;for(b=1;b<lowprimes.length;){for(var d=lowprimes[b],e=b+1;e<lowprimes.length&&lplim>d;)d*=lowprimes[e++];for(d=c.modInt(d);e>b;)if(d%lowprimes[b++]==0)return!1}return c.millerRabin(a)}function bnpMillerRabin(a){var b=this.subtract(BigInteger.ONE),c=b.getLowestSetBit();if(0>=c)return!1;var d=b.shiftRight(c);a=a+1>>1,a>lowprimes.length&&(a=lowprimes.length);for(var e=nbi(),f=0;a>f;++f){e.fromInt(lowprimes[Math.floor(Math.random()*lowprimes.length)]);var g=e.modPow(d,this);if(0!=g.compareTo(BigInteger.ONE)&&0!=g.compareTo(b)){for(var h=1;h++<c&&0!=g.compareTo(b);)if(g=g.modPowInt(2,this),0==g.compareTo(BigInteger.ONE))return!1;if(0!=g.compareTo(b))return!1}}return!0}function Arcfour(){this.i=0,this.j=0,this.S=new Array}function ARC4init(a){var b,c,d;for(b=0;256>b;++b)this.S[b]=b;for(c=0,b=0;256>b;++b)c=c+this.S[b]+a[b%a.length]&255,d=this.S[b],this.S[b]=this.S[c],this.S[c]=d;this.i=0,this.j=0}function ARC4next(){var a;return this.i=this.i+1&255,this.j=this.j+this.S[this.i]&255,a=this.S[this.i],this.S[this.i]=this.S[this.j],this.S[this.j]=a,this.S[a+this.S[this.i]&255]}function prng_newstate(){return new Arcfour}function rng_get_byte(){if(null==rng_state){for(rng_state=prng_newstate();rng_psize>rng_pptr;){var a=Math.floor(65536*Math.random());rng_pool[rng_pptr++]=255&a}for(rng_state.init(rng_pool),rng_pptr=0;rng_pptr<rng_pool.length;++rng_pptr)rng_pool[rng_pptr]=0;rng_pptr=0}return rng_state.next()}function rng_get_bytes(a){var b;for(b=0;b<a.length;++b)a[b]=rng_get_byte()}function SecureRandom(){}function parseBigInt(a,b){return new BigInteger(a,b)}function linebrk(a,b){for(var c="",d=0;d+b<a.length;)c+=a.substring(d,d+b)+"\n",d+=b;return c+a.substring(d,a.length)}function byte2Hex(a){return 16>a?"0"+a.toString(16):a.toString(16)}function pkcs1pad2(a,b){if(b<a.length+11)return console.error("Message too long for RSA"),null;for(var c=new Array,d=a.length-1;d>=0&&b>0;){var e=a.charCodeAt(d--);128>e?c[--b]=e:e>127&&2048>e?(c[--b]=63&e|128,c[--b]=e>>6|192):(c[--b]=63&e|128,c[--b]=e>>6&63|128,c[--b]=e>>12|224)}c[--b]=0;for(var f=new SecureRandom,g=new Array;b>2;){for(g[0]=0;0==g[0];)f.nextBytes(g);c[--b]=g[0]}return c[--b]=2,c[--b]=0,new BigInteger(c)}function RSAKey(){this.n=null,this.e=0,this.d=null,this.p=null,this.q=null,this.dmp1=null,this.dmq1=null,this.coeff=null}function RSASetPublic(a,b){null!=a&&null!=b&&a.length>0&&b.length>0?(this.n=parseBigInt(a,16),this.e=parseInt(b,16)):console.error("Invalid RSA public key")}function RSADoPublic(a){return a.modPowInt(this.e,this.n)}function RSAEncrypt(a){var b=pkcs1pad2(a,this.n.bitLength()+7>>3);if(null==b)return null;var c=this.doPublic(b);if(null==c)return null;var d=c.toString(16);return 0==(1&d.length)?d:"0"+d}function pkcs1unpad2(a,b){for(var c=a.toByteArray(),d=0;d<c.length&&0==c[d];)++d;if(c.length-d!=b-1||2!=c[d])return null;for(++d;0!=c[d];)if(++d>=c.length)return null;for(var e="";++d<c.length;){var f=255&c[d];128>f?e+=String.fromCharCode(f):f>191&&224>f?(e+=String.fromCharCode((31&f)<<6|63&c[d+1]),++d):(e+=String.fromCharCode((15&f)<<12|(63&c[d+1])<<6|63&c[d+2]),d+=2)}return e}function RSASetPrivate(a,b,c){null!=a&&null!=b&&a.length>0&&b.length>0?(this.n=parseBigInt(a,16),this.e=parseInt(b,16),this.d=parseBigInt(c,16)):console.error("Invalid RSA private key")}function RSASetPrivateEx(a,b,c,d,e,f,g,h){null!=a&&null!=b&&a.length>0&&b.length>0?(this.n=parseBigInt(a,16),this.e=parseInt(b,16),this.d=parseBigInt(c,16),this.p=parseBigInt(d,16),this.q=parseBigInt(e,16),this.dmp1=parseBigInt(f,16),this.dmq1=parseBigInt(g,16),this.coeff=parseBigInt(h,16)):console.error("Invalid RSA private key")}function RSAGenerate(a,b){var c=new SecureRandom,d=a>>1;this.e=parseInt(b,16);for(var e=new BigInteger(b,16);;){for(;this.p=new BigInteger(a-d,1,c),0!=this.p.subtract(BigInteger.ONE).gcd(e).compareTo(BigInteger.ONE)||!this.p.isProbablePrime(10););for(;this.q=new BigInteger(d,1,c),0!=this.q.subtract(BigInteger.ONE).gcd(e).compareTo(BigInteger.ONE)||!this.q.isProbablePrime(10););if(this.p.compareTo(this.q)<=0){var f=this.p;this.p=this.q,this.q=f}var g=this.p.subtract(BigInteger.ONE),h=this.q.subtract(BigInteger.ONE),i=g.multiply(h);if(0==i.gcd(e).compareTo(BigInteger.ONE)){this.n=this.p.multiply(this.q),this.d=e.modInverse(i),this.dmp1=this.d.mod(g),this.dmq1=this.d.mod(h),this.coeff=this.q.modInverse(this.p);break}}}function RSADoPrivate(a){if(null==this.p||null==this.q)return a.modPow(this.d,this.n);for(var b=a.mod(this.p).modPow(this.dmp1,this.p),c=a.mod(this.q).modPow(this.dmq1,this.q);b.compareTo(c)<0;)b=b.add(this.p);return b.subtract(c).multiply(this.coeff).mod(this.p).multiply(this.q).add(c)}function RSADecrypt(a){var b=parseBigInt(a,16),c=this.doPrivate(b);return null==c?null:pkcs1unpad2(c,this.n.bitLength()+7>>3)}function hex2b64(a){var b,c,d="";for(b=0;b+3<=a.length;b+=3)c=parseInt(a.substring(b,b+3),16),d+=b64map.charAt(c>>6)+b64map.charAt(63&c);for(b+1==a.length?(c=parseInt(a.substring(b,b+1),16),d+=b64map.charAt(c<<2)):b+2==a.length&&(c=parseInt(a.substring(b,b+2),16),d+=b64map.charAt(c>>2)+b64map.charAt((3&c)<<4));(3&d.length)>0;)d+=b64pad;return d}function b64tohex(a){var b,c,d="",e=0;for(b=0;b<a.length&&a.charAt(b)!=b64pad;++b)v=b64map.indexOf(a.charAt(b)),0>v||(0==e?(d+=int2char(v>>2),c=3&v,e=1):1==e?(d+=int2char(c<<2|v>>4),c=15&v,e=2):2==e?(d+=int2char(c),d+=int2char(v>>2),c=3&v,e=3):(d+=int2char(c<<2|v>>4),d+=int2char(15&v),e=0));return 1==e&&(d+=int2char(c<<2)),d}function b64toBA(a){var b,c=b64tohex(a),d=new Array;for(b=0;2*b<c.length;++b)d[b]=parseInt(c.substring(2*b,2*b+2),16);return d}var dbits,canary=0xdeadbeefcafe,j_lm=15715070==(16777215&canary);j_lm&&"Microsoft Internet Explorer"==navigator.appName?(BigInteger.prototype.am=am2,dbits=30):j_lm&&"Netscape"!=navigator.appName?(BigInteger.prototype.am=am1,dbits=26):(BigInteger.prototype.am=am3,dbits=28),BigInteger.prototype.DB=dbits,BigInteger.prototype.DM=(1<<dbits)-1,BigInteger.prototype.DV=1<<dbits;var BI_FP=52;BigInteger.prototype.FV=Math.pow(2,BI_FP),BigInteger.prototype.F1=BI_FP-dbits,BigInteger.prototype.F2=2*dbits-BI_FP;var BI_RM="0123456789abcdefghijklmnopqrstuvwxyz",BI_RC=new Array,rr,vv;for(rr="0".charCodeAt(0),vv=0;9>=vv;++vv)BI_RC[rr++]=vv;for(rr="a".charCodeAt(0),vv=10;36>vv;++vv)BI_RC[rr++]=vv;for(rr="A".charCodeAt(0),vv=10;36>vv;++vv)BI_RC[rr++]=vv;Classic.prototype.convert=cConvert,Classic.prototype.revert=cRevert,Classic.prototype.reduce=cReduce,Classic.prototype.mulTo=cMulTo,Classic.prototype.sqrTo=cSqrTo,Montgomery.prototype.convert=montConvert,Montgomery.prototype.revert=montRevert,Montgomery.prototype.reduce=montReduce,Montgomery.prototype.mulTo=montMulTo,Montgomery.prototype.sqrTo=montSqrTo,BigInteger.prototype.copyTo=bnpCopyTo,BigInteger.prototype.fromInt=bnpFromInt,BigInteger.prototype.fromString=bnpFromString,BigInteger.prototype.clamp=bnpClamp,BigInteger.prototype.dlShiftTo=bnpDLShiftTo,BigInteger.prototype.drShiftTo=bnpDRShiftTo,BigInteger.prototype.lShiftTo=bnpLShiftTo,BigInteger.prototype.rShiftTo=bnpRShiftTo,BigInteger.prototype.subTo=bnpSubTo,BigInteger.prototype.multiplyTo=bnpMultiplyTo,BigInteger.prototype.squareTo=bnpSquareTo,BigInteger.prototype.divRemTo=bnpDivRemTo,BigInteger.prototype.invDigit=bnpInvDigit,BigInteger.prototype.isEven=bnpIsEven,BigInteger.prototype.exp=bnpExp,BigInteger.prototype.toString=bnToString,BigInteger.prototype.negate=bnNegate,BigInteger.prototype.abs=bnAbs,BigInteger.prototype.compareTo=bnCompareTo,BigInteger.prototype.bitLength=bnBitLength,BigInteger.prototype.mod=bnMod,BigInteger.prototype.modPowInt=bnModPowInt,BigInteger.ZERO=nbv(0),BigInteger.ONE=nbv(1),NullExp.prototype.convert=nNop,NullExp.prototype.revert=nNop,NullExp.prototype.mulTo=nMulTo,NullExp.prototype.sqrTo=nSqrTo,Barrett.prototype.convert=barrettConvert,Barrett.prototype.revert=barrettRevert,Barrett.prototype.reduce=barrettReduce,Barrett.prototype.mulTo=barrettMulTo,Barrett.prototype.sqrTo=barrettSqrTo;var lowprimes=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997],lplim=(1<<26)/lowprimes[lowprimes.length-1];BigInteger.prototype.chunkSize=bnpChunkSize,BigInteger.prototype.toRadix=bnpToRadix,BigInteger.prototype.fromRadix=bnpFromRadix,BigInteger.prototype.fromNumber=bnpFromNumber,BigInteger.prototype.bitwiseTo=bnpBitwiseTo,BigInteger.prototype.changeBit=bnpChangeBit,BigInteger.prototype.addTo=bnpAddTo,BigInteger.prototype.dMultiply=bnpDMultiply,BigInteger.prototype.dAddOffset=bnpDAddOffset,BigInteger.prototype.multiplyLowerTo=bnpMultiplyLowerTo,BigInteger.prototype.multiplyUpperTo=bnpMultiplyUpperTo,BigInteger.prototype.modInt=bnpModInt,BigInteger.prototype.millerRabin=bnpMillerRabin,BigInteger.prototype.clone=bnClone,BigInteger.prototype.intValue=bnIntValue,BigInteger.prototype.byteValue=bnByteValue,BigInteger.prototype.shortValue=bnShortValue,BigInteger.prototype.signum=bnSigNum,BigInteger.prototype.toByteArray=bnToByteArray,BigInteger.prototype.equals=bnEquals,BigInteger.prototype.min=bnMin,BigInteger.prototype.max=bnMax,BigInteger.prototype.and=bnAnd,BigInteger.prototype.or=bnOr,BigInteger.prototype.xor=bnXor,BigInteger.prototype.andNot=bnAndNot,BigInteger.prototype.not=bnNot,BigInteger.prototype.shiftLeft=bnShiftLeft,BigInteger.prototype.shiftRight=bnShiftRight,BigInteger.prototype.getLowestSetBit=bnGetLowestSetBit,BigInteger.prototype.bitCount=bnBitCount,BigInteger.prototype.testBit=bnTestBit,BigInteger.prototype.setBit=bnSetBit,BigInteger.prototype.clearBit=bnClearBit,BigInteger.prototype.flipBit=bnFlipBit,BigInteger.prototype.add=bnAdd,BigInteger.prototype.subtract=bnSubtract,BigInteger.prototype.multiply=bnMultiply,BigInteger.prototype.divide=bnDivide,BigInteger.prototype.remainder=bnRemainder,BigInteger.prototype.divideAndRemainder=bnDivideAndRemainder,BigInteger.prototype.modPow=bnModPow,BigInteger.prototype.modInverse=bnModInverse,BigInteger.prototype.pow=bnPow,BigInteger.prototype.gcd=bnGCD,BigInteger.prototype.isProbablePrime=bnIsProbablePrime,BigInteger.prototype.square=bnSquare,Arcfour.prototype.init=ARC4init,Arcfour.prototype.next=ARC4next;var rng_psize=256,rng_state,rng_pool,rng_pptr;if(null==rng_pool){rng_pool=new Array,rng_pptr=0;var t;if(window.crypto&&window.crypto.getRandomValues){var z=new Uint32Array(256);for(window.crypto.getRandomValues(z),t=0;t<z.length;++t)rng_pool[rng_pptr++]=255&z[t]}var onMouseMoveListener=function(a){if(this.count=this.count||0,this.count>=256||rng_pptr>=rng_psize)return void(window.removeEventListener?window.removeEventListener("mousemove",onMouseMoveListener):window.detachEvent&&window.detachEvent("onmousemove",onMouseMoveListener));this.count+=1;var b=a.x+a.y;rng_pool[rng_pptr++]=255&b};window.addEventListener?window.addEventListener("mousemove",onMouseMoveListener):window.attachEvent&&window.attachEvent("onmousemove",onMouseMoveListener)}SecureRandom.prototype.nextBytes=rng_get_bytes,RSAKey.prototype.doPublic=RSADoPublic,RSAKey.prototype.setPublic=RSASetPublic,RSAKey.prototype.encrypt=RSAEncrypt,RSAKey.prototype.doPrivate=RSADoPrivate,RSAKey.prototype.setPrivate=RSASetPrivate,RSAKey.prototype.setPrivateEx=RSASetPrivateEx,RSAKey.prototype.generate=RSAGenerate,RSAKey.prototype.decrypt=RSADecrypt,function(){var a=function(a,b,c){var d=new SecureRandom,e=a>>1;this.e=parseInt(b,16);var f=new BigInteger(b,16),g=this,h=function(){var b=function(){if(g.p.compareTo(g.q)<=0){var a=g.p;g.p=g.q,g.q=a}var b=g.p.subtract(BigInteger.ONE),d=g.q.subtract(BigInteger.ONE),e=b.multiply(d);0==e.gcd(f).compareTo(BigInteger.ONE)?(g.n=g.p.multiply(g.q),g.d=f.modInverse(e),g.dmp1=g.d.mod(b),g.dmq1=g.d.mod(d),g.coeff=g.q.modInverse(g.p),setTimeout(function(){c()},0)):setTimeout(h,0)},i=function(){g.q=nbi(),g.q.fromNumberAsync(e,1,d,function(){g.q.subtract(BigInteger.ONE).gcda(f,function(a){0==a.compareTo(BigInteger.ONE)&&g.q.isProbablePrime(10)?setTimeout(b,0):setTimeout(i,0)})})},j=function(){g.p=nbi(),g.p.fromNumberAsync(a-e,1,d,function(){g.p.subtract(BigInteger.ONE).gcda(f,function(a){0==a.compareTo(BigInteger.ONE)&&g.p.isProbablePrime(10)?setTimeout(i,0):setTimeout(j,0)})})};setTimeout(j,0)};setTimeout(h,0)};RSAKey.prototype.generateAsync=a;var b=function(a,b){var c=this.s<0?this.negate():this.clone(),d=a.s<0?a.negate():a.clone();if(c.compareTo(d)<0){var e=c;c=d,d=e}var f=c.getLowestSetBit(),g=d.getLowestSetBit();if(0>g)return void b(c);g>f&&(g=f),g>0&&(c.rShiftTo(g,c),d.rShiftTo(g,d));var h=function(){(f=c.getLowestSetBit())>0&&c.rShiftTo(f,c),(f=d.getLowestSetBit())>0&&d.rShiftTo(f,d),c.compareTo(d)>=0?(c.subTo(d,c),c.rShiftTo(1,c)):(d.subTo(c,d),d.rShiftTo(1,d)),c.signum()>0?setTimeout(h,0):(g>0&&d.lShiftTo(g,d),setTimeout(function(){b(d)},0))};setTimeout(h,10)};BigInteger.prototype.gcda=b;var c=function(a,b,c,d){if("number"==typeof b)if(2>a)this.fromInt(1);else{this.fromNumber(a,c),this.testBit(a-1)||this.bitwiseTo(BigInteger.ONE.shiftLeft(a-1),op_or,this),this.isEven()&&this.dAddOffset(1,0);var e=this,f=function(){e.dAddOffset(2,0),e.bitLength()>a&&e.subTo(BigInteger.ONE.shiftLeft(a-1),e),e.isProbablePrime(b)?setTimeout(function(){d()},0):setTimeout(f,0)};setTimeout(f,0)}else{var g=new Array,h=7&a;g.length=(a>>3)+1,b.nextBytes(g),h>0?g[0]&=(1<<h)-1:g[0]=0,this.fromString(g,256)}};BigInteger.prototype.fromNumberAsync=c}();var b64map="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",b64pad="=",JSX=JSX||{};JSX.env=JSX.env||{};var L=JSX,OP=Object.prototype,FUNCTION_TOSTRING="[object Function]",ADD=["toString","valueOf"];JSX.env.parseUA=function(a){var b,c=function(a){var b=0;return parseFloat(a.replace(/\./g,function(){return 1==b++?"":"."}))},d=navigator,e={ie:0,opera:0,gecko:0,webkit:0,chrome:0,mobile:null,air:0,ipad:0,iphone:0,ipod:0,ios:null,android:0,webos:0,caja:d&&d.cajaVersion,secure:!1,os:null},f=a||navigator&&navigator.userAgent,g=window&&window.location,h=g&&g.href;return e.secure=h&&0===h.toLowerCase().indexOf("https"),f&&(/windows|win32/i.test(f)?e.os="windows":/macintosh/i.test(f)?e.os="macintosh":/rhino/i.test(f)&&(e.os="rhino"),/KHTML/.test(f)&&(e.webkit=1),b=f.match(/AppleWebKit\/([^\s]*)/),b&&b[1]&&(e.webkit=c(b[1]),/ Mobile\//.test(f)?(e.mobile="Apple",b=f.match(/OS ([^\s]*)/),b&&b[1]&&(b=c(b[1].replace("_","."))),e.ios=b,e.ipad=e.ipod=e.iphone=0,b=f.match(/iPad|iPod|iPhone/),b&&b[0]&&(e[b[0].toLowerCase()]=e.ios)):(b=f.match(/NokiaN[^\/]*|Android \d\.\d|webOS\/\d\.\d/),b&&(e.mobile=b[0]),/webOS/.test(f)&&(e.mobile="WebOS",b=f.match(/webOS\/([^\s]*);/),b&&b[1]&&(e.webos=c(b[1]))),/ Android/.test(f)&&(e.mobile="Android",b=f.match(/Android ([^\s]*);/),b&&b[1]&&(e.android=c(b[1])))),b=f.match(/Chrome\/([^\s]*)/),b&&b[1]?e.chrome=c(b[1]):(b=f.match(/AdobeAIR\/([^\s]*)/),b&&(e.air=b[0]))),e.webkit||(b=f.match(/Opera[\s\/]([^\s]*)/),b&&b[1]?(e.opera=c(b[1]),b=f.match(/Version\/([^\s]*)/),b&&b[1]&&(e.opera=c(b[1])),b=f.match(/Opera Mini[^;]*/),b&&(e.mobile=b[0])):(b=f.match(/MSIE\s([^;]*)/),b&&b[1]?e.ie=c(b[1]):(b=f.match(/Gecko\/([^\s]*)/),b&&(e.gecko=1,b=f.match(/rv:([^\s\)]*)/),b&&b[1]&&(e.gecko=c(b[1]))))))),e},JSX.env.ua=JSX.env.parseUA(),JSX.isFunction=function(a){return"function"==typeof a||OP.toString.apply(a)===FUNCTION_TOSTRING},JSX._IEEnumFix=JSX.env.ua.ie?function(a,b){var c,d,e;for(c=0;c<ADD.length;c+=1)d=ADD[c],e=b[d],L.isFunction(e)&&e!=OP[d]&&(a[d]=e)}:function(){},JSX.extend=function(a,b,c){if(!b||!a)throw new Error("extend failed, please check that all dependencies are included.");var d,e=function(){};if(e.prototype=b.prototype,a.prototype=new e,a.prototype.constructor=a,a.superclass=b.prototype,b.prototype.constructor==OP.constructor&&(b.prototype.constructor=b),c){for(d in c)L.hasOwnProperty(c,d)&&(a.prototype[d]=c[d]);L._IEEnumFix(a.prototype,c)}},"undefined"!=typeof KJUR&&KJUR||(KJUR={}),"undefined"!=typeof KJUR.asn1&&KJUR.asn1||(KJUR.asn1={}),KJUR.asn1.ASN1Util=new function(){this.integerToByteHex=function(a){var b=a.toString(16);return b.length%2==1&&(b="0"+b),b},this.bigIntToMinTwosComplementsHex=function(a){var b=a.toString(16);if("-"!=b.substr(0,1))b.length%2==1?b="0"+b:b.match(/^[0-7]/)||(b="00"+b);
	else{var c=b.substr(1),d=c.length;d%2==1?d+=1:b.match(/^[0-7]/)||(d+=2);for(var e="",f=0;d>f;f++)e+="f";var g=new BigInteger(e,16),h=g.xor(a).add(BigInteger.ONE);b=h.toString(16).replace(/^-/,"")}return b},this.getPEMStringFromHex=function(a,b){var c=CryptoJS.enc.Hex.parse(a),d=CryptoJS.enc.Base64.stringify(c),e=d.replace(/(.{64})/g,"$1\r\n");return e=e.replace(/\r\n$/,""),"-----BEGIN "+b+"-----\r\n"+e+"\r\n-----END "+b+"-----\r\n"}},KJUR.asn1.ASN1Object=function(){var a="";this.getLengthHexFromValue=function(){if("undefined"==typeof this.hV||null==this.hV)throw"this.hV is null or undefined.";if(this.hV.length%2==1)throw"value hex must be even length: n="+a.length+",v="+this.hV;var b=this.hV.length/2,c=b.toString(16);if(c.length%2==1&&(c="0"+c),128>b)return c;var d=c.length/2;if(d>15)throw"ASN.1 length too long to represent by 8x: n = "+b.toString(16);var e=128+d;return e.toString(16)+c},this.getEncodedHex=function(){return(null==this.hTLV||this.isModified)&&(this.hV=this.getFreshValueHex(),this.hL=this.getLengthHexFromValue(),this.hTLV=this.hT+this.hL+this.hV,this.isModified=!1),this.hTLV},this.getValueHex=function(){return this.getEncodedHex(),this.hV},this.getFreshValueHex=function(){return""}},KJUR.asn1.DERAbstractString=function(a){KJUR.asn1.DERAbstractString.superclass.constructor.call(this);this.getString=function(){return this.s},this.setString=function(a){this.hTLV=null,this.isModified=!0,this.s=a,this.hV=stohex(this.s)},this.setStringHex=function(a){this.hTLV=null,this.isModified=!0,this.s=null,this.hV=a},this.getFreshValueHex=function(){return this.hV},"undefined"!=typeof a&&("undefined"!=typeof a.str?this.setString(a.str):"undefined"!=typeof a.hex&&this.setStringHex(a.hex))},JSX.extend(KJUR.asn1.DERAbstractString,KJUR.asn1.ASN1Object),KJUR.asn1.DERAbstractTime=function(){KJUR.asn1.DERAbstractTime.superclass.constructor.call(this);this.localDateToUTC=function(a){utc=a.getTime()+6e4*a.getTimezoneOffset();var b=new Date(utc);return b},this.formatDate=function(a,b){var c=this.zeroPadding,d=this.localDateToUTC(a),e=String(d.getFullYear());"utc"==b&&(e=e.substr(2,2));var f=c(String(d.getMonth()+1),2),g=c(String(d.getDate()),2),h=c(String(d.getHours()),2),i=c(String(d.getMinutes()),2),j=c(String(d.getSeconds()),2);return e+f+g+h+i+j+"Z"},this.zeroPadding=function(a,b){return a.length>=b?a:new Array(b-a.length+1).join("0")+a},this.getString=function(){return this.s},this.setString=function(a){this.hTLV=null,this.isModified=!0,this.s=a,this.hV=stohex(this.s)},this.setByDateValue=function(a,b,c,d,e,f){var g=new Date(Date.UTC(a,b-1,c,d,e,f,0));this.setByDate(g)},this.getFreshValueHex=function(){return this.hV}},JSX.extend(KJUR.asn1.DERAbstractTime,KJUR.asn1.ASN1Object),KJUR.asn1.DERAbstractStructured=function(a){KJUR.asn1.DERAbstractString.superclass.constructor.call(this);this.setByASN1ObjectArray=function(a){this.hTLV=null,this.isModified=!0,this.asn1Array=a},this.appendASN1Object=function(a){this.hTLV=null,this.isModified=!0,this.asn1Array.push(a)},this.asn1Array=new Array,"undefined"!=typeof a&&"undefined"!=typeof a.array&&(this.asn1Array=a.array)},JSX.extend(KJUR.asn1.DERAbstractStructured,KJUR.asn1.ASN1Object),KJUR.asn1.DERBoolean=function(){KJUR.asn1.DERBoolean.superclass.constructor.call(this),this.hT="01",this.hTLV="0101ff"},JSX.extend(KJUR.asn1.DERBoolean,KJUR.asn1.ASN1Object),KJUR.asn1.DERInteger=function(a){KJUR.asn1.DERInteger.superclass.constructor.call(this),this.hT="02",this.setByBigInteger=function(a){this.hTLV=null,this.isModified=!0,this.hV=KJUR.asn1.ASN1Util.bigIntToMinTwosComplementsHex(a)},this.setByInteger=function(a){var b=new BigInteger(String(a),10);this.setByBigInteger(b)},this.setValueHex=function(a){this.hV=a},this.getFreshValueHex=function(){return this.hV},"undefined"!=typeof a&&("undefined"!=typeof a.bigint?this.setByBigInteger(a.bigint):"undefined"!=typeof a["int"]?this.setByInteger(a["int"]):"undefined"!=typeof a.hex&&this.setValueHex(a.hex))},JSX.extend(KJUR.asn1.DERInteger,KJUR.asn1.ASN1Object),KJUR.asn1.DERBitString=function(a){KJUR.asn1.DERBitString.superclass.constructor.call(this),this.hT="03",this.setHexValueIncludingUnusedBits=function(a){this.hTLV=null,this.isModified=!0,this.hV=a},this.setUnusedBitsAndHexValue=function(a,b){if(0>a||a>7)throw"unused bits shall be from 0 to 7: u = "+a;var c="0"+a;this.hTLV=null,this.isModified=!0,this.hV=c+b},this.setByBinaryString=function(a){a=a.replace(/0+$/,"");var b=8-a.length%8;8==b&&(b=0);for(var c=0;b>=c;c++)a+="0";for(var d="",c=0;c<a.length-1;c+=8){var e=a.substr(c,8),f=parseInt(e,2).toString(16);1==f.length&&(f="0"+f),d+=f}this.hTLV=null,this.isModified=!0,this.hV="0"+b+d},this.setByBooleanArray=function(a){for(var b="",c=0;c<a.length;c++)b+=1==a[c]?"1":"0";this.setByBinaryString(b)},this.newFalseArray=function(a){for(var b=new Array(a),c=0;a>c;c++)b[c]=!1;return b},this.getFreshValueHex=function(){return this.hV},"undefined"!=typeof a&&("undefined"!=typeof a.hex?this.setHexValueIncludingUnusedBits(a.hex):"undefined"!=typeof a.bin?this.setByBinaryString(a.bin):"undefined"!=typeof a.array&&this.setByBooleanArray(a.array))},JSX.extend(KJUR.asn1.DERBitString,KJUR.asn1.ASN1Object),KJUR.asn1.DEROctetString=function(a){KJUR.asn1.DEROctetString.superclass.constructor.call(this,a),this.hT="04"},JSX.extend(KJUR.asn1.DEROctetString,KJUR.asn1.DERAbstractString),KJUR.asn1.DERNull=function(){KJUR.asn1.DERNull.superclass.constructor.call(this),this.hT="05",this.hTLV="0500"},JSX.extend(KJUR.asn1.DERNull,KJUR.asn1.ASN1Object),KJUR.asn1.DERObjectIdentifier=function(a){var b=function(a){var b=a.toString(16);return 1==b.length&&(b="0"+b),b},c=function(a){var c="",d=new BigInteger(a,10),e=d.toString(2),f=7-e.length%7;7==f&&(f=0);for(var g="",h=0;f>h;h++)g+="0";e=g+e;for(var h=0;h<e.length-1;h+=7){var i=e.substr(h,7);h!=e.length-7&&(i="1"+i),c+=b(parseInt(i,2))}return c};KJUR.asn1.DERObjectIdentifier.superclass.constructor.call(this),this.hT="06",this.setValueHex=function(a){this.hTLV=null,this.isModified=!0,this.s=null,this.hV=a},this.setValueOidString=function(a){if(!a.match(/^[0-9.]+$/))throw"malformed oid string: "+a;var d="",e=a.split("."),f=40*parseInt(e[0])+parseInt(e[1]);d+=b(f),e.splice(0,2);for(var g=0;g<e.length;g++)d+=c(e[g]);this.hTLV=null,this.isModified=!0,this.s=null,this.hV=d},this.setValueName=function(a){if("undefined"==typeof KJUR.asn1.x509.OID.name2oidList[a])throw"DERObjectIdentifier oidName undefined: "+a;var b=KJUR.asn1.x509.OID.name2oidList[a];this.setValueOidString(b)},this.getFreshValueHex=function(){return this.hV},"undefined"!=typeof a&&("undefined"!=typeof a.oid?this.setValueOidString(a.oid):"undefined"!=typeof a.hex?this.setValueHex(a.hex):"undefined"!=typeof a.name&&this.setValueName(a.name))},JSX.extend(KJUR.asn1.DERObjectIdentifier,KJUR.asn1.ASN1Object),KJUR.asn1.DERUTF8String=function(a){KJUR.asn1.DERUTF8String.superclass.constructor.call(this,a),this.hT="0c"},JSX.extend(KJUR.asn1.DERUTF8String,KJUR.asn1.DERAbstractString),KJUR.asn1.DERNumericString=function(a){KJUR.asn1.DERNumericString.superclass.constructor.call(this,a),this.hT="12"},JSX.extend(KJUR.asn1.DERNumericString,KJUR.asn1.DERAbstractString),KJUR.asn1.DERPrintableString=function(a){KJUR.asn1.DERPrintableString.superclass.constructor.call(this,a),this.hT="13"},JSX.extend(KJUR.asn1.DERPrintableString,KJUR.asn1.DERAbstractString),KJUR.asn1.DERTeletexString=function(a){KJUR.asn1.DERTeletexString.superclass.constructor.call(this,a),this.hT="14"},JSX.extend(KJUR.asn1.DERTeletexString,KJUR.asn1.DERAbstractString),KJUR.asn1.DERIA5String=function(a){KJUR.asn1.DERIA5String.superclass.constructor.call(this,a),this.hT="16"},JSX.extend(KJUR.asn1.DERIA5String,KJUR.asn1.DERAbstractString),KJUR.asn1.DERUTCTime=function(a){KJUR.asn1.DERUTCTime.superclass.constructor.call(this,a),this.hT="17",this.setByDate=function(a){this.hTLV=null,this.isModified=!0,this.date=a,this.s=this.formatDate(this.date,"utc"),this.hV=stohex(this.s)},"undefined"!=typeof a&&("undefined"!=typeof a.str?this.setString(a.str):"undefined"!=typeof a.hex?this.setStringHex(a.hex):"undefined"!=typeof a.date&&this.setByDate(a.date))},JSX.extend(KJUR.asn1.DERUTCTime,KJUR.asn1.DERAbstractTime),KJUR.asn1.DERGeneralizedTime=function(a){KJUR.asn1.DERGeneralizedTime.superclass.constructor.call(this,a),this.hT="18",this.setByDate=function(a){this.hTLV=null,this.isModified=!0,this.date=a,this.s=this.formatDate(this.date,"gen"),this.hV=stohex(this.s)},"undefined"!=typeof a&&("undefined"!=typeof a.str?this.setString(a.str):"undefined"!=typeof a.hex?this.setStringHex(a.hex):"undefined"!=typeof a.date&&this.setByDate(a.date))},JSX.extend(KJUR.asn1.DERGeneralizedTime,KJUR.asn1.DERAbstractTime),KJUR.asn1.DERSequence=function(a){KJUR.asn1.DERSequence.superclass.constructor.call(this,a),this.hT="30",this.getFreshValueHex=function(){for(var a="",b=0;b<this.asn1Array.length;b++){var c=this.asn1Array[b];a+=c.getEncodedHex()}return this.hV=a,this.hV}},JSX.extend(KJUR.asn1.DERSequence,KJUR.asn1.DERAbstractStructured),KJUR.asn1.DERSet=function(a){KJUR.asn1.DERSet.superclass.constructor.call(this,a),this.hT="31",this.getFreshValueHex=function(){for(var a=new Array,b=0;b<this.asn1Array.length;b++){var c=this.asn1Array[b];a.push(c.getEncodedHex())}return a.sort(),this.hV=a.join(""),this.hV}},JSX.extend(KJUR.asn1.DERSet,KJUR.asn1.DERAbstractStructured),KJUR.asn1.DERTaggedObject=function(a){KJUR.asn1.DERTaggedObject.superclass.constructor.call(this),this.hT="a0",this.hV="",this.isExplicit=!0,this.asn1Object=null,this.setASN1Object=function(a,b,c){this.hT=b,this.isExplicit=a,this.asn1Object=c,this.isExplicit?(this.hV=this.asn1Object.getEncodedHex(),this.hTLV=null,this.isModified=!0):(this.hV=null,this.hTLV=c.getEncodedHex(),this.hTLV=this.hTLV.replace(/^../,b),this.isModified=!1)},this.getFreshValueHex=function(){return this.hV},"undefined"!=typeof a&&("undefined"!=typeof a.tag&&(this.hT=a.tag),"undefined"!=typeof a.explicit&&(this.isExplicit=a.explicit),"undefined"!=typeof a.obj&&(this.asn1Object=a.obj,this.setASN1Object(this.isExplicit,this.hT,this.asn1Object)))},JSX.extend(KJUR.asn1.DERTaggedObject,KJUR.asn1.ASN1Object),function(a){"use strict";var b,c={};c.decode=function(c){var d;if(b===a){var e="0123456789ABCDEF",f=" \f\n\r	 \u2028\u2029";for(b=[],d=0;16>d;++d)b[e.charAt(d)]=d;for(e=e.toLowerCase(),d=10;16>d;++d)b[e.charAt(d)]=d;for(d=0;d<f.length;++d)b[f.charAt(d)]=-1}var g=[],h=0,i=0;for(d=0;d<c.length;++d){var j=c.charAt(d);if("="==j)break;if(j=b[j],-1!=j){if(j===a)throw"Illegal character at offset "+d;h|=j,++i>=2?(g[g.length]=h,h=0,i=0):h<<=4}}if(i)throw"Hex encoding incomplete: 4 bits missing";return g},window.Hex=c}(),function(a){"use strict";var b,c={};c.decode=function(c){var d;if(b===a){var e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",f="= \f\n\r	 \u2028\u2029";for(b=[],d=0;64>d;++d)b[e.charAt(d)]=d;for(d=0;d<f.length;++d)b[f.charAt(d)]=-1}var g=[],h=0,i=0;for(d=0;d<c.length;++d){var j=c.charAt(d);if("="==j)break;if(j=b[j],-1!=j){if(j===a)throw"Illegal character at offset "+d;h|=j,++i>=4?(g[g.length]=h>>16,g[g.length]=h>>8&255,g[g.length]=255&h,h=0,i=0):h<<=6}}switch(i){case 1:throw"Base64 encoding incomplete: at least 2 bits missing";case 2:g[g.length]=h>>10;break;case 3:g[g.length]=h>>16,g[g.length]=h>>8&255}return g},c.re=/-----BEGIN [^-]+-----([A-Za-z0-9+\/=\s]+)-----END [^-]+-----|begin-base64[^\n]+\n([A-Za-z0-9+\/=\s]+)====/,c.unarmor=function(a){var b=c.re.exec(a);if(b)if(b[1])a=b[1];else{if(!b[2])throw"RegExp out of sync";a=b[2]}return c.decode(a)},window.Base64=c}(),function(a){"use strict";function b(a,c){a instanceof b?(this.enc=a.enc,this.pos=a.pos):(this.enc=a,this.pos=c)}function c(a,b,c,d,e){this.stream=a,this.header=b,this.length=c,this.tag=d,this.sub=e}var d=100,e="…",f={tag:function(a,b){var c=document.createElement(a);return c.className=b,c},text:function(a){return document.createTextNode(a)}};b.prototype.get=function(b){if(b===a&&(b=this.pos++),b>=this.enc.length)throw"Requesting byte offset "+b+" on a stream of length "+this.enc.length;return this.enc[b]},b.prototype.hexDigits="0123456789ABCDEF",b.prototype.hexByte=function(a){return this.hexDigits.charAt(a>>4&15)+this.hexDigits.charAt(15&a)},b.prototype.hexDump=function(a,b,c){for(var d="",e=a;b>e;++e)if(d+=this.hexByte(this.get(e)),c!==!0)switch(15&e){case 7:d+="  ";break;case 15:d+="\n";break;default:d+=" "}return d},b.prototype.parseStringISO=function(a,b){for(var c="",d=a;b>d;++d)c+=String.fromCharCode(this.get(d));return c},b.prototype.parseStringUTF=function(a,b){for(var c="",d=a;b>d;){var e=this.get(d++);c+=String.fromCharCode(128>e?e:e>191&&224>e?(31&e)<<6|63&this.get(d++):(15&e)<<12|(63&this.get(d++))<<6|63&this.get(d++))}return c},b.prototype.parseStringBMP=function(a,b){for(var c="",d=a;b>d;d+=2){var e=this.get(d),f=this.get(d+1);c+=String.fromCharCode((e<<8)+f)}return c},b.prototype.reTime=/^((?:1[89]|2\d)?\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/,b.prototype.parseTime=function(a,b){var c=this.parseStringISO(a,b),d=this.reTime.exec(c);return d?(c=d[1]+"-"+d[2]+"-"+d[3]+" "+d[4],d[5]&&(c+=":"+d[5],d[6]&&(c+=":"+d[6],d[7]&&(c+="."+d[7]))),d[8]&&(c+=" UTC","Z"!=d[8]&&(c+=d[8],d[9]&&(c+=":"+d[9]))),c):"Unrecognized time: "+c},b.prototype.parseInteger=function(a,b){var c=b-a;if(c>4){c<<=3;var d=this.get(a);if(0===d)c-=8;else for(;128>d;)d<<=1,--c;return"("+c+" bit)"}for(var e=0,f=a;b>f;++f)e=e<<8|this.get(f);return e},b.prototype.parseBitString=function(a,b){var c=this.get(a),d=(b-a-1<<3)-c,e="("+d+" bit)";if(20>=d){var f=c;e+=" ";for(var g=b-1;g>a;--g){for(var h=this.get(g),i=f;8>i;++i)e+=h>>i&1?"1":"0";f=0}}return e},b.prototype.parseOctetString=function(a,b){var c=b-a,f="("+c+" byte) ";c>d&&(b=a+d);for(var g=a;b>g;++g)f+=this.hexByte(this.get(g));return c>d&&(f+=e),f},b.prototype.parseOID=function(a,b){for(var c="",d=0,e=0,f=a;b>f;++f){var g=this.get(f);if(d=d<<7|127&g,e+=7,!(128&g)){if(""===c){var h=80>d?40>d?0:1:2;c=h+"."+(d-40*h)}else c+="."+(e>=31?"bigint":d);d=e=0}}return c},c.prototype.typeName=function(){if(this.tag===a)return"unknown";var b=this.tag>>6,c=(this.tag>>5&1,31&this.tag);switch(b){case 0:switch(c){case 0:return"EOC";case 1:return"BOOLEAN";case 2:return"INTEGER";case 3:return"BIT_STRING";case 4:return"OCTET_STRING";case 5:return"NULL";case 6:return"OBJECT_IDENTIFIER";case 7:return"ObjectDescriptor";case 8:return"EXTERNAL";case 9:return"REAL";case 10:return"ENUMERATED";case 11:return"EMBEDDED_PDV";case 12:return"UTF8String";case 16:return"SEQUENCE";case 17:return"SET";case 18:return"NumericString";case 19:return"PrintableString";case 20:return"TeletexString";case 21:return"VideotexString";case 22:return"IA5String";case 23:return"UTCTime";case 24:return"GeneralizedTime";case 25:return"GraphicString";case 26:return"VisibleString";case 27:return"GeneralString";case 28:return"UniversalString";case 30:return"BMPString";default:return"Universal_"+c.toString(16)}case 1:return"Application_"+c.toString(16);case 2:return"["+c+"]";case 3:return"Private_"+c.toString(16)}},c.prototype.reSeemsASCII=/^[ -~]+$/,c.prototype.content=function(){if(this.tag===a)return null;var b=this.tag>>6,c=31&this.tag,f=this.posContent(),g=Math.abs(this.length);if(0!==b){if(null!==this.sub)return"("+this.sub.length+" elem)";var h=this.stream.parseStringISO(f,f+Math.min(g,d));return this.reSeemsASCII.test(h)?h.substring(0,2*d)+(h.length>2*d?e:""):this.stream.parseOctetString(f,f+g)}switch(c){case 1:return 0===this.stream.get(f)?"false":"true";case 2:return this.stream.parseInteger(f,f+g);case 3:return this.sub?"("+this.sub.length+" elem)":this.stream.parseBitString(f,f+g);case 4:return this.sub?"("+this.sub.length+" elem)":this.stream.parseOctetString(f,f+g);case 6:return this.stream.parseOID(f,f+g);case 16:case 17:return"("+this.sub.length+" elem)";case 12:return this.stream.parseStringUTF(f,f+g);case 18:case 19:case 20:case 21:case 22:case 26:return this.stream.parseStringISO(f,f+g);case 30:return this.stream.parseStringBMP(f,f+g);case 23:case 24:return this.stream.parseTime(f,f+g)}return null},c.prototype.toString=function(){return this.typeName()+"@"+this.stream.pos+"[header:"+this.header+",length:"+this.length+",sub:"+(null===this.sub?"null":this.sub.length)+"]"},c.prototype.print=function(b){if(b===a&&(b=""),document.writeln(b+this),null!==this.sub){b+="  ";for(var c=0,d=this.sub.length;d>c;++c)this.sub[c].print(b)}},c.prototype.toPrettyString=function(b){b===a&&(b="");var c=b+this.typeName()+" @"+this.stream.pos;if(this.length>=0&&(c+="+"),c+=this.length,32&this.tag?c+=" (constructed)":3!=this.tag&&4!=this.tag||null===this.sub||(c+=" (encapsulates)"),c+="\n",null!==this.sub){b+="  ";for(var d=0,e=this.sub.length;e>d;++d)c+=this.sub[d].toPrettyString(b)}return c},c.prototype.toDOM=function(){var a=f.tag("div","node");a.asn1=this;var b=f.tag("div","head"),c=this.typeName().replace(/_/g," ");b.innerHTML=c;var d=this.content();if(null!==d){d=String(d).replace(/</g,"&lt;");var e=f.tag("span","preview");e.appendChild(f.text(d)),b.appendChild(e)}a.appendChild(b),this.node=a,this.head=b;var g=f.tag("div","value");if(c="Offset: "+this.stream.pos+"<br/>",c+="Length: "+this.header+"+",c+=this.length>=0?this.length:-this.length+" (undefined)",32&this.tag?c+="<br/>(constructed)":3!=this.tag&&4!=this.tag||null===this.sub||(c+="<br/>(encapsulates)"),null!==d&&(c+="<br/>Value:<br/><b>"+d+"</b>","object"==typeof oids&&6==this.tag)){var h=oids[d];h&&(h.d&&(c+="<br/>"+h.d),h.c&&(c+="<br/>"+h.c),h.w&&(c+="<br/>(warning!)"))}g.innerHTML=c,a.appendChild(g);var i=f.tag("div","sub");if(null!==this.sub)for(var j=0,k=this.sub.length;k>j;++j)i.appendChild(this.sub[j].toDOM());return a.appendChild(i),b.onclick=function(){a.className="node collapsed"==a.className?"node":"node collapsed"},a},c.prototype.posStart=function(){return this.stream.pos},c.prototype.posContent=function(){return this.stream.pos+this.header},c.prototype.posEnd=function(){return this.stream.pos+this.header+Math.abs(this.length)},c.prototype.fakeHover=function(a){this.node.className+=" hover",a&&(this.head.className+=" hover")},c.prototype.fakeOut=function(a){var b=/ ?hover/;this.node.className=this.node.className.replace(b,""),a&&(this.head.className=this.head.className.replace(b,""))},c.prototype.toHexDOM_sub=function(a,b,c,d,e){if(!(d>=e)){var g=f.tag("span",b);g.appendChild(f.text(c.hexDump(d,e))),a.appendChild(g)}},c.prototype.toHexDOM=function(b){var c=f.tag("span","hex");if(b===a&&(b=c),this.head.hexNode=c,this.head.onmouseover=function(){this.hexNode.className="hexCurrent"},this.head.onmouseout=function(){this.hexNode.className="hex"},c.asn1=this,c.onmouseover=function(){var a=!b.selected;a&&(b.selected=this.asn1,this.className="hexCurrent"),this.asn1.fakeHover(a)},c.onmouseout=function(){var a=b.selected==this.asn1;this.asn1.fakeOut(a),a&&(b.selected=null,this.className="hex")},this.toHexDOM_sub(c,"tag",this.stream,this.posStart(),this.posStart()+1),this.toHexDOM_sub(c,this.length>=0?"dlen":"ulen",this.stream,this.posStart()+1,this.posContent()),null===this.sub)c.appendChild(f.text(this.stream.hexDump(this.posContent(),this.posEnd())));else if(this.sub.length>0){var d=this.sub[0],e=this.sub[this.sub.length-1];this.toHexDOM_sub(c,"intro",this.stream,this.posContent(),d.posStart());for(var g=0,h=this.sub.length;h>g;++g)c.appendChild(this.sub[g].toHexDOM(b));this.toHexDOM_sub(c,"outro",this.stream,e.posEnd(),this.posEnd())}return c},c.prototype.toHexString=function(){return this.stream.hexDump(this.posStart(),this.posEnd(),!0)},c.decodeLength=function(a){var b=a.get(),c=127&b;if(c==b)return c;if(c>3)throw"Length over 24 bits not supported at position "+(a.pos-1);if(0===c)return-1;b=0;for(var d=0;c>d;++d)b=b<<8|a.get();return b},c.hasContent=function(a,d,e){if(32&a)return!0;if(3>a||a>4)return!1;var f=new b(e);3==a&&f.get();var g=f.get();if(g>>6&1)return!1;try{var h=c.decodeLength(f);return f.pos-e.pos+h==d}catch(i){return!1}},c.decode=function(a){a instanceof b||(a=new b(a,0));var d=new b(a),e=a.get(),f=c.decodeLength(a),g=a.pos-d.pos,h=null;if(c.hasContent(e,f,a)){var i=a.pos;if(3==e&&a.get(),h=[],f>=0){for(var j=i+f;a.pos<j;)h[h.length]=c.decode(a);if(a.pos!=j)throw"Content size is not correct for container starting at offset "+i}else try{for(;;){var k=c.decode(a);if(0===k.tag)break;h[h.length]=k}f=i-a.pos}catch(l){throw"Exception while decoding undefined length content: "+l}}else a.pos+=f;return new c(d,g,f,e,h)},c.test=function(){for(var a=[{value:[39],expected:39},{value:[129,201],expected:201},{value:[131,254,220,186],expected:16702650}],d=0,e=a.length;e>d;++d){var f=new b(a[d].value,0),g=c.decodeLength(f);g!=a[d].expected&&document.write("In test["+d+"] expected "+a[d].expected+" got "+g+"\n")}},window.ASN1=c}(),ASN1.prototype.getHexStringValue=function(){var a=this.toHexString(),b=2*this.header,c=2*this.length;return a.substr(b,c)},RSAKey.prototype.parseKey=function(a){try{var b=0,c=0,d=/^\s*(?:[0-9A-Fa-f][0-9A-Fa-f]\s*)+$/,e=d.test(a)?Hex.decode(a):Base64.unarmor(a),f=ASN1.decode(e);if(9===f.sub.length){b=f.sub[1].getHexStringValue(),this.n=parseBigInt(b,16),c=f.sub[2].getHexStringValue(),this.e=parseInt(c,16);var g=f.sub[3].getHexStringValue();this.d=parseBigInt(g,16);var h=f.sub[4].getHexStringValue();this.p=parseBigInt(h,16);var i=f.sub[5].getHexStringValue();this.q=parseBigInt(i,16);var j=f.sub[6].getHexStringValue();this.dmp1=parseBigInt(j,16);var k=f.sub[7].getHexStringValue();this.dmq1=parseBigInt(k,16);var l=f.sub[8].getHexStringValue();this.coeff=parseBigInt(l,16)}else{if(2!==f.sub.length)return!1;var m=f.sub[1],n=m.sub[0];b=n.sub[0].getHexStringValue(),this.n=parseBigInt(b,16),c=n.sub[1].getHexStringValue(),this.e=parseInt(c,16)}return!0}catch(o){return!1}},RSAKey.prototype.getPrivateBaseKey=function(){var a={array:[new KJUR.asn1.DERInteger({"int":0}),new KJUR.asn1.DERInteger({bigint:this.n}),new KJUR.asn1.DERInteger({"int":this.e}),new KJUR.asn1.DERInteger({bigint:this.d}),new KJUR.asn1.DERInteger({bigint:this.p}),new KJUR.asn1.DERInteger({bigint:this.q}),new KJUR.asn1.DERInteger({bigint:this.dmp1}),new KJUR.asn1.DERInteger({bigint:this.dmq1}),new KJUR.asn1.DERInteger({bigint:this.coeff})]},b=new KJUR.asn1.DERSequence(a);return b.getEncodedHex()},RSAKey.prototype.getPrivateBaseKeyB64=function(){return hex2b64(this.getPrivateBaseKey())},RSAKey.prototype.getPublicBaseKey=function(){var a={array:[new KJUR.asn1.DERObjectIdentifier({oid:"1.2.840.113549.1.1.1"}),new KJUR.asn1.DERNull]},b=new KJUR.asn1.DERSequence(a);a={array:[new KJUR.asn1.DERInteger({bigint:this.n}),new KJUR.asn1.DERInteger({"int":this.e})]};var c=new KJUR.asn1.DERSequence(a);a={hex:"00"+c.getEncodedHex()};var d=new KJUR.asn1.DERBitString(a);a={array:[b,d]};var e=new KJUR.asn1.DERSequence(a);return e.getEncodedHex()},RSAKey.prototype.getPublicBaseKeyB64=function(){return hex2b64(this.getPublicBaseKey())},RSAKey.prototype.wordwrap=function(a,b){if(b=b||64,!a)return a;var c="(.{1,"+b+"})( +|$\n?)|(.{1,"+b+"})";return a.match(RegExp(c,"g")).join("\n")},RSAKey.prototype.getPrivateKey=function(){var a="-----BEGIN RSA PRIVATE KEY-----\n";return a+=this.wordwrap(this.getPrivateBaseKeyB64())+"\n",a+="-----END RSA PRIVATE KEY-----"},RSAKey.prototype.getPublicKey=function(){var a="-----BEGIN PUBLIC KEY-----\n";return a+=this.wordwrap(this.getPublicBaseKeyB64())+"\n",a+="-----END PUBLIC KEY-----"},RSAKey.prototype.hasPublicKeyProperty=function(a){return a=a||{},a.hasOwnProperty("n")&&a.hasOwnProperty("e")},RSAKey.prototype.hasPrivateKeyProperty=function(a){return a=a||{},a.hasOwnProperty("n")&&a.hasOwnProperty("e")&&a.hasOwnProperty("d")&&a.hasOwnProperty("p")&&a.hasOwnProperty("q")&&a.hasOwnProperty("dmp1")&&a.hasOwnProperty("dmq1")&&a.hasOwnProperty("coeff")},RSAKey.prototype.parsePropertiesFrom=function(a){this.n=a.n,this.e=a.e,a.hasOwnProperty("d")&&(this.d=a.d,this.p=a.p,this.q=a.q,this.dmp1=a.dmp1,this.dmq1=a.dmq1,this.coeff=a.coeff)};var JSEncryptRSAKey=function(a){RSAKey.call(this),a&&("string"==typeof a?this.parseKey(a):(this.hasPrivateKeyProperty(a)||this.hasPublicKeyProperty(a))&&this.parsePropertiesFrom(a))};JSEncryptRSAKey.prototype=new RSAKey,JSEncryptRSAKey.prototype.constructor=JSEncryptRSAKey;var JSEncrypt=function(a){a=a||{},this.default_key_size=parseInt(a.default_key_size)||1024,this.default_public_exponent=a.default_public_exponent||"010001",this.log=a.log||!1,this.key=null};JSEncrypt.prototype.setKey=function(a){this.log&&this.key&&console.warn("A key was already set, overriding existing."),this.key=new JSEncryptRSAKey(a)},JSEncrypt.prototype.setPrivateKey=function(a){this.setKey(a)},JSEncrypt.prototype.setPublicKey=function(a){this.setKey(a)},JSEncrypt.prototype.decrypt=function(a){try{return this.getKey().decrypt(b64tohex(a))}catch(b){return!1}},JSEncrypt.prototype.encrypt=function(a){try{return hex2b64(this.getKey().encrypt(a))}catch(b){return!1}},JSEncrypt.prototype.getKey=function(a){if(!this.key){if(this.key=new JSEncryptRSAKey,a&&"[object Function]"==={}.toString.call(a))return void this.key.generateAsync(this.default_key_size,this.default_public_exponent,a);this.key.generate(this.default_key_size,this.default_public_exponent)}return this.key},JSEncrypt.prototype.getPrivateKey=function(){return this.getKey().getPrivateKey()},JSEncrypt.prototype.getPrivateKeyB64=function(){return this.getKey().getPrivateBaseKeyB64()},JSEncrypt.prototype.getPublicKey=function(){return this.getKey().getPublicKey()},JSEncrypt.prototype.getPublicKeyB64=function(){return this.getKey().getPublicBaseKeyB64()};exports.JSEncrypt = JSEncrypt;
	})(JSEncryptExports);
	var JSEncrypt = JSEncryptExports.JSEncrypt;


/***/ },
/* 3 */
/***/ function(module, exports) {

	/*
	CryptoJS v3.1.2
	code.google.com/p/crypto-js
	(c) 2009-2013 by Jeff Mott. All rights reserved.
	code.google.com/p/crypto-js/wiki/License
	*/
	var CryptoJS=CryptoJS||function(u,p){var d={},l=d.lib={},s=function(){},t=l.Base={extend:function(a){s.prototype=this;var c=new s;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
	r=l.WordArray=t.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=p?c:4*a.length},toString:function(a){return(a||v).stringify(this)},concat:function(a){var c=this.words,e=a.words,j=this.sigBytes;a=a.sigBytes;this.clamp();if(j%4)for(var k=0;k<a;k++)c[j+k>>>2]|=(e[k>>>2]>>>24-8*(k%4)&255)<<24-8*((j+k)%4);else if(65535<e.length)for(k=0;k<a;k+=4)c[j+k>>>2]=e[k>>>2];else c.push.apply(c,e);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<
	32-8*(c%4);a.length=u.ceil(c/4)},clone:function(){var a=t.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],e=0;e<a;e+=4)c.push(4294967296*u.random()|0);return new r.init(c,a)}}),w=d.enc={},v=w.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var e=[],j=0;j<a;j++){var k=c[j>>>2]>>>24-8*(j%4)&255;e.push((k>>>4).toString(16));e.push((k&15).toString(16))}return e.join("")},parse:function(a){for(var c=a.length,e=[],j=0;j<c;j+=2)e[j>>>3]|=parseInt(a.substr(j,
	2),16)<<24-4*(j%8);return new r.init(e,c/2)}},b=w.Latin1={stringify:function(a){var c=a.words;a=a.sigBytes;for(var e=[],j=0;j<a;j++)e.push(String.fromCharCode(c[j>>>2]>>>24-8*(j%4)&255));return e.join("")},parse:function(a){for(var c=a.length,e=[],j=0;j<c;j++)e[j>>>2]|=(a.charCodeAt(j)&255)<<24-8*(j%4);return new r.init(e,c)}},x=w.Utf8={stringify:function(a){try{return decodeURIComponent(escape(b.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return b.parse(unescape(encodeURIComponent(a)))}},
	q=l.BufferedBlockAlgorithm=t.extend({reset:function(){this._data=new r.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=x.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,e=c.words,j=c.sigBytes,k=this.blockSize,b=j/(4*k),b=a?u.ceil(b):u.max((b|0)-this._minBufferSize,0);a=b*k;j=u.min(4*a,j);if(a){for(var q=0;q<a;q+=k)this._doProcessBlock(e,q);q=e.splice(0,a);c.sigBytes-=j}return new r.init(q,j)},clone:function(){var a=t.clone.call(this);
	a._data=this._data.clone();return a},_minBufferSize:0});l.Hasher=q.extend({cfg:t.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){q.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(b,e){return(new a.init(e)).finalize(b)}},_createHmacHelper:function(a){return function(b,e){return(new n.HMAC.init(a,
	e)).finalize(b)}}});var n=d.algo={};return d}(Math);
	(function(){var u=CryptoJS,p=u.lib.WordArray;u.enc.Base64={stringify:function(d){var l=d.words,p=d.sigBytes,t=this._map;d.clamp();d=[];for(var r=0;r<p;r+=3)for(var w=(l[r>>>2]>>>24-8*(r%4)&255)<<16|(l[r+1>>>2]>>>24-8*((r+1)%4)&255)<<8|l[r+2>>>2]>>>24-8*((r+2)%4)&255,v=0;4>v&&r+0.75*v<p;v++)d.push(t.charAt(w>>>6*(3-v)&63));if(l=t.charAt(64))for(;d.length%4;)d.push(l);return d.join("")},parse:function(d){var l=d.length,s=this._map,t=s.charAt(64);t&&(t=d.indexOf(t),-1!=t&&(l=t));for(var t=[],r=0,w=0;w<
	l;w++)if(w%4){var v=s.indexOf(d.charAt(w-1))<<2*(w%4),b=s.indexOf(d.charAt(w))>>>6-2*(w%4);t[r>>>2]|=(v|b)<<24-8*(r%4);r++}return p.create(t,r)},_map:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="}})();
	(function(u){function p(b,n,a,c,e,j,k){b=b+(n&a|~n&c)+e+k;return(b<<j|b>>>32-j)+n}function d(b,n,a,c,e,j,k){b=b+(n&c|a&~c)+e+k;return(b<<j|b>>>32-j)+n}function l(b,n,a,c,e,j,k){b=b+(n^a^c)+e+k;return(b<<j|b>>>32-j)+n}function s(b,n,a,c,e,j,k){b=b+(a^(n|~c))+e+k;return(b<<j|b>>>32-j)+n}for(var t=CryptoJS,r=t.lib,w=r.WordArray,v=r.Hasher,r=t.algo,b=[],x=0;64>x;x++)b[x]=4294967296*u.abs(u.sin(x+1))|0;r=r.MD5=v.extend({_doReset:function(){this._hash=new w.init([1732584193,4023233417,2562383102,271733878])},
	_doProcessBlock:function(q,n){for(var a=0;16>a;a++){var c=n+a,e=q[c];q[c]=(e<<8|e>>>24)&16711935|(e<<24|e>>>8)&4278255360}var a=this._hash.words,c=q[n+0],e=q[n+1],j=q[n+2],k=q[n+3],z=q[n+4],r=q[n+5],t=q[n+6],w=q[n+7],v=q[n+8],A=q[n+9],B=q[n+10],C=q[n+11],u=q[n+12],D=q[n+13],E=q[n+14],x=q[n+15],f=a[0],m=a[1],g=a[2],h=a[3],f=p(f,m,g,h,c,7,b[0]),h=p(h,f,m,g,e,12,b[1]),g=p(g,h,f,m,j,17,b[2]),m=p(m,g,h,f,k,22,b[3]),f=p(f,m,g,h,z,7,b[4]),h=p(h,f,m,g,r,12,b[5]),g=p(g,h,f,m,t,17,b[6]),m=p(m,g,h,f,w,22,b[7]),
	f=p(f,m,g,h,v,7,b[8]),h=p(h,f,m,g,A,12,b[9]),g=p(g,h,f,m,B,17,b[10]),m=p(m,g,h,f,C,22,b[11]),f=p(f,m,g,h,u,7,b[12]),h=p(h,f,m,g,D,12,b[13]),g=p(g,h,f,m,E,17,b[14]),m=p(m,g,h,f,x,22,b[15]),f=d(f,m,g,h,e,5,b[16]),h=d(h,f,m,g,t,9,b[17]),g=d(g,h,f,m,C,14,b[18]),m=d(m,g,h,f,c,20,b[19]),f=d(f,m,g,h,r,5,b[20]),h=d(h,f,m,g,B,9,b[21]),g=d(g,h,f,m,x,14,b[22]),m=d(m,g,h,f,z,20,b[23]),f=d(f,m,g,h,A,5,b[24]),h=d(h,f,m,g,E,9,b[25]),g=d(g,h,f,m,k,14,b[26]),m=d(m,g,h,f,v,20,b[27]),f=d(f,m,g,h,D,5,b[28]),h=d(h,f,
	m,g,j,9,b[29]),g=d(g,h,f,m,w,14,b[30]),m=d(m,g,h,f,u,20,b[31]),f=l(f,m,g,h,r,4,b[32]),h=l(h,f,m,g,v,11,b[33]),g=l(g,h,f,m,C,16,b[34]),m=l(m,g,h,f,E,23,b[35]),f=l(f,m,g,h,e,4,b[36]),h=l(h,f,m,g,z,11,b[37]),g=l(g,h,f,m,w,16,b[38]),m=l(m,g,h,f,B,23,b[39]),f=l(f,m,g,h,D,4,b[40]),h=l(h,f,m,g,c,11,b[41]),g=l(g,h,f,m,k,16,b[42]),m=l(m,g,h,f,t,23,b[43]),f=l(f,m,g,h,A,4,b[44]),h=l(h,f,m,g,u,11,b[45]),g=l(g,h,f,m,x,16,b[46]),m=l(m,g,h,f,j,23,b[47]),f=s(f,m,g,h,c,6,b[48]),h=s(h,f,m,g,w,10,b[49]),g=s(g,h,f,m,
	E,15,b[50]),m=s(m,g,h,f,r,21,b[51]),f=s(f,m,g,h,u,6,b[52]),h=s(h,f,m,g,k,10,b[53]),g=s(g,h,f,m,B,15,b[54]),m=s(m,g,h,f,e,21,b[55]),f=s(f,m,g,h,v,6,b[56]),h=s(h,f,m,g,x,10,b[57]),g=s(g,h,f,m,t,15,b[58]),m=s(m,g,h,f,D,21,b[59]),f=s(f,m,g,h,z,6,b[60]),h=s(h,f,m,g,C,10,b[61]),g=s(g,h,f,m,j,15,b[62]),m=s(m,g,h,f,A,21,b[63]);a[0]=a[0]+f|0;a[1]=a[1]+m|0;a[2]=a[2]+g|0;a[3]=a[3]+h|0},_doFinalize:function(){var b=this._data,n=b.words,a=8*this._nDataBytes,c=8*b.sigBytes;n[c>>>5]|=128<<24-c%32;var e=u.floor(a/
	4294967296);n[(c+64>>>9<<4)+15]=(e<<8|e>>>24)&16711935|(e<<24|e>>>8)&4278255360;n[(c+64>>>9<<4)+14]=(a<<8|a>>>24)&16711935|(a<<24|a>>>8)&4278255360;b.sigBytes=4*(n.length+1);this._process();b=this._hash;n=b.words;for(a=0;4>a;a++)c=n[a],n[a]=(c<<8|c>>>24)&16711935|(c<<24|c>>>8)&4278255360;return b},clone:function(){var b=v.clone.call(this);b._hash=this._hash.clone();return b}});t.MD5=v._createHelper(r);t.HmacMD5=v._createHmacHelper(r)})(Math);
	(function(){var u=CryptoJS,p=u.lib,d=p.Base,l=p.WordArray,p=u.algo,s=p.EvpKDF=d.extend({cfg:d.extend({keySize:4,hasher:p.MD5,iterations:1}),init:function(d){this.cfg=this.cfg.extend(d)},compute:function(d,r){for(var p=this.cfg,s=p.hasher.create(),b=l.create(),u=b.words,q=p.keySize,p=p.iterations;u.length<q;){n&&s.update(n);var n=s.update(d).finalize(r);s.reset();for(var a=1;a<p;a++)n=s.finalize(n),s.reset();b.concat(n)}b.sigBytes=4*q;return b}});u.EvpKDF=function(d,l,p){return s.create(p).compute(d,
	l)}})();
	CryptoJS.lib.Cipher||function(u){var p=CryptoJS,d=p.lib,l=d.Base,s=d.WordArray,t=d.BufferedBlockAlgorithm,r=p.enc.Base64,w=p.algo.EvpKDF,v=d.Cipher=t.extend({cfg:l.extend(),createEncryptor:function(e,a){return this.create(this._ENC_XFORM_MODE,e,a)},createDecryptor:function(e,a){return this.create(this._DEC_XFORM_MODE,e,a)},init:function(e,a,b){this.cfg=this.cfg.extend(b);this._xformMode=e;this._key=a;this.reset()},reset:function(){t.reset.call(this);this._doReset()},process:function(e){this._append(e);return this._process()},
	finalize:function(e){e&&this._append(e);return this._doFinalize()},keySize:4,ivSize:4,_ENC_XFORM_MODE:1,_DEC_XFORM_MODE:2,_createHelper:function(e){return{encrypt:function(b,k,d){return("string"==typeof k?c:a).encrypt(e,b,k,d)},decrypt:function(b,k,d){return("string"==typeof k?c:a).decrypt(e,b,k,d)}}}});d.StreamCipher=v.extend({_doFinalize:function(){return this._process(!0)},blockSize:1});var b=p.mode={},x=function(e,a,b){var c=this._iv;c?this._iv=u:c=this._prevBlock;for(var d=0;d<b;d++)e[a+d]^=
	c[d]},q=(d.BlockCipherMode=l.extend({createEncryptor:function(e,a){return this.Encryptor.create(e,a)},createDecryptor:function(e,a){return this.Decryptor.create(e,a)},init:function(e,a){this._cipher=e;this._iv=a}})).extend();q.Encryptor=q.extend({processBlock:function(e,a){var b=this._cipher,c=b.blockSize;x.call(this,e,a,c);b.encryptBlock(e,a);this._prevBlock=e.slice(a,a+c)}});q.Decryptor=q.extend({processBlock:function(e,a){var b=this._cipher,c=b.blockSize,d=e.slice(a,a+c);b.decryptBlock(e,a);x.call(this,
	e,a,c);this._prevBlock=d}});b=b.CBC=q;q=(p.pad={}).Pkcs7={pad:function(a,b){for(var c=4*b,c=c-a.sigBytes%c,d=c<<24|c<<16|c<<8|c,l=[],n=0;n<c;n+=4)l.push(d);c=s.create(l,c);a.concat(c)},unpad:function(a){a.sigBytes-=a.words[a.sigBytes-1>>>2]&255}};d.BlockCipher=v.extend({cfg:v.cfg.extend({mode:b,padding:q}),reset:function(){v.reset.call(this);var a=this.cfg,b=a.iv,a=a.mode;if(this._xformMode==this._ENC_XFORM_MODE)var c=a.createEncryptor;else c=a.createDecryptor,this._minBufferSize=1;this._mode=c.call(a,
	this,b&&b.words)},_doProcessBlock:function(a,b){this._mode.processBlock(a,b)},_doFinalize:function(){var a=this.cfg.padding;if(this._xformMode==this._ENC_XFORM_MODE){a.pad(this._data,this.blockSize);var b=this._process(!0)}else b=this._process(!0),a.unpad(b);return b},blockSize:4});var n=d.CipherParams=l.extend({init:function(a){this.mixIn(a)},toString:function(a){return(a||this.formatter).stringify(this)}}),b=(p.format={}).OpenSSL={stringify:function(a){var b=a.ciphertext;a=a.salt;return(a?s.create([1398893684,
	1701076831]).concat(a).concat(b):b).toString(r)},parse:function(a){a=r.parse(a);var b=a.words;if(1398893684==b[0]&&1701076831==b[1]){var c=s.create(b.slice(2,4));b.splice(0,4);a.sigBytes-=16}return n.create({ciphertext:a,salt:c})}},a=d.SerializableCipher=l.extend({cfg:l.extend({format:b}),encrypt:function(a,b,c,d){d=this.cfg.extend(d);var l=a.createEncryptor(c,d);b=l.finalize(b);l=l.cfg;return n.create({ciphertext:b,key:c,iv:l.iv,algorithm:a,mode:l.mode,padding:l.padding,blockSize:a.blockSize,formatter:d.format})},
	decrypt:function(a,b,c,d){d=this.cfg.extend(d);b=this._parse(b,d.format);return a.createDecryptor(c,d).finalize(b.ciphertext)},_parse:function(a,b){return"string"==typeof a?b.parse(a,this):a}}),p=(p.kdf={}).OpenSSL={execute:function(a,b,c,d){d||(d=s.random(8));a=w.create({keySize:b+c}).compute(a,d);c=s.create(a.words.slice(b),4*c);a.sigBytes=4*b;return n.create({key:a,iv:c,salt:d})}},c=d.PasswordBasedCipher=a.extend({cfg:a.cfg.extend({kdf:p}),encrypt:function(b,c,d,l){l=this.cfg.extend(l);d=l.kdf.execute(d,
	b.keySize,b.ivSize);l.iv=d.iv;b=a.encrypt.call(this,b,c,d.key,l);b.mixIn(d);return b},decrypt:function(b,c,d,l){l=this.cfg.extend(l);c=this._parse(c,l.format);d=l.kdf.execute(d,b.keySize,b.ivSize,c.salt);l.iv=d.iv;return a.decrypt.call(this,b,c,d.key,l)}})}();
	(function(){for(var u=CryptoJS,p=u.lib.BlockCipher,d=u.algo,l=[],s=[],t=[],r=[],w=[],v=[],b=[],x=[],q=[],n=[],a=[],c=0;256>c;c++)a[c]=128>c?c<<1:c<<1^283;for(var e=0,j=0,c=0;256>c;c++){var k=j^j<<1^j<<2^j<<3^j<<4,k=k>>>8^k&255^99;l[e]=k;s[k]=e;var z=a[e],F=a[z],G=a[F],y=257*a[k]^16843008*k;t[e]=y<<24|y>>>8;r[e]=y<<16|y>>>16;w[e]=y<<8|y>>>24;v[e]=y;y=16843009*G^65537*F^257*z^16843008*e;b[k]=y<<24|y>>>8;x[k]=y<<16|y>>>16;q[k]=y<<8|y>>>24;n[k]=y;e?(e=z^a[a[a[G^z]]],j^=a[a[j]]):e=j=1}var H=[0,1,2,4,8,
	16,32,64,128,27,54],d=d.AES=p.extend({_doReset:function(){for(var a=this._key,c=a.words,d=a.sigBytes/4,a=4*((this._nRounds=d+6)+1),e=this._keySchedule=[],j=0;j<a;j++)if(j<d)e[j]=c[j];else{var k=e[j-1];j%d?6<d&&4==j%d&&(k=l[k>>>24]<<24|l[k>>>16&255]<<16|l[k>>>8&255]<<8|l[k&255]):(k=k<<8|k>>>24,k=l[k>>>24]<<24|l[k>>>16&255]<<16|l[k>>>8&255]<<8|l[k&255],k^=H[j/d|0]<<24);e[j]=e[j-d]^k}c=this._invKeySchedule=[];for(d=0;d<a;d++)j=a-d,k=d%4?e[j]:e[j-4],c[d]=4>d||4>=j?k:b[l[k>>>24]]^x[l[k>>>16&255]]^q[l[k>>>
	8&255]]^n[l[k&255]]},encryptBlock:function(a,b){this._doCryptBlock(a,b,this._keySchedule,t,r,w,v,l)},decryptBlock:function(a,c){var d=a[c+1];a[c+1]=a[c+3];a[c+3]=d;this._doCryptBlock(a,c,this._invKeySchedule,b,x,q,n,s);d=a[c+1];a[c+1]=a[c+3];a[c+3]=d},_doCryptBlock:function(a,b,c,d,e,j,l,f){for(var m=this._nRounds,g=a[b]^c[0],h=a[b+1]^c[1],k=a[b+2]^c[2],n=a[b+3]^c[3],p=4,r=1;r<m;r++)var q=d[g>>>24]^e[h>>>16&255]^j[k>>>8&255]^l[n&255]^c[p++],s=d[h>>>24]^e[k>>>16&255]^j[n>>>8&255]^l[g&255]^c[p++],t=
	d[k>>>24]^e[n>>>16&255]^j[g>>>8&255]^l[h&255]^c[p++],n=d[n>>>24]^e[g>>>16&255]^j[h>>>8&255]^l[k&255]^c[p++],g=q,h=s,k=t;q=(f[g>>>24]<<24|f[h>>>16&255]<<16|f[k>>>8&255]<<8|f[n&255])^c[p++];s=(f[h>>>24]<<24|f[k>>>16&255]<<16|f[n>>>8&255]<<8|f[g&255])^c[p++];t=(f[k>>>24]<<24|f[n>>>16&255]<<16|f[g>>>8&255]<<8|f[h&255])^c[p++];n=(f[n>>>24]<<24|f[g>>>16&255]<<16|f[h>>>8&255]<<8|f[k&255])^c[p++];a[b]=q;a[b+1]=s;a[b+2]=t;a[b+3]=n},keySize:8});u.AES=p._createHelper(d)})();


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var require;var require;/* WEBPACK VAR INJECTION */(function(Buffer) {/** 'zlib' nodejs core module browserify-ied with `--standalone zlib`. Should support all module systems (commonjs, AMD & `window.zlib`) - check browserify docs.

	From [node2web](http://github.com/anodynos/node2web) collection,
	should/will be exposed as 'zlib' to [bower](http://bower.io) for *browser* usage.

	browserify version: '3.46.1', build date 'Wed Oct 08 2014 17:38:46 GMT+0300 (EEST)' 
	**/
	!function(e){if(true)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.zlib=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return require(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
	// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
	//
	// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
	//
	// Originally from narwhal.js (http://narwhaljs.org)
	// Copyright (c) 2009 Thomas Robinson <280north.com>
	//
	// Permission is hereby granted, free of charge, to any person obtaining a copy
	// of this software and associated documentation files (the 'Software'), to
	// deal in the Software without restriction, including without limitation the
	// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
	// sell copies of the Software, and to permit persons to whom the Software is
	// furnished to do so, subject to the following conditions:
	//
	// The above copyright notice and this permission notice shall be included in
	// all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
	// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
	// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

	// when used in node, this will actually load the util module we depend on
	// versus loading the builtin util module as happens otherwise
	// this is a bug in node module loading as far as I am concerned
	var util = _dereq_('util/');

	var pSlice = Array.prototype.slice;
	var hasOwn = Object.prototype.hasOwnProperty;

	// 1. The assert module provides functions that throw
	// AssertionError's when particular conditions are not met. The
	// assert module must conform to the following interface.

	var assert = module.exports = ok;

	// 2. The AssertionError is defined in assert.
	// new assert.AssertionError({ message: message,
	//                             actual: actual,
	//                             expected: expected })

	assert.AssertionError = function AssertionError(options) {
	  this.name = 'AssertionError';
	  this.actual = options.actual;
	  this.expected = options.expected;
	  this.operator = options.operator;
	  if (options.message) {
	    this.message = options.message;
	    this.generatedMessage = false;
	  } else {
	    this.message = getMessage(this);
	    this.generatedMessage = true;
	  }
	  var stackStartFunction = options.stackStartFunction || fail;

	  if (Error.captureStackTrace) {
	    Error.captureStackTrace(this, stackStartFunction);
	  }
	  else {
	    // non v8 browsers so we can have a stacktrace
	    var err = new Error();
	    if (err.stack) {
	      var out = err.stack;

	      // try to strip useless frames
	      var fn_name = stackStartFunction.name;
	      var idx = out.indexOf('\n' + fn_name);
	      if (idx >= 0) {
	        // once we have located the function frame
	        // we need to strip out everything before it (and its line)
	        var next_line = out.indexOf('\n', idx + 1);
	        out = out.substring(next_line + 1);
	      }

	      this.stack = out;
	    }
	  }
	};

	// assert.AssertionError instanceof Error
	util.inherits(assert.AssertionError, Error);

	function replacer(key, value) {
	  if (util.isUndefined(value)) {
	    return '' + value;
	  }
	  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
	    return value.toString();
	  }
	  if (util.isFunction(value) || util.isRegExp(value)) {
	    return value.toString();
	  }
	  return value;
	}

	function truncate(s, n) {
	  if (util.isString(s)) {
	    return s.length < n ? s : s.slice(0, n);
	  } else {
	    return s;
	  }
	}

	function getMessage(self) {
	  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
	         self.operator + ' ' +
	         truncate(JSON.stringify(self.expected, replacer), 128);
	}

	// At present only the three keys mentioned above are used and
	// understood by the spec. Implementations or sub modules can pass
	// other keys to the AssertionError's constructor - they will be
	// ignored.

	// 3. All of the following functions must throw an AssertionError
	// when a corresponding condition is not met, with a message that
	// may be undefined if not provided.  All assertion methods provide
	// both the actual and expected values to the assertion error for
	// display purposes.

	function fail(actual, expected, message, operator, stackStartFunction) {
	  throw new assert.AssertionError({
	    message: message,
	    actual: actual,
	    expected: expected,
	    operator: operator,
	    stackStartFunction: stackStartFunction
	  });
	}

	// EXTENSION! allows for well behaved errors defined elsewhere.
	assert.fail = fail;

	// 4. Pure assertion tests whether a value is truthy, as determined
	// by !!guard.
	// assert.ok(guard, message_opt);
	// This statement is equivalent to assert.equal(true, !!guard,
	// message_opt);. To test strictly for the value true, use
	// assert.strictEqual(true, guard, message_opt);.

	function ok(value, message) {
	  if (!value) fail(value, true, message, '==', assert.ok);
	}
	assert.ok = ok;

	// 5. The equality assertion tests shallow, coercive equality with
	// ==.
	// assert.equal(actual, expected, message_opt);

	assert.equal = function equal(actual, expected, message) {
	  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
	};

	// 6. The non-equality assertion tests for whether two objects are not equal
	// with != assert.notEqual(actual, expected, message_opt);

	assert.notEqual = function notEqual(actual, expected, message) {
	  if (actual == expected) {
	    fail(actual, expected, message, '!=', assert.notEqual);
	  }
	};

	// 7. The equivalence assertion tests a deep equality relation.
	// assert.deepEqual(actual, expected, message_opt);

	assert.deepEqual = function deepEqual(actual, expected, message) {
	  if (!_deepEqual(actual, expected)) {
	    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
	  }
	};

	function _deepEqual(actual, expected) {
	  // 7.1. All identical values are equivalent, as determined by ===.
	  if (actual === expected) {
	    return true;

	  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
	    if (actual.length != expected.length) return false;

	    for (var i = 0; i < actual.length; i++) {
	      if (actual[i] !== expected[i]) return false;
	    }

	    return true;

	  // 7.2. If the expected value is a Date object, the actual value is
	  // equivalent if it is also a Date object that refers to the same time.
	  } else if (util.isDate(actual) && util.isDate(expected)) {
	    return actual.getTime() === expected.getTime();

	  // 7.3 If the expected value is a RegExp object, the actual value is
	  // equivalent if it is also a RegExp object with the same source and
	  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
	  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
	    return actual.source === expected.source &&
	           actual.global === expected.global &&
	           actual.multiline === expected.multiline &&
	           actual.lastIndex === expected.lastIndex &&
	           actual.ignoreCase === expected.ignoreCase;

	  // 7.4. Other pairs that do not both pass typeof value == 'object',
	  // equivalence is determined by ==.
	  } else if (!util.isObject(actual) && !util.isObject(expected)) {
	    return actual == expected;

	  // 7.5 For all other Object pairs, including Array objects, equivalence is
	  // determined by having the same number of owned properties (as verified
	  // with Object.prototype.hasOwnProperty.call), the same set of keys
	  // (although not necessarily the same order), equivalent values for every
	  // corresponding key, and an identical 'prototype' property. Note: this
	  // accounts for both named and indexed properties on Arrays.
	  } else {
	    return objEquiv(actual, expected);
	  }
	}

	function isArguments(object) {
	  return Object.prototype.toString.call(object) == '[object Arguments]';
	}

	function objEquiv(a, b) {
	  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
	    return false;
	  // an identical 'prototype' property.
	  if (a.prototype !== b.prototype) return false;
	  //~~~I've managed to break Object.keys through screwy arguments passing.
	  //   Converting to array solves the problem.
	  if (isArguments(a)) {
	    if (!isArguments(b)) {
	      return false;
	    }
	    a = pSlice.call(a);
	    b = pSlice.call(b);
	    return _deepEqual(a, b);
	  }
	  try {
	    var ka = objectKeys(a),
	        kb = objectKeys(b),
	        key, i;
	  } catch (e) {//happens when one is a string literal and the other isn't
	    return false;
	  }
	  // having the same number of owned properties (keys incorporates
	  // hasOwnProperty)
	  if (ka.length != kb.length)
	    return false;
	  //the same set of keys (although not necessarily the same order),
	  ka.sort();
	  kb.sort();
	  //~~~cheap key test
	  for (i = ka.length - 1; i >= 0; i--) {
	    if (ka[i] != kb[i])
	      return false;
	  }
	  //equivalent values for every corresponding key, and
	  //~~~possibly expensive deep test
	  for (i = ka.length - 1; i >= 0; i--) {
	    key = ka[i];
	    if (!_deepEqual(a[key], b[key])) return false;
	  }
	  return true;
	}

	// 8. The non-equivalence assertion tests for any deep inequality.
	// assert.notDeepEqual(actual, expected, message_opt);

	assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
	  if (_deepEqual(actual, expected)) {
	    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
	  }
	};

	// 9. The strict equality assertion tests strict equality, as determined by ===.
	// assert.strictEqual(actual, expected, message_opt);

	assert.strictEqual = function strictEqual(actual, expected, message) {
	  if (actual !== expected) {
	    fail(actual, expected, message, '===', assert.strictEqual);
	  }
	};

	// 10. The strict non-equality assertion tests for strict inequality, as
	// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

	assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
	  if (actual === expected) {
	    fail(actual, expected, message, '!==', assert.notStrictEqual);
	  }
	};

	function expectedException(actual, expected) {
	  if (!actual || !expected) {
	    return false;
	  }

	  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
	    return expected.test(actual);
	  } else if (actual instanceof expected) {
	    return true;
	  } else if (expected.call({}, actual) === true) {
	    return true;
	  }

	  return false;
	}

	function _throws(shouldThrow, block, expected, message) {
	  var actual;

	  if (util.isString(expected)) {
	    message = expected;
	    expected = null;
	  }

	  try {
	    block();
	  } catch (e) {
	    actual = e;
	  }

	  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
	            (message ? ' ' + message : '.');

	  if (shouldThrow && !actual) {
	    fail(actual, expected, 'Missing expected exception' + message);
	  }

	  if (!shouldThrow && expectedException(actual, expected)) {
	    fail(actual, expected, 'Got unwanted exception' + message);
	  }

	  if ((shouldThrow && actual && expected &&
	      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
	    throw actual;
	  }
	}

	// 11. Expected to throw an error:
	// assert.throws(block, Error_opt, message_opt);

	assert.throws = function(block, /*optional*/error, /*optional*/message) {
	  _throws.apply(this, [true].concat(pSlice.call(arguments)));
	};

	// EXTENSION! This is annoying to write outside this module.
	assert.doesNotThrow = function(block, /*optional*/message) {
	  _throws.apply(this, [false].concat(pSlice.call(arguments)));
	};

	assert.ifError = function(err) { if (err) {throw err;}};

	var objectKeys = Object.keys || function (obj) {
	  var keys = [];
	  for (var key in obj) {
	    if (hasOwn.call(obj, key)) keys.push(key);
	  }
	  return keys;
	};

	},{"util/":30}],2:[function(_dereq_,module,exports){
	'use strict';


	var TYPED_OK =  (typeof Uint8Array !== 'undefined') &&
	                (typeof Uint16Array !== 'undefined') &&
	                (typeof Int32Array !== 'undefined');


	exports.assign = function (obj /*from1, from2, from3, ...*/) {
	  var sources = Array.prototype.slice.call(arguments, 1);
	  while (sources.length) {
	    var source = sources.shift();
	    if (!source) { continue; }

	    if (typeof(source) !== 'object') {
	      throw new TypeError(source + 'must be non-object');
	    }

	    for (var p in source) {
	      if (source.hasOwnProperty(p)) {
	        obj[p] = source[p];
	      }
	    }
	  }

	  return obj;
	};


	// reduce buffer size, avoiding mem copy
	exports.shrinkBuf = function (buf, size) {
	  if (buf.length === size) { return buf; }
	  if (buf.subarray) { return buf.subarray(0, size); }
	  buf.length = size;
	  return buf;
	};


	var fnTyped = {
	  arraySet: function (dest, src, src_offs, len, dest_offs) {
	    if (src.subarray && dest.subarray) {
	      dest.set(src.subarray(src_offs, src_offs+len), dest_offs);
	      return;
	    }
	    // Fallback to ordinary array
	    for(var i=0; i<len; i++) {
	      dest[dest_offs + i] = src[src_offs + i];
	    }
	  },
	  // Join array of chunks to single array.
	  flattenChunks: function(chunks) {
	    var i, l, len, pos, chunk, result;

	    // calculate data length
	    len = 0;
	    for (i=0, l=chunks.length; i<l; i++) {
	      len += chunks[i].length;
	    }

	    // join chunks
	    result = new Uint8Array(len);
	    pos = 0;
	    for (i=0, l=chunks.length; i<l; i++) {
	      chunk = chunks[i];
	      result.set(chunk, pos);
	      pos += chunk.length;
	    }

	    return result;
	  }
	};

	var fnUntyped = {
	  arraySet: function (dest, src, src_offs, len, dest_offs) {
	    for(var i=0; i<len; i++) {
	      dest[dest_offs + i] = src[src_offs + i];
	    }
	  },
	  // Join array of chunks to single array.
	  flattenChunks: function(chunks) {
	    return [].concat.apply([], chunks);
	  }
	};


	// Enable/Disable typed arrays use, for testing
	//
	exports.setTyped = function (on) {
	  if (on) {
	    exports.Buf8  = Uint8Array;
	    exports.Buf16 = Uint16Array;
	    exports.Buf32 = Int32Array;
	    exports.assign(exports, fnTyped);
	  } else {
	    exports.Buf8  = Array;
	    exports.Buf16 = Array;
	    exports.Buf32 = Array;
	    exports.assign(exports, fnUntyped);
	  }
	};

	exports.setTyped(TYPED_OK);
	},{}],3:[function(_dereq_,module,exports){
	'use strict';

	// Note: adler32 takes 12% for level 0 and 2% for level 6.
	// It doesn't worth to make additional optimizationa as in original.
	// Small size is preferable.

	function adler32(adler, buf, len, pos) {
	  var s1 = (adler & 0xffff) |0
	    , s2 = ((adler >>> 16) & 0xffff) |0
	    , n = 0;

	  while (len !== 0) {
	    // Set limit ~ twice less than 5552, to keep
	    // s2 in 31-bits, because we force signed ints.
	    // in other case %= will fail.
	    n = len > 2000 ? 2000 : len;
	    len -= n;

	    do {
	      s1 = (s1 + buf[pos++]) |0;
	      s2 = (s2 + s1) |0;
	    } while (--n);

	    s1 %= 65521;
	    s2 %= 65521;
	  }

	  return (s1 | (s2 << 16)) |0;
	}


	module.exports = adler32;
	},{}],4:[function(_dereq_,module,exports){
	module.exports = {

	  /* Allowed flush values; see deflate() and inflate() below for details */
	  Z_NO_FLUSH:         0,
	  Z_PARTIAL_FLUSH:    1,
	  Z_SYNC_FLUSH:       2,
	  Z_FULL_FLUSH:       3,
	  Z_FINISH:           4,
	  Z_BLOCK:            5,
	  Z_TREES:            6,

	  /* Return codes for the compression/decompression functions. Negative values
	  * are errors, positive values are used for special but normal events.
	  */
	  Z_OK:               0,
	  Z_STREAM_END:       1,
	  Z_NEED_DICT:        2,
	  Z_ERRNO:           -1,
	  Z_STREAM_ERROR:    -2,
	  Z_DATA_ERROR:      -3,
	  //Z_MEM_ERROR:     -4,
	  Z_BUF_ERROR:       -5,
	  //Z_VERSION_ERROR: -6,

	  /* compression levels */
	  Z_NO_COMPRESSION:         0,
	  Z_BEST_SPEED:             1,
	  Z_BEST_COMPRESSION:       9,
	  Z_DEFAULT_COMPRESSION:   -1,


	  Z_FILTERED:               1,
	  Z_HUFFMAN_ONLY:           2,
	  Z_RLE:                    3,
	  Z_FIXED:                  4,
	  Z_DEFAULT_STRATEGY:       0,

	  /* Possible values of the data_type field (though see inflate()) */
	  Z_BINARY:                 0,
	  Z_TEXT:                   1,
	  //Z_ASCII:                1, // = Z_TEXT (deprecated)
	  Z_UNKNOWN:                2,

	  /* The deflate compression method */
	  Z_DEFLATED:               8
	  //Z_NULL:                 null // Use -1 or null inline, depending on var type
	};
	},{}],5:[function(_dereq_,module,exports){
	'use strict';

	// Note: we can't get significant speed boost here.
	// So write code to minimize size - no pregenerated tables
	// and array tools dependencies.


	// Use ordinary array, since untyped makes no boost here
	function makeTable() {
	  var c, table = [];

	  for(var n =0; n < 256; n++){
	    c = n;
	    for(var k =0; k < 8; k++){
	      c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
	    }
	    table[n] = c;
	  }

	  return table;
	}

	// Create table on load. Just 255 signed longs. Not a problem.
	var crcTable = makeTable();


	function crc32(crc, buf, len, pos) {
	  var t = crcTable
	    , end = pos + len;

	  crc = crc ^ (-1);

	  for (var i = pos; i < end; i++ ) {
	    crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
	  }

	  return (crc ^ (-1)); // >>> 0;
	}


	module.exports = crc32;
	},{}],6:[function(_dereq_,module,exports){
	'use strict';

	var utils   = _dereq_('../utils/common');
	var trees   = _dereq_('./trees');
	var adler32 = _dereq_('./adler32');
	var crc32   = _dereq_('./crc32');
	var msg   = _dereq_('./messages');

	/* Public constants ==========================================================*/
	/* ===========================================================================*/


	/* Allowed flush values; see deflate() and inflate() below for details */
	var Z_NO_FLUSH      = 0;
	var Z_PARTIAL_FLUSH = 1;
	//var Z_SYNC_FLUSH    = 2;
	var Z_FULL_FLUSH    = 3;
	var Z_FINISH        = 4;
	var Z_BLOCK         = 5;
	//var Z_TREES         = 6;


	/* Return codes for the compression/decompression functions. Negative values
	 * are errors, positive values are used for special but normal events.
	 */
	var Z_OK            = 0;
	var Z_STREAM_END    = 1;
	//var Z_NEED_DICT     = 2;
	//var Z_ERRNO         = -1;
	var Z_STREAM_ERROR  = -2;
	var Z_DATA_ERROR    = -3;
	//var Z_MEM_ERROR     = -4;
	var Z_BUF_ERROR     = -5;
	//var Z_VERSION_ERROR = -6;


	/* compression levels */
	//var Z_NO_COMPRESSION      = 0;
	//var Z_BEST_SPEED          = 1;
	//var Z_BEST_COMPRESSION    = 9;
	var Z_DEFAULT_COMPRESSION = -1;


	var Z_FILTERED            = 1;
	var Z_HUFFMAN_ONLY        = 2;
	var Z_RLE                 = 3;
	var Z_FIXED               = 4;
	var Z_DEFAULT_STRATEGY    = 0;

	/* Possible values of the data_type field (though see inflate()) */
	//var Z_BINARY              = 0;
	//var Z_TEXT                = 1;
	//var Z_ASCII               = 1; // = Z_TEXT
	var Z_UNKNOWN             = 2;


	/* The deflate compression method */
	var Z_DEFLATED  = 8;

	/*============================================================================*/


	var MAX_MEM_LEVEL = 9;
	/* Maximum value for memLevel in deflateInit2 */
	var MAX_WBITS = 15;
	/* 32K LZ77 window */
	var DEF_MEM_LEVEL = 8;


	var LENGTH_CODES  = 29;
	/* number of length codes, not counting the special END_BLOCK code */
	var LITERALS      = 256;
	/* number of literal bytes 0..255 */
	var L_CODES       = LITERALS + 1 + LENGTH_CODES;
	/* number of Literal or Length codes, including the END_BLOCK code */
	var D_CODES       = 30;
	/* number of distance codes */
	var BL_CODES      = 19;
	/* number of codes used to transfer the bit lengths */
	var HEAP_SIZE     = 2*L_CODES + 1;
	/* maximum heap size */
	var MAX_BITS  = 15;
	/* All codes must not exceed MAX_BITS bits */

	var MIN_MATCH = 3;
	var MAX_MATCH = 258;
	var MIN_LOOKAHEAD = (MAX_MATCH + MIN_MATCH + 1);

	var PRESET_DICT = 0x20;

	var INIT_STATE = 42;
	var EXTRA_STATE = 69;
	var NAME_STATE = 73;
	var COMMENT_STATE = 91;
	var HCRC_STATE = 103;
	var BUSY_STATE = 113;
	var FINISH_STATE = 666;

	var BS_NEED_MORE      = 1; /* block not completed, need more input or more output */
	var BS_BLOCK_DONE     = 2; /* block flush performed */
	var BS_FINISH_STARTED = 3; /* finish started, need only more output at next deflate */
	var BS_FINISH_DONE    = 4; /* finish done, accept no more input or output */

	var OS_CODE = 0x03; // Unix :) . Don't detect, use this default.

	function err(strm, errorCode) {
	  strm.msg = msg[errorCode];
	  return errorCode;
	}

	function rank(f) {
	  return ((f) << 1) - ((f) > 4 ? 9 : 0);
	}

	function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }


	/* =========================================================================
	 * Flush as much pending output as possible. All deflate() output goes
	 * through this function so some applications may wish to modify it
	 * to avoid allocating a large strm->output buffer and copying into it.
	 * (See also read_buf()).
	 */
	function flush_pending(strm) {
	  var s = strm.state;

	  //_tr_flush_bits(s);
	  var len = s.pending;
	  if (len > strm.avail_out) {
	    len = strm.avail_out;
	  }
	  if (len === 0) { return; }

	  utils.arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
	  strm.next_out += len;
	  s.pending_out += len;
	  strm.total_out += len;
	  strm.avail_out -= len;
	  s.pending -= len;
	  if (s.pending === 0) {
	    s.pending_out = 0;
	  }
	}


	function flush_block_only (s, last) {
	  trees._tr_flush_block(s, (s.block_start >= 0 ? s.block_start : -1), s.strstart - s.block_start, last);
	  s.block_start = s.strstart;
	  flush_pending(s.strm);
	}


	function put_byte(s, b) {
	  s.pending_buf[s.pending++] = b;
	}


	/* =========================================================================
	 * Put a short in the pending buffer. The 16-bit value is put in MSB order.
	 * IN assertion: the stream state is correct and there is enough room in
	 * pending_buf.
	 */
	function putShortMSB(s, b) {
	//  put_byte(s, (Byte)(b >> 8));
	//  put_byte(s, (Byte)(b & 0xff));
	  s.pending_buf[s.pending++] = (b >>> 8) & 0xff;
	  s.pending_buf[s.pending++] = b & 0xff;
	}


	/* ===========================================================================
	 * Read a new buffer from the current input stream, update the adler32
	 * and total number of bytes read.  All deflate() input goes through
	 * this function so some applications may wish to modify it to avoid
	 * allocating a large strm->input buffer and copying from it.
	 * (See also flush_pending()).
	 */
	function read_buf(strm, buf, start, size) {
	  var len = strm.avail_in;

	  if (len > size) { len = size; }
	  if (len === 0) { return 0; }

	  strm.avail_in -= len;

	  utils.arraySet(buf, strm.input, strm.next_in, len, start);
	  if (strm.state.wrap === 1) {
	    strm.adler = adler32(strm.adler, buf, len, start);
	  }

	  else if (strm.state.wrap === 2) {
	    strm.adler = crc32(strm.adler, buf, len, start);
	  }

	  strm.next_in += len;
	  strm.total_in += len;

	  return len;
	}


	/* ===========================================================================
	 * Set match_start to the longest match starting at the given string and
	 * return its length. Matches shorter or equal to prev_length are discarded,
	 * in which case the result is equal to prev_length and match_start is
	 * garbage.
	 * IN assertions: cur_match is the head of the hash chain for the current
	 *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
	 * OUT assertion: the match length is not greater than s->lookahead.
	 */
	function longest_match(s, cur_match) {
	  var chain_length = s.max_chain_length;      /* max hash chain length */
	  var scan = s.strstart; /* current string */
	  var match;                       /* matched string */
	  var len;                           /* length of current match */
	  var best_len = s.prev_length;              /* best match length so far */
	  var nice_match = s.nice_match;             /* stop if match long enough */
	  var limit = (s.strstart > (s.w_size - MIN_LOOKAHEAD)) ?
	      s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0/*NIL*/;

	  var _win = s.window; // shortcut

	  var wmask = s.w_mask;
	  var prev  = s.prev;

	  /* Stop when cur_match becomes <= limit. To simplify the code,
	   * we prevent matches with the string of window index 0.
	   */

	  var strend = s.strstart + MAX_MATCH;
	  var scan_end1  = _win[scan + best_len - 1];
	  var scan_end   = _win[scan + best_len];

	  /* The code is optimized for HASH_BITS >= 8 and MAX_MATCH-2 multiple of 16.
	   * It is easy to get rid of this optimization if necessary.
	   */
	  // Assert(s->hash_bits >= 8 && MAX_MATCH == 258, "Code too clever");

	  /* Do not waste too much time if we already have a good match: */
	  if (s.prev_length >= s.good_match) {
	    chain_length >>= 2;
	  }
	  /* Do not look for matches beyond the end of the input. This is necessary
	   * to make deflate deterministic.
	   */
	  if (nice_match > s.lookahead) { nice_match = s.lookahead; }

	  // Assert((ulg)s->strstart <= s->window_size-MIN_LOOKAHEAD, "need lookahead");

	  do {
	    // Assert(cur_match < s->strstart, "no future");
	    match = cur_match;

	    /* Skip to next match if the match length cannot increase
	     * or if the match length is less than 2.  Note that the checks below
	     * for insufficient lookahead only occur occasionally for performance
	     * reasons.  Therefore uninitialized memory will be accessed, and
	     * conditional jumps will be made that depend on those values.
	     * However the length of the match is limited to the lookahead, so
	     * the output of deflate is not affected by the uninitialized values.
	     */

	    if (_win[match + best_len]     !== scan_end  ||
	        _win[match + best_len - 1] !== scan_end1 ||
	        _win[match]                !== _win[scan] ||
	        _win[++match]              !== _win[scan + 1]) {
	      continue;
	    }

	    /* The check at best_len-1 can be removed because it will be made
	     * again later. (This heuristic is not always a win.)
	     * It is not necessary to compare scan[2] and match[2] since they
	     * are always equal when the other bytes match, given that
	     * the hash keys are equal and that HASH_BITS >= 8.
	     */
	    scan += 2;
	    match++;
	    // Assert(*scan == *match, "match[2]?");

	    /* We check for insufficient lookahead only every 8th comparison;
	     * the 256th check will be made at strstart+258.
	     */
	    do {
	      /*jshint noempty:false*/
	    } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
	             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
	             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
	             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
	             scan < strend);

	    // Assert(scan <= s->window+(unsigned)(s->window_size-1), "wild scan");

	    len = MAX_MATCH - (strend - scan);
	    scan = strend - MAX_MATCH;

	    if (len > best_len) {
	      s.match_start = cur_match;
	      best_len = len;
	      if (len >= nice_match) {
	        break;
	      }
	      scan_end1  = _win[scan + best_len - 1];
	      scan_end   = _win[scan + best_len];
	    }
	  } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);

	  if (best_len <= s.lookahead) {
	    return best_len;
	  }
	  return s.lookahead;
	}


	/* ===========================================================================
	 * Fill the window when the lookahead becomes insufficient.
	 * Updates strstart and lookahead.
	 *
	 * IN assertion: lookahead < MIN_LOOKAHEAD
	 * OUT assertions: strstart <= window_size-MIN_LOOKAHEAD
	 *    At least one byte has been read, or avail_in == 0; reads are
	 *    performed for at least two bytes (required for the zip translate_eol
	 *    option -- not supported here).
	 */
	function fill_window(s) {
	  var _w_size = s.w_size;
	  var p, n, m, more, str;

	  //Assert(s->lookahead < MIN_LOOKAHEAD, "already enough lookahead");

	  do {
	    more = s.window_size - s.lookahead - s.strstart;

	    // JS ints have 32 bit, block below not needed
	    /* Deal with !@#$% 64K limit: */
	    //if (sizeof(int) <= 2) {
	    //    if (more == 0 && s->strstart == 0 && s->lookahead == 0) {
	    //        more = wsize;
	    //
	    //  } else if (more == (unsigned)(-1)) {
	    //        /* Very unlikely, but possible on 16 bit machine if
	    //         * strstart == 0 && lookahead == 1 (input done a byte at time)
	    //         */
	    //        more--;
	    //    }
	    //}


	    /* If the window is almost full and there is insufficient lookahead,
	     * move the upper half to the lower one to make room in the upper half.
	     */
	    if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {

	      utils.arraySet(s.window, s.window, _w_size, _w_size, 0);
	      s.match_start -= _w_size;
	      s.strstart -= _w_size;
	      /* we now have strstart >= MAX_DIST */
	      s.block_start -= _w_size;

	      /* Slide the hash table (could be avoided with 32 bit values
	       at the expense of memory usage). We slide even when level == 0
	       to keep the hash table consistent if we switch back to level > 0
	       later. (Using level 0 permanently is not an optimal usage of
	       zlib, so we don't care about this pathological case.)
	       */

	      n = s.hash_size;
	      p = n;
	      do {
	        m = s.head[--p];
	        s.head[p] = (m >= _w_size ? m - _w_size : 0);
	      } while (--n);

	      n = _w_size;
	      p = n;
	      do {
	        m = s.prev[--p];
	        s.prev[p] = (m >= _w_size ? m - _w_size : 0);
	        /* If n is not on any hash chain, prev[n] is garbage but
	         * its value will never be used.
	         */
	      } while (--n);

	      more += _w_size;
	    }
	    if (s.strm.avail_in === 0) {
	      break;
	    }

	    /* If there was no sliding:
	     *    strstart <= WSIZE+MAX_DIST-1 && lookahead <= MIN_LOOKAHEAD - 1 &&
	     *    more == window_size - lookahead - strstart
	     * => more >= window_size - (MIN_LOOKAHEAD-1 + WSIZE + MAX_DIST-1)
	     * => more >= window_size - 2*WSIZE + 2
	     * In the BIG_MEM or MMAP case (not yet supported),
	     *   window_size == input_size + MIN_LOOKAHEAD  &&
	     *   strstart + s->lookahead <= input_size => more >= MIN_LOOKAHEAD.
	     * Otherwise, window_size == 2*WSIZE so more >= 2.
	     * If there was sliding, more >= WSIZE. So in all cases, more >= 2.
	     */
	    //Assert(more >= 2, "more < 2");
	    n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
	    s.lookahead += n;

	    /* Initialize the hash value now that we have some input: */
	    if (s.lookahead + s.insert >= MIN_MATCH) {
	      str = s.strstart - s.insert;
	      s.ins_h = s.window[str];

	      /* UPDATE_HASH(s, s->ins_h, s->window[str + 1]); */
	      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + 1]) & s.hash_mask;
	//#if MIN_MATCH != 3
	//        Call update_hash() MIN_MATCH-3 more times
	//#endif
	      while (s.insert) {
	        /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
	        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH-1]) & s.hash_mask;

	        s.prev[str & s.w_mask] = s.head[s.ins_h];
	        s.head[s.ins_h] = str;
	        str++;
	        s.insert--;
	        if (s.lookahead + s.insert < MIN_MATCH) {
	          break;
	        }
	      }
	    }
	    /* If the whole input has less than MIN_MATCH bytes, ins_h is garbage,
	     * but this is not important since only literal bytes will be emitted.
	     */

	  } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);

	  /* If the WIN_INIT bytes after the end of the current data have never been
	   * written, then zero those bytes in order to avoid memory check reports of
	   * the use of uninitialized (or uninitialised as Julian writes) bytes by
	   * the longest match routines.  Update the high water mark for the next
	   * time through here.  WIN_INIT is set to MAX_MATCH since the longest match
	   * routines allow scanning to strstart + MAX_MATCH, ignoring lookahead.
	   */
	//  if (s.high_water < s.window_size) {
	//    var curr = s.strstart + s.lookahead;
	//    var init = 0;
	//
	//    if (s.high_water < curr) {
	//      /* Previous high water mark below current data -- zero WIN_INIT
	//       * bytes or up to end of window, whichever is less.
	//       */
	//      init = s.window_size - curr;
	//      if (init > WIN_INIT)
	//        init = WIN_INIT;
	//      zmemzero(s->window + curr, (unsigned)init);
	//      s->high_water = curr + init;
	//    }
	//    else if (s->high_water < (ulg)curr + WIN_INIT) {
	//      /* High water mark at or above current data, but below current data
	//       * plus WIN_INIT -- zero out to current data plus WIN_INIT, or up
	//       * to end of window, whichever is less.
	//       */
	//      init = (ulg)curr + WIN_INIT - s->high_water;
	//      if (init > s->window_size - s->high_water)
	//        init = s->window_size - s->high_water;
	//      zmemzero(s->window + s->high_water, (unsigned)init);
	//      s->high_water += init;
	//    }
	//  }
	//
	//  Assert((ulg)s->strstart <= s->window_size - MIN_LOOKAHEAD,
	//    "not enough room for search");
	}

	/* ===========================================================================
	 * Copy without compression as much as possible from the input stream, return
	 * the current block state.
	 * This function does not insert new strings in the dictionary since
	 * uncompressible data is probably not useful. This function is used
	 * only for the level=0 compression option.
	 * NOTE: this function should be optimized to avoid extra copying from
	 * window to pending_buf.
	 */
	function deflate_stored(s, flush) {
	  /* Stored blocks are limited to 0xffff bytes, pending_buf is limited
	   * to pending_buf_size, and each stored block has a 5 byte header:
	   */
	  var max_block_size = 0xffff;

	  if (max_block_size > s.pending_buf_size - 5) {
	    max_block_size = s.pending_buf_size - 5;
	  }

	  /* Copy as much as possible from input to output: */
	  for (;;) {
	    /* Fill the window as much as possible: */
	    if (s.lookahead <= 1) {

	      //Assert(s->strstart < s->w_size+MAX_DIST(s) ||
	      //  s->block_start >= (long)s->w_size, "slide too late");
	//      if (!(s.strstart < s.w_size + (s.w_size - MIN_LOOKAHEAD) ||
	//        s.block_start >= s.w_size)) {
	//        throw  new Error("slide too late");
	//      }

	      fill_window(s);
	      if (s.lookahead === 0 && flush === Z_NO_FLUSH) {
	        return BS_NEED_MORE;
	      }

	      if (s.lookahead === 0) {
	        break;
	      }
	      /* flush the current block */
	    }
	    //Assert(s->block_start >= 0L, "block gone");
	//    if (s.block_start < 0) throw new Error("block gone");

	    s.strstart += s.lookahead;
	    s.lookahead = 0;

	    /* Emit a stored block if pending_buf will be full: */
	    var max_start = s.block_start + max_block_size;

	    if (s.strstart === 0 || s.strstart >= max_start) {
	      /* strstart == 0 is possible when wraparound on 16-bit machine */
	      s.lookahead = s.strstart - max_start;
	      s.strstart = max_start;
	      /*** FLUSH_BLOCK(s, 0); ***/
	      flush_block_only(s, false);
	      if (s.strm.avail_out === 0) {
	        return BS_NEED_MORE;
	      }
	      /***/


	    }
	    /* Flush if we may have to slide, otherwise block_start may become
	     * negative and the data will be gone:
	     */
	    if (s.strstart - s.block_start >= (s.w_size - MIN_LOOKAHEAD)) {
	      /*** FLUSH_BLOCK(s, 0); ***/
	      flush_block_only(s, false);
	      if (s.strm.avail_out === 0) {
	        return BS_NEED_MORE;
	      }
	      /***/
	    }
	  }

	  s.insert = 0;

	  if (flush === Z_FINISH) {
	    /*** FLUSH_BLOCK(s, 1); ***/
	    flush_block_only(s, true);
	    if (s.strm.avail_out === 0) {
	      return BS_FINISH_STARTED;
	    }
	    /***/
	    return BS_FINISH_DONE;
	  }

	  if (s.strstart > s.block_start) {
	    /*** FLUSH_BLOCK(s, 0); ***/
	    flush_block_only(s, false);
	    if (s.strm.avail_out === 0) {
	      return BS_NEED_MORE;
	    }
	    /***/
	  }

	  return BS_NEED_MORE;
	}

	/* ===========================================================================
	 * Compress as much as possible from the input stream, return the current
	 * block state.
	 * This function does not perform lazy evaluation of matches and inserts
	 * new strings in the dictionary only for unmatched strings or for short
	 * matches. It is used only for the fast compression options.
	 */
	function deflate_fast(s, flush) {
	  var hash_head;        /* head of the hash chain */
	  var bflush;           /* set if current block must be flushed */

	  for (;;) {
	    /* Make sure that we always have enough lookahead, except
	     * at the end of the input file. We need MAX_MATCH bytes
	     * for the next match, plus MIN_MATCH bytes to insert the
	     * string following the next match.
	     */
	    if (s.lookahead < MIN_LOOKAHEAD) {
	      fill_window(s);
	      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
	        return BS_NEED_MORE;
	      }
	      if (s.lookahead === 0) {
	        break; /* flush the current block */
	      }
	    }

	    /* Insert the string window[strstart .. strstart+2] in the
	     * dictionary, and set hash_head to the head of the hash chain:
	     */
	    hash_head = 0/*NIL*/;
	    if (s.lookahead >= MIN_MATCH) {
	      /*** INSERT_STRING(s, s.strstart, hash_head); ***/
	      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
	      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
	      s.head[s.ins_h] = s.strstart;
	      /***/
	    }

	    /* Find the longest match, discarding those <= prev_length.
	     * At this point we have always match_length < MIN_MATCH
	     */
	    if (hash_head !== 0/*NIL*/ && ((s.strstart - hash_head) <= (s.w_size - MIN_LOOKAHEAD))) {
	      /* To simplify the code, we prevent matches with the string
	       * of window index 0 (in particular we have to avoid a match
	       * of the string with itself at the start of the input file).
	       */
	      s.match_length = longest_match(s, hash_head);
	      /* longest_match() sets match_start */
	    }
	    if (s.match_length >= MIN_MATCH) {
	      // check_match(s, s.strstart, s.match_start, s.match_length); // for debug only

	      /*** _tr_tally_dist(s, s.strstart - s.match_start,
	                     s.match_length - MIN_MATCH, bflush); ***/
	      bflush = trees._tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);

	      s.lookahead -= s.match_length;

	      /* Insert new strings in the hash table only if the match length
	       * is not too large. This saves time but degrades compression.
	       */
	      if (s.match_length <= s.max_lazy_match/*max_insert_length*/ && s.lookahead >= MIN_MATCH) {
	        s.match_length--; /* string at strstart already in table */
	        do {
	          s.strstart++;
	          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
	          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
	          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
	          s.head[s.ins_h] = s.strstart;
	          /***/
	          /* strstart never exceeds WSIZE-MAX_MATCH, so there are
	           * always MIN_MATCH bytes ahead.
	           */
	        } while (--s.match_length !== 0);
	        s.strstart++;
	      } else
	      {
	        s.strstart += s.match_length;
	        s.match_length = 0;
	        s.ins_h = s.window[s.strstart];
	        /* UPDATE_HASH(s, s.ins_h, s.window[s.strstart+1]); */
	        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + 1]) & s.hash_mask;

	//#if MIN_MATCH != 3
	//                Call UPDATE_HASH() MIN_MATCH-3 more times
	//#endif
	        /* If lookahead < MIN_MATCH, ins_h is garbage, but it does not
	         * matter since it will be recomputed at next deflate call.
	         */
	      }
	    } else {
	      /* No match, output a literal byte */
	      //Tracevv((stderr,"%c", s.window[s.strstart]));
	      /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
	      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

	      s.lookahead--;
	      s.strstart++;
	    }
	    if (bflush) {
	      /*** FLUSH_BLOCK(s, 0); ***/
	      flush_block_only(s, false);
	      if (s.strm.avail_out === 0) {
	        return BS_NEED_MORE;
	      }
	      /***/
	    }
	  }
	  s.insert = ((s.strstart < (MIN_MATCH-1)) ? s.strstart : MIN_MATCH-1);
	  if (flush === Z_FINISH) {
	    /*** FLUSH_BLOCK(s, 1); ***/
	    flush_block_only(s, true);
	    if (s.strm.avail_out === 0) {
	      return BS_FINISH_STARTED;
	    }
	    /***/
	    return BS_FINISH_DONE;
	  }
	  if (s.last_lit) {
	    /*** FLUSH_BLOCK(s, 0); ***/
	    flush_block_only(s, false);
	    if (s.strm.avail_out === 0) {
	      return BS_NEED_MORE;
	    }
	    /***/
	  }
	  return BS_BLOCK_DONE;
	}

	/* ===========================================================================
	 * Same as above, but achieves better compression. We use a lazy
	 * evaluation for matches: a match is finally adopted only if there is
	 * no better match at the next window position.
	 */
	function deflate_slow(s, flush) {
	  var hash_head;          /* head of hash chain */
	  var bflush;              /* set if current block must be flushed */

	  var max_insert;

	  /* Process the input block. */
	  for (;;) {
	    /* Make sure that we always have enough lookahead, except
	     * at the end of the input file. We need MAX_MATCH bytes
	     * for the next match, plus MIN_MATCH bytes to insert the
	     * string following the next match.
	     */
	    if (s.lookahead < MIN_LOOKAHEAD) {
	      fill_window(s);
	      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
	        return BS_NEED_MORE;
	      }
	      if (s.lookahead === 0) { break; } /* flush the current block */
	    }

	    /* Insert the string window[strstart .. strstart+2] in the
	     * dictionary, and set hash_head to the head of the hash chain:
	     */
	    hash_head = 0/*NIL*/;
	    if (s.lookahead >= MIN_MATCH) {
	      /*** INSERT_STRING(s, s.strstart, hash_head); ***/
	      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
	      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
	      s.head[s.ins_h] = s.strstart;
	      /***/
	    }

	    /* Find the longest match, discarding those <= prev_length.
	     */
	    s.prev_length = s.match_length;
	    s.prev_match = s.match_start;
	    s.match_length = MIN_MATCH-1;

	    if (hash_head !== 0/*NIL*/ && s.prev_length < s.max_lazy_match &&
	        s.strstart - hash_head <= (s.w_size-MIN_LOOKAHEAD)/*MAX_DIST(s)*/) {
	      /* To simplify the code, we prevent matches with the string
	       * of window index 0 (in particular we have to avoid a match
	       * of the string with itself at the start of the input file).
	       */
	      s.match_length = longest_match(s, hash_head);
	      /* longest_match() sets match_start */

	      if (s.match_length <= 5 &&
	         (s.strategy === Z_FILTERED || (s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096/*TOO_FAR*/))) {

	        /* If prev_match is also MIN_MATCH, match_start is garbage
	         * but we will ignore the current match anyway.
	         */
	        s.match_length = MIN_MATCH-1;
	      }
	    }
	    /* If there was a match at the previous step and the current
	     * match is not better, output the previous match:
	     */
	    if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
	      max_insert = s.strstart + s.lookahead - MIN_MATCH;
	      /* Do not insert strings in hash table beyond this. */

	      //check_match(s, s.strstart-1, s.prev_match, s.prev_length);

	      /***_tr_tally_dist(s, s.strstart - 1 - s.prev_match,
	                     s.prev_length - MIN_MATCH, bflush);***/
	      bflush = trees._tr_tally(s, s.strstart - 1- s.prev_match, s.prev_length - MIN_MATCH);
	      /* Insert in hash table all strings up to the end of the match.
	       * strstart-1 and strstart are already inserted. If there is not
	       * enough lookahead, the last two strings are not inserted in
	       * the hash table.
	       */
	      s.lookahead -= s.prev_length-1;
	      s.prev_length -= 2;
	      do {
	        if (++s.strstart <= max_insert) {
	          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
	          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
	          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
	          s.head[s.ins_h] = s.strstart;
	          /***/
	        }
	      } while (--s.prev_length !== 0);
	      s.match_available = 0;
	      s.match_length = MIN_MATCH-1;
	      s.strstart++;

	      if (bflush) {
	        /*** FLUSH_BLOCK(s, 0); ***/
	        flush_block_only(s, false);
	        if (s.strm.avail_out === 0) {
	          return BS_NEED_MORE;
	        }
	        /***/
	      }

	    } else if (s.match_available) {
	      /* If there was no match at the previous position, output a
	       * single literal. If there was a match but the current match
	       * is longer, truncate the previous match to a single literal.
	       */
	      //Tracevv((stderr,"%c", s->window[s->strstart-1]));
	      /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
	      bflush = trees._tr_tally(s, 0, s.window[s.strstart-1]);

	      if (bflush) {
	        /*** FLUSH_BLOCK_ONLY(s, 0) ***/
	        flush_block_only(s, false);
	        /***/
	      }
	      s.strstart++;
	      s.lookahead--;
	      if (s.strm.avail_out === 0) {
	        return BS_NEED_MORE;
	      }
	    } else {
	      /* There is no previous match to compare with, wait for
	       * the next step to decide.
	       */
	      s.match_available = 1;
	      s.strstart++;
	      s.lookahead--;
	    }
	  }
	  //Assert (flush != Z_NO_FLUSH, "no flush?");
	  if (s.match_available) {
	    //Tracevv((stderr,"%c", s->window[s->strstart-1]));
	    /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
	    bflush = trees._tr_tally(s, 0, s.window[s.strstart-1]);

	    s.match_available = 0;
	  }
	  s.insert = s.strstart < MIN_MATCH-1 ? s.strstart : MIN_MATCH-1;
	  if (flush === Z_FINISH) {
	    /*** FLUSH_BLOCK(s, 1); ***/
	    flush_block_only(s, true);
	    if (s.strm.avail_out === 0) {
	      return BS_FINISH_STARTED;
	    }
	    /***/
	    return BS_FINISH_DONE;
	  }
	  if (s.last_lit) {
	    /*** FLUSH_BLOCK(s, 0); ***/
	    flush_block_only(s, false);
	    if (s.strm.avail_out === 0) {
	      return BS_NEED_MORE;
	    }
	    /***/
	  }

	  return BS_BLOCK_DONE;
	}


	/* ===========================================================================
	 * For Z_RLE, simply look for runs of bytes, generate matches only of distance
	 * one.  Do not maintain a hash table.  (It will be regenerated if this run of
	 * deflate switches away from Z_RLE.)
	 */
	function deflate_rle(s, flush) {
	  var bflush;            /* set if current block must be flushed */
	  var prev;              /* byte at distance one to match */
	  var scan, strend;      /* scan goes up to strend for length of run */

	  var _win = s.window;

	  for (;;) {
	    /* Make sure that we always have enough lookahead, except
	     * at the end of the input file. We need MAX_MATCH bytes
	     * for the longest run, plus one for the unrolled loop.
	     */
	    if (s.lookahead <= MAX_MATCH) {
	      fill_window(s);
	      if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH) {
	        return BS_NEED_MORE;
	      }
	      if (s.lookahead === 0) { break; } /* flush the current block */
	    }

	    /* See how many times the previous byte repeats */
	    s.match_length = 0;
	    if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
	      scan = s.strstart - 1;
	      prev = _win[scan];
	      if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
	        strend = s.strstart + MAX_MATCH;
	        do {
	          /*jshint noempty:false*/
	        } while (prev === _win[++scan] && prev === _win[++scan] &&
	                 prev === _win[++scan] && prev === _win[++scan] &&
	                 prev === _win[++scan] && prev === _win[++scan] &&
	                 prev === _win[++scan] && prev === _win[++scan] &&
	                 scan < strend);
	        s.match_length = MAX_MATCH - (strend - scan);
	        if (s.match_length > s.lookahead) {
	          s.match_length = s.lookahead;
	        }
	      }
	      //Assert(scan <= s->window+(uInt)(s->window_size-1), "wild scan");
	    }

	    /* Emit match if have run of MIN_MATCH or longer, else emit literal */
	    if (s.match_length >= MIN_MATCH) {
	      //check_match(s, s.strstart, s.strstart - 1, s.match_length);

	      /*** _tr_tally_dist(s, 1, s.match_length - MIN_MATCH, bflush); ***/
	      bflush = trees._tr_tally(s, 1, s.match_length - MIN_MATCH);

	      s.lookahead -= s.match_length;
	      s.strstart += s.match_length;
	      s.match_length = 0;
	    } else {
	      /* No match, output a literal byte */
	      //Tracevv((stderr,"%c", s->window[s->strstart]));
	      /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
	      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

	      s.lookahead--;
	      s.strstart++;
	    }
	    if (bflush) {
	      /*** FLUSH_BLOCK(s, 0); ***/
	      flush_block_only(s, false);
	      if (s.strm.avail_out === 0) {
	        return BS_NEED_MORE;
	      }
	      /***/
	    }
	  }
	  s.insert = 0;
	  if (flush === Z_FINISH) {
	    /*** FLUSH_BLOCK(s, 1); ***/
	    flush_block_only(s, true);
	    if (s.strm.avail_out === 0) {
	      return BS_FINISH_STARTED;
	    }
	    /***/
	    return BS_FINISH_DONE;
	  }
	  if (s.last_lit) {
	    /*** FLUSH_BLOCK(s, 0); ***/
	    flush_block_only(s, false);
	    if (s.strm.avail_out === 0) {
	      return BS_NEED_MORE;
	    }
	    /***/
	  }
	  return BS_BLOCK_DONE;
	}

	/* ===========================================================================
	 * For Z_HUFFMAN_ONLY, do not look for matches.  Do not maintain a hash table.
	 * (It will be regenerated if this run of deflate switches away from Huffman.)
	 */
	function deflate_huff(s, flush) {
	  var bflush;             /* set if current block must be flushed */

	  for (;;) {
	    /* Make sure that we have a literal to write. */
	    if (s.lookahead === 0) {
	      fill_window(s);
	      if (s.lookahead === 0) {
	        if (flush === Z_NO_FLUSH) {
	          return BS_NEED_MORE;
	        }
	        break;      /* flush the current block */
	      }
	    }

	    /* Output a literal byte */
	    s.match_length = 0;
	    //Tracevv((stderr,"%c", s->window[s->strstart]));
	    /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
	    bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
	    s.lookahead--;
	    s.strstart++;
	    if (bflush) {
	      /*** FLUSH_BLOCK(s, 0); ***/
	      flush_block_only(s, false);
	      if (s.strm.avail_out === 0) {
	        return BS_NEED_MORE;
	      }
	      /***/
	    }
	  }
	  s.insert = 0;
	  if (flush === Z_FINISH) {
	    /*** FLUSH_BLOCK(s, 1); ***/
	    flush_block_only(s, true);
	    if (s.strm.avail_out === 0) {
	      return BS_FINISH_STARTED;
	    }
	    /***/
	    return BS_FINISH_DONE;
	  }
	  if (s.last_lit) {
	    /*** FLUSH_BLOCK(s, 0); ***/
	    flush_block_only(s, false);
	    if (s.strm.avail_out === 0) {
	      return BS_NEED_MORE;
	    }
	    /***/
	  }
	  return BS_BLOCK_DONE;
	}

	/* Values for max_lazy_match, good_match and max_chain_length, depending on
	 * the desired pack level (0..9). The values given below have been tuned to
	 * exclude worst case performance for pathological files. Better values may be
	 * found for specific files.
	 */
	var Config = function (good_length, max_lazy, nice_length, max_chain, func) {
	  this.good_length = good_length;
	  this.max_lazy = max_lazy;
	  this.nice_length = nice_length;
	  this.max_chain = max_chain;
	  this.func = func;
	};

	var configuration_table;

	configuration_table = [
	  /*      good lazy nice chain */
	  new Config(0, 0, 0, 0, deflate_stored),          /* 0 store only */
	  new Config(4, 4, 8, 4, deflate_fast),            /* 1 max speed, no lazy matches */
	  new Config(4, 5, 16, 8, deflate_fast),           /* 2 */
	  new Config(4, 6, 32, 32, deflate_fast),          /* 3 */

	  new Config(4, 4, 16, 16, deflate_slow),          /* 4 lazy matches */
	  new Config(8, 16, 32, 32, deflate_slow),         /* 5 */
	  new Config(8, 16, 128, 128, deflate_slow),       /* 6 */
	  new Config(8, 32, 128, 256, deflate_slow),       /* 7 */
	  new Config(32, 128, 258, 1024, deflate_slow),    /* 8 */
	  new Config(32, 258, 258, 4096, deflate_slow)     /* 9 max compression */
	];


	/* ===========================================================================
	 * Initialize the "longest match" routines for a new zlib stream
	 */
	function lm_init(s) {
	  s.window_size = 2 * s.w_size;

	  /*** CLEAR_HASH(s); ***/
	  zero(s.head); // Fill with NIL (= 0);

	  /* Set the default configuration parameters:
	   */
	  s.max_lazy_match = configuration_table[s.level].max_lazy;
	  s.good_match = configuration_table[s.level].good_length;
	  s.nice_match = configuration_table[s.level].nice_length;
	  s.max_chain_length = configuration_table[s.level].max_chain;

	  s.strstart = 0;
	  s.block_start = 0;
	  s.lookahead = 0;
	  s.insert = 0;
	  s.match_length = s.prev_length = MIN_MATCH - 1;
	  s.match_available = 0;
	  s.ins_h = 0;
	}


	function DeflateState() {
	  this.strm = null;            /* pointer back to this zlib stream */
	  this.status = 0;            /* as the name implies */
	  this.pending_buf = null;      /* output still pending */
	  this.pending_buf_size = 0;  /* size of pending_buf */
	  this.pending_out = 0;       /* next pending byte to output to the stream */
	  this.pending = 0;           /* nb of bytes in the pending buffer */
	  this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
	  this.gzhead = null;         /* gzip header information to write */
	  this.gzindex = 0;           /* where in extra, name, or comment */
	  this.method = Z_DEFLATED; /* can only be DEFLATED */
	  this.last_flush = -1;   /* value of flush param for previous deflate call */

	  this.w_size = 0;  /* LZ77 window size (32K by default) */
	  this.w_bits = 0;  /* log2(w_size)  (8..16) */
	  this.w_mask = 0;  /* w_size - 1 */

	  this.window = null;
	  /* Sliding window. Input bytes are read into the second half of the window,
	   * and move to the first half later to keep a dictionary of at least wSize
	   * bytes. With this organization, matches are limited to a distance of
	   * wSize-MAX_MATCH bytes, but this ensures that IO is always
	   * performed with a length multiple of the block size.
	   */

	  this.window_size = 0;
	  /* Actual size of window: 2*wSize, except when the user input buffer
	   * is directly used as sliding window.
	   */

	  this.prev = null;
	  /* Link to older string with same hash index. To limit the size of this
	   * array to 64K, this link is maintained only for the last 32K strings.
	   * An index in this array is thus a window index modulo 32K.
	   */

	  this.head = null;   /* Heads of the hash chains or NIL. */

	  this.ins_h = 0;       /* hash index of string to be inserted */
	  this.hash_size = 0;   /* number of elements in hash table */
	  this.hash_bits = 0;   /* log2(hash_size) */
	  this.hash_mask = 0;   /* hash_size-1 */

	  this.hash_shift = 0;
	  /* Number of bits by which ins_h must be shifted at each input
	   * step. It must be such that after MIN_MATCH steps, the oldest
	   * byte no longer takes part in the hash key, that is:
	   *   hash_shift * MIN_MATCH >= hash_bits
	   */

	  this.block_start = 0;
	  /* Window position at the beginning of the current output block. Gets
	   * negative when the window is moved backwards.
	   */

	  this.match_length = 0;      /* length of best match */
	  this.prev_match = 0;        /* previous match */
	  this.match_available = 0;   /* set if previous match exists */
	  this.strstart = 0;          /* start of string to insert */
	  this.match_start = 0;       /* start of matching string */
	  this.lookahead = 0;         /* number of valid bytes ahead in window */

	  this.prev_length = 0;
	  /* Length of the best match at previous step. Matches not greater than this
	   * are discarded. This is used in the lazy match evaluation.
	   */

	  this.max_chain_length = 0;
	  /* To speed up deflation, hash chains are never searched beyond this
	   * length.  A higher limit improves compression ratio but degrades the
	   * speed.
	   */

	  this.max_lazy_match = 0;
	  /* Attempt to find a better match only when the current match is strictly
	   * smaller than this value. This mechanism is used only for compression
	   * levels >= 4.
	   */
	  // That's alias to max_lazy_match, don't use directly
	  //this.max_insert_length = 0;
	  /* Insert new strings in the hash table only if the match length is not
	   * greater than this length. This saves time but degrades compression.
	   * max_insert_length is used only for compression levels <= 3.
	   */

	  this.level = 0;     /* compression level (1..9) */
	  this.strategy = 0;  /* favor or force Huffman coding*/

	  this.good_match = 0;
	  /* Use a faster search when the previous match is longer than this */

	  this.nice_match = 0; /* Stop searching when current match exceeds this */

	              /* used by trees.c: */

	  /* Didn't use ct_data typedef below to suppress compiler warning */

	  // struct ct_data_s dyn_ltree[HEAP_SIZE];   /* literal and length tree */
	  // struct ct_data_s dyn_dtree[2*D_CODES+1]; /* distance tree */
	  // struct ct_data_s bl_tree[2*BL_CODES+1];  /* Huffman tree for bit lengths */

	  // Use flat array of DOUBLE size, with interleaved fata,
	  // because JS does not support effective
	  this.dyn_ltree  = new utils.Buf16(HEAP_SIZE * 2);
	  this.dyn_dtree  = new utils.Buf16((2*D_CODES+1) * 2);
	  this.bl_tree    = new utils.Buf16((2*BL_CODES+1) * 2);
	  zero(this.dyn_ltree);
	  zero(this.dyn_dtree);
	  zero(this.bl_tree);

	  this.l_desc   = null;         /* desc. for literal tree */
	  this.d_desc   = null;         /* desc. for distance tree */
	  this.bl_desc  = null;         /* desc. for bit length tree */

	  //ush bl_count[MAX_BITS+1];
	  this.bl_count = new utils.Buf16(MAX_BITS+1);
	  /* number of codes at each bit length for an optimal tree */

	  //int heap[2*L_CODES+1];      /* heap used to build the Huffman trees */
	  this.heap = new utils.Buf16(2*L_CODES+1);  /* heap used to build the Huffman trees */
	  zero(this.heap);

	  this.heap_len = 0;               /* number of elements in the heap */
	  this.heap_max = 0;               /* element of largest frequency */
	  /* The sons of heap[n] are heap[2*n] and heap[2*n+1]. heap[0] is not used.
	   * The same heap array is used to build all trees.
	   */

	  this.depth = new utils.Buf16(2*L_CODES+1); //uch depth[2*L_CODES+1];
	  zero(this.depth);
	  /* Depth of each subtree used as tie breaker for trees of equal frequency
	   */

	  this.l_buf = 0;          /* buffer index for literals or lengths */

	  this.lit_bufsize = 0;
	  /* Size of match buffer for literals/lengths.  There are 4 reasons for
	   * limiting lit_bufsize to 64K:
	   *   - frequencies can be kept in 16 bit counters
	   *   - if compression is not successful for the first block, all input
	   *     data is still in the window so we can still emit a stored block even
	   *     when input comes from standard input.  (This can also be done for
	   *     all blocks if lit_bufsize is not greater than 32K.)
	   *   - if compression is not successful for a file smaller than 64K, we can
	   *     even emit a stored file instead of a stored block (saving 5 bytes).
	   *     This is applicable only for zip (not gzip or zlib).
	   *   - creating new Huffman trees less frequently may not provide fast
	   *     adaptation to changes in the input data statistics. (Take for
	   *     example a binary file with poorly compressible code followed by
	   *     a highly compressible string table.) Smaller buffer sizes give
	   *     fast adaptation but have of course the overhead of transmitting
	   *     trees more frequently.
	   *   - I can't count above 4
	   */

	  this.last_lit = 0;      /* running index in l_buf */

	  this.d_buf = 0;
	  /* Buffer index for distances. To simplify the code, d_buf and l_buf have
	   * the same number of elements. To use different lengths, an extra flag
	   * array would be necessary.
	   */

	  this.opt_len = 0;       /* bit length of current block with optimal trees */
	  this.static_len = 0;    /* bit length of current block with static trees */
	  this.matches = 0;       /* number of string matches in current block */
	  this.insert = 0;        /* bytes at end of window left to insert */


	  this.bi_buf = 0;
	  /* Output buffer. bits are inserted starting at the bottom (least
	   * significant bits).
	   */
	  this.bi_valid = 0;
	  /* Number of valid bits in bi_buf.  All bits above the last valid bit
	   * are always zero.
	   */

	  // Used for window memory init. We safely ignore it for JS. That makes
	  // sense only for pointers and memory check tools.
	  //this.high_water = 0;
	  /* High water mark offset in window for initialized bytes -- bytes above
	   * this are set to zero in order to avoid memory check warnings when
	   * longest match routines access bytes past the input.  This is then
	   * updated to the new high water mark.
	   */
	}


	function deflateResetKeep(strm) {
	  var s;

	  if (!strm || !strm.state) {
	    return err(strm, Z_STREAM_ERROR);
	  }

	  strm.total_in = strm.total_out = 0;
	  strm.data_type = Z_UNKNOWN;

	  s = strm.state;
	  s.pending = 0;
	  s.pending_out = 0;

	  if (s.wrap < 0) {
	    s.wrap = -s.wrap;
	    /* was made negative by deflate(..., Z_FINISH); */
	  }
	  s.status = (s.wrap ? INIT_STATE : BUSY_STATE);
	  strm.adler = (s.wrap === 2) ?
	    0  // crc32(0, Z_NULL, 0)
	  :
	    1; // adler32(0, Z_NULL, 0)
	  s.last_flush = Z_NO_FLUSH;
	  trees._tr_init(s);
	  return Z_OK;
	}


	function deflateReset(strm) {
	  var ret = deflateResetKeep(strm);
	  if (ret === Z_OK) {
	    lm_init(strm.state);
	  }
	  return ret;
	}


	function deflateSetHeader(strm, head) {
	  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
	  if (strm.state.wrap !== 2) { return Z_STREAM_ERROR; }
	  strm.state.gzhead = head;
	  return Z_OK;
	}


	function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
	  if (!strm) { // === Z_NULL
	    return Z_STREAM_ERROR;
	  }
	  var wrap = 1;

	  if (level === Z_DEFAULT_COMPRESSION) {
	    level = 6;
	  }

	  if (windowBits < 0) { /* suppress zlib wrapper */
	    wrap = 0;
	    windowBits = -windowBits;
	  }

	  else if (windowBits > 15) {
	    wrap = 2;           /* write gzip wrapper instead */
	    windowBits -= 16;
	  }


	  if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED ||
	    windowBits < 8 || windowBits > 15 || level < 0 || level > 9 ||
	    strategy < 0 || strategy > Z_FIXED) {
	    return err(strm, Z_STREAM_ERROR);
	  }


	  if (windowBits === 8) {
	    windowBits = 9;
	  }
	  /* until 256-byte window bug fixed */

	  var s = new DeflateState();

	  strm.state = s;
	  s.strm = strm;

	  s.wrap = wrap;
	  s.gzhead = null;
	  s.w_bits = windowBits;
	  s.w_size = 1 << s.w_bits;
	  s.w_mask = s.w_size - 1;

	  s.hash_bits = memLevel + 7;
	  s.hash_size = 1 << s.hash_bits;
	  s.hash_mask = s.hash_size - 1;
	  s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);

	  s.window = new utils.Buf8(s.w_size * 2);
	  s.head = new utils.Buf16(s.hash_size);
	  s.prev = new utils.Buf16(s.w_size);

	  // Don't need mem init magic for JS.
	  //s.high_water = 0;  /* nothing written to s->window yet */

	  s.lit_bufsize = 1 << (memLevel + 6); /* 16K elements by default */

	  s.pending_buf_size = s.lit_bufsize * 4;
	  s.pending_buf = new utils.Buf8(s.pending_buf_size);

	  s.d_buf = s.lit_bufsize >> 1;
	  s.l_buf = (1 + 2) * s.lit_bufsize;

	  s.level = level;
	  s.strategy = strategy;
	  s.method = method;

	  return deflateReset(strm);
	}

	function deflateInit(strm, level) {
	  return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
	}


	function deflate(strm, flush) {
	  var old_flush, s;
	  var beg, val; // for gzip header write only

	  if (!strm || !strm.state ||
	    flush > Z_BLOCK || flush < 0) {
	    return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
	  }

	  s = strm.state;

	  if (!strm.output ||
	      (!strm.input && strm.avail_in !== 0) ||
	      (s.status === FINISH_STATE && flush !== Z_FINISH)) {
	    return err(strm, (strm.avail_out === 0) ? Z_BUF_ERROR : Z_STREAM_ERROR);
	  }

	  s.strm = strm; /* just in case */
	  old_flush = s.last_flush;
	  s.last_flush = flush;

	  /* Write the header */
	  if (s.status === INIT_STATE) {

	    if (s.wrap === 2) { // GZIP header
	      strm.adler = 0;  //crc32(0L, Z_NULL, 0);
	      put_byte(s, 31);
	      put_byte(s, 139);
	      put_byte(s, 8);
	      if (!s.gzhead) { // s->gzhead == Z_NULL
	        put_byte(s, 0);
	        put_byte(s, 0);
	        put_byte(s, 0);
	        put_byte(s, 0);
	        put_byte(s, 0);
	        put_byte(s, s.level === 9 ? 2 :
	                    (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
	                     4 : 0));
	        put_byte(s, OS_CODE);
	        s.status = BUSY_STATE;
	      }
	      else {
	        put_byte(s, (s.gzhead.text ? 1 : 0) +
	                    (s.gzhead.hcrc ? 2 : 0) +
	                    (!s.gzhead.extra ? 0 : 4) +
	                    (!s.gzhead.name ? 0 : 8) +
	                    (!s.gzhead.comment ? 0 : 16)
	                );
	        put_byte(s, s.gzhead.time & 0xff);
	        put_byte(s, (s.gzhead.time >> 8) & 0xff);
	        put_byte(s, (s.gzhead.time >> 16) & 0xff);
	        put_byte(s, (s.gzhead.time >> 24) & 0xff);
	        put_byte(s, s.level === 9 ? 2 :
	                    (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
	                     4 : 0));
	        put_byte(s, s.gzhead.os & 0xff);
	        if (s.gzhead.extra && s.gzhead.extra.length) {
	          put_byte(s, s.gzhead.extra.length & 0xff);
	          put_byte(s, (s.gzhead.extra.length >> 8) & 0xff);
	        }
	        if (s.gzhead.hcrc) {
	          strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
	        }
	        s.gzindex = 0;
	        s.status = EXTRA_STATE;
	      }
	    }
	    else // DEFLATE header
	    {
	      var header = (Z_DEFLATED + ((s.w_bits - 8) << 4)) << 8;
	      var level_flags = -1;

	      if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
	        level_flags = 0;
	      } else if (s.level < 6) {
	        level_flags = 1;
	      } else if (s.level === 6) {
	        level_flags = 2;
	      } else {
	        level_flags = 3;
	      }
	      header |= (level_flags << 6);
	      if (s.strstart !== 0) { header |= PRESET_DICT; }
	      header += 31 - (header % 31);

	      s.status = BUSY_STATE;
	      putShortMSB(s, header);

	      /* Save the adler32 of the preset dictionary: */
	      if (s.strstart !== 0) {
	        putShortMSB(s, strm.adler >>> 16);
	        putShortMSB(s, strm.adler & 0xffff);
	      }
	      strm.adler = 1; // adler32(0L, Z_NULL, 0);
	    }
	  }

	//#ifdef GZIP
	  if (s.status === EXTRA_STATE) {
	    if (s.gzhead.extra/* != Z_NULL*/) {
	      beg = s.pending;  /* start of bytes to update crc */

	      while (s.gzindex < (s.gzhead.extra.length & 0xffff)) {
	        if (s.pending === s.pending_buf_size) {
	          if (s.gzhead.hcrc && s.pending > beg) {
	            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
	          }
	          flush_pending(strm);
	          beg = s.pending;
	          if (s.pending === s.pending_buf_size) {
	            break;
	          }
	        }
	        put_byte(s, s.gzhead.extra[s.gzindex] & 0xff);
	        s.gzindex++;
	      }
	      if (s.gzhead.hcrc && s.pending > beg) {
	        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
	      }
	      if (s.gzindex === s.gzhead.extra.length) {
	        s.gzindex = 0;
	        s.status = NAME_STATE;
	      }
	    }
	    else {
	      s.status = NAME_STATE;
	    }
	  }
	  if (s.status === NAME_STATE) {
	    if (s.gzhead.name/* != Z_NULL*/) {
	      beg = s.pending;  /* start of bytes to update crc */
	      //int val;

	      do {
	        if (s.pending === s.pending_buf_size) {
	          if (s.gzhead.hcrc && s.pending > beg) {
	            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
	          }
	          flush_pending(strm);
	          beg = s.pending;
	          if (s.pending === s.pending_buf_size) {
	            val = 1;
	            break;
	          }
	        }
	        // JS specific: little magic to add zero terminator to end of string
	        if (s.gzindex < s.gzhead.name.length) {
	          val = s.gzhead.name.charCodeAt(s.gzindex++) & 0xff;
	        } else {
	          val = 0;
	        }
	        put_byte(s, val);
	      } while (val !== 0);

	      if (s.gzhead.hcrc && s.pending > beg){
	        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
	      }
	      if (val === 0) {
	        s.gzindex = 0;
	        s.status = COMMENT_STATE;
	      }
	    }
	    else {
	      s.status = COMMENT_STATE;
	    }
	  }
	  if (s.status === COMMENT_STATE) {
	    if (s.gzhead.comment/* != Z_NULL*/) {
	      beg = s.pending;  /* start of bytes to update crc */
	      //int val;

	      do {
	        if (s.pending === s.pending_buf_size) {
	          if (s.gzhead.hcrc && s.pending > beg) {
	            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
	          }
	          flush_pending(strm);
	          beg = s.pending;
	          if (s.pending === s.pending_buf_size) {
	            val = 1;
	            break;
	          }
	        }
	        // JS specific: little magic to add zero terminator to end of string
	        if (s.gzindex < s.gzhead.comment.length) {
	          val = s.gzhead.comment.charCodeAt(s.gzindex++) & 0xff;
	        } else {
	          val = 0;
	        }
	        put_byte(s, val);
	      } while (val !== 0);

	      if (s.gzhead.hcrc && s.pending > beg) {
	        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
	      }
	      if (val === 0) {
	        s.status = HCRC_STATE;
	      }
	    }
	    else {
	      s.status = HCRC_STATE;
	    }
	  }
	  if (s.status === HCRC_STATE) {
	    if (s.gzhead.hcrc) {
	      if (s.pending + 2 > s.pending_buf_size) {
	        flush_pending(strm);
	      }
	      if (s.pending + 2 <= s.pending_buf_size) {
	        put_byte(s, strm.adler & 0xff);
	        put_byte(s, (strm.adler >> 8) & 0xff);
	        strm.adler = 0; //crc32(0L, Z_NULL, 0);
	        s.status = BUSY_STATE;
	      }
	    }
	    else {
	      s.status = BUSY_STATE;
	    }
	  }
	//#endif

	  /* Flush as much pending output as possible */
	  if (s.pending !== 0) {
	    flush_pending(strm);
	    if (strm.avail_out === 0) {
	      /* Since avail_out is 0, deflate will be called again with
	       * more output space, but possibly with both pending and
	       * avail_in equal to zero. There won't be anything to do,
	       * but this is not an error situation so make sure we
	       * return OK instead of BUF_ERROR at next call of deflate:
	       */
	      s.last_flush = -1;
	      return Z_OK;
	    }

	    /* Make sure there is something to do and avoid duplicate consecutive
	     * flushes. For repeated and useless calls with Z_FINISH, we keep
	     * returning Z_STREAM_END instead of Z_BUF_ERROR.
	     */
	  } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) &&
	    flush !== Z_FINISH) {
	    return err(strm, Z_BUF_ERROR);
	  }

	  /* User must not provide more input after the first FINISH: */
	  if (s.status === FINISH_STATE && strm.avail_in !== 0) {
	    return err(strm, Z_BUF_ERROR);
	  }

	  /* Start a new block or continue the current one.
	   */
	  if (strm.avail_in !== 0 || s.lookahead !== 0 ||
	    (flush !== Z_NO_FLUSH && s.status !== FINISH_STATE)) {
	    var bstate = (s.strategy === Z_HUFFMAN_ONLY) ? deflate_huff(s, flush) :
	      (s.strategy === Z_RLE ? deflate_rle(s, flush) :
	        configuration_table[s.level].func(s, flush));

	    if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
	      s.status = FINISH_STATE;
	    }
	    if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
	      if (strm.avail_out === 0) {
	        s.last_flush = -1;
	        /* avoid BUF_ERROR next call, see above */
	      }
	      return Z_OK;
	      /* If flush != Z_NO_FLUSH && avail_out == 0, the next call
	       * of deflate should use the same flush parameter to make sure
	       * that the flush is complete. So we don't have to output an
	       * empty block here, this will be done at next call. This also
	       * ensures that for a very small output buffer, we emit at most
	       * one empty block.
	       */
	    }
	    if (bstate === BS_BLOCK_DONE) {
	      if (flush === Z_PARTIAL_FLUSH) {
	        trees._tr_align(s);
	      }
	      else if (flush !== Z_BLOCK) { /* FULL_FLUSH or SYNC_FLUSH */

	        trees._tr_stored_block(s, 0, 0, false);
	        /* For a full flush, this empty block will be recognized
	         * as a special marker by inflate_sync().
	         */
	        if (flush === Z_FULL_FLUSH) {
	          /*** CLEAR_HASH(s); ***/             /* forget history */
	          zero(s.head); // Fill with NIL (= 0);

	          if (s.lookahead === 0) {
	            s.strstart = 0;
	            s.block_start = 0;
	            s.insert = 0;
	          }
	        }
	      }
	      flush_pending(strm);
	      if (strm.avail_out === 0) {
	        s.last_flush = -1; /* avoid BUF_ERROR at next call, see above */
	        return Z_OK;
	      }
	    }
	  }
	  //Assert(strm->avail_out > 0, "bug2");
	  //if (strm.avail_out <= 0) { throw new Error("bug2");}

	  if (flush !== Z_FINISH) { return Z_OK; }
	  if (s.wrap <= 0) { return Z_STREAM_END; }

	  /* Write the trailer */
	  if (s.wrap === 2) {
	    put_byte(s, strm.adler & 0xff);
	    put_byte(s, (strm.adler >> 8) & 0xff);
	    put_byte(s, (strm.adler >> 16) & 0xff);
	    put_byte(s, (strm.adler >> 24) & 0xff);
	    put_byte(s, strm.total_in & 0xff);
	    put_byte(s, (strm.total_in >> 8) & 0xff);
	    put_byte(s, (strm.total_in >> 16) & 0xff);
	    put_byte(s, (strm.total_in >> 24) & 0xff);
	  }
	  else
	  {
	    putShortMSB(s, strm.adler >>> 16);
	    putShortMSB(s, strm.adler & 0xffff);
	  }

	  flush_pending(strm);
	  /* If avail_out is zero, the application will call deflate again
	   * to flush the rest.
	   */
	  if (s.wrap > 0) { s.wrap = -s.wrap; }
	  /* write the trailer only once! */
	  return s.pending !== 0 ? Z_OK : Z_STREAM_END;
	}

	function deflateEnd(strm) {
	  var status;

	  if (!strm/*== Z_NULL*/ || !strm.state/*== Z_NULL*/) {
	    return Z_STREAM_ERROR;
	  }

	  status = strm.state.status;
	  if (status !== INIT_STATE &&
	    status !== EXTRA_STATE &&
	    status !== NAME_STATE &&
	    status !== COMMENT_STATE &&
	    status !== HCRC_STATE &&
	    status !== BUSY_STATE &&
	    status !== FINISH_STATE
	  ) {
	    return err(strm, Z_STREAM_ERROR);
	  }

	  strm.state = null;

	  return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
	}

	/* =========================================================================
	 * Copy the source state to the destination state
	 */
	//function deflateCopy(dest, source) {
	//
	//}

	exports.deflateInit = deflateInit;
	exports.deflateInit2 = deflateInit2;
	exports.deflateReset = deflateReset;
	exports.deflateResetKeep = deflateResetKeep;
	exports.deflateSetHeader = deflateSetHeader;
	exports.deflate = deflate;
	exports.deflateEnd = deflateEnd;
	exports.deflateInfo = 'pako deflate (from Nodeca project)';

	/* Not implemented
	exports.deflateBound = deflateBound;
	exports.deflateCopy = deflateCopy;
	exports.deflateSetDictionary = deflateSetDictionary;
	exports.deflateParams = deflateParams;
	exports.deflatePending = deflatePending;
	exports.deflatePrime = deflatePrime;
	exports.deflateTune = deflateTune;
	*/
	},{"../utils/common":2,"./adler32":3,"./crc32":5,"./messages":10,"./trees":11}],7:[function(_dereq_,module,exports){
	'use strict';

	// See state defs from inflate.js
	var BAD = 30;       /* got a data error -- remain here until reset */
	var TYPE = 12;      /* i: waiting for type bits, including last-flag bit */

	/*
	   Decode literal, length, and distance codes and write out the resulting
	   literal and match bytes until either not enough input or output is
	   available, an end-of-block is encountered, or a data error is encountered.
	   When large enough input and output buffers are supplied to inflate(), for
	   example, a 16K input buffer and a 64K output buffer, more than 95% of the
	   inflate execution time is spent in this routine.

	   Entry assumptions:

	        state.mode === LEN
	        strm.avail_in >= 6
	        strm.avail_out >= 258
	        start >= strm.avail_out
	        state.bits < 8

	   On return, state.mode is one of:

	        LEN -- ran out of enough output space or enough available input
	        TYPE -- reached end of block code, inflate() to interpret next block
	        BAD -- error in block data

	   Notes:

	    - The maximum input bits used by a length/distance pair is 15 bits for the
	      length code, 5 bits for the length extra, 15 bits for the distance code,
	      and 13 bits for the distance extra.  This totals 48 bits, or six bytes.
	      Therefore if strm.avail_in >= 6, then there is enough input to avoid
	      checking for available input while decoding.

	    - The maximum bytes that a single length/distance pair can output is 258
	      bytes, which is the maximum length that can be coded.  inflate_fast()
	      requires strm.avail_out >= 258 for each loop to avoid checking for
	      output space.
	 */
	module.exports = function inflate_fast(strm, start) {
	  var state;
	  var _in;                    /* local strm.input */
	  var last;                   /* have enough input while in < last */
	  var _out;                   /* local strm.output */
	  var beg;                    /* inflate()'s initial strm.output */
	  var end;                    /* while out < end, enough space available */
	//#ifdef INFLATE_STRICT
	  var dmax;                   /* maximum distance from zlib header */
	//#endif
	  var wsize;                  /* window size or zero if not using window */
	  var whave;                  /* valid bytes in the window */
	  var wnext;                  /* window write index */
	  var window;                 /* allocated sliding window, if wsize != 0 */
	  var hold;                   /* local strm.hold */
	  var bits;                   /* local strm.bits */
	  var lcode;                  /* local strm.lencode */
	  var dcode;                  /* local strm.distcode */
	  var lmask;                  /* mask for first level of length codes */
	  var dmask;                  /* mask for first level of distance codes */
	  var here;                   /* retrieved table entry */
	  var op;                     /* code bits, operation, extra bits, or */
	                              /*  window position, window bytes to copy */
	  var len;                    /* match length, unused bytes */
	  var dist;                   /* match distance */
	  var from;                   /* where to copy match from */
	  var from_source;


	  var input, output; // JS specific, because we have no pointers

	  /* copy state to local variables */
	  state = strm.state;
	  //here = state.here;
	  _in = strm.next_in;
	  input = strm.input;
	  last = _in + (strm.avail_in - 5);
	  _out = strm.next_out;
	  output = strm.output;
	  beg = _out - (start - strm.avail_out);
	  end = _out + (strm.avail_out - 257);
	//#ifdef INFLATE_STRICT
	  dmax = state.dmax;
	//#endif
	  wsize = state.wsize;
	  whave = state.whave;
	  wnext = state.wnext;
	  window = state.window;
	  hold = state.hold;
	  bits = state.bits;
	  lcode = state.lencode;
	  dcode = state.distcode;
	  lmask = (1 << state.lenbits) - 1;
	  dmask = (1 << state.distbits) - 1;


	  /* decode literals and length/distances until end-of-block or not enough
	     input data or output space */

	  top:
	  do {
	    if (bits < 15) {
	      hold += input[_in++] << bits;
	      bits += 8;
	      hold += input[_in++] << bits;
	      bits += 8;
	    }

	    here = lcode[hold & lmask];

	    dolen:
	    for (;;) { // Goto emulation
	      op = here >>> 24/*here.bits*/;
	      hold >>>= op;
	      bits -= op;
	      op = (here >>> 16) & 0xff/*here.op*/;
	      if (op === 0) {                          /* literal */
	        //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
	        //        "inflate:         literal '%c'\n" :
	        //        "inflate:         literal 0x%02x\n", here.val));
	        output[_out++] = here & 0xffff/*here.val*/;
	      }
	      else if (op & 16) {                     /* length base */
	        len = here & 0xffff/*here.val*/;
	        op &= 15;                           /* number of extra bits */
	        if (op) {
	          if (bits < op) {
	            hold += input[_in++] << bits;
	            bits += 8;
	          }
	          len += hold & ((1 << op) - 1);
	          hold >>>= op;
	          bits -= op;
	        }
	        //Tracevv((stderr, "inflate:         length %u\n", len));
	        if (bits < 15) {
	          hold += input[_in++] << bits;
	          bits += 8;
	          hold += input[_in++] << bits;
	          bits += 8;
	        }
	        here = dcode[hold & dmask];

	        dodist:
	        for (;;) { // goto emulation
	          op = here >>> 24/*here.bits*/;
	          hold >>>= op;
	          bits -= op;
	          op = (here >>> 16) & 0xff/*here.op*/;

	          if (op & 16) {                      /* distance base */
	            dist = here & 0xffff/*here.val*/;
	            op &= 15;                       /* number of extra bits */
	            if (bits < op) {
	              hold += input[_in++] << bits;
	              bits += 8;
	              if (bits < op) {
	                hold += input[_in++] << bits;
	                bits += 8;
	              }
	            }
	            dist += hold & ((1 << op) - 1);
	//#ifdef INFLATE_STRICT
	            if (dist > dmax) {
	              strm.msg = 'invalid distance too far back';
	              state.mode = BAD;
	              break top;
	            }
	//#endif
	            hold >>>= op;
	            bits -= op;
	            //Tracevv((stderr, "inflate:         distance %u\n", dist));
	            op = _out - beg;                /* max distance in output */
	            if (dist > op) {                /* see if copy from window */
	              op = dist - op;               /* distance back in window */
	              if (op > whave) {
	                if (state.sane) {
	                  strm.msg = 'invalid distance too far back';
	                  state.mode = BAD;
	                  break top;
	                }

	// (!) This block is disabled in zlib defailts,
	// don't enable it for binary compatibility
	//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
	//                if (len <= op - whave) {
	//                  do {
	//                    output[_out++] = 0;
	//                  } while (--len);
	//                  continue top;
	//                }
	//                len -= op - whave;
	//                do {
	//                  output[_out++] = 0;
	//                } while (--op > whave);
	//                if (op === 0) {
	//                  from = _out - dist;
	//                  do {
	//                    output[_out++] = output[from++];
	//                  } while (--len);
	//                  continue top;
	//                }
	//#endif
	              }
	              from = 0; // window index
	              from_source = window;
	              if (wnext === 0) {           /* very common case */
	                from += wsize - op;
	                if (op < len) {         /* some from window */
	                  len -= op;
	                  do {
	                    output[_out++] = window[from++];
	                  } while (--op);
	                  from = _out - dist;  /* rest from output */
	                  from_source = output;
	                }
	              }
	              else if (wnext < op) {      /* wrap around window */
	                from += wsize + wnext - op;
	                op -= wnext;
	                if (op < len) {         /* some from end of window */
	                  len -= op;
	                  do {
	                    output[_out++] = window[from++];
	                  } while (--op);
	                  from = 0;
	                  if (wnext < len) {  /* some from start of window */
	                    op = wnext;
	                    len -= op;
	                    do {
	                      output[_out++] = window[from++];
	                    } while (--op);
	                    from = _out - dist;      /* rest from output */
	                    from_source = output;
	                  }
	                }
	              }
	              else {                      /* contiguous in window */
	                from += wnext - op;
	                if (op < len) {         /* some from window */
	                  len -= op;
	                  do {
	                    output[_out++] = window[from++];
	                  } while (--op);
	                  from = _out - dist;  /* rest from output */
	                  from_source = output;
	                }
	              }
	              while (len > 2) {
	                output[_out++] = from_source[from++];
	                output[_out++] = from_source[from++];
	                output[_out++] = from_source[from++];
	                len -= 3;
	              }
	              if (len) {
	                output[_out++] = from_source[from++];
	                if (len > 1) {
	                  output[_out++] = from_source[from++];
	                }
	              }
	            }
	            else {
	              from = _out - dist;          /* copy direct from output */
	              do {                        /* minimum length is three */
	                output[_out++] = output[from++];
	                output[_out++] = output[from++];
	                output[_out++] = output[from++];
	                len -= 3;
	              } while (len > 2);
	              if (len) {
	                output[_out++] = output[from++];
	                if (len > 1) {
	                  output[_out++] = output[from++];
	                }
	              }
	            }
	          }
	          else if ((op & 64) === 0) {          /* 2nd level distance code */
	            here = dcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
	            continue dodist;
	          }
	          else {
	            strm.msg = 'invalid distance code';
	            state.mode = BAD;
	            break top;
	          }

	          break; // need to emulate goto via "continue"
	        }
	      }
	      else if ((op & 64) === 0) {              /* 2nd level length code */
	        here = lcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
	        continue dolen;
	      }
	      else if (op & 32) {                     /* end-of-block */
	        //Tracevv((stderr, "inflate:         end of block\n"));
	        state.mode = TYPE;
	        break top;
	      }
	      else {
	        strm.msg = 'invalid literal/length code';
	        state.mode = BAD;
	        break top;
	      }

	      break; // need to emulate goto via "continue"
	    }
	  } while (_in < last && _out < end);

	  /* return unused bytes (on entry, bits < 8, so in won't go too far back) */
	  len = bits >> 3;
	  _in -= len;
	  bits -= len << 3;
	  hold &= (1 << bits) - 1;

	  /* update state and return */
	  strm.next_in = _in;
	  strm.next_out = _out;
	  strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
	  strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
	  state.hold = hold;
	  state.bits = bits;
	  return;
	};

	},{}],8:[function(_dereq_,module,exports){
	'use strict';


	var utils = _dereq_('../utils/common');
	var adler32 = _dereq_('./adler32');
	var crc32   = _dereq_('./crc32');
	var inflate_fast = _dereq_('./inffast');
	var inflate_table = _dereq_('./inftrees');

	var CODES = 0;
	var LENS = 1;
	var DISTS = 2;

	/* Public constants ==========================================================*/
	/* ===========================================================================*/


	/* Allowed flush values; see deflate() and inflate() below for details */
	//var Z_NO_FLUSH      = 0;
	//var Z_PARTIAL_FLUSH = 1;
	//var Z_SYNC_FLUSH    = 2;
	//var Z_FULL_FLUSH    = 3;
	var Z_FINISH        = 4;
	var Z_BLOCK         = 5;
	var Z_TREES         = 6;


	/* Return codes for the compression/decompression functions. Negative values
	 * are errors, positive values are used for special but normal events.
	 */
	var Z_OK            = 0;
	var Z_STREAM_END    = 1;
	var Z_NEED_DICT     = 2;
	//var Z_ERRNO         = -1;
	var Z_STREAM_ERROR  = -2;
	var Z_DATA_ERROR    = -3;
	var Z_MEM_ERROR     = -4;
	var Z_BUF_ERROR     = -5;
	//var Z_VERSION_ERROR = -6;

	/* The deflate compression method */
	var Z_DEFLATED  = 8;


	/* STATES ====================================================================*/
	/* ===========================================================================*/


	var    HEAD = 1;       /* i: waiting for magic header */
	var    FLAGS = 2;      /* i: waiting for method and flags (gzip) */
	var    TIME = 3;       /* i: waiting for modification time (gzip) */
	var    OS = 4;         /* i: waiting for extra flags and operating system (gzip) */
	var    EXLEN = 5;      /* i: waiting for extra length (gzip) */
	var    EXTRA = 6;      /* i: waiting for extra bytes (gzip) */
	var    NAME = 7;       /* i: waiting for end of file name (gzip) */
	var    COMMENT = 8;    /* i: waiting for end of comment (gzip) */
	var    HCRC = 9;       /* i: waiting for header crc (gzip) */
	var    DICTID = 10;    /* i: waiting for dictionary check value */
	var    DICT = 11;      /* waiting for inflateSetDictionary() call */
	var        TYPE = 12;      /* i: waiting for type bits, including last-flag bit */
	var        TYPEDO = 13;    /* i: same, but skip check to exit inflate on new block */
	var        STORED = 14;    /* i: waiting for stored size (length and complement) */
	var        COPY_ = 15;     /* i/o: same as COPY below, but only first time in */
	var        COPY = 16;      /* i/o: waiting for input or output to copy stored block */
	var        TABLE = 17;     /* i: waiting for dynamic block table lengths */
	var        LENLENS = 18;   /* i: waiting for code length code lengths */
	var        CODELENS = 19;  /* i: waiting for length/lit and distance code lengths */
	var            LEN_ = 20;      /* i: same as LEN below, but only first time in */
	var            LEN = 21;       /* i: waiting for length/lit/eob code */
	var            LENEXT = 22;    /* i: waiting for length extra bits */
	var            DIST = 23;      /* i: waiting for distance code */
	var            DISTEXT = 24;   /* i: waiting for distance extra bits */
	var            MATCH = 25;     /* o: waiting for output space to copy string */
	var            LIT = 26;       /* o: waiting for output space to write literal */
	var    CHECK = 27;     /* i: waiting for 32-bit check value */
	var    LENGTH = 28;    /* i: waiting for 32-bit length (gzip) */
	var    DONE = 29;      /* finished check, done -- remain here until reset */
	var    BAD = 30;       /* got a data error -- remain here until reset */
	var    MEM = 31;       /* got an inflate() memory error -- remain here until reset */
	var    SYNC = 32;      /* looking for synchronization bytes to restart inflate() */

	/* ===========================================================================*/



	var ENOUGH_LENS = 852;
	var ENOUGH_DISTS = 592;
	//var ENOUGH =  (ENOUGH_LENS+ENOUGH_DISTS);

	var MAX_WBITS = 15;
	/* 32K LZ77 window */
	var DEF_WBITS = MAX_WBITS;


	function ZSWAP32(q) {
	  return  (((q >>> 24) & 0xff) +
	          ((q >>> 8) & 0xff00) +
	          ((q & 0xff00) << 8) +
	          ((q & 0xff) << 24));
	}


	function InflateState() {
	  this.mode = 0;             /* current inflate mode */
	  this.last = false;          /* true if processing last block */
	  this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
	  this.havedict = false;      /* true if dictionary provided */
	  this.flags = 0;             /* gzip header method and flags (0 if zlib) */
	  this.dmax = 0;              /* zlib header max distance (INFLATE_STRICT) */
	  this.check = 0;             /* protected copy of check value */
	  this.total = 0;             /* protected copy of output count */
	  // TODO: may be {}
	  this.head = null;           /* where to save gzip header information */

	  /* sliding window */
	  this.wbits = 0;             /* log base 2 of requested window size */
	  this.wsize = 0;             /* window size or zero if not using window */
	  this.whave = 0;             /* valid bytes in the window */
	  this.wnext = 0;             /* window write index */
	  this.window = null;         /* allocated sliding window, if needed */

	  /* bit accumulator */
	  this.hold = 0;              /* input bit accumulator */
	  this.bits = 0;              /* number of bits in "in" */

	  /* for string and stored block copying */
	  this.length = 0;            /* literal or length of data to copy */
	  this.offset = 0;            /* distance back to copy string from */

	  /* for table and code decoding */
	  this.extra = 0;             /* extra bits needed */

	  /* fixed and dynamic code tables */
	  this.lencode = null;          /* starting table for length/literal codes */
	  this.distcode = null;         /* starting table for distance codes */
	  this.lenbits = 0;           /* index bits for lencode */
	  this.distbits = 0;          /* index bits for distcode */

	  /* dynamic table building */
	  this.ncode = 0;             /* number of code length code lengths */
	  this.nlen = 0;              /* number of length code lengths */
	  this.ndist = 0;             /* number of distance code lengths */
	  this.have = 0;              /* number of code lengths in lens[] */
	  this.next = null;              /* next available space in codes[] */

	  this.lens = new utils.Buf16(320); /* temporary storage for code lengths */
	  this.work = new utils.Buf16(288); /* work area for code table building */

	  /*
	   because we don't have pointers in js, we use lencode and distcode directly
	   as buffers so we don't need codes
	  */
	  //this.codes = new utils.Buf32(ENOUGH);       /* space for code tables */
	  this.lendyn = null;              /* dynamic table for length/literal codes (JS specific) */
	  this.distdyn = null;             /* dynamic table for distance codes (JS specific) */
	  this.sane = 0;                   /* if false, allow invalid distance too far */
	  this.back = 0;                   /* bits back of last unprocessed length/lit */
	  this.was = 0;                    /* initial length of match */
	}

	function inflateResetKeep(strm) {
	  var state;

	  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
	  state = strm.state;
	  strm.total_in = strm.total_out = state.total = 0;
	  strm.msg = ''; /*Z_NULL*/
	  if (state.wrap) {       /* to support ill-conceived Java test suite */
	    strm.adler = state.wrap & 1;
	  }
	  state.mode = HEAD;
	  state.last = 0;
	  state.havedict = 0;
	  state.dmax = 32768;
	  state.head = null/*Z_NULL*/;
	  state.hold = 0;
	  state.bits = 0;
	  //state.lencode = state.distcode = state.next = state.codes;
	  state.lencode = state.lendyn = new utils.Buf32(ENOUGH_LENS);
	  state.distcode = state.distdyn = new utils.Buf32(ENOUGH_DISTS);

	  state.sane = 1;
	  state.back = -1;
	  //Tracev((stderr, "inflate: reset\n"));
	  return Z_OK;
	}

	function inflateReset(strm) {
	  var state;

	  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
	  state = strm.state;
	  state.wsize = 0;
	  state.whave = 0;
	  state.wnext = 0;
	  return inflateResetKeep(strm);

	}

	function inflateReset2(strm, windowBits) {
	  var wrap;
	  var state;

	  /* get the state */
	  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
	  state = strm.state;

	  /* extract wrap request from windowBits parameter */
	  if (windowBits < 0) {
	    wrap = 0;
	    windowBits = -windowBits;
	  }
	  else {
	    wrap = (windowBits >> 4) + 1;
	    if (windowBits < 48) {
	      windowBits &= 15;
	    }
	  }

	  /* set number of window bits, free window if different */
	  if (windowBits && (windowBits < 8 || windowBits > 15)) {
	    return Z_STREAM_ERROR;
	  }
	  if (state.window !== null && state.wbits !== windowBits) {
	    state.window = null;
	  }

	  /* update state and reset the rest of it */
	  state.wrap = wrap;
	  state.wbits = windowBits;
	  return inflateReset(strm);
	}

	function inflateInit2(strm, windowBits) {
	  var ret;
	  var state;

	  if (!strm) { return Z_STREAM_ERROR; }
	  //strm.msg = Z_NULL;                 /* in case we return an error */

	  state = new InflateState();

	  //if (state === Z_NULL) return Z_MEM_ERROR;
	  //Tracev((stderr, "inflate: allocated\n"));
	  strm.state = state;
	  state.window = null/*Z_NULL*/;
	  ret = inflateReset2(strm, windowBits);
	  if (ret !== Z_OK) {
	    strm.state = null/*Z_NULL*/;
	  }
	  return ret;
	}

	function inflateInit(strm) {
	  return inflateInit2(strm, DEF_WBITS);
	}


	/*
	 Return state with length and distance decoding tables and index sizes set to
	 fixed code decoding.  Normally this returns fixed tables from inffixed.h.
	 If BUILDFIXED is defined, then instead this routine builds the tables the
	 first time it's called, and returns those tables the first time and
	 thereafter.  This reduces the size of the code by about 2K bytes, in
	 exchange for a little execution time.  However, BUILDFIXED should not be
	 used for threaded applications, since the rewriting of the tables and virgin
	 may not be thread-safe.
	 */
	var virgin = true;

	var lenfix, distfix; // We have no pointers in JS, so keep tables separate

	function fixedtables(state) {
	  /* build fixed huffman tables if first call (may not be thread safe) */
	  if (virgin) {
	    var sym;

	    lenfix = new utils.Buf32(512);
	    distfix = new utils.Buf32(32);

	    /* literal/length table */
	    sym = 0;
	    while (sym < 144) { state.lens[sym++] = 8; }
	    while (sym < 256) { state.lens[sym++] = 9; }
	    while (sym < 280) { state.lens[sym++] = 7; }
	    while (sym < 288) { state.lens[sym++] = 8; }

	    inflate_table(LENS,  state.lens, 0, 288, lenfix,   0, state.work, {bits: 9});

	    /* distance table */
	    sym = 0;
	    while (sym < 32) { state.lens[sym++] = 5; }

	    inflate_table(DISTS, state.lens, 0, 32,   distfix, 0, state.work, {bits: 5});

	    /* do this just once */
	    virgin = false;
	  }

	  state.lencode = lenfix;
	  state.lenbits = 9;
	  state.distcode = distfix;
	  state.distbits = 5;
	}


	/*
	 Update the window with the last wsize (normally 32K) bytes written before
	 returning.  If window does not exist yet, create it.  This is only called
	 when a window is already in use, or when output has been written during this
	 inflate call, but the end of the deflate stream has not been reached yet.
	 It is also called to create a window for dictionary data when a dictionary
	 is loaded.

	 Providing output buffers larger than 32K to inflate() should provide a speed
	 advantage, since only the last 32K of output is copied to the sliding window
	 upon return from inflate(), and since all distances after the first 32K of
	 output will fall in the output data, making match copies simpler and faster.
	 The advantage may be dependent on the size of the processor's data caches.
	 */
	function updatewindow(strm, src, end, copy) {
	  var dist;
	  var state = strm.state;

	  /* if it hasn't been done already, allocate space for the window */
	  if (state.window === null) {
	    state.wsize = 1 << state.wbits;
	    state.wnext = 0;
	    state.whave = 0;

	    state.window = new utils.Buf8(state.wsize);
	  }

	  /* copy state->wsize or less output bytes into the circular window */
	  if (copy >= state.wsize) {
	    utils.arraySet(state.window,src, end - state.wsize, state.wsize, 0);
	    state.wnext = 0;
	    state.whave = state.wsize;
	  }
	  else {
	    dist = state.wsize - state.wnext;
	    if (dist > copy) {
	      dist = copy;
	    }
	    //zmemcpy(state->window + state->wnext, end - copy, dist);
	    utils.arraySet(state.window,src, end - copy, dist, state.wnext);
	    copy -= dist;
	    if (copy) {
	      //zmemcpy(state->window, end - copy, copy);
	      utils.arraySet(state.window,src, end - copy, copy, 0);
	      state.wnext = copy;
	      state.whave = state.wsize;
	    }
	    else {
	      state.wnext += dist;
	      if (state.wnext === state.wsize) { state.wnext = 0; }
	      if (state.whave < state.wsize) { state.whave += dist; }
	    }
	  }
	  return 0;
	}

	function inflate(strm, flush) {
	  var state;
	  var input, output;          // input/output buffers
	  var next;                   /* next input INDEX */
	  var put;                    /* next output INDEX */
	  var have, left;             /* available input and output */
	  var hold;                   /* bit buffer */
	  var bits;                   /* bits in bit buffer */
	  var _in, _out;              /* save starting available input and output */
	  var copy;                   /* number of stored or match bytes to copy */
	  var from;                   /* where to copy match bytes from */
	  var from_source;
	  var here = 0;               /* current decoding table entry */
	  var here_bits, here_op, here_val; // paked "here" denormalized (JS specific)
	  //var last;                   /* parent table entry */
	  var last_bits, last_op, last_val; // paked "last" denormalized (JS specific)
	  var len;                    /* length to copy for repeats, bits to drop */
	  var ret;                    /* return code */
	  var hbuf = new utils.Buf8(4);    /* buffer for gzip header crc calculation */
	  var opts;

	  var n; // temporary var for NEED_BITS

	  var order = /* permutation of code lengths */
	    [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];


	  if (!strm || !strm.state || !strm.output ||
	      (!strm.input && strm.avail_in !== 0)) {
	    return Z_STREAM_ERROR;
	  }

	  state = strm.state;
	  if (state.mode === TYPE) { state.mode = TYPEDO; }    /* skip check */


	  //--- LOAD() ---
	  put = strm.next_out;
	  output = strm.output;
	  left = strm.avail_out;
	  next = strm.next_in;
	  input = strm.input;
	  have = strm.avail_in;
	  hold = state.hold;
	  bits = state.bits;
	  //---

	  _in = have;
	  _out = left;
	  ret = Z_OK;

	  inf_leave: // goto emulation
	  for (;;) {
	    switch (state.mode) {
	    case HEAD:
	      if (state.wrap === 0) {
	        state.mode = TYPEDO;
	        break;
	      }
	      //=== NEEDBITS(16);
	      while (bits < 16) {
	        if (have === 0) { break inf_leave; }
	        have--;
	        hold += input[next++] << bits;
	        bits += 8;
	      }
	      //===//
	      if ((state.wrap & 2) && hold === 0x8b1f) {  /* gzip header */
	        state.check = 0/*crc32(0L, Z_NULL, 0)*/;
	        //=== CRC2(state.check, hold);
	        hbuf[0] = hold & 0xff;
	        hbuf[1] = (hold >>> 8) & 0xff;
	        state.check = crc32(state.check, hbuf, 2, 0);
	        //===//

	        //=== INITBITS();
	        hold = 0;
	        bits = 0;
	        //===//
	        state.mode = FLAGS;
	        break;
	      }
	      state.flags = 0;           /* expect zlib header */
	      if (state.head) {
	        state.head.done = false;
	      }
	      if (!(state.wrap & 1) ||   /* check if zlib header allowed */
	        (((hold & 0xff)/*BITS(8)*/ << 8) + (hold >> 8)) % 31) {
	        strm.msg = 'incorrect header check';
	        state.mode = BAD;
	        break;
	      }
	      if ((hold & 0x0f)/*BITS(4)*/ !== Z_DEFLATED) {
	        strm.msg = 'unknown compression method';
	        state.mode = BAD;
	        break;
	      }
	      //--- DROPBITS(4) ---//
	      hold >>>= 4;
	      bits -= 4;
	      //---//
	      len = (hold & 0x0f)/*BITS(4)*/ + 8;
	      if (state.wbits === 0) {
	        state.wbits = len;
	      }
	      else if (len > state.wbits) {
	        strm.msg = 'invalid window size';
	        state.mode = BAD;
	        break;
	      }
	      state.dmax = 1 << len;
	      //Tracev((stderr, "inflate:   zlib header ok\n"));
	      strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
	      state.mode = hold & 0x200 ? DICTID : TYPE;
	      //=== INITBITS();
	      hold = 0;
	      bits = 0;
	      //===//
	      break;
	    case FLAGS:
	      //=== NEEDBITS(16); */
	      while (bits < 16) {
	        if (have === 0) { break inf_leave; }
	        have--;
	        hold += input[next++] << bits;
	        bits += 8;
	      }
	      //===//
	      state.flags = hold;
	      if ((state.flags & 0xff) !== Z_DEFLATED) {
	        strm.msg = 'unknown compression method';
	        state.mode = BAD;
	        break;
	      }
	      if (state.flags & 0xe000) {
	        strm.msg = 'unknown header flags set';
	        state.mode = BAD;
	        break;
	      }
	      if (state.head) {
	        state.head.text = ((hold >> 8) & 1);
	      }
	      if (state.flags & 0x0200) {
	        //=== CRC2(state.check, hold);
	        hbuf[0] = hold & 0xff;
	        hbuf[1] = (hold >>> 8) & 0xff;
	        state.check = crc32(state.check, hbuf, 2, 0);
	        //===//
	      }
	      //=== INITBITS();
	      hold = 0;
	      bits = 0;
	      //===//
	      state.mode = TIME;
	      /* falls through */
	    case TIME:
	      //=== NEEDBITS(32); */
	      while (bits < 32) {
	        if (have === 0) { break inf_leave; }
	        have--;
	        hold += input[next++] << bits;
	        bits += 8;
	      }
	      //===//
	      if (state.head) {
	        state.head.time = hold;
	      }
	      if (state.flags & 0x0200) {
	        //=== CRC4(state.check, hold)
	        hbuf[0] = hold & 0xff;
	        hbuf[1] = (hold >>> 8) & 0xff;
	        hbuf[2] = (hold >>> 16) & 0xff;
	        hbuf[3] = (hold >>> 24) & 0xff;
	        state.check = crc32(state.check, hbuf, 4, 0);
	        //===
	      }
	      //=== INITBITS();
	      hold = 0;
	      bits = 0;
	      //===//
	      state.mode = OS;
	      /* falls through */
	    case OS:
	      //=== NEEDBITS(16); */
	      while (bits < 16) {
	        if (have === 0) { break inf_leave; }
	        have--;
	        hold += input[next++] << bits;
	        bits += 8;
	      }
	      //===//
	      if (state.head) {
	        state.head.xflags = (hold & 0xff);
	        state.head.os = (hold >> 8);
	      }
	      if (state.flags & 0x0200) {
	        //=== CRC2(state.check, hold);
	        hbuf[0] = hold & 0xff;
	        hbuf[1] = (hold >>> 8) & 0xff;
	        state.check = crc32(state.check, hbuf, 2, 0);
	        //===//
	      }
	      //=== INITBITS();
	      hold = 0;
	      bits = 0;
	      //===//
	      state.mode = EXLEN;
	      /* falls through */
	    case EXLEN:
	      if (state.flags & 0x0400) {
	        //=== NEEDBITS(16); */
	        while (bits < 16) {
	          if (have === 0) { break inf_leave; }
	          have--;
	          hold += input[next++] << bits;
	          bits += 8;
	        }
	        //===//
	        state.length = hold;
	        if (state.head) {
	          state.head.extra_len = hold;
	        }
	        if (state.flags & 0x0200) {
	          //=== CRC2(state.check, hold);
	          hbuf[0] = hold & 0xff;
	          hbuf[1] = (hold >>> 8) & 0xff;
	          state.check = crc32(state.check, hbuf, 2, 0);
	          //===//
	        }
	        //=== INITBITS();
	        hold = 0;
	        bits = 0;
	        //===//
	      }
	      else if (state.head) {
	        state.head.extra = null/*Z_NULL*/;
	      }
	      state.mode = EXTRA;
	      /* falls through */
	    case EXTRA:
	      if (state.flags & 0x0400) {
	        copy = state.length;
	        if (copy > have) { copy = have; }
	        if (copy) {
	          if (state.head) {
	            len = state.head.extra_len - state.length;
	            if (!state.head.extra) {
	              // Use untyped array for more conveniend processing later
	              state.head.extra = new Array(state.head.extra_len);
	            }
	            utils.arraySet(
	              state.head.extra,
	              input,
	              next,
	              // extra field is limited to 65536 bytes
	              // - no need for additional size check
	              copy,
	              /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
	              len
	            );
	            //zmemcpy(state.head.extra + len, next,
	            //        len + copy > state.head.extra_max ?
	            //        state.head.extra_max - len : copy);
	          }
	          if (state.flags & 0x0200) {
	            state.check = crc32(state.check, input, copy, next);
	          }
	          have -= copy;
	          next += copy;
	          state.length -= copy;
	        }
	        if (state.length) { break inf_leave; }
	      }
	      state.length = 0;
	      state.mode = NAME;
	      /* falls through */
	    case NAME:
	      if (state.flags & 0x0800) {
	        if (have === 0) { break inf_leave; }
	        copy = 0;
	        do {
	          // TODO: 2 or 1 bytes?
	          len = input[next + copy++];
	          /* use constant limit because in js we should not preallocate memory */
	          if (state.head && len &&
	              (state.length < 65536 /*state.head.name_max*/)) {
	            state.head.name += String.fromCharCode(len);
	          }
	        } while (len && copy < have);

	        if (state.flags & 0x0200) {
	          state.check = crc32(state.check, input, copy, next);
	        }
	        have -= copy;
	        next += copy;
	        if (len) { break inf_leave; }
	      }
	      else if (state.head) {
	        state.head.name = null;
	      }
	      state.length = 0;
	      state.mode = COMMENT;
	      /* falls through */
	    case COMMENT:
	      if (state.flags & 0x1000) {
	        if (have === 0) { break inf_leave; }
	        copy = 0;
	        do {
	          len = input[next + copy++];
	          /* use constant limit because in js we should not preallocate memory */
	          if (state.head && len &&
	              (state.length < 65536 /*state.head.comm_max*/)) {
	            state.head.comment += String.fromCharCode(len);
	          }
	        } while (len && copy < have);
	        if (state.flags & 0x0200) {
	          state.check = crc32(state.check, input, copy, next);
	        }
	        have -= copy;
	        next += copy;
	        if (len) { break inf_leave; }
	      }
	      else if (state.head) {
	        state.head.comment = null;
	      }
	      state.mode = HCRC;
	      /* falls through */
	    case HCRC:
	      if (state.flags & 0x0200) {
	        //=== NEEDBITS(16); */
	        while (bits < 16) {
	          if (have === 0) { break inf_leave; }
	          have--;
	          hold += input[next++] << bits;
	          bits += 8;
	        }
	        //===//
	        if (hold !== (state.check & 0xffff)) {
	          strm.msg = 'header crc mismatch';
	          state.mode = BAD;
	          break;
	        }
	        //=== INITBITS();
	        hold = 0;
	        bits = 0;
	        //===//
	      }
	      if (state.head) {
	        state.head.hcrc = ((state.flags >> 9) & 1);
	        state.head.done = true;
	      }
	      strm.adler = state.check = 0 /*crc32(0L, Z_NULL, 0)*/;
	      state.mode = TYPE;
	      break;
	    case DICTID:
	      //=== NEEDBITS(32); */
	      while (bits < 32) {
	        if (have === 0) { break inf_leave; }
	        have--;
	        hold += input[next++] << bits;
	        bits += 8;
	      }
	      //===//
	      strm.adler = state.check = ZSWAP32(hold);
	      //=== INITBITS();
	      hold = 0;
	      bits = 0;
	      //===//
	      state.mode = DICT;
	      /* falls through */
	    case DICT:
	      if (state.havedict === 0) {
	        //--- RESTORE() ---
	        strm.next_out = put;
	        strm.avail_out = left;
	        strm.next_in = next;
	        strm.avail_in = have;
	        state.hold = hold;
	        state.bits = bits;
	        //---
	        return Z_NEED_DICT;
	      }
	      strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
	      state.mode = TYPE;
	      /* falls through */
	    case TYPE:
	      if (flush === Z_BLOCK || flush === Z_TREES) { break inf_leave; }
	      /* falls through */
	    case TYPEDO:
	      if (state.last) {
	        //--- BYTEBITS() ---//
	        hold >>>= bits & 7;
	        bits -= bits & 7;
	        //---//
	        state.mode = CHECK;
	        break;
	      }
	      //=== NEEDBITS(3); */
	      while (bits < 3) {
	        if (have === 0) { break inf_leave; }
	        have--;
	        hold += input[next++] << bits;
	        bits += 8;
	      }
	      //===//
	      state.last = (hold & 0x01)/*BITS(1)*/;
	      //--- DROPBITS(1) ---//
	      hold >>>= 1;
	      bits -= 1;
	      //---//

	      switch ((hold & 0x03)/*BITS(2)*/) {
	      case 0:                             /* stored block */
	        //Tracev((stderr, "inflate:     stored block%s\n",
	        //        state.last ? " (last)" : ""));
	        state.mode = STORED;
	        break;
	      case 1:                             /* fixed block */
	        fixedtables(state);
	        //Tracev((stderr, "inflate:     fixed codes block%s\n",
	        //        state.last ? " (last)" : ""));
	        state.mode = LEN_;             /* decode codes */
	        if (flush === Z_TREES) {
	          //--- DROPBITS(2) ---//
	          hold >>>= 2;
	          bits -= 2;
	          //---//
	          break inf_leave;
	        }
	        break;
	      case 2:                             /* dynamic block */
	        //Tracev((stderr, "inflate:     dynamic codes block%s\n",
	        //        state.last ? " (last)" : ""));
	        state.mode = TABLE;
	        break;
	      case 3:
	        strm.msg = 'invalid block type';
	        state.mode = BAD;
	      }
	      //--- DROPBITS(2) ---//
	      hold >>>= 2;
	      bits -= 2;
	      //---//
	      break;
	    case STORED:
	      //--- BYTEBITS() ---// /* go to byte boundary */
	      hold >>>= bits & 7;
	      bits -= bits & 7;
	      //---//
	      //=== NEEDBITS(32); */
	      while (bits < 32) {
	        if (have === 0) { break inf_leave; }
	        have--;
	        hold += input[next++] << bits;
	        bits += 8;
	      }
	      //===//
	      if ((hold & 0xffff) !== ((hold >>> 16) ^ 0xffff)) {
	        strm.msg = 'invalid stored block lengths';
	        state.mode = BAD;
	        break;
	      }
	      state.length = hold & 0xffff;
	      //Tracev((stderr, "inflate:       stored length %u\n",
	      //        state.length));
	      //=== INITBITS();
	      hold = 0;
	      bits = 0;
	      //===//
	      state.mode = COPY_;
	      if (flush === Z_TREES) { break inf_leave; }
	      /* falls through */
	    case COPY_:
	      state.mode = COPY;
	      /* falls through */
	    case COPY:
	      copy = state.length;
	      if (copy) {
	        if (copy > have) { copy = have; }
	        if (copy > left) { copy = left; }
	        if (copy === 0) { break inf_leave; }
	        //--- zmemcpy(put, next, copy); ---
	        utils.arraySet(output, input, next, copy, put);
	        //---//
	        have -= copy;
	        next += copy;
	        left -= copy;
	        put += copy;
	        state.length -= copy;
	        break;
	      }
	      //Tracev((stderr, "inflate:       stored end\n"));
	      state.mode = TYPE;
	      break;
	    case TABLE:
	      //=== NEEDBITS(14); */
	      while (bits < 14) {
	        if (have === 0) { break inf_leave; }
	        have--;
	        hold += input[next++] << bits;
	        bits += 8;
	      }
	      //===//
	      state.nlen = (hold & 0x1f)/*BITS(5)*/ + 257;
	      //--- DROPBITS(5) ---//
	      hold >>>= 5;
	      bits -= 5;
	      //---//
	      state.ndist = (hold & 0x1f)/*BITS(5)*/ + 1;
	      //--- DROPBITS(5) ---//
	      hold >>>= 5;
	      bits -= 5;
	      //---//
	      state.ncode = (hold & 0x0f)/*BITS(4)*/ + 4;
	      //--- DROPBITS(4) ---//
	      hold >>>= 4;
	      bits -= 4;
	      //---//
	//#ifndef PKZIP_BUG_WORKAROUND
	      if (state.nlen > 286 || state.ndist > 30) {
	        strm.msg = 'too many length or distance symbols';
	        state.mode = BAD;
	        break;
	      }
	//#endif
	      //Tracev((stderr, "inflate:       table sizes ok\n"));
	      state.have = 0;
	      state.mode = LENLENS;
	      /* falls through */
	    case LENLENS:
	      while (state.have < state.ncode) {
	        //=== NEEDBITS(3);
	        while (bits < 3) {
	          if (have === 0) { break inf_leave; }
	          have--;
	          hold += input[next++] << bits;
	          bits += 8;
	        }
	        //===//
	        state.lens[order[state.have++]] = (hold & 0x07);//BITS(3);
	        //--- DROPBITS(3) ---//
	        hold >>>= 3;
	        bits -= 3;
	        //---//
	      }
	      while (state.have < 19) {
	        state.lens[order[state.have++]] = 0;
	      }
	      // We have separate tables & no pointers. 2 commented lines below not needed.
	      //state.next = state.codes;
	      //state.lencode = state.next;
	      // Switch to use dynamic table
	      state.lencode = state.lendyn;
	      state.lenbits = 7;

	      opts = {bits: state.lenbits};
	      ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
	      state.lenbits = opts.bits;

	      if (ret) {
	        strm.msg = 'invalid code lengths set';
	        state.mode = BAD;
	        break;
	      }
	      //Tracev((stderr, "inflate:       code lengths ok\n"));
	      state.have = 0;
	      state.mode = CODELENS;
	      /* falls through */
	    case CODELENS:
	      while (state.have < state.nlen + state.ndist) {
	        for (;;) {
	          here = state.lencode[hold & ((1 << state.lenbits) - 1)];/*BITS(state.lenbits)*/
	          here_bits = here >>> 24;
	          here_op = (here >>> 16) & 0xff;
	          here_val = here & 0xffff;

	          if ((here_bits) <= bits) { break; }
	          //--- PULLBYTE() ---//
	          if (have === 0) { break inf_leave; }
	          have--;
	          hold += input[next++] << bits;
	          bits += 8;
	          //---//
	        }
	        if (here_val < 16) {
	          //--- DROPBITS(here.bits) ---//
	          hold >>>= here_bits;
	          bits -= here_bits;
	          //---//
	          state.lens[state.have++] = here_val;
	        }
	        else {
	          if (here_val === 16) {
	            //=== NEEDBITS(here.bits + 2);
	            n = here_bits + 2;
	            while (bits < n) {
	              if (have === 0) { break inf_leave; }
	              have--;
	              hold += input[next++] << bits;
	              bits += 8;
	            }
	            //===//
	            //--- DROPBITS(here.bits) ---//
	            hold >>>= here_bits;
	            bits -= here_bits;
	            //---//
	            if (state.have === 0) {
	              strm.msg = 'invalid bit length repeat';
	              state.mode = BAD;
	              break;
	            }
	            len = state.lens[state.have - 1];
	            copy = 3 + (hold & 0x03);//BITS(2);
	            //--- DROPBITS(2) ---//
	            hold >>>= 2;
	            bits -= 2;
	            //---//
	          }
	          else if (here_val === 17) {
	            //=== NEEDBITS(here.bits + 3);
	            n = here_bits + 3;
	            while (bits < n) {
	              if (have === 0) { break inf_leave; }
	              have--;
	              hold += input[next++] << bits;
	              bits += 8;
	            }
	            //===//
	            //--- DROPBITS(here.bits) ---//
	            hold >>>= here_bits;
	            bits -= here_bits;
	            //---//
	            len = 0;
	            copy = 3 + (hold & 0x07);//BITS(3);
	            //--- DROPBITS(3) ---//
	            hold >>>= 3;
	            bits -= 3;
	            //---//
	          }
	          else {
	            //=== NEEDBITS(here.bits + 7);
	            n = here_bits + 7;
	            while (bits < n) {
	              if (have === 0) { break inf_leave; }
	              have--;
	              hold += input[next++] << bits;
	              bits += 8;
	            }
	            //===//
	            //--- DROPBITS(here.bits) ---//
	            hold >>>= here_bits;
	            bits -= here_bits;
	            //---//
	            len = 0;
	            copy = 11 + (hold & 0x7f);//BITS(7);
	            //--- DROPBITS(7) ---//
	            hold >>>= 7;
	            bits -= 7;
	            //---//
	          }
	          if (state.have + copy > state.nlen + state.ndist) {
	            strm.msg = 'invalid bit length repeat';
	            state.mode = BAD;
	            break;
	          }
	          while (copy--) {
	            state.lens[state.have++] = len;
	          }
	        }
	      }

	      /* handle error breaks in while */
	      if (state.mode === BAD) { break; }

	      /* check for end-of-block code (better have one) */
	      if (state.lens[256] === 0) {
	        strm.msg = 'invalid code -- missing end-of-block';
	        state.mode = BAD;
	        break;
	      }

	      /* build code tables -- note: do not change the lenbits or distbits
	         values here (9 and 6) without reading the comments in inftrees.h
	         concerning the ENOUGH constants, which depend on those values */
	      state.lenbits = 9;

	      opts = {bits: state.lenbits};
	      ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
	      // We have separate tables & no pointers. 2 commented lines below not needed.
	      // state.next_index = opts.table_index;
	      state.lenbits = opts.bits;
	      // state.lencode = state.next;

	      if (ret) {
	        strm.msg = 'invalid literal/lengths set';
	        state.mode = BAD;
	        break;
	      }

	      state.distbits = 6;
	      //state.distcode.copy(state.codes);
	      // Switch to use dynamic table
	      state.distcode = state.distdyn;
	      opts = {bits: state.distbits};
	      ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
	      // We have separate tables & no pointers. 2 commented lines below not needed.
	      // state.next_index = opts.table_index;
	      state.distbits = opts.bits;
	      // state.distcode = state.next;

	      if (ret) {
	        strm.msg = 'invalid distances set';
	        state.mode = BAD;
	        break;
	      }
	      //Tracev((stderr, 'inflate:       codes ok\n'));
	      state.mode = LEN_;
	      if (flush === Z_TREES) { break inf_leave; }
	      /* falls through */
	    case LEN_:
	      state.mode = LEN;
	      /* falls through */
	    case LEN:
	      if (have >= 6 && left >= 258) {
	        //--- RESTORE() ---
	        strm.next_out = put;
	        strm.avail_out = left;
	        strm.next_in = next;
	        strm.avail_in = have;
	        state.hold = hold;
	        state.bits = bits;
	        //---
	        inflate_fast(strm, _out);
	        //--- LOAD() ---
	        put = strm.next_out;
	        output = strm.output;
	        left = strm.avail_out;
	        next = strm.next_in;
	        input = strm.input;
	        have = strm.avail_in;
	        hold = state.hold;
	        bits = state.bits;
	        //---

	        if (state.mode === TYPE) {
	          state.back = -1;
	        }
	        break;
	      }
	      state.back = 0;
	      for (;;) {
	        here = state.lencode[hold & ((1 << state.lenbits) -1)];  /*BITS(state.lenbits)*/
	        here_bits = here >>> 24;
	        here_op = (here >>> 16) & 0xff;
	        here_val = here & 0xffff;

	        if (here_bits <= bits) { break; }
	        //--- PULLBYTE() ---//
	        if (have === 0) { break inf_leave; }
	        have--;
	        hold += input[next++] << bits;
	        bits += 8;
	        //---//
	      }
	      if (here_op && (here_op & 0xf0) === 0) {
	        last_bits = here_bits;
	        last_op = here_op;
	        last_val = here_val;
	        for (;;) {
	          here = state.lencode[last_val +
	                  ((hold & ((1 << (last_bits + last_op)) -1))/*BITS(last.bits + last.op)*/ >> last_bits)];
	          here_bits = here >>> 24;
	          here_op = (here >>> 16) & 0xff;
	          here_val = here & 0xffff;

	          if ((last_bits + here_bits) <= bits) { break; }
	          //--- PULLBYTE() ---//
	          if (have === 0) { break inf_leave; }
	          have--;
	          hold += input[next++] << bits;
	          bits += 8;
	          //---//
	        }
	        //--- DROPBITS(last.bits) ---//
	        hold >>>= last_bits;
	        bits -= last_bits;
	        //---//
	        state.back += last_bits;
	      }
	      //--- DROPBITS(here.bits) ---//
	      hold >>>= here_bits;
	      bits -= here_bits;
	      //---//
	      state.back += here_bits;
	      state.length = here_val;
	      if (here_op === 0) {
	        //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
	        //        "inflate:         literal '%c'\n" :
	        //        "inflate:         literal 0x%02x\n", here.val));
	        state.mode = LIT;
	        break;
	      }
	      if (here_op & 32) {
	        //Tracevv((stderr, "inflate:         end of block\n"));
	        state.back = -1;
	        state.mode = TYPE;
	        break;
	      }
	      if (here_op & 64) {
	        strm.msg = 'invalid literal/length code';
	        state.mode = BAD;
	        break;
	      }
	      state.extra = here_op & 15;
	      state.mode = LENEXT;
	      /* falls through */
	    case LENEXT:
	      if (state.extra) {
	        //=== NEEDBITS(state.extra);
	        n = state.extra;
	        while (bits < n) {
	          if (have === 0) { break inf_leave; }
	          have--;
	          hold += input[next++] << bits;
	          bits += 8;
	        }
	        //===//
	        state.length += hold & ((1 << state.extra) -1)/*BITS(state.extra)*/;
	        //--- DROPBITS(state.extra) ---//
	        hold >>>= state.extra;
	        bits -= state.extra;
	        //---//
	        state.back += state.extra;
	      }
	      //Tracevv((stderr, "inflate:         length %u\n", state.length));
	      state.was = state.length;
	      state.mode = DIST;
	      /* falls through */
	    case DIST:
	      for (;;) {
	        here = state.distcode[hold & ((1 << state.distbits) -1)];/*BITS(state.distbits)*/
	        here_bits = here >>> 24;
	        here_op = (here >>> 16) & 0xff;
	        here_val = here & 0xffff;

	        if ((here_bits) <= bits) { break; }
	        //--- PULLBYTE() ---//
	        if (have === 0) { break inf_leave; }
	        have--;
	        hold += input[next++] << bits;
	        bits += 8;
	        //---//
	      }
	      if ((here_op & 0xf0) === 0) {
	        last_bits = here_bits;
	        last_op = here_op;
	        last_val = here_val;
	        for (;;) {
	          here = state.distcode[last_val +
	                  ((hold & ((1 << (last_bits + last_op)) -1))/*BITS(last.bits + last.op)*/ >> last_bits)];
	          here_bits = here >>> 24;
	          here_op = (here >>> 16) & 0xff;
	          here_val = here & 0xffff;

	          if ((last_bits + here_bits) <= bits) { break; }
	          //--- PULLBYTE() ---//
	          if (have === 0) { break inf_leave; }
	          have--;
	          hold += input[next++] << bits;
	          bits += 8;
	          //---//
	        }
	        //--- DROPBITS(last.bits) ---//
	        hold >>>= last_bits;
	        bits -= last_bits;
	        //---//
	        state.back += last_bits;
	      }
	      //--- DROPBITS(here.bits) ---//
	      hold >>>= here_bits;
	      bits -= here_bits;
	      //---//
	      state.back += here_bits;
	      if (here_op & 64) {
	        strm.msg = 'invalid distance code';
	        state.mode = BAD;
	        break;
	      }
	      state.offset = here_val;
	      state.extra = (here_op) & 15;
	      state.mode = DISTEXT;
	      /* falls through */
	    case DISTEXT:
	      if (state.extra) {
	        //=== NEEDBITS(state.extra);
	        n = state.extra;
	        while (bits < n) {
	          if (have === 0) { break inf_leave; }
	          have--;
	          hold += input[next++] << bits;
	          bits += 8;
	        }
	        //===//
	        state.offset += hold & ((1 << state.extra) -1)/*BITS(state.extra)*/;
	        //--- DROPBITS(state.extra) ---//
	        hold >>>= state.extra;
	        bits -= state.extra;
	        //---//
	        state.back += state.extra;
	      }
	//#ifdef INFLATE_STRICT
	      if (state.offset > state.dmax) {
	        strm.msg = 'invalid distance too far back';
	        state.mode = BAD;
	        break;
	      }
	//#endif
	      //Tracevv((stderr, "inflate:         distance %u\n", state.offset));
	      state.mode = MATCH;
	      /* falls through */
	    case MATCH:
	      if (left === 0) { break inf_leave; }
	      copy = _out - left;
	      if (state.offset > copy) {         /* copy from window */
	        copy = state.offset - copy;
	        if (copy > state.whave) {
	          if (state.sane) {
	            strm.msg = 'invalid distance too far back';
	            state.mode = BAD;
	            break;
	          }
	// (!) This block is disabled in zlib defailts,
	// don't enable it for binary compatibility
	//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
	//          Trace((stderr, "inflate.c too far\n"));
	//          copy -= state.whave;
	//          if (copy > state.length) { copy = state.length; }
	//          if (copy > left) { copy = left; }
	//          left -= copy;
	//          state.length -= copy;
	//          do {
	//            output[put++] = 0;
	//          } while (--copy);
	//          if (state.length === 0) { state.mode = LEN; }
	//          break;
	//#endif
	        }
	        if (copy > state.wnext) {
	          copy -= state.wnext;
	          from = state.wsize - copy;
	        }
	        else {
	          from = state.wnext - copy;
	        }
	        if (copy > state.length) { copy = state.length; }
	        from_source = state.window;
	      }
	      else {                              /* copy from output */
	        from_source = output;
	        from = put - state.offset;
	        copy = state.length;
	      }
	      if (copy > left) { copy = left; }
	      left -= copy;
	      state.length -= copy;
	      do {
	        output[put++] = from_source[from++];
	      } while (--copy);
	      if (state.length === 0) { state.mode = LEN; }
	      break;
	    case LIT:
	      if (left === 0) { break inf_leave; }
	      output[put++] = state.length;
	      left--;
	      state.mode = LEN;
	      break;
	    case CHECK:
	      if (state.wrap) {
	        //=== NEEDBITS(32);
	        while (bits < 32) {
	          if (have === 0) { break inf_leave; }
	          have--;
	          // Use '|' insdead of '+' to make sure that result is signed
	          hold |= input[next++] << bits;
	          bits += 8;
	        }
	        //===//
	        _out -= left;
	        strm.total_out += _out;
	        state.total += _out;
	        if (_out) {
	          strm.adler = state.check =
	              /*UPDATE(state.check, put - _out, _out);*/
	              (state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out));

	        }
	        _out = left;
	        // NB: crc32 stored as signed 32-bit int, ZSWAP32 returns signed too
	        if ((state.flags ? hold : ZSWAP32(hold)) !== state.check) {
	          strm.msg = 'incorrect data check';
	          state.mode = BAD;
	          break;
	        }
	        //=== INITBITS();
	        hold = 0;
	        bits = 0;
	        //===//
	        //Tracev((stderr, "inflate:   check matches trailer\n"));
	      }
	      state.mode = LENGTH;
	      /* falls through */
	    case LENGTH:
	      if (state.wrap && state.flags) {
	        //=== NEEDBITS(32);
	        while (bits < 32) {
	          if (have === 0) { break inf_leave; }
	          have--;
	          hold += input[next++] << bits;
	          bits += 8;
	        }
	        //===//
	        if (hold !== (state.total & 0xffffffff)) {
	          strm.msg = 'incorrect length check';
	          state.mode = BAD;
	          break;
	        }
	        //=== INITBITS();
	        hold = 0;
	        bits = 0;
	        //===//
	        //Tracev((stderr, "inflate:   length matches trailer\n"));
	      }
	      state.mode = DONE;
	      /* falls through */
	    case DONE:
	      ret = Z_STREAM_END;
	      break inf_leave;
	    case BAD:
	      ret = Z_DATA_ERROR;
	      break inf_leave;
	    case MEM:
	      return Z_MEM_ERROR;
	    case SYNC:
	      /* falls through */
	    default:
	      return Z_STREAM_ERROR;
	    }
	  }

	  // inf_leave <- here is real place for "goto inf_leave", emulated via "break inf_leave"

	  /*
	     Return from inflate(), updating the total counts and the check value.
	     If there was no progress during the inflate() call, return a buffer
	     error.  Call updatewindow() to create and/or update the window state.
	     Note: a memory error from inflate() is non-recoverable.
	   */

	  //--- RESTORE() ---
	  strm.next_out = put;
	  strm.avail_out = left;
	  strm.next_in = next;
	  strm.avail_in = have;
	  state.hold = hold;
	  state.bits = bits;
	  //---

	  if (state.wsize || (_out !== strm.avail_out && state.mode < BAD &&
	                      (state.mode < CHECK || flush !== Z_FINISH))) {
	    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
	      state.mode = MEM;
	      return Z_MEM_ERROR;
	    }
	  }
	  _in -= strm.avail_in;
	  _out -= strm.avail_out;
	  strm.total_in += _in;
	  strm.total_out += _out;
	  state.total += _out;
	  if (state.wrap && _out) {
	    strm.adler = state.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
	      (state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out));
	  }
	  strm.data_type = state.bits + (state.last ? 64 : 0) +
	                    (state.mode === TYPE ? 128 : 0) +
	                    (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
	  if (((_in === 0 && _out === 0) || flush === Z_FINISH) && ret === Z_OK) {
	    ret = Z_BUF_ERROR;
	  }
	  return ret;
	}

	function inflateEnd(strm) {

	  if (!strm || !strm.state /*|| strm->zfree == (free_func)0*/) {
	    return Z_STREAM_ERROR;
	  }

	  var state = strm.state;
	  if (state.window) {
	    state.window = null;
	  }
	  strm.state = null;
	  return Z_OK;
	}

	function inflateGetHeader(strm, head) {
	  var state;

	  /* check state */
	  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
	  state = strm.state;
	  if ((state.wrap & 2) === 0) { return Z_STREAM_ERROR; }

	  /* save header structure */
	  state.head = head;
	  head.done = false;
	  return Z_OK;
	}


	exports.inflateReset = inflateReset;
	exports.inflateReset2 = inflateReset2;
	exports.inflateResetKeep = inflateResetKeep;
	exports.inflateInit = inflateInit;
	exports.inflateInit2 = inflateInit2;
	exports.inflate = inflate;
	exports.inflateEnd = inflateEnd;
	exports.inflateGetHeader = inflateGetHeader;
	exports.inflateInfo = 'pako inflate (from Nodeca project)';

	/* Not implemented
	exports.inflateCopy = inflateCopy;
	exports.inflateGetDictionary = inflateGetDictionary;
	exports.inflateMark = inflateMark;
	exports.inflatePrime = inflatePrime;
	exports.inflateSetDictionary = inflateSetDictionary;
	exports.inflateSync = inflateSync;
	exports.inflateSyncPoint = inflateSyncPoint;
	exports.inflateUndermine = inflateUndermine;
	*/
	},{"../utils/common":2,"./adler32":3,"./crc32":5,"./inffast":7,"./inftrees":9}],9:[function(_dereq_,module,exports){
	'use strict';


	var utils = _dereq_('../utils/common');

	var MAXBITS = 15;
	var ENOUGH_LENS = 852;
	var ENOUGH_DISTS = 592;
	//var ENOUGH = (ENOUGH_LENS+ENOUGH_DISTS);

	var CODES = 0;
	var LENS = 1;
	var DISTS = 2;

	var lbase = [ /* Length codes 257..285 base */
	  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
	  35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
	];

	var lext = [ /* Length codes 257..285 extra */
	  16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
	  19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
	];

	var dbase = [ /* Distance codes 0..29 base */
	  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
	  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
	  8193, 12289, 16385, 24577, 0, 0
	];

	var dext = [ /* Distance codes 0..29 extra */
	  16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
	  23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
	  28, 28, 29, 29, 64, 64
	];

	module.exports = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts)
	{
	  var bits = opts.bits;
	      //here = opts.here; /* table entry for duplication */

	  var len = 0;               /* a code's length in bits */
	  var sym = 0;               /* index of code symbols */
	  var min = 0, max = 0;          /* minimum and maximum code lengths */
	  var root = 0;              /* number of index bits for root table */
	  var curr = 0;              /* number of index bits for current table */
	  var drop = 0;              /* code bits to drop for sub-table */
	  var left = 0;                   /* number of prefix codes available */
	  var used = 0;              /* code entries in table used */
	  var huff = 0;              /* Huffman code */
	  var incr;              /* for incrementing code, index */
	  var fill;              /* index for replicating entries */
	  var low;               /* low bits for current root entry */
	  var mask;              /* mask for low root bits */
	  var next;             /* next available space in table */
	  var base = null;     /* base value table to use */
	  var base_index = 0;
	//  var shoextra;    /* extra bits table to use */
	  var end;                    /* use base and extra for symbol > end */
	  var count = new utils.Buf16(MAXBITS+1); //[MAXBITS+1];    /* number of codes of each length */
	  var offs = new utils.Buf16(MAXBITS+1); //[MAXBITS+1];     /* offsets in table for each length */
	  var extra = null;
	  var extra_index = 0;

	  var here_bits, here_op, here_val;

	  /*
	   Process a set of code lengths to create a canonical Huffman code.  The
	   code lengths are lens[0..codes-1].  Each length corresponds to the
	   symbols 0..codes-1.  The Huffman code is generated by first sorting the
	   symbols by length from short to long, and retaining the symbol order
	   for codes with equal lengths.  Then the code starts with all zero bits
	   for the first code of the shortest length, and the codes are integer
	   increments for the same length, and zeros are appended as the length
	   increases.  For the deflate format, these bits are stored backwards
	   from their more natural integer increment ordering, and so when the
	   decoding tables are built in the large loop below, the integer codes
	   are incremented backwards.

	   This routine assumes, but does not check, that all of the entries in
	   lens[] are in the range 0..MAXBITS.  The caller must assure this.
	   1..MAXBITS is interpreted as that code length.  zero means that that
	   symbol does not occur in this code.

	   The codes are sorted by computing a count of codes for each length,
	   creating from that a table of starting indices for each length in the
	   sorted table, and then entering the symbols in order in the sorted
	   table.  The sorted table is work[], with that space being provided by
	   the caller.

	   The length counts are used for other purposes as well, i.e. finding
	   the minimum and maximum length codes, determining if there are any
	   codes at all, checking for a valid set of lengths, and looking ahead
	   at length counts to determine sub-table sizes when building the
	   decoding tables.
	   */

	  /* accumulate lengths for codes (assumes lens[] all in 0..MAXBITS) */
	  for (len = 0; len <= MAXBITS; len++) {
	    count[len] = 0;
	  }
	  for (sym = 0; sym < codes; sym++) {
	    count[lens[lens_index + sym]]++;
	  }

	  /* bound code lengths, force root to be within code lengths */
	  root = bits;
	  for (max = MAXBITS; max >= 1; max--) {
	    if (count[max] !== 0) { break; }
	  }
	  if (root > max) {
	    root = max;
	  }
	  if (max === 0) {                     /* no symbols to code at all */
	    //table.op[opts.table_index] = 64;  //here.op = (var char)64;    /* invalid code marker */
	    //table.bits[opts.table_index] = 1;   //here.bits = (var char)1;
	    //table.val[opts.table_index++] = 0;   //here.val = (var short)0;
	    table[table_index++] = (1 << 24) | (64 << 16) | 0;


	    //table.op[opts.table_index] = 64;
	    //table.bits[opts.table_index] = 1;
	    //table.val[opts.table_index++] = 0;
	    table[table_index++] = (1 << 24) | (64 << 16) | 0;

	    opts.bits = 1;
	    return 0;     /* no symbols, but wait for decoding to report error */
	  }
	  for (min = 1; min < max; min++) {
	    if (count[min] !== 0) { break; }
	  }
	  if (root < min) {
	    root = min;
	  }

	  /* check for an over-subscribed or incomplete set of lengths */
	  left = 1;
	  for (len = 1; len <= MAXBITS; len++) {
	    left <<= 1;
	    left -= count[len];
	    if (left < 0) {
	      return -1;
	    }        /* over-subscribed */
	  }
	  if (left > 0 && (type === CODES || max !== 1)) {
	    return -1;                      /* incomplete set */
	  }

	  /* generate offsets into symbol table for each length for sorting */
	  offs[1] = 0;
	  for (len = 1; len < MAXBITS; len++) {
	    offs[len + 1] = offs[len] + count[len];
	  }

	  /* sort symbols by length, by symbol order within each length */
	  for (sym = 0; sym < codes; sym++) {
	    if (lens[lens_index + sym] !== 0) {
	      work[offs[lens[lens_index + sym]]++] = sym;
	    }
	  }

	  /*
	   Create and fill in decoding tables.  In this loop, the table being
	   filled is at next and has curr index bits.  The code being used is huff
	   with length len.  That code is converted to an index by dropping drop
	   bits off of the bottom.  For codes where len is less than drop + curr,
	   those top drop + curr - len bits are incremented through all values to
	   fill the table with replicated entries.

	   root is the number of index bits for the root table.  When len exceeds
	   root, sub-tables are created pointed to by the root entry with an index
	   of the low root bits of huff.  This is saved in low to check for when a
	   new sub-table should be started.  drop is zero when the root table is
	   being filled, and drop is root when sub-tables are being filled.

	   When a new sub-table is needed, it is necessary to look ahead in the
	   code lengths to determine what size sub-table is needed.  The length
	   counts are used for this, and so count[] is decremented as codes are
	   entered in the tables.

	   used keeps track of how many table entries have been allocated from the
	   provided *table space.  It is checked for LENS and DIST tables against
	   the constants ENOUGH_LENS and ENOUGH_DISTS to guard against changes in
	   the initial root table size constants.  See the comments in inftrees.h
	   for more information.

	   sym increments through all symbols, and the loop terminates when
	   all codes of length max, i.e. all codes, have been processed.  This
	   routine permits incomplete codes, so another loop after this one fills
	   in the rest of the decoding tables with invalid code markers.
	   */

	  /* set up for code type */
	  // poor man optimization - use if-else instead of switch,
	  // to avoid deopts in old v8
	  if (type === CODES) {
	      base = extra = work;    /* dummy value--not used */
	      end = 19;
	  } else if (type === LENS) {
	      base = lbase;
	      base_index -= 257;
	      extra = lext;
	      extra_index -= 257;
	      end = 256;
	  } else {                    /* DISTS */
	      base = dbase;
	      extra = dext;
	      end = -1;
	  }

	  /* initialize opts for loop */
	  huff = 0;                   /* starting code */
	  sym = 0;                    /* starting code symbol */
	  len = min;                  /* starting code length */
	  next = table_index;              /* current table to fill in */
	  curr = root;                /* current table index bits */
	  drop = 0;                   /* current bits to drop from code for index */
	  low = -1;                   /* trigger new sub-table when len > root */
	  used = 1 << root;          /* use root table entries */
	  mask = used - 1;            /* mask for comparing low */

	  /* check available table space */
	  if ((type === LENS && used > ENOUGH_LENS) ||
	    (type === DISTS && used > ENOUGH_DISTS)) {
	    return 1;
	  }

	  var i=0;
	  /* process all codes and make table entries */
	  for (;;) {
	    i++;
	    /* create table entry */
	    here_bits = len - drop;
	    if (work[sym] < end) {
	      here_op = 0;
	      here_val = work[sym];
	    }
	    else if (work[sym] > end) {
	      here_op = extra[extra_index + work[sym]];
	      here_val = base[base_index + work[sym]];
	    }
	    else {
	      here_op = 32 + 64;         /* end of block */
	      here_val = 0;
	    }

	    /* replicate for those indices with low len bits equal to huff */
	    incr = 1 << (len - drop);
	    fill = 1 << curr;
	    min = fill;                 /* save offset to next table */
	    do {
	      fill -= incr;
	      table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val |0;
	    } while (fill !== 0);

	    /* backwards increment the len-bit code huff */
	    incr = 1 << (len - 1);
	    while (huff & incr) {
	      incr >>= 1;
	    }
	    if (incr !== 0) {
	      huff &= incr - 1;
	      huff += incr;
	    } else {
	      huff = 0;
	    }

	    /* go to next symbol, update count, len */
	    sym++;
	    if (--count[len] === 0) {
	      if (len === max) { break; }
	      len = lens[lens_index + work[sym]];
	    }

	    /* create new sub-table if needed */
	    if (len > root && (huff & mask) !== low) {
	      /* if first time, transition to sub-tables */
	      if (drop === 0) {
	        drop = root;
	      }

	      /* increment past last table */
	      next += min;            /* here min is 1 << curr */

	      /* determine length of next table */
	      curr = len - drop;
	      left = 1 << curr;
	      while (curr + drop < max) {
	        left -= count[curr + drop];
	        if (left <= 0) { break; }
	        curr++;
	        left <<= 1;
	      }

	      /* check for enough space */
	      used += 1 << curr;
	      if ((type === LENS && used > ENOUGH_LENS) ||
	        (type === DISTS && used > ENOUGH_DISTS)) {
	        return 1;
	      }

	      /* point entry in root table to sub-table */
	      low = huff & mask;
	      /*table.op[low] = curr;
	      table.bits[low] = root;
	      table.val[low] = next - opts.table_index;*/
	      table[low] = (root << 24) | (curr << 16) | (next - table_index) |0;
	    }
	  }

	  /* fill in remaining table entry if code is incomplete (guaranteed to have
	   at most one remaining entry, since if the code is incomplete, the
	   maximum code length that was allowed to get this far is one bit) */
	  if (huff !== 0) {
	    //table.op[next + huff] = 64;            /* invalid code marker */
	    //table.bits[next + huff] = len - drop;
	    //table.val[next + huff] = 0;
	    table[next + huff] = ((len - drop) << 24) | (64 << 16) |0;
	  }

	  /* set return parameters */
	  //opts.table_index += used;
	  opts.bits = root;
	  return 0;
	};

	},{"../utils/common":2}],10:[function(_dereq_,module,exports){
	'use strict';

	module.exports = {
	  '2':    'need dictionary',     /* Z_NEED_DICT       2  */
	  '1':    'stream end',          /* Z_STREAM_END      1  */
	  '0':    '',                    /* Z_OK              0  */
	  '-1':   'file error',          /* Z_ERRNO         (-1) */
	  '-2':   'stream error',        /* Z_STREAM_ERROR  (-2) */
	  '-3':   'data error',          /* Z_DATA_ERROR    (-3) */
	  '-4':   'insufficient memory', /* Z_MEM_ERROR     (-4) */
	  '-5':   'buffer error',        /* Z_BUF_ERROR     (-5) */
	  '-6':   'incompatible version' /* Z_VERSION_ERROR (-6) */
	};
	},{}],11:[function(_dereq_,module,exports){
	'use strict';


	var utils = _dereq_('../utils/common');

	/* Public constants ==========================================================*/
	/* ===========================================================================*/


	//var Z_FILTERED          = 1;
	//var Z_HUFFMAN_ONLY      = 2;
	//var Z_RLE               = 3;
	var Z_FIXED               = 4;
	//var Z_DEFAULT_STRATEGY  = 0;

	/* Possible values of the data_type field (though see inflate()) */
	var Z_BINARY              = 0;
	var Z_TEXT                = 1;
	//var Z_ASCII             = 1; // = Z_TEXT
	var Z_UNKNOWN             = 2;

	/*============================================================================*/


	function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }

	// From zutil.h

	var STORED_BLOCK = 0;
	var STATIC_TREES = 1;
	var DYN_TREES    = 2;
	/* The three kinds of block type */

	var MIN_MATCH    = 3;
	var MAX_MATCH    = 258;
	/* The minimum and maximum match lengths */

	// From deflate.h
	/* ===========================================================================
	 * Internal compression state.
	 */

	var LENGTH_CODES  = 29;
	/* number of length codes, not counting the special END_BLOCK code */

	var LITERALS      = 256;
	/* number of literal bytes 0..255 */

	var L_CODES       = LITERALS + 1 + LENGTH_CODES;
	/* number of Literal or Length codes, including the END_BLOCK code */

	var D_CODES       = 30;
	/* number of distance codes */

	var BL_CODES      = 19;
	/* number of codes used to transfer the bit lengths */

	var HEAP_SIZE     = 2*L_CODES + 1;
	/* maximum heap size */

	var MAX_BITS      = 15;
	/* All codes must not exceed MAX_BITS bits */

	var Buf_size      = 16;
	/* size of bit buffer in bi_buf */


	/* ===========================================================================
	 * Constants
	 */

	var MAX_BL_BITS = 7;
	/* Bit length codes must not exceed MAX_BL_BITS bits */

	var END_BLOCK   = 256;
	/* end of block literal code */

	var REP_3_6     = 16;
	/* repeat previous bit length 3-6 times (2 bits of repeat count) */

	var REPZ_3_10   = 17;
	/* repeat a zero length 3-10 times  (3 bits of repeat count) */

	var REPZ_11_138 = 18;
	/* repeat a zero length 11-138 times  (7 bits of repeat count) */

	var extra_lbits =   /* extra bits for each length code */
	  [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];

	var extra_dbits =   /* extra bits for each distance code */
	  [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];

	var extra_blbits =  /* extra bits for each bit length code */
	  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7];

	var bl_order =
	  [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
	/* The lengths of the bit length codes are sent in order of decreasing
	 * probability, to avoid transmitting the lengths for unused bit length codes.
	 */

	/* ===========================================================================
	 * Local data. These are initialized only once.
	 */

	// We pre-fill arrays with 0 to avoid uninitialized gaps

	var DIST_CODE_LEN = 512; /* see definition of array dist_code below */

	// !!!! Use flat array insdead of structure, Freq = i*2, Len = i*2+1
	var static_ltree  = new Array((L_CODES+2) * 2);
	zero(static_ltree);
	/* The static literal tree. Since the bit lengths are imposed, there is no
	 * need for the L_CODES extra codes used during heap construction. However
	 * The codes 286 and 287 are needed to build a canonical tree (see _tr_init
	 * below).
	 */

	var static_dtree  = new Array(D_CODES * 2);
	zero(static_dtree);
	/* The static distance tree. (Actually a trivial tree since all codes use
	 * 5 bits.)
	 */

	var _dist_code    = new Array(DIST_CODE_LEN);
	zero(_dist_code);
	/* Distance codes. The first 256 values correspond to the distances
	 * 3 .. 258, the last 256 values correspond to the top 8 bits of
	 * the 15 bit distances.
	 */

	var _length_code  = new Array(MAX_MATCH-MIN_MATCH+1);
	zero(_length_code);
	/* length code for each normalized match length (0 == MIN_MATCH) */

	var base_length   = new Array(LENGTH_CODES);
	zero(base_length);
	/* First normalized length for each code (0 = MIN_MATCH) */

	var base_dist     = new Array(D_CODES);
	zero(base_dist);
	/* First normalized distance for each code (0 = distance of 1) */


	var StaticTreeDesc = function (static_tree, extra_bits, extra_base, elems, max_length) {

	  this.static_tree  = static_tree;  /* static tree or NULL */
	  this.extra_bits   = extra_bits;   /* extra bits for each code or NULL */
	  this.extra_base   = extra_base;   /* base index for extra_bits */
	  this.elems        = elems;        /* max number of elements in the tree */
	  this.max_length   = max_length;   /* max bit length for the codes */

	  // show if `static_tree` has data or dummy - needed for monomorphic objects
	  this.has_stree    = static_tree && static_tree.length;
	};


	var static_l_desc;
	var static_d_desc;
	var static_bl_desc;


	var TreeDesc = function(dyn_tree, stat_desc) {
	  this.dyn_tree = dyn_tree;     /* the dynamic tree */
	  this.max_code = 0;            /* largest code with non zero frequency */
	  this.stat_desc = stat_desc;   /* the corresponding static tree */
	};



	function d_code(dist) {
	  return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
	}


	/* ===========================================================================
	 * Output a short LSB first on the stream.
	 * IN assertion: there is enough room in pendingBuf.
	 */
	function put_short (s, w) {
	//    put_byte(s, (uch)((w) & 0xff));
	//    put_byte(s, (uch)((ush)(w) >> 8));
	  s.pending_buf[s.pending++] = (w) & 0xff;
	  s.pending_buf[s.pending++] = (w >>> 8) & 0xff;
	}


	/* ===========================================================================
	 * Send a value on a given number of bits.
	 * IN assertion: length <= 16 and value fits in length bits.
	 */
	function send_bits(s, value, length) {
	  if (s.bi_valid > (Buf_size - length)) {
	    s.bi_buf |= (value << s.bi_valid) & 0xffff;
	    put_short(s, s.bi_buf);
	    s.bi_buf = value >> (Buf_size - s.bi_valid);
	    s.bi_valid += length - Buf_size;
	  } else {
	    s.bi_buf |= (value << s.bi_valid) & 0xffff;
	    s.bi_valid += length;
	  }
	}


	function send_code(s, c, tree) {
	  send_bits(s, tree[c*2]/*.Code*/, tree[c*2 + 1]/*.Len*/);
	}


	/* ===========================================================================
	 * Reverse the first len bits of a code, using straightforward code (a faster
	 * method would use a table)
	 * IN assertion: 1 <= len <= 15
	 */
	function bi_reverse(code, len) {
	  var res = 0;
	  do {
	    res |= code & 1;
	    code >>>= 1;
	    res <<= 1;
	  } while (--len > 0);
	  return res >>> 1;
	}


	/* ===========================================================================
	 * Flush the bit buffer, keeping at most 7 bits in it.
	 */
	function bi_flush(s) {
	  if (s.bi_valid === 16) {
	    put_short(s, s.bi_buf);
	    s.bi_buf = 0;
	    s.bi_valid = 0;

	  } else if (s.bi_valid >= 8) {
	    s.pending_buf[s.pending++] = s.bi_buf & 0xff;
	    s.bi_buf >>= 8;
	    s.bi_valid -= 8;
	  }
	}


	/* ===========================================================================
	 * Compute the optimal bit lengths for a tree and update the total bit length
	 * for the current block.
	 * IN assertion: the fields freq and dad are set, heap[heap_max] and
	 *    above are the tree nodes sorted by increasing frequency.
	 * OUT assertions: the field len is set to the optimal bit length, the
	 *     array bl_count contains the frequencies for each bit length.
	 *     The length opt_len is updated; static_len is also updated if stree is
	 *     not null.
	 */
	function gen_bitlen(s, desc)
	//    deflate_state *s;
	//    tree_desc *desc;    /* the tree descriptor */
	{
	  var tree            = desc.dyn_tree;
	  var max_code        = desc.max_code;
	  var stree           = desc.stat_desc.static_tree;
	  var has_stree       = desc.stat_desc.has_stree;
	  var extra           = desc.stat_desc.extra_bits;
	  var base            = desc.stat_desc.extra_base;
	  var max_length      = desc.stat_desc.max_length;
	  var h;              /* heap index */
	  var n, m;           /* iterate over the tree elements */
	  var bits;           /* bit length */
	  var xbits;          /* extra bits */
	  var f;              /* frequency */
	  var overflow = 0;   /* number of elements with bit length too large */

	  for (bits = 0; bits <= MAX_BITS; bits++) {
	    s.bl_count[bits] = 0;
	  }

	  /* In a first pass, compute the optimal bit lengths (which may
	   * overflow in the case of the bit length tree).
	   */
	  tree[s.heap[s.heap_max]*2 + 1]/*.Len*/ = 0; /* root of the heap */

	  for (h = s.heap_max+1; h < HEAP_SIZE; h++) {
	    n = s.heap[h];
	    bits = tree[tree[n*2 +1]/*.Dad*/ * 2 + 1]/*.Len*/ + 1;
	    if (bits > max_length) {
	      bits = max_length;
	      overflow++;
	    }
	    tree[n*2 + 1]/*.Len*/ = bits;
	    /* We overwrite tree[n].Dad which is no longer needed */

	    if (n > max_code) { continue; } /* not a leaf node */

	    s.bl_count[bits]++;
	    xbits = 0;
	    if (n >= base) {
	      xbits = extra[n-base];
	    }
	    f = tree[n * 2]/*.Freq*/;
	    s.opt_len += f * (bits + xbits);
	    if (has_stree) {
	      s.static_len += f * (stree[n*2 + 1]/*.Len*/ + xbits);
	    }
	  }
	  if (overflow === 0) { return; }

	  // Trace((stderr,"\nbit length overflow\n"));
	  /* This happens for example on obj2 and pic of the Calgary corpus */

	  /* Find the first bit length which could increase: */
	  do {
	    bits = max_length-1;
	    while (s.bl_count[bits] === 0) { bits--; }
	    s.bl_count[bits]--;      /* move one leaf down the tree */
	    s.bl_count[bits+1] += 2; /* move one overflow item as its brother */
	    s.bl_count[max_length]--;
	    /* The brother of the overflow item also moves one step up,
	     * but this does not affect bl_count[max_length]
	     */
	    overflow -= 2;
	  } while (overflow > 0);

	  /* Now recompute all bit lengths, scanning in increasing frequency.
	   * h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
	   * lengths instead of fixing only the wrong ones. This idea is taken
	   * from 'ar' written by Haruhiko Okumura.)
	   */
	  for (bits = max_length; bits !== 0; bits--) {
	    n = s.bl_count[bits];
	    while (n !== 0) {
	      m = s.heap[--h];
	      if (m > max_code) { continue; }
	      if (tree[m*2 + 1]/*.Len*/ !== bits) {
	        // Trace((stderr,"code %d bits %d->%d\n", m, tree[m].Len, bits));
	        s.opt_len += (bits - tree[m*2 + 1]/*.Len*/)*tree[m*2]/*.Freq*/;
	        tree[m*2 + 1]/*.Len*/ = bits;
	      }
	      n--;
	    }
	  }
	}


	/* ===========================================================================
	 * Generate the codes for a given tree and bit counts (which need not be
	 * optimal).
	 * IN assertion: the array bl_count contains the bit length statistics for
	 * the given tree and the field len is set for all tree elements.
	 * OUT assertion: the field code is set for all tree elements of non
	 *     zero code length.
	 */
	function gen_codes(tree, max_code, bl_count)
	//    ct_data *tree;             /* the tree to decorate */
	//    int max_code;              /* largest code with non zero frequency */
	//    ushf *bl_count;            /* number of codes at each bit length */
	{
	  var next_code = new Array(MAX_BITS+1); /* next code value for each bit length */
	  var code = 0;              /* running code value */
	  var bits;                  /* bit index */
	  var n;                     /* code index */

	  /* The distribution counts are first used to generate the code values
	   * without bit reversal.
	   */
	  for (bits = 1; bits <= MAX_BITS; bits++) {
	    next_code[bits] = code = (code + bl_count[bits-1]) << 1;
	  }
	  /* Check that the bit counts in bl_count are consistent. The last code
	   * must be all ones.
	   */
	  //Assert (code + bl_count[MAX_BITS]-1 == (1<<MAX_BITS)-1,
	  //        "inconsistent bit counts");
	  //Tracev((stderr,"\ngen_codes: max_code %d ", max_code));

	  for (n = 0;  n <= max_code; n++) {
	    var len = tree[n*2 + 1]/*.Len*/;
	    if (len === 0) { continue; }
	    /* Now reverse the bits */
	    tree[n*2]/*.Code*/ = bi_reverse(next_code[len]++, len);

	    //Tracecv(tree != static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ",
	    //     n, (isgraph(n) ? n : ' '), len, tree[n].Code, next_code[len]-1));
	  }
	}


	/* ===========================================================================
	 * Initialize the various 'constant' tables.
	 */
	function tr_static_init() {
	  var n;        /* iterates over tree elements */
	  var bits;     /* bit counter */
	  var length;   /* length value */
	  var code;     /* code value */
	  var dist;     /* distance index */
	  var bl_count = new Array(MAX_BITS+1);
	  /* number of codes at each bit length for an optimal tree */

	  // do check in _tr_init()
	  //if (static_init_done) return;

	  /* For some embedded targets, global variables are not initialized: */
	/*#ifdef NO_INIT_GLOBAL_POINTERS
	  static_l_desc.static_tree = static_ltree;
	  static_l_desc.extra_bits = extra_lbits;
	  static_d_desc.static_tree = static_dtree;
	  static_d_desc.extra_bits = extra_dbits;
	  static_bl_desc.extra_bits = extra_blbits;
	#endif*/

	  /* Initialize the mapping length (0..255) -> length code (0..28) */
	  length = 0;
	  for (code = 0; code < LENGTH_CODES-1; code++) {
	    base_length[code] = length;
	    for (n = 0; n < (1<<extra_lbits[code]); n++) {
	      _length_code[length++] = code;
	    }
	  }
	  //Assert (length == 256, "tr_static_init: length != 256");
	  /* Note that the length 255 (match length 258) can be represented
	   * in two different ways: code 284 + 5 bits or code 285, so we
	   * overwrite length_code[255] to use the best encoding:
	   */
	  _length_code[length-1] = code;

	  /* Initialize the mapping dist (0..32K) -> dist code (0..29) */
	  dist = 0;
	  for (code = 0 ; code < 16; code++) {
	    base_dist[code] = dist;
	    for (n = 0; n < (1<<extra_dbits[code]); n++) {
	      _dist_code[dist++] = code;
	    }
	  }
	  //Assert (dist == 256, "tr_static_init: dist != 256");
	  dist >>= 7; /* from now on, all distances are divided by 128 */
	  for ( ; code < D_CODES; code++) {
	    base_dist[code] = dist << 7;
	    for (n = 0; n < (1<<(extra_dbits[code]-7)); n++) {
	      _dist_code[256 + dist++] = code;
	    }
	  }
	  //Assert (dist == 256, "tr_static_init: 256+dist != 512");

	  /* Construct the codes of the static literal tree */
	  for (bits = 0; bits <= MAX_BITS; bits++) {
	    bl_count[bits] = 0;
	  }

	  n = 0;
	  while (n <= 143) {
	    static_ltree[n*2 + 1]/*.Len*/ = 8;
	    n++;
	    bl_count[8]++;
	  }
	  while (n <= 255) {
	    static_ltree[n*2 + 1]/*.Len*/ = 9;
	    n++;
	    bl_count[9]++;
	  }
	  while (n <= 279) {
	    static_ltree[n*2 + 1]/*.Len*/ = 7;
	    n++;
	    bl_count[7]++;
	  }
	  while (n <= 287) {
	    static_ltree[n*2 + 1]/*.Len*/ = 8;
	    n++;
	    bl_count[8]++;
	  }
	  /* Codes 286 and 287 do not exist, but we must include them in the
	   * tree construction to get a canonical Huffman tree (longest code
	   * all ones)
	   */
	  gen_codes(static_ltree, L_CODES+1, bl_count);

	  /* The static distance tree is trivial: */
	  for (n = 0; n < D_CODES; n++) {
	    static_dtree[n*2 + 1]/*.Len*/ = 5;
	    static_dtree[n*2]/*.Code*/ = bi_reverse(n, 5);
	  }

	  // Now data ready and we can init static trees
	  static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS+1, L_CODES, MAX_BITS);
	  static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0,          D_CODES, MAX_BITS);
	  static_bl_desc =new StaticTreeDesc(new Array(0), extra_blbits, 0,         BL_CODES, MAX_BL_BITS);

	  //static_init_done = true;
	}


	/* ===========================================================================
	 * Initialize a new block.
	 */
	function init_block(s) {
	  var n; /* iterates over tree elements */

	  /* Initialize the trees. */
	  for (n = 0; n < L_CODES;  n++) { s.dyn_ltree[n*2]/*.Freq*/ = 0; }
	  for (n = 0; n < D_CODES;  n++) { s.dyn_dtree[n*2]/*.Freq*/ = 0; }
	  for (n = 0; n < BL_CODES; n++) { s.bl_tree[n*2]/*.Freq*/ = 0; }

	  s.dyn_ltree[END_BLOCK*2]/*.Freq*/ = 1;
	  s.opt_len = s.static_len = 0;
	  s.last_lit = s.matches = 0;
	}


	/* ===========================================================================
	 * Flush the bit buffer and align the output on a byte boundary
	 */
	function bi_windup(s)
	{
	  if (s.bi_valid > 8) {
	    put_short(s, s.bi_buf);
	  } else if (s.bi_valid > 0) {
	    //put_byte(s, (Byte)s->bi_buf);
	    s.pending_buf[s.pending++] = s.bi_buf;
	  }
	  s.bi_buf = 0;
	  s.bi_valid = 0;
	}

	/* ===========================================================================
	 * Copy a stored block, storing first the length and its
	 * one's complement if requested.
	 */
	function copy_block(s, buf, len, header)
	//DeflateState *s;
	//charf    *buf;    /* the input data */
	//unsigned len;     /* its length */
	//int      header;  /* true if block header must be written */
	{
	  bi_windup(s);        /* align on byte boundary */

	  if (header) {
	    put_short(s, len);
	    put_short(s, ~len);
	  }
	//  while (len--) {
	//    put_byte(s, *buf++);
	//  }
	  utils.arraySet(s.pending_buf, s.window, buf, len, s.pending);
	  s.pending += len;
	}

	/* ===========================================================================
	 * Compares to subtrees, using the tree depth as tie breaker when
	 * the subtrees have equal frequency. This minimizes the worst case length.
	 */
	function smaller(tree, n, m, depth) {
	  var _n2 = n*2;
	  var _m2 = m*2;
	  return (tree[_n2]/*.Freq*/ < tree[_m2]/*.Freq*/ ||
	         (tree[_n2]/*.Freq*/ === tree[_m2]/*.Freq*/ && depth[n] <= depth[m]));
	}

	/* ===========================================================================
	 * Restore the heap property by moving down the tree starting at node k,
	 * exchanging a node with the smallest of its two sons if necessary, stopping
	 * when the heap property is re-established (each father smaller than its
	 * two sons).
	 */
	function pqdownheap(s, tree, k)
	//    deflate_state *s;
	//    ct_data *tree;  /* the tree to restore */
	//    int k;               /* node to move down */
	{
	  var v = s.heap[k];
	  var j = k << 1;  /* left son of k */
	  while (j <= s.heap_len) {
	    /* Set j to the smallest of the two sons: */
	    if (j < s.heap_len &&
	      smaller(tree, s.heap[j+1], s.heap[j], s.depth)) {
	      j++;
	    }
	    /* Exit if v is smaller than both sons */
	    if (smaller(tree, v, s.heap[j], s.depth)) { break; }

	    /* Exchange v with the smallest son */
	    s.heap[k] = s.heap[j];
	    k = j;

	    /* And continue down the tree, setting j to the left son of k */
	    j <<= 1;
	  }
	  s.heap[k] = v;
	}


	// inlined manually
	// var SMALLEST = 1;

	/* ===========================================================================
	 * Send the block data compressed using the given Huffman trees
	 */
	function compress_block(s, ltree, dtree)
	//    deflate_state *s;
	//    const ct_data *ltree; /* literal tree */
	//    const ct_data *dtree; /* distance tree */
	{
	  var dist;           /* distance of matched string */
	  var lc;             /* match length or unmatched char (if dist == 0) */
	  var lx = 0;         /* running index in l_buf */
	  var code;           /* the code to send */
	  var extra;          /* number of extra bits to send */

	  if (s.last_lit !== 0) {
	    do {
	      dist = (s.pending_buf[s.d_buf + lx*2] << 8) | (s.pending_buf[s.d_buf + lx*2 + 1]);
	      lc = s.pending_buf[s.l_buf + lx];
	      lx++;

	      if (dist === 0) {
	        send_code(s, lc, ltree); /* send a literal byte */
	        //Tracecv(isgraph(lc), (stderr," '%c' ", lc));
	      } else {
	        /* Here, lc is the match length - MIN_MATCH */
	        code = _length_code[lc];
	        send_code(s, code+LITERALS+1, ltree); /* send the length code */
	        extra = extra_lbits[code];
	        if (extra !== 0) {
	          lc -= base_length[code];
	          send_bits(s, lc, extra);       /* send the extra length bits */
	        }
	        dist--; /* dist is now the match distance - 1 */
	        code = d_code(dist);
	        //Assert (code < D_CODES, "bad d_code");

	        send_code(s, code, dtree);       /* send the distance code */
	        extra = extra_dbits[code];
	        if (extra !== 0) {
	          dist -= base_dist[code];
	          send_bits(s, dist, extra);   /* send the extra distance bits */
	        }
	      } /* literal or match pair ? */

	      /* Check that the overlay between pending_buf and d_buf+l_buf is ok: */
	      //Assert((uInt)(s->pending) < s->lit_bufsize + 2*lx,
	      //       "pendingBuf overflow");

	    } while (lx < s.last_lit);
	  }

	  send_code(s, END_BLOCK, ltree);
	}


	/* ===========================================================================
	 * Construct one Huffman tree and assigns the code bit strings and lengths.
	 * Update the total bit length for the current block.
	 * IN assertion: the field freq is set for all tree elements.
	 * OUT assertions: the fields len and code are set to the optimal bit length
	 *     and corresponding code. The length opt_len is updated; static_len is
	 *     also updated if stree is not null. The field max_code is set.
	 */
	function build_tree(s, desc)
	//    deflate_state *s;
	//    tree_desc *desc; /* the tree descriptor */
	{
	  var tree     = desc.dyn_tree;
	  var stree    = desc.stat_desc.static_tree;
	  var has_stree = desc.stat_desc.has_stree;
	  var elems    = desc.stat_desc.elems;
	  var n, m;          /* iterate over heap elements */
	  var max_code = -1; /* largest code with non zero frequency */
	  var node;          /* new node being created */

	  /* Construct the initial heap, with least frequent element in
	   * heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
	   * heap[0] is not used.
	   */
	  s.heap_len = 0;
	  s.heap_max = HEAP_SIZE;

	  for (n = 0; n < elems; n++) {
	    if (tree[n * 2]/*.Freq*/ !== 0) {
	      s.heap[++s.heap_len] = max_code = n;
	      s.depth[n] = 0;

	    } else {
	      tree[n*2 + 1]/*.Len*/ = 0;
	    }
	  }

	  /* The pkzip format requires that at least one distance code exists,
	   * and that at least one bit should be sent even if there is only one
	   * possible code. So to avoid special checks later on we force at least
	   * two codes of non zero frequency.
	   */
	  while (s.heap_len < 2) {
	    node = s.heap[++s.heap_len] = (max_code < 2 ? ++max_code : 0);
	    tree[node * 2]/*.Freq*/ = 1;
	    s.depth[node] = 0;
	    s.opt_len--;

	    if (has_stree) {
	      s.static_len -= stree[node*2 + 1]/*.Len*/;
	    }
	    /* node is 0 or 1 so it does not have extra bits */
	  }
	  desc.max_code = max_code;

	  /* The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
	   * establish sub-heaps of increasing lengths:
	   */
	  for (n = (s.heap_len >> 1/*int /2*/); n >= 1; n--) { pqdownheap(s, tree, n); }

	  /* Construct the Huffman tree by repeatedly combining the least two
	   * frequent nodes.
	   */
	  node = elems;              /* next internal node of the tree */
	  do {
	    //pqremove(s, tree, n);  /* n = node of least frequency */
	    /*** pqremove ***/
	    n = s.heap[1/*SMALLEST*/];
	    s.heap[1/*SMALLEST*/] = s.heap[s.heap_len--];
	    pqdownheap(s, tree, 1/*SMALLEST*/);
	    /***/

	    m = s.heap[1/*SMALLEST*/]; /* m = node of next least frequency */

	    s.heap[--s.heap_max] = n; /* keep the nodes sorted by frequency */
	    s.heap[--s.heap_max] = m;

	    /* Create a new node father of n and m */
	    tree[node * 2]/*.Freq*/ = tree[n * 2]/*.Freq*/ + tree[m * 2]/*.Freq*/;
	    s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
	    tree[n*2 + 1]/*.Dad*/ = tree[m*2 + 1]/*.Dad*/ = node;

	    /* and insert the new node in the heap */
	    s.heap[1/*SMALLEST*/] = node++;
	    pqdownheap(s, tree, 1/*SMALLEST*/);

	  } while (s.heap_len >= 2);

	  s.heap[--s.heap_max] = s.heap[1/*SMALLEST*/];

	  /* At this point, the fields freq and dad are set. We can now
	   * generate the bit lengths.
	   */
	  gen_bitlen(s, desc);

	  /* The field len is now set, we can generate the bit codes */
	  gen_codes(tree, max_code, s.bl_count);
	}


	/* ===========================================================================
	 * Scan a literal or distance tree to determine the frequencies of the codes
	 * in the bit length tree.
	 */
	function scan_tree(s, tree, max_code)
	//    deflate_state *s;
	//    ct_data *tree;   /* the tree to be scanned */
	//    int max_code;    /* and its largest code of non zero frequency */
	{
	  var n;                     /* iterates over all tree elements */
	  var prevlen = -1;          /* last emitted length */
	  var curlen;                /* length of current code */

	  var nextlen = tree[0*2 + 1]/*.Len*/; /* length of next code */

	  var count = 0;             /* repeat count of the current code */
	  var max_count = 7;         /* max repeat count */
	  var min_count = 4;         /* min repeat count */

	  if (nextlen === 0) {
	    max_count = 138;
	    min_count = 3;
	  }
	  tree[(max_code+1)*2 + 1]/*.Len*/ = 0xffff; /* guard */

	  for (n = 0; n <= max_code; n++) {
	    curlen = nextlen;
	    nextlen = tree[(n+1)*2 + 1]/*.Len*/;

	    if (++count < max_count && curlen === nextlen) {
	      continue;

	    } else if (count < min_count) {
	      s.bl_tree[curlen * 2]/*.Freq*/ += count;

	    } else if (curlen !== 0) {

	      if (curlen !== prevlen) { s.bl_tree[curlen * 2]/*.Freq*/++; }
	      s.bl_tree[REP_3_6*2]/*.Freq*/++;

	    } else if (count <= 10) {
	      s.bl_tree[REPZ_3_10*2]/*.Freq*/++;

	    } else {
	      s.bl_tree[REPZ_11_138*2]/*.Freq*/++;
	    }

	    count = 0;
	    prevlen = curlen;

	    if (nextlen === 0) {
	      max_count = 138;
	      min_count = 3;

	    } else if (curlen === nextlen) {
	      max_count = 6;
	      min_count = 3;

	    } else {
	      max_count = 7;
	      min_count = 4;
	    }
	  }
	}


	/* ===========================================================================
	 * Send a literal or distance tree in compressed form, using the codes in
	 * bl_tree.
	 */
	function send_tree(s, tree, max_code)
	//    deflate_state *s;
	//    ct_data *tree; /* the tree to be scanned */
	//    int max_code;       /* and its largest code of non zero frequency */
	{
	  var n;                     /* iterates over all tree elements */
	  var prevlen = -1;          /* last emitted length */
	  var curlen;                /* length of current code */

	  var nextlen = tree[0*2 + 1]/*.Len*/; /* length of next code */

	  var count = 0;             /* repeat count of the current code */
	  var max_count = 7;         /* max repeat count */
	  var min_count = 4;         /* min repeat count */

	  /* tree[max_code+1].Len = -1; */  /* guard already set */
	  if (nextlen === 0) {
	    max_count = 138;
	    min_count = 3;
	  }

	  for (n = 0; n <= max_code; n++) {
	    curlen = nextlen;
	    nextlen = tree[(n+1)*2 + 1]/*.Len*/;

	    if (++count < max_count && curlen === nextlen) {
	      continue;

	    } else if (count < min_count) {
	      do { send_code(s, curlen, s.bl_tree); } while (--count !== 0);

	    } else if (curlen !== 0) {
	      if (curlen !== prevlen) {
	        send_code(s, curlen, s.bl_tree);
	        count--;
	      }
	      //Assert(count >= 3 && count <= 6, " 3_6?");
	      send_code(s, REP_3_6, s.bl_tree);
	      send_bits(s, count-3, 2);

	    } else if (count <= 10) {
	      send_code(s, REPZ_3_10, s.bl_tree);
	      send_bits(s, count-3, 3);

	    } else {
	      send_code(s, REPZ_11_138, s.bl_tree);
	      send_bits(s, count-11, 7);
	    }

	    count = 0;
	    prevlen = curlen;
	    if (nextlen === 0) {
	      max_count = 138;
	      min_count = 3;

	    } else if (curlen === nextlen) {
	      max_count = 6;
	      min_count = 3;

	    } else {
	      max_count = 7;
	      min_count = 4;
	    }
	  }
	}


	/* ===========================================================================
	 * Construct the Huffman tree for the bit lengths and return the index in
	 * bl_order of the last bit length code to send.
	 */
	function build_bl_tree(s) {
	  var max_blindex;  /* index of last bit length code of non zero freq */

	  /* Determine the bit length frequencies for literal and distance trees */
	  scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
	  scan_tree(s, s.dyn_dtree, s.d_desc.max_code);

	  /* Build the bit length tree: */
	  build_tree(s, s.bl_desc);
	  /* opt_len now includes the length of the tree representations, except
	   * the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
	   */

	  /* Determine the number of bit length codes to send. The pkzip format
	   * requires that at least 4 bit length codes be sent. (appnote.txt says
	   * 3 but the actual value used is 4.)
	   */
	  for (max_blindex = BL_CODES-1; max_blindex >= 3; max_blindex--) {
	    if (s.bl_tree[bl_order[max_blindex]*2 + 1]/*.Len*/ !== 0) {
	      break;
	    }
	  }
	  /* Update opt_len to include the bit length tree and counts */
	  s.opt_len += 3*(max_blindex+1) + 5+5+4;
	  //Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
	  //        s->opt_len, s->static_len));

	  return max_blindex;
	}


	/* ===========================================================================
	 * Send the header for a block using dynamic Huffman trees: the counts, the
	 * lengths of the bit length codes, the literal tree and the distance tree.
	 * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
	 */
	function send_all_trees(s, lcodes, dcodes, blcodes)
	//    deflate_state *s;
	//    int lcodes, dcodes, blcodes; /* number of codes for each tree */
	{
	  var rank;                    /* index in bl_order */

	  //Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
	  //Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES,
	  //        "too many codes");
	  //Tracev((stderr, "\nbl counts: "));
	  send_bits(s, lcodes-257, 5); /* not +255 as stated in appnote.txt */
	  send_bits(s, dcodes-1,   5);
	  send_bits(s, blcodes-4,  4); /* not -3 as stated in appnote.txt */
	  for (rank = 0; rank < blcodes; rank++) {
	    //Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
	    send_bits(s, s.bl_tree[bl_order[rank]*2 + 1]/*.Len*/, 3);
	  }
	  //Tracev((stderr, "\nbl tree: sent %ld", s->bits_sent));

	  send_tree(s, s.dyn_ltree, lcodes-1); /* literal tree */
	  //Tracev((stderr, "\nlit tree: sent %ld", s->bits_sent));

	  send_tree(s, s.dyn_dtree, dcodes-1); /* distance tree */
	  //Tracev((stderr, "\ndist tree: sent %ld", s->bits_sent));
	}


	/* ===========================================================================
	 * Check if the data type is TEXT or BINARY, using the following algorithm:
	 * - TEXT if the two conditions below are satisfied:
	 *    a) There are no non-portable control characters belonging to the
	 *       "black list" (0..6, 14..25, 28..31).
	 *    b) There is at least one printable character belonging to the
	 *       "white list" (9 {TAB}, 10 {LF}, 13 {CR}, 32..255).
	 * - BINARY otherwise.
	 * - The following partially-portable control characters form a
	 *   "gray list" that is ignored in this detection algorithm:
	 *   (7 {BEL}, 8 {BS}, 11 {VT}, 12 {FF}, 26 {SUB}, 27 {ESC}).
	 * IN assertion: the fields Freq of dyn_ltree are set.
	 */
	function detect_data_type(s) {
	  /* black_mask is the bit mask of black-listed bytes
	   * set bits 0..6, 14..25, and 28..31
	   * 0xf3ffc07f = binary 11110011111111111100000001111111
	   */
	  var black_mask = 0xf3ffc07f;
	  var n;

	  /* Check for non-textual ("black-listed") bytes. */
	  for (n = 0; n <= 31; n++, black_mask >>>= 1) {
	    if ((black_mask & 1) && (s.dyn_ltree[n*2]/*.Freq*/ !== 0)) {
	      return Z_BINARY;
	    }
	  }

	  /* Check for textual ("white-listed") bytes. */
	  if (s.dyn_ltree[9 * 2]/*.Freq*/ !== 0 || s.dyn_ltree[10 * 2]/*.Freq*/ !== 0 ||
	      s.dyn_ltree[13 * 2]/*.Freq*/ !== 0) {
	    return Z_TEXT;
	  }
	  for (n = 32; n < LITERALS; n++) {
	    if (s.dyn_ltree[n * 2]/*.Freq*/ !== 0) {
	      return Z_TEXT;
	    }
	  }

	  /* There are no "black-listed" or "white-listed" bytes:
	   * this stream either is empty or has tolerated ("gray-listed") bytes only.
	   */
	  return Z_BINARY;
	}


	var static_init_done = false;

	/* ===========================================================================
	 * Initialize the tree data structures for a new zlib stream.
	 */
	function _tr_init(s)
	{

	  if (!static_init_done) {
	    tr_static_init();
	    static_init_done = true;
	  }

	  s.l_desc  = new TreeDesc(s.dyn_ltree, static_l_desc);
	  s.d_desc  = new TreeDesc(s.dyn_dtree, static_d_desc);
	  s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);

	  s.bi_buf = 0;
	  s.bi_valid = 0;

	  /* Initialize the first block of the first file: */
	  init_block(s);
	}


	/* ===========================================================================
	 * Send a stored block
	 */
	function _tr_stored_block(s, buf, stored_len, last)
	//DeflateState *s;
	//charf *buf;       /* input block */
	//ulg stored_len;   /* length of input block */
	//int last;         /* one if this is the last block for a file */
	{
	  send_bits(s, (STORED_BLOCK<<1)+(last ? 1 : 0), 3);    /* send block type */
	  copy_block(s, buf, stored_len, true); /* with header */
	}


	/* ===========================================================================
	 * Send one empty static block to give enough lookahead for inflate.
	 * This takes 10 bits, of which 7 may remain in the bit buffer.
	 */
	function _tr_align(s) {
	  send_bits(s, STATIC_TREES<<1, 3);
	  send_code(s, END_BLOCK, static_ltree);
	  bi_flush(s);
	}


	/* ===========================================================================
	 * Determine the best encoding for the current block: dynamic trees, static
	 * trees or store, and output the encoded block to the zip file.
	 */
	function _tr_flush_block(s, buf, stored_len, last)
	//DeflateState *s;
	//charf *buf;       /* input block, or NULL if too old */
	//ulg stored_len;   /* length of input block */
	//int last;         /* one if this is the last block for a file */
	{
	  var opt_lenb, static_lenb;  /* opt_len and static_len in bytes */
	  var max_blindex = 0;        /* index of last bit length code of non zero freq */

	  /* Build the Huffman trees unless a stored block is forced */
	  if (s.level > 0) {

	    /* Check if the file is binary or text */
	    if (s.strm.data_type === Z_UNKNOWN) {
	      s.strm.data_type = detect_data_type(s);
	    }

	    /* Construct the literal and distance trees */
	    build_tree(s, s.l_desc);
	    // Tracev((stderr, "\nlit data: dyn %ld, stat %ld", s->opt_len,
	    //        s->static_len));

	    build_tree(s, s.d_desc);
	    // Tracev((stderr, "\ndist data: dyn %ld, stat %ld", s->opt_len,
	    //        s->static_len));
	    /* At this point, opt_len and static_len are the total bit lengths of
	     * the compressed block data, excluding the tree representations.
	     */

	    /* Build the bit length tree for the above two trees, and get the index
	     * in bl_order of the last bit length code to send.
	     */
	    max_blindex = build_bl_tree(s);

	    /* Determine the best encoding. Compute the block lengths in bytes. */
	    opt_lenb = (s.opt_len+3+7) >>> 3;
	    static_lenb = (s.static_len+3+7) >>> 3;

	    // Tracev((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u ",
	    //        opt_lenb, s->opt_len, static_lenb, s->static_len, stored_len,
	    //        s->last_lit));

	    if (static_lenb <= opt_lenb) { opt_lenb = static_lenb; }

	  } else {
	    // Assert(buf != (char*)0, "lost buf");
	    opt_lenb = static_lenb = stored_len + 5; /* force a stored block */
	  }

	  if ((stored_len+4 <= opt_lenb) && (buf !== -1)) {
	    /* 4: two words for the lengths */

	    /* The test buf != NULL is only necessary if LIT_BUFSIZE > WSIZE.
	     * Otherwise we can't have processed more than WSIZE input bytes since
	     * the last block flush, because compression would have been
	     * successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
	     * transform a block into a stored block.
	     */
	    _tr_stored_block(s, buf, stored_len, last);

	  } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {

	    send_bits(s, (STATIC_TREES<<1) + (last ? 1 : 0), 3);
	    compress_block(s, static_ltree, static_dtree);

	  } else {
	    send_bits(s, (DYN_TREES<<1) + (last ? 1 : 0), 3);
	    send_all_trees(s, s.l_desc.max_code+1, s.d_desc.max_code+1, max_blindex+1);
	    compress_block(s, s.dyn_ltree, s.dyn_dtree);
	  }
	  // Assert (s->compressed_len == s->bits_sent, "bad compressed size");
	  /* The above check is made mod 2^32, for files larger than 512 MB
	   * and uLong implemented on 32 bits.
	   */
	  init_block(s);

	  if (last) {
	    bi_windup(s);
	  }
	  // Tracev((stderr,"\ncomprlen %lu(%lu) ", s->compressed_len>>3,
	  //       s->compressed_len-7*last));
	}

	/* ===========================================================================
	 * Save the match info and tally the frequency counts. Return true if
	 * the current block must be flushed.
	 */
	function _tr_tally(s, dist, lc)
	//    deflate_state *s;
	//    unsigned dist;  /* distance of matched string */
	//    unsigned lc;    /* match length-MIN_MATCH or unmatched char (if dist==0) */
	{
	  //var out_length, in_length, dcode;

	  s.pending_buf[s.d_buf + s.last_lit * 2]     = (dist >>> 8) & 0xff;
	  s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 0xff;

	  s.pending_buf[s.l_buf + s.last_lit] = lc & 0xff;
	  s.last_lit++;

	  if (dist === 0) {
	    /* lc is the unmatched char */
	    s.dyn_ltree[lc*2]/*.Freq*/++;
	  } else {
	    s.matches++;
	    /* Here, lc is the match length - MIN_MATCH */
	    dist--;             /* dist = match distance - 1 */
	    //Assert((ush)dist < (ush)MAX_DIST(s) &&
	    //       (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) &&
	    //       (ush)d_code(dist) < (ush)D_CODES,  "_tr_tally: bad match");

	    s.dyn_ltree[(_length_code[lc]+LITERALS+1) * 2]/*.Freq*/++;
	    s.dyn_dtree[d_code(dist) * 2]/*.Freq*/++;
	  }

	// (!) This block is disabled in zlib defailts,
	// don't enable it for binary compatibility

	//#ifdef TRUNCATE_BLOCK
	//  /* Try to guess if it is profitable to stop the current block here */
	//  if ((s.last_lit & 0x1fff) === 0 && s.level > 2) {
	//    /* Compute an upper bound for the compressed length */
	//    out_length = s.last_lit*8;
	//    in_length = s.strstart - s.block_start;
	//
	//    for (dcode = 0; dcode < D_CODES; dcode++) {
	//      out_length += s.dyn_dtree[dcode*2]/*.Freq*/ * (5 + extra_dbits[dcode]);
	//    }
	//    out_length >>>= 3;
	//    //Tracev((stderr,"\nlast_lit %u, in %ld, out ~%ld(%ld%%) ",
	//    //       s->last_lit, in_length, out_length,
	//    //       100L - out_length*100L/in_length));
	//    if (s.matches < (s.last_lit>>1)/*int /2*/ && out_length < (in_length>>1)/*int /2*/) {
	//      return true;
	//    }
	//  }
	//#endif

	  return (s.last_lit === s.lit_bufsize-1);
	  /* We avoid equality with lit_bufsize because of wraparound at 64K
	   * on 16 bit machines and because stored blocks are restricted to
	   * 64K-1 bytes.
	   */
	}

	exports._tr_init  = _tr_init;
	exports._tr_stored_block = _tr_stored_block;
	exports._tr_flush_block  = _tr_flush_block;
	exports._tr_tally = _tr_tally;
	exports._tr_align = _tr_align;
	},{"../utils/common":2}],12:[function(_dereq_,module,exports){
	'use strict';


	function ZStream() {
	  /* next input byte */
	  this.input = null; // JS specific, because we have no pointers
	  this.next_in = 0;
	  /* number of bytes available at input */
	  this.avail_in = 0;
	  /* total number of input bytes read so far */
	  this.total_in = 0;
	  /* next output byte should be put there */
	  this.output = null; // JS specific, because we have no pointers
	  this.next_out = 0;
	  /* remaining free space at output */
	  this.avail_out = 0;
	  /* total number of bytes output so far */
	  this.total_out = 0;
	  /* last error message, NULL if no error */
	  this.msg = ''/*Z_NULL*/;
	  /* not visible by applications */
	  this.state = null;
	  /* best guess about the data type: binary or text */
	  this.data_type = 2/*Z_UNKNOWN*/;
	  /* adler32 value of the uncompressed data */
	  this.adler = 0;
	}

	module.exports = ZStream;
	},{}],13:[function(_dereq_,module,exports){
	(function (process,Buffer){
	var msg = _dereq_('pako/lib/zlib/messages');
	var zstream = _dereq_('pako/lib/zlib/zstream');
	var zlib_deflate = _dereq_('pako/lib/zlib/deflate.js');
	var zlib_inflate = _dereq_('pako/lib/zlib/inflate.js');
	var constants = _dereq_('pako/lib/zlib/constants');

	for (var key in constants) {
	  exports[key] = constants[key];
	}

	// zlib modes
	exports.NONE = 0;
	exports.DEFLATE = 1;
	exports.INFLATE = 2;
	exports.GZIP = 3;
	exports.GUNZIP = 4;
	exports.DEFLATERAW = 5;
	exports.INFLATERAW = 6;
	exports.UNZIP = 7;

	/**
	 * Emulate Node's zlib C++ layer for use by the JS layer in index.js
	 */
	function Zlib(mode) {
	  if (mode < exports.DEFLATE || mode > exports.UNZIP)
	    throw new TypeError("Bad argument");
	    
	  this.mode = mode;
	  this.init_done = false;
	  this.write_in_progress = false;
	  this.pending_close = false;
	  this.windowBits = 0;
	  this.level = 0;
	  this.memLevel = 0;
	  this.strategy = 0;
	  this.dictionary = null;
	}

	Zlib.prototype.init = function(windowBits, level, memLevel, strategy, dictionary) {
	  this.windowBits = windowBits;
	  this.level = level;
	  this.memLevel = memLevel;
	  this.strategy = strategy;
	  // dictionary not supported.
	  
	  if (this.mode === exports.GZIP || this.mode === exports.GUNZIP)
	    this.windowBits += 16;
	    
	  if (this.mode === exports.UNZIP)
	    this.windowBits += 32;
	    
	  if (this.mode === exports.DEFLATERAW || this.mode === exports.INFLATERAW)
	    this.windowBits = -this.windowBits;
	    
	  this.strm = new zstream();
	  
	  switch (this.mode) {
	    case exports.DEFLATE:
	    case exports.GZIP:
	    case exports.DEFLATERAW:
	      var status = zlib_deflate.deflateInit2(
	        this.strm,
	        this.level,
	        exports.Z_DEFLATED,
	        this.windowBits,
	        this.memLevel,
	        this.strategy
	      );
	      break;
	    case exports.INFLATE:
	    case exports.GUNZIP:
	    case exports.INFLATERAW:
	    case exports.UNZIP:
	      var status  = zlib_inflate.inflateInit2(
	        this.strm,
	        this.windowBits
	      );
	      break;
	    default:
	      throw new Error("Unknown mode " + this.mode);
	  }
	  
	  if (status !== exports.Z_OK) {
	    this._error(status);
	    return;
	  }
	  
	  this.write_in_progress = false;
	  this.init_done = true;
	};

	Zlib.prototype.params = function() {
	  throw new Error("deflateParams Not supported");
	};

	Zlib.prototype._writeCheck = function() {
	  if (!this.init_done)
	    throw new Error("write before init");
	    
	  if (this.mode === exports.NONE)
	    throw new Error("already finalized");
	    
	  if (this.write_in_progress)
	    throw new Error("write already in progress");
	    
	  if (this.pending_close)
	    throw new Error("close is pending");
	};

	Zlib.prototype.write = function(flush, input, in_off, in_len, out, out_off, out_len) {    
	  this._writeCheck();
	  this.write_in_progress = true;
	  
	  var self = this;
	  process.nextTick(function() {
	    self.write_in_progress = false;
	    var res = self._write(flush, input, in_off, in_len, out, out_off, out_len);
	    self.callback(res[0], res[1]);
	    
	    if (self.pending_close)
	      self.close();
	  });
	  
	  return this;
	};

	// set method for Node buffers, used by pako
	function bufferSet(data, offset) {
	  for (var i = 0; i < data.length; i++) {
	    this[offset + i] = data[i];
	  }
	}

	Zlib.prototype.writeSync = function(flush, input, in_off, in_len, out, out_off, out_len) {
	  this._writeCheck();
	  return this._write(flush, input, in_off, in_len, out, out_off, out_len);
	};

	Zlib.prototype._write = function(flush, input, in_off, in_len, out, out_off, out_len) {
	  this.write_in_progress = true;
	  
	  if (flush !== exports.Z_NO_FLUSH &&
	      flush !== exports.Z_PARTIAL_FLUSH &&
	      flush !== exports.Z_SYNC_FLUSH &&
	      flush !== exports.Z_FULL_FLUSH &&
	      flush !== exports.Z_FINISH &&
	      flush !== exports.Z_BLOCK) {
	    throw new Error("Invalid flush value");
	  }
	  
	  if (input == null) {
	    input = new Buffer(0);
	    in_len = 0;
	    in_off = 0;
	  }
	  
	  if (out._set)
	    out.set = out._set;
	  else
	    out.set = bufferSet;
	  
	  var strm = this.strm;
	  strm.avail_in = in_len;
	  strm.input = input;
	  strm.next_in = in_off;
	  strm.avail_out = out_len;
	  strm.output = out;
	  strm.next_out = out_off;
	  
	  switch (this.mode) {
	    case exports.DEFLATE:
	    case exports.GZIP:
	    case exports.DEFLATERAW:
	      var status = zlib_deflate.deflate(strm, flush);
	      break;
	    case exports.UNZIP:
	    case exports.INFLATE:
	    case exports.GUNZIP:
	    case exports.INFLATERAW:
	      var status = zlib_inflate.inflate(strm, flush);
	      break;
	    default:
	      throw new Error("Unknown mode " + this.mode);
	  }
	  
	  if (status !== exports.Z_STREAM_END && status !== exports.Z_OK) {
	    this._error(status);
	  }
	  
	  this.write_in_progress = false;
	  return [strm.avail_in, strm.avail_out];
	};

	Zlib.prototype.close = function() {
	  if (this.write_in_progress) {
	    this.pending_close = true;
	    return;
	  }
	  
	  this.pending_close = false;
	  
	  if (this.mode === exports.DEFLATE || this.mode === exports.GZIP || this.mode === exports.DEFLATERAW) {
	    zlib_deflate.deflateEnd(this.strm);
	  } else {
	    zlib_inflate.inflateEnd(this.strm);
	  }
	  
	  this.mode = exports.NONE;
	};

	Zlib.prototype.reset = function() {
	  switch (this.mode) {
	    case exports.DEFLATE:
	    case exports.DEFLATERAW:
	      var status = zlib_deflate.deflateReset(this.strm);
	      break;
	    case exports.INFLATE:
	    case exports.INFLATERAW:
	      var status = zlib_inflate.inflateReset(this.strm);
	      break;
	  }
	  
	  if (status !== exports.Z_OK) {
	    this._error(status);
	  }
	};

	Zlib.prototype._error = function(status) {
	  this.onerror(msg[status] + ': ' + this.strm.msg, status);
	  
	  this.write_in_progress = false;
	  if (this.pending_close)
	    this.close();
	};

	exports.Zlib = Zlib;

	}).call(this,_dereq_("+xKvab"),_dereq_("buffer").Buffer)
	},{"+xKvab":20,"buffer":15,"pako/lib/zlib/constants":4,"pako/lib/zlib/deflate.js":6,"pako/lib/zlib/inflate.js":8,"pako/lib/zlib/messages":10,"pako/lib/zlib/zstream":12}],14:[function(_dereq_,module,exports){
	(function (process,Buffer){
	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var Transform = _dereq_('_stream_transform');

	var binding = _dereq_('./binding');
	var util = _dereq_('util');
	var assert = _dereq_('assert').ok;

	// zlib doesn't provide these, so kludge them in following the same
	// const naming scheme zlib uses.
	binding.Z_MIN_WINDOWBITS = 8;
	binding.Z_MAX_WINDOWBITS = 15;
	binding.Z_DEFAULT_WINDOWBITS = 15;

	// fewer than 64 bytes per chunk is stupid.
	// technically it could work with as few as 8, but even 64 bytes
	// is absurdly low.  Usually a MB or more is best.
	binding.Z_MIN_CHUNK = 64;
	binding.Z_MAX_CHUNK = Infinity;
	binding.Z_DEFAULT_CHUNK = (16 * 1024);

	binding.Z_MIN_MEMLEVEL = 1;
	binding.Z_MAX_MEMLEVEL = 9;
	binding.Z_DEFAULT_MEMLEVEL = 8;

	binding.Z_MIN_LEVEL = -1;
	binding.Z_MAX_LEVEL = 9;
	binding.Z_DEFAULT_LEVEL = binding.Z_DEFAULT_COMPRESSION;

	// expose all the zlib constants
	Object.keys(binding).forEach(function(k) {
	  if (k.match(/^Z/)) exports[k] = binding[k];
	});

	// translation table for return codes.
	exports.codes = {
	  Z_OK: binding.Z_OK,
	  Z_STREAM_END: binding.Z_STREAM_END,
	  Z_NEED_DICT: binding.Z_NEED_DICT,
	  Z_ERRNO: binding.Z_ERRNO,
	  Z_STREAM_ERROR: binding.Z_STREAM_ERROR,
	  Z_DATA_ERROR: binding.Z_DATA_ERROR,
	  Z_MEM_ERROR: binding.Z_MEM_ERROR,
	  Z_BUF_ERROR: binding.Z_BUF_ERROR,
	  Z_VERSION_ERROR: binding.Z_VERSION_ERROR
	};

	Object.keys(exports.codes).forEach(function(k) {
	  exports.codes[exports.codes[k]] = k;
	});

	exports.Deflate = Deflate;
	exports.Inflate = Inflate;
	exports.Gzip = Gzip;
	exports.Gunzip = Gunzip;
	exports.DeflateRaw = DeflateRaw;
	exports.InflateRaw = InflateRaw;
	exports.Unzip = Unzip;

	exports.createDeflate = function(o) {
	  return new Deflate(o);
	};

	exports.createInflate = function(o) {
	  return new Inflate(o);
	};

	exports.createDeflateRaw = function(o) {
	  return new DeflateRaw(o);
	};

	exports.createInflateRaw = function(o) {
	  return new InflateRaw(o);
	};

	exports.createGzip = function(o) {
	  return new Gzip(o);
	};

	exports.createGunzip = function(o) {
	  return new Gunzip(o);
	};

	exports.createUnzip = function(o) {
	  return new Unzip(o);
	};


	// Convenience methods.
	// compress/decompress a string or buffer in one step.
	exports.deflate = function(buffer, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  return zlibBuffer(new Deflate(opts), buffer, callback);
	};

	exports.deflateSync = function(buffer, opts) {
	  return zlibBufferSync(new Deflate(opts), buffer);
	};

	exports.gzip = function(buffer, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  return zlibBuffer(new Gzip(opts), buffer, callback);
	};

	exports.gzipSync = function(buffer, opts) {
	  return zlibBufferSync(new Gzip(opts), buffer);
	};

	exports.deflateRaw = function(buffer, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  return zlibBuffer(new DeflateRaw(opts), buffer, callback);
	};

	exports.deflateRawSync = function(buffer, opts) {
	  return zlibBufferSync(new DeflateRaw(opts), buffer);
	};

	exports.unzip = function(buffer, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  return zlibBuffer(new Unzip(opts), buffer, callback);
	};

	exports.unzipSync = function(buffer, opts) {
	  return zlibBufferSync(new Unzip(opts), buffer);
	};

	exports.inflate = function(buffer, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  return zlibBuffer(new Inflate(opts), buffer, callback);
	};

	exports.inflateSync = function(buffer, opts) {
	  return zlibBufferSync(new Inflate(opts), buffer);
	};

	exports.gunzip = function(buffer, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  return zlibBuffer(new Gunzip(opts), buffer, callback);
	};

	exports.gunzipSync = function(buffer, opts) {
	  return zlibBufferSync(new Gunzip(opts), buffer);
	};

	exports.inflateRaw = function(buffer, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  return zlibBuffer(new InflateRaw(opts), buffer, callback);
	};

	exports.inflateRawSync = function(buffer, opts) {
	  return zlibBufferSync(new InflateRaw(opts), buffer);
	};

	function zlibBuffer(engine, buffer, callback) {
	  var buffers = [];
	  var nread = 0;

	  engine.on('error', onError);
	  engine.on('end', onEnd);

	  engine.end(buffer);
	  flow();

	  function flow() {
	    var chunk;
	    while (null !== (chunk = engine.read())) {
	      buffers.push(chunk);
	      nread += chunk.length;
	    }
	    engine.once('readable', flow);
	  }

	  function onError(err) {
	    engine.removeListener('end', onEnd);
	    engine.removeListener('readable', flow);
	    callback(err);
	  }

	  function onEnd() {
	    var buf = Buffer.concat(buffers, nread);
	    buffers = [];
	    callback(null, buf);
	    engine.close();
	  }
	}

	function zlibBufferSync(engine, buffer) {
	  if (typeof buffer === 'string')
	    buffer = new Buffer(buffer);
	  if (!Buffer.isBuffer(buffer))
	    throw new TypeError('Not a string or buffer');

	  var flushFlag = binding.Z_FINISH;

	  return engine._processChunk(buffer, flushFlag);
	}

	// generic zlib
	// minimal 2-byte header
	function Deflate(opts) {
	  if (!(this instanceof Deflate)) return new Deflate(opts);
	  Zlib.call(this, opts, binding.DEFLATE);
	}

	function Inflate(opts) {
	  if (!(this instanceof Inflate)) return new Inflate(opts);
	  Zlib.call(this, opts, binding.INFLATE);
	}



	// gzip - bigger header, same deflate compression
	function Gzip(opts) {
	  if (!(this instanceof Gzip)) return new Gzip(opts);
	  Zlib.call(this, opts, binding.GZIP);
	}

	function Gunzip(opts) {
	  if (!(this instanceof Gunzip)) return new Gunzip(opts);
	  Zlib.call(this, opts, binding.GUNZIP);
	}



	// raw - no header
	function DeflateRaw(opts) {
	  if (!(this instanceof DeflateRaw)) return new DeflateRaw(opts);
	  Zlib.call(this, opts, binding.DEFLATERAW);
	}

	function InflateRaw(opts) {
	  if (!(this instanceof InflateRaw)) return new InflateRaw(opts);
	  Zlib.call(this, opts, binding.INFLATERAW);
	}


	// auto-detect header.
	function Unzip(opts) {
	  if (!(this instanceof Unzip)) return new Unzip(opts);
	  Zlib.call(this, opts, binding.UNZIP);
	}


	// the Zlib class they all inherit from
	// This thing manages the queue of requests, and returns
	// true or false if there is anything in the queue when
	// you call the .write() method.

	function Zlib(opts, mode) {
	  this._opts = opts = opts || {};
	  this._chunkSize = opts.chunkSize || exports.Z_DEFAULT_CHUNK;

	  Transform.call(this, opts);

	  if (opts.flush) {
	    if (opts.flush !== binding.Z_NO_FLUSH &&
	        opts.flush !== binding.Z_PARTIAL_FLUSH &&
	        opts.flush !== binding.Z_SYNC_FLUSH &&
	        opts.flush !== binding.Z_FULL_FLUSH &&
	        opts.flush !== binding.Z_FINISH &&
	        opts.flush !== binding.Z_BLOCK) {
	      throw new Error('Invalid flush flag: ' + opts.flush);
	    }
	  }
	  this._flushFlag = opts.flush || binding.Z_NO_FLUSH;

	  if (opts.chunkSize) {
	    if (opts.chunkSize < exports.Z_MIN_CHUNK ||
	        opts.chunkSize > exports.Z_MAX_CHUNK) {
	      throw new Error('Invalid chunk size: ' + opts.chunkSize);
	    }
	  }

	  if (opts.windowBits) {
	    if (opts.windowBits < exports.Z_MIN_WINDOWBITS ||
	        opts.windowBits > exports.Z_MAX_WINDOWBITS) {
	      throw new Error('Invalid windowBits: ' + opts.windowBits);
	    }
	  }

	  if (opts.level) {
	    if (opts.level < exports.Z_MIN_LEVEL ||
	        opts.level > exports.Z_MAX_LEVEL) {
	      throw new Error('Invalid compression level: ' + opts.level);
	    }
	  }

	  if (opts.memLevel) {
	    if (opts.memLevel < exports.Z_MIN_MEMLEVEL ||
	        opts.memLevel > exports.Z_MAX_MEMLEVEL) {
	      throw new Error('Invalid memLevel: ' + opts.memLevel);
	    }
	  }

	  if (opts.strategy) {
	    if (opts.strategy != exports.Z_FILTERED &&
	        opts.strategy != exports.Z_HUFFMAN_ONLY &&
	        opts.strategy != exports.Z_RLE &&
	        opts.strategy != exports.Z_FIXED &&
	        opts.strategy != exports.Z_DEFAULT_STRATEGY) {
	      throw new Error('Invalid strategy: ' + opts.strategy);
	    }
	  }

	  if (opts.dictionary) {
	    if (!Buffer.isBuffer(opts.dictionary)) {
	      throw new Error('Invalid dictionary: it should be a Buffer instance');
	    }
	  }

	  this._binding = new binding.Zlib(mode);

	  var self = this;
	  this._hadError = false;
	  this._binding.onerror = function(message, errno) {
	    // there is no way to cleanly recover.
	    // continuing only obscures problems.
	    self._binding = null;
	    self._hadError = true;

	    var error = new Error(message);
	    error.errno = errno;
	    error.code = exports.codes[errno];
	    self.emit('error', error);
	  };

	  var level = exports.Z_DEFAULT_COMPRESSION;
	  if (typeof opts.level === 'number') level = opts.level;

	  var strategy = exports.Z_DEFAULT_STRATEGY;
	  if (typeof opts.strategy === 'number') strategy = opts.strategy;

	  this._binding.init(opts.windowBits || exports.Z_DEFAULT_WINDOWBITS,
	                     level,
	                     opts.memLevel || exports.Z_DEFAULT_MEMLEVEL,
	                     strategy,
	                     opts.dictionary);

	  this._buffer = new Buffer(this._chunkSize);
	  this._offset = 0;
	  this._closed = false;
	  this._level = level;
	  this._strategy = strategy;

	  this.once('end', this.close);
	}

	util.inherits(Zlib, Transform);

	Zlib.prototype.params = function(level, strategy, callback) {
	  if (level < exports.Z_MIN_LEVEL ||
	      level > exports.Z_MAX_LEVEL) {
	    throw new RangeError('Invalid compression level: ' + level);
	  }
	  if (strategy != exports.Z_FILTERED &&
	      strategy != exports.Z_HUFFMAN_ONLY &&
	      strategy != exports.Z_RLE &&
	      strategy != exports.Z_FIXED &&
	      strategy != exports.Z_DEFAULT_STRATEGY) {
	    throw new TypeError('Invalid strategy: ' + strategy);
	  }

	  if (this._level !== level || this._strategy !== strategy) {
	    var self = this;
	    this.flush(binding.Z_SYNC_FLUSH, function() {
	      self._binding.params(level, strategy);
	      if (!self._hadError) {
	        self._level = level;
	        self._strategy = strategy;
	        if (callback) callback();
	      }
	    });
	  } else {
	    process.nextTick(callback);
	  }
	};

	Zlib.prototype.reset = function() {
	  return this._binding.reset();
	};

	// This is the _flush function called by the transform class,
	// internally, when the last chunk has been written.
	Zlib.prototype._flush = function(callback) {
	  this._transform(new Buffer(0), '', callback);
	};

	Zlib.prototype.flush = function(kind, callback) {
	  var ws = this._writableState;

	  if (typeof kind === 'function' || (kind === void 0 && !callback)) {
	    callback = kind;
	    kind = binding.Z_FULL_FLUSH;
	  }

	  if (ws.ended) {
	    if (callback)
	      process.nextTick(callback);
	  } else if (ws.ending) {
	    if (callback)
	      this.once('end', callback);
	  } else if (ws.needDrain) {
	    var self = this;
	    this.once('drain', function() {
	      self.flush(callback);
	    });
	  } else {
	    this._flushFlag = kind;
	    this.write(new Buffer(0), '', callback);
	  }
	};

	Zlib.prototype.close = function(callback) {
	  if (callback)
	    process.nextTick(callback);

	  if (this._closed)
	    return;

	  this._closed = true;

	  this._binding.close();

	  var self = this;
	  process.nextTick(function() {
	    self.emit('close');
	  });
	};

	Zlib.prototype._transform = function(chunk, encoding, cb) {
	  var flushFlag;
	  var ws = this._writableState;
	  var ending = ws.ending || ws.ended;
	  var last = ending && (!chunk || ws.length === chunk.length);

	  if (!chunk === null && !Buffer.isBuffer(chunk))
	    return cb(new Error('invalid input'));

	  // If it's the last chunk, or a final flush, we use the Z_FINISH flush flag.
	  // If it's explicitly flushing at some other time, then we use
	  // Z_FULL_FLUSH. Otherwise, use Z_NO_FLUSH for maximum compression
	  // goodness.
	  if (last)
	    flushFlag = binding.Z_FINISH;
	  else {
	    flushFlag = this._flushFlag;
	    // once we've flushed the last of the queue, stop flushing and
	    // go back to the normal behavior.
	    if (chunk.length >= ws.length) {
	      this._flushFlag = this._opts.flush || binding.Z_NO_FLUSH;
	    }
	  }

	  var self = this;
	  this._processChunk(chunk, flushFlag, cb);
	};

	Zlib.prototype._processChunk = function(chunk, flushFlag, cb) {
	  var availInBefore = chunk && chunk.length;
	  var availOutBefore = this._chunkSize - this._offset;
	  var inOff = 0;

	  var self = this;

	  var async = typeof cb === 'function';

	  if (!async) {
	    var buffers = [];
	    var nread = 0;

	    var error;
	    this.on('error', function(er) {
	      error = er;
	    });

	    do {
	      var res = this._binding.writeSync(flushFlag,
	                                        chunk, // in
	                                        inOff, // in_off
	                                        availInBefore, // in_len
	                                        this._buffer, // out
	                                        this._offset, //out_off
	                                        availOutBefore); // out_len
	    } while (!this._hadError && callback(res[0], res[1]));

	    if (this._hadError) {
	      throw error;
	    }

	    var buf = Buffer.concat(buffers, nread);
	    this.close();

	    return buf;
	  }

	  var req = this._binding.write(flushFlag,
	                                chunk, // in
	                                inOff, // in_off
	                                availInBefore, // in_len
	                                this._buffer, // out
	                                this._offset, //out_off
	                                availOutBefore); // out_len

	  req.buffer = chunk;
	  req.callback = callback;

	  function callback(availInAfter, availOutAfter) {
	    if (self._hadError)
	      return;

	    var have = availOutBefore - availOutAfter;
	    assert(have >= 0, 'have should not go down');

	    if (have > 0) {
	      var out = self._buffer.slice(self._offset, self._offset + have);
	      self._offset += have;
	      // serve some output to the consumer.
	      if (async) {
	        self.push(out);
	      } else {
	        buffers.push(out);
	        nread += out.length;
	      }
	    }

	    // exhausted the output buffer, or used all the input create a new one.
	    if (availOutAfter === 0 || self._offset >= self._chunkSize) {
	      availOutBefore = self._chunkSize;
	      self._offset = 0;
	      self._buffer = new Buffer(self._chunkSize);
	    }

	    if (availOutAfter === 0) {
	      // Not actually done.  Need to reprocess.
	      // Also, update the availInBefore to the availInAfter value,
	      // so that if we have to hit it a third (fourth, etc.) time,
	      // it'll have the correct byte counts.
	      inOff += (availInBefore - availInAfter);
	      availInBefore = availInAfter;

	      if (!async)
	        return true;

	      var newReq = self._binding.write(flushFlag,
	                                       chunk,
	                                       inOff,
	                                       availInBefore,
	                                       self._buffer,
	                                       self._offset,
	                                       self._chunkSize);
	      newReq.callback = callback; // this same function
	      newReq.buffer = chunk;
	      return;
	    }

	    if (!async)
	      return false;

	    // finished with the chunk.
	    cb();
	  }
	};

	util.inherits(Deflate, Zlib);
	util.inherits(Inflate, Zlib);
	util.inherits(Gzip, Zlib);
	util.inherits(Gunzip, Zlib);
	util.inherits(DeflateRaw, Zlib);
	util.inherits(InflateRaw, Zlib);
	util.inherits(Unzip, Zlib);

	}).call(this,_dereq_("+xKvab"),_dereq_("buffer").Buffer)
	},{"+xKvab":20,"./binding":13,"_stream_transform":26,"assert":1,"buffer":15,"util":30}],15:[function(_dereq_,module,exports){
	/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */

	var base64 = _dereq_('base64-js')
	var ieee754 = _dereq_('ieee754')

	exports.Buffer = Buffer
	exports.SlowBuffer = Buffer
	exports.INSPECT_MAX_BYTES = 50
	Buffer.poolSize = 8192

	/**
	 * If `Buffer._useTypedArrays`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (compatible down to IE6)
	 */
	Buffer._useTypedArrays = (function () {
	  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
	  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
	  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
	  // because we need to be able to add all the node Buffer API methods. This is an issue
	  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
	  try {
	    var buf = new ArrayBuffer(0)
	    var arr = new Uint8Array(buf)
	    arr.foo = function () { return 42 }
	    return 42 === arr.foo() &&
	        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
	  } catch (e) {
	    return false
	  }
	})()

	/**
	 * Class: Buffer
	 * =============
	 *
	 * The Buffer constructor returns instances of `Uint8Array` that are augmented
	 * with function properties for all the node `Buffer` API functions. We use
	 * `Uint8Array` so that square bracket notation works as expected -- it returns
	 * a single octet.
	 *
	 * By augmenting the instances, we can avoid modifying the `Uint8Array`
	 * prototype.
	 */
	function Buffer (subject, encoding, noZero) {
	  if (!(this instanceof Buffer))
	    return new Buffer(subject, encoding, noZero)

	  var type = typeof subject

	  // Workaround: node's base64 implementation allows for non-padded strings
	  // while base64-js does not.
	  if (encoding === 'base64' && type === 'string') {
	    subject = stringtrim(subject)
	    while (subject.length % 4 !== 0) {
	      subject = subject + '='
	    }
	  }

	  // Find the length
	  var length
	  if (type === 'number')
	    length = coerce(subject)
	  else if (type === 'string')
	    length = Buffer.byteLength(subject, encoding)
	  else if (type === 'object')
	    length = coerce(subject.length) // assume that object is array-like
	  else
	    throw new Error('First argument needs to be a number, array or string.')

	  var buf
	  if (Buffer._useTypedArrays) {
	    // Preferred: Return an augmented `Uint8Array` instance for best performance
	    buf = Buffer._augment(new Uint8Array(length))
	  } else {
	    // Fallback: Return THIS instance of Buffer (created by `new`)
	    buf = this
	    buf.length = length
	    buf._isBuffer = true
	  }

	  var i
	  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
	    // Speed optimization -- use set if we're copying from a typed array
	    buf._set(subject)
	  } else if (isArrayish(subject)) {
	    // Treat array-ish objects as a byte array
	    for (i = 0; i < length; i++) {
	      if (Buffer.isBuffer(subject))
	        buf[i] = subject.readUInt8(i)
	      else
	        buf[i] = subject[i]
	    }
	  } else if (type === 'string') {
	    buf.write(subject, 0, encoding)
	  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
	    for (i = 0; i < length; i++) {
	      buf[i] = 0
	    }
	  }

	  return buf
	}

	// STATIC METHODS
	// ==============

	Buffer.isEncoding = function (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'binary':
	    case 'base64':
	    case 'raw':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	}

	Buffer.isBuffer = function (b) {
	  return !!(b !== null && b !== undefined && b._isBuffer)
	}

	Buffer.byteLength = function (str, encoding) {
	  var ret
	  str = str + ''
	  switch (encoding || 'utf8') {
	    case 'hex':
	      ret = str.length / 2
	      break
	    case 'utf8':
	    case 'utf-8':
	      ret = utf8ToBytes(str).length
	      break
	    case 'ascii':
	    case 'binary':
	    case 'raw':
	      ret = str.length
	      break
	    case 'base64':
	      ret = base64ToBytes(str).length
	      break
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      ret = str.length * 2
	      break
	    default:
	      throw new Error('Unknown encoding')
	  }
	  return ret
	}

	Buffer.concat = function (list, totalLength) {
	  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
	      'list should be an Array.')

	  if (list.length === 0) {
	    return new Buffer(0)
	  } else if (list.length === 1) {
	    return list[0]
	  }

	  var i
	  if (typeof totalLength !== 'number') {
	    totalLength = 0
	    for (i = 0; i < list.length; i++) {
	      totalLength += list[i].length
	    }
	  }

	  var buf = new Buffer(totalLength)
	  var pos = 0
	  for (i = 0; i < list.length; i++) {
	    var item = list[i]
	    item.copy(buf, pos)
	    pos += item.length
	  }
	  return buf
	}

	// BUFFER INSTANCE METHODS
	// =======================

	function _hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0
	  var remaining = buf.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length
	  assert(strLen % 2 === 0, 'Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2
	  }
	  for (var i = 0; i < length; i++) {
	    var byte = parseInt(string.substr(i * 2, 2), 16)
	    assert(!isNaN(byte), 'Invalid hex string')
	    buf[offset + i] = byte
	  }
	  Buffer._charsWritten = i * 2
	  return i
	}

	function _utf8Write (buf, string, offset, length) {
	  var charsWritten = Buffer._charsWritten =
	    blitBuffer(utf8ToBytes(string), buf, offset, length)
	  return charsWritten
	}

	function _asciiWrite (buf, string, offset, length) {
	  var charsWritten = Buffer._charsWritten =
	    blitBuffer(asciiToBytes(string), buf, offset, length)
	  return charsWritten
	}

	function _binaryWrite (buf, string, offset, length) {
	  return _asciiWrite(buf, string, offset, length)
	}

	function _base64Write (buf, string, offset, length) {
	  var charsWritten = Buffer._charsWritten =
	    blitBuffer(base64ToBytes(string), buf, offset, length)
	  return charsWritten
	}

	function _utf16leWrite (buf, string, offset, length) {
	  var charsWritten = Buffer._charsWritten =
	    blitBuffer(utf16leToBytes(string), buf, offset, length)
	  return charsWritten
	}

	Buffer.prototype.write = function (string, offset, length, encoding) {
	  // Support both (string, offset, length, encoding)
	  // and the legacy (string, encoding, offset, length)
	  if (isFinite(offset)) {
	    if (!isFinite(length)) {
	      encoding = length
	      length = undefined
	    }
	  } else {  // legacy
	    var swap = encoding
	    encoding = offset
	    offset = length
	    length = swap
	  }

	  offset = Number(offset) || 0
	  var remaining = this.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }
	  encoding = String(encoding || 'utf8').toLowerCase()

	  var ret
	  switch (encoding) {
	    case 'hex':
	      ret = _hexWrite(this, string, offset, length)
	      break
	    case 'utf8':
	    case 'utf-8':
	      ret = _utf8Write(this, string, offset, length)
	      break
	    case 'ascii':
	      ret = _asciiWrite(this, string, offset, length)
	      break
	    case 'binary':
	      ret = _binaryWrite(this, string, offset, length)
	      break
	    case 'base64':
	      ret = _base64Write(this, string, offset, length)
	      break
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      ret = _utf16leWrite(this, string, offset, length)
	      break
	    default:
	      throw new Error('Unknown encoding')
	  }
	  return ret
	}

	Buffer.prototype.toString = function (encoding, start, end) {
	  var self = this

	  encoding = String(encoding || 'utf8').toLowerCase()
	  start = Number(start) || 0
	  end = (end !== undefined)
	    ? Number(end)
	    : end = self.length

	  // Fastpath empty strings
	  if (end === start)
	    return ''

	  var ret
	  switch (encoding) {
	    case 'hex':
	      ret = _hexSlice(self, start, end)
	      break
	    case 'utf8':
	    case 'utf-8':
	      ret = _utf8Slice(self, start, end)
	      break
	    case 'ascii':
	      ret = _asciiSlice(self, start, end)
	      break
	    case 'binary':
	      ret = _binarySlice(self, start, end)
	      break
	    case 'base64':
	      ret = _base64Slice(self, start, end)
	      break
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      ret = _utf16leSlice(self, start, end)
	      break
	    default:
	      throw new Error('Unknown encoding')
	  }
	  return ret
	}

	Buffer.prototype.toJSON = function () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	}

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function (target, target_start, start, end) {
	  var source = this

	  if (!start) start = 0
	  if (!end && end !== 0) end = this.length
	  if (!target_start) target_start = 0

	  // Copy 0 bytes; we're done
	  if (end === start) return
	  if (target.length === 0 || source.length === 0) return

	  // Fatal error conditions
	  assert(end >= start, 'sourceEnd < sourceStart')
	  assert(target_start >= 0 && target_start < target.length,
	      'targetStart out of bounds')
	  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
	  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length)
	    end = this.length
	  if (target.length - target_start < end - start)
	    end = target.length - target_start + start

	  var len = end - start

	  if (len < 100 || !Buffer._useTypedArrays) {
	    for (var i = 0; i < len; i++)
	      target[i + target_start] = this[i + start]
	  } else {
	    target._set(this.subarray(start, start + len), target_start)
	  }
	}

	function _base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function _utf8Slice (buf, start, end) {
	  var res = ''
	  var tmp = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    if (buf[i] <= 0x7F) {
	      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
	      tmp = ''
	    } else {
	      tmp += '%' + buf[i].toString(16)
	    }
	  }

	  return res + decodeUtf8Char(tmp)
	}

	function _asciiSlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++)
	    ret += String.fromCharCode(buf[i])
	  return ret
	}

	function _binarySlice (buf, start, end) {
	  return _asciiSlice(buf, start, end)
	}

	function _hexSlice (buf, start, end) {
	  var len = buf.length

	  if (!start || start < 0) start = 0
	  if (!end || end < 0 || end > len) end = len

	  var out = ''
	  for (var i = start; i < end; i++) {
	    out += toHex(buf[i])
	  }
	  return out
	}

	function _utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end)
	  var res = ''
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
	  }
	  return res
	}

	Buffer.prototype.slice = function (start, end) {
	  var len = this.length
	  start = clamp(start, len, 0)
	  end = clamp(end, len, len)

	  if (Buffer._useTypedArrays) {
	    return Buffer._augment(this.subarray(start, end))
	  } else {
	    var sliceLen = end - start
	    var newBuf = new Buffer(sliceLen, undefined, true)
	    for (var i = 0; i < sliceLen; i++) {
	      newBuf[i] = this[i + start]
	    }
	    return newBuf
	  }
	}

	// `get` will be removed in Node 0.13+
	Buffer.prototype.get = function (offset) {
	  console.log('.get() is deprecated. Access using array indexes instead.')
	  return this.readUInt8(offset)
	}

	// `set` will be removed in Node 0.13+
	Buffer.prototype.set = function (v, offset) {
	  console.log('.set() is deprecated. Access using array indexes instead.')
	  return this.writeUInt8(v, offset)
	}

	Buffer.prototype.readUInt8 = function (offset, noAssert) {
	  if (!noAssert) {
	    assert(offset !== undefined && offset !== null, 'missing offset')
	    assert(offset < this.length, 'Trying to read beyond buffer length')
	  }

	  if (offset >= this.length)
	    return

	  return this[offset]
	}

	function _readUInt16 (buf, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
	    assert(offset !== undefined && offset !== null, 'missing offset')
	    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
	  }

	  var len = buf.length
	  if (offset >= len)
	    return

	  var val
	  if (littleEndian) {
	    val = buf[offset]
	    if (offset + 1 < len)
	      val |= buf[offset + 1] << 8
	  } else {
	    val = buf[offset] << 8
	    if (offset + 1 < len)
	      val |= buf[offset + 1]
	  }
	  return val
	}

	Buffer.prototype.readUInt16LE = function (offset, noAssert) {
	  return _readUInt16(this, offset, true, noAssert)
	}

	Buffer.prototype.readUInt16BE = function (offset, noAssert) {
	  return _readUInt16(this, offset, false, noAssert)
	}

	function _readUInt32 (buf, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
	    assert(offset !== undefined && offset !== null, 'missing offset')
	    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
	  }

	  var len = buf.length
	  if (offset >= len)
	    return

	  var val
	  if (littleEndian) {
	    if (offset + 2 < len)
	      val = buf[offset + 2] << 16
	    if (offset + 1 < len)
	      val |= buf[offset + 1] << 8
	    val |= buf[offset]
	    if (offset + 3 < len)
	      val = val + (buf[offset + 3] << 24 >>> 0)
	  } else {
	    if (offset + 1 < len)
	      val = buf[offset + 1] << 16
	    if (offset + 2 < len)
	      val |= buf[offset + 2] << 8
	    if (offset + 3 < len)
	      val |= buf[offset + 3]
	    val = val + (buf[offset] << 24 >>> 0)
	  }
	  return val
	}

	Buffer.prototype.readUInt32LE = function (offset, noAssert) {
	  return _readUInt32(this, offset, true, noAssert)
	}

	Buffer.prototype.readUInt32BE = function (offset, noAssert) {
	  return _readUInt32(this, offset, false, noAssert)
	}

	Buffer.prototype.readInt8 = function (offset, noAssert) {
	  if (!noAssert) {
	    assert(offset !== undefined && offset !== null,
	        'missing offset')
	    assert(offset < this.length, 'Trying to read beyond buffer length')
	  }

	  if (offset >= this.length)
	    return

	  var neg = this[offset] & 0x80
	  if (neg)
	    return (0xff - this[offset] + 1) * -1
	  else
	    return this[offset]
	}

	function _readInt16 (buf, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
	    assert(offset !== undefined && offset !== null, 'missing offset')
	    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
	  }

	  var len = buf.length
	  if (offset >= len)
	    return

	  var val = _readUInt16(buf, offset, littleEndian, true)
	  var neg = val & 0x8000
	  if (neg)
	    return (0xffff - val + 1) * -1
	  else
	    return val
	}

	Buffer.prototype.readInt16LE = function (offset, noAssert) {
	  return _readInt16(this, offset, true, noAssert)
	}

	Buffer.prototype.readInt16BE = function (offset, noAssert) {
	  return _readInt16(this, offset, false, noAssert)
	}

	function _readInt32 (buf, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
	    assert(offset !== undefined && offset !== null, 'missing offset')
	    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
	  }

	  var len = buf.length
	  if (offset >= len)
	    return

	  var val = _readUInt32(buf, offset, littleEndian, true)
	  var neg = val & 0x80000000
	  if (neg)
	    return (0xffffffff - val + 1) * -1
	  else
	    return val
	}

	Buffer.prototype.readInt32LE = function (offset, noAssert) {
	  return _readInt32(this, offset, true, noAssert)
	}

	Buffer.prototype.readInt32BE = function (offset, noAssert) {
	  return _readInt32(this, offset, false, noAssert)
	}

	function _readFloat (buf, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
	    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
	  }

	  return ieee754.read(buf, offset, littleEndian, 23, 4)
	}

	Buffer.prototype.readFloatLE = function (offset, noAssert) {
	  return _readFloat(this, offset, true, noAssert)
	}

	Buffer.prototype.readFloatBE = function (offset, noAssert) {
	  return _readFloat(this, offset, false, noAssert)
	}

	function _readDouble (buf, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
	    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
	  }

	  return ieee754.read(buf, offset, littleEndian, 52, 8)
	}

	Buffer.prototype.readDoubleLE = function (offset, noAssert) {
	  return _readDouble(this, offset, true, noAssert)
	}

	Buffer.prototype.readDoubleBE = function (offset, noAssert) {
	  return _readDouble(this, offset, false, noAssert)
	}

	Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
	  if (!noAssert) {
	    assert(value !== undefined && value !== null, 'missing value')
	    assert(offset !== undefined && offset !== null, 'missing offset')
	    assert(offset < this.length, 'trying to write beyond buffer length')
	    verifuint(value, 0xff)
	  }

	  if (offset >= this.length) return

	  this[offset] = value
	}

	function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    assert(value !== undefined && value !== null, 'missing value')
	    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
	    assert(offset !== undefined && offset !== null, 'missing offset')
	    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
	    verifuint(value, 0xffff)
	  }

	  var len = buf.length
	  if (offset >= len)
	    return

	  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
	    buf[offset + i] =
	        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	            (littleEndian ? i : 1 - i) * 8
	  }
	}

	Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
	  _writeUInt16(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
	  _writeUInt16(this, value, offset, false, noAssert)
	}

	function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    assert(value !== undefined && value !== null, 'missing value')
	    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
	    assert(offset !== undefined && offset !== null, 'missing offset')
	    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
	    verifuint(value, 0xffffffff)
	  }

	  var len = buf.length
	  if (offset >= len)
	    return

	  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
	    buf[offset + i] =
	        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
	  }
	}

	Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
	  _writeUInt32(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
	  _writeUInt32(this, value, offset, false, noAssert)
	}

	Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
	  if (!noAssert) {
	    assert(value !== undefined && value !== null, 'missing value')
	    assert(offset !== undefined && offset !== null, 'missing offset')
	    assert(offset < this.length, 'Trying to write beyond buffer length')
	    verifsint(value, 0x7f, -0x80)
	  }

	  if (offset >= this.length)
	    return

	  if (value >= 0)
	    this.writeUInt8(value, offset, noAssert)
	  else
	    this.writeUInt8(0xff + value + 1, offset, noAssert)
	}

	function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    assert(value !== undefined && value !== null, 'missing value')
	    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
	    assert(offset !== undefined && offset !== null, 'missing offset')
	    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
	    verifsint(value, 0x7fff, -0x8000)
	  }

	  var len = buf.length
	  if (offset >= len)
	    return

	  if (value >= 0)
	    _writeUInt16(buf, value, offset, littleEndian, noAssert)
	  else
	    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
	}

	Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
	  _writeInt16(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
	  _writeInt16(this, value, offset, false, noAssert)
	}

	function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    assert(value !== undefined && value !== null, 'missing value')
	    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
	    assert(offset !== undefined && offset !== null, 'missing offset')
	    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
	    verifsint(value, 0x7fffffff, -0x80000000)
	  }

	  var len = buf.length
	  if (offset >= len)
	    return

	  if (value >= 0)
	    _writeUInt32(buf, value, offset, littleEndian, noAssert)
	  else
	    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
	}

	Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
	  _writeInt32(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
	  _writeInt32(this, value, offset, false, noAssert)
	}

	function _writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    assert(value !== undefined && value !== null, 'missing value')
	    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
	    assert(offset !== undefined && offset !== null, 'missing offset')
	    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
	    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
	  }

	  var len = buf.length
	  if (offset >= len)
	    return

	  ieee754.write(buf, value, offset, littleEndian, 23, 4)
	}

	Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
	  _writeFloat(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
	  _writeFloat(this, value, offset, false, noAssert)
	}

	function _writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    assert(value !== undefined && value !== null, 'missing value')
	    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
	    assert(offset !== undefined && offset !== null, 'missing offset')
	    assert(offset + 7 < buf.length,
	        'Trying to write beyond buffer length')
	    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
	  }

	  var len = buf.length
	  if (offset >= len)
	    return

	  ieee754.write(buf, value, offset, littleEndian, 52, 8)
	}

	Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
	  _writeDouble(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
	  _writeDouble(this, value, offset, false, noAssert)
	}

	// fill(value, start=0, end=buffer.length)
	Buffer.prototype.fill = function (value, start, end) {
	  if (!value) value = 0
	  if (!start) start = 0
	  if (!end) end = this.length

	  if (typeof value === 'string') {
	    value = value.charCodeAt(0)
	  }

	  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
	  assert(end >= start, 'end < start')

	  // Fill 0 bytes; we're done
	  if (end === start) return
	  if (this.length === 0) return

	  assert(start >= 0 && start < this.length, 'start out of bounds')
	  assert(end >= 0 && end <= this.length, 'end out of bounds')

	  for (var i = start; i < end; i++) {
	    this[i] = value
	  }
	}

	Buffer.prototype.inspect = function () {
	  var out = []
	  var len = this.length
	  for (var i = 0; i < len; i++) {
	    out[i] = toHex(this[i])
	    if (i === exports.INSPECT_MAX_BYTES) {
	      out[i + 1] = '...'
	      break
	    }
	  }
	  return '<Buffer ' + out.join(' ') + '>'
	}

	/**
	 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
	 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
	 */
	Buffer.prototype.toArrayBuffer = function () {
	  if (typeof Uint8Array !== 'undefined') {
	    if (Buffer._useTypedArrays) {
	      return (new Buffer(this)).buffer
	    } else {
	      var buf = new Uint8Array(this.length)
	      for (var i = 0, len = buf.length; i < len; i += 1)
	        buf[i] = this[i]
	      return buf.buffer
	    }
	  } else {
	    throw new Error('Buffer.toArrayBuffer not supported in this browser')
	  }
	}

	// HELPER FUNCTIONS
	// ================

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	var BP = Buffer.prototype

	/**
	 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
	 */
	Buffer._augment = function (arr) {
	  arr._isBuffer = true

	  // save reference to original Uint8Array get/set methods before overwriting
	  arr._get = arr.get
	  arr._set = arr.set

	  // deprecated, will be removed in node 0.13+
	  arr.get = BP.get
	  arr.set = BP.set

	  arr.write = BP.write
	  arr.toString = BP.toString
	  arr.toLocaleString = BP.toString
	  arr.toJSON = BP.toJSON
	  arr.copy = BP.copy
	  arr.slice = BP.slice
	  arr.readUInt8 = BP.readUInt8
	  arr.readUInt16LE = BP.readUInt16LE
	  arr.readUInt16BE = BP.readUInt16BE
	  arr.readUInt32LE = BP.readUInt32LE
	  arr.readUInt32BE = BP.readUInt32BE
	  arr.readInt8 = BP.readInt8
	  arr.readInt16LE = BP.readInt16LE
	  arr.readInt16BE = BP.readInt16BE
	  arr.readInt32LE = BP.readInt32LE
	  arr.readInt32BE = BP.readInt32BE
	  arr.readFloatLE = BP.readFloatLE
	  arr.readFloatBE = BP.readFloatBE
	  arr.readDoubleLE = BP.readDoubleLE
	  arr.readDoubleBE = BP.readDoubleBE
	  arr.writeUInt8 = BP.writeUInt8
	  arr.writeUInt16LE = BP.writeUInt16LE
	  arr.writeUInt16BE = BP.writeUInt16BE
	  arr.writeUInt32LE = BP.writeUInt32LE
	  arr.writeUInt32BE = BP.writeUInt32BE
	  arr.writeInt8 = BP.writeInt8
	  arr.writeInt16LE = BP.writeInt16LE
	  arr.writeInt16BE = BP.writeInt16BE
	  arr.writeInt32LE = BP.writeInt32LE
	  arr.writeInt32BE = BP.writeInt32BE
	  arr.writeFloatLE = BP.writeFloatLE
	  arr.writeFloatBE = BP.writeFloatBE
	  arr.writeDoubleLE = BP.writeDoubleLE
	  arr.writeDoubleBE = BP.writeDoubleBE
	  arr.fill = BP.fill
	  arr.inspect = BP.inspect
	  arr.toArrayBuffer = BP.toArrayBuffer

	  return arr
	}

	// slice(start, end)
	function clamp (index, len, defaultValue) {
	  if (typeof index !== 'number') return defaultValue
	  index = ~~index;  // Coerce to integer.
	  if (index >= len) return len
	  if (index >= 0) return index
	  index += len
	  if (index >= 0) return index
	  return 0
	}

	function coerce (length) {
	  // Coerce length to a number (possibly NaN), round up
	  // in case it's fractional (e.g. 123.456) then do a
	  // double negate to coerce a NaN to 0. Easy, right?
	  length = ~~Math.ceil(+length)
	  return length < 0 ? 0 : length
	}

	function isArray (subject) {
	  return (Array.isArray || function (subject) {
	    return Object.prototype.toString.call(subject) === '[object Array]'
	  })(subject)
	}

	function isArrayish (subject) {
	  return isArray(subject) || Buffer.isBuffer(subject) ||
	      subject && typeof subject === 'object' &&
	      typeof subject.length === 'number'
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    var b = str.charCodeAt(i)
	    if (b <= 0x7F)
	      byteArray.push(str.charCodeAt(i))
	    else {
	      var start = i
	      if (b >= 0xD800 && b <= 0xDFFF) i++
	      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
	      for (var j = 0; j < h.length; j++)
	        byteArray.push(parseInt(h[j], 16))
	    }
	  }
	  return byteArray
	}

	function asciiToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF)
	  }
	  return byteArray
	}

	function utf16leToBytes (str) {
	  var c, hi, lo
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    c = str.charCodeAt(i)
	    hi = c >> 8
	    lo = c % 256
	    byteArray.push(lo)
	    byteArray.push(hi)
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(str)
	}

	function blitBuffer (src, dst, offset, length) {
	  var pos
	  for (var i = 0; i < length; i++) {
	    if ((i + offset >= dst.length) || (i >= src.length))
	      break
	    dst[i + offset] = src[i]
	  }
	  return i
	}

	function decodeUtf8Char (str) {
	  try {
	    return decodeURIComponent(str)
	  } catch (err) {
	    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
	  }
	}

	/*
	 * We have to make sure that the value is a valid integer. This means that it
	 * is non-negative. It has no fractional component and that it does not
	 * exceed the maximum allowed value.
	 */
	function verifuint (value, max) {
	  assert(typeof value === 'number', 'cannot write a non-number as a number')
	  assert(value >= 0, 'specified a negative value for writing an unsigned value')
	  assert(value <= max, 'value is larger than maximum value for type')
	  assert(Math.floor(value) === value, 'value has a fractional component')
	}

	function verifsint (value, max, min) {
	  assert(typeof value === 'number', 'cannot write a non-number as a number')
	  assert(value <= max, 'value larger than maximum allowed value')
	  assert(value >= min, 'value smaller than minimum allowed value')
	  assert(Math.floor(value) === value, 'value has a fractional component')
	}

	function verifIEEE754 (value, max, min) {
	  assert(typeof value === 'number', 'cannot write a non-number as a number')
	  assert(value <= max, 'value larger than maximum allowed value')
	  assert(value >= min, 'value smaller than minimum allowed value')
	}

	function assert (test, message) {
	  if (!test) throw new Error(message || 'Failed assertion')
	}

	},{"base64-js":16,"ieee754":17}],16:[function(_dereq_,module,exports){
	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	;(function (exports) {
		'use strict';

	  var Arr = (typeof Uint8Array !== 'undefined')
	    ? Uint8Array
	    : Array

		var PLUS   = '+'.charCodeAt(0)
		var SLASH  = '/'.charCodeAt(0)
		var NUMBER = '0'.charCodeAt(0)
		var LOWER  = 'a'.charCodeAt(0)
		var UPPER  = 'A'.charCodeAt(0)

		function decode (elt) {
			var code = elt.charCodeAt(0)
			if (code === PLUS)
				return 62 // '+'
			if (code === SLASH)
				return 63 // '/'
			if (code < NUMBER)
				return -1 //no match
			if (code < NUMBER + 10)
				return code - NUMBER + 26 + 26
			if (code < UPPER + 26)
				return code - UPPER
			if (code < LOWER + 26)
				return code - LOWER + 26
		}

		function b64ToByteArray (b64) {
			var i, j, l, tmp, placeHolders, arr

			if (b64.length % 4 > 0) {
				throw new Error('Invalid string. Length must be a multiple of 4')
			}

			// the number of equal signs (place holders)
			// if there are two placeholders, than the two characters before it
			// represent one byte
			// if there is only one, then the three characters before it represent 2 bytes
			// this is just a cheap hack to not do indexOf twice
			var len = b64.length
			placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

			// base64 is 4/3 + up to two characters of the original data
			arr = new Arr(b64.length * 3 / 4 - placeHolders)

			// if there are placeholders, only get up to the last complete 4 chars
			l = placeHolders > 0 ? b64.length - 4 : b64.length

			var L = 0

			function push (v) {
				arr[L++] = v
			}

			for (i = 0, j = 0; i < l; i += 4, j += 3) {
				tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
				push((tmp & 0xFF0000) >> 16)
				push((tmp & 0xFF00) >> 8)
				push(tmp & 0xFF)
			}

			if (placeHolders === 2) {
				tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
				push(tmp & 0xFF)
			} else if (placeHolders === 1) {
				tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
				push((tmp >> 8) & 0xFF)
				push(tmp & 0xFF)
			}

			return arr
		}

		function uint8ToBase64 (uint8) {
			var i,
				extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
				output = "",
				temp, length

			function encode (num) {
				return lookup.charAt(num)
			}

			function tripletToBase64 (num) {
				return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
			}

			// go through the array every three bytes, we'll deal with trailing stuff later
			for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
				temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
				output += tripletToBase64(temp)
			}

			// pad the end with zeros, but make sure to not forget the extra bytes
			switch (extraBytes) {
				case 1:
					temp = uint8[uint8.length - 1]
					output += encode(temp >> 2)
					output += encode((temp << 4) & 0x3F)
					output += '=='
					break
				case 2:
					temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
					output += encode(temp >> 10)
					output += encode((temp >> 4) & 0x3F)
					output += encode((temp << 2) & 0x3F)
					output += '='
					break
			}

			return output
		}

		exports.toByteArray = b64ToByteArray
		exports.fromByteArray = uint8ToBase64
	}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

	},{}],17:[function(_dereq_,module,exports){
	exports.read = function(buffer, offset, isLE, mLen, nBytes) {
	  var e, m,
	      eLen = nBytes * 8 - mLen - 1,
	      eMax = (1 << eLen) - 1,
	      eBias = eMax >> 1,
	      nBits = -7,
	      i = isLE ? (nBytes - 1) : 0,
	      d = isLE ? -1 : 1,
	      s = buffer[offset + i];

	  i += d;

	  e = s & ((1 << (-nBits)) - 1);
	  s >>= (-nBits);
	  nBits += eLen;
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

	  m = e & ((1 << (-nBits)) - 1);
	  e >>= (-nBits);
	  nBits += mLen;
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

	  if (e === 0) {
	    e = 1 - eBias;
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity);
	  } else {
	    m = m + Math.pow(2, mLen);
	    e = e - eBias;
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
	};

	exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c,
	      eLen = nBytes * 8 - mLen - 1,
	      eMax = (1 << eLen) - 1,
	      eBias = eMax >> 1,
	      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
	      i = isLE ? 0 : (nBytes - 1),
	      d = isLE ? 1 : -1,
	      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

	  value = Math.abs(value);

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0;
	    e = eMax;
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2);
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--;
	      c *= 2;
	    }
	    if (e + eBias >= 1) {
	      value += rt / c;
	    } else {
	      value += rt * Math.pow(2, 1 - eBias);
	    }
	    if (value * c >= 2) {
	      e++;
	      c /= 2;
	    }

	    if (e + eBias >= eMax) {
	      m = 0;
	      e = eMax;
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen);
	      e = e + eBias;
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
	      e = 0;
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

	  e = (e << mLen) | m;
	  eLen += mLen;
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

	  buffer[offset + i - d] |= s * 128;
	};

	},{}],18:[function(_dereq_,module,exports){
	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      }
	      throw TypeError('Uncaught, unspecified "error" event.');
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        len = arguments.length;
	        args = new Array(len - 1);
	        for (i = 1; i < len; i++)
	          args[i - 1] = arguments[i];
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    len = arguments.length;
	    args = new Array(len - 1);
	    for (i = 1; i < len; i++)
	      args[i - 1] = arguments[i];

	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    var m;
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  var ret;
	  if (!emitter._events || !emitter._events[type])
	    ret = 0;
	  else if (isFunction(emitter._events[type]))
	    ret = 1;
	  else
	    ret = emitter._events[type].length;
	  return ret;
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}

	},{}],19:[function(_dereq_,module,exports){
	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}

	},{}],20:[function(_dereq_,module,exports){
	// shim for using process in browser

	var process = module.exports = {};

	process.nextTick = (function () {
	    var canSetImmediate = typeof window !== 'undefined'
	    && window.setImmediate;
	    var canPost = typeof window !== 'undefined'
	    && window.postMessage && window.addEventListener
	    ;

	    if (canSetImmediate) {
	        return function (f) { return window.setImmediate(f) };
	    }

	    if (canPost) {
	        var queue = [];
	        window.addEventListener('message', function (ev) {
	            var source = ev.source;
	            if ((source === window || source === null) && ev.data === 'process-tick') {
	                ev.stopPropagation();
	                if (queue.length > 0) {
	                    var fn = queue.shift();
	                    fn();
	                }
	            }
	        }, true);

	        return function nextTick(fn) {
	            queue.push(fn);
	            window.postMessage('process-tick', '*');
	        };
	    }

	    return function nextTick(fn) {
	        setTimeout(fn, 0);
	    };
	})();

	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	}

	// TODO(shtylman)
	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};

	},{}],21:[function(_dereq_,module,exports){
	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// a duplex stream is just a stream that is both readable and writable.
	// Since JS doesn't have multiple prototypal inheritance, this class
	// prototypally inherits from Readable, and then parasitically from
	// Writable.

	module.exports = Duplex;
	var inherits = _dereq_('inherits');
	var setImmediate = _dereq_('process/browser.js').nextTick;
	var Readable = _dereq_('./readable.js');
	var Writable = _dereq_('./writable.js');

	inherits(Duplex, Readable);

	Duplex.prototype.write = Writable.prototype.write;
	Duplex.prototype.end = Writable.prototype.end;
	Duplex.prototype._write = Writable.prototype._write;

	function Duplex(options) {
	  if (!(this instanceof Duplex))
	    return new Duplex(options);

	  Readable.call(this, options);
	  Writable.call(this, options);

	  if (options && options.readable === false)
	    this.readable = false;

	  if (options && options.writable === false)
	    this.writable = false;

	  this.allowHalfOpen = true;
	  if (options && options.allowHalfOpen === false)
	    this.allowHalfOpen = false;

	  this.once('end', onend);
	}

	// the no-half-open enforcer
	function onend() {
	  // if we allow half-open state, or if the writable side ended,
	  // then we're ok.
	  if (this.allowHalfOpen || this._writableState.ended)
	    return;

	  // no more data can be written.
	  // But allow more writes to happen in this tick.
	  var self = this;
	  setImmediate(function () {
	    self.end();
	  });
	}

	},{"./readable.js":25,"./writable.js":27,"inherits":19,"process/browser.js":23}],22:[function(_dereq_,module,exports){
	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	module.exports = Stream;

	var EE = _dereq_('events').EventEmitter;
	var inherits = _dereq_('inherits');

	inherits(Stream, EE);
	Stream.Readable = _dereq_('./readable.js');
	Stream.Writable = _dereq_('./writable.js');
	Stream.Duplex = _dereq_('./duplex.js');
	Stream.Transform = _dereq_('./transform.js');
	Stream.PassThrough = _dereq_('./passthrough.js');

	// Backwards-compat with node 0.4.x
	Stream.Stream = Stream;



	// old-style streams.  Note that the pipe method (the only relevant
	// part of this class) is overridden in the Readable class.

	function Stream() {
	  EE.call(this);
	}

	Stream.prototype.pipe = function(dest, options) {
	  var source = this;

	  function ondata(chunk) {
	    if (dest.writable) {
	      if (false === dest.write(chunk) && source.pause) {
	        source.pause();
	      }
	    }
	  }

	  source.on('data', ondata);

	  function ondrain() {
	    if (source.readable && source.resume) {
	      source.resume();
	    }
	  }

	  dest.on('drain', ondrain);

	  // If the 'end' option is not supplied, dest.end() will be called when
	  // source gets the 'end' or 'close' events.  Only dest.end() once.
	  if (!dest._isStdio && (!options || options.end !== false)) {
	    source.on('end', onend);
	    source.on('close', onclose);
	  }

	  var didOnEnd = false;
	  function onend() {
	    if (didOnEnd) return;
	    didOnEnd = true;

	    dest.end();
	  }


	  function onclose() {
	    if (didOnEnd) return;
	    didOnEnd = true;

	    if (typeof dest.destroy === 'function') dest.destroy();
	  }

	  // don't leave dangling pipes when there are errors.
	  function onerror(er) {
	    cleanup();
	    if (EE.listenerCount(this, 'error') === 0) {
	      throw er; // Unhandled stream error in pipe.
	    }
	  }

	  source.on('error', onerror);
	  dest.on('error', onerror);

	  // remove all the event listeners that were added.
	  function cleanup() {
	    source.removeListener('data', ondata);
	    dest.removeListener('drain', ondrain);

	    source.removeListener('end', onend);
	    source.removeListener('close', onclose);

	    source.removeListener('error', onerror);
	    dest.removeListener('error', onerror);

	    source.removeListener('end', cleanup);
	    source.removeListener('close', cleanup);

	    dest.removeListener('close', cleanup);
	  }

	  source.on('end', cleanup);
	  source.on('close', cleanup);

	  dest.on('close', cleanup);

	  dest.emit('pipe', source);

	  // Allow for unix-like usage: A.pipe(B).pipe(C)
	  return dest;
	};

	},{"./duplex.js":21,"./passthrough.js":24,"./readable.js":25,"./transform.js":26,"./writable.js":27,"events":18,"inherits":19}],23:[function(_dereq_,module,exports){
	// shim for using process in browser

	var process = module.exports = {};

	process.nextTick = (function () {
	    var canSetImmediate = typeof window !== 'undefined'
	    && window.setImmediate;
	    var canPost = typeof window !== 'undefined'
	    && window.postMessage && window.addEventListener
	    ;

	    if (canSetImmediate) {
	        return function (f) { return window.setImmediate(f) };
	    }

	    if (canPost) {
	        var queue = [];
	        window.addEventListener('message', function (ev) {
	            var source = ev.source;
	            if ((source === window || source === null) && ev.data === 'process-tick') {
	                ev.stopPropagation();
	                if (queue.length > 0) {
	                    var fn = queue.shift();
	                    fn();
	                }
	            }
	        }, true);

	        return function nextTick(fn) {
	            queue.push(fn);
	            window.postMessage('process-tick', '*');
	        };
	    }

	    return function nextTick(fn) {
	        setTimeout(fn, 0);
	    };
	})();

	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	}

	// TODO(shtylman)
	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};

	},{}],24:[function(_dereq_,module,exports){
	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// a passthrough stream.
	// basically just the most minimal sort of Transform stream.
	// Every written chunk gets output as-is.

	module.exports = PassThrough;

	var Transform = _dereq_('./transform.js');
	var inherits = _dereq_('inherits');
	inherits(PassThrough, Transform);

	function PassThrough(options) {
	  if (!(this instanceof PassThrough))
	    return new PassThrough(options);

	  Transform.call(this, options);
	}

	PassThrough.prototype._transform = function(chunk, encoding, cb) {
	  cb(null, chunk);
	};

	},{"./transform.js":26,"inherits":19}],25:[function(_dereq_,module,exports){
	(function (process){
	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	module.exports = Readable;
	Readable.ReadableState = ReadableState;

	var EE = _dereq_('events').EventEmitter;
	var Stream = _dereq_('./index.js');
	var Buffer = _dereq_('buffer').Buffer;
	var setImmediate = _dereq_('process/browser.js').nextTick;
	var StringDecoder;

	var inherits = _dereq_('inherits');
	inherits(Readable, Stream);

	function ReadableState(options, stream) {
	  options = options || {};

	  // the point at which it stops calling _read() to fill the buffer
	  // Note: 0 is a valid value, means "don't call _read preemptively ever"
	  var hwm = options.highWaterMark;
	  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  this.buffer = [];
	  this.length = 0;
	  this.pipes = null;
	  this.pipesCount = 0;
	  this.flowing = false;
	  this.ended = false;
	  this.endEmitted = false;
	  this.reading = false;

	  // In streams that never have any data, and do push(null) right away,
	  // the consumer can miss the 'end' event if they do some I/O before
	  // consuming the stream.  So, we don't emit('end') until some reading
	  // happens.
	  this.calledRead = false;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, becuase any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // whenever we return null, then we set a flag to say
	  // that we're awaiting a 'readable' event emission.
	  this.needReadable = false;
	  this.emittedReadable = false;
	  this.readableListening = false;


	  // object stream flag. Used to make read(n) ignore n and to
	  // make all the buffer merging and length checks go away
	  this.objectMode = !!options.objectMode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // when piping, we only care about 'readable' events that happen
	  // after read()ing all the bytes and not getting any pushback.
	  this.ranOut = false;

	  // the number of writers that are awaiting a drain event in .pipe()s
	  this.awaitDrain = 0;

	  // if true, a maybeReadMore has been scheduled
	  this.readingMore = false;

	  this.decoder = null;
	  this.encoding = null;
	  if (options.encoding) {
	    if (!StringDecoder)
	      StringDecoder = _dereq_('string_decoder').StringDecoder;
	    this.decoder = new StringDecoder(options.encoding);
	    this.encoding = options.encoding;
	  }
	}

	function Readable(options) {
	  if (!(this instanceof Readable))
	    return new Readable(options);

	  this._readableState = new ReadableState(options, this);

	  // legacy
	  this.readable = true;

	  Stream.call(this);
	}

	// Manually shove something into the read() buffer.
	// This returns true if the highWaterMark has not been hit yet,
	// similar to how Writable.write() returns true if you should
	// write() some more.
	Readable.prototype.push = function(chunk, encoding) {
	  var state = this._readableState;

	  if (typeof chunk === 'string' && !state.objectMode) {
	    encoding = encoding || state.defaultEncoding;
	    if (encoding !== state.encoding) {
	      chunk = new Buffer(chunk, encoding);
	      encoding = '';
	    }
	  }

	  return readableAddChunk(this, state, chunk, encoding, false);
	};

	// Unshift should *always* be something directly out of read()
	Readable.prototype.unshift = function(chunk) {
	  var state = this._readableState;
	  return readableAddChunk(this, state, chunk, '', true);
	};

	function readableAddChunk(stream, state, chunk, encoding, addToFront) {
	  var er = chunkInvalid(state, chunk);
	  if (er) {
	    stream.emit('error', er);
	  } else if (chunk === null || chunk === undefined) {
	    state.reading = false;
	    if (!state.ended)
	      onEofChunk(stream, state);
	  } else if (state.objectMode || chunk && chunk.length > 0) {
	    if (state.ended && !addToFront) {
	      var e = new Error('stream.push() after EOF');
	      stream.emit('error', e);
	    } else if (state.endEmitted && addToFront) {
	      var e = new Error('stream.unshift() after end event');
	      stream.emit('error', e);
	    } else {
	      if (state.decoder && !addToFront && !encoding)
	        chunk = state.decoder.write(chunk);

	      // update the buffer info.
	      state.length += state.objectMode ? 1 : chunk.length;
	      if (addToFront) {
	        state.buffer.unshift(chunk);
	      } else {
	        state.reading = false;
	        state.buffer.push(chunk);
	      }

	      if (state.needReadable)
	        emitReadable(stream);

	      maybeReadMore(stream, state);
	    }
	  } else if (!addToFront) {
	    state.reading = false;
	  }

	  return needMoreData(state);
	}



	// if it's past the high water mark, we can push in some more.
	// Also, if we have no data yet, we can stand some
	// more bytes.  This is to work around cases where hwm=0,
	// such as the repl.  Also, if the push() triggered a
	// readable event, and the user called read(largeNumber) such that
	// needReadable was set, then we ought to push more, so that another
	// 'readable' event will be triggered.
	function needMoreData(state) {
	  return !state.ended &&
	         (state.needReadable ||
	          state.length < state.highWaterMark ||
	          state.length === 0);
	}

	// backwards compatibility.
	Readable.prototype.setEncoding = function(enc) {
	  if (!StringDecoder)
	    StringDecoder = _dereq_('string_decoder').StringDecoder;
	  this._readableState.decoder = new StringDecoder(enc);
	  this._readableState.encoding = enc;
	};

	// Don't raise the hwm > 128MB
	var MAX_HWM = 0x800000;
	function roundUpToNextPowerOf2(n) {
	  if (n >= MAX_HWM) {
	    n = MAX_HWM;
	  } else {
	    // Get the next highest power of 2
	    n--;
	    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
	    n++;
	  }
	  return n;
	}

	function howMuchToRead(n, state) {
	  if (state.length === 0 && state.ended)
	    return 0;

	  if (state.objectMode)
	    return n === 0 ? 0 : 1;

	  if (isNaN(n) || n === null) {
	    // only flow one buffer at a time
	    if (state.flowing && state.buffer.length)
	      return state.buffer[0].length;
	    else
	      return state.length;
	  }

	  if (n <= 0)
	    return 0;

	  // If we're asking for more than the target buffer level,
	  // then raise the water mark.  Bump up to the next highest
	  // power of 2, to prevent increasing it excessively in tiny
	  // amounts.
	  if (n > state.highWaterMark)
	    state.highWaterMark = roundUpToNextPowerOf2(n);

	  // don't have that much.  return null, unless we've ended.
	  if (n > state.length) {
	    if (!state.ended) {
	      state.needReadable = true;
	      return 0;
	    } else
	      return state.length;
	  }

	  return n;
	}

	// you can override either this method, or the async _read(n) below.
	Readable.prototype.read = function(n) {
	  var state = this._readableState;
	  state.calledRead = true;
	  var nOrig = n;

	  if (typeof n !== 'number' || n > 0)
	    state.emittedReadable = false;

	  // if we're doing read(0) to trigger a readable event, but we
	  // already have a bunch of data in the buffer, then just trigger
	  // the 'readable' event and move on.
	  if (n === 0 &&
	      state.needReadable &&
	      (state.length >= state.highWaterMark || state.ended)) {
	    emitReadable(this);
	    return null;
	  }

	  n = howMuchToRead(n, state);

	  // if we've ended, and we're now clear, then finish it up.
	  if (n === 0 && state.ended) {
	    if (state.length === 0)
	      endReadable(this);
	    return null;
	  }

	  // All the actual chunk generation logic needs to be
	  // *below* the call to _read.  The reason is that in certain
	  // synthetic stream cases, such as passthrough streams, _read
	  // may be a completely synchronous operation which may change
	  // the state of the read buffer, providing enough data when
	  // before there was *not* enough.
	  //
	  // So, the steps are:
	  // 1. Figure out what the state of things will be after we do
	  // a read from the buffer.
	  //
	  // 2. If that resulting state will trigger a _read, then call _read.
	  // Note that this may be asynchronous, or synchronous.  Yes, it is
	  // deeply ugly to write APIs this way, but that still doesn't mean
	  // that the Readable class should behave improperly, as streams are
	  // designed to be sync/async agnostic.
	  // Take note if the _read call is sync or async (ie, if the read call
	  // has returned yet), so that we know whether or not it's safe to emit
	  // 'readable' etc.
	  //
	  // 3. Actually pull the requested chunks out of the buffer and return.

	  // if we need a readable event, then we need to do some reading.
	  var doRead = state.needReadable;

	  // if we currently have less than the highWaterMark, then also read some
	  if (state.length - n <= state.highWaterMark)
	    doRead = true;

	  // however, if we've ended, then there's no point, and if we're already
	  // reading, then it's unnecessary.
	  if (state.ended || state.reading)
	    doRead = false;

	  if (doRead) {
	    state.reading = true;
	    state.sync = true;
	    // if the length is currently zero, then we *need* a readable event.
	    if (state.length === 0)
	      state.needReadable = true;
	    // call internal read method
	    this._read(state.highWaterMark);
	    state.sync = false;
	  }

	  // If _read called its callback synchronously, then `reading`
	  // will be false, and we need to re-evaluate how much data we
	  // can return to the user.
	  if (doRead && !state.reading)
	    n = howMuchToRead(nOrig, state);

	  var ret;
	  if (n > 0)
	    ret = fromList(n, state);
	  else
	    ret = null;

	  if (ret === null) {
	    state.needReadable = true;
	    n = 0;
	  }

	  state.length -= n;

	  // If we have nothing in the buffer, then we want to know
	  // as soon as we *do* get something into the buffer.
	  if (state.length === 0 && !state.ended)
	    state.needReadable = true;

	  // If we happened to read() exactly the remaining amount in the
	  // buffer, and the EOF has been seen at this point, then make sure
	  // that we emit 'end' on the very next tick.
	  if (state.ended && !state.endEmitted && state.length === 0)
	    endReadable(this);

	  return ret;
	};

	function chunkInvalid(state, chunk) {
	  var er = null;
	  if (!Buffer.isBuffer(chunk) &&
	      'string' !== typeof chunk &&
	      chunk !== null &&
	      chunk !== undefined &&
	      !state.objectMode &&
	      !er) {
	    er = new TypeError('Invalid non-string/buffer chunk');
	  }
	  return er;
	}


	function onEofChunk(stream, state) {
	  if (state.decoder && !state.ended) {
	    var chunk = state.decoder.end();
	    if (chunk && chunk.length) {
	      state.buffer.push(chunk);
	      state.length += state.objectMode ? 1 : chunk.length;
	    }
	  }
	  state.ended = true;

	  // if we've ended and we have some data left, then emit
	  // 'readable' now to make sure it gets picked up.
	  if (state.length > 0)
	    emitReadable(stream);
	  else
	    endReadable(stream);
	}

	// Don't emit readable right away in sync mode, because this can trigger
	// another read() call => stack overflow.  This way, it might trigger
	// a nextTick recursion warning, but that's not so bad.
	function emitReadable(stream) {
	  var state = stream._readableState;
	  state.needReadable = false;
	  if (state.emittedReadable)
	    return;

	  state.emittedReadable = true;
	  if (state.sync)
	    setImmediate(function() {
	      emitReadable_(stream);
	    });
	  else
	    emitReadable_(stream);
	}

	function emitReadable_(stream) {
	  stream.emit('readable');
	}


	// at this point, the user has presumably seen the 'readable' event,
	// and called read() to consume some data.  that may have triggered
	// in turn another _read(n) call, in which case reading = true if
	// it's in progress.
	// However, if we're not ended, or reading, and the length < hwm,
	// then go ahead and try to read some more preemptively.
	function maybeReadMore(stream, state) {
	  if (!state.readingMore) {
	    state.readingMore = true;
	    setImmediate(function() {
	      maybeReadMore_(stream, state);
	    });
	  }
	}

	function maybeReadMore_(stream, state) {
	  var len = state.length;
	  while (!state.reading && !state.flowing && !state.ended &&
	         state.length < state.highWaterMark) {
	    stream.read(0);
	    if (len === state.length)
	      // didn't get any data, stop spinning.
	      break;
	    else
	      len = state.length;
	  }
	  state.readingMore = false;
	}

	// abstract method.  to be overridden in specific implementation classes.
	// call cb(er, data) where data is <= n in length.
	// for virtual (non-string, non-buffer) streams, "length" is somewhat
	// arbitrary, and perhaps not very meaningful.
	Readable.prototype._read = function(n) {
	  this.emit('error', new Error('not implemented'));
	};

	Readable.prototype.pipe = function(dest, pipeOpts) {
	  var src = this;
	  var state = this._readableState;

	  switch (state.pipesCount) {
	    case 0:
	      state.pipes = dest;
	      break;
	    case 1:
	      state.pipes = [state.pipes, dest];
	      break;
	    default:
	      state.pipes.push(dest);
	      break;
	  }
	  state.pipesCount += 1;

	  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
	              dest !== process.stdout &&
	              dest !== process.stderr;

	  var endFn = doEnd ? onend : cleanup;
	  if (state.endEmitted)
	    setImmediate(endFn);
	  else
	    src.once('end', endFn);

	  dest.on('unpipe', onunpipe);
	  function onunpipe(readable) {
	    if (readable !== src) return;
	    cleanup();
	  }

	  function onend() {
	    dest.end();
	  }

	  // when the dest drains, it reduces the awaitDrain counter
	  // on the source.  This would be more elegant with a .once()
	  // handler in flow(), but adding and removing repeatedly is
	  // too slow.
	  var ondrain = pipeOnDrain(src);
	  dest.on('drain', ondrain);

	  function cleanup() {
	    // cleanup event handlers once the pipe is broken
	    dest.removeListener('close', onclose);
	    dest.removeListener('finish', onfinish);
	    dest.removeListener('drain', ondrain);
	    dest.removeListener('error', onerror);
	    dest.removeListener('unpipe', onunpipe);
	    src.removeListener('end', onend);
	    src.removeListener('end', cleanup);

	    // if the reader is waiting for a drain event from this
	    // specific writer, then it would cause it to never start
	    // flowing again.
	    // So, if this is awaiting a drain, then we just call it now.
	    // If we don't know, then assume that we are waiting for one.
	    if (!dest._writableState || dest._writableState.needDrain)
	      ondrain();
	  }

	  // if the dest has an error, then stop piping into it.
	  // however, don't suppress the throwing behavior for this.
	  // check for listeners before emit removes one-time listeners.
	  var errListeners = EE.listenerCount(dest, 'error');
	  function onerror(er) {
	    unpipe();
	    if (errListeners === 0 && EE.listenerCount(dest, 'error') === 0)
	      dest.emit('error', er);
	  }
	  dest.once('error', onerror);

	  // Both close and finish should trigger unpipe, but only once.
	  function onclose() {
	    dest.removeListener('finish', onfinish);
	    unpipe();
	  }
	  dest.once('close', onclose);
	  function onfinish() {
	    dest.removeListener('close', onclose);
	    unpipe();
	  }
	  dest.once('finish', onfinish);

	  function unpipe() {
	    src.unpipe(dest);
	  }

	  // tell the dest that it's being piped to
	  dest.emit('pipe', src);

	  // start the flow if it hasn't been started already.
	  if (!state.flowing) {
	    // the handler that waits for readable events after all
	    // the data gets sucked out in flow.
	    // This would be easier to follow with a .once() handler
	    // in flow(), but that is too slow.
	    this.on('readable', pipeOnReadable);

	    state.flowing = true;
	    setImmediate(function() {
	      flow(src);
	    });
	  }

	  return dest;
	};

	function pipeOnDrain(src) {
	  return function() {
	    var dest = this;
	    var state = src._readableState;
	    state.awaitDrain--;
	    if (state.awaitDrain === 0)
	      flow(src);
	  };
	}

	function flow(src) {
	  var state = src._readableState;
	  var chunk;
	  state.awaitDrain = 0;

	  function write(dest, i, list) {
	    var written = dest.write(chunk);
	    if (false === written) {
	      state.awaitDrain++;
	    }
	  }

	  while (state.pipesCount && null !== (chunk = src.read())) {

	    if (state.pipesCount === 1)
	      write(state.pipes, 0, null);
	    else
	      forEach(state.pipes, write);

	    src.emit('data', chunk);

	    // if anyone needs a drain, then we have to wait for that.
	    if (state.awaitDrain > 0)
	      return;
	  }

	  // if every destination was unpiped, either before entering this
	  // function, or in the while loop, then stop flowing.
	  //
	  // NB: This is a pretty rare edge case.
	  if (state.pipesCount === 0) {
	    state.flowing = false;

	    // if there were data event listeners added, then switch to old mode.
	    if (EE.listenerCount(src, 'data') > 0)
	      emitDataEvents(src);
	    return;
	  }

	  // at this point, no one needed a drain, so we just ran out of data
	  // on the next readable event, start it over again.
	  state.ranOut = true;
	}

	function pipeOnReadable() {
	  if (this._readableState.ranOut) {
	    this._readableState.ranOut = false;
	    flow(this);
	  }
	}


	Readable.prototype.unpipe = function(dest) {
	  var state = this._readableState;

	  // if we're not piping anywhere, then do nothing.
	  if (state.pipesCount === 0)
	    return this;

	  // just one destination.  most common case.
	  if (state.pipesCount === 1) {
	    // passed in one, but it's not the right one.
	    if (dest && dest !== state.pipes)
	      return this;

	    if (!dest)
	      dest = state.pipes;

	    // got a match.
	    state.pipes = null;
	    state.pipesCount = 0;
	    this.removeListener('readable', pipeOnReadable);
	    state.flowing = false;
	    if (dest)
	      dest.emit('unpipe', this);
	    return this;
	  }

	  // slow case. multiple pipe destinations.

	  if (!dest) {
	    // remove all.
	    var dests = state.pipes;
	    var len = state.pipesCount;
	    state.pipes = null;
	    state.pipesCount = 0;
	    this.removeListener('readable', pipeOnReadable);
	    state.flowing = false;

	    for (var i = 0; i < len; i++)
	      dests[i].emit('unpipe', this);
	    return this;
	  }

	  // try to find the right one.
	  var i = indexOf(state.pipes, dest);
	  if (i === -1)
	    return this;

	  state.pipes.splice(i, 1);
	  state.pipesCount -= 1;
	  if (state.pipesCount === 1)
	    state.pipes = state.pipes[0];

	  dest.emit('unpipe', this);

	  return this;
	};

	// set up data events if they are asked for
	// Ensure readable listeners eventually get something
	Readable.prototype.on = function(ev, fn) {
	  var res = Stream.prototype.on.call(this, ev, fn);

	  if (ev === 'data' && !this._readableState.flowing)
	    emitDataEvents(this);

	  if (ev === 'readable' && this.readable) {
	    var state = this._readableState;
	    if (!state.readableListening) {
	      state.readableListening = true;
	      state.emittedReadable = false;
	      state.needReadable = true;
	      if (!state.reading) {
	        this.read(0);
	      } else if (state.length) {
	        emitReadable(this, state);
	      }
	    }
	  }

	  return res;
	};
	Readable.prototype.addListener = Readable.prototype.on;

	// pause() and resume() are remnants of the legacy readable stream API
	// If the user uses them, then switch into old mode.
	Readable.prototype.resume = function() {
	  emitDataEvents(this);
	  this.read(0);
	  this.emit('resume');
	};

	Readable.prototype.pause = function() {
	  emitDataEvents(this, true);
	  this.emit('pause');
	};

	function emitDataEvents(stream, startPaused) {
	  var state = stream._readableState;

	  if (state.flowing) {
	    // https://github.com/isaacs/readable-stream/issues/16
	    throw new Error('Cannot switch to old mode now.');
	  }

	  var paused = startPaused || false;
	  var readable = false;

	  // convert to an old-style stream.
	  stream.readable = true;
	  stream.pipe = Stream.prototype.pipe;
	  stream.on = stream.addListener = Stream.prototype.on;

	  stream.on('readable', function() {
	    readable = true;

	    var c;
	    while (!paused && (null !== (c = stream.read())))
	      stream.emit('data', c);

	    if (c === null) {
	      readable = false;
	      stream._readableState.needReadable = true;
	    }
	  });

	  stream.pause = function() {
	    paused = true;
	    this.emit('pause');
	  };

	  stream.resume = function() {
	    paused = false;
	    if (readable)
	      setImmediate(function() {
	        stream.emit('readable');
	      });
	    else
	      this.read(0);
	    this.emit('resume');
	  };

	  // now make it start, just in case it hadn't already.
	  stream.emit('readable');
	}

	// wrap an old-style stream as the async data source.
	// This is *not* part of the readable stream interface.
	// It is an ugly unfortunate mess of history.
	Readable.prototype.wrap = function(stream) {
	  var state = this._readableState;
	  var paused = false;

	  var self = this;
	  stream.on('end', function() {
	    if (state.decoder && !state.ended) {
	      var chunk = state.decoder.end();
	      if (chunk && chunk.length)
	        self.push(chunk);
	    }

	    self.push(null);
	  });

	  stream.on('data', function(chunk) {
	    if (state.decoder)
	      chunk = state.decoder.write(chunk);
	    if (!chunk || !state.objectMode && !chunk.length)
	      return;

	    var ret = self.push(chunk);
	    if (!ret) {
	      paused = true;
	      stream.pause();
	    }
	  });

	  // proxy all the other methods.
	  // important when wrapping filters and duplexes.
	  for (var i in stream) {
	    if (typeof stream[i] === 'function' &&
	        typeof this[i] === 'undefined') {
	      this[i] = function(method) { return function() {
	        return stream[method].apply(stream, arguments);
	      }}(i);
	    }
	  }

	  // proxy certain important events.
	  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
	  forEach(events, function(ev) {
	    stream.on(ev, function (x) {
	      return self.emit.apply(self, ev, x);
	    });
	  });

	  // when we try to consume some more bytes, simply unpause the
	  // underlying stream.
	  self._read = function(n) {
	    if (paused) {
	      paused = false;
	      stream.resume();
	    }
	  };

	  return self;
	};



	// exposed for testing purposes only.
	Readable._fromList = fromList;

	// Pluck off n bytes from an array of buffers.
	// Length is the combined lengths of all the buffers in the list.
	function fromList(n, state) {
	  var list = state.buffer;
	  var length = state.length;
	  var stringMode = !!state.decoder;
	  var objectMode = !!state.objectMode;
	  var ret;

	  // nothing in the list, definitely empty.
	  if (list.length === 0)
	    return null;

	  if (length === 0)
	    ret = null;
	  else if (objectMode)
	    ret = list.shift();
	  else if (!n || n >= length) {
	    // read it all, truncate the array.
	    if (stringMode)
	      ret = list.join('');
	    else
	      ret = Buffer.concat(list, length);
	    list.length = 0;
	  } else {
	    // read just some of it.
	    if (n < list[0].length) {
	      // just take a part of the first list item.
	      // slice is the same for buffers and strings.
	      var buf = list[0];
	      ret = buf.slice(0, n);
	      list[0] = buf.slice(n);
	    } else if (n === list[0].length) {
	      // first list is a perfect match
	      ret = list.shift();
	    } else {
	      // complex case.
	      // we have enough to cover it, but it spans past the first buffer.
	      if (stringMode)
	        ret = '';
	      else
	        ret = new Buffer(n);

	      var c = 0;
	      for (var i = 0, l = list.length; i < l && c < n; i++) {
	        var buf = list[0];
	        var cpy = Math.min(n - c, buf.length);

	        if (stringMode)
	          ret += buf.slice(0, cpy);
	        else
	          buf.copy(ret, c, 0, cpy);

	        if (cpy < buf.length)
	          list[0] = buf.slice(cpy);
	        else
	          list.shift();

	        c += cpy;
	      }
	    }
	  }

	  return ret;
	}

	function endReadable(stream) {
	  var state = stream._readableState;

	  // If we get here before consuming all the bytes, then that is a
	  // bug in node.  Should never happen.
	  if (state.length > 0)
	    throw new Error('endReadable called on non-empty stream');

	  if (!state.endEmitted && state.calledRead) {
	    state.ended = true;
	    setImmediate(function() {
	      // Check that we didn't get one last unshift.
	      if (!state.endEmitted && state.length === 0) {
	        state.endEmitted = true;
	        stream.readable = false;
	        stream.emit('end');
	      }
	    });
	  }
	}

	function forEach (xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}

	function indexOf (xs, x) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    if (xs[i] === x) return i;
	  }
	  return -1;
	}

	}).call(this,_dereq_("+xKvab"))
	},{"+xKvab":20,"./index.js":22,"buffer":15,"events":18,"inherits":19,"process/browser.js":23,"string_decoder":28}],26:[function(_dereq_,module,exports){
	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// a transform stream is a readable/writable stream where you do
	// something with the data.  Sometimes it's called a "filter",
	// but that's not a great name for it, since that implies a thing where
	// some bits pass through, and others are simply ignored.  (That would
	// be a valid example of a transform, of course.)
	//
	// While the output is causally related to the input, it's not a
	// necessarily symmetric or synchronous transformation.  For example,
	// a zlib stream might take multiple plain-text writes(), and then
	// emit a single compressed chunk some time in the future.
	//
	// Here's how this works:
	//
	// The Transform stream has all the aspects of the readable and writable
	// stream classes.  When you write(chunk), that calls _write(chunk,cb)
	// internally, and returns false if there's a lot of pending writes
	// buffered up.  When you call read(), that calls _read(n) until
	// there's enough pending readable data buffered up.
	//
	// In a transform stream, the written data is placed in a buffer.  When
	// _read(n) is called, it transforms the queued up data, calling the
	// buffered _write cb's as it consumes chunks.  If consuming a single
	// written chunk would result in multiple output chunks, then the first
	// outputted bit calls the readcb, and subsequent chunks just go into
	// the read buffer, and will cause it to emit 'readable' if necessary.
	//
	// This way, back-pressure is actually determined by the reading side,
	// since _read has to be called to start processing a new chunk.  However,
	// a pathological inflate type of transform can cause excessive buffering
	// here.  For example, imagine a stream where every byte of input is
	// interpreted as an integer from 0-255, and then results in that many
	// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
	// 1kb of data being output.  In this case, you could write a very small
	// amount of input, and end up with a very large amount of output.  In
	// such a pathological inflating mechanism, there'd be no way to tell
	// the system to stop doing the transform.  A single 4MB write could
	// cause the system to run out of memory.
	//
	// However, even in such a pathological case, only a single written chunk
	// would be consumed, and then the rest would wait (un-transformed) until
	// the results of the previous transformed chunk were consumed.

	module.exports = Transform;

	var Duplex = _dereq_('./duplex.js');
	var inherits = _dereq_('inherits');
	inherits(Transform, Duplex);


	function TransformState(options, stream) {
	  this.afterTransform = function(er, data) {
	    return afterTransform(stream, er, data);
	  };

	  this.needTransform = false;
	  this.transforming = false;
	  this.writecb = null;
	  this.writechunk = null;
	}

	function afterTransform(stream, er, data) {
	  var ts = stream._transformState;
	  ts.transforming = false;

	  var cb = ts.writecb;

	  if (!cb)
	    return stream.emit('error', new Error('no writecb in Transform class'));

	  ts.writechunk = null;
	  ts.writecb = null;

	  if (data !== null && data !== undefined)
	    stream.push(data);

	  if (cb)
	    cb(er);

	  var rs = stream._readableState;
	  rs.reading = false;
	  if (rs.needReadable || rs.length < rs.highWaterMark) {
	    stream._read(rs.highWaterMark);
	  }
	}


	function Transform(options) {
	  if (!(this instanceof Transform))
	    return new Transform(options);

	  Duplex.call(this, options);

	  var ts = this._transformState = new TransformState(options, this);

	  // when the writable side finishes, then flush out anything remaining.
	  var stream = this;

	  // start out asking for a readable event once data is transformed.
	  this._readableState.needReadable = true;

	  // we have implemented the _read method, and done the other things
	  // that Readable wants before the first _read call, so unset the
	  // sync guard flag.
	  this._readableState.sync = false;

	  this.once('finish', function() {
	    if ('function' === typeof this._flush)
	      this._flush(function(er) {
	        done(stream, er);
	      });
	    else
	      done(stream);
	  });
	}

	Transform.prototype.push = function(chunk, encoding) {
	  this._transformState.needTransform = false;
	  return Duplex.prototype.push.call(this, chunk, encoding);
	};

	// This is the part where you do stuff!
	// override this function in implementation classes.
	// 'chunk' is an input chunk.
	//
	// Call `push(newChunk)` to pass along transformed output
	// to the readable side.  You may call 'push' zero or more times.
	//
	// Call `cb(err)` when you are done with this chunk.  If you pass
	// an error, then that'll put the hurt on the whole operation.  If you
	// never call cb(), then you'll never get another chunk.
	Transform.prototype._transform = function(chunk, encoding, cb) {
	  throw new Error('not implemented');
	};

	Transform.prototype._write = function(chunk, encoding, cb) {
	  var ts = this._transformState;
	  ts.writecb = cb;
	  ts.writechunk = chunk;
	  ts.writeencoding = encoding;
	  if (!ts.transforming) {
	    var rs = this._readableState;
	    if (ts.needTransform ||
	        rs.needReadable ||
	        rs.length < rs.highWaterMark)
	      this._read(rs.highWaterMark);
	  }
	};

	// Doesn't matter what the args are here.
	// _transform does all the work.
	// That we got here means that the readable side wants more data.
	Transform.prototype._read = function(n) {
	  var ts = this._transformState;

	  if (ts.writechunk && ts.writecb && !ts.transforming) {
	    ts.transforming = true;
	    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
	  } else {
	    // mark that we need a transform, so that any data that comes in
	    // will get processed, now that we've asked for it.
	    ts.needTransform = true;
	  }
	};


	function done(stream, er) {
	  if (er)
	    return stream.emit('error', er);

	  // if there's nothing in the write buffer, then that means
	  // that nothing more will ever be provided
	  var ws = stream._writableState;
	  var rs = stream._readableState;
	  var ts = stream._transformState;

	  if (ws.length)
	    throw new Error('calling transform done when ws.length != 0');

	  if (ts.transforming)
	    throw new Error('calling transform done when still transforming');

	  return stream.push(null);
	}

	},{"./duplex.js":21,"inherits":19}],27:[function(_dereq_,module,exports){
	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// A bit simpler than readable streams.
	// Implement an async ._write(chunk, cb), and it'll handle all
	// the drain event emission and buffering.

	module.exports = Writable;
	Writable.WritableState = WritableState;

	var isUint8Array = typeof Uint8Array !== 'undefined'
	  ? function (x) { return x instanceof Uint8Array }
	  : function (x) {
	    return x && x.constructor && x.constructor.name === 'Uint8Array'
	  }
	;
	var isArrayBuffer = typeof ArrayBuffer !== 'undefined'
	  ? function (x) { return x instanceof ArrayBuffer }
	  : function (x) {
	    return x && x.constructor && x.constructor.name === 'ArrayBuffer'
	  }
	;

	var inherits = _dereq_('inherits');
	var Stream = _dereq_('./index.js');
	var setImmediate = _dereq_('process/browser.js').nextTick;
	var Buffer = _dereq_('buffer').Buffer;

	inherits(Writable, Stream);

	function WriteReq(chunk, encoding, cb) {
	  this.chunk = chunk;
	  this.encoding = encoding;
	  this.callback = cb;
	}

	function WritableState(options, stream) {
	  options = options || {};

	  // the point at which write() starts returning false
	  // Note: 0 is a valid value, means that we always return false if
	  // the entire buffer is not flushed immediately on write()
	  var hwm = options.highWaterMark;
	  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

	  // object stream flag to indicate whether or not this stream
	  // contains buffers or objects.
	  this.objectMode = !!options.objectMode;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  this.needDrain = false;
	  // at the start of calling end()
	  this.ending = false;
	  // when end() has been called, and returned
	  this.ended = false;
	  // when 'finish' is emitted
	  this.finished = false;

	  // should we decode strings into buffers before passing to _write?
	  // this is here so that some node-core streams can optimize string
	  // handling at a lower level.
	  var noDecode = options.decodeStrings === false;
	  this.decodeStrings = !noDecode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // not an actual buffer we keep track of, but a measurement
	  // of how much we're waiting to get pushed to some underlying
	  // socket or file.
	  this.length = 0;

	  // a flag to see when we're in the middle of a write.
	  this.writing = false;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, becuase any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // a flag to know if we're processing previously buffered items, which
	  // may call the _write() callback in the same tick, so that we don't
	  // end up in an overlapped onwrite situation.
	  this.bufferProcessing = false;

	  // the callback that's passed to _write(chunk,cb)
	  this.onwrite = function(er) {
	    onwrite(stream, er);
	  };

	  // the callback that the user supplies to write(chunk,encoding,cb)
	  this.writecb = null;

	  // the amount that is being written when _write is called.
	  this.writelen = 0;

	  this.buffer = [];
	}

	function Writable(options) {
	  // Writable ctor is applied to Duplexes, though they're not
	  // instanceof Writable, they're instanceof Readable.
	  if (!(this instanceof Writable) && !(this instanceof Stream.Duplex))
	    return new Writable(options);

	  this._writableState = new WritableState(options, this);

	  // legacy.
	  this.writable = true;

	  Stream.call(this);
	}

	// Otherwise people can pipe Writable streams, which is just wrong.
	Writable.prototype.pipe = function() {
	  this.emit('error', new Error('Cannot pipe. Not readable.'));
	};


	function writeAfterEnd(stream, state, cb) {
	  var er = new Error('write after end');
	  // TODO: defer error events consistently everywhere, not just the cb
	  stream.emit('error', er);
	  setImmediate(function() {
	    cb(er);
	  });
	}

	// If we get something that is not a buffer, string, null, or undefined,
	// and we're not in objectMode, then that's an error.
	// Otherwise stream chunks are all considered to be of length=1, and the
	// watermarks determine how many objects to keep in the buffer, rather than
	// how many bytes or characters.
	function validChunk(stream, state, chunk, cb) {
	  var valid = true;
	  if (!Buffer.isBuffer(chunk) &&
	      'string' !== typeof chunk &&
	      chunk !== null &&
	      chunk !== undefined &&
	      !state.objectMode) {
	    var er = new TypeError('Invalid non-string/buffer chunk');
	    stream.emit('error', er);
	    setImmediate(function() {
	      cb(er);
	    });
	    valid = false;
	  }
	  return valid;
	}

	Writable.prototype.write = function(chunk, encoding, cb) {
	  var state = this._writableState;
	  var ret = false;

	  if (typeof encoding === 'function') {
	    cb = encoding;
	    encoding = null;
	  }

	  if (!Buffer.isBuffer(chunk) && isUint8Array(chunk))
	    chunk = new Buffer(chunk);
	  if (isArrayBuffer(chunk) && typeof Uint8Array !== 'undefined')
	    chunk = new Buffer(new Uint8Array(chunk));
	  
	  if (Buffer.isBuffer(chunk))
	    encoding = 'buffer';
	  else if (!encoding)
	    encoding = state.defaultEncoding;

	  if (typeof cb !== 'function')
	    cb = function() {};

	  if (state.ended)
	    writeAfterEnd(this, state, cb);
	  else if (validChunk(this, state, chunk, cb))
	    ret = writeOrBuffer(this, state, chunk, encoding, cb);

	  return ret;
	};

	function decodeChunk(state, chunk, encoding) {
	  if (!state.objectMode &&
	      state.decodeStrings !== false &&
	      typeof chunk === 'string') {
	    chunk = new Buffer(chunk, encoding);
	  }
	  return chunk;
	}

	// if we're already writing something, then just put this
	// in the queue, and wait our turn.  Otherwise, call _write
	// If we return false, then we need a drain event, so set that flag.
	function writeOrBuffer(stream, state, chunk, encoding, cb) {
	  chunk = decodeChunk(state, chunk, encoding);
	  var len = state.objectMode ? 1 : chunk.length;

	  state.length += len;

	  var ret = state.length < state.highWaterMark;
	  state.needDrain = !ret;

	  if (state.writing)
	    state.buffer.push(new WriteReq(chunk, encoding, cb));
	  else
	    doWrite(stream, state, len, chunk, encoding, cb);

	  return ret;
	}

	function doWrite(stream, state, len, chunk, encoding, cb) {
	  state.writelen = len;
	  state.writecb = cb;
	  state.writing = true;
	  state.sync = true;
	  stream._write(chunk, encoding, state.onwrite);
	  state.sync = false;
	}

	function onwriteError(stream, state, sync, er, cb) {
	  if (sync)
	    setImmediate(function() {
	      cb(er);
	    });
	  else
	    cb(er);

	  stream.emit('error', er);
	}

	function onwriteStateUpdate(state) {
	  state.writing = false;
	  state.writecb = null;
	  state.length -= state.writelen;
	  state.writelen = 0;
	}

	function onwrite(stream, er) {
	  var state = stream._writableState;
	  var sync = state.sync;
	  var cb = state.writecb;

	  onwriteStateUpdate(state);

	  if (er)
	    onwriteError(stream, state, sync, er, cb);
	  else {
	    // Check if we're actually ready to finish, but don't emit yet
	    var finished = needFinish(stream, state);

	    if (!finished && !state.bufferProcessing && state.buffer.length)
	      clearBuffer(stream, state);

	    if (sync) {
	      setImmediate(function() {
	        afterWrite(stream, state, finished, cb);
	      });
	    } else {
	      afterWrite(stream, state, finished, cb);
	    }
	  }
	}

	function afterWrite(stream, state, finished, cb) {
	  if (!finished)
	    onwriteDrain(stream, state);
	  cb();
	  if (finished)
	    finishMaybe(stream, state);
	}

	// Must force callback to be called on nextTick, so that we don't
	// emit 'drain' before the write() consumer gets the 'false' return
	// value, and has a chance to attach a 'drain' listener.
	function onwriteDrain(stream, state) {
	  if (state.length === 0 && state.needDrain) {
	    state.needDrain = false;
	    stream.emit('drain');
	  }
	}


	// if there's something in the buffer waiting, then process it
	function clearBuffer(stream, state) {
	  state.bufferProcessing = true;

	  for (var c = 0; c < state.buffer.length; c++) {
	    var entry = state.buffer[c];
	    var chunk = entry.chunk;
	    var encoding = entry.encoding;
	    var cb = entry.callback;
	    var len = state.objectMode ? 1 : chunk.length;

	    doWrite(stream, state, len, chunk, encoding, cb);

	    // if we didn't call the onwrite immediately, then
	    // it means that we need to wait until it does.
	    // also, that means that the chunk and cb are currently
	    // being processed, so move the buffer counter past them.
	    if (state.writing) {
	      c++;
	      break;
	    }
	  }

	  state.bufferProcessing = false;
	  if (c < state.buffer.length)
	    state.buffer = state.buffer.slice(c);
	  else
	    state.buffer.length = 0;
	}

	Writable.prototype._write = function(chunk, encoding, cb) {
	  cb(new Error('not implemented'));
	};

	Writable.prototype.end = function(chunk, encoding, cb) {
	  var state = this._writableState;

	  if (typeof chunk === 'function') {
	    cb = chunk;
	    chunk = null;
	    encoding = null;
	  } else if (typeof encoding === 'function') {
	    cb = encoding;
	    encoding = null;
	  }

	  if (typeof chunk !== 'undefined' && chunk !== null)
	    this.write(chunk, encoding);

	  // ignore unnecessary end() calls.
	  if (!state.ending && !state.finished)
	    endWritable(this, state, cb);
	};


	function needFinish(stream, state) {
	  return (state.ending &&
	          state.length === 0 &&
	          !state.finished &&
	          !state.writing);
	}

	function finishMaybe(stream, state) {
	  var need = needFinish(stream, state);
	  if (need) {
	    state.finished = true;
	    stream.emit('finish');
	  }
	  return need;
	}

	function endWritable(stream, state, cb) {
	  state.ending = true;
	  finishMaybe(stream, state);
	  if (cb) {
	    if (state.finished)
	      setImmediate(cb);
	    else
	      stream.once('finish', cb);
	  }
	  state.ended = true;
	}

	},{"./index.js":22,"buffer":15,"inherits":19,"process/browser.js":23}],28:[function(_dereq_,module,exports){
	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var Buffer = _dereq_('buffer').Buffer;

	function assertEncoding(encoding) {
	  if (encoding && !Buffer.isEncoding(encoding)) {
	    throw new Error('Unknown encoding: ' + encoding);
	  }
	}

	var StringDecoder = exports.StringDecoder = function(encoding) {
	  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
	  assertEncoding(encoding);
	  switch (this.encoding) {
	    case 'utf8':
	      // CESU-8 represents each of Surrogate Pair by 3-bytes
	      this.surrogateSize = 3;
	      break;
	    case 'ucs2':
	    case 'utf16le':
	      // UTF-16 represents each of Surrogate Pair by 2-bytes
	      this.surrogateSize = 2;
	      this.detectIncompleteChar = utf16DetectIncompleteChar;
	      break;
	    case 'base64':
	      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
	      this.surrogateSize = 3;
	      this.detectIncompleteChar = base64DetectIncompleteChar;
	      break;
	    default:
	      this.write = passThroughWrite;
	      return;
	  }

	  this.charBuffer = new Buffer(6);
	  this.charReceived = 0;
	  this.charLength = 0;
	};


	StringDecoder.prototype.write = function(buffer) {
	  var charStr = '';
	  var offset = 0;

	  // if our last write ended with an incomplete multibyte character
	  while (this.charLength) {
	    // determine how many remaining bytes this buffer has to offer for this char
	    var i = (buffer.length >= this.charLength - this.charReceived) ?
	                this.charLength - this.charReceived :
	                buffer.length;

	    // add the new bytes to the char buffer
	    buffer.copy(this.charBuffer, this.charReceived, offset, i);
	    this.charReceived += (i - offset);
	    offset = i;

	    if (this.charReceived < this.charLength) {
	      // still not enough chars in this buffer? wait for more ...
	      return '';
	    }

	    // get the character that was split
	    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

	    // lead surrogate (D800-DBFF) is also the incomplete character
	    var charCode = charStr.charCodeAt(charStr.length - 1);
	    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	      this.charLength += this.surrogateSize;
	      charStr = '';
	      continue;
	    }
	    this.charReceived = this.charLength = 0;

	    // if there are no more bytes in this buffer, just emit our char
	    if (i == buffer.length) return charStr;

	    // otherwise cut off the characters end from the beginning of this buffer
	    buffer = buffer.slice(i, buffer.length);
	    break;
	  }

	  var lenIncomplete = this.detectIncompleteChar(buffer);

	  var end = buffer.length;
	  if (this.charLength) {
	    // buffer the incomplete character bytes we got
	    buffer.copy(this.charBuffer, 0, buffer.length - lenIncomplete, end);
	    this.charReceived = lenIncomplete;
	    end -= lenIncomplete;
	  }

	  charStr += buffer.toString(this.encoding, 0, end);

	  var end = charStr.length - 1;
	  var charCode = charStr.charCodeAt(end);
	  // lead surrogate (D800-DBFF) is also the incomplete character
	  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	    var size = this.surrogateSize;
	    this.charLength += size;
	    this.charReceived += size;
	    this.charBuffer.copy(this.charBuffer, size, 0, size);
	    this.charBuffer.write(charStr.charAt(charStr.length - 1), this.encoding);
	    return charStr.substring(0, end);
	  }

	  // or just emit the charStr
	  return charStr;
	};

	StringDecoder.prototype.detectIncompleteChar = function(buffer) {
	  // determine how many bytes we have to check at the end of this buffer
	  var i = (buffer.length >= 3) ? 3 : buffer.length;

	  // Figure out if one of the last i bytes of our buffer announces an
	  // incomplete char.
	  for (; i > 0; i--) {
	    var c = buffer[buffer.length - i];

	    // See http://en.wikipedia.org/wiki/UTF-8#Description

	    // 110XXXXX
	    if (i == 1 && c >> 5 == 0x06) {
	      this.charLength = 2;
	      break;
	    }

	    // 1110XXXX
	    if (i <= 2 && c >> 4 == 0x0E) {
	      this.charLength = 3;
	      break;
	    }

	    // 11110XXX
	    if (i <= 3 && c >> 3 == 0x1E) {
	      this.charLength = 4;
	      break;
	    }
	  }

	  return i;
	};

	StringDecoder.prototype.end = function(buffer) {
	  var res = '';
	  if (buffer && buffer.length)
	    res = this.write(buffer);

	  if (this.charReceived) {
	    var cr = this.charReceived;
	    var buf = this.charBuffer;
	    var enc = this.encoding;
	    res += buf.slice(0, cr).toString(enc);
	  }

	  return res;
	};

	function passThroughWrite(buffer) {
	  return buffer.toString(this.encoding);
	}

	function utf16DetectIncompleteChar(buffer) {
	  var incomplete = this.charReceived = buffer.length % 2;
	  this.charLength = incomplete ? 2 : 0;
	  return incomplete;
	}

	function base64DetectIncompleteChar(buffer) {
	  var incomplete = this.charReceived = buffer.length % 3;
	  this.charLength = incomplete ? 3 : 0;
	  return incomplete;
	}

	},{"buffer":15}],29:[function(_dereq_,module,exports){
	module.exports = function isBuffer(arg) {
	  return arg && typeof arg === 'object'
	    && typeof arg.copy === 'function'
	    && typeof arg.fill === 'function'
	    && typeof arg.readUInt8 === 'function';
	}
	},{}],30:[function(_dereq_,module,exports){
	(function (process,global){
	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var formatRegExp = /%[sdj%]/g;
	exports.format = function(f) {
	  if (!isString(f)) {
	    var objects = [];
	    for (var i = 0; i < arguments.length; i++) {
	      objects.push(inspect(arguments[i]));
	    }
	    return objects.join(' ');
	  }

	  var i = 1;
	  var args = arguments;
	  var len = args.length;
	  var str = String(f).replace(formatRegExp, function(x) {
	    if (x === '%%') return '%';
	    if (i >= len) return x;
	    switch (x) {
	      case '%s': return String(args[i++]);
	      case '%d': return Number(args[i++]);
	      case '%j':
	        try {
	          return JSON.stringify(args[i++]);
	        } catch (_) {
	          return '[Circular]';
	        }
	      default:
	        return x;
	    }
	  });
	  for (var x = args[i]; i < len; x = args[++i]) {
	    if (isNull(x) || !isObject(x)) {
	      str += ' ' + x;
	    } else {
	      str += ' ' + inspect(x);
	    }
	  }
	  return str;
	};


	// Mark that a method should not be used.
	// Returns a modified function which warns once by default.
	// If --no-deprecation is set, then it is a no-op.
	exports.deprecate = function(fn, msg) {
	  // Allow for deprecating things in the process of starting up.
	  if (isUndefined(global.process)) {
	    return function() {
	      return exports.deprecate(fn, msg).apply(this, arguments);
	    };
	  }

	  if (process.noDeprecation === true) {
	    return fn;
	  }

	  var warned = false;
	  function deprecated() {
	    if (!warned) {
	      if (process.throwDeprecation) {
	        throw new Error(msg);
	      } else if (process.traceDeprecation) {
	        console.trace(msg);
	      } else {
	        console.error(msg);
	      }
	      warned = true;
	    }
	    return fn.apply(this, arguments);
	  }

	  return deprecated;
	};


	var debugs = {};
	var debugEnviron;
	exports.debuglog = function(set) {
	  if (isUndefined(debugEnviron))
	    debugEnviron = process.env.NODE_DEBUG || '';
	  set = set.toUpperCase();
	  if (!debugs[set]) {
	    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
	      var pid = process.pid;
	      debugs[set] = function() {
	        var msg = exports.format.apply(exports, arguments);
	        console.error('%s %d: %s', set, pid, msg);
	      };
	    } else {
	      debugs[set] = function() {};
	    }
	  }
	  return debugs[set];
	};


	/**
	 * Echos the value of a value. Trys to print the value out
	 * in the best way possible given the different types.
	 *
	 * @param {Object} obj The object to print out.
	 * @param {Object} opts Optional options object that alters the output.
	 */
	/* legacy: obj, showHidden, depth, colors*/
	function inspect(obj, opts) {
	  // default options
	  var ctx = {
	    seen: [],
	    stylize: stylizeNoColor
	  };
	  // legacy...
	  if (arguments.length >= 3) ctx.depth = arguments[2];
	  if (arguments.length >= 4) ctx.colors = arguments[3];
	  if (isBoolean(opts)) {
	    // legacy...
	    ctx.showHidden = opts;
	  } else if (opts) {
	    // got an "options" object
	    exports._extend(ctx, opts);
	  }
	  // set default options
	  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
	  if (isUndefined(ctx.depth)) ctx.depth = 2;
	  if (isUndefined(ctx.colors)) ctx.colors = false;
	  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
	  if (ctx.colors) ctx.stylize = stylizeWithColor;
	  return formatValue(ctx, obj, ctx.depth);
	}
	exports.inspect = inspect;


	// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
	inspect.colors = {
	  'bold' : [1, 22],
	  'italic' : [3, 23],
	  'underline' : [4, 24],
	  'inverse' : [7, 27],
	  'white' : [37, 39],
	  'grey' : [90, 39],
	  'black' : [30, 39],
	  'blue' : [34, 39],
	  'cyan' : [36, 39],
	  'green' : [32, 39],
	  'magenta' : [35, 39],
	  'red' : [31, 39],
	  'yellow' : [33, 39]
	};

	// Don't use 'blue' not visible on cmd.exe
	inspect.styles = {
	  'special': 'cyan',
	  'number': 'yellow',
	  'boolean': 'yellow',
	  'undefined': 'grey',
	  'null': 'bold',
	  'string': 'green',
	  'date': 'magenta',
	  // "name": intentionally not styling
	  'regexp': 'red'
	};


	function stylizeWithColor(str, styleType) {
	  var style = inspect.styles[styleType];

	  if (style) {
	    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
	           '\u001b[' + inspect.colors[style][1] + 'm';
	  } else {
	    return str;
	  }
	}


	function stylizeNoColor(str, styleType) {
	  return str;
	}


	function arrayToHash(array) {
	  var hash = {};

	  array.forEach(function(val, idx) {
	    hash[val] = true;
	  });

	  return hash;
	}


	function formatValue(ctx, value, recurseTimes) {
	  // Provide a hook for user-specified inspect functions.
	  // Check that value is an object with an inspect function on it
	  if (ctx.customInspect &&
	      value &&
	      isFunction(value.inspect) &&
	      // Filter out the util module, it's inspect function is special
	      value.inspect !== exports.inspect &&
	      // Also filter out any prototype objects using the circular check.
	      !(value.constructor && value.constructor.prototype === value)) {
	    var ret = value.inspect(recurseTimes, ctx);
	    if (!isString(ret)) {
	      ret = formatValue(ctx, ret, recurseTimes);
	    }
	    return ret;
	  }

	  // Primitive types cannot have properties
	  var primitive = formatPrimitive(ctx, value);
	  if (primitive) {
	    return primitive;
	  }

	  // Look up the keys of the object.
	  var keys = Object.keys(value);
	  var visibleKeys = arrayToHash(keys);

	  if (ctx.showHidden) {
	    keys = Object.getOwnPropertyNames(value);
	  }

	  // IE doesn't make error fields non-enumerable
	  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
	  if (isError(value)
	      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
	    return formatError(value);
	  }

	  // Some type of object without properties can be shortcutted.
	  if (keys.length === 0) {
	    if (isFunction(value)) {
	      var name = value.name ? ': ' + value.name : '';
	      return ctx.stylize('[Function' + name + ']', 'special');
	    }
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    }
	    if (isDate(value)) {
	      return ctx.stylize(Date.prototype.toString.call(value), 'date');
	    }
	    if (isError(value)) {
	      return formatError(value);
	    }
	  }

	  var base = '', array = false, braces = ['{', '}'];

	  // Make Array say that they are Array
	  if (isArray(value)) {
	    array = true;
	    braces = ['[', ']'];
	  }

	  // Make functions say that they are functions
	  if (isFunction(value)) {
	    var n = value.name ? ': ' + value.name : '';
	    base = ' [Function' + n + ']';
	  }

	  // Make RegExps say that they are RegExps
	  if (isRegExp(value)) {
	    base = ' ' + RegExp.prototype.toString.call(value);
	  }

	  // Make dates with properties first say the date
	  if (isDate(value)) {
	    base = ' ' + Date.prototype.toUTCString.call(value);
	  }

	  // Make error with message first say the error
	  if (isError(value)) {
	    base = ' ' + formatError(value);
	  }

	  if (keys.length === 0 && (!array || value.length == 0)) {
	    return braces[0] + base + braces[1];
	  }

	  if (recurseTimes < 0) {
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    } else {
	      return ctx.stylize('[Object]', 'special');
	    }
	  }

	  ctx.seen.push(value);

	  var output;
	  if (array) {
	    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
	  } else {
	    output = keys.map(function(key) {
	      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
	    });
	  }

	  ctx.seen.pop();

	  return reduceToSingleString(output, base, braces);
	}


	function formatPrimitive(ctx, value) {
	  if (isUndefined(value))
	    return ctx.stylize('undefined', 'undefined');
	  if (isString(value)) {
	    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
	                                             .replace(/'/g, "\\'")
	                                             .replace(/\\"/g, '"') + '\'';
	    return ctx.stylize(simple, 'string');
	  }
	  if (isNumber(value))
	    return ctx.stylize('' + value, 'number');
	  if (isBoolean(value))
	    return ctx.stylize('' + value, 'boolean');
	  // For some reason typeof null is "object", so special case here.
	  if (isNull(value))
	    return ctx.stylize('null', 'null');
	}


	function formatError(value) {
	  return '[' + Error.prototype.toString.call(value) + ']';
	}


	function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
	  var output = [];
	  for (var i = 0, l = value.length; i < l; ++i) {
	    if (hasOwnProperty(value, String(i))) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          String(i), true));
	    } else {
	      output.push('');
	    }
	  }
	  keys.forEach(function(key) {
	    if (!key.match(/^\d+$/)) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          key, true));
	    }
	  });
	  return output;
	}


	function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
	  var name, str, desc;
	  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
	  if (desc.get) {
	    if (desc.set) {
	      str = ctx.stylize('[Getter/Setter]', 'special');
	    } else {
	      str = ctx.stylize('[Getter]', 'special');
	    }
	  } else {
	    if (desc.set) {
	      str = ctx.stylize('[Setter]', 'special');
	    }
	  }
	  if (!hasOwnProperty(visibleKeys, key)) {
	    name = '[' + key + ']';
	  }
	  if (!str) {
	    if (ctx.seen.indexOf(desc.value) < 0) {
	      if (isNull(recurseTimes)) {
	        str = formatValue(ctx, desc.value, null);
	      } else {
	        str = formatValue(ctx, desc.value, recurseTimes - 1);
	      }
	      if (str.indexOf('\n') > -1) {
	        if (array) {
	          str = str.split('\n').map(function(line) {
	            return '  ' + line;
	          }).join('\n').substr(2);
	        } else {
	          str = '\n' + str.split('\n').map(function(line) {
	            return '   ' + line;
	          }).join('\n');
	        }
	      }
	    } else {
	      str = ctx.stylize('[Circular]', 'special');
	    }
	  }
	  if (isUndefined(name)) {
	    if (array && key.match(/^\d+$/)) {
	      return str;
	    }
	    name = JSON.stringify('' + key);
	    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
	      name = name.substr(1, name.length - 2);
	      name = ctx.stylize(name, 'name');
	    } else {
	      name = name.replace(/'/g, "\\'")
	                 .replace(/\\"/g, '"')
	                 .replace(/(^"|"$)/g, "'");
	      name = ctx.stylize(name, 'string');
	    }
	  }

	  return name + ': ' + str;
	}


	function reduceToSingleString(output, base, braces) {
	  var numLinesEst = 0;
	  var length = output.reduce(function(prev, cur) {
	    numLinesEst++;
	    if (cur.indexOf('\n') >= 0) numLinesEst++;
	    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
	  }, 0);

	  if (length > 60) {
	    return braces[0] +
	           (base === '' ? '' : base + '\n ') +
	           ' ' +
	           output.join(',\n  ') +
	           ' ' +
	           braces[1];
	  }

	  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
	}


	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	function isArray(ar) {
	  return Array.isArray(ar);
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;

	function isError(e) {
	  return isObject(e) &&
	      (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	exports.isBuffer = _dereq_('./support/isBuffer');

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}


	function pad(n) {
	  return n < 10 ? '0' + n.toString(10) : n.toString(10);
	}


	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
	              'Oct', 'Nov', 'Dec'];

	// 26 Feb 16:19:34
	function timestamp() {
	  var d = new Date();
	  var time = [pad(d.getHours()),
	              pad(d.getMinutes()),
	              pad(d.getSeconds())].join(':');
	  return [d.getDate(), months[d.getMonth()], time].join(' ');
	}


	// log is just a thin wrapper to console.log that prepends a timestamp
	exports.log = function() {
	  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
	};


	/**
	 * Inherit the prototype methods from one constructor into another.
	 *
	 * The Function.prototype.inherits from lang.js rewritten as a standalone
	 * function (not on Function.prototype). NOTE: If this file is to be loaded
	 * during bootstrapping this function needs to be rewritten using some native
	 * functions as prototype setup using normal JavaScript does not work as
	 * expected during bootstrapping (see mirror.js in r114903).
	 *
	 * @param {function} ctor Constructor function which needs to inherit the
	 *     prototype.
	 * @param {function} superCtor Constructor function to inherit prototype from.
	 */
	exports.inherits = _dereq_('inherits');

	exports._extend = function(origin, add) {
	  // Don't do anything if add isn't an object
	  if (!add || !isObject(add)) return origin;

	  var keys = Object.keys(add);
	  var i = keys.length;
	  while (i--) {
	    origin[keys[i]] = add[keys[i]];
	  }
	  return origin;
	};

	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	}).call(this,_dereq_("+xKvab"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
	},{"+xKvab":20,"./support/isBuffer":29,"inherits":19}],31:[function(_dereq_,module,exports){
	module.exports = _dereq_('zlib');
	},{"zlib":14}]},{},[31])
	(31)
	});
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(5).Buffer))

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer, global) {/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */
	/* eslint-disable no-proto */

	'use strict'

	var base64 = __webpack_require__(6)
	var ieee754 = __webpack_require__(7)
	var isArray = __webpack_require__(8)

	exports.Buffer = Buffer
	exports.SlowBuffer = SlowBuffer
	exports.INSPECT_MAX_BYTES = 50
	Buffer.poolSize = 8192 // not used by this implementation

	var rootParent = {}

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * Due to various browser bugs, sometimes the Object implementation will be used even
	 * when the browser supports typed arrays.
	 *
	 * Note:
	 *
	 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
	 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
	 *
	 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
	 *     on objects.
	 *
	 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
	 *
	 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
	 *     incorrect length in some situations.

	 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
	 * get the Object implementation, which is slower but behaves correctly.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
	  ? global.TYPED_ARRAY_SUPPORT
	  : typedArraySupport()

	function typedArraySupport () {
	  function Bar () {}
	  try {
	    var arr = new Uint8Array(1)
	    arr.foo = function () { return 42 }
	    arr.constructor = Bar
	    return arr.foo() === 42 && // typed array instances can be augmented
	        arr.constructor === Bar && // constructor can be set
	        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
	        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
	  } catch (e) {
	    return false
	  }
	}

	function kMaxLength () {
	  return Buffer.TYPED_ARRAY_SUPPORT
	    ? 0x7fffffff
	    : 0x3fffffff
	}

	/**
	 * Class: Buffer
	 * =============
	 *
	 * The Buffer constructor returns instances of `Uint8Array` that are augmented
	 * with function properties for all the node `Buffer` API functions. We use
	 * `Uint8Array` so that square bracket notation works as expected -- it returns
	 * a single octet.
	 *
	 * By augmenting the instances, we can avoid modifying the `Uint8Array`
	 * prototype.
	 */
	function Buffer (arg) {
	  if (!(this instanceof Buffer)) {
	    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
	    if (arguments.length > 1) return new Buffer(arg, arguments[1])
	    return new Buffer(arg)
	  }

	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    this.length = 0
	    this.parent = undefined
	  }

	  // Common case.
	  if (typeof arg === 'number') {
	    return fromNumber(this, arg)
	  }

	  // Slightly less common case.
	  if (typeof arg === 'string') {
	    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
	  }

	  // Unusual.
	  return fromObject(this, arg)
	}

	function fromNumber (that, length) {
	  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < length; i++) {
	      that[i] = 0
	    }
	  }
	  return that
	}

	function fromString (that, string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

	  // Assumption: byteLength() return value is always < kMaxLength.
	  var length = byteLength(string, encoding) | 0
	  that = allocate(that, length)

	  that.write(string, encoding)
	  return that
	}

	function fromObject (that, object) {
	  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

	  if (isArray(object)) return fromArray(that, object)

	  if (object == null) {
	    throw new TypeError('must start with number, buffer, array or string')
	  }

	  if (typeof ArrayBuffer !== 'undefined') {
	    if (object.buffer instanceof ArrayBuffer) {
	      return fromTypedArray(that, object)
	    }
	    if (object instanceof ArrayBuffer) {
	      return fromArrayBuffer(that, object)
	    }
	  }

	  if (object.length) return fromArrayLike(that, object)

	  return fromJsonObject(that, object)
	}

	function fromBuffer (that, buffer) {
	  var length = checked(buffer.length) | 0
	  that = allocate(that, length)
	  buffer.copy(that, 0, 0, length)
	  return that
	}

	function fromArray (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	// Duplicate of fromArray() to keep fromArray() monomorphic.
	function fromTypedArray (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  // Truncating the elements is probably not what people expect from typed
	  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
	  // of the old Buffer constructor.
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	function fromArrayBuffer (that, array) {
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    array.byteLength
	    that = Buffer._augment(new Uint8Array(array))
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that = fromTypedArray(that, new Uint8Array(array))
	  }
	  return that
	}

	function fromArrayLike (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
	// Returns a zero-length buffer for inputs that don't conform to the spec.
	function fromJsonObject (that, object) {
	  var array
	  var length = 0

	  if (object.type === 'Buffer' && isArray(object.data)) {
	    array = object.data
	    length = checked(array.length) | 0
	  }
	  that = allocate(that, length)

	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	if (Buffer.TYPED_ARRAY_SUPPORT) {
	  Buffer.prototype.__proto__ = Uint8Array.prototype
	  Buffer.__proto__ = Uint8Array
	} else {
	  // pre-set for values that may exist in the future
	  Buffer.prototype.length = undefined
	  Buffer.prototype.parent = undefined
	}

	function allocate (that, length) {
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = Buffer._augment(new Uint8Array(length))
	    that.__proto__ = Buffer.prototype
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that.length = length
	    that._isBuffer = true
	  }

	  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
	  if (fromPool) that.parent = rootParent

	  return that
	}

	function checked (length) {
	  // Note: cannot use `length < kMaxLength` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= kMaxLength()) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (subject, encoding) {
	  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

	  var buf = new Buffer(subject, encoding)
	  delete buf.parent
	  return buf
	}

	Buffer.isBuffer = function isBuffer (b) {
	  return !!(b != null && b._isBuffer)
	}

	Buffer.compare = function compare (a, b) {
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
	    throw new TypeError('Arguments must be Buffers')
	  }

	  if (a === b) return 0

	  var x = a.length
	  var y = b.length

	  var i = 0
	  var len = Math.min(x, y)
	  while (i < len) {
	    if (a[i] !== b[i]) break

	    ++i
	  }

	  if (i !== len) {
	    x = a[i]
	    y = b[i]
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'binary':
	    case 'base64':
	    case 'raw':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	}

	Buffer.concat = function concat (list, length) {
	  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

	  if (list.length === 0) {
	    return new Buffer(0)
	  }

	  var i
	  if (length === undefined) {
	    length = 0
	    for (i = 0; i < list.length; i++) {
	      length += list[i].length
	    }
	  }

	  var buf = new Buffer(length)
	  var pos = 0
	  for (i = 0; i < list.length; i++) {
	    var item = list[i]
	    item.copy(buf, pos)
	    pos += item.length
	  }
	  return buf
	}

	function byteLength (string, encoding) {
	  if (typeof string !== 'string') string = '' + string

	  var len = string.length
	  if (len === 0) return 0

	  // Use a for loop to avoid recursion
	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'binary':
	      // Deprecated
	      case 'raw':
	      case 'raws':
	        return len
	      case 'utf8':
	      case 'utf-8':
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) return utf8ToBytes(string).length // assume utf8
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}
	Buffer.byteLength = byteLength

	function slowToString (encoding, start, end) {
	  var loweredCase = false

	  start = start | 0
	  end = end === undefined || end === Infinity ? this.length : end | 0

	  if (!encoding) encoding = 'utf8'
	  if (start < 0) start = 0
	  if (end > this.length) end = this.length
	  if (end <= start) return ''

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'binary':
	        return binarySlice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toString = function toString () {
	  var length = this.length | 0
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	}

	Buffer.prototype.equals = function equals (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	}

	Buffer.prototype.inspect = function inspect () {
	  var str = ''
	  var max = exports.INSPECT_MAX_BYTES
	  if (this.length > 0) {
	    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
	    if (this.length > max) str += ' ... '
	  }
	  return '<Buffer ' + str + '>'
	}

	Buffer.prototype.compare = function compare (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return 0
	  return Buffer.compare(this, b)
	}

	Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
	  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
	  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
	  byteOffset >>= 0

	  if (this.length === 0) return -1
	  if (byteOffset >= this.length) return -1

	  // Negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

	  if (typeof val === 'string') {
	    if (val.length === 0) return -1 // special case: looking for empty string always fails
	    return String.prototype.indexOf.call(this, val, byteOffset)
	  }
	  if (Buffer.isBuffer(val)) {
	    return arrayIndexOf(this, val, byteOffset)
	  }
	  if (typeof val === 'number') {
	    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
	      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
	    }
	    return arrayIndexOf(this, [ val ], byteOffset)
	  }

	  function arrayIndexOf (arr, val, byteOffset) {
	    var foundIndex = -1
	    for (var i = 0; byteOffset + i < arr.length; i++) {
	      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
	        if (foundIndex === -1) foundIndex = i
	        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
	      } else {
	        foundIndex = -1
	      }
	    }
	    return -1
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	// `get` is deprecated
	Buffer.prototype.get = function get (offset) {
	  console.log('.get() is deprecated. Access using array indexes instead.')
	  return this.readUInt8(offset)
	}

	// `set` is deprecated
	Buffer.prototype.set = function set (v, offset) {
	  console.log('.set() is deprecated. Access using array indexes instead.')
	  return this.writeUInt8(v, offset)
	}

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0
	  var remaining = buf.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length
	  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2
	  }
	  for (var i = 0; i < length; i++) {
	    var parsed = parseInt(string.substr(i * 2, 2), 16)
	    if (isNaN(parsed)) throw new Error('Invalid hex string')
	    buf[offset + i] = parsed
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function binaryWrite (buf, string, offset, length) {
	  return asciiWrite(buf, string, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8'
	    length = this.length
	    offset = 0
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset
	    length = this.length
	    offset = 0
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset | 0
	    if (isFinite(length)) {
	      length = length | 0
	      if (encoding === undefined) encoding = 'utf8'
	    } else {
	      encoding = length
	      length = undefined
	    }
	  // legacy write(string, encoding, offset, length) - remove in v0.13
	  } else {
	    var swap = encoding
	    encoding = offset
	    offset = length | 0
	    length = swap
	  }

	  var remaining = this.length - offset
	  if (length === undefined || length > remaining) length = remaining

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8'

	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	        return asciiWrite(this, string, offset, length)

	      case 'binary':
	        return binaryWrite(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	}

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  end = Math.min(buf.length, end)
	  var res = []

	  var i = start
	  while (i < end) {
	    var firstByte = buf[i]
	    var codePoint = null
	    var bytesPerSequence = (firstByte > 0xEF) ? 4
	      : (firstByte > 0xDF) ? 3
	      : (firstByte > 0xBF) ? 2
	      : 1

	    if (i + bytesPerSequence <= end) {
	      var secondByte, thirdByte, fourthByte, tempCodePoint

	      switch (bytesPerSequence) {
	        case 1:
	          if (firstByte < 0x80) {
	            codePoint = firstByte
	          }
	          break
	        case 2:
	          secondByte = buf[i + 1]
	          if ((secondByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
	            if (tempCodePoint > 0x7F) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 3:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 4:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          fourthByte = buf[i + 3]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
	              codePoint = tempCodePoint
	            }
	          }
	      }
	    }

	    if (codePoint === null) {
	      // we did not generate a valid codePoint so insert a
	      // replacement char (U+FFFD) and advance only 1 byte
	      codePoint = 0xFFFD
	      bytesPerSequence = 1
	    } else if (codePoint > 0xFFFF) {
	      // encode to utf16 (surrogate pair dance)
	      codePoint -= 0x10000
	      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
	      codePoint = 0xDC00 | codePoint & 0x3FF
	    }

	    res.push(codePoint)
	    i += bytesPerSequence
	  }

	  return decodeCodePointsArray(res)
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	var MAX_ARGUMENTS_LENGTH = 0x1000

	function decodeCodePointsArray (codePoints) {
	  var len = codePoints.length
	  if (len <= MAX_ARGUMENTS_LENGTH) {
	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
	  }

	  // Decode in chunks to avoid "call stack size exceeded".
	  var res = ''
	  var i = 0
	  while (i < len) {
	    res += String.fromCharCode.apply(
	      String,
	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
	    )
	  }
	  return res
	}

	function asciiSlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i] & 0x7F)
	  }
	  return ret
	}

	function binarySlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i])
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  var len = buf.length

	  if (!start || start < 0) start = 0
	  if (!end || end < 0 || end > len) end = len

	  var out = ''
	  for (var i = start; i < end; i++) {
	    out += toHex(buf[i])
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end)
	  var res = ''
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  var len = this.length
	  start = ~~start
	  end = end === undefined ? len : ~~end

	  if (start < 0) {
	    start += len
	    if (start < 0) start = 0
	  } else if (start > len) {
	    start = len
	  }

	  if (end < 0) {
	    end += len
	    if (end < 0) end = 0
	  } else if (end > len) {
	    end = len
	  }

	  if (end < start) end = start

	  var newBuf
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    newBuf = Buffer._augment(this.subarray(start, end))
	  } else {
	    var sliceLen = end - start
	    newBuf = new Buffer(sliceLen, undefined)
	    for (var i = 0; i < sliceLen; i++) {
	      newBuf[i] = this[i + start]
	    }
	  }

	  if (newBuf.length) newBuf.parent = this.parent || this

	  return newBuf
	}

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }

	  return val
	}

	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length)
	  }

	  var val = this[offset + --byteLength]
	  var mul = 1
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul
	  }

	  return val
	}

	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  return this[offset]
	}

	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return this[offset] | (this[offset + 1] << 8)
	}

	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return (this[offset] << 8) | this[offset + 1]
	}

	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	}

	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	}

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var i = byteLength
	  var mul = 1
	  var val = this[offset + --i]
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	}

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset] | (this[offset + 1] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset + 1] | (this[offset] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	}

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	}

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, true, 23, 4)
	}

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, false, 23, 4)
	}

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, true, 52, 8)
	}

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, false, 52, 8)
	}

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('index out of range')
	}

	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

	  var mul = 1
	  var i = 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

	  var i = byteLength - 1
	  var mul = 1
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	function objectWriteUInt16 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
	    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	      (littleEndian ? i : 1 - i) * 8
	  }
	}

	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	function objectWriteUInt32 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffffffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
	    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
	  }
	}

	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset + 3] = (value >>> 24)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 1] = (value >>> 8)
	    this[offset] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = 0
	  var mul = 1
	  var sub = value < 0 ? 1 : 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = byteLength - 1
	  var mul = 1
	  var sub = value < 0 ? 1 : 0
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  if (value < 0) value = 0xff + value + 1
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 3] = (value >>> 24)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (value < 0) value = 0xffffffff + value + 1
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (value > max || value < min) throw new RangeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('index out of range')
	  if (offset < 0) throw new RangeError('index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 23, 4)
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	}

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 52, 8)
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	}

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!start) start = 0
	  if (!end && end !== 0) end = this.length
	  if (targetStart >= target.length) targetStart = target.length
	  if (!targetStart) targetStart = 0
	  if (end > 0 && end < start) end = start

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start
	  }

	  var len = end - start
	  var i

	  if (this === target && start < targetStart && targetStart < end) {
	    // descending copy from end
	    for (i = len - 1; i >= 0; i--) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
	    // ascending copy from start
	    for (i = 0; i < len; i++) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else {
	    target._set(this.subarray(start, start + len), targetStart)
	  }

	  return len
	}

	// fill(value, start=0, end=buffer.length)
	Buffer.prototype.fill = function fill (value, start, end) {
	  if (!value) value = 0
	  if (!start) start = 0
	  if (!end) end = this.length

	  if (end < start) throw new RangeError('end < start')

	  // Fill 0 bytes; we're done
	  if (end === start) return
	  if (this.length === 0) return

	  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
	  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

	  var i
	  if (typeof value === 'number') {
	    for (i = start; i < end; i++) {
	      this[i] = value
	    }
	  } else {
	    var bytes = utf8ToBytes(value.toString())
	    var len = bytes.length
	    for (i = start; i < end; i++) {
	      this[i] = bytes[i % len]
	    }
	  }

	  return this
	}

	/**
	 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
	 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
	 */
	Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
	  if (typeof Uint8Array !== 'undefined') {
	    if (Buffer.TYPED_ARRAY_SUPPORT) {
	      return (new Buffer(this)).buffer
	    } else {
	      var buf = new Uint8Array(this.length)
	      for (var i = 0, len = buf.length; i < len; i += 1) {
	        buf[i] = this[i]
	      }
	      return buf.buffer
	    }
	  } else {
	    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
	  }
	}

	// HELPER FUNCTIONS
	// ================

	var BP = Buffer.prototype

	/**
	 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
	 */
	Buffer._augment = function _augment (arr) {
	  arr.constructor = Buffer
	  arr._isBuffer = true

	  // save reference to original Uint8Array set method before overwriting
	  arr._set = arr.set

	  // deprecated
	  arr.get = BP.get
	  arr.set = BP.set

	  arr.write = BP.write
	  arr.toString = BP.toString
	  arr.toLocaleString = BP.toString
	  arr.toJSON = BP.toJSON
	  arr.equals = BP.equals
	  arr.compare = BP.compare
	  arr.indexOf = BP.indexOf
	  arr.copy = BP.copy
	  arr.slice = BP.slice
	  arr.readUIntLE = BP.readUIntLE
	  arr.readUIntBE = BP.readUIntBE
	  arr.readUInt8 = BP.readUInt8
	  arr.readUInt16LE = BP.readUInt16LE
	  arr.readUInt16BE = BP.readUInt16BE
	  arr.readUInt32LE = BP.readUInt32LE
	  arr.readUInt32BE = BP.readUInt32BE
	  arr.readIntLE = BP.readIntLE
	  arr.readIntBE = BP.readIntBE
	  arr.readInt8 = BP.readInt8
	  arr.readInt16LE = BP.readInt16LE
	  arr.readInt16BE = BP.readInt16BE
	  arr.readInt32LE = BP.readInt32LE
	  arr.readInt32BE = BP.readInt32BE
	  arr.readFloatLE = BP.readFloatLE
	  arr.readFloatBE = BP.readFloatBE
	  arr.readDoubleLE = BP.readDoubleLE
	  arr.readDoubleBE = BP.readDoubleBE
	  arr.writeUInt8 = BP.writeUInt8
	  arr.writeUIntLE = BP.writeUIntLE
	  arr.writeUIntBE = BP.writeUIntBE
	  arr.writeUInt16LE = BP.writeUInt16LE
	  arr.writeUInt16BE = BP.writeUInt16BE
	  arr.writeUInt32LE = BP.writeUInt32LE
	  arr.writeUInt32BE = BP.writeUInt32BE
	  arr.writeIntLE = BP.writeIntLE
	  arr.writeIntBE = BP.writeIntBE
	  arr.writeInt8 = BP.writeInt8
	  arr.writeInt16LE = BP.writeInt16LE
	  arr.writeInt16BE = BP.writeInt16BE
	  arr.writeInt32LE = BP.writeInt32LE
	  arr.writeInt32BE = BP.writeInt32BE
	  arr.writeFloatLE = BP.writeFloatLE
	  arr.writeFloatBE = BP.writeFloatBE
	  arr.writeDoubleLE = BP.writeDoubleLE
	  arr.writeDoubleBE = BP.writeDoubleBE
	  arr.fill = BP.fill
	  arr.inspect = BP.inspect
	  arr.toArrayBuffer = BP.toArrayBuffer

	  return arr
	}

	var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

	function base64clean (str) {
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '='
	  }
	  return str
	}

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity
	  var codePoint
	  var length = string.length
	  var leadSurrogate = null
	  var bytes = []

	  for (var i = 0; i < length; i++) {
	    codePoint = string.charCodeAt(i)

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (!leadSurrogate) {
	        // no lead yet
	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        }

	        // valid lead
	        leadSurrogate = codePoint

	        continue
	      }

	      // 2 leads in a row
	      if (codePoint < 0xDC00) {
	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	        leadSurrogate = codePoint
	        continue
	      }

	      // valid surrogate pair
	      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	    }

	    leadSurrogate = null

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint)
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x110000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF)
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  var c, hi, lo
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i)
	    hi = c >> 8
	    lo = c % 256
	    byteArray.push(lo)
	    byteArray.push(hi)
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  for (var i = 0; i < length; i++) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i]
	  }
	  return i
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(5).Buffer, (function() { return this; }())))

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	;(function (exports) {
		'use strict';

	  var Arr = (typeof Uint8Array !== 'undefined')
	    ? Uint8Array
	    : Array

		var PLUS   = '+'.charCodeAt(0)
		var SLASH  = '/'.charCodeAt(0)
		var NUMBER = '0'.charCodeAt(0)
		var LOWER  = 'a'.charCodeAt(0)
		var UPPER  = 'A'.charCodeAt(0)
		var PLUS_URL_SAFE = '-'.charCodeAt(0)
		var SLASH_URL_SAFE = '_'.charCodeAt(0)

		function decode (elt) {
			var code = elt.charCodeAt(0)
			if (code === PLUS ||
			    code === PLUS_URL_SAFE)
				return 62 // '+'
			if (code === SLASH ||
			    code === SLASH_URL_SAFE)
				return 63 // '/'
			if (code < NUMBER)
				return -1 //no match
			if (code < NUMBER + 10)
				return code - NUMBER + 26 + 26
			if (code < UPPER + 26)
				return code - UPPER
			if (code < LOWER + 26)
				return code - LOWER + 26
		}

		function b64ToByteArray (b64) {
			var i, j, l, tmp, placeHolders, arr

			if (b64.length % 4 > 0) {
				throw new Error('Invalid string. Length must be a multiple of 4')
			}

			// the number of equal signs (place holders)
			// if there are two placeholders, than the two characters before it
			// represent one byte
			// if there is only one, then the three characters before it represent 2 bytes
			// this is just a cheap hack to not do indexOf twice
			var len = b64.length
			placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

			// base64 is 4/3 + up to two characters of the original data
			arr = new Arr(b64.length * 3 / 4 - placeHolders)

			// if there are placeholders, only get up to the last complete 4 chars
			l = placeHolders > 0 ? b64.length - 4 : b64.length

			var L = 0

			function push (v) {
				arr[L++] = v
			}

			for (i = 0, j = 0; i < l; i += 4, j += 3) {
				tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
				push((tmp & 0xFF0000) >> 16)
				push((tmp & 0xFF00) >> 8)
				push(tmp & 0xFF)
			}

			if (placeHolders === 2) {
				tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
				push(tmp & 0xFF)
			} else if (placeHolders === 1) {
				tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
				push((tmp >> 8) & 0xFF)
				push(tmp & 0xFF)
			}

			return arr
		}

		function uint8ToBase64 (uint8) {
			var i,
				extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
				output = "",
				temp, length

			function encode (num) {
				return lookup.charAt(num)
			}

			function tripletToBase64 (num) {
				return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
			}

			// go through the array every three bytes, we'll deal with trailing stuff later
			for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
				temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
				output += tripletToBase64(temp)
			}

			// pad the end with zeros, but make sure to not forget the extra bytes
			switch (extraBytes) {
				case 1:
					temp = uint8[uint8.length - 1]
					output += encode(temp >> 2)
					output += encode((temp << 4) & 0x3F)
					output += '=='
					break
				case 2:
					temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
					output += encode(temp >> 10)
					output += encode((temp >> 4) & 0x3F)
					output += encode((temp << 2) & 0x3F)
					output += '='
					break
			}

			return output
		}

		exports.toByteArray = b64ToByteArray
		exports.fromByteArray = uint8ToBase64
	}( false ? (this.base64js = {}) : exports))


/***/ },
/* 7 */
/***/ function(module, exports) {

	exports.read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var nBits = -7
	  var i = isLE ? (nBytes - 1) : 0
	  var d = isLE ? -1 : 1
	  var s = buffer[offset + i]

	  i += d

	  e = s & ((1 << (-nBits)) - 1)
	  s >>= (-nBits)
	  nBits += eLen
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1)
	  e >>= (-nBits)
	  nBits += mLen
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen)
	    e = e - eBias
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	}

	exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
	  var i = isLE ? 0 : (nBytes - 1)
	  var d = isLE ? 1 : -1
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

	  value = Math.abs(value)

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0
	    e = eMax
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2)
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--
	      c *= 2
	    }
	    if (e + eBias >= 1) {
	      value += rt / c
	    } else {
	      value += rt * Math.pow(2, 1 - eBias)
	    }
	    if (value * c >= 2) {
	      e++
	      c /= 2
	    }

	    if (e + eBias >= eMax) {
	      m = 0
	      e = eMax
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen)
	      e = e + eBias
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
	      e = 0
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m
	  eLen += mLen
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128
	}


/***/ },
/* 8 */
/***/ function(module, exports) {

	var toString = {}.toString;

	module.exports = Array.isArray || function (arr) {
	  return toString.call(arr) == '[object Array]';
	};


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * jQuery JavaScript Library v2.2.1
	 * http://jquery.com/
	 *
	 * Includes Sizzle.js
	 * http://sizzlejs.com/
	 *
	 * Copyright jQuery Foundation and other contributors
	 * Released under the MIT license
	 * http://jquery.org/license
	 *
	 * Date: 2016-02-22T19:11Z
	 */

	(function( global, factory ) {

		if ( typeof module === "object" && typeof module.exports === "object" ) {
			// For CommonJS and CommonJS-like environments where a proper `window`
			// is present, execute the factory and get jQuery.
			// For environments that do not have a `window` with a `document`
			// (such as Node.js), expose a factory as module.exports.
			// This accentuates the need for the creation of a real `window`.
			// e.g. var jQuery = require("jquery")(window);
			// See ticket #14549 for more info.
			module.exports = global.document ?
				factory( global, true ) :
				function( w ) {
					if ( !w.document ) {
						throw new Error( "jQuery requires a window with a document" );
					}
					return factory( w );
				};
		} else {
			factory( global );
		}

	// Pass this if window is not defined yet
	}(typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

	// Support: Firefox 18+
	// Can't be in strict mode, several libs including ASP.NET trace
	// the stack via arguments.caller.callee and Firefox dies if
	// you try to trace through "use strict" call chains. (#13335)
	//"use strict";
	var arr = [];

	var document = window.document;

	var slice = arr.slice;

	var concat = arr.concat;

	var push = arr.push;

	var indexOf = arr.indexOf;

	var class2type = {};

	var toString = class2type.toString;

	var hasOwn = class2type.hasOwnProperty;

	var support = {};



	var
		version = "2.2.1",

		// Define a local copy of jQuery
		jQuery = function( selector, context ) {

			// The jQuery object is actually just the init constructor 'enhanced'
			// Need init if jQuery is called (just allow error to be thrown if not included)
			return new jQuery.fn.init( selector, context );
		},

		// Support: Android<4.1
		// Make sure we trim BOM and NBSP
		rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

		// Matches dashed string for camelizing
		rmsPrefix = /^-ms-/,
		rdashAlpha = /-([\da-z])/gi,

		// Used by jQuery.camelCase as callback to replace()
		fcamelCase = function( all, letter ) {
			return letter.toUpperCase();
		};

	jQuery.fn = jQuery.prototype = {

		// The current version of jQuery being used
		jquery: version,

		constructor: jQuery,

		// Start with an empty selector
		selector: "",

		// The default length of a jQuery object is 0
		length: 0,

		toArray: function() {
			return slice.call( this );
		},

		// Get the Nth element in the matched element set OR
		// Get the whole matched element set as a clean array
		get: function( num ) {
			return num != null ?

				// Return just the one element from the set
				( num < 0 ? this[ num + this.length ] : this[ num ] ) :

				// Return all the elements in a clean array
				slice.call( this );
		},

		// Take an array of elements and push it onto the stack
		// (returning the new matched element set)
		pushStack: function( elems ) {

			// Build a new jQuery matched element set
			var ret = jQuery.merge( this.constructor(), elems );

			// Add the old object onto the stack (as a reference)
			ret.prevObject = this;
			ret.context = this.context;

			// Return the newly-formed element set
			return ret;
		},

		// Execute a callback for every element in the matched set.
		each: function( callback ) {
			return jQuery.each( this, callback );
		},

		map: function( callback ) {
			return this.pushStack( jQuery.map( this, function( elem, i ) {
				return callback.call( elem, i, elem );
			} ) );
		},

		slice: function() {
			return this.pushStack( slice.apply( this, arguments ) );
		},

		first: function() {
			return this.eq( 0 );
		},

		last: function() {
			return this.eq( -1 );
		},

		eq: function( i ) {
			var len = this.length,
				j = +i + ( i < 0 ? len : 0 );
			return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
		},

		end: function() {
			return this.prevObject || this.constructor();
		},

		// For internal use only.
		// Behaves like an Array's method, not like a jQuery method.
		push: push,
		sort: arr.sort,
		splice: arr.splice
	};

	jQuery.extend = jQuery.fn.extend = function() {
		var options, name, src, copy, copyIsArray, clone,
			target = arguments[ 0 ] || {},
			i = 1,
			length = arguments.length,
			deep = false;

		// Handle a deep copy situation
		if ( typeof target === "boolean" ) {
			deep = target;

			// Skip the boolean and the target
			target = arguments[ i ] || {};
			i++;
		}

		// Handle case when target is a string or something (possible in deep copy)
		if ( typeof target !== "object" && !jQuery.isFunction( target ) ) {
			target = {};
		}

		// Extend jQuery itself if only one argument is passed
		if ( i === length ) {
			target = this;
			i--;
		}

		for ( ; i < length; i++ ) {

			// Only deal with non-null/undefined values
			if ( ( options = arguments[ i ] ) != null ) {

				// Extend the base object
				for ( name in options ) {
					src = target[ name ];
					copy = options[ name ];

					// Prevent never-ending loop
					if ( target === copy ) {
						continue;
					}

					// Recurse if we're merging plain objects or arrays
					if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
						( copyIsArray = jQuery.isArray( copy ) ) ) ) {

						if ( copyIsArray ) {
							copyIsArray = false;
							clone = src && jQuery.isArray( src ) ? src : [];

						} else {
							clone = src && jQuery.isPlainObject( src ) ? src : {};
						}

						// Never move original objects, clone them
						target[ name ] = jQuery.extend( deep, clone, copy );

					// Don't bring in undefined values
					} else if ( copy !== undefined ) {
						target[ name ] = copy;
					}
				}
			}
		}

		// Return the modified object
		return target;
	};

	jQuery.extend( {

		// Unique for each copy of jQuery on the page
		expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

		// Assume jQuery is ready without the ready module
		isReady: true,

		error: function( msg ) {
			throw new Error( msg );
		},

		noop: function() {},

		isFunction: function( obj ) {
			return jQuery.type( obj ) === "function";
		},

		isArray: Array.isArray,

		isWindow: function( obj ) {
			return obj != null && obj === obj.window;
		},

		isNumeric: function( obj ) {

			// parseFloat NaNs numeric-cast false positives (null|true|false|"")
			// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
			// subtraction forces infinities to NaN
			// adding 1 corrects loss of precision from parseFloat (#15100)
			var realStringObj = obj && obj.toString();
			return !jQuery.isArray( obj ) && ( realStringObj - parseFloat( realStringObj ) + 1 ) >= 0;
		},

		isPlainObject: function( obj ) {

			// Not plain objects:
			// - Any object or value whose internal [[Class]] property is not "[object Object]"
			// - DOM nodes
			// - window
			if ( jQuery.type( obj ) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
				return false;
			}

			if ( obj.constructor &&
					!hasOwn.call( obj.constructor.prototype, "isPrototypeOf" ) ) {
				return false;
			}

			// If the function hasn't returned already, we're confident that
			// |obj| is a plain object, created by {} or constructed with new Object
			return true;
		},

		isEmptyObject: function( obj ) {
			var name;
			for ( name in obj ) {
				return false;
			}
			return true;
		},

		type: function( obj ) {
			if ( obj == null ) {
				return obj + "";
			}

			// Support: Android<4.0, iOS<6 (functionish RegExp)
			return typeof obj === "object" || typeof obj === "function" ?
				class2type[ toString.call( obj ) ] || "object" :
				typeof obj;
		},

		// Evaluates a script in a global context
		globalEval: function( code ) {
			var script,
				indirect = eval;

			code = jQuery.trim( code );

			if ( code ) {

				// If the code includes a valid, prologue position
				// strict mode pragma, execute code by injecting a
				// script tag into the document.
				if ( code.indexOf( "use strict" ) === 1 ) {
					script = document.createElement( "script" );
					script.text = code;
					document.head.appendChild( script ).parentNode.removeChild( script );
				} else {

					// Otherwise, avoid the DOM node creation, insertion
					// and removal by using an indirect global eval

					indirect( code );
				}
			}
		},

		// Convert dashed to camelCase; used by the css and data modules
		// Support: IE9-11+
		// Microsoft forgot to hump their vendor prefix (#9572)
		camelCase: function( string ) {
			return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
		},

		nodeName: function( elem, name ) {
			return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
		},

		each: function( obj, callback ) {
			var length, i = 0;

			if ( isArrayLike( obj ) ) {
				length = obj.length;
				for ( ; i < length; i++ ) {
					if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
						break;
					}
				}
			}

			return obj;
		},

		// Support: Android<4.1
		trim: function( text ) {
			return text == null ?
				"" :
				( text + "" ).replace( rtrim, "" );
		},

		// results is for internal usage only
		makeArray: function( arr, results ) {
			var ret = results || [];

			if ( arr != null ) {
				if ( isArrayLike( Object( arr ) ) ) {
					jQuery.merge( ret,
						typeof arr === "string" ?
						[ arr ] : arr
					);
				} else {
					push.call( ret, arr );
				}
			}

			return ret;
		},

		inArray: function( elem, arr, i ) {
			return arr == null ? -1 : indexOf.call( arr, elem, i );
		},

		merge: function( first, second ) {
			var len = +second.length,
				j = 0,
				i = first.length;

			for ( ; j < len; j++ ) {
				first[ i++ ] = second[ j ];
			}

			first.length = i;

			return first;
		},

		grep: function( elems, callback, invert ) {
			var callbackInverse,
				matches = [],
				i = 0,
				length = elems.length,
				callbackExpect = !invert;

			// Go through the array, only saving the items
			// that pass the validator function
			for ( ; i < length; i++ ) {
				callbackInverse = !callback( elems[ i ], i );
				if ( callbackInverse !== callbackExpect ) {
					matches.push( elems[ i ] );
				}
			}

			return matches;
		},

		// arg is for internal usage only
		map: function( elems, callback, arg ) {
			var length, value,
				i = 0,
				ret = [];

			// Go through the array, translating each of the items to their new values
			if ( isArrayLike( elems ) ) {
				length = elems.length;
				for ( ; i < length; i++ ) {
					value = callback( elems[ i ], i, arg );

					if ( value != null ) {
						ret.push( value );
					}
				}

			// Go through every key on the object,
			} else {
				for ( i in elems ) {
					value = callback( elems[ i ], i, arg );

					if ( value != null ) {
						ret.push( value );
					}
				}
			}

			// Flatten any nested arrays
			return concat.apply( [], ret );
		},

		// A global GUID counter for objects
		guid: 1,

		// Bind a function to a context, optionally partially applying any
		// arguments.
		proxy: function( fn, context ) {
			var tmp, args, proxy;

			if ( typeof context === "string" ) {
				tmp = fn[ context ];
				context = fn;
				fn = tmp;
			}

			// Quick check to determine if target is callable, in the spec
			// this throws a TypeError, but we will just return undefined.
			if ( !jQuery.isFunction( fn ) ) {
				return undefined;
			}

			// Simulated bind
			args = slice.call( arguments, 2 );
			proxy = function() {
				return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
			};

			// Set the guid of unique handler to the same of original handler, so it can be removed
			proxy.guid = fn.guid = fn.guid || jQuery.guid++;

			return proxy;
		},

		now: Date.now,

		// jQuery.support is not used in Core but other projects attach their
		// properties to it so it needs to exist.
		support: support
	} );

	// JSHint would error on this code due to the Symbol not being defined in ES5.
	// Defining this global in .jshintrc would create a danger of using the global
	// unguarded in another place, it seems safer to just disable JSHint for these
	// three lines.
	/* jshint ignore: start */
	if ( typeof Symbol === "function" ) {
		jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
	}
	/* jshint ignore: end */

	// Populate the class2type map
	jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
	function( i, name ) {
		class2type[ "[object " + name + "]" ] = name.toLowerCase();
	} );

	function isArrayLike( obj ) {

		// Support: iOS 8.2 (not reproducible in simulator)
		// `in` check used to prevent JIT error (gh-2145)
		// hasOwn isn't used here due to false negatives
		// regarding Nodelist length in IE
		var length = !!obj && "length" in obj && obj.length,
			type = jQuery.type( obj );

		if ( type === "function" || jQuery.isWindow( obj ) ) {
			return false;
		}

		return type === "array" || length === 0 ||
			typeof length === "number" && length > 0 && ( length - 1 ) in obj;
	}
	var Sizzle =
	/*!
	 * Sizzle CSS Selector Engine v2.2.1
	 * http://sizzlejs.com/
	 *
	 * Copyright jQuery Foundation and other contributors
	 * Released under the MIT license
	 * http://jquery.org/license
	 *
	 * Date: 2015-10-17
	 */
	(function( window ) {

	var i,
		support,
		Expr,
		getText,
		isXML,
		tokenize,
		compile,
		select,
		outermostContext,
		sortInput,
		hasDuplicate,

		// Local document vars
		setDocument,
		document,
		docElem,
		documentIsHTML,
		rbuggyQSA,
		rbuggyMatches,
		matches,
		contains,

		// Instance-specific data
		expando = "sizzle" + 1 * new Date(),
		preferredDoc = window.document,
		dirruns = 0,
		done = 0,
		classCache = createCache(),
		tokenCache = createCache(),
		compilerCache = createCache(),
		sortOrder = function( a, b ) {
			if ( a === b ) {
				hasDuplicate = true;
			}
			return 0;
		},

		// General-purpose constants
		MAX_NEGATIVE = 1 << 31,

		// Instance methods
		hasOwn = ({}).hasOwnProperty,
		arr = [],
		pop = arr.pop,
		push_native = arr.push,
		push = arr.push,
		slice = arr.slice,
		// Use a stripped-down indexOf as it's faster than native
		// http://jsperf.com/thor-indexof-vs-for/5
		indexOf = function( list, elem ) {
			var i = 0,
				len = list.length;
			for ( ; i < len; i++ ) {
				if ( list[i] === elem ) {
					return i;
				}
			}
			return -1;
		},

		booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

		// Regular expressions

		// http://www.w3.org/TR/css3-selectors/#whitespace
		whitespace = "[\\x20\\t\\r\\n\\f]",

		// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
		identifier = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

		// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
		attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
			// Operator (capture 2)
			"*([*^$|!~]?=)" + whitespace +
			// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
			"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
			"*\\]",

		pseudos = ":(" + identifier + ")(?:\\((" +
			// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
			// 1. quoted (capture 3; capture 4 or capture 5)
			"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
			// 2. simple (capture 6)
			"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
			// 3. anything else (capture 2)
			".*" +
			")\\)|)",

		// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
		rwhitespace = new RegExp( whitespace + "+", "g" ),
		rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

		rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
		rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

		rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

		rpseudo = new RegExp( pseudos ),
		ridentifier = new RegExp( "^" + identifier + "$" ),

		matchExpr = {
			"ID": new RegExp( "^#(" + identifier + ")" ),
			"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
			"TAG": new RegExp( "^(" + identifier + "|[*])" ),
			"ATTR": new RegExp( "^" + attributes ),
			"PSEUDO": new RegExp( "^" + pseudos ),
			"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
				"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
				"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
			"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
			// For use in libraries implementing .is()
			// We use this for POS matching in `select`
			"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
				whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
		},

		rinputs = /^(?:input|select|textarea|button)$/i,
		rheader = /^h\d$/i,

		rnative = /^[^{]+\{\s*\[native \w/,

		// Easily-parseable/retrievable ID or TAG or CLASS selectors
		rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

		rsibling = /[+~]/,
		rescape = /'|\\/g,

		// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
		runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
		funescape = function( _, escaped, escapedWhitespace ) {
			var high = "0x" + escaped - 0x10000;
			// NaN means non-codepoint
			// Support: Firefox<24
			// Workaround erroneous numeric interpretation of +"0x"
			return high !== high || escapedWhitespace ?
				escaped :
				high < 0 ?
					// BMP codepoint
					String.fromCharCode( high + 0x10000 ) :
					// Supplemental Plane codepoint (surrogate pair)
					String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
		},

		// Used for iframes
		// See setDocument()
		// Removing the function wrapper causes a "Permission Denied"
		// error in IE
		unloadHandler = function() {
			setDocument();
		};

	// Optimize for push.apply( _, NodeList )
	try {
		push.apply(
			(arr = slice.call( preferredDoc.childNodes )),
			preferredDoc.childNodes
		);
		// Support: Android<4.0
		// Detect silently failing push.apply
		arr[ preferredDoc.childNodes.length ].nodeType;
	} catch ( e ) {
		push = { apply: arr.length ?

			// Leverage slice if possible
			function( target, els ) {
				push_native.apply( target, slice.call(els) );
			} :

			// Support: IE<9
			// Otherwise append directly
			function( target, els ) {
				var j = target.length,
					i = 0;
				// Can't trust NodeList.length
				while ( (target[j++] = els[i++]) ) {}
				target.length = j - 1;
			}
		};
	}

	function Sizzle( selector, context, results, seed ) {
		var m, i, elem, nid, nidselect, match, groups, newSelector,
			newContext = context && context.ownerDocument,

			// nodeType defaults to 9, since context defaults to document
			nodeType = context ? context.nodeType : 9;

		results = results || [];

		// Return early from calls with invalid selector or context
		if ( typeof selector !== "string" || !selector ||
			nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

			return results;
		}

		// Try to shortcut find operations (as opposed to filters) in HTML documents
		if ( !seed ) {

			if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
				setDocument( context );
			}
			context = context || document;

			if ( documentIsHTML ) {

				// If the selector is sufficiently simple, try using a "get*By*" DOM method
				// (excepting DocumentFragment context, where the methods don't exist)
				if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {

					// ID selector
					if ( (m = match[1]) ) {

						// Document context
						if ( nodeType === 9 ) {
							if ( (elem = context.getElementById( m )) ) {

								// Support: IE, Opera, Webkit
								// TODO: identify versions
								// getElementById can match elements by name instead of ID
								if ( elem.id === m ) {
									results.push( elem );
									return results;
								}
							} else {
								return results;
							}

						// Element context
						} else {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( newContext && (elem = newContext.getElementById( m )) &&
								contains( context, elem ) &&
								elem.id === m ) {

								results.push( elem );
								return results;
							}
						}

					// Type selector
					} else if ( match[2] ) {
						push.apply( results, context.getElementsByTagName( selector ) );
						return results;

					// Class selector
					} else if ( (m = match[3]) && support.getElementsByClassName &&
						context.getElementsByClassName ) {

						push.apply( results, context.getElementsByClassName( m ) );
						return results;
					}
				}

				// Take advantage of querySelectorAll
				if ( support.qsa &&
					!compilerCache[ selector + " " ] &&
					(!rbuggyQSA || !rbuggyQSA.test( selector )) ) {

					if ( nodeType !== 1 ) {
						newContext = context;
						newSelector = selector;

					// qSA looks outside Element context, which is not what we want
					// Thanks to Andrew Dupont for this workaround technique
					// Support: IE <=8
					// Exclude object elements
					} else if ( context.nodeName.toLowerCase() !== "object" ) {

						// Capture the context ID, setting it first if necessary
						if ( (nid = context.getAttribute( "id" )) ) {
							nid = nid.replace( rescape, "\\$&" );
						} else {
							context.setAttribute( "id", (nid = expando) );
						}

						// Prefix every selector in the list
						groups = tokenize( selector );
						i = groups.length;
						nidselect = ridentifier.test( nid ) ? "#" + nid : "[id='" + nid + "']";
						while ( i-- ) {
							groups[i] = nidselect + " " + toSelector( groups[i] );
						}
						newSelector = groups.join( "," );

						// Expand context for sibling selectors
						newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
							context;
					}

					if ( newSelector ) {
						try {
							push.apply( results,
								newContext.querySelectorAll( newSelector )
							);
							return results;
						} catch ( qsaError ) {
						} finally {
							if ( nid === expando ) {
								context.removeAttribute( "id" );
							}
						}
					}
				}
			}
		}

		// All others
		return select( selector.replace( rtrim, "$1" ), context, results, seed );
	}

	/**
	 * Create key-value caches of limited size
	 * @returns {function(string, object)} Returns the Object data after storing it on itself with
	 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
	 *	deleting the oldest entry
	 */
	function createCache() {
		var keys = [];

		function cache( key, value ) {
			// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
			if ( keys.push( key + " " ) > Expr.cacheLength ) {
				// Only keep the most recent entries
				delete cache[ keys.shift() ];
			}
			return (cache[ key + " " ] = value);
		}
		return cache;
	}

	/**
	 * Mark a function for special use by Sizzle
	 * @param {Function} fn The function to mark
	 */
	function markFunction( fn ) {
		fn[ expando ] = true;
		return fn;
	}

	/**
	 * Support testing using an element
	 * @param {Function} fn Passed the created div and expects a boolean result
	 */
	function assert( fn ) {
		var div = document.createElement("div");

		try {
			return !!fn( div );
		} catch (e) {
			return false;
		} finally {
			// Remove from its parent by default
			if ( div.parentNode ) {
				div.parentNode.removeChild( div );
			}
			// release memory in IE
			div = null;
		}
	}

	/**
	 * Adds the same handler for all of the specified attrs
	 * @param {String} attrs Pipe-separated list of attributes
	 * @param {Function} handler The method that will be applied
	 */
	function addHandle( attrs, handler ) {
		var arr = attrs.split("|"),
			i = arr.length;

		while ( i-- ) {
			Expr.attrHandle[ arr[i] ] = handler;
		}
	}

	/**
	 * Checks document order of two siblings
	 * @param {Element} a
	 * @param {Element} b
	 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
	 */
	function siblingCheck( a, b ) {
		var cur = b && a,
			diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
				( ~b.sourceIndex || MAX_NEGATIVE ) -
				( ~a.sourceIndex || MAX_NEGATIVE );

		// Use IE sourceIndex if available on both nodes
		if ( diff ) {
			return diff;
		}

		// Check if b follows a
		if ( cur ) {
			while ( (cur = cur.nextSibling) ) {
				if ( cur === b ) {
					return -1;
				}
			}
		}

		return a ? 1 : -1;
	}

	/**
	 * Returns a function to use in pseudos for input types
	 * @param {String} type
	 */
	function createInputPseudo( type ) {
		return function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === type;
		};
	}

	/**
	 * Returns a function to use in pseudos for buttons
	 * @param {String} type
	 */
	function createButtonPseudo( type ) {
		return function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return (name === "input" || name === "button") && elem.type === type;
		};
	}

	/**
	 * Returns a function to use in pseudos for positionals
	 * @param {Function} fn
	 */
	function createPositionalPseudo( fn ) {
		return markFunction(function( argument ) {
			argument = +argument;
			return markFunction(function( seed, matches ) {
				var j,
					matchIndexes = fn( [], seed.length, argument ),
					i = matchIndexes.length;

				// Match elements found at the specified indexes
				while ( i-- ) {
					if ( seed[ (j = matchIndexes[i]) ] ) {
						seed[j] = !(matches[j] = seed[j]);
					}
				}
			});
		});
	}

	/**
	 * Checks a node for validity as a Sizzle context
	 * @param {Element|Object=} context
	 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
	 */
	function testContext( context ) {
		return context && typeof context.getElementsByTagName !== "undefined" && context;
	}

	// Expose support vars for convenience
	support = Sizzle.support = {};

	/**
	 * Detects XML nodes
	 * @param {Element|Object} elem An element or a document
	 * @returns {Boolean} True iff elem is a non-HTML XML node
	 */
	isXML = Sizzle.isXML = function( elem ) {
		// documentElement is verified for cases where it doesn't yet exist
		// (such as loading iframes in IE - #4833)
		var documentElement = elem && (elem.ownerDocument || elem).documentElement;
		return documentElement ? documentElement.nodeName !== "HTML" : false;
	};

	/**
	 * Sets document-related variables once based on the current document
	 * @param {Element|Object} [doc] An element or document object to use to set the document
	 * @returns {Object} Returns the current document
	 */
	setDocument = Sizzle.setDocument = function( node ) {
		var hasCompare, parent,
			doc = node ? node.ownerDocument || node : preferredDoc;

		// Return early if doc is invalid or already selected
		if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
			return document;
		}

		// Update global variables
		document = doc;
		docElem = document.documentElement;
		documentIsHTML = !isXML( document );

		// Support: IE 9-11, Edge
		// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
		if ( (parent = document.defaultView) && parent.top !== parent ) {
			// Support: IE 11
			if ( parent.addEventListener ) {
				parent.addEventListener( "unload", unloadHandler, false );

			// Support: IE 9 - 10 only
			} else if ( parent.attachEvent ) {
				parent.attachEvent( "onunload", unloadHandler );
			}
		}

		/* Attributes
		---------------------------------------------------------------------- */

		// Support: IE<8
		// Verify that getAttribute really returns attributes and not properties
		// (excepting IE8 booleans)
		support.attributes = assert(function( div ) {
			div.className = "i";
			return !div.getAttribute("className");
		});

		/* getElement(s)By*
		---------------------------------------------------------------------- */

		// Check if getElementsByTagName("*") returns only elements
		support.getElementsByTagName = assert(function( div ) {
			div.appendChild( document.createComment("") );
			return !div.getElementsByTagName("*").length;
		});

		// Support: IE<9
		support.getElementsByClassName = rnative.test( document.getElementsByClassName );

		// Support: IE<10
		// Check if getElementById returns elements by name
		// The broken getElementById methods don't pick up programatically-set names,
		// so use a roundabout getElementsByName test
		support.getById = assert(function( div ) {
			docElem.appendChild( div ).id = expando;
			return !document.getElementsByName || !document.getElementsByName( expando ).length;
		});

		// ID find and filter
		if ( support.getById ) {
			Expr.find["ID"] = function( id, context ) {
				if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
					var m = context.getElementById( id );
					return m ? [ m ] : [];
				}
			};
			Expr.filter["ID"] = function( id ) {
				var attrId = id.replace( runescape, funescape );
				return function( elem ) {
					return elem.getAttribute("id") === attrId;
				};
			};
		} else {
			// Support: IE6/7
			// getElementById is not reliable as a find shortcut
			delete Expr.find["ID"];

			Expr.filter["ID"] =  function( id ) {
				var attrId = id.replace( runescape, funescape );
				return function( elem ) {
					var node = typeof elem.getAttributeNode !== "undefined" &&
						elem.getAttributeNode("id");
					return node && node.value === attrId;
				};
			};
		}

		// Tag
		Expr.find["TAG"] = support.getElementsByTagName ?
			function( tag, context ) {
				if ( typeof context.getElementsByTagName !== "undefined" ) {
					return context.getElementsByTagName( tag );

				// DocumentFragment nodes don't have gEBTN
				} else if ( support.qsa ) {
					return context.querySelectorAll( tag );
				}
			} :

			function( tag, context ) {
				var elem,
					tmp = [],
					i = 0,
					// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
					results = context.getElementsByTagName( tag );

				// Filter out possible comments
				if ( tag === "*" ) {
					while ( (elem = results[i++]) ) {
						if ( elem.nodeType === 1 ) {
							tmp.push( elem );
						}
					}

					return tmp;
				}
				return results;
			};

		// Class
		Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
			if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
				return context.getElementsByClassName( className );
			}
		};

		/* QSA/matchesSelector
		---------------------------------------------------------------------- */

		// QSA and matchesSelector support

		// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
		rbuggyMatches = [];

		// qSa(:focus) reports false when true (Chrome 21)
		// We allow this because of a bug in IE8/9 that throws an error
		// whenever `document.activeElement` is accessed on an iframe
		// So, we allow :focus to pass through QSA all the time to avoid the IE error
		// See http://bugs.jquery.com/ticket/13378
		rbuggyQSA = [];

		if ( (support.qsa = rnative.test( document.querySelectorAll )) ) {
			// Build QSA regex
			// Regex strategy adopted from Diego Perini
			assert(function( div ) {
				// Select is set to empty string on purpose
				// This is to test IE's treatment of not explicitly
				// setting a boolean content attribute,
				// since its presence should be enough
				// http://bugs.jquery.com/ticket/12359
				docElem.appendChild( div ).innerHTML = "<a id='" + expando + "'></a>" +
					"<select id='" + expando + "-\r\\' msallowcapture=''>" +
					"<option selected=''></option></select>";

				// Support: IE8, Opera 11-12.16
				// Nothing should be selected when empty strings follow ^= or $= or *=
				// The test attribute must be unknown in Opera but "safe" for WinRT
				// http://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
				if ( div.querySelectorAll("[msallowcapture^='']").length ) {
					rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
				}

				// Support: IE8
				// Boolean attributes and "value" are not treated correctly
				if ( !div.querySelectorAll("[selected]").length ) {
					rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
				}

				// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
				if ( !div.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
					rbuggyQSA.push("~=");
				}

				// Webkit/Opera - :checked should return selected option elements
				// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
				// IE8 throws error here and will not see later tests
				if ( !div.querySelectorAll(":checked").length ) {
					rbuggyQSA.push(":checked");
				}

				// Support: Safari 8+, iOS 8+
				// https://bugs.webkit.org/show_bug.cgi?id=136851
				// In-page `selector#id sibing-combinator selector` fails
				if ( !div.querySelectorAll( "a#" + expando + "+*" ).length ) {
					rbuggyQSA.push(".#.+[+~]");
				}
			});

			assert(function( div ) {
				// Support: Windows 8 Native Apps
				// The type and name attributes are restricted during .innerHTML assignment
				var input = document.createElement("input");
				input.setAttribute( "type", "hidden" );
				div.appendChild( input ).setAttribute( "name", "D" );

				// Support: IE8
				// Enforce case-sensitivity of name attribute
				if ( div.querySelectorAll("[name=d]").length ) {
					rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
				}

				// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
				// IE8 throws error here and will not see later tests
				if ( !div.querySelectorAll(":enabled").length ) {
					rbuggyQSA.push( ":enabled", ":disabled" );
				}

				// Opera 10-11 does not throw on post-comma invalid pseudos
				div.querySelectorAll("*,:x");
				rbuggyQSA.push(",.*:");
			});
		}

		if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
			docElem.webkitMatchesSelector ||
			docElem.mozMatchesSelector ||
			docElem.oMatchesSelector ||
			docElem.msMatchesSelector) )) ) {

			assert(function( div ) {
				// Check to see if it's possible to do matchesSelector
				// on a disconnected node (IE 9)
				support.disconnectedMatch = matches.call( div, "div" );

				// This should fail with an exception
				// Gecko does not error, returns false instead
				matches.call( div, "[s!='']:x" );
				rbuggyMatches.push( "!=", pseudos );
			});
		}

		rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
		rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

		/* Contains
		---------------------------------------------------------------------- */
		hasCompare = rnative.test( docElem.compareDocumentPosition );

		// Element contains another
		// Purposefully self-exclusive
		// As in, an element does not contain itself
		contains = hasCompare || rnative.test( docElem.contains ) ?
			function( a, b ) {
				var adown = a.nodeType === 9 ? a.documentElement : a,
					bup = b && b.parentNode;
				return a === bup || !!( bup && bup.nodeType === 1 && (
					adown.contains ?
						adown.contains( bup ) :
						a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
				));
			} :
			function( a, b ) {
				if ( b ) {
					while ( (b = b.parentNode) ) {
						if ( b === a ) {
							return true;
						}
					}
				}
				return false;
			};

		/* Sorting
		---------------------------------------------------------------------- */

		// Document order sorting
		sortOrder = hasCompare ?
		function( a, b ) {

			// Flag for duplicate removal
			if ( a === b ) {
				hasDuplicate = true;
				return 0;
			}

			// Sort on method existence if only one input has compareDocumentPosition
			var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
			if ( compare ) {
				return compare;
			}

			// Calculate position if both inputs belong to the same document
			compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
				a.compareDocumentPosition( b ) :

				// Otherwise we know they are disconnected
				1;

			// Disconnected nodes
			if ( compare & 1 ||
				(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

				// Choose the first element that is related to our preferred document
				if ( a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
					return -1;
				}
				if ( b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
					return 1;
				}

				// Maintain original order
				return sortInput ?
					( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
					0;
			}

			return compare & 4 ? -1 : 1;
		} :
		function( a, b ) {
			// Exit early if the nodes are identical
			if ( a === b ) {
				hasDuplicate = true;
				return 0;
			}

			var cur,
				i = 0,
				aup = a.parentNode,
				bup = b.parentNode,
				ap = [ a ],
				bp = [ b ];

			// Parentless nodes are either documents or disconnected
			if ( !aup || !bup ) {
				return a === document ? -1 :
					b === document ? 1 :
					aup ? -1 :
					bup ? 1 :
					sortInput ?
					( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
					0;

			// If the nodes are siblings, we can do a quick check
			} else if ( aup === bup ) {
				return siblingCheck( a, b );
			}

			// Otherwise we need full lists of their ancestors for comparison
			cur = a;
			while ( (cur = cur.parentNode) ) {
				ap.unshift( cur );
			}
			cur = b;
			while ( (cur = cur.parentNode) ) {
				bp.unshift( cur );
			}

			// Walk down the tree looking for a discrepancy
			while ( ap[i] === bp[i] ) {
				i++;
			}

			return i ?
				// Do a sibling check if the nodes have a common ancestor
				siblingCheck( ap[i], bp[i] ) :

				// Otherwise nodes in our document sort first
				ap[i] === preferredDoc ? -1 :
				bp[i] === preferredDoc ? 1 :
				0;
		};

		return document;
	};

	Sizzle.matches = function( expr, elements ) {
		return Sizzle( expr, null, null, elements );
	};

	Sizzle.matchesSelector = function( elem, expr ) {
		// Set document vars if needed
		if ( ( elem.ownerDocument || elem ) !== document ) {
			setDocument( elem );
		}

		// Make sure that attribute selectors are quoted
		expr = expr.replace( rattributeQuotes, "='$1']" );

		if ( support.matchesSelector && documentIsHTML &&
			!compilerCache[ expr + " " ] &&
			( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
			( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

			try {
				var ret = matches.call( elem, expr );

				// IE 9's matchesSelector returns false on disconnected nodes
				if ( ret || support.disconnectedMatch ||
						// As well, disconnected nodes are said to be in a document
						// fragment in IE 9
						elem.document && elem.document.nodeType !== 11 ) {
					return ret;
				}
			} catch (e) {}
		}

		return Sizzle( expr, document, null, [ elem ] ).length > 0;
	};

	Sizzle.contains = function( context, elem ) {
		// Set document vars if needed
		if ( ( context.ownerDocument || context ) !== document ) {
			setDocument( context );
		}
		return contains( context, elem );
	};

	Sizzle.attr = function( elem, name ) {
		// Set document vars if needed
		if ( ( elem.ownerDocument || elem ) !== document ) {
			setDocument( elem );
		}

		var fn = Expr.attrHandle[ name.toLowerCase() ],
			// Don't get fooled by Object.prototype properties (jQuery #13807)
			val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
				fn( elem, name, !documentIsHTML ) :
				undefined;

		return val !== undefined ?
			val :
			support.attributes || !documentIsHTML ?
				elem.getAttribute( name ) :
				(val = elem.getAttributeNode(name)) && val.specified ?
					val.value :
					null;
	};

	Sizzle.error = function( msg ) {
		throw new Error( "Syntax error, unrecognized expression: " + msg );
	};

	/**
	 * Document sorting and removing duplicates
	 * @param {ArrayLike} results
	 */
	Sizzle.uniqueSort = function( results ) {
		var elem,
			duplicates = [],
			j = 0,
			i = 0;

		// Unless we *know* we can detect duplicates, assume their presence
		hasDuplicate = !support.detectDuplicates;
		sortInput = !support.sortStable && results.slice( 0 );
		results.sort( sortOrder );

		if ( hasDuplicate ) {
			while ( (elem = results[i++]) ) {
				if ( elem === results[ i ] ) {
					j = duplicates.push( i );
				}
			}
			while ( j-- ) {
				results.splice( duplicates[ j ], 1 );
			}
		}

		// Clear input after sorting to release objects
		// See https://github.com/jquery/sizzle/pull/225
		sortInput = null;

		return results;
	};

	/**
	 * Utility function for retrieving the text value of an array of DOM nodes
	 * @param {Array|Element} elem
	 */
	getText = Sizzle.getText = function( elem ) {
		var node,
			ret = "",
			i = 0,
			nodeType = elem.nodeType;

		if ( !nodeType ) {
			// If no nodeType, this is expected to be an array
			while ( (node = elem[i++]) ) {
				// Do not traverse comment nodes
				ret += getText( node );
			}
		} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
			// Use textContent for elements
			// innerText usage removed for consistency of new lines (jQuery #11153)
			if ( typeof elem.textContent === "string" ) {
				return elem.textContent;
			} else {
				// Traverse its children
				for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
					ret += getText( elem );
				}
			}
		} else if ( nodeType === 3 || nodeType === 4 ) {
			return elem.nodeValue;
		}
		// Do not include comment or processing instruction nodes

		return ret;
	};

	Expr = Sizzle.selectors = {

		// Can be adjusted by the user
		cacheLength: 50,

		createPseudo: markFunction,

		match: matchExpr,

		attrHandle: {},

		find: {},

		relative: {
			">": { dir: "parentNode", first: true },
			" ": { dir: "parentNode" },
			"+": { dir: "previousSibling", first: true },
			"~": { dir: "previousSibling" }
		},

		preFilter: {
			"ATTR": function( match ) {
				match[1] = match[1].replace( runescape, funescape );

				// Move the given value to match[3] whether quoted or unquoted
				match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

				if ( match[2] === "~=" ) {
					match[3] = " " + match[3] + " ";
				}

				return match.slice( 0, 4 );
			},

			"CHILD": function( match ) {
				/* matches from matchExpr["CHILD"]
					1 type (only|nth|...)
					2 what (child|of-type)
					3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
					4 xn-component of xn+y argument ([+-]?\d*n|)
					5 sign of xn-component
					6 x of xn-component
					7 sign of y-component
					8 y of y-component
				*/
				match[1] = match[1].toLowerCase();

				if ( match[1].slice( 0, 3 ) === "nth" ) {
					// nth-* requires argument
					if ( !match[3] ) {
						Sizzle.error( match[0] );
					}

					// numeric x and y parameters for Expr.filter.CHILD
					// remember that false/true cast respectively to 0/1
					match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
					match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

				// other types prohibit arguments
				} else if ( match[3] ) {
					Sizzle.error( match[0] );
				}

				return match;
			},

			"PSEUDO": function( match ) {
				var excess,
					unquoted = !match[6] && match[2];

				if ( matchExpr["CHILD"].test( match[0] ) ) {
					return null;
				}

				// Accept quoted arguments as-is
				if ( match[3] ) {
					match[2] = match[4] || match[5] || "";

				// Strip excess characters from unquoted arguments
				} else if ( unquoted && rpseudo.test( unquoted ) &&
					// Get excess from tokenize (recursively)
					(excess = tokenize( unquoted, true )) &&
					// advance to the next closing parenthesis
					(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

					// excess is a negative index
					match[0] = match[0].slice( 0, excess );
					match[2] = unquoted.slice( 0, excess );
				}

				// Return only captures needed by the pseudo filter method (type and argument)
				return match.slice( 0, 3 );
			}
		},

		filter: {

			"TAG": function( nodeNameSelector ) {
				var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
				return nodeNameSelector === "*" ?
					function() { return true; } :
					function( elem ) {
						return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
					};
			},

			"CLASS": function( className ) {
				var pattern = classCache[ className + " " ];

				return pattern ||
					(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
					classCache( className, function( elem ) {
						return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
					});
			},

			"ATTR": function( name, operator, check ) {
				return function( elem ) {
					var result = Sizzle.attr( elem, name );

					if ( result == null ) {
						return operator === "!=";
					}
					if ( !operator ) {
						return true;
					}

					result += "";

					return operator === "=" ? result === check :
						operator === "!=" ? result !== check :
						operator === "^=" ? check && result.indexOf( check ) === 0 :
						operator === "*=" ? check && result.indexOf( check ) > -1 :
						operator === "$=" ? check && result.slice( -check.length ) === check :
						operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
						operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
						false;
				};
			},

			"CHILD": function( type, what, argument, first, last ) {
				var simple = type.slice( 0, 3 ) !== "nth",
					forward = type.slice( -4 ) !== "last",
					ofType = what === "of-type";

				return first === 1 && last === 0 ?

					// Shortcut for :nth-*(n)
					function( elem ) {
						return !!elem.parentNode;
					} :

					function( elem, context, xml ) {
						var cache, uniqueCache, outerCache, node, nodeIndex, start,
							dir = simple !== forward ? "nextSibling" : "previousSibling",
							parent = elem.parentNode,
							name = ofType && elem.nodeName.toLowerCase(),
							useCache = !xml && !ofType,
							diff = false;

						if ( parent ) {

							// :(first|last|only)-(child|of-type)
							if ( simple ) {
								while ( dir ) {
									node = elem;
									while ( (node = node[ dir ]) ) {
										if ( ofType ?
											node.nodeName.toLowerCase() === name :
											node.nodeType === 1 ) {

											return false;
										}
									}
									// Reverse direction for :only-* (if we haven't yet done so)
									start = dir = type === "only" && !start && "nextSibling";
								}
								return true;
							}

							start = [ forward ? parent.firstChild : parent.lastChild ];

							// non-xml :nth-child(...) stores cache data on `parent`
							if ( forward && useCache ) {

								// Seek `elem` from a previously-cached index

								// ...in a gzip-friendly way
								node = parent;
								outerCache = node[ expando ] || (node[ expando ] = {});

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									(outerCache[ node.uniqueID ] = {});

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex && cache[ 2 ];
								node = nodeIndex && parent.childNodes[ nodeIndex ];

								while ( (node = ++nodeIndex && node && node[ dir ] ||

									// Fallback to seeking `elem` from the start
									(diff = nodeIndex = 0) || start.pop()) ) {

									// When found, cache indexes on `parent` and break
									if ( node.nodeType === 1 && ++diff && node === elem ) {
										uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
										break;
									}
								}

							} else {
								// Use previously-cached element index if available
								if ( useCache ) {
									// ...in a gzip-friendly way
									node = elem;
									outerCache = node[ expando ] || (node[ expando ] = {});

									// Support: IE <9 only
									// Defend against cloned attroperties (jQuery gh-1709)
									uniqueCache = outerCache[ node.uniqueID ] ||
										(outerCache[ node.uniqueID ] = {});

									cache = uniqueCache[ type ] || [];
									nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
									diff = nodeIndex;
								}

								// xml :nth-child(...)
								// or :nth-last-child(...) or :nth(-last)?-of-type(...)
								if ( diff === false ) {
									// Use the same loop as above to seek `elem` from the start
									while ( (node = ++nodeIndex && node && node[ dir ] ||
										(diff = nodeIndex = 0) || start.pop()) ) {

										if ( ( ofType ?
											node.nodeName.toLowerCase() === name :
											node.nodeType === 1 ) &&
											++diff ) {

											// Cache the index of each encountered element
											if ( useCache ) {
												outerCache = node[ expando ] || (node[ expando ] = {});

												// Support: IE <9 only
												// Defend against cloned attroperties (jQuery gh-1709)
												uniqueCache = outerCache[ node.uniqueID ] ||
													(outerCache[ node.uniqueID ] = {});

												uniqueCache[ type ] = [ dirruns, diff ];
											}

											if ( node === elem ) {
												break;
											}
										}
									}
								}
							}

							// Incorporate the offset, then check against cycle size
							diff -= last;
							return diff === first || ( diff % first === 0 && diff / first >= 0 );
						}
					};
			},

			"PSEUDO": function( pseudo, argument ) {
				// pseudo-class names are case-insensitive
				// http://www.w3.org/TR/selectors/#pseudo-classes
				// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
				// Remember that setFilters inherits from pseudos
				var args,
					fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
						Sizzle.error( "unsupported pseudo: " + pseudo );

				// The user may use createPseudo to indicate that
				// arguments are needed to create the filter function
				// just as Sizzle does
				if ( fn[ expando ] ) {
					return fn( argument );
				}

				// But maintain support for old signatures
				if ( fn.length > 1 ) {
					args = [ pseudo, pseudo, "", argument ];
					return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
						markFunction(function( seed, matches ) {
							var idx,
								matched = fn( seed, argument ),
								i = matched.length;
							while ( i-- ) {
								idx = indexOf( seed, matched[i] );
								seed[ idx ] = !( matches[ idx ] = matched[i] );
							}
						}) :
						function( elem ) {
							return fn( elem, 0, args );
						};
				}

				return fn;
			}
		},

		pseudos: {
			// Potentially complex pseudos
			"not": markFunction(function( selector ) {
				// Trim the selector passed to compile
				// to avoid treating leading and trailing
				// spaces as combinators
				var input = [],
					results = [],
					matcher = compile( selector.replace( rtrim, "$1" ) );

				return matcher[ expando ] ?
					markFunction(function( seed, matches, context, xml ) {
						var elem,
							unmatched = matcher( seed, null, xml, [] ),
							i = seed.length;

						// Match elements unmatched by `matcher`
						while ( i-- ) {
							if ( (elem = unmatched[i]) ) {
								seed[i] = !(matches[i] = elem);
							}
						}
					}) :
					function( elem, context, xml ) {
						input[0] = elem;
						matcher( input, null, xml, results );
						// Don't keep the element (issue #299)
						input[0] = null;
						return !results.pop();
					};
			}),

			"has": markFunction(function( selector ) {
				return function( elem ) {
					return Sizzle( selector, elem ).length > 0;
				};
			}),

			"contains": markFunction(function( text ) {
				text = text.replace( runescape, funescape );
				return function( elem ) {
					return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
				};
			}),

			// "Whether an element is represented by a :lang() selector
			// is based solely on the element's language value
			// being equal to the identifier C,
			// or beginning with the identifier C immediately followed by "-".
			// The matching of C against the element's language value is performed case-insensitively.
			// The identifier C does not have to be a valid language name."
			// http://www.w3.org/TR/selectors/#lang-pseudo
			"lang": markFunction( function( lang ) {
				// lang value must be a valid identifier
				if ( !ridentifier.test(lang || "") ) {
					Sizzle.error( "unsupported lang: " + lang );
				}
				lang = lang.replace( runescape, funescape ).toLowerCase();
				return function( elem ) {
					var elemLang;
					do {
						if ( (elemLang = documentIsHTML ?
							elem.lang :
							elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

							elemLang = elemLang.toLowerCase();
							return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
						}
					} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
					return false;
				};
			}),

			// Miscellaneous
			"target": function( elem ) {
				var hash = window.location && window.location.hash;
				return hash && hash.slice( 1 ) === elem.id;
			},

			"root": function( elem ) {
				return elem === docElem;
			},

			"focus": function( elem ) {
				return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
			},

			// Boolean properties
			"enabled": function( elem ) {
				return elem.disabled === false;
			},

			"disabled": function( elem ) {
				return elem.disabled === true;
			},

			"checked": function( elem ) {
				// In CSS3, :checked should return both checked and selected elements
				// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
				var nodeName = elem.nodeName.toLowerCase();
				return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
			},

			"selected": function( elem ) {
				// Accessing this property makes selected-by-default
				// options in Safari work properly
				if ( elem.parentNode ) {
					elem.parentNode.selectedIndex;
				}

				return elem.selected === true;
			},

			// Contents
			"empty": function( elem ) {
				// http://www.w3.org/TR/selectors/#empty-pseudo
				// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
				//   but not by others (comment: 8; processing instruction: 7; etc.)
				// nodeType < 6 works because attributes (2) do not appear as children
				for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
					if ( elem.nodeType < 6 ) {
						return false;
					}
				}
				return true;
			},

			"parent": function( elem ) {
				return !Expr.pseudos["empty"]( elem );
			},

			// Element/input types
			"header": function( elem ) {
				return rheader.test( elem.nodeName );
			},

			"input": function( elem ) {
				return rinputs.test( elem.nodeName );
			},

			"button": function( elem ) {
				var name = elem.nodeName.toLowerCase();
				return name === "input" && elem.type === "button" || name === "button";
			},

			"text": function( elem ) {
				var attr;
				return elem.nodeName.toLowerCase() === "input" &&
					elem.type === "text" &&

					// Support: IE<8
					// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
					( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
			},

			// Position-in-collection
			"first": createPositionalPseudo(function() {
				return [ 0 ];
			}),

			"last": createPositionalPseudo(function( matchIndexes, length ) {
				return [ length - 1 ];
			}),

			"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
				return [ argument < 0 ? argument + length : argument ];
			}),

			"even": createPositionalPseudo(function( matchIndexes, length ) {
				var i = 0;
				for ( ; i < length; i += 2 ) {
					matchIndexes.push( i );
				}
				return matchIndexes;
			}),

			"odd": createPositionalPseudo(function( matchIndexes, length ) {
				var i = 1;
				for ( ; i < length; i += 2 ) {
					matchIndexes.push( i );
				}
				return matchIndexes;
			}),

			"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
				var i = argument < 0 ? argument + length : argument;
				for ( ; --i >= 0; ) {
					matchIndexes.push( i );
				}
				return matchIndexes;
			}),

			"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
				var i = argument < 0 ? argument + length : argument;
				for ( ; ++i < length; ) {
					matchIndexes.push( i );
				}
				return matchIndexes;
			})
		}
	};

	Expr.pseudos["nth"] = Expr.pseudos["eq"];

	// Add button/input type pseudos
	for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
		Expr.pseudos[ i ] = createInputPseudo( i );
	}
	for ( i in { submit: true, reset: true } ) {
		Expr.pseudos[ i ] = createButtonPseudo( i );
	}

	// Easy API for creating new setFilters
	function setFilters() {}
	setFilters.prototype = Expr.filters = Expr.pseudos;
	Expr.setFilters = new setFilters();

	tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
		var matched, match, tokens, type,
			soFar, groups, preFilters,
			cached = tokenCache[ selector + " " ];

		if ( cached ) {
			return parseOnly ? 0 : cached.slice( 0 );
		}

		soFar = selector;
		groups = [];
		preFilters = Expr.preFilter;

		while ( soFar ) {

			// Comma and first run
			if ( !matched || (match = rcomma.exec( soFar )) ) {
				if ( match ) {
					// Don't consume trailing commas as valid
					soFar = soFar.slice( match[0].length ) || soFar;
				}
				groups.push( (tokens = []) );
			}

			matched = false;

			// Combinators
			if ( (match = rcombinators.exec( soFar )) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					// Cast descendant combinators to space
					type: match[0].replace( rtrim, " " )
				});
				soFar = soFar.slice( matched.length );
			}

			// Filters
			for ( type in Expr.filter ) {
				if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
					(match = preFilters[ type ]( match ))) ) {
					matched = match.shift();
					tokens.push({
						value: matched,
						type: type,
						matches: match
					});
					soFar = soFar.slice( matched.length );
				}
			}

			if ( !matched ) {
				break;
			}
		}

		// Return the length of the invalid excess
		// if we're just parsing
		// Otherwise, throw an error or return tokens
		return parseOnly ?
			soFar.length :
			soFar ?
				Sizzle.error( selector ) :
				// Cache the tokens
				tokenCache( selector, groups ).slice( 0 );
	};

	function toSelector( tokens ) {
		var i = 0,
			len = tokens.length,
			selector = "";
		for ( ; i < len; i++ ) {
			selector += tokens[i].value;
		}
		return selector;
	}

	function addCombinator( matcher, combinator, base ) {
		var dir = combinator.dir,
			checkNonElements = base && dir === "parentNode",
			doneName = done++;

		return combinator.first ?
			// Check against closest ancestor/preceding element
			function( elem, context, xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						return matcher( elem, context, xml );
					}
				}
			} :

			// Check against all ancestor/preceding elements
			function( elem, context, xml ) {
				var oldCache, uniqueCache, outerCache,
					newCache = [ dirruns, doneName ];

				// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
				if ( xml ) {
					while ( (elem = elem[ dir ]) ) {
						if ( elem.nodeType === 1 || checkNonElements ) {
							if ( matcher( elem, context, xml ) ) {
								return true;
							}
						}
					}
				} else {
					while ( (elem = elem[ dir ]) ) {
						if ( elem.nodeType === 1 || checkNonElements ) {
							outerCache = elem[ expando ] || (elem[ expando ] = {});

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ elem.uniqueID ] || (outerCache[ elem.uniqueID ] = {});

							if ( (oldCache = uniqueCache[ dir ]) &&
								oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

								// Assign to newCache so results back-propagate to previous elements
								return (newCache[ 2 ] = oldCache[ 2 ]);
							} else {
								// Reuse newcache so results back-propagate to previous elements
								uniqueCache[ dir ] = newCache;

								// A match means we're done; a fail means we have to keep checking
								if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
									return true;
								}
							}
						}
					}
				}
			};
	}

	function elementMatcher( matchers ) {
		return matchers.length > 1 ?
			function( elem, context, xml ) {
				var i = matchers.length;
				while ( i-- ) {
					if ( !matchers[i]( elem, context, xml ) ) {
						return false;
					}
				}
				return true;
			} :
			matchers[0];
	}

	function multipleContexts( selector, contexts, results ) {
		var i = 0,
			len = contexts.length;
		for ( ; i < len; i++ ) {
			Sizzle( selector, contexts[i], results );
		}
		return results;
	}

	function condense( unmatched, map, filter, context, xml ) {
		var elem,
			newUnmatched = [],
			i = 0,
			len = unmatched.length,
			mapped = map != null;

		for ( ; i < len; i++ ) {
			if ( (elem = unmatched[i]) ) {
				if ( !filter || filter( elem, context, xml ) ) {
					newUnmatched.push( elem );
					if ( mapped ) {
						map.push( i );
					}
				}
			}
		}

		return newUnmatched;
	}

	function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
		if ( postFilter && !postFilter[ expando ] ) {
			postFilter = setMatcher( postFilter );
		}
		if ( postFinder && !postFinder[ expando ] ) {
			postFinder = setMatcher( postFinder, postSelector );
		}
		return markFunction(function( seed, results, context, xml ) {
			var temp, i, elem,
				preMap = [],
				postMap = [],
				preexisting = results.length,

				// Get initial elements from seed or context
				elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

				// Prefilter to get matcher input, preserving a map for seed-results synchronization
				matcherIn = preFilter && ( seed || !selector ) ?
					condense( elems, preMap, preFilter, context, xml ) :
					elems,

				matcherOut = matcher ?
					// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
					postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

						// ...intermediate processing is necessary
						[] :

						// ...otherwise use results directly
						results :
					matcherIn;

			// Find primary matches
			if ( matcher ) {
				matcher( matcherIn, matcherOut, context, xml );
			}

			// Apply postFilter
			if ( postFilter ) {
				temp = condense( matcherOut, postMap );
				postFilter( temp, [], context, xml );

				// Un-match failing elements by moving them back to matcherIn
				i = temp.length;
				while ( i-- ) {
					if ( (elem = temp[i]) ) {
						matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
					}
				}
			}

			if ( seed ) {
				if ( postFinder || preFilter ) {
					if ( postFinder ) {
						// Get the final matcherOut by condensing this intermediate into postFinder contexts
						temp = [];
						i = matcherOut.length;
						while ( i-- ) {
							if ( (elem = matcherOut[i]) ) {
								// Restore matcherIn since elem is not yet a final match
								temp.push( (matcherIn[i] = elem) );
							}
						}
						postFinder( null, (matcherOut = []), temp, xml );
					}

					// Move matched elements from seed to results to keep them synchronized
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) &&
							(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

							seed[temp] = !(results[temp] = elem);
						}
					}
				}

			// Add elements to results, through postFinder if defined
			} else {
				matcherOut = condense(
					matcherOut === results ?
						matcherOut.splice( preexisting, matcherOut.length ) :
						matcherOut
				);
				if ( postFinder ) {
					postFinder( null, results, matcherOut, xml );
				} else {
					push.apply( results, matcherOut );
				}
			}
		});
	}

	function matcherFromTokens( tokens ) {
		var checkContext, matcher, j,
			len = tokens.length,
			leadingRelative = Expr.relative[ tokens[0].type ],
			implicitRelative = leadingRelative || Expr.relative[" "],
			i = leadingRelative ? 1 : 0,

			// The foundational matcher ensures that elements are reachable from top-level context(s)
			matchContext = addCombinator( function( elem ) {
				return elem === checkContext;
			}, implicitRelative, true ),
			matchAnyContext = addCombinator( function( elem ) {
				return indexOf( checkContext, elem ) > -1;
			}, implicitRelative, true ),
			matchers = [ function( elem, context, xml ) {
				var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
					(checkContext = context).nodeType ?
						matchContext( elem, context, xml ) :
						matchAnyContext( elem, context, xml ) );
				// Avoid hanging onto element (issue #299)
				checkContext = null;
				return ret;
			} ];

		for ( ; i < len; i++ ) {
			if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
				matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
			} else {
				matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

				// Return special upon seeing a positional matcher
				if ( matcher[ expando ] ) {
					// Find the next relative operator (if any) for proper handling
					j = ++i;
					for ( ; j < len; j++ ) {
						if ( Expr.relative[ tokens[j].type ] ) {
							break;
						}
					}
					return setMatcher(
						i > 1 && elementMatcher( matchers ),
						i > 1 && toSelector(
							// If the preceding token was a descendant combinator, insert an implicit any-element `*`
							tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
						).replace( rtrim, "$1" ),
						matcher,
						i < j && matcherFromTokens( tokens.slice( i, j ) ),
						j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
						j < len && toSelector( tokens )
					);
				}
				matchers.push( matcher );
			}
		}

		return elementMatcher( matchers );
	}

	function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
		var bySet = setMatchers.length > 0,
			byElement = elementMatchers.length > 0,
			superMatcher = function( seed, context, xml, results, outermost ) {
				var elem, j, matcher,
					matchedCount = 0,
					i = "0",
					unmatched = seed && [],
					setMatched = [],
					contextBackup = outermostContext,
					// We must always have either seed elements or outermost context
					elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
					// Use integer dirruns iff this is the outermost matcher
					dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
					len = elems.length;

				if ( outermost ) {
					outermostContext = context === document || context || outermost;
				}

				// Add elements passing elementMatchers directly to results
				// Support: IE<9, Safari
				// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
				for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
					if ( byElement && elem ) {
						j = 0;
						if ( !context && elem.ownerDocument !== document ) {
							setDocument( elem );
							xml = !documentIsHTML;
						}
						while ( (matcher = elementMatchers[j++]) ) {
							if ( matcher( elem, context || document, xml) ) {
								results.push( elem );
								break;
							}
						}
						if ( outermost ) {
							dirruns = dirrunsUnique;
						}
					}

					// Track unmatched elements for set filters
					if ( bySet ) {
						// They will have gone through all possible matchers
						if ( (elem = !matcher && elem) ) {
							matchedCount--;
						}

						// Lengthen the array for every element, matched or not
						if ( seed ) {
							unmatched.push( elem );
						}
					}
				}

				// `i` is now the count of elements visited above, and adding it to `matchedCount`
				// makes the latter nonnegative.
				matchedCount += i;

				// Apply set filters to unmatched elements
				// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
				// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
				// no element matchers and no seed.
				// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
				// case, which will result in a "00" `matchedCount` that differs from `i` but is also
				// numerically zero.
				if ( bySet && i !== matchedCount ) {
					j = 0;
					while ( (matcher = setMatchers[j++]) ) {
						matcher( unmatched, setMatched, context, xml );
					}

					if ( seed ) {
						// Reintegrate element matches to eliminate the need for sorting
						if ( matchedCount > 0 ) {
							while ( i-- ) {
								if ( !(unmatched[i] || setMatched[i]) ) {
									setMatched[i] = pop.call( results );
								}
							}
						}

						// Discard index placeholder values to get only actual matches
						setMatched = condense( setMatched );
					}

					// Add matches to results
					push.apply( results, setMatched );

					// Seedless set matches succeeding multiple successful matchers stipulate sorting
					if ( outermost && !seed && setMatched.length > 0 &&
						( matchedCount + setMatchers.length ) > 1 ) {

						Sizzle.uniqueSort( results );
					}
				}

				// Override manipulation of globals by nested matchers
				if ( outermost ) {
					dirruns = dirrunsUnique;
					outermostContext = contextBackup;
				}

				return unmatched;
			};

		return bySet ?
			markFunction( superMatcher ) :
			superMatcher;
	}

	compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
		var i,
			setMatchers = [],
			elementMatchers = [],
			cached = compilerCache[ selector + " " ];

		if ( !cached ) {
			// Generate a function of recursive functions that can be used to check each element
			if ( !match ) {
				match = tokenize( selector );
			}
			i = match.length;
			while ( i-- ) {
				cached = matcherFromTokens( match[i] );
				if ( cached[ expando ] ) {
					setMatchers.push( cached );
				} else {
					elementMatchers.push( cached );
				}
			}

			// Cache the compiled function
			cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

			// Save selector and tokenization
			cached.selector = selector;
		}
		return cached;
	};

	/**
	 * A low-level selection function that works with Sizzle's compiled
	 *  selector functions
	 * @param {String|Function} selector A selector or a pre-compiled
	 *  selector function built with Sizzle.compile
	 * @param {Element} context
	 * @param {Array} [results]
	 * @param {Array} [seed] A set of elements to match against
	 */
	select = Sizzle.select = function( selector, context, results, seed ) {
		var i, tokens, token, type, find,
			compiled = typeof selector === "function" && selector,
			match = !seed && tokenize( (selector = compiled.selector || selector) );

		results = results || [];

		// Try to minimize operations if there is only one selector in the list and no seed
		// (the latter of which guarantees us context)
		if ( match.length === 1 ) {

			// Reduce context if the leading compound selector is an ID
			tokens = match[0] = match[0].slice( 0 );
			if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
					support.getById && context.nodeType === 9 && documentIsHTML &&
					Expr.relative[ tokens[1].type ] ) {

				context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
				if ( !context ) {
					return results;

				// Precompiled matchers will still verify ancestry, so step up a level
				} else if ( compiled ) {
					context = context.parentNode;
				}

				selector = selector.slice( tokens.shift().value.length );
			}

			// Fetch a seed set for right-to-left matching
			i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
			while ( i-- ) {
				token = tokens[i];

				// Abort if we hit a combinator
				if ( Expr.relative[ (type = token.type) ] ) {
					break;
				}
				if ( (find = Expr.find[ type ]) ) {
					// Search, expanding context for leading sibling combinators
					if ( (seed = find(
						token.matches[0].replace( runescape, funescape ),
						rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
					)) ) {

						// If seed is empty or no tokens remain, we can return early
						tokens.splice( i, 1 );
						selector = seed.length && toSelector( tokens );
						if ( !selector ) {
							push.apply( results, seed );
							return results;
						}

						break;
					}
				}
			}
		}

		// Compile and execute a filtering function if one is not provided
		// Provide `match` to avoid retokenization if we modified the selector above
		( compiled || compile( selector, match ) )(
			seed,
			context,
			!documentIsHTML,
			results,
			!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
		);
		return results;
	};

	// One-time assignments

	// Sort stability
	support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

	// Support: Chrome 14-35+
	// Always assume duplicates if they aren't passed to the comparison function
	support.detectDuplicates = !!hasDuplicate;

	// Initialize against the default document
	setDocument();

	// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
	// Detached nodes confoundingly follow *each other*
	support.sortDetached = assert(function( div1 ) {
		// Should return 1, but returns 4 (following)
		return div1.compareDocumentPosition( document.createElement("div") ) & 1;
	});

	// Support: IE<8
	// Prevent attribute/property "interpolation"
	// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
	if ( !assert(function( div ) {
		div.innerHTML = "<a href='#'></a>";
		return div.firstChild.getAttribute("href") === "#" ;
	}) ) {
		addHandle( "type|href|height|width", function( elem, name, isXML ) {
			if ( !isXML ) {
				return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
			}
		});
	}

	// Support: IE<9
	// Use defaultValue in place of getAttribute("value")
	if ( !support.attributes || !assert(function( div ) {
		div.innerHTML = "<input/>";
		div.firstChild.setAttribute( "value", "" );
		return div.firstChild.getAttribute( "value" ) === "";
	}) ) {
		addHandle( "value", function( elem, name, isXML ) {
			if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
				return elem.defaultValue;
			}
		});
	}

	// Support: IE<9
	// Use getAttributeNode to fetch booleans when getAttribute lies
	if ( !assert(function( div ) {
		return div.getAttribute("disabled") == null;
	}) ) {
		addHandle( booleans, function( elem, name, isXML ) {
			var val;
			if ( !isXML ) {
				return elem[ name ] === true ? name.toLowerCase() :
						(val = elem.getAttributeNode( name )) && val.specified ?
						val.value :
					null;
			}
		});
	}

	return Sizzle;

	})( window );



	jQuery.find = Sizzle;
	jQuery.expr = Sizzle.selectors;
	jQuery.expr[ ":" ] = jQuery.expr.pseudos;
	jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
	jQuery.text = Sizzle.getText;
	jQuery.isXMLDoc = Sizzle.isXML;
	jQuery.contains = Sizzle.contains;



	var dir = function( elem, dir, until ) {
		var matched = [],
			truncate = until !== undefined;

		while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
			if ( elem.nodeType === 1 ) {
				if ( truncate && jQuery( elem ).is( until ) ) {
					break;
				}
				matched.push( elem );
			}
		}
		return matched;
	};


	var siblings = function( n, elem ) {
		var matched = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				matched.push( n );
			}
		}

		return matched;
	};


	var rneedsContext = jQuery.expr.match.needsContext;

	var rsingleTag = ( /^<([\w-]+)\s*\/?>(?:<\/\1>|)$/ );



	var risSimple = /^.[^:#\[\.,]*$/;

	// Implement the identical functionality for filter and not
	function winnow( elements, qualifier, not ) {
		if ( jQuery.isFunction( qualifier ) ) {
			return jQuery.grep( elements, function( elem, i ) {
				/* jshint -W018 */
				return !!qualifier.call( elem, i, elem ) !== not;
			} );

		}

		if ( qualifier.nodeType ) {
			return jQuery.grep( elements, function( elem ) {
				return ( elem === qualifier ) !== not;
			} );

		}

		if ( typeof qualifier === "string" ) {
			if ( risSimple.test( qualifier ) ) {
				return jQuery.filter( qualifier, elements, not );
			}

			qualifier = jQuery.filter( qualifier, elements );
		}

		return jQuery.grep( elements, function( elem ) {
			return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
		} );
	}

	jQuery.filter = function( expr, elems, not ) {
		var elem = elems[ 0 ];

		if ( not ) {
			expr = ":not(" + expr + ")";
		}

		return elems.length === 1 && elem.nodeType === 1 ?
			jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [] :
			jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
				return elem.nodeType === 1;
			} ) );
	};

	jQuery.fn.extend( {
		find: function( selector ) {
			var i,
				len = this.length,
				ret = [],
				self = this;

			if ( typeof selector !== "string" ) {
				return this.pushStack( jQuery( selector ).filter( function() {
					for ( i = 0; i < len; i++ ) {
						if ( jQuery.contains( self[ i ], this ) ) {
							return true;
						}
					}
				} ) );
			}

			for ( i = 0; i < len; i++ ) {
				jQuery.find( selector, self[ i ], ret );
			}

			// Needed because $( selector, context ) becomes $( context ).find( selector )
			ret = this.pushStack( len > 1 ? jQuery.unique( ret ) : ret );
			ret.selector = this.selector ? this.selector + " " + selector : selector;
			return ret;
		},
		filter: function( selector ) {
			return this.pushStack( winnow( this, selector || [], false ) );
		},
		not: function( selector ) {
			return this.pushStack( winnow( this, selector || [], true ) );
		},
		is: function( selector ) {
			return !!winnow(
				this,

				// If this is a positional/relative selector, check membership in the returned set
				// so $("p:first").is("p:last") won't return true for a doc with two "p".
				typeof selector === "string" && rneedsContext.test( selector ) ?
					jQuery( selector ) :
					selector || [],
				false
			).length;
		}
	} );


	// Initialize a jQuery object


	// A central reference to the root jQuery(document)
	var rootjQuery,

		// A simple way to check for HTML strings
		// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
		// Strict HTML recognition (#11290: must start with <)
		rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,

		init = jQuery.fn.init = function( selector, context, root ) {
			var match, elem;

			// HANDLE: $(""), $(null), $(undefined), $(false)
			if ( !selector ) {
				return this;
			}

			// Method init() accepts an alternate rootjQuery
			// so migrate can support jQuery.sub (gh-2101)
			root = root || rootjQuery;

			// Handle HTML strings
			if ( typeof selector === "string" ) {
				if ( selector[ 0 ] === "<" &&
					selector[ selector.length - 1 ] === ">" &&
					selector.length >= 3 ) {

					// Assume that strings that start and end with <> are HTML and skip the regex check
					match = [ null, selector, null ];

				} else {
					match = rquickExpr.exec( selector );
				}

				// Match html or make sure no context is specified for #id
				if ( match && ( match[ 1 ] || !context ) ) {

					// HANDLE: $(html) -> $(array)
					if ( match[ 1 ] ) {
						context = context instanceof jQuery ? context[ 0 ] : context;

						// Option to run scripts is true for back-compat
						// Intentionally let the error be thrown if parseHTML is not present
						jQuery.merge( this, jQuery.parseHTML(
							match[ 1 ],
							context && context.nodeType ? context.ownerDocument || context : document,
							true
						) );

						// HANDLE: $(html, props)
						if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
							for ( match in context ) {

								// Properties of context are called as methods if possible
								if ( jQuery.isFunction( this[ match ] ) ) {
									this[ match ]( context[ match ] );

								// ...and otherwise set as attributes
								} else {
									this.attr( match, context[ match ] );
								}
							}
						}

						return this;

					// HANDLE: $(#id)
					} else {
						elem = document.getElementById( match[ 2 ] );

						// Support: Blackberry 4.6
						// gEBID returns nodes no longer in the document (#6963)
						if ( elem && elem.parentNode ) {

							// Inject the element directly into the jQuery object
							this.length = 1;
							this[ 0 ] = elem;
						}

						this.context = document;
						this.selector = selector;
						return this;
					}

				// HANDLE: $(expr, $(...))
				} else if ( !context || context.jquery ) {
					return ( context || root ).find( selector );

				// HANDLE: $(expr, context)
				// (which is just equivalent to: $(context).find(expr)
				} else {
					return this.constructor( context ).find( selector );
				}

			// HANDLE: $(DOMElement)
			} else if ( selector.nodeType ) {
				this.context = this[ 0 ] = selector;
				this.length = 1;
				return this;

			// HANDLE: $(function)
			// Shortcut for document ready
			} else if ( jQuery.isFunction( selector ) ) {
				return root.ready !== undefined ?
					root.ready( selector ) :

					// Execute immediately if ready is not present
					selector( jQuery );
			}

			if ( selector.selector !== undefined ) {
				this.selector = selector.selector;
				this.context = selector.context;
			}

			return jQuery.makeArray( selector, this );
		};

	// Give the init function the jQuery prototype for later instantiation
	init.prototype = jQuery.fn;

	// Initialize central reference
	rootjQuery = jQuery( document );


	var rparentsprev = /^(?:parents|prev(?:Until|All))/,

		// Methods guaranteed to produce a unique set when starting from a unique set
		guaranteedUnique = {
			children: true,
			contents: true,
			next: true,
			prev: true
		};

	jQuery.fn.extend( {
		has: function( target ) {
			var targets = jQuery( target, this ),
				l = targets.length;

			return this.filter( function() {
				var i = 0;
				for ( ; i < l; i++ ) {
					if ( jQuery.contains( this, targets[ i ] ) ) {
						return true;
					}
				}
			} );
		},

		closest: function( selectors, context ) {
			var cur,
				i = 0,
				l = this.length,
				matched = [],
				pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
					jQuery( selectors, context || this.context ) :
					0;

			for ( ; i < l; i++ ) {
				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

					// Always skip document fragments
					if ( cur.nodeType < 11 && ( pos ?
						pos.index( cur ) > -1 :

						// Don't pass non-elements to Sizzle
						cur.nodeType === 1 &&
							jQuery.find.matchesSelector( cur, selectors ) ) ) {

						matched.push( cur );
						break;
					}
				}
			}

			return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
		},

		// Determine the position of an element within the set
		index: function( elem ) {

			// No argument, return index in parent
			if ( !elem ) {
				return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
			}

			// Index in selector
			if ( typeof elem === "string" ) {
				return indexOf.call( jQuery( elem ), this[ 0 ] );
			}

			// Locate the position of the desired element
			return indexOf.call( this,

				// If it receives a jQuery object, the first element is used
				elem.jquery ? elem[ 0 ] : elem
			);
		},

		add: function( selector, context ) {
			return this.pushStack(
				jQuery.uniqueSort(
					jQuery.merge( this.get(), jQuery( selector, context ) )
				)
			);
		},

		addBack: function( selector ) {
			return this.add( selector == null ?
				this.prevObject : this.prevObject.filter( selector )
			);
		}
	} );

	function sibling( cur, dir ) {
		while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
		return cur;
	}

	jQuery.each( {
		parent: function( elem ) {
			var parent = elem.parentNode;
			return parent && parent.nodeType !== 11 ? parent : null;
		},
		parents: function( elem ) {
			return dir( elem, "parentNode" );
		},
		parentsUntil: function( elem, i, until ) {
			return dir( elem, "parentNode", until );
		},
		next: function( elem ) {
			return sibling( elem, "nextSibling" );
		},
		prev: function( elem ) {
			return sibling( elem, "previousSibling" );
		},
		nextAll: function( elem ) {
			return dir( elem, "nextSibling" );
		},
		prevAll: function( elem ) {
			return dir( elem, "previousSibling" );
		},
		nextUntil: function( elem, i, until ) {
			return dir( elem, "nextSibling", until );
		},
		prevUntil: function( elem, i, until ) {
			return dir( elem, "previousSibling", until );
		},
		siblings: function( elem ) {
			return siblings( ( elem.parentNode || {} ).firstChild, elem );
		},
		children: function( elem ) {
			return siblings( elem.firstChild );
		},
		contents: function( elem ) {
			return elem.contentDocument || jQuery.merge( [], elem.childNodes );
		}
	}, function( name, fn ) {
		jQuery.fn[ name ] = function( until, selector ) {
			var matched = jQuery.map( this, fn, until );

			if ( name.slice( -5 ) !== "Until" ) {
				selector = until;
			}

			if ( selector && typeof selector === "string" ) {
				matched = jQuery.filter( selector, matched );
			}

			if ( this.length > 1 ) {

				// Remove duplicates
				if ( !guaranteedUnique[ name ] ) {
					jQuery.uniqueSort( matched );
				}

				// Reverse order for parents* and prev-derivatives
				if ( rparentsprev.test( name ) ) {
					matched.reverse();
				}
			}

			return this.pushStack( matched );
		};
	} );
	var rnotwhite = ( /\S+/g );



	// Convert String-formatted options into Object-formatted ones
	function createOptions( options ) {
		var object = {};
		jQuery.each( options.match( rnotwhite ) || [], function( _, flag ) {
			object[ flag ] = true;
		} );
		return object;
	}

	/*
	 * Create a callback list using the following parameters:
	 *
	 *	options: an optional list of space-separated options that will change how
	 *			the callback list behaves or a more traditional option object
	 *
	 * By default a callback list will act like an event callback list and can be
	 * "fired" multiple times.
	 *
	 * Possible options:
	 *
	 *	once:			will ensure the callback list can only be fired once (like a Deferred)
	 *
	 *	memory:			will keep track of previous values and will call any callback added
	 *					after the list has been fired right away with the latest "memorized"
	 *					values (like a Deferred)
	 *
	 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
	 *
	 *	stopOnFalse:	interrupt callings when a callback returns false
	 *
	 */
	jQuery.Callbacks = function( options ) {

		// Convert options from String-formatted to Object-formatted if needed
		// (we check in cache first)
		options = typeof options === "string" ?
			createOptions( options ) :
			jQuery.extend( {}, options );

		var // Flag to know if list is currently firing
			firing,

			// Last fire value for non-forgettable lists
			memory,

			// Flag to know if list was already fired
			fired,

			// Flag to prevent firing
			locked,

			// Actual callback list
			list = [],

			// Queue of execution data for repeatable lists
			queue = [],

			// Index of currently firing callback (modified by add/remove as needed)
			firingIndex = -1,

			// Fire callbacks
			fire = function() {

				// Enforce single-firing
				locked = options.once;

				// Execute callbacks for all pending executions,
				// respecting firingIndex overrides and runtime changes
				fired = firing = true;
				for ( ; queue.length; firingIndex = -1 ) {
					memory = queue.shift();
					while ( ++firingIndex < list.length ) {

						// Run callback and check for early termination
						if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
							options.stopOnFalse ) {

							// Jump to end and forget the data so .add doesn't re-fire
							firingIndex = list.length;
							memory = false;
						}
					}
				}

				// Forget the data if we're done with it
				if ( !options.memory ) {
					memory = false;
				}

				firing = false;

				// Clean up if we're done firing for good
				if ( locked ) {

					// Keep an empty list if we have data for future add calls
					if ( memory ) {
						list = [];

					// Otherwise, this object is spent
					} else {
						list = "";
					}
				}
			},

			// Actual Callbacks object
			self = {

				// Add a callback or a collection of callbacks to the list
				add: function() {
					if ( list ) {

						// If we have memory from a past run, we should fire after adding
						if ( memory && !firing ) {
							firingIndex = list.length - 1;
							queue.push( memory );
						}

						( function add( args ) {
							jQuery.each( args, function( _, arg ) {
								if ( jQuery.isFunction( arg ) ) {
									if ( !options.unique || !self.has( arg ) ) {
										list.push( arg );
									}
								} else if ( arg && arg.length && jQuery.type( arg ) !== "string" ) {

									// Inspect recursively
									add( arg );
								}
							} );
						} )( arguments );

						if ( memory && !firing ) {
							fire();
						}
					}
					return this;
				},

				// Remove a callback from the list
				remove: function() {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );

							// Handle firing indexes
							if ( index <= firingIndex ) {
								firingIndex--;
							}
						}
					} );
					return this;
				},

				// Check if a given callback is in the list.
				// If no argument is given, return whether or not list has callbacks attached.
				has: function( fn ) {
					return fn ?
						jQuery.inArray( fn, list ) > -1 :
						list.length > 0;
				},

				// Remove all callbacks from the list
				empty: function() {
					if ( list ) {
						list = [];
					}
					return this;
				},

				// Disable .fire and .add
				// Abort any current/pending executions
				// Clear all callbacks and values
				disable: function() {
					locked = queue = [];
					list = memory = "";
					return this;
				},
				disabled: function() {
					return !list;
				},

				// Disable .fire
				// Also disable .add unless we have memory (since it would have no effect)
				// Abort any pending executions
				lock: function() {
					locked = queue = [];
					if ( !memory ) {
						list = memory = "";
					}
					return this;
				},
				locked: function() {
					return !!locked;
				},

				// Call all callbacks with the given context and arguments
				fireWith: function( context, args ) {
					if ( !locked ) {
						args = args || [];
						args = [ context, args.slice ? args.slice() : args ];
						queue.push( args );
						if ( !firing ) {
							fire();
						}
					}
					return this;
				},

				// Call all the callbacks with the given arguments
				fire: function() {
					self.fireWith( this, arguments );
					return this;
				},

				// To know if the callbacks have already been called at least once
				fired: function() {
					return !!fired;
				}
			};

		return self;
	};


	jQuery.extend( {

		Deferred: function( func ) {
			var tuples = [

					// action, add listener, listener list, final state
					[ "resolve", "done", jQuery.Callbacks( "once memory" ), "resolved" ],
					[ "reject", "fail", jQuery.Callbacks( "once memory" ), "rejected" ],
					[ "notify", "progress", jQuery.Callbacks( "memory" ) ]
				],
				state = "pending",
				promise = {
					state: function() {
						return state;
					},
					always: function() {
						deferred.done( arguments ).fail( arguments );
						return this;
					},
					then: function( /* fnDone, fnFail, fnProgress */ ) {
						var fns = arguments;
						return jQuery.Deferred( function( newDefer ) {
							jQuery.each( tuples, function( i, tuple ) {
								var fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];

								// deferred[ done | fail | progress ] for forwarding actions to newDefer
								deferred[ tuple[ 1 ] ]( function() {
									var returned = fn && fn.apply( this, arguments );
									if ( returned && jQuery.isFunction( returned.promise ) ) {
										returned.promise()
											.progress( newDefer.notify )
											.done( newDefer.resolve )
											.fail( newDefer.reject );
									} else {
										newDefer[ tuple[ 0 ] + "With" ](
											this === promise ? newDefer.promise() : this,
											fn ? [ returned ] : arguments
										);
									}
								} );
							} );
							fns = null;
						} ).promise();
					},

					// Get a promise for this deferred
					// If obj is provided, the promise aspect is added to the object
					promise: function( obj ) {
						return obj != null ? jQuery.extend( obj, promise ) : promise;
					}
				},
				deferred = {};

			// Keep pipe for back-compat
			promise.pipe = promise.then;

			// Add list-specific methods
			jQuery.each( tuples, function( i, tuple ) {
				var list = tuple[ 2 ],
					stateString = tuple[ 3 ];

				// promise[ done | fail | progress ] = list.add
				promise[ tuple[ 1 ] ] = list.add;

				// Handle state
				if ( stateString ) {
					list.add( function() {

						// state = [ resolved | rejected ]
						state = stateString;

					// [ reject_list | resolve_list ].disable; progress_list.lock
					}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
				}

				// deferred[ resolve | reject | notify ]
				deferred[ tuple[ 0 ] ] = function() {
					deferred[ tuple[ 0 ] + "With" ]( this === deferred ? promise : this, arguments );
					return this;
				};
				deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
			} );

			// Make the deferred a promise
			promise.promise( deferred );

			// Call given func if any
			if ( func ) {
				func.call( deferred, deferred );
			}

			// All done!
			return deferred;
		},

		// Deferred helper
		when: function( subordinate /* , ..., subordinateN */ ) {
			var i = 0,
				resolveValues = slice.call( arguments ),
				length = resolveValues.length,

				// the count of uncompleted subordinates
				remaining = length !== 1 ||
					( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

				// the master Deferred.
				// If resolveValues consist of only a single Deferred, just use that.
				deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

				// Update function for both resolve and progress values
				updateFunc = function( i, contexts, values ) {
					return function( value ) {
						contexts[ i ] = this;
						values[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
						if ( values === progressValues ) {
							deferred.notifyWith( contexts, values );
						} else if ( !( --remaining ) ) {
							deferred.resolveWith( contexts, values );
						}
					};
				},

				progressValues, progressContexts, resolveContexts;

			// Add listeners to Deferred subordinates; treat others as resolved
			if ( length > 1 ) {
				progressValues = new Array( length );
				progressContexts = new Array( length );
				resolveContexts = new Array( length );
				for ( ; i < length; i++ ) {
					if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
						resolveValues[ i ].promise()
							.progress( updateFunc( i, progressContexts, progressValues ) )
							.done( updateFunc( i, resolveContexts, resolveValues ) )
							.fail( deferred.reject );
					} else {
						--remaining;
					}
				}
			}

			// If we're not waiting on anything, resolve the master
			if ( !remaining ) {
				deferred.resolveWith( resolveContexts, resolveValues );
			}

			return deferred.promise();
		}
	} );


	// The deferred used on DOM ready
	var readyList;

	jQuery.fn.ready = function( fn ) {

		// Add the callback
		jQuery.ready.promise().done( fn );

		return this;
	};

	jQuery.extend( {

		// Is the DOM ready to be used? Set to true once it occurs.
		isReady: false,

		// A counter to track how many items to wait for before
		// the ready event fires. See #6781
		readyWait: 1,

		// Hold (or release) the ready event
		holdReady: function( hold ) {
			if ( hold ) {
				jQuery.readyWait++;
			} else {
				jQuery.ready( true );
			}
		},

		// Handle when the DOM is ready
		ready: function( wait ) {

			// Abort if there are pending holds or we're already ready
			if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
				return;
			}

			// Remember that the DOM is ready
			jQuery.isReady = true;

			// If a normal DOM Ready event fired, decrement, and wait if need be
			if ( wait !== true && --jQuery.readyWait > 0 ) {
				return;
			}

			// If there are functions bound, to execute
			readyList.resolveWith( document, [ jQuery ] );

			// Trigger any bound ready events
			if ( jQuery.fn.triggerHandler ) {
				jQuery( document ).triggerHandler( "ready" );
				jQuery( document ).off( "ready" );
			}
		}
	} );

	/**
	 * The ready event handler and self cleanup method
	 */
	function completed() {
		document.removeEventListener( "DOMContentLoaded", completed );
		window.removeEventListener( "load", completed );
		jQuery.ready();
	}

	jQuery.ready.promise = function( obj ) {
		if ( !readyList ) {

			readyList = jQuery.Deferred();

			// Catch cases where $(document).ready() is called
			// after the browser event has already occurred.
			// Support: IE9-10 only
			// Older IE sometimes signals "interactive" too soon
			if ( document.readyState === "complete" ||
				( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

				// Handle it asynchronously to allow scripts the opportunity to delay ready
				window.setTimeout( jQuery.ready );

			} else {

				// Use the handy event callback
				document.addEventListener( "DOMContentLoaded", completed );

				// A fallback to window.onload, that will always work
				window.addEventListener( "load", completed );
			}
		}
		return readyList.promise( obj );
	};

	// Kick off the DOM ready check even if the user does not
	jQuery.ready.promise();




	// Multifunctional method to get and set values of a collection
	// The value/s can optionally be executed if it's a function
	var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
		var i = 0,
			len = elems.length,
			bulk = key == null;

		// Sets many values
		if ( jQuery.type( key ) === "object" ) {
			chainable = true;
			for ( i in key ) {
				access( elems, fn, i, key[ i ], true, emptyGet, raw );
			}

		// Sets one value
		} else if ( value !== undefined ) {
			chainable = true;

			if ( !jQuery.isFunction( value ) ) {
				raw = true;
			}

			if ( bulk ) {

				// Bulk operations run against the entire set
				if ( raw ) {
					fn.call( elems, value );
					fn = null;

				// ...except when executing function values
				} else {
					bulk = fn;
					fn = function( elem, key, value ) {
						return bulk.call( jQuery( elem ), value );
					};
				}
			}

			if ( fn ) {
				for ( ; i < len; i++ ) {
					fn(
						elems[ i ], key, raw ?
						value :
						value.call( elems[ i ], i, fn( elems[ i ], key ) )
					);
				}
			}
		}

		return chainable ?
			elems :

			// Gets
			bulk ?
				fn.call( elems ) :
				len ? fn( elems[ 0 ], key ) : emptyGet;
	};
	var acceptData = function( owner ) {

		// Accepts only:
		//  - Node
		//    - Node.ELEMENT_NODE
		//    - Node.DOCUMENT_NODE
		//  - Object
		//    - Any
		/* jshint -W018 */
		return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
	};




	function Data() {
		this.expando = jQuery.expando + Data.uid++;
	}

	Data.uid = 1;

	Data.prototype = {

		register: function( owner, initial ) {
			var value = initial || {};

			// If it is a node unlikely to be stringify-ed or looped over
			// use plain assignment
			if ( owner.nodeType ) {
				owner[ this.expando ] = value;

			// Otherwise secure it in a non-enumerable, non-writable property
			// configurability must be true to allow the property to be
			// deleted with the delete operator
			} else {
				Object.defineProperty( owner, this.expando, {
					value: value,
					writable: true,
					configurable: true
				} );
			}
			return owner[ this.expando ];
		},
		cache: function( owner ) {

			// We can accept data for non-element nodes in modern browsers,
			// but we should not, see #8335.
			// Always return an empty object.
			if ( !acceptData( owner ) ) {
				return {};
			}

			// Check if the owner object already has a cache
			var value = owner[ this.expando ];

			// If not, create one
			if ( !value ) {
				value = {};

				// We can accept data for non-element nodes in modern browsers,
				// but we should not, see #8335.
				// Always return an empty object.
				if ( acceptData( owner ) ) {

					// If it is a node unlikely to be stringify-ed or looped over
					// use plain assignment
					if ( owner.nodeType ) {
						owner[ this.expando ] = value;

					// Otherwise secure it in a non-enumerable property
					// configurable must be true to allow the property to be
					// deleted when data is removed
					} else {
						Object.defineProperty( owner, this.expando, {
							value: value,
							configurable: true
						} );
					}
				}
			}

			return value;
		},
		set: function( owner, data, value ) {
			var prop,
				cache = this.cache( owner );

			// Handle: [ owner, key, value ] args
			if ( typeof data === "string" ) {
				cache[ data ] = value;

			// Handle: [ owner, { properties } ] args
			} else {

				// Copy the properties one-by-one to the cache object
				for ( prop in data ) {
					cache[ prop ] = data[ prop ];
				}
			}
			return cache;
		},
		get: function( owner, key ) {
			return key === undefined ?
				this.cache( owner ) :
				owner[ this.expando ] && owner[ this.expando ][ key ];
		},
		access: function( owner, key, value ) {
			var stored;

			// In cases where either:
			//
			//   1. No key was specified
			//   2. A string key was specified, but no value provided
			//
			// Take the "read" path and allow the get method to determine
			// which value to return, respectively either:
			//
			//   1. The entire cache object
			//   2. The data stored at the key
			//
			if ( key === undefined ||
					( ( key && typeof key === "string" ) && value === undefined ) ) {

				stored = this.get( owner, key );

				return stored !== undefined ?
					stored : this.get( owner, jQuery.camelCase( key ) );
			}

			// When the key is not a string, or both a key and value
			// are specified, set or extend (existing objects) with either:
			//
			//   1. An object of properties
			//   2. A key and value
			//
			this.set( owner, key, value );

			// Since the "set" path can have two possible entry points
			// return the expected data based on which path was taken[*]
			return value !== undefined ? value : key;
		},
		remove: function( owner, key ) {
			var i, name, camel,
				cache = owner[ this.expando ];

			if ( cache === undefined ) {
				return;
			}

			if ( key === undefined ) {
				this.register( owner );

			} else {

				// Support array or space separated string of keys
				if ( jQuery.isArray( key ) ) {

					// If "name" is an array of keys...
					// When data is initially created, via ("key", "val") signature,
					// keys will be converted to camelCase.
					// Since there is no way to tell _how_ a key was added, remove
					// both plain key and camelCase key. #12786
					// This will only penalize the array argument path.
					name = key.concat( key.map( jQuery.camelCase ) );
				} else {
					camel = jQuery.camelCase( key );

					// Try the string as a key before any manipulation
					if ( key in cache ) {
						name = [ key, camel ];
					} else {

						// If a key with the spaces exists, use it.
						// Otherwise, create an array by matching non-whitespace
						name = camel;
						name = name in cache ?
							[ name ] : ( name.match( rnotwhite ) || [] );
					}
				}

				i = name.length;

				while ( i-- ) {
					delete cache[ name[ i ] ];
				}
			}

			// Remove the expando if there's no more data
			if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

				// Support: Chrome <= 35-45+
				// Webkit & Blink performance suffers when deleting properties
				// from DOM nodes, so set to undefined instead
				// https://code.google.com/p/chromium/issues/detail?id=378607
				if ( owner.nodeType ) {
					owner[ this.expando ] = undefined;
				} else {
					delete owner[ this.expando ];
				}
			}
		},
		hasData: function( owner ) {
			var cache = owner[ this.expando ];
			return cache !== undefined && !jQuery.isEmptyObject( cache );
		}
	};
	var dataPriv = new Data();

	var dataUser = new Data();



	//	Implementation Summary
	//
	//	1. Enforce API surface and semantic compatibility with 1.9.x branch
	//	2. Improve the module's maintainability by reducing the storage
	//		paths to a single mechanism.
	//	3. Use the same single mechanism to support "private" and "user" data.
	//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
	//	5. Avoid exposing implementation details on user objects (eg. expando properties)
	//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

	var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
		rmultiDash = /[A-Z]/g;

	function dataAttr( elem, key, data ) {
		var name;

		// If nothing was found internally, try to fetch any
		// data from the HTML5 data-* attribute
		if ( data === undefined && elem.nodeType === 1 ) {
			name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
			data = elem.getAttribute( name );

			if ( typeof data === "string" ) {
				try {
					data = data === "true" ? true :
						data === "false" ? false :
						data === "null" ? null :

						// Only convert to a number if it doesn't change the string
						+data + "" === data ? +data :
						rbrace.test( data ) ? jQuery.parseJSON( data ) :
						data;
				} catch ( e ) {}

				// Make sure we set the data so it isn't changed later
				dataUser.set( elem, key, data );
			} else {
				data = undefined;
			}
		}
		return data;
	}

	jQuery.extend( {
		hasData: function( elem ) {
			return dataUser.hasData( elem ) || dataPriv.hasData( elem );
		},

		data: function( elem, name, data ) {
			return dataUser.access( elem, name, data );
		},

		removeData: function( elem, name ) {
			dataUser.remove( elem, name );
		},

		// TODO: Now that all calls to _data and _removeData have been replaced
		// with direct calls to dataPriv methods, these can be deprecated.
		_data: function( elem, name, data ) {
			return dataPriv.access( elem, name, data );
		},

		_removeData: function( elem, name ) {
			dataPriv.remove( elem, name );
		}
	} );

	jQuery.fn.extend( {
		data: function( key, value ) {
			var i, name, data,
				elem = this[ 0 ],
				attrs = elem && elem.attributes;

			// Gets all values
			if ( key === undefined ) {
				if ( this.length ) {
					data = dataUser.get( elem );

					if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
						i = attrs.length;
						while ( i-- ) {

							// Support: IE11+
							// The attrs elements can be null (#14894)
							if ( attrs[ i ] ) {
								name = attrs[ i ].name;
								if ( name.indexOf( "data-" ) === 0 ) {
									name = jQuery.camelCase( name.slice( 5 ) );
									dataAttr( elem, name, data[ name ] );
								}
							}
						}
						dataPriv.set( elem, "hasDataAttrs", true );
					}
				}

				return data;
			}

			// Sets multiple values
			if ( typeof key === "object" ) {
				return this.each( function() {
					dataUser.set( this, key );
				} );
			}

			return access( this, function( value ) {
				var data, camelKey;

				// The calling jQuery object (element matches) is not empty
				// (and therefore has an element appears at this[ 0 ]) and the
				// `value` parameter was not undefined. An empty jQuery object
				// will result in `undefined` for elem = this[ 0 ] which will
				// throw an exception if an attempt to read a data cache is made.
				if ( elem && value === undefined ) {

					// Attempt to get data from the cache
					// with the key as-is
					data = dataUser.get( elem, key ) ||

						// Try to find dashed key if it exists (gh-2779)
						// This is for 2.2.x only
						dataUser.get( elem, key.replace( rmultiDash, "-$&" ).toLowerCase() );

					if ( data !== undefined ) {
						return data;
					}

					camelKey = jQuery.camelCase( key );

					// Attempt to get data from the cache
					// with the key camelized
					data = dataUser.get( elem, camelKey );
					if ( data !== undefined ) {
						return data;
					}

					// Attempt to "discover" the data in
					// HTML5 custom data-* attrs
					data = dataAttr( elem, camelKey, undefined );
					if ( data !== undefined ) {
						return data;
					}

					// We tried really hard, but the data doesn't exist.
					return;
				}

				// Set the data...
				camelKey = jQuery.camelCase( key );
				this.each( function() {

					// First, attempt to store a copy or reference of any
					// data that might've been store with a camelCased key.
					var data = dataUser.get( this, camelKey );

					// For HTML5 data-* attribute interop, we have to
					// store property names with dashes in a camelCase form.
					// This might not apply to all properties...*
					dataUser.set( this, camelKey, value );

					// *... In the case of properties that might _actually_
					// have dashes, we need to also store a copy of that
					// unchanged property.
					if ( key.indexOf( "-" ) > -1 && data !== undefined ) {
						dataUser.set( this, key, value );
					}
				} );
			}, null, value, arguments.length > 1, null, true );
		},

		removeData: function( key ) {
			return this.each( function() {
				dataUser.remove( this, key );
			} );
		}
	} );


	jQuery.extend( {
		queue: function( elem, type, data ) {
			var queue;

			if ( elem ) {
				type = ( type || "fx" ) + "queue";
				queue = dataPriv.get( elem, type );

				// Speed up dequeue by getting out quickly if this is just a lookup
				if ( data ) {
					if ( !queue || jQuery.isArray( data ) ) {
						queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
					} else {
						queue.push( data );
					}
				}
				return queue || [];
			}
		},

		dequeue: function( elem, type ) {
			type = type || "fx";

			var queue = jQuery.queue( elem, type ),
				startLength = queue.length,
				fn = queue.shift(),
				hooks = jQuery._queueHooks( elem, type ),
				next = function() {
					jQuery.dequeue( elem, type );
				};

			// If the fx queue is dequeued, always remove the progress sentinel
			if ( fn === "inprogress" ) {
				fn = queue.shift();
				startLength--;
			}

			if ( fn ) {

				// Add a progress sentinel to prevent the fx queue from being
				// automatically dequeued
				if ( type === "fx" ) {
					queue.unshift( "inprogress" );
				}

				// Clear up the last queue stop function
				delete hooks.stop;
				fn.call( elem, next, hooks );
			}

			if ( !startLength && hooks ) {
				hooks.empty.fire();
			}
		},

		// Not public - generate a queueHooks object, or return the current one
		_queueHooks: function( elem, type ) {
			var key = type + "queueHooks";
			return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
				empty: jQuery.Callbacks( "once memory" ).add( function() {
					dataPriv.remove( elem, [ type + "queue", key ] );
				} )
			} );
		}
	} );

	jQuery.fn.extend( {
		queue: function( type, data ) {
			var setter = 2;

			if ( typeof type !== "string" ) {
				data = type;
				type = "fx";
				setter--;
			}

			if ( arguments.length < setter ) {
				return jQuery.queue( this[ 0 ], type );
			}

			return data === undefined ?
				this :
				this.each( function() {
					var queue = jQuery.queue( this, type, data );

					// Ensure a hooks for this queue
					jQuery._queueHooks( this, type );

					if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
						jQuery.dequeue( this, type );
					}
				} );
		},
		dequeue: function( type ) {
			return this.each( function() {
				jQuery.dequeue( this, type );
			} );
		},
		clearQueue: function( type ) {
			return this.queue( type || "fx", [] );
		},

		// Get a promise resolved when queues of a certain type
		// are emptied (fx is the type by default)
		promise: function( type, obj ) {
			var tmp,
				count = 1,
				defer = jQuery.Deferred(),
				elements = this,
				i = this.length,
				resolve = function() {
					if ( !( --count ) ) {
						defer.resolveWith( elements, [ elements ] );
					}
				};

			if ( typeof type !== "string" ) {
				obj = type;
				type = undefined;
			}
			type = type || "fx";

			while ( i-- ) {
				tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
				if ( tmp && tmp.empty ) {
					count++;
					tmp.empty.add( resolve );
				}
			}
			resolve();
			return defer.promise( obj );
		}
	} );
	var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

	var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


	var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

	var isHidden = function( elem, el ) {

			// isHidden might be called from jQuery#filter function;
			// in that case, element will be second argument
			elem = el || elem;
			return jQuery.css( elem, "display" ) === "none" ||
				!jQuery.contains( elem.ownerDocument, elem );
		};



	function adjustCSS( elem, prop, valueParts, tween ) {
		var adjusted,
			scale = 1,
			maxIterations = 20,
			currentValue = tween ?
				function() { return tween.cur(); } :
				function() { return jQuery.css( elem, prop, "" ); },
			initial = currentValue(),
			unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

			// Starting value computation is required for potential unit mismatches
			initialInUnit = ( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
				rcssNum.exec( jQuery.css( elem, prop ) );

		if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

			// Trust units reported by jQuery.css
			unit = unit || initialInUnit[ 3 ];

			// Make sure we update the tween properties later on
			valueParts = valueParts || [];

			// Iteratively approximate from a nonzero starting point
			initialInUnit = +initial || 1;

			do {

				// If previous iteration zeroed out, double until we get *something*.
				// Use string for doubling so we don't accidentally see scale as unchanged below
				scale = scale || ".5";

				// Adjust and apply
				initialInUnit = initialInUnit / scale;
				jQuery.style( elem, prop, initialInUnit + unit );

			// Update scale, tolerating zero or NaN from tween.cur()
			// Break the loop if scale is unchanged or perfect, or if we've just had enough.
			} while (
				scale !== ( scale = currentValue() / initial ) && scale !== 1 && --maxIterations
			);
		}

		if ( valueParts ) {
			initialInUnit = +initialInUnit || +initial || 0;

			// Apply relative offset (+=/-=) if specified
			adjusted = valueParts[ 1 ] ?
				initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
				+valueParts[ 2 ];
			if ( tween ) {
				tween.unit = unit;
				tween.start = initialInUnit;
				tween.end = adjusted;
			}
		}
		return adjusted;
	}
	var rcheckableType = ( /^(?:checkbox|radio)$/i );

	var rtagName = ( /<([\w:-]+)/ );

	var rscriptType = ( /^$|\/(?:java|ecma)script/i );



	// We have to close these tags to support XHTML (#13200)
	var wrapMap = {

		// Support: IE9
		option: [ 1, "<select multiple='multiple'>", "</select>" ],

		// XHTML parsers do not magically insert elements in the
		// same way that tag soup parsers do. So we cannot shorten
		// this by omitting <tbody> or other required elements.
		thead: [ 1, "<table>", "</table>" ],
		col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

		_default: [ 0, "", "" ]
	};

	// Support: IE9
	wrapMap.optgroup = wrapMap.option;

	wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
	wrapMap.th = wrapMap.td;


	function getAll( context, tag ) {

		// Support: IE9-11+
		// Use typeof to avoid zero-argument method invocation on host objects (#15151)
		var ret = typeof context.getElementsByTagName !== "undefined" ?
				context.getElementsByTagName( tag || "*" ) :
				typeof context.querySelectorAll !== "undefined" ?
					context.querySelectorAll( tag || "*" ) :
				[];

		return tag === undefined || tag && jQuery.nodeName( context, tag ) ?
			jQuery.merge( [ context ], ret ) :
			ret;
	}


	// Mark scripts as having already been evaluated
	function setGlobalEval( elems, refElements ) {
		var i = 0,
			l = elems.length;

		for ( ; i < l; i++ ) {
			dataPriv.set(
				elems[ i ],
				"globalEval",
				!refElements || dataPriv.get( refElements[ i ], "globalEval" )
			);
		}
	}


	var rhtml = /<|&#?\w+;/;

	function buildFragment( elems, context, scripts, selection, ignored ) {
		var elem, tmp, tag, wrap, contains, j,
			fragment = context.createDocumentFragment(),
			nodes = [],
			i = 0,
			l = elems.length;

		for ( ; i < l; i++ ) {
			elem = elems[ i ];

			if ( elem || elem === 0 ) {

				// Add nodes directly
				if ( jQuery.type( elem ) === "object" ) {

					// Support: Android<4.1, PhantomJS<2
					// push.apply(_, arraylike) throws on ancient WebKit
					jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

				// Convert non-html into a text node
				} else if ( !rhtml.test( elem ) ) {
					nodes.push( context.createTextNode( elem ) );

				// Convert html into DOM nodes
				} else {
					tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

					// Deserialize a standard representation
					tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
					wrap = wrapMap[ tag ] || wrapMap._default;
					tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

					// Descend through wrappers to the right content
					j = wrap[ 0 ];
					while ( j-- ) {
						tmp = tmp.lastChild;
					}

					// Support: Android<4.1, PhantomJS<2
					// push.apply(_, arraylike) throws on ancient WebKit
					jQuery.merge( nodes, tmp.childNodes );

					// Remember the top-level container
					tmp = fragment.firstChild;

					// Ensure the created nodes are orphaned (#12392)
					tmp.textContent = "";
				}
			}
		}

		// Remove wrapper from fragment
		fragment.textContent = "";

		i = 0;
		while ( ( elem = nodes[ i++ ] ) ) {

			// Skip elements already in the context collection (trac-4087)
			if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
				if ( ignored ) {
					ignored.push( elem );
				}
				continue;
			}

			contains = jQuery.contains( elem.ownerDocument, elem );

			// Append to fragment
			tmp = getAll( fragment.appendChild( elem ), "script" );

			// Preserve script evaluation history
			if ( contains ) {
				setGlobalEval( tmp );
			}

			// Capture executables
			if ( scripts ) {
				j = 0;
				while ( ( elem = tmp[ j++ ] ) ) {
					if ( rscriptType.test( elem.type || "" ) ) {
						scripts.push( elem );
					}
				}
			}
		}

		return fragment;
	}


	( function() {
		var fragment = document.createDocumentFragment(),
			div = fragment.appendChild( document.createElement( "div" ) ),
			input = document.createElement( "input" );

		// Support: Android 4.0-4.3, Safari<=5.1
		// Check state lost if the name is set (#11217)
		// Support: Windows Web Apps (WWA)
		// `name` and `type` must use .setAttribute for WWA (#14901)
		input.setAttribute( "type", "radio" );
		input.setAttribute( "checked", "checked" );
		input.setAttribute( "name", "t" );

		div.appendChild( input );

		// Support: Safari<=5.1, Android<4.2
		// Older WebKit doesn't clone checked state correctly in fragments
		support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

		// Support: IE<=11+
		// Make sure textarea (and checkbox) defaultValue is properly cloned
		div.innerHTML = "<textarea>x</textarea>";
		support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
	} )();


	var
		rkeyEvent = /^key/,
		rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
		rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

	function returnTrue() {
		return true;
	}

	function returnFalse() {
		return false;
	}

	// Support: IE9
	// See #13393 for more info
	function safeActiveElement() {
		try {
			return document.activeElement;
		} catch ( err ) { }
	}

	function on( elem, types, selector, data, fn, one ) {
		var origFn, type;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {

			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) {

				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				on( elem, type, selector, data, types[ type ], one );
			}
			return elem;
		}

		if ( data == null && fn == null ) {

			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {

				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {

				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return elem;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {

				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};

			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return elem.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		} );
	}

	/*
	 * Helper functions for managing events -- not part of the public interface.
	 * Props to Dean Edwards' addEvent library for many of the ideas.
	 */
	jQuery.event = {

		global: {},

		add: function( elem, types, handler, data, selector ) {

			var handleObjIn, eventHandle, tmp,
				events, t, handleObj,
				special, handlers, type, namespaces, origType,
				elemData = dataPriv.get( elem );

			// Don't attach events to noData or text/comment nodes (but allow plain objects)
			if ( !elemData ) {
				return;
			}

			// Caller can pass in an object of custom data in lieu of the handler
			if ( handler.handler ) {
				handleObjIn = handler;
				handler = handleObjIn.handler;
				selector = handleObjIn.selector;
			}

			// Make sure that the handler has a unique ID, used to find/remove it later
			if ( !handler.guid ) {
				handler.guid = jQuery.guid++;
			}

			// Init the element's event structure and main handler, if this is the first
			if ( !( events = elemData.events ) ) {
				events = elemData.events = {};
			}
			if ( !( eventHandle = elemData.handle ) ) {
				eventHandle = elemData.handle = function( e ) {

					// Discard the second event of a jQuery.event.trigger() and
					// when an event is called after a page has unloaded
					return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
						jQuery.event.dispatch.apply( elem, arguments ) : undefined;
				};
			}

			// Handle multiple events separated by a space
			types = ( types || "" ).match( rnotwhite ) || [ "" ];
			t = types.length;
			while ( t-- ) {
				tmp = rtypenamespace.exec( types[ t ] ) || [];
				type = origType = tmp[ 1 ];
				namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

				// There *must* be a type, no attaching namespace-only handlers
				if ( !type ) {
					continue;
				}

				// If event changes its type, use the special event handlers for the changed type
				special = jQuery.event.special[ type ] || {};

				// If selector defined, determine special event api type, otherwise given type
				type = ( selector ? special.delegateType : special.bindType ) || type;

				// Update special based on newly reset type
				special = jQuery.event.special[ type ] || {};

				// handleObj is passed to all event handlers
				handleObj = jQuery.extend( {
					type: type,
					origType: origType,
					data: data,
					handler: handler,
					guid: handler.guid,
					selector: selector,
					needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
					namespace: namespaces.join( "." )
				}, handleObjIn );

				// Init the event handler queue if we're the first
				if ( !( handlers = events[ type ] ) ) {
					handlers = events[ type ] = [];
					handlers.delegateCount = 0;

					// Only use addEventListener if the special events handler returns false
					if ( !special.setup ||
						special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

						if ( elem.addEventListener ) {
							elem.addEventListener( type, eventHandle );
						}
					}
				}

				if ( special.add ) {
					special.add.call( elem, handleObj );

					if ( !handleObj.handler.guid ) {
						handleObj.handler.guid = handler.guid;
					}
				}

				// Add to the element's handler list, delegates in front
				if ( selector ) {
					handlers.splice( handlers.delegateCount++, 0, handleObj );
				} else {
					handlers.push( handleObj );
				}

				// Keep track of which events have ever been used, for event optimization
				jQuery.event.global[ type ] = true;
			}

		},

		// Detach an event or set of events from an element
		remove: function( elem, types, handler, selector, mappedTypes ) {

			var j, origCount, tmp,
				events, t, handleObj,
				special, handlers, type, namespaces, origType,
				elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

			if ( !elemData || !( events = elemData.events ) ) {
				return;
			}

			// Once for each type.namespace in types; type may be omitted
			types = ( types || "" ).match( rnotwhite ) || [ "" ];
			t = types.length;
			while ( t-- ) {
				tmp = rtypenamespace.exec( types[ t ] ) || [];
				type = origType = tmp[ 1 ];
				namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

				// Unbind all events (on this namespace, if provided) for the element
				if ( !type ) {
					for ( type in events ) {
						jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
					}
					continue;
				}

				special = jQuery.event.special[ type ] || {};
				type = ( selector ? special.delegateType : special.bindType ) || type;
				handlers = events[ type ] || [];
				tmp = tmp[ 2 ] &&
					new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

				// Remove matching events
				origCount = j = handlers.length;
				while ( j-- ) {
					handleObj = handlers[ j ];

					if ( ( mappedTypes || origType === handleObj.origType ) &&
						( !handler || handler.guid === handleObj.guid ) &&
						( !tmp || tmp.test( handleObj.namespace ) ) &&
						( !selector || selector === handleObj.selector ||
							selector === "**" && handleObj.selector ) ) {
						handlers.splice( j, 1 );

						if ( handleObj.selector ) {
							handlers.delegateCount--;
						}
						if ( special.remove ) {
							special.remove.call( elem, handleObj );
						}
					}
				}

				// Remove generic event handler if we removed something and no more handlers exist
				// (avoids potential for endless recursion during removal of special event handlers)
				if ( origCount && !handlers.length ) {
					if ( !special.teardown ||
						special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

						jQuery.removeEvent( elem, type, elemData.handle );
					}

					delete events[ type ];
				}
			}

			// Remove data and the expando if it's no longer used
			if ( jQuery.isEmptyObject( events ) ) {
				dataPriv.remove( elem, "handle events" );
			}
		},

		dispatch: function( event ) {

			// Make a writable jQuery.Event from the native event object
			event = jQuery.event.fix( event );

			var i, j, ret, matched, handleObj,
				handlerQueue = [],
				args = slice.call( arguments ),
				handlers = ( dataPriv.get( this, "events" ) || {} )[ event.type ] || [],
				special = jQuery.event.special[ event.type ] || {};

			// Use the fix-ed jQuery.Event rather than the (read-only) native event
			args[ 0 ] = event;
			event.delegateTarget = this;

			// Call the preDispatch hook for the mapped type, and let it bail if desired
			if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
				return;
			}

			// Determine handlers
			handlerQueue = jQuery.event.handlers.call( this, event, handlers );

			// Run delegates first; they may want to stop propagation beneath us
			i = 0;
			while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
				event.currentTarget = matched.elem;

				j = 0;
				while ( ( handleObj = matched.handlers[ j++ ] ) &&
					!event.isImmediatePropagationStopped() ) {

					// Triggered event must either 1) have no namespace, or 2) have namespace(s)
					// a subset or equal to those in the bound event (both can have no namespace).
					if ( !event.rnamespace || event.rnamespace.test( handleObj.namespace ) ) {

						event.handleObj = handleObj;
						event.data = handleObj.data;

						ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
							handleObj.handler ).apply( matched.elem, args );

						if ( ret !== undefined ) {
							if ( ( event.result = ret ) === false ) {
								event.preventDefault();
								event.stopPropagation();
							}
						}
					}
				}
			}

			// Call the postDispatch hook for the mapped type
			if ( special.postDispatch ) {
				special.postDispatch.call( this, event );
			}

			return event.result;
		},

		handlers: function( event, handlers ) {
			var i, matches, sel, handleObj,
				handlerQueue = [],
				delegateCount = handlers.delegateCount,
				cur = event.target;

			// Support (at least): Chrome, IE9
			// Find delegate handlers
			// Black-hole SVG <use> instance trees (#13180)
			//
			// Support: Firefox<=42+
			// Avoid non-left-click in FF but don't block IE radio events (#3861, gh-2343)
			if ( delegateCount && cur.nodeType &&
				( event.type !== "click" || isNaN( event.button ) || event.button < 1 ) ) {

				for ( ; cur !== this; cur = cur.parentNode || this ) {

					// Don't check non-elements (#13208)
					// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
					if ( cur.nodeType === 1 && ( cur.disabled !== true || event.type !== "click" ) ) {
						matches = [];
						for ( i = 0; i < delegateCount; i++ ) {
							handleObj = handlers[ i ];

							// Don't conflict with Object.prototype properties (#13203)
							sel = handleObj.selector + " ";

							if ( matches[ sel ] === undefined ) {
								matches[ sel ] = handleObj.needsContext ?
									jQuery( sel, this ).index( cur ) > -1 :
									jQuery.find( sel, this, null, [ cur ] ).length;
							}
							if ( matches[ sel ] ) {
								matches.push( handleObj );
							}
						}
						if ( matches.length ) {
							handlerQueue.push( { elem: cur, handlers: matches } );
						}
					}
				}
			}

			// Add the remaining (directly-bound) handlers
			if ( delegateCount < handlers.length ) {
				handlerQueue.push( { elem: this, handlers: handlers.slice( delegateCount ) } );
			}

			return handlerQueue;
		},

		// Includes some event props shared by KeyEvent and MouseEvent
		props: ( "altKey bubbles cancelable ctrlKey currentTarget detail eventPhase " +
			"metaKey relatedTarget shiftKey target timeStamp view which" ).split( " " ),

		fixHooks: {},

		keyHooks: {
			props: "char charCode key keyCode".split( " " ),
			filter: function( event, original ) {

				// Add which for key events
				if ( event.which == null ) {
					event.which = original.charCode != null ? original.charCode : original.keyCode;
				}

				return event;
			}
		},

		mouseHooks: {
			props: ( "button buttons clientX clientY offsetX offsetY pageX pageY " +
				"screenX screenY toElement" ).split( " " ),
			filter: function( event, original ) {
				var eventDoc, doc, body,
					button = original.button;

				// Calculate pageX/Y if missing and clientX/Y available
				if ( event.pageX == null && original.clientX != null ) {
					eventDoc = event.target.ownerDocument || document;
					doc = eventDoc.documentElement;
					body = eventDoc.body;

					event.pageX = original.clientX +
						( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) -
						( doc && doc.clientLeft || body && body.clientLeft || 0 );
					event.pageY = original.clientY +
						( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) -
						( doc && doc.clientTop  || body && body.clientTop  || 0 );
				}

				// Add which for click: 1 === left; 2 === middle; 3 === right
				// Note: button is not normalized, so don't use it
				if ( !event.which && button !== undefined ) {
					event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
				}

				return event;
			}
		},

		fix: function( event ) {
			if ( event[ jQuery.expando ] ) {
				return event;
			}

			// Create a writable copy of the event object and normalize some properties
			var i, prop, copy,
				type = event.type,
				originalEvent = event,
				fixHook = this.fixHooks[ type ];

			if ( !fixHook ) {
				this.fixHooks[ type ] = fixHook =
					rmouseEvent.test( type ) ? this.mouseHooks :
					rkeyEvent.test( type ) ? this.keyHooks :
					{};
			}
			copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

			event = new jQuery.Event( originalEvent );

			i = copy.length;
			while ( i-- ) {
				prop = copy[ i ];
				event[ prop ] = originalEvent[ prop ];
			}

			// Support: Cordova 2.5 (WebKit) (#13255)
			// All events should have a target; Cordova deviceready doesn't
			if ( !event.target ) {
				event.target = document;
			}

			// Support: Safari 6.0+, Chrome<28
			// Target should not be a text node (#504, #13143)
			if ( event.target.nodeType === 3 ) {
				event.target = event.target.parentNode;
			}

			return fixHook.filter ? fixHook.filter( event, originalEvent ) : event;
		},

		special: {
			load: {

				// Prevent triggered image.load events from bubbling to window.load
				noBubble: true
			},
			focus: {

				// Fire native event if possible so blur/focus sequence is correct
				trigger: function() {
					if ( this !== safeActiveElement() && this.focus ) {
						this.focus();
						return false;
					}
				},
				delegateType: "focusin"
			},
			blur: {
				trigger: function() {
					if ( this === safeActiveElement() && this.blur ) {
						this.blur();
						return false;
					}
				},
				delegateType: "focusout"
			},
			click: {

				// For checkbox, fire native event so checked state will be right
				trigger: function() {
					if ( this.type === "checkbox" && this.click && jQuery.nodeName( this, "input" ) ) {
						this.click();
						return false;
					}
				},

				// For cross-browser consistency, don't fire native .click() on links
				_default: function( event ) {
					return jQuery.nodeName( event.target, "a" );
				}
			},

			beforeunload: {
				postDispatch: function( event ) {

					// Support: Firefox 20+
					// Firefox doesn't alert if the returnValue field is not set.
					if ( event.result !== undefined && event.originalEvent ) {
						event.originalEvent.returnValue = event.result;
					}
				}
			}
		}
	};

	jQuery.removeEvent = function( elem, type, handle ) {

		// This "if" is needed for plain objects
		if ( elem.removeEventListener ) {
			elem.removeEventListener( type, handle );
		}
	};

	jQuery.Event = function( src, props ) {

		// Allow instantiation without the 'new' keyword
		if ( !( this instanceof jQuery.Event ) ) {
			return new jQuery.Event( src, props );
		}

		// Event object
		if ( src && src.type ) {
			this.originalEvent = src;
			this.type = src.type;

			// Events bubbling up the document may have been marked as prevented
			// by a handler lower down the tree; reflect the correct value.
			this.isDefaultPrevented = src.defaultPrevented ||
					src.defaultPrevented === undefined &&

					// Support: Android<4.0
					src.returnValue === false ?
				returnTrue :
				returnFalse;

		// Event type
		} else {
			this.type = src;
		}

		// Put explicitly provided properties onto the event object
		if ( props ) {
			jQuery.extend( this, props );
		}

		// Create a timestamp if incoming event doesn't have one
		this.timeStamp = src && src.timeStamp || jQuery.now();

		// Mark it as fixed
		this[ jQuery.expando ] = true;
	};

	// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
	// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
	jQuery.Event.prototype = {
		constructor: jQuery.Event,
		isDefaultPrevented: returnFalse,
		isPropagationStopped: returnFalse,
		isImmediatePropagationStopped: returnFalse,

		preventDefault: function() {
			var e = this.originalEvent;

			this.isDefaultPrevented = returnTrue;

			if ( e ) {
				e.preventDefault();
			}
		},
		stopPropagation: function() {
			var e = this.originalEvent;

			this.isPropagationStopped = returnTrue;

			if ( e ) {
				e.stopPropagation();
			}
		},
		stopImmediatePropagation: function() {
			var e = this.originalEvent;

			this.isImmediatePropagationStopped = returnTrue;

			if ( e ) {
				e.stopImmediatePropagation();
			}

			this.stopPropagation();
		}
	};

	// Create mouseenter/leave events using mouseover/out and event-time checks
	// so that event delegation works in jQuery.
	// Do the same for pointerenter/pointerleave and pointerover/pointerout
	//
	// Support: Safari 7 only
	// Safari sends mouseenter too often; see:
	// https://code.google.com/p/chromium/issues/detail?id=470258
	// for the description of the bug (it existed in older Chrome versions as well).
	jQuery.each( {
		mouseenter: "mouseover",
		mouseleave: "mouseout",
		pointerenter: "pointerover",
		pointerleave: "pointerout"
	}, function( orig, fix ) {
		jQuery.event.special[ orig ] = {
			delegateType: fix,
			bindType: fix,

			handle: function( event ) {
				var ret,
					target = this,
					related = event.relatedTarget,
					handleObj = event.handleObj;

				// For mouseenter/leave call the handler if related is outside the target.
				// NB: No relatedTarget if the mouse left/entered the browser window
				if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
					event.type = handleObj.origType;
					ret = handleObj.handler.apply( this, arguments );
					event.type = fix;
				}
				return ret;
			}
		};
	} );

	jQuery.fn.extend( {
		on: function( types, selector, data, fn ) {
			return on( this, types, selector, data, fn );
		},
		one: function( types, selector, data, fn ) {
			return on( this, types, selector, data, fn, 1 );
		},
		off: function( types, selector, fn ) {
			var handleObj, type;
			if ( types && types.preventDefault && types.handleObj ) {

				// ( event )  dispatched jQuery.Event
				handleObj = types.handleObj;
				jQuery( types.delegateTarget ).off(
					handleObj.namespace ?
						handleObj.origType + "." + handleObj.namespace :
						handleObj.origType,
					handleObj.selector,
					handleObj.handler
				);
				return this;
			}
			if ( typeof types === "object" ) {

				// ( types-object [, selector] )
				for ( type in types ) {
					this.off( type, selector, types[ type ] );
				}
				return this;
			}
			if ( selector === false || typeof selector === "function" ) {

				// ( types [, fn] )
				fn = selector;
				selector = undefined;
			}
			if ( fn === false ) {
				fn = returnFalse;
			}
			return this.each( function() {
				jQuery.event.remove( this, types, fn, selector );
			} );
		}
	} );


	var
		rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:-]+)[^>]*)\/>/gi,

		// Support: IE 10-11, Edge 10240+
		// In IE/Edge using regex groups here causes severe slowdowns.
		// See https://connect.microsoft.com/IE/feedback/details/1736512/
		rnoInnerhtml = /<script|<style|<link/i,

		// checked="checked" or checked
		rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
		rscriptTypeMasked = /^true\/(.*)/,
		rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

	// Manipulating tables requires a tbody
	function manipulationTarget( elem, content ) {
		return jQuery.nodeName( elem, "table" ) &&
			jQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ?

			elem.getElementsByTagName( "tbody" )[ 0 ] ||
				elem.appendChild( elem.ownerDocument.createElement( "tbody" ) ) :
			elem;
	}

	// Replace/restore the type attribute of script elements for safe DOM manipulation
	function disableScript( elem ) {
		elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
		return elem;
	}
	function restoreScript( elem ) {
		var match = rscriptTypeMasked.exec( elem.type );

		if ( match ) {
			elem.type = match[ 1 ];
		} else {
			elem.removeAttribute( "type" );
		}

		return elem;
	}

	function cloneCopyEvent( src, dest ) {
		var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

		if ( dest.nodeType !== 1 ) {
			return;
		}

		// 1. Copy private data: events, handlers, etc.
		if ( dataPriv.hasData( src ) ) {
			pdataOld = dataPriv.access( src );
			pdataCur = dataPriv.set( dest, pdataOld );
			events = pdataOld.events;

			if ( events ) {
				delete pdataCur.handle;
				pdataCur.events = {};

				for ( type in events ) {
					for ( i = 0, l = events[ type ].length; i < l; i++ ) {
						jQuery.event.add( dest, type, events[ type ][ i ] );
					}
				}
			}
		}

		// 2. Copy user data
		if ( dataUser.hasData( src ) ) {
			udataOld = dataUser.access( src );
			udataCur = jQuery.extend( {}, udataOld );

			dataUser.set( dest, udataCur );
		}
	}

	// Fix IE bugs, see support tests
	function fixInput( src, dest ) {
		var nodeName = dest.nodeName.toLowerCase();

		// Fails to persist the checked state of a cloned checkbox or radio button.
		if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
			dest.checked = src.checked;

		// Fails to return the selected option to the default selected state when cloning options
		} else if ( nodeName === "input" || nodeName === "textarea" ) {
			dest.defaultValue = src.defaultValue;
		}
	}

	function domManip( collection, args, callback, ignored ) {

		// Flatten any nested arrays
		args = concat.apply( [], args );

		var fragment, first, scripts, hasScripts, node, doc,
			i = 0,
			l = collection.length,
			iNoClone = l - 1,
			value = args[ 0 ],
			isFunction = jQuery.isFunction( value );

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( isFunction ||
				( l > 1 && typeof value === "string" &&
					!support.checkClone && rchecked.test( value ) ) ) {
			return collection.each( function( index ) {
				var self = collection.eq( index );
				if ( isFunction ) {
					args[ 0 ] = value.call( this, index, self.html() );
				}
				domManip( self, args, callback, ignored );
			} );
		}

		if ( l ) {
			fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
			first = fragment.firstChild;

			if ( fragment.childNodes.length === 1 ) {
				fragment = first;
			}

			// Require either new content or an interest in ignored elements to invoke the callback
			if ( first || ignored ) {
				scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
				hasScripts = scripts.length;

				// Use the original fragment for the last item
				// instead of the first because it can end up
				// being emptied incorrectly in certain situations (#8070).
				for ( ; i < l; i++ ) {
					node = fragment;

					if ( i !== iNoClone ) {
						node = jQuery.clone( node, true, true );

						// Keep references to cloned scripts for later restoration
						if ( hasScripts ) {

							// Support: Android<4.1, PhantomJS<2
							// push.apply(_, arraylike) throws on ancient WebKit
							jQuery.merge( scripts, getAll( node, "script" ) );
						}
					}

					callback.call( collection[ i ], node, i );
				}

				if ( hasScripts ) {
					doc = scripts[ scripts.length - 1 ].ownerDocument;

					// Reenable scripts
					jQuery.map( scripts, restoreScript );

					// Evaluate executable scripts on first document insertion
					for ( i = 0; i < hasScripts; i++ ) {
						node = scripts[ i ];
						if ( rscriptType.test( node.type || "" ) &&
							!dataPriv.access( node, "globalEval" ) &&
							jQuery.contains( doc, node ) ) {

							if ( node.src ) {

								// Optional AJAX dependency, but won't run scripts if not present
								if ( jQuery._evalUrl ) {
									jQuery._evalUrl( node.src );
								}
							} else {
								jQuery.globalEval( node.textContent.replace( rcleanScript, "" ) );
							}
						}
					}
				}
			}
		}

		return collection;
	}

	function remove( elem, selector, keepData ) {
		var node,
			nodes = selector ? jQuery.filter( selector, elem ) : elem,
			i = 0;

		for ( ; ( node = nodes[ i ] ) != null; i++ ) {
			if ( !keepData && node.nodeType === 1 ) {
				jQuery.cleanData( getAll( node ) );
			}

			if ( node.parentNode ) {
				if ( keepData && jQuery.contains( node.ownerDocument, node ) ) {
					setGlobalEval( getAll( node, "script" ) );
				}
				node.parentNode.removeChild( node );
			}
		}

		return elem;
	}

	jQuery.extend( {
		htmlPrefilter: function( html ) {
			return html.replace( rxhtmlTag, "<$1></$2>" );
		},

		clone: function( elem, dataAndEvents, deepDataAndEvents ) {
			var i, l, srcElements, destElements,
				clone = elem.cloneNode( true ),
				inPage = jQuery.contains( elem.ownerDocument, elem );

			// Fix IE cloning issues
			if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
					!jQuery.isXMLDoc( elem ) ) {

				// We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2
				destElements = getAll( clone );
				srcElements = getAll( elem );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					fixInput( srcElements[ i ], destElements[ i ] );
				}
			}

			// Copy the events from the original to the clone
			if ( dataAndEvents ) {
				if ( deepDataAndEvents ) {
					srcElements = srcElements || getAll( elem );
					destElements = destElements || getAll( clone );

					for ( i = 0, l = srcElements.length; i < l; i++ ) {
						cloneCopyEvent( srcElements[ i ], destElements[ i ] );
					}
				} else {
					cloneCopyEvent( elem, clone );
				}
			}

			// Preserve script evaluation history
			destElements = getAll( clone, "script" );
			if ( destElements.length > 0 ) {
				setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
			}

			// Return the cloned set
			return clone;
		},

		cleanData: function( elems ) {
			var data, elem, type,
				special = jQuery.event.special,
				i = 0;

			for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
				if ( acceptData( elem ) ) {
					if ( ( data = elem[ dataPriv.expando ] ) ) {
						if ( data.events ) {
							for ( type in data.events ) {
								if ( special[ type ] ) {
									jQuery.event.remove( elem, type );

								// This is a shortcut to avoid jQuery.event.remove's overhead
								} else {
									jQuery.removeEvent( elem, type, data.handle );
								}
							}
						}

						// Support: Chrome <= 35-45+
						// Assign undefined instead of using delete, see Data#remove
						elem[ dataPriv.expando ] = undefined;
					}
					if ( elem[ dataUser.expando ] ) {

						// Support: Chrome <= 35-45+
						// Assign undefined instead of using delete, see Data#remove
						elem[ dataUser.expando ] = undefined;
					}
				}
			}
		}
	} );

	jQuery.fn.extend( {

		// Keep domManip exposed until 3.0 (gh-2225)
		domManip: domManip,

		detach: function( selector ) {
			return remove( this, selector, true );
		},

		remove: function( selector ) {
			return remove( this, selector );
		},

		text: function( value ) {
			return access( this, function( value ) {
				return value === undefined ?
					jQuery.text( this ) :
					this.empty().each( function() {
						if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
							this.textContent = value;
						}
					} );
			}, null, value, arguments.length );
		},

		append: function() {
			return domManip( this, arguments, function( elem ) {
				if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
					var target = manipulationTarget( this, elem );
					target.appendChild( elem );
				}
			} );
		},

		prepend: function() {
			return domManip( this, arguments, function( elem ) {
				if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
					var target = manipulationTarget( this, elem );
					target.insertBefore( elem, target.firstChild );
				}
			} );
		},

		before: function() {
			return domManip( this, arguments, function( elem ) {
				if ( this.parentNode ) {
					this.parentNode.insertBefore( elem, this );
				}
			} );
		},

		after: function() {
			return domManip( this, arguments, function( elem ) {
				if ( this.parentNode ) {
					this.parentNode.insertBefore( elem, this.nextSibling );
				}
			} );
		},

		empty: function() {
			var elem,
				i = 0;

			for ( ; ( elem = this[ i ] ) != null; i++ ) {
				if ( elem.nodeType === 1 ) {

					// Prevent memory leaks
					jQuery.cleanData( getAll( elem, false ) );

					// Remove any remaining nodes
					elem.textContent = "";
				}
			}

			return this;
		},

		clone: function( dataAndEvents, deepDataAndEvents ) {
			dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
			deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

			return this.map( function() {
				return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
			} );
		},

		html: function( value ) {
			return access( this, function( value ) {
				var elem = this[ 0 ] || {},
					i = 0,
					l = this.length;

				if ( value === undefined && elem.nodeType === 1 ) {
					return elem.innerHTML;
				}

				// See if we can take a shortcut and just use innerHTML
				if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
					!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

					value = jQuery.htmlPrefilter( value );

					try {
						for ( ; i < l; i++ ) {
							elem = this[ i ] || {};

							// Remove element nodes and prevent memory leaks
							if ( elem.nodeType === 1 ) {
								jQuery.cleanData( getAll( elem, false ) );
								elem.innerHTML = value;
							}
						}

						elem = 0;

					// If using innerHTML throws an exception, use the fallback method
					} catch ( e ) {}
				}

				if ( elem ) {
					this.empty().append( value );
				}
			}, null, value, arguments.length );
		},

		replaceWith: function() {
			var ignored = [];

			// Make the changes, replacing each non-ignored context element with the new content
			return domManip( this, arguments, function( elem ) {
				var parent = this.parentNode;

				if ( jQuery.inArray( this, ignored ) < 0 ) {
					jQuery.cleanData( getAll( this ) );
					if ( parent ) {
						parent.replaceChild( elem, this );
					}
				}

			// Force callback invocation
			}, ignored );
		}
	} );

	jQuery.each( {
		appendTo: "append",
		prependTo: "prepend",
		insertBefore: "before",
		insertAfter: "after",
		replaceAll: "replaceWith"
	}, function( name, original ) {
		jQuery.fn[ name ] = function( selector ) {
			var elems,
				ret = [],
				insert = jQuery( selector ),
				last = insert.length - 1,
				i = 0;

			for ( ; i <= last; i++ ) {
				elems = i === last ? this : this.clone( true );
				jQuery( insert[ i ] )[ original ]( elems );

				// Support: QtWebKit
				// .get() because push.apply(_, arraylike) throws
				push.apply( ret, elems.get() );
			}

			return this.pushStack( ret );
		};
	} );


	var iframe,
		elemdisplay = {

			// Support: Firefox
			// We have to pre-define these values for FF (#10227)
			HTML: "block",
			BODY: "block"
		};

	/**
	 * Retrieve the actual display of a element
	 * @param {String} name nodeName of the element
	 * @param {Object} doc Document object
	 */

	// Called only from within defaultDisplay
	function actualDisplay( name, doc ) {
		var elem = jQuery( doc.createElement( name ) ).appendTo( doc.body ),

			display = jQuery.css( elem[ 0 ], "display" );

		// We don't have any data stored on the element,
		// so use "detach" method as fast way to get rid of the element
		elem.detach();

		return display;
	}

	/**
	 * Try to determine the default display value of an element
	 * @param {String} nodeName
	 */
	function defaultDisplay( nodeName ) {
		var doc = document,
			display = elemdisplay[ nodeName ];

		if ( !display ) {
			display = actualDisplay( nodeName, doc );

			// If the simple way fails, read from inside an iframe
			if ( display === "none" || !display ) {

				// Use the already-created iframe if possible
				iframe = ( iframe || jQuery( "<iframe frameborder='0' width='0' height='0'/>" ) )
					.appendTo( doc.documentElement );

				// Always write a new HTML skeleton so Webkit and Firefox don't choke on reuse
				doc = iframe[ 0 ].contentDocument;

				// Support: IE
				doc.write();
				doc.close();

				display = actualDisplay( nodeName, doc );
				iframe.detach();
			}

			// Store the correct default display
			elemdisplay[ nodeName ] = display;
		}

		return display;
	}
	var rmargin = ( /^margin/ );

	var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

	var getStyles = function( elem ) {

			// Support: IE<=11+, Firefox<=30+ (#15098, #14150)
			// IE throws on elements created in popups
			// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
			var view = elem.ownerDocument.defaultView;

			if ( !view || !view.opener ) {
				view = window;
			}

			return view.getComputedStyle( elem );
		};

	var swap = function( elem, options, callback, args ) {
		var ret, name,
			old = {};

		// Remember the old values, and insert the new ones
		for ( name in options ) {
			old[ name ] = elem.style[ name ];
			elem.style[ name ] = options[ name ];
		}

		ret = callback.apply( elem, args || [] );

		// Revert the old values
		for ( name in options ) {
			elem.style[ name ] = old[ name ];
		}

		return ret;
	};


	var documentElement = document.documentElement;



	( function() {
		var pixelPositionVal, boxSizingReliableVal, pixelMarginRightVal, reliableMarginLeftVal,
			container = document.createElement( "div" ),
			div = document.createElement( "div" );

		// Finish early in limited (non-browser) environments
		if ( !div.style ) {
			return;
		}

		// Support: IE9-11+
		// Style of cloned element affects source element cloned (#8908)
		div.style.backgroundClip = "content-box";
		div.cloneNode( true ).style.backgroundClip = "";
		support.clearCloneStyle = div.style.backgroundClip === "content-box";

		container.style.cssText = "border:0;width:8px;height:0;top:0;left:-9999px;" +
			"padding:0;margin-top:1px;position:absolute";
		container.appendChild( div );

		// Executing both pixelPosition & boxSizingReliable tests require only one layout
		// so they're executed at the same time to save the second computation.
		function computeStyleTests() {
			div.style.cssText =

				// Support: Firefox<29, Android 2.3
				// Vendor-prefix box-sizing
				"-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;" +
				"position:relative;display:block;" +
				"margin:auto;border:1px;padding:1px;" +
				"top:1%;width:50%";
			div.innerHTML = "";
			documentElement.appendChild( container );

			var divStyle = window.getComputedStyle( div );
			pixelPositionVal = divStyle.top !== "1%";
			reliableMarginLeftVal = divStyle.marginLeft === "2px";
			boxSizingReliableVal = divStyle.width === "4px";

			// Support: Android 4.0 - 4.3 only
			// Some styles come back with percentage values, even though they shouldn't
			div.style.marginRight = "50%";
			pixelMarginRightVal = divStyle.marginRight === "4px";

			documentElement.removeChild( container );
		}

		jQuery.extend( support, {
			pixelPosition: function() {

				// This test is executed only once but we still do memoizing
				// since we can use the boxSizingReliable pre-computing.
				// No need to check if the test was already performed, though.
				computeStyleTests();
				return pixelPositionVal;
			},
			boxSizingReliable: function() {
				if ( boxSizingReliableVal == null ) {
					computeStyleTests();
				}
				return boxSizingReliableVal;
			},
			pixelMarginRight: function() {

				// Support: Android 4.0-4.3
				// We're checking for boxSizingReliableVal here instead of pixelMarginRightVal
				// since that compresses better and they're computed together anyway.
				if ( boxSizingReliableVal == null ) {
					computeStyleTests();
				}
				return pixelMarginRightVal;
			},
			reliableMarginLeft: function() {

				// Support: IE <=8 only, Android 4.0 - 4.3 only, Firefox <=3 - 37
				if ( boxSizingReliableVal == null ) {
					computeStyleTests();
				}
				return reliableMarginLeftVal;
			},
			reliableMarginRight: function() {

				// Support: Android 2.3
				// Check if div with explicit width and no margin-right incorrectly
				// gets computed margin-right based on width of container. (#3333)
				// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
				// This support function is only executed once so no memoizing is needed.
				var ret,
					marginDiv = div.appendChild( document.createElement( "div" ) );

				// Reset CSS: box-sizing; display; margin; border; padding
				marginDiv.style.cssText = div.style.cssText =

					// Support: Android 2.3
					// Vendor-prefix box-sizing
					"-webkit-box-sizing:content-box;box-sizing:content-box;" +
					"display:block;margin:0;border:0;padding:0";
				marginDiv.style.marginRight = marginDiv.style.width = "0";
				div.style.width = "1px";
				documentElement.appendChild( container );

				ret = !parseFloat( window.getComputedStyle( marginDiv ).marginRight );

				documentElement.removeChild( container );
				div.removeChild( marginDiv );

				return ret;
			}
		} );
	} )();


	function curCSS( elem, name, computed ) {
		var width, minWidth, maxWidth, ret,
			style = elem.style;

		computed = computed || getStyles( elem );
		ret = computed ? computed.getPropertyValue( name ) || computed[ name ] : undefined;

		// Support: Opera 12.1x only
		// Fall back to style even without computed
		// computed is undefined for elems on document fragments
		if ( ( ret === "" || ret === undefined ) && !jQuery.contains( elem.ownerDocument, elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// Support: IE9
		// getPropertyValue is only needed for .css('filter') (#12537)
		if ( computed ) {

			// A tribute to the "awesome hack by Dean Edwards"
			// Android Browser returns percentage for some values,
			// but width seems to be reliably pixels.
			// This is against the CSSOM draft spec:
			// http://dev.w3.org/csswg/cssom/#resolved-values
			if ( !support.pixelMarginRight() && rnumnonpx.test( ret ) && rmargin.test( name ) ) {

				// Remember the original values
				width = style.width;
				minWidth = style.minWidth;
				maxWidth = style.maxWidth;

				// Put in the new values to get a computed value out
				style.minWidth = style.maxWidth = style.width = ret;
				ret = computed.width;

				// Revert the changed values
				style.width = width;
				style.minWidth = minWidth;
				style.maxWidth = maxWidth;
			}
		}

		return ret !== undefined ?

			// Support: IE9-11+
			// IE returns zIndex value as an integer.
			ret + "" :
			ret;
	}


	function addGetHookIf( conditionFn, hookFn ) {

		// Define the hook, we'll check on the first run if it's really needed.
		return {
			get: function() {
				if ( conditionFn() ) {

					// Hook not needed (or it's not possible to use it due
					// to missing dependency), remove it.
					delete this.get;
					return;
				}

				// Hook needed; redefine it so that the support test is not executed again.
				return ( this.get = hookFn ).apply( this, arguments );
			}
		};
	}


	var

		// Swappable if display is none or starts with table
		// except "table", "table-cell", or "table-caption"
		// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
		rdisplayswap = /^(none|table(?!-c[ea]).+)/,

		cssShow = { position: "absolute", visibility: "hidden", display: "block" },
		cssNormalTransform = {
			letterSpacing: "0",
			fontWeight: "400"
		},

		cssPrefixes = [ "Webkit", "O", "Moz", "ms" ],
		emptyStyle = document.createElement( "div" ).style;

	// Return a css property mapped to a potentially vendor prefixed property
	function vendorPropName( name ) {

		// Shortcut for names that are not vendor prefixed
		if ( name in emptyStyle ) {
			return name;
		}

		// Check for vendor prefixed names
		var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
			i = cssPrefixes.length;

		while ( i-- ) {
			name = cssPrefixes[ i ] + capName;
			if ( name in emptyStyle ) {
				return name;
			}
		}
	}

	function setPositiveNumber( elem, value, subtract ) {

		// Any relative (+/-) values have already been
		// normalized at this point
		var matches = rcssNum.exec( value );
		return matches ?

			// Guard against undefined "subtract", e.g., when used as in cssHooks
			Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
			value;
	}

	function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
		var i = extra === ( isBorderBox ? "border" : "content" ) ?

			// If we already have the right measurement, avoid augmentation
			4 :

			// Otherwise initialize for horizontal or vertical properties
			name === "width" ? 1 : 0,

			val = 0;

		for ( ; i < 4; i += 2 ) {

			// Both box models exclude margin, so add it if we want it
			if ( extra === "margin" ) {
				val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
			}

			if ( isBorderBox ) {

				// border-box includes padding, so remove it if we want content
				if ( extra === "content" ) {
					val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
				}

				// At this point, extra isn't border nor margin, so remove border
				if ( extra !== "margin" ) {
					val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
				}
			} else {

				// At this point, extra isn't content, so add padding
				val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

				// At this point, extra isn't content nor padding, so add border
				if ( extra !== "padding" ) {
					val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
				}
			}
		}

		return val;
	}

	function getWidthOrHeight( elem, name, extra ) {

		// Start with offset property, which is equivalent to the border-box value
		var valueIsBorderBox = true,
			val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
			styles = getStyles( elem ),
			isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

		// Support: IE11 only
		// In IE 11 fullscreen elements inside of an iframe have
		// 100x too small dimensions (gh-1764).
		if ( document.msFullscreenElement && window.top !== window ) {

			// Support: IE11 only
			// Running getBoundingClientRect on a disconnected node
			// in IE throws an error.
			if ( elem.getClientRects().length ) {
				val = Math.round( elem.getBoundingClientRect()[ name ] * 100 );
			}
		}

		// Some non-html elements return undefined for offsetWidth, so check for null/undefined
		// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
		// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
		if ( val <= 0 || val == null ) {

			// Fall back to computed then uncomputed css if necessary
			val = curCSS( elem, name, styles );
			if ( val < 0 || val == null ) {
				val = elem.style[ name ];
			}

			// Computed unit is not pixels. Stop here and return.
			if ( rnumnonpx.test( val ) ) {
				return val;
			}

			// Check for style in case a browser which returns unreliable values
			// for getComputedStyle silently falls back to the reliable elem.style
			valueIsBorderBox = isBorderBox &&
				( support.boxSizingReliable() || val === elem.style[ name ] );

			// Normalize "", auto, and prepare for extra
			val = parseFloat( val ) || 0;
		}

		// Use the active box-sizing model to add/subtract irrelevant styles
		return ( val +
			augmentWidthOrHeight(
				elem,
				name,
				extra || ( isBorderBox ? "border" : "content" ),
				valueIsBorderBox,
				styles
			)
		) + "px";
	}

	function showHide( elements, show ) {
		var display, elem, hidden,
			values = [],
			index = 0,
			length = elements.length;

		for ( ; index < length; index++ ) {
			elem = elements[ index ];
			if ( !elem.style ) {
				continue;
			}

			values[ index ] = dataPriv.get( elem, "olddisplay" );
			display = elem.style.display;
			if ( show ) {

				// Reset the inline display of this element to learn if it is
				// being hidden by cascaded rules or not
				if ( !values[ index ] && display === "none" ) {
					elem.style.display = "";
				}

				// Set elements which have been overridden with display: none
				// in a stylesheet to whatever the default browser style is
				// for such an element
				if ( elem.style.display === "" && isHidden( elem ) ) {
					values[ index ] = dataPriv.access(
						elem,
						"olddisplay",
						defaultDisplay( elem.nodeName )
					);
				}
			} else {
				hidden = isHidden( elem );

				if ( display !== "none" || !hidden ) {
					dataPriv.set(
						elem,
						"olddisplay",
						hidden ? display : jQuery.css( elem, "display" )
					);
				}
			}
		}

		// Set the display of most of the elements in a second loop
		// to avoid the constant reflow
		for ( index = 0; index < length; index++ ) {
			elem = elements[ index ];
			if ( !elem.style ) {
				continue;
			}
			if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
				elem.style.display = show ? values[ index ] || "" : "none";
			}
		}

		return elements;
	}

	jQuery.extend( {

		// Add in style property hooks for overriding the default
		// behavior of getting and setting a style property
		cssHooks: {
			opacity: {
				get: function( elem, computed ) {
					if ( computed ) {

						// We should always get a number back from opacity
						var ret = curCSS( elem, "opacity" );
						return ret === "" ? "1" : ret;
					}
				}
			}
		},

		// Don't automatically add "px" to these possibly-unitless properties
		cssNumber: {
			"animationIterationCount": true,
			"columnCount": true,
			"fillOpacity": true,
			"flexGrow": true,
			"flexShrink": true,
			"fontWeight": true,
			"lineHeight": true,
			"opacity": true,
			"order": true,
			"orphans": true,
			"widows": true,
			"zIndex": true,
			"zoom": true
		},

		// Add in properties whose names you wish to fix before
		// setting or getting the value
		cssProps: {
			"float": "cssFloat"
		},

		// Get and set the style property on a DOM Node
		style: function( elem, name, value, extra ) {

			// Don't set styles on text and comment nodes
			if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
				return;
			}

			// Make sure that we're working with the right name
			var ret, type, hooks,
				origName = jQuery.camelCase( name ),
				style = elem.style;

			name = jQuery.cssProps[ origName ] ||
				( jQuery.cssProps[ origName ] = vendorPropName( origName ) || origName );

			// Gets hook for the prefixed version, then unprefixed version
			hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

			// Check if we're setting a value
			if ( value !== undefined ) {
				type = typeof value;

				// Convert "+=" or "-=" to relative numbers (#7345)
				if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
					value = adjustCSS( elem, name, ret );

					// Fixes bug #9237
					type = "number";
				}

				// Make sure that null and NaN values aren't set (#7116)
				if ( value == null || value !== value ) {
					return;
				}

				// If a number was passed in, add the unit (except for certain CSS properties)
				if ( type === "number" ) {
					value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
				}

				// Support: IE9-11+
				// background-* props affect original clone's values
				if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
					style[ name ] = "inherit";
				}

				// If a hook was provided, use that value, otherwise just set the specified value
				if ( !hooks || !( "set" in hooks ) ||
					( value = hooks.set( elem, value, extra ) ) !== undefined ) {

					style[ name ] = value;
				}

			} else {

				// If a hook was provided get the non-computed value from there
				if ( hooks && "get" in hooks &&
					( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

					return ret;
				}

				// Otherwise just get the value from the style object
				return style[ name ];
			}
		},

		css: function( elem, name, extra, styles ) {
			var val, num, hooks,
				origName = jQuery.camelCase( name );

			// Make sure that we're working with the right name
			name = jQuery.cssProps[ origName ] ||
				( jQuery.cssProps[ origName ] = vendorPropName( origName ) || origName );

			// Try prefixed name followed by the unprefixed name
			hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

			// If a hook was provided get the computed value from there
			if ( hooks && "get" in hooks ) {
				val = hooks.get( elem, true, extra );
			}

			// Otherwise, if a way to get the computed value exists, use that
			if ( val === undefined ) {
				val = curCSS( elem, name, styles );
			}

			// Convert "normal" to computed value
			if ( val === "normal" && name in cssNormalTransform ) {
				val = cssNormalTransform[ name ];
			}

			// Make numeric if forced or a qualifier was provided and val looks numeric
			if ( extra === "" || extra ) {
				num = parseFloat( val );
				return extra === true || isFinite( num ) ? num || 0 : val;
			}
			return val;
		}
	} );

	jQuery.each( [ "height", "width" ], function( i, name ) {
		jQuery.cssHooks[ name ] = {
			get: function( elem, computed, extra ) {
				if ( computed ) {

					// Certain elements can have dimension info if we invisibly show them
					// but it must have a current display style that would benefit
					return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&
						elem.offsetWidth === 0 ?
							swap( elem, cssShow, function() {
								return getWidthOrHeight( elem, name, extra );
							} ) :
							getWidthOrHeight( elem, name, extra );
				}
			},

			set: function( elem, value, extra ) {
				var matches,
					styles = extra && getStyles( elem ),
					subtract = extra && augmentWidthOrHeight(
						elem,
						name,
						extra,
						jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
						styles
					);

				// Convert to pixels if value adjustment is needed
				if ( subtract && ( matches = rcssNum.exec( value ) ) &&
					( matches[ 3 ] || "px" ) !== "px" ) {

					elem.style[ name ] = value;
					value = jQuery.css( elem, name );
				}

				return setPositiveNumber( elem, value, subtract );
			}
		};
	} );

	jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
		function( elem, computed ) {
			if ( computed ) {
				return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
					elem.getBoundingClientRect().left -
						swap( elem, { marginLeft: 0 }, function() {
							return elem.getBoundingClientRect().left;
						} )
					) + "px";
			}
		}
	);

	// Support: Android 2.3
	jQuery.cssHooks.marginRight = addGetHookIf( support.reliableMarginRight,
		function( elem, computed ) {
			if ( computed ) {
				return swap( elem, { "display": "inline-block" },
					curCSS, [ elem, "marginRight" ] );
			}
		}
	);

	// These hooks are used by animate to expand properties
	jQuery.each( {
		margin: "",
		padding: "",
		border: "Width"
	}, function( prefix, suffix ) {
		jQuery.cssHooks[ prefix + suffix ] = {
			expand: function( value ) {
				var i = 0,
					expanded = {},

					// Assumes a single number if not a string
					parts = typeof value === "string" ? value.split( " " ) : [ value ];

				for ( ; i < 4; i++ ) {
					expanded[ prefix + cssExpand[ i ] + suffix ] =
						parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
				}

				return expanded;
			}
		};

		if ( !rmargin.test( prefix ) ) {
			jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
		}
	} );

	jQuery.fn.extend( {
		css: function( name, value ) {
			return access( this, function( elem, name, value ) {
				var styles, len,
					map = {},
					i = 0;

				if ( jQuery.isArray( name ) ) {
					styles = getStyles( elem );
					len = name.length;

					for ( ; i < len; i++ ) {
						map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
					}

					return map;
				}

				return value !== undefined ?
					jQuery.style( elem, name, value ) :
					jQuery.css( elem, name );
			}, name, value, arguments.length > 1 );
		},
		show: function() {
			return showHide( this, true );
		},
		hide: function() {
			return showHide( this );
		},
		toggle: function( state ) {
			if ( typeof state === "boolean" ) {
				return state ? this.show() : this.hide();
			}

			return this.each( function() {
				if ( isHidden( this ) ) {
					jQuery( this ).show();
				} else {
					jQuery( this ).hide();
				}
			} );
		}
	} );


	function Tween( elem, options, prop, end, easing ) {
		return new Tween.prototype.init( elem, options, prop, end, easing );
	}
	jQuery.Tween = Tween;

	Tween.prototype = {
		constructor: Tween,
		init: function( elem, options, prop, end, easing, unit ) {
			this.elem = elem;
			this.prop = prop;
			this.easing = easing || jQuery.easing._default;
			this.options = options;
			this.start = this.now = this.cur();
			this.end = end;
			this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
		},
		cur: function() {
			var hooks = Tween.propHooks[ this.prop ];

			return hooks && hooks.get ?
				hooks.get( this ) :
				Tween.propHooks._default.get( this );
		},
		run: function( percent ) {
			var eased,
				hooks = Tween.propHooks[ this.prop ];

			if ( this.options.duration ) {
				this.pos = eased = jQuery.easing[ this.easing ](
					percent, this.options.duration * percent, 0, 1, this.options.duration
				);
			} else {
				this.pos = eased = percent;
			}
			this.now = ( this.end - this.start ) * eased + this.start;

			if ( this.options.step ) {
				this.options.step.call( this.elem, this.now, this );
			}

			if ( hooks && hooks.set ) {
				hooks.set( this );
			} else {
				Tween.propHooks._default.set( this );
			}
			return this;
		}
	};

	Tween.prototype.init.prototype = Tween.prototype;

	Tween.propHooks = {
		_default: {
			get: function( tween ) {
				var result;

				// Use a property on the element directly when it is not a DOM element,
				// or when there is no matching style property that exists.
				if ( tween.elem.nodeType !== 1 ||
					tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
					return tween.elem[ tween.prop ];
				}

				// Passing an empty string as a 3rd parameter to .css will automatically
				// attempt a parseFloat and fallback to a string if the parse fails.
				// Simple values such as "10px" are parsed to Float;
				// complex values such as "rotate(1rad)" are returned as-is.
				result = jQuery.css( tween.elem, tween.prop, "" );

				// Empty strings, null, undefined and "auto" are converted to 0.
				return !result || result === "auto" ? 0 : result;
			},
			set: function( tween ) {

				// Use step hook for back compat.
				// Use cssHook if its there.
				// Use .style if available and use plain properties where available.
				if ( jQuery.fx.step[ tween.prop ] ) {
					jQuery.fx.step[ tween.prop ]( tween );
				} else if ( tween.elem.nodeType === 1 &&
					( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null ||
						jQuery.cssHooks[ tween.prop ] ) ) {
					jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
				} else {
					tween.elem[ tween.prop ] = tween.now;
				}
			}
		}
	};

	// Support: IE9
	// Panic based approach to setting things on disconnected nodes
	Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
		set: function( tween ) {
			if ( tween.elem.nodeType && tween.elem.parentNode ) {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	};

	jQuery.easing = {
		linear: function( p ) {
			return p;
		},
		swing: function( p ) {
			return 0.5 - Math.cos( p * Math.PI ) / 2;
		},
		_default: "swing"
	};

	jQuery.fx = Tween.prototype.init;

	// Back Compat <1.8 extension point
	jQuery.fx.step = {};




	var
		fxNow, timerId,
		rfxtypes = /^(?:toggle|show|hide)$/,
		rrun = /queueHooks$/;

	// Animations created synchronously will run synchronously
	function createFxNow() {
		window.setTimeout( function() {
			fxNow = undefined;
		} );
		return ( fxNow = jQuery.now() );
	}

	// Generate parameters to create a standard animation
	function genFx( type, includeWidth ) {
		var which,
			i = 0,
			attrs = { height: type };

		// If we include width, step value is 1 to do all cssExpand values,
		// otherwise step value is 2 to skip over Left and Right
		includeWidth = includeWidth ? 1 : 0;
		for ( ; i < 4 ; i += 2 - includeWidth ) {
			which = cssExpand[ i ];
			attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
		}

		if ( includeWidth ) {
			attrs.opacity = attrs.width = type;
		}

		return attrs;
	}

	function createTween( value, prop, animation ) {
		var tween,
			collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
			index = 0,
			length = collection.length;
		for ( ; index < length; index++ ) {
			if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

				// We're done with this property
				return tween;
			}
		}
	}

	function defaultPrefilter( elem, props, opts ) {
		/* jshint validthis: true */
		var prop, value, toggle, tween, hooks, oldfire, display, checkDisplay,
			anim = this,
			orig = {},
			style = elem.style,
			hidden = elem.nodeType && isHidden( elem ),
			dataShow = dataPriv.get( elem, "fxshow" );

		// Handle queue: false promises
		if ( !opts.queue ) {
			hooks = jQuery._queueHooks( elem, "fx" );
			if ( hooks.unqueued == null ) {
				hooks.unqueued = 0;
				oldfire = hooks.empty.fire;
				hooks.empty.fire = function() {
					if ( !hooks.unqueued ) {
						oldfire();
					}
				};
			}
			hooks.unqueued++;

			anim.always( function() {

				// Ensure the complete handler is called before this completes
				anim.always( function() {
					hooks.unqueued--;
					if ( !jQuery.queue( elem, "fx" ).length ) {
						hooks.empty.fire();
					}
				} );
			} );
		}

		// Height/width overflow pass
		if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {

			// Make sure that nothing sneaks out
			// Record all 3 overflow attributes because IE9-10 do not
			// change the overflow attribute when overflowX and
			// overflowY are set to the same value
			opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

			// Set display property to inline-block for height/width
			// animations on inline elements that are having width/height animated
			display = jQuery.css( elem, "display" );

			// Test default display if display is currently "none"
			checkDisplay = display === "none" ?
				dataPriv.get( elem, "olddisplay" ) || defaultDisplay( elem.nodeName ) : display;

			if ( checkDisplay === "inline" && jQuery.css( elem, "float" ) === "none" ) {
				style.display = "inline-block";
			}
		}

		if ( opts.overflow ) {
			style.overflow = "hidden";
			anim.always( function() {
				style.overflow = opts.overflow[ 0 ];
				style.overflowX = opts.overflow[ 1 ];
				style.overflowY = opts.overflow[ 2 ];
			} );
		}

		// show/hide pass
		for ( prop in props ) {
			value = props[ prop ];
			if ( rfxtypes.exec( value ) ) {
				delete props[ prop ];
				toggle = toggle || value === "toggle";
				if ( value === ( hidden ? "hide" : "show" ) ) {

					// If there is dataShow left over from a stopped hide or show
					// and we are going to proceed with show, we should pretend to be hidden
					if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
						hidden = true;
					} else {
						continue;
					}
				}
				orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );

			// Any non-fx value stops us from restoring the original display value
			} else {
				display = undefined;
			}
		}

		if ( !jQuery.isEmptyObject( orig ) ) {
			if ( dataShow ) {
				if ( "hidden" in dataShow ) {
					hidden = dataShow.hidden;
				}
			} else {
				dataShow = dataPriv.access( elem, "fxshow", {} );
			}

			// Store state if its toggle - enables .stop().toggle() to "reverse"
			if ( toggle ) {
				dataShow.hidden = !hidden;
			}
			if ( hidden ) {
				jQuery( elem ).show();
			} else {
				anim.done( function() {
					jQuery( elem ).hide();
				} );
			}
			anim.done( function() {
				var prop;

				dataPriv.remove( elem, "fxshow" );
				for ( prop in orig ) {
					jQuery.style( elem, prop, orig[ prop ] );
				}
			} );
			for ( prop in orig ) {
				tween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );

				if ( !( prop in dataShow ) ) {
					dataShow[ prop ] = tween.start;
					if ( hidden ) {
						tween.end = tween.start;
						tween.start = prop === "width" || prop === "height" ? 1 : 0;
					}
				}
			}

		// If this is a noop like .hide().hide(), restore an overwritten display value
		} else if ( ( display === "none" ? defaultDisplay( elem.nodeName ) : display ) === "inline" ) {
			style.display = display;
		}
	}

	function propFilter( props, specialEasing ) {
		var index, name, easing, value, hooks;

		// camelCase, specialEasing and expand cssHook pass
		for ( index in props ) {
			name = jQuery.camelCase( index );
			easing = specialEasing[ name ];
			value = props[ index ];
			if ( jQuery.isArray( value ) ) {
				easing = value[ 1 ];
				value = props[ index ] = value[ 0 ];
			}

			if ( index !== name ) {
				props[ name ] = value;
				delete props[ index ];
			}

			hooks = jQuery.cssHooks[ name ];
			if ( hooks && "expand" in hooks ) {
				value = hooks.expand( value );
				delete props[ name ];

				// Not quite $.extend, this won't overwrite existing keys.
				// Reusing 'index' because we have the correct "name"
				for ( index in value ) {
					if ( !( index in props ) ) {
						props[ index ] = value[ index ];
						specialEasing[ index ] = easing;
					}
				}
			} else {
				specialEasing[ name ] = easing;
			}
		}
	}

	function Animation( elem, properties, options ) {
		var result,
			stopped,
			index = 0,
			length = Animation.prefilters.length,
			deferred = jQuery.Deferred().always( function() {

				// Don't match elem in the :animated selector
				delete tick.elem;
			} ),
			tick = function() {
				if ( stopped ) {
					return false;
				}
				var currentTime = fxNow || createFxNow(),
					remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

					// Support: Android 2.3
					// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
					temp = remaining / animation.duration || 0,
					percent = 1 - temp,
					index = 0,
					length = animation.tweens.length;

				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( percent );
				}

				deferred.notifyWith( elem, [ animation, percent, remaining ] );

				if ( percent < 1 && length ) {
					return remaining;
				} else {
					deferred.resolveWith( elem, [ animation ] );
					return false;
				}
			},
			animation = deferred.promise( {
				elem: elem,
				props: jQuery.extend( {}, properties ),
				opts: jQuery.extend( true, {
					specialEasing: {},
					easing: jQuery.easing._default
				}, options ),
				originalProperties: properties,
				originalOptions: options,
				startTime: fxNow || createFxNow(),
				duration: options.duration,
				tweens: [],
				createTween: function( prop, end ) {
					var tween = jQuery.Tween( elem, animation.opts, prop, end,
							animation.opts.specialEasing[ prop ] || animation.opts.easing );
					animation.tweens.push( tween );
					return tween;
				},
				stop: function( gotoEnd ) {
					var index = 0,

						// If we are going to the end, we want to run all the tweens
						// otherwise we skip this part
						length = gotoEnd ? animation.tweens.length : 0;
					if ( stopped ) {
						return this;
					}
					stopped = true;
					for ( ; index < length ; index++ ) {
						animation.tweens[ index ].run( 1 );
					}

					// Resolve when we played the last frame; otherwise, reject
					if ( gotoEnd ) {
						deferred.notifyWith( elem, [ animation, 1, 0 ] );
						deferred.resolveWith( elem, [ animation, gotoEnd ] );
					} else {
						deferred.rejectWith( elem, [ animation, gotoEnd ] );
					}
					return this;
				}
			} ),
			props = animation.props;

		propFilter( props, animation.opts.specialEasing );

		for ( ; index < length ; index++ ) {
			result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
			if ( result ) {
				if ( jQuery.isFunction( result.stop ) ) {
					jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
						jQuery.proxy( result.stop, result );
				}
				return result;
			}
		}

		jQuery.map( props, createTween, animation );

		if ( jQuery.isFunction( animation.opts.start ) ) {
			animation.opts.start.call( elem, animation );
		}

		jQuery.fx.timer(
			jQuery.extend( tick, {
				elem: elem,
				anim: animation,
				queue: animation.opts.queue
			} )
		);

		// attach callbacks from options
		return animation.progress( animation.opts.progress )
			.done( animation.opts.done, animation.opts.complete )
			.fail( animation.opts.fail )
			.always( animation.opts.always );
	}

	jQuery.Animation = jQuery.extend( Animation, {
		tweeners: {
			"*": [ function( prop, value ) {
				var tween = this.createTween( prop, value );
				adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
				return tween;
			} ]
		},

		tweener: function( props, callback ) {
			if ( jQuery.isFunction( props ) ) {
				callback = props;
				props = [ "*" ];
			} else {
				props = props.match( rnotwhite );
			}

			var prop,
				index = 0,
				length = props.length;

			for ( ; index < length ; index++ ) {
				prop = props[ index ];
				Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
				Animation.tweeners[ prop ].unshift( callback );
			}
		},

		prefilters: [ defaultPrefilter ],

		prefilter: function( callback, prepend ) {
			if ( prepend ) {
				Animation.prefilters.unshift( callback );
			} else {
				Animation.prefilters.push( callback );
			}
		}
	} );

	jQuery.speed = function( speed, easing, fn ) {
		var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
			complete: fn || !fn && easing ||
				jQuery.isFunction( speed ) && speed,
			duration: speed,
			easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
		};

		opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ?
			opt.duration : opt.duration in jQuery.fx.speeds ?
				jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

		// Normalize opt.queue - true/undefined/null -> "fx"
		if ( opt.queue == null || opt.queue === true ) {
			opt.queue = "fx";
		}

		// Queueing
		opt.old = opt.complete;

		opt.complete = function() {
			if ( jQuery.isFunction( opt.old ) ) {
				opt.old.call( this );
			}

			if ( opt.queue ) {
				jQuery.dequeue( this, opt.queue );
			}
		};

		return opt;
	};

	jQuery.fn.extend( {
		fadeTo: function( speed, to, easing, callback ) {

			// Show any hidden elements after setting opacity to 0
			return this.filter( isHidden ).css( "opacity", 0 ).show()

				// Animate to the value specified
				.end().animate( { opacity: to }, speed, easing, callback );
		},
		animate: function( prop, speed, easing, callback ) {
			var empty = jQuery.isEmptyObject( prop ),
				optall = jQuery.speed( speed, easing, callback ),
				doAnimation = function() {

					// Operate on a copy of prop so per-property easing won't be lost
					var anim = Animation( this, jQuery.extend( {}, prop ), optall );

					// Empty animations, or finishing resolves immediately
					if ( empty || dataPriv.get( this, "finish" ) ) {
						anim.stop( true );
					}
				};
				doAnimation.finish = doAnimation;

			return empty || optall.queue === false ?
				this.each( doAnimation ) :
				this.queue( optall.queue, doAnimation );
		},
		stop: function( type, clearQueue, gotoEnd ) {
			var stopQueue = function( hooks ) {
				var stop = hooks.stop;
				delete hooks.stop;
				stop( gotoEnd );
			};

			if ( typeof type !== "string" ) {
				gotoEnd = clearQueue;
				clearQueue = type;
				type = undefined;
			}
			if ( clearQueue && type !== false ) {
				this.queue( type || "fx", [] );
			}

			return this.each( function() {
				var dequeue = true,
					index = type != null && type + "queueHooks",
					timers = jQuery.timers,
					data = dataPriv.get( this );

				if ( index ) {
					if ( data[ index ] && data[ index ].stop ) {
						stopQueue( data[ index ] );
					}
				} else {
					for ( index in data ) {
						if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
							stopQueue( data[ index ] );
						}
					}
				}

				for ( index = timers.length; index--; ) {
					if ( timers[ index ].elem === this &&
						( type == null || timers[ index ].queue === type ) ) {

						timers[ index ].anim.stop( gotoEnd );
						dequeue = false;
						timers.splice( index, 1 );
					}
				}

				// Start the next in the queue if the last step wasn't forced.
				// Timers currently will call their complete callbacks, which
				// will dequeue but only if they were gotoEnd.
				if ( dequeue || !gotoEnd ) {
					jQuery.dequeue( this, type );
				}
			} );
		},
		finish: function( type ) {
			if ( type !== false ) {
				type = type || "fx";
			}
			return this.each( function() {
				var index,
					data = dataPriv.get( this ),
					queue = data[ type + "queue" ],
					hooks = data[ type + "queueHooks" ],
					timers = jQuery.timers,
					length = queue ? queue.length : 0;

				// Enable finishing flag on private data
				data.finish = true;

				// Empty the queue first
				jQuery.queue( this, type, [] );

				if ( hooks && hooks.stop ) {
					hooks.stop.call( this, true );
				}

				// Look for any active animations, and finish them
				for ( index = timers.length; index--; ) {
					if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
						timers[ index ].anim.stop( true );
						timers.splice( index, 1 );
					}
				}

				// Look for any animations in the old queue and finish them
				for ( index = 0; index < length; index++ ) {
					if ( queue[ index ] && queue[ index ].finish ) {
						queue[ index ].finish.call( this );
					}
				}

				// Turn off finishing flag
				delete data.finish;
			} );
		}
	} );

	jQuery.each( [ "toggle", "show", "hide" ], function( i, name ) {
		var cssFn = jQuery.fn[ name ];
		jQuery.fn[ name ] = function( speed, easing, callback ) {
			return speed == null || typeof speed === "boolean" ?
				cssFn.apply( this, arguments ) :
				this.animate( genFx( name, true ), speed, easing, callback );
		};
	} );

	// Generate shortcuts for custom animations
	jQuery.each( {
		slideDown: genFx( "show" ),
		slideUp: genFx( "hide" ),
		slideToggle: genFx( "toggle" ),
		fadeIn: { opacity: "show" },
		fadeOut: { opacity: "hide" },
		fadeToggle: { opacity: "toggle" }
	}, function( name, props ) {
		jQuery.fn[ name ] = function( speed, easing, callback ) {
			return this.animate( props, speed, easing, callback );
		};
	} );

	jQuery.timers = [];
	jQuery.fx.tick = function() {
		var timer,
			i = 0,
			timers = jQuery.timers;

		fxNow = jQuery.now();

		for ( ; i < timers.length; i++ ) {
			timer = timers[ i ];

			// Checks the timer has not already been removed
			if ( !timer() && timers[ i ] === timer ) {
				timers.splice( i--, 1 );
			}
		}

		if ( !timers.length ) {
			jQuery.fx.stop();
		}
		fxNow = undefined;
	};

	jQuery.fx.timer = function( timer ) {
		jQuery.timers.push( timer );
		if ( timer() ) {
			jQuery.fx.start();
		} else {
			jQuery.timers.pop();
		}
	};

	jQuery.fx.interval = 13;
	jQuery.fx.start = function() {
		if ( !timerId ) {
			timerId = window.setInterval( jQuery.fx.tick, jQuery.fx.interval );
		}
	};

	jQuery.fx.stop = function() {
		window.clearInterval( timerId );

		timerId = null;
	};

	jQuery.fx.speeds = {
		slow: 600,
		fast: 200,

		// Default speed
		_default: 400
	};


	// Based off of the plugin by Clint Helfers, with permission.
	// http://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
	jQuery.fn.delay = function( time, type ) {
		time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
		type = type || "fx";

		return this.queue( type, function( next, hooks ) {
			var timeout = window.setTimeout( next, time );
			hooks.stop = function() {
				window.clearTimeout( timeout );
			};
		} );
	};


	( function() {
		var input = document.createElement( "input" ),
			select = document.createElement( "select" ),
			opt = select.appendChild( document.createElement( "option" ) );

		input.type = "checkbox";

		// Support: iOS<=5.1, Android<=4.2+
		// Default value for a checkbox should be "on"
		support.checkOn = input.value !== "";

		// Support: IE<=11+
		// Must access selectedIndex to make default options select
		support.optSelected = opt.selected;

		// Support: Android<=2.3
		// Options inside disabled selects are incorrectly marked as disabled
		select.disabled = true;
		support.optDisabled = !opt.disabled;

		// Support: IE<=11+
		// An input loses its value after becoming a radio
		input = document.createElement( "input" );
		input.value = "t";
		input.type = "radio";
		support.radioValue = input.value === "t";
	} )();


	var boolHook,
		attrHandle = jQuery.expr.attrHandle;

	jQuery.fn.extend( {
		attr: function( name, value ) {
			return access( this, jQuery.attr, name, value, arguments.length > 1 );
		},

		removeAttr: function( name ) {
			return this.each( function() {
				jQuery.removeAttr( this, name );
			} );
		}
	} );

	jQuery.extend( {
		attr: function( elem, name, value ) {
			var ret, hooks,
				nType = elem.nodeType;

			// Don't get/set attributes on text, comment and attribute nodes
			if ( nType === 3 || nType === 8 || nType === 2 ) {
				return;
			}

			// Fallback to prop when attributes are not supported
			if ( typeof elem.getAttribute === "undefined" ) {
				return jQuery.prop( elem, name, value );
			}

			// All attributes are lowercase
			// Grab necessary hook if one is defined
			if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
				name = name.toLowerCase();
				hooks = jQuery.attrHooks[ name ] ||
					( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
			}

			if ( value !== undefined ) {
				if ( value === null ) {
					jQuery.removeAttr( elem, name );
					return;
				}

				if ( hooks && "set" in hooks &&
					( ret = hooks.set( elem, value, name ) ) !== undefined ) {
					return ret;
				}

				elem.setAttribute( name, value + "" );
				return value;
			}

			if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
				return ret;
			}

			ret = jQuery.find.attr( elem, name );

			// Non-existent attributes return null, we normalize to undefined
			return ret == null ? undefined : ret;
		},

		attrHooks: {
			type: {
				set: function( elem, value ) {
					if ( !support.radioValue && value === "radio" &&
						jQuery.nodeName( elem, "input" ) ) {
						var val = elem.value;
						elem.setAttribute( "type", value );
						if ( val ) {
							elem.value = val;
						}
						return value;
					}
				}
			}
		},

		removeAttr: function( elem, value ) {
			var name, propName,
				i = 0,
				attrNames = value && value.match( rnotwhite );

			if ( attrNames && elem.nodeType === 1 ) {
				while ( ( name = attrNames[ i++ ] ) ) {
					propName = jQuery.propFix[ name ] || name;

					// Boolean attributes get special treatment (#10870)
					if ( jQuery.expr.match.bool.test( name ) ) {

						// Set corresponding property to false
						elem[ propName ] = false;
					}

					elem.removeAttribute( name );
				}
			}
		}
	} );

	// Hooks for boolean attributes
	boolHook = {
		set: function( elem, value, name ) {
			if ( value === false ) {

				// Remove boolean attributes when set to false
				jQuery.removeAttr( elem, name );
			} else {
				elem.setAttribute( name, name );
			}
			return name;
		}
	};
	jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
		var getter = attrHandle[ name ] || jQuery.find.attr;

		attrHandle[ name ] = function( elem, name, isXML ) {
			var ret, handle;
			if ( !isXML ) {

				// Avoid an infinite loop by temporarily removing this function from the getter
				handle = attrHandle[ name ];
				attrHandle[ name ] = ret;
				ret = getter( elem, name, isXML ) != null ?
					name.toLowerCase() :
					null;
				attrHandle[ name ] = handle;
			}
			return ret;
		};
	} );




	var rfocusable = /^(?:input|select|textarea|button)$/i,
		rclickable = /^(?:a|area)$/i;

	jQuery.fn.extend( {
		prop: function( name, value ) {
			return access( this, jQuery.prop, name, value, arguments.length > 1 );
		},

		removeProp: function( name ) {
			return this.each( function() {
				delete this[ jQuery.propFix[ name ] || name ];
			} );
		}
	} );

	jQuery.extend( {
		prop: function( elem, name, value ) {
			var ret, hooks,
				nType = elem.nodeType;

			// Don't get/set properties on text, comment and attribute nodes
			if ( nType === 3 || nType === 8 || nType === 2 ) {
				return;
			}

			if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

				// Fix name and attach hooks
				name = jQuery.propFix[ name ] || name;
				hooks = jQuery.propHooks[ name ];
			}

			if ( value !== undefined ) {
				if ( hooks && "set" in hooks &&
					( ret = hooks.set( elem, value, name ) ) !== undefined ) {
					return ret;
				}

				return ( elem[ name ] = value );
			}

			if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
				return ret;
			}

			return elem[ name ];
		},

		propHooks: {
			tabIndex: {
				get: function( elem ) {

					// elem.tabIndex doesn't always return the
					// correct value when it hasn't been explicitly set
					// http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
					// Use proper attribute retrieval(#12072)
					var tabindex = jQuery.find.attr( elem, "tabindex" );

					return tabindex ?
						parseInt( tabindex, 10 ) :
						rfocusable.test( elem.nodeName ) ||
							rclickable.test( elem.nodeName ) && elem.href ?
								0 :
								-1;
				}
			}
		},

		propFix: {
			"for": "htmlFor",
			"class": "className"
		}
	} );

	if ( !support.optSelected ) {
		jQuery.propHooks.selected = {
			get: function( elem ) {
				var parent = elem.parentNode;
				if ( parent && parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
				return null;
			}
		};
	}

	jQuery.each( [
		"tabIndex",
		"readOnly",
		"maxLength",
		"cellSpacing",
		"cellPadding",
		"rowSpan",
		"colSpan",
		"useMap",
		"frameBorder",
		"contentEditable"
	], function() {
		jQuery.propFix[ this.toLowerCase() ] = this;
	} );




	var rclass = /[\t\r\n\f]/g;

	function getClass( elem ) {
		return elem.getAttribute && elem.getAttribute( "class" ) || "";
	}

	jQuery.fn.extend( {
		addClass: function( value ) {
			var classes, elem, cur, curValue, clazz, j, finalValue,
				i = 0;

			if ( jQuery.isFunction( value ) ) {
				return this.each( function( j ) {
					jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
				} );
			}

			if ( typeof value === "string" && value ) {
				classes = value.match( rnotwhite ) || [];

				while ( ( elem = this[ i++ ] ) ) {
					curValue = getClass( elem );
					cur = elem.nodeType === 1 &&
						( " " + curValue + " " ).replace( rclass, " " );

					if ( cur ) {
						j = 0;
						while ( ( clazz = classes[ j++ ] ) ) {
							if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
								cur += clazz + " ";
							}
						}

						// Only assign if different to avoid unneeded rendering.
						finalValue = jQuery.trim( cur );
						if ( curValue !== finalValue ) {
							elem.setAttribute( "class", finalValue );
						}
					}
				}
			}

			return this;
		},

		removeClass: function( value ) {
			var classes, elem, cur, curValue, clazz, j, finalValue,
				i = 0;

			if ( jQuery.isFunction( value ) ) {
				return this.each( function( j ) {
					jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
				} );
			}

			if ( !arguments.length ) {
				return this.attr( "class", "" );
			}

			if ( typeof value === "string" && value ) {
				classes = value.match( rnotwhite ) || [];

				while ( ( elem = this[ i++ ] ) ) {
					curValue = getClass( elem );

					// This expression is here for better compressibility (see addClass)
					cur = elem.nodeType === 1 &&
						( " " + curValue + " " ).replace( rclass, " " );

					if ( cur ) {
						j = 0;
						while ( ( clazz = classes[ j++ ] ) ) {

							// Remove *all* instances
							while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
								cur = cur.replace( " " + clazz + " ", " " );
							}
						}

						// Only assign if different to avoid unneeded rendering.
						finalValue = jQuery.trim( cur );
						if ( curValue !== finalValue ) {
							elem.setAttribute( "class", finalValue );
						}
					}
				}
			}

			return this;
		},

		toggleClass: function( value, stateVal ) {
			var type = typeof value;

			if ( typeof stateVal === "boolean" && type === "string" ) {
				return stateVal ? this.addClass( value ) : this.removeClass( value );
			}

			if ( jQuery.isFunction( value ) ) {
				return this.each( function( i ) {
					jQuery( this ).toggleClass(
						value.call( this, i, getClass( this ), stateVal ),
						stateVal
					);
				} );
			}

			return this.each( function() {
				var className, i, self, classNames;

				if ( type === "string" ) {

					// Toggle individual class names
					i = 0;
					self = jQuery( this );
					classNames = value.match( rnotwhite ) || [];

					while ( ( className = classNames[ i++ ] ) ) {

						// Check each className given, space separated list
						if ( self.hasClass( className ) ) {
							self.removeClass( className );
						} else {
							self.addClass( className );
						}
					}

				// Toggle whole class name
				} else if ( value === undefined || type === "boolean" ) {
					className = getClass( this );
					if ( className ) {

						// Store className if set
						dataPriv.set( this, "__className__", className );
					}

					// If the element has a class name or if we're passed `false`,
					// then remove the whole classname (if there was one, the above saved it).
					// Otherwise bring back whatever was previously saved (if anything),
					// falling back to the empty string if nothing was stored.
					if ( this.setAttribute ) {
						this.setAttribute( "class",
							className || value === false ?
							"" :
							dataPriv.get( this, "__className__" ) || ""
						);
					}
				}
			} );
		},

		hasClass: function( selector ) {
			var className, elem,
				i = 0;

			className = " " + selector + " ";
			while ( ( elem = this[ i++ ] ) ) {
				if ( elem.nodeType === 1 &&
					( " " + getClass( elem ) + " " ).replace( rclass, " " )
						.indexOf( className ) > -1
				) {
					return true;
				}
			}

			return false;
		}
	} );




	var rreturn = /\r/g;

	jQuery.fn.extend( {
		val: function( value ) {
			var hooks, ret, isFunction,
				elem = this[ 0 ];

			if ( !arguments.length ) {
				if ( elem ) {
					hooks = jQuery.valHooks[ elem.type ] ||
						jQuery.valHooks[ elem.nodeName.toLowerCase() ];

					if ( hooks &&
						"get" in hooks &&
						( ret = hooks.get( elem, "value" ) ) !== undefined
					) {
						return ret;
					}

					ret = elem.value;

					return typeof ret === "string" ?

						// Handle most common string cases
						ret.replace( rreturn, "" ) :

						// Handle cases where value is null/undef or number
						ret == null ? "" : ret;
				}

				return;
			}

			isFunction = jQuery.isFunction( value );

			return this.each( function( i ) {
				var val;

				if ( this.nodeType !== 1 ) {
					return;
				}

				if ( isFunction ) {
					val = value.call( this, i, jQuery( this ).val() );
				} else {
					val = value;
				}

				// Treat null/undefined as ""; convert numbers to string
				if ( val == null ) {
					val = "";

				} else if ( typeof val === "number" ) {
					val += "";

				} else if ( jQuery.isArray( val ) ) {
					val = jQuery.map( val, function( value ) {
						return value == null ? "" : value + "";
					} );
				}

				hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

				// If set returns undefined, fall back to normal setting
				if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
					this.value = val;
				}
			} );
		}
	} );

	jQuery.extend( {
		valHooks: {
			option: {
				get: function( elem ) {

					// Support: IE<11
					// option.value not trimmed (#14858)
					return jQuery.trim( elem.value );
				}
			},
			select: {
				get: function( elem ) {
					var value, option,
						options = elem.options,
						index = elem.selectedIndex,
						one = elem.type === "select-one" || index < 0,
						values = one ? null : [],
						max = one ? index + 1 : options.length,
						i = index < 0 ?
							max :
							one ? index : 0;

					// Loop through all the selected options
					for ( ; i < max; i++ ) {
						option = options[ i ];

						// IE8-9 doesn't update selected after form reset (#2551)
						if ( ( option.selected || i === index ) &&

								// Don't return options that are disabled or in a disabled optgroup
								( support.optDisabled ?
									!option.disabled : option.getAttribute( "disabled" ) === null ) &&
								( !option.parentNode.disabled ||
									!jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

							// Get the specific value for the option
							value = jQuery( option ).val();

							// We don't need an array for one selects
							if ( one ) {
								return value;
							}

							// Multi-Selects return an array
							values.push( value );
						}
					}

					return values;
				},

				set: function( elem, value ) {
					var optionSet, option,
						options = elem.options,
						values = jQuery.makeArray( value ),
						i = options.length;

					while ( i-- ) {
						option = options[ i ];
						if ( option.selected =
								jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
						) {
							optionSet = true;
						}
					}

					// Force browsers to behave consistently when non-matching value is set
					if ( !optionSet ) {
						elem.selectedIndex = -1;
					}
					return values;
				}
			}
		}
	} );

	// Radios and checkboxes getter/setter
	jQuery.each( [ "radio", "checkbox" ], function() {
		jQuery.valHooks[ this ] = {
			set: function( elem, value ) {
				if ( jQuery.isArray( value ) ) {
					return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
				}
			}
		};
		if ( !support.checkOn ) {
			jQuery.valHooks[ this ].get = function( elem ) {
				return elem.getAttribute( "value" ) === null ? "on" : elem.value;
			};
		}
	} );




	// Return jQuery for attributes-only inclusion


	var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/;

	jQuery.extend( jQuery.event, {

		trigger: function( event, data, elem, onlyHandlers ) {

			var i, cur, tmp, bubbleType, ontype, handle, special,
				eventPath = [ elem || document ],
				type = hasOwn.call( event, "type" ) ? event.type : event,
				namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

			cur = tmp = elem = elem || document;

			// Don't do events on text and comment nodes
			if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
				return;
			}

			// focus/blur morphs to focusin/out; ensure we're not firing them right now
			if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
				return;
			}

			if ( type.indexOf( "." ) > -1 ) {

				// Namespaced trigger; create a regexp to match event type in handle()
				namespaces = type.split( "." );
				type = namespaces.shift();
				namespaces.sort();
			}
			ontype = type.indexOf( ":" ) < 0 && "on" + type;

			// Caller can pass in a jQuery.Event object, Object, or just an event type string
			event = event[ jQuery.expando ] ?
				event :
				new jQuery.Event( type, typeof event === "object" && event );

			// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
			event.isTrigger = onlyHandlers ? 2 : 3;
			event.namespace = namespaces.join( "." );
			event.rnamespace = event.namespace ?
				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
				null;

			// Clean up the event in case it is being reused
			event.result = undefined;
			if ( !event.target ) {
				event.target = elem;
			}

			// Clone any incoming data and prepend the event, creating the handler arg list
			data = data == null ?
				[ event ] :
				jQuery.makeArray( data, [ event ] );

			// Allow special events to draw outside the lines
			special = jQuery.event.special[ type ] || {};
			if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
				return;
			}

			// Determine event propagation path in advance, per W3C events spec (#9951)
			// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
			if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

				bubbleType = special.delegateType || type;
				if ( !rfocusMorph.test( bubbleType + type ) ) {
					cur = cur.parentNode;
				}
				for ( ; cur; cur = cur.parentNode ) {
					eventPath.push( cur );
					tmp = cur;
				}

				// Only add window if we got to document (e.g., not plain obj or detached DOM)
				if ( tmp === ( elem.ownerDocument || document ) ) {
					eventPath.push( tmp.defaultView || tmp.parentWindow || window );
				}
			}

			// Fire handlers on the event path
			i = 0;
			while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {

				event.type = i > 1 ?
					bubbleType :
					special.bindType || type;

				// jQuery handler
				handle = ( dataPriv.get( cur, "events" ) || {} )[ event.type ] &&
					dataPriv.get( cur, "handle" );
				if ( handle ) {
					handle.apply( cur, data );
				}

				// Native handler
				handle = ontype && cur[ ontype ];
				if ( handle && handle.apply && acceptData( cur ) ) {
					event.result = handle.apply( cur, data );
					if ( event.result === false ) {
						event.preventDefault();
					}
				}
			}
			event.type = type;

			// If nobody prevented the default action, do it now
			if ( !onlyHandlers && !event.isDefaultPrevented() ) {

				if ( ( !special._default ||
					special._default.apply( eventPath.pop(), data ) === false ) &&
					acceptData( elem ) ) {

					// Call a native DOM method on the target with the same name name as the event.
					// Don't do default actions on window, that's where global variables be (#6170)
					if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {

						// Don't re-trigger an onFOO event when we call its FOO() method
						tmp = elem[ ontype ];

						if ( tmp ) {
							elem[ ontype ] = null;
						}

						// Prevent re-triggering of the same event, since we already bubbled it above
						jQuery.event.triggered = type;
						elem[ type ]();
						jQuery.event.triggered = undefined;

						if ( tmp ) {
							elem[ ontype ] = tmp;
						}
					}
				}
			}

			return event.result;
		},

		// Piggyback on a donor event to simulate a different one
		simulate: function( type, elem, event ) {
			var e = jQuery.extend(
				new jQuery.Event(),
				event,
				{
					type: type,
					isSimulated: true

					// Previously, `originalEvent: {}` was set here, so stopPropagation call
					// would not be triggered on donor event, since in our own
					// jQuery.event.stopPropagation function we had a check for existence of
					// originalEvent.stopPropagation method, so, consequently it would be a noop.
					//
					// But now, this "simulate" function is used only for events
					// for which stopPropagation() is noop, so there is no need for that anymore.
					//
					// For the 1.x branch though, guard for "click" and "submit"
					// events is still used, but was moved to jQuery.event.stopPropagation function
					// because `originalEvent` should point to the original event for the constancy
					// with other events and for more focused logic
				}
			);

			jQuery.event.trigger( e, null, elem );

			if ( e.isDefaultPrevented() ) {
				event.preventDefault();
			}
		}

	} );

	jQuery.fn.extend( {

		trigger: function( type, data ) {
			return this.each( function() {
				jQuery.event.trigger( type, data, this );
			} );
		},
		triggerHandler: function( type, data ) {
			var elem = this[ 0 ];
			if ( elem ) {
				return jQuery.event.trigger( type, data, elem, true );
			}
		}
	} );


	jQuery.each( ( "blur focus focusin focusout load resize scroll unload click dblclick " +
		"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
		"change select submit keydown keypress keyup error contextmenu" ).split( " " ),
		function( i, name ) {

		// Handle event binding
		jQuery.fn[ name ] = function( data, fn ) {
			return arguments.length > 0 ?
				this.on( name, null, data, fn ) :
				this.trigger( name );
		};
	} );

	jQuery.fn.extend( {
		hover: function( fnOver, fnOut ) {
			return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
		}
	} );




	support.focusin = "onfocusin" in window;


	// Support: Firefox
	// Firefox doesn't have focus(in | out) events
	// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
	//
	// Support: Chrome, Safari
	// focus(in | out) events fire after focus & blur events,
	// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
	// Related ticket - https://code.google.com/p/chromium/issues/detail?id=449857
	if ( !support.focusin ) {
		jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {

			// Attach a single capturing handler on the document while someone wants focusin/focusout
			var handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
			};

			jQuery.event.special[ fix ] = {
				setup: function() {
					var doc = this.ownerDocument || this,
						attaches = dataPriv.access( doc, fix );

					if ( !attaches ) {
						doc.addEventListener( orig, handler, true );
					}
					dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
				},
				teardown: function() {
					var doc = this.ownerDocument || this,
						attaches = dataPriv.access( doc, fix ) - 1;

					if ( !attaches ) {
						doc.removeEventListener( orig, handler, true );
						dataPriv.remove( doc, fix );

					} else {
						dataPriv.access( doc, fix, attaches );
					}
				}
			};
		} );
	}
	var location = window.location;

	var nonce = jQuery.now();

	var rquery = ( /\?/ );



	// Support: Android 2.3
	// Workaround failure to string-cast null input
	jQuery.parseJSON = function( data ) {
		return JSON.parse( data + "" );
	};


	// Cross-browser xml parsing
	jQuery.parseXML = function( data ) {
		var xml;
		if ( !data || typeof data !== "string" ) {
			return null;
		}

		// Support: IE9
		try {
			xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
		} catch ( e ) {
			xml = undefined;
		}

		if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
			jQuery.error( "Invalid XML: " + data );
		}
		return xml;
	};


	var
		rhash = /#.*$/,
		rts = /([?&])_=[^&]*/,
		rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

		// #7653, #8125, #8152: local protocol detection
		rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
		rnoContent = /^(?:GET|HEAD)$/,
		rprotocol = /^\/\//,

		/* Prefilters
		 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
		 * 2) These are called:
		 *    - BEFORE asking for a transport
		 *    - AFTER param serialization (s.data is a string if s.processData is true)
		 * 3) key is the dataType
		 * 4) the catchall symbol "*" can be used
		 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
		 */
		prefilters = {},

		/* Transports bindings
		 * 1) key is the dataType
		 * 2) the catchall symbol "*" can be used
		 * 3) selection will start with transport dataType and THEN go to "*" if needed
		 */
		transports = {},

		// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
		allTypes = "*/".concat( "*" ),

		// Anchor tag for parsing the document origin
		originAnchor = document.createElement( "a" );
		originAnchor.href = location.href;

	// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
	function addToPrefiltersOrTransports( structure ) {

		// dataTypeExpression is optional and defaults to "*"
		return function( dataTypeExpression, func ) {

			if ( typeof dataTypeExpression !== "string" ) {
				func = dataTypeExpression;
				dataTypeExpression = "*";
			}

			var dataType,
				i = 0,
				dataTypes = dataTypeExpression.toLowerCase().match( rnotwhite ) || [];

			if ( jQuery.isFunction( func ) ) {

				// For each dataType in the dataTypeExpression
				while ( ( dataType = dataTypes[ i++ ] ) ) {

					// Prepend if requested
					if ( dataType[ 0 ] === "+" ) {
						dataType = dataType.slice( 1 ) || "*";
						( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

					// Otherwise append
					} else {
						( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
					}
				}
			}
		};
	}

	// Base inspection function for prefilters and transports
	function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

		var inspected = {},
			seekingTransport = ( structure === transports );

		function inspect( dataType ) {
			var selected;
			inspected[ dataType ] = true;
			jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
				var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
				if ( typeof dataTypeOrTransport === "string" &&
					!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

					options.dataTypes.unshift( dataTypeOrTransport );
					inspect( dataTypeOrTransport );
					return false;
				} else if ( seekingTransport ) {
					return !( selected = dataTypeOrTransport );
				}
			} );
			return selected;
		}

		return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
	}

	// A special extend for ajax options
	// that takes "flat" options (not to be deep extended)
	// Fixes #9887
	function ajaxExtend( target, src ) {
		var key, deep,
			flatOptions = jQuery.ajaxSettings.flatOptions || {};

		for ( key in src ) {
			if ( src[ key ] !== undefined ) {
				( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
			}
		}
		if ( deep ) {
			jQuery.extend( true, target, deep );
		}

		return target;
	}

	/* Handles responses to an ajax request:
	 * - finds the right dataType (mediates between content-type and expected dataType)
	 * - returns the corresponding response
	 */
	function ajaxHandleResponses( s, jqXHR, responses ) {

		var ct, type, finalDataType, firstDataType,
			contents = s.contents,
			dataTypes = s.dataTypes;

		// Remove auto dataType and get content-type in the process
		while ( dataTypes[ 0 ] === "*" ) {
			dataTypes.shift();
			if ( ct === undefined ) {
				ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
			}
		}

		// Check if we're dealing with a known content-type
		if ( ct ) {
			for ( type in contents ) {
				if ( contents[ type ] && contents[ type ].test( ct ) ) {
					dataTypes.unshift( type );
					break;
				}
			}
		}

		// Check to see if we have a response for the expected dataType
		if ( dataTypes[ 0 ] in responses ) {
			finalDataType = dataTypes[ 0 ];
		} else {

			// Try convertible dataTypes
			for ( type in responses ) {
				if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
					finalDataType = type;
					break;
				}
				if ( !firstDataType ) {
					firstDataType = type;
				}
			}

			// Or just use first one
			finalDataType = finalDataType || firstDataType;
		}

		// If we found a dataType
		// We add the dataType to the list if needed
		// and return the corresponding response
		if ( finalDataType ) {
			if ( finalDataType !== dataTypes[ 0 ] ) {
				dataTypes.unshift( finalDataType );
			}
			return responses[ finalDataType ];
		}
	}

	/* Chain conversions given the request and the original response
	 * Also sets the responseXXX fields on the jqXHR instance
	 */
	function ajaxConvert( s, response, jqXHR, isSuccess ) {
		var conv2, current, conv, tmp, prev,
			converters = {},

			// Work with a copy of dataTypes in case we need to modify it for conversion
			dataTypes = s.dataTypes.slice();

		// Create converters map with lowercased keys
		if ( dataTypes[ 1 ] ) {
			for ( conv in s.converters ) {
				converters[ conv.toLowerCase() ] = s.converters[ conv ];
			}
		}

		current = dataTypes.shift();

		// Convert to each sequential dataType
		while ( current ) {

			if ( s.responseFields[ current ] ) {
				jqXHR[ s.responseFields[ current ] ] = response;
			}

			// Apply the dataFilter if provided
			if ( !prev && isSuccess && s.dataFilter ) {
				response = s.dataFilter( response, s.dataType );
			}

			prev = current;
			current = dataTypes.shift();

			if ( current ) {

			// There's only work to do if current dataType is non-auto
				if ( current === "*" ) {

					current = prev;

				// Convert response if prev dataType is non-auto and differs from current
				} else if ( prev !== "*" && prev !== current ) {

					// Seek a direct converter
					conv = converters[ prev + " " + current ] || converters[ "* " + current ];

					// If none found, seek a pair
					if ( !conv ) {
						for ( conv2 in converters ) {

							// If conv2 outputs current
							tmp = conv2.split( " " );
							if ( tmp[ 1 ] === current ) {

								// If prev can be converted to accepted input
								conv = converters[ prev + " " + tmp[ 0 ] ] ||
									converters[ "* " + tmp[ 0 ] ];
								if ( conv ) {

									// Condense equivalence converters
									if ( conv === true ) {
										conv = converters[ conv2 ];

									// Otherwise, insert the intermediate dataType
									} else if ( converters[ conv2 ] !== true ) {
										current = tmp[ 0 ];
										dataTypes.unshift( tmp[ 1 ] );
									}
									break;
								}
							}
						}
					}

					// Apply converter (if not an equivalence)
					if ( conv !== true ) {

						// Unless errors are allowed to bubble, catch and return them
						if ( conv && s.throws ) {
							response = conv( response );
						} else {
							try {
								response = conv( response );
							} catch ( e ) {
								return {
									state: "parsererror",
									error: conv ? e : "No conversion from " + prev + " to " + current
								};
							}
						}
					}
				}
			}
		}

		return { state: "success", data: response };
	}

	jQuery.extend( {

		// Counter for holding the number of active queries
		active: 0,

		// Last-Modified header cache for next request
		lastModified: {},
		etag: {},

		ajaxSettings: {
			url: location.href,
			type: "GET",
			isLocal: rlocalProtocol.test( location.protocol ),
			global: true,
			processData: true,
			async: true,
			contentType: "application/x-www-form-urlencoded; charset=UTF-8",
			/*
			timeout: 0,
			data: null,
			dataType: null,
			username: null,
			password: null,
			cache: null,
			throws: false,
			traditional: false,
			headers: {},
			*/

			accepts: {
				"*": allTypes,
				text: "text/plain",
				html: "text/html",
				xml: "application/xml, text/xml",
				json: "application/json, text/javascript"
			},

			contents: {
				xml: /\bxml\b/,
				html: /\bhtml/,
				json: /\bjson\b/
			},

			responseFields: {
				xml: "responseXML",
				text: "responseText",
				json: "responseJSON"
			},

			// Data converters
			// Keys separate source (or catchall "*") and destination types with a single space
			converters: {

				// Convert anything to text
				"* text": String,

				// Text to html (true = no transformation)
				"text html": true,

				// Evaluate text as a json expression
				"text json": jQuery.parseJSON,

				// Parse text as xml
				"text xml": jQuery.parseXML
			},

			// For options that shouldn't be deep extended:
			// you can add your own custom options here if
			// and when you create one that shouldn't be
			// deep extended (see ajaxExtend)
			flatOptions: {
				url: true,
				context: true
			}
		},

		// Creates a full fledged settings object into target
		// with both ajaxSettings and settings fields.
		// If target is omitted, writes into ajaxSettings.
		ajaxSetup: function( target, settings ) {
			return settings ?

				// Building a settings object
				ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

				// Extending ajaxSettings
				ajaxExtend( jQuery.ajaxSettings, target );
		},

		ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
		ajaxTransport: addToPrefiltersOrTransports( transports ),

		// Main method
		ajax: function( url, options ) {

			// If url is an object, simulate pre-1.5 signature
			if ( typeof url === "object" ) {
				options = url;
				url = undefined;
			}

			// Force options to be an object
			options = options || {};

			var transport,

				// URL without anti-cache param
				cacheURL,

				// Response headers
				responseHeadersString,
				responseHeaders,

				// timeout handle
				timeoutTimer,

				// Url cleanup var
				urlAnchor,

				// To know if global events are to be dispatched
				fireGlobals,

				// Loop variable
				i,

				// Create the final options object
				s = jQuery.ajaxSetup( {}, options ),

				// Callbacks context
				callbackContext = s.context || s,

				// Context for global events is callbackContext if it is a DOM node or jQuery collection
				globalEventContext = s.context &&
					( callbackContext.nodeType || callbackContext.jquery ) ?
						jQuery( callbackContext ) :
						jQuery.event,

				// Deferreds
				deferred = jQuery.Deferred(),
				completeDeferred = jQuery.Callbacks( "once memory" ),

				// Status-dependent callbacks
				statusCode = s.statusCode || {},

				// Headers (they are sent all at once)
				requestHeaders = {},
				requestHeadersNames = {},

				// The jqXHR state
				state = 0,

				// Default abort message
				strAbort = "canceled",

				// Fake xhr
				jqXHR = {
					readyState: 0,

					// Builds headers hashtable if needed
					getResponseHeader: function( key ) {
						var match;
						if ( state === 2 ) {
							if ( !responseHeaders ) {
								responseHeaders = {};
								while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
									responseHeaders[ match[ 1 ].toLowerCase() ] = match[ 2 ];
								}
							}
							match = responseHeaders[ key.toLowerCase() ];
						}
						return match == null ? null : match;
					},

					// Raw string
					getAllResponseHeaders: function() {
						return state === 2 ? responseHeadersString : null;
					},

					// Caches the header
					setRequestHeader: function( name, value ) {
						var lname = name.toLowerCase();
						if ( !state ) {
							name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
							requestHeaders[ name ] = value;
						}
						return this;
					},

					// Overrides response content-type header
					overrideMimeType: function( type ) {
						if ( !state ) {
							s.mimeType = type;
						}
						return this;
					},

					// Status-dependent callbacks
					statusCode: function( map ) {
						var code;
						if ( map ) {
							if ( state < 2 ) {
								for ( code in map ) {

									// Lazy-add the new callback in a way that preserves old ones
									statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
								}
							} else {

								// Execute the appropriate callbacks
								jqXHR.always( map[ jqXHR.status ] );
							}
						}
						return this;
					},

					// Cancel the request
					abort: function( statusText ) {
						var finalText = statusText || strAbort;
						if ( transport ) {
							transport.abort( finalText );
						}
						done( 0, finalText );
						return this;
					}
				};

			// Attach deferreds
			deferred.promise( jqXHR ).complete = completeDeferred.add;
			jqXHR.success = jqXHR.done;
			jqXHR.error = jqXHR.fail;

			// Remove hash character (#7531: and string promotion)
			// Add protocol if not provided (prefilters might expect it)
			// Handle falsy url in the settings object (#10093: consistency with old signature)
			// We also use the url parameter if available
			s.url = ( ( url || s.url || location.href ) + "" ).replace( rhash, "" )
				.replace( rprotocol, location.protocol + "//" );

			// Alias method option to type as per ticket #12004
			s.type = options.method || options.type || s.method || s.type;

			// Extract dataTypes list
			s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().match( rnotwhite ) || [ "" ];

			// A cross-domain request is in order when the origin doesn't match the current origin.
			if ( s.crossDomain == null ) {
				urlAnchor = document.createElement( "a" );

				// Support: IE8-11+
				// IE throws exception if url is malformed, e.g. http://example.com:80x/
				try {
					urlAnchor.href = s.url;

					// Support: IE8-11+
					// Anchor's host property isn't correctly set when s.url is relative
					urlAnchor.href = urlAnchor.href;
					s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
						urlAnchor.protocol + "//" + urlAnchor.host;
				} catch ( e ) {

					// If there is an error parsing the URL, assume it is crossDomain,
					// it can be rejected by the transport if it is invalid
					s.crossDomain = true;
				}
			}

			// Convert data if not already a string
			if ( s.data && s.processData && typeof s.data !== "string" ) {
				s.data = jQuery.param( s.data, s.traditional );
			}

			// Apply prefilters
			inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

			// If request was aborted inside a prefilter, stop there
			if ( state === 2 ) {
				return jqXHR;
			}

			// We can fire global events as of now if asked to
			// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
			fireGlobals = jQuery.event && s.global;

			// Watch for a new set of requests
			if ( fireGlobals && jQuery.active++ === 0 ) {
				jQuery.event.trigger( "ajaxStart" );
			}

			// Uppercase the type
			s.type = s.type.toUpperCase();

			// Determine if request has content
			s.hasContent = !rnoContent.test( s.type );

			// Save the URL in case we're toying with the If-Modified-Since
			// and/or If-None-Match header later on
			cacheURL = s.url;

			// More options handling for requests with no content
			if ( !s.hasContent ) {

				// If data is available, append data to url
				if ( s.data ) {
					cacheURL = ( s.url += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data );

					// #9682: remove data so that it's not used in an eventual retry
					delete s.data;
				}

				// Add anti-cache in url if needed
				if ( s.cache === false ) {
					s.url = rts.test( cacheURL ) ?

						// If there is already a '_' parameter, set its value
						cacheURL.replace( rts, "$1_=" + nonce++ ) :

						// Otherwise add one to the end
						cacheURL + ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + nonce++;
				}
			}

			// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
			if ( s.ifModified ) {
				if ( jQuery.lastModified[ cacheURL ] ) {
					jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
				}
				if ( jQuery.etag[ cacheURL ] ) {
					jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
				}
			}

			// Set the correct header, if data is being sent
			if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
				jqXHR.setRequestHeader( "Content-Type", s.contentType );
			}

			// Set the Accepts header for the server, depending on the dataType
			jqXHR.setRequestHeader(
				"Accept",
				s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
					s.accepts[ s.dataTypes[ 0 ] ] +
						( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
					s.accepts[ "*" ]
			);

			// Check for headers option
			for ( i in s.headers ) {
				jqXHR.setRequestHeader( i, s.headers[ i ] );
			}

			// Allow custom headers/mimetypes and early abort
			if ( s.beforeSend &&
				( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {

				// Abort if not done already and return
				return jqXHR.abort();
			}

			// Aborting is no longer a cancellation
			strAbort = "abort";

			// Install callbacks on deferreds
			for ( i in { success: 1, error: 1, complete: 1 } ) {
				jqXHR[ i ]( s[ i ] );
			}

			// Get transport
			transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

			// If no transport, we auto-abort
			if ( !transport ) {
				done( -1, "No Transport" );
			} else {
				jqXHR.readyState = 1;

				// Send global event
				if ( fireGlobals ) {
					globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
				}

				// If request was aborted inside ajaxSend, stop there
				if ( state === 2 ) {
					return jqXHR;
				}

				// Timeout
				if ( s.async && s.timeout > 0 ) {
					timeoutTimer = window.setTimeout( function() {
						jqXHR.abort( "timeout" );
					}, s.timeout );
				}

				try {
					state = 1;
					transport.send( requestHeaders, done );
				} catch ( e ) {

					// Propagate exception as error if not done
					if ( state < 2 ) {
						done( -1, e );

					// Simply rethrow otherwise
					} else {
						throw e;
					}
				}
			}

			// Callback for when everything is done
			function done( status, nativeStatusText, responses, headers ) {
				var isSuccess, success, error, response, modified,
					statusText = nativeStatusText;

				// Called once
				if ( state === 2 ) {
					return;
				}

				// State is "done" now
				state = 2;

				// Clear timeout if it exists
				if ( timeoutTimer ) {
					window.clearTimeout( timeoutTimer );
				}

				// Dereference transport for early garbage collection
				// (no matter how long the jqXHR object will be used)
				transport = undefined;

				// Cache response headers
				responseHeadersString = headers || "";

				// Set readyState
				jqXHR.readyState = status > 0 ? 4 : 0;

				// Determine if successful
				isSuccess = status >= 200 && status < 300 || status === 304;

				// Get response data
				if ( responses ) {
					response = ajaxHandleResponses( s, jqXHR, responses );
				}

				// Convert no matter what (that way responseXXX fields are always set)
				response = ajaxConvert( s, response, jqXHR, isSuccess );

				// If successful, handle type chaining
				if ( isSuccess ) {

					// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
					if ( s.ifModified ) {
						modified = jqXHR.getResponseHeader( "Last-Modified" );
						if ( modified ) {
							jQuery.lastModified[ cacheURL ] = modified;
						}
						modified = jqXHR.getResponseHeader( "etag" );
						if ( modified ) {
							jQuery.etag[ cacheURL ] = modified;
						}
					}

					// if no content
					if ( status === 204 || s.type === "HEAD" ) {
						statusText = "nocontent";

					// if not modified
					} else if ( status === 304 ) {
						statusText = "notmodified";

					// If we have data, let's convert it
					} else {
						statusText = response.state;
						success = response.data;
						error = response.error;
						isSuccess = !error;
					}
				} else {

					// Extract error from statusText and normalize for non-aborts
					error = statusText;
					if ( status || !statusText ) {
						statusText = "error";
						if ( status < 0 ) {
							status = 0;
						}
					}
				}

				// Set data for the fake xhr object
				jqXHR.status = status;
				jqXHR.statusText = ( nativeStatusText || statusText ) + "";

				// Success/Error
				if ( isSuccess ) {
					deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
				} else {
					deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
				}

				// Status-dependent callbacks
				jqXHR.statusCode( statusCode );
				statusCode = undefined;

				if ( fireGlobals ) {
					globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
						[ jqXHR, s, isSuccess ? success : error ] );
				}

				// Complete
				completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

				if ( fireGlobals ) {
					globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

					// Handle the global AJAX counter
					if ( !( --jQuery.active ) ) {
						jQuery.event.trigger( "ajaxStop" );
					}
				}
			}

			return jqXHR;
		},

		getJSON: function( url, data, callback ) {
			return jQuery.get( url, data, callback, "json" );
		},

		getScript: function( url, callback ) {
			return jQuery.get( url, undefined, callback, "script" );
		}
	} );

	jQuery.each( [ "get", "post" ], function( i, method ) {
		jQuery[ method ] = function( url, data, callback, type ) {

			// Shift arguments if data argument was omitted
			if ( jQuery.isFunction( data ) ) {
				type = type || callback;
				callback = data;
				data = undefined;
			}

			// The url can be an options object (which then must have .url)
			return jQuery.ajax( jQuery.extend( {
				url: url,
				type: method,
				dataType: type,
				data: data,
				success: callback
			}, jQuery.isPlainObject( url ) && url ) );
		};
	} );


	jQuery._evalUrl = function( url ) {
		return jQuery.ajax( {
			url: url,

			// Make this explicit, since user can override this through ajaxSetup (#11264)
			type: "GET",
			dataType: "script",
			async: false,
			global: false,
			"throws": true
		} );
	};


	jQuery.fn.extend( {
		wrapAll: function( html ) {
			var wrap;

			if ( jQuery.isFunction( html ) ) {
				return this.each( function( i ) {
					jQuery( this ).wrapAll( html.call( this, i ) );
				} );
			}

			if ( this[ 0 ] ) {

				// The elements to wrap the target around
				wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

				if ( this[ 0 ].parentNode ) {
					wrap.insertBefore( this[ 0 ] );
				}

				wrap.map( function() {
					var elem = this;

					while ( elem.firstElementChild ) {
						elem = elem.firstElementChild;
					}

					return elem;
				} ).append( this );
			}

			return this;
		},

		wrapInner: function( html ) {
			if ( jQuery.isFunction( html ) ) {
				return this.each( function( i ) {
					jQuery( this ).wrapInner( html.call( this, i ) );
				} );
			}

			return this.each( function() {
				var self = jQuery( this ),
					contents = self.contents();

				if ( contents.length ) {
					contents.wrapAll( html );

				} else {
					self.append( html );
				}
			} );
		},

		wrap: function( html ) {
			var isFunction = jQuery.isFunction( html );

			return this.each( function( i ) {
				jQuery( this ).wrapAll( isFunction ? html.call( this, i ) : html );
			} );
		},

		unwrap: function() {
			return this.parent().each( function() {
				if ( !jQuery.nodeName( this, "body" ) ) {
					jQuery( this ).replaceWith( this.childNodes );
				}
			} ).end();
		}
	} );


	jQuery.expr.filters.hidden = function( elem ) {
		return !jQuery.expr.filters.visible( elem );
	};
	jQuery.expr.filters.visible = function( elem ) {

		// Support: Opera <= 12.12
		// Opera reports offsetWidths and offsetHeights less than zero on some elements
		// Use OR instead of AND as the element is not visible if either is true
		// See tickets #10406 and #13132
		return elem.offsetWidth > 0 || elem.offsetHeight > 0 || elem.getClientRects().length > 0;
	};




	var r20 = /%20/g,
		rbracket = /\[\]$/,
		rCRLF = /\r?\n/g,
		rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
		rsubmittable = /^(?:input|select|textarea|keygen)/i;

	function buildParams( prefix, obj, traditional, add ) {
		var name;

		if ( jQuery.isArray( obj ) ) {

			// Serialize array item.
			jQuery.each( obj, function( i, v ) {
				if ( traditional || rbracket.test( prefix ) ) {

					// Treat each array item as a scalar.
					add( prefix, v );

				} else {

					// Item is non-scalar (array or object), encode its numeric index.
					buildParams(
						prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
						v,
						traditional,
						add
					);
				}
			} );

		} else if ( !traditional && jQuery.type( obj ) === "object" ) {

			// Serialize object item.
			for ( name in obj ) {
				buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
			}

		} else {

			// Serialize scalar item.
			add( prefix, obj );
		}
	}

	// Serialize an array of form elements or a set of
	// key/values into a query string
	jQuery.param = function( a, traditional ) {
		var prefix,
			s = [],
			add = function( key, value ) {

				// If value is a function, invoke it and return its value
				value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
				s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
			};

		// Set traditional to true for jQuery <= 1.3.2 behavior.
		if ( traditional === undefined ) {
			traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
		}

		// If an array was passed in, assume that it is an array of form elements.
		if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

			// Serialize the form elements
			jQuery.each( a, function() {
				add( this.name, this.value );
			} );

		} else {

			// If traditional, encode the "old" way (the way 1.3.2 or older
			// did it), otherwise encode params recursively.
			for ( prefix in a ) {
				buildParams( prefix, a[ prefix ], traditional, add );
			}
		}

		// Return the resulting serialization
		return s.join( "&" ).replace( r20, "+" );
	};

	jQuery.fn.extend( {
		serialize: function() {
			return jQuery.param( this.serializeArray() );
		},
		serializeArray: function() {
			return this.map( function() {

				// Can add propHook for "elements" to filter or add form elements
				var elements = jQuery.prop( this, "elements" );
				return elements ? jQuery.makeArray( elements ) : this;
			} )
			.filter( function() {
				var type = this.type;

				// Use .is( ":disabled" ) so that fieldset[disabled] works
				return this.name && !jQuery( this ).is( ":disabled" ) &&
					rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
					( this.checked || !rcheckableType.test( type ) );
			} )
			.map( function( i, elem ) {
				var val = jQuery( this ).val();

				return val == null ?
					null :
					jQuery.isArray( val ) ?
						jQuery.map( val, function( val ) {
							return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
						} ) :
						{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
			} ).get();
		}
	} );


	jQuery.ajaxSettings.xhr = function() {
		try {
			return new window.XMLHttpRequest();
		} catch ( e ) {}
	};

	var xhrSuccessStatus = {

			// File protocol always yields status code 0, assume 200
			0: 200,

			// Support: IE9
			// #1450: sometimes IE returns 1223 when it should be 204
			1223: 204
		},
		xhrSupported = jQuery.ajaxSettings.xhr();

	support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
	support.ajax = xhrSupported = !!xhrSupported;

	jQuery.ajaxTransport( function( options ) {
		var callback, errorCallback;

		// Cross domain only allowed if supported through XMLHttpRequest
		if ( support.cors || xhrSupported && !options.crossDomain ) {
			return {
				send: function( headers, complete ) {
					var i,
						xhr = options.xhr();

					xhr.open(
						options.type,
						options.url,
						options.async,
						options.username,
						options.password
					);

					// Apply custom fields if provided
					if ( options.xhrFields ) {
						for ( i in options.xhrFields ) {
							xhr[ i ] = options.xhrFields[ i ];
						}
					}

					// Override mime type if needed
					if ( options.mimeType && xhr.overrideMimeType ) {
						xhr.overrideMimeType( options.mimeType );
					}

					// X-Requested-With header
					// For cross-domain requests, seeing as conditions for a preflight are
					// akin to a jigsaw puzzle, we simply never set it to be sure.
					// (it can always be set on a per-request basis or even using ajaxSetup)
					// For same-domain requests, won't change header if already provided.
					if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
						headers[ "X-Requested-With" ] = "XMLHttpRequest";
					}

					// Set headers
					for ( i in headers ) {
						xhr.setRequestHeader( i, headers[ i ] );
					}

					// Callback
					callback = function( type ) {
						return function() {
							if ( callback ) {
								callback = errorCallback = xhr.onload =
									xhr.onerror = xhr.onabort = xhr.onreadystatechange = null;

								if ( type === "abort" ) {
									xhr.abort();
								} else if ( type === "error" ) {

									// Support: IE9
									// On a manual native abort, IE9 throws
									// errors on any property access that is not readyState
									if ( typeof xhr.status !== "number" ) {
										complete( 0, "error" );
									} else {
										complete(

											// File: protocol always yields status 0; see #8605, #14207
											xhr.status,
											xhr.statusText
										);
									}
								} else {
									complete(
										xhrSuccessStatus[ xhr.status ] || xhr.status,
										xhr.statusText,

										// Support: IE9 only
										// IE9 has no XHR2 but throws on binary (trac-11426)
										// For XHR2 non-text, let the caller handle it (gh-2498)
										( xhr.responseType || "text" ) !== "text"  ||
										typeof xhr.responseText !== "string" ?
											{ binary: xhr.response } :
											{ text: xhr.responseText },
										xhr.getAllResponseHeaders()
									);
								}
							}
						};
					};

					// Listen to events
					xhr.onload = callback();
					errorCallback = xhr.onerror = callback( "error" );

					// Support: IE9
					// Use onreadystatechange to replace onabort
					// to handle uncaught aborts
					if ( xhr.onabort !== undefined ) {
						xhr.onabort = errorCallback;
					} else {
						xhr.onreadystatechange = function() {

							// Check readyState before timeout as it changes
							if ( xhr.readyState === 4 ) {

								// Allow onerror to be called first,
								// but that will not handle a native abort
								// Also, save errorCallback to a variable
								// as xhr.onerror cannot be accessed
								window.setTimeout( function() {
									if ( callback ) {
										errorCallback();
									}
								} );
							}
						};
					}

					// Create the abort callback
					callback = callback( "abort" );

					try {

						// Do send the request (this may raise an exception)
						xhr.send( options.hasContent && options.data || null );
					} catch ( e ) {

						// #14683: Only rethrow if this hasn't been notified as an error yet
						if ( callback ) {
							throw e;
						}
					}
				},

				abort: function() {
					if ( callback ) {
						callback();
					}
				}
			};
		}
	} );




	// Install script dataType
	jQuery.ajaxSetup( {
		accepts: {
			script: "text/javascript, application/javascript, " +
				"application/ecmascript, application/x-ecmascript"
		},
		contents: {
			script: /\b(?:java|ecma)script\b/
		},
		converters: {
			"text script": function( text ) {
				jQuery.globalEval( text );
				return text;
			}
		}
	} );

	// Handle cache's special case and crossDomain
	jQuery.ajaxPrefilter( "script", function( s ) {
		if ( s.cache === undefined ) {
			s.cache = false;
		}
		if ( s.crossDomain ) {
			s.type = "GET";
		}
	} );

	// Bind script tag hack transport
	jQuery.ajaxTransport( "script", function( s ) {

		// This transport only deals with cross domain requests
		if ( s.crossDomain ) {
			var script, callback;
			return {
				send: function( _, complete ) {
					script = jQuery( "<script>" ).prop( {
						charset: s.scriptCharset,
						src: s.url
					} ).on(
						"load error",
						callback = function( evt ) {
							script.remove();
							callback = null;
							if ( evt ) {
								complete( evt.type === "error" ? 404 : 200, evt.type );
							}
						}
					);

					// Use native DOM manipulation to avoid our domManip AJAX trickery
					document.head.appendChild( script[ 0 ] );
				},
				abort: function() {
					if ( callback ) {
						callback();
					}
				}
			};
		}
	} );




	var oldCallbacks = [],
		rjsonp = /(=)\?(?=&|$)|\?\?/;

	// Default jsonp settings
	jQuery.ajaxSetup( {
		jsonp: "callback",
		jsonpCallback: function() {
			var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
			this[ callback ] = true;
			return callback;
		}
	} );

	// Detect, normalize options and install callbacks for jsonp requests
	jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

		var callbackName, overwritten, responseContainer,
			jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
				"url" :
				typeof s.data === "string" &&
					( s.contentType || "" )
						.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
					rjsonp.test( s.data ) && "data"
			);

		// Handle iff the expected data type is "jsonp" or we have a parameter to set
		if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

			// Get callback name, remembering preexisting value associated with it
			callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
				s.jsonpCallback() :
				s.jsonpCallback;

			// Insert callback into url or form data
			if ( jsonProp ) {
				s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
			} else if ( s.jsonp !== false ) {
				s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
			}

			// Use data converter to retrieve json after script execution
			s.converters[ "script json" ] = function() {
				if ( !responseContainer ) {
					jQuery.error( callbackName + " was not called" );
				}
				return responseContainer[ 0 ];
			};

			// Force json dataType
			s.dataTypes[ 0 ] = "json";

			// Install callback
			overwritten = window[ callbackName ];
			window[ callbackName ] = function() {
				responseContainer = arguments;
			};

			// Clean-up function (fires after converters)
			jqXHR.always( function() {

				// If previous value didn't exist - remove it
				if ( overwritten === undefined ) {
					jQuery( window ).removeProp( callbackName );

				// Otherwise restore preexisting value
				} else {
					window[ callbackName ] = overwritten;
				}

				// Save back as free
				if ( s[ callbackName ] ) {

					// Make sure that re-using the options doesn't screw things around
					s.jsonpCallback = originalSettings.jsonpCallback;

					// Save the callback name for future use
					oldCallbacks.push( callbackName );
				}

				// Call if it was a function and we have a response
				if ( responseContainer && jQuery.isFunction( overwritten ) ) {
					overwritten( responseContainer[ 0 ] );
				}

				responseContainer = overwritten = undefined;
			} );

			// Delegate to script
			return "script";
		}
	} );




	// Support: Safari 8+
	// In Safari 8 documents created via document.implementation.createHTMLDocument
	// collapse sibling forms: the second one becomes a child of the first one.
	// Because of that, this security measure has to be disabled in Safari 8.
	// https://bugs.webkit.org/show_bug.cgi?id=137337
	support.createHTMLDocument = ( function() {
		var body = document.implementation.createHTMLDocument( "" ).body;
		body.innerHTML = "<form></form><form></form>";
		return body.childNodes.length === 2;
	} )();


	// Argument "data" should be string of html
	// context (optional): If specified, the fragment will be created in this context,
	// defaults to document
	// keepScripts (optional): If true, will include scripts passed in the html string
	jQuery.parseHTML = function( data, context, keepScripts ) {
		if ( !data || typeof data !== "string" ) {
			return null;
		}
		if ( typeof context === "boolean" ) {
			keepScripts = context;
			context = false;
		}

		// Stop scripts or inline event handlers from being executed immediately
		// by using document.implementation
		context = context || ( support.createHTMLDocument ?
			document.implementation.createHTMLDocument( "" ) :
			document );

		var parsed = rsingleTag.exec( data ),
			scripts = !keepScripts && [];

		// Single tag
		if ( parsed ) {
			return [ context.createElement( parsed[ 1 ] ) ];
		}

		parsed = buildFragment( [ data ], context, scripts );

		if ( scripts && scripts.length ) {
			jQuery( scripts ).remove();
		}

		return jQuery.merge( [], parsed.childNodes );
	};


	// Keep a copy of the old load method
	var _load = jQuery.fn.load;

	/**
	 * Load a url into a page
	 */
	jQuery.fn.load = function( url, params, callback ) {
		if ( typeof url !== "string" && _load ) {
			return _load.apply( this, arguments );
		}

		var selector, type, response,
			self = this,
			off = url.indexOf( " " );

		if ( off > -1 ) {
			selector = jQuery.trim( url.slice( off ) );
			url = url.slice( 0, off );
		}

		// If it's a function
		if ( jQuery.isFunction( params ) ) {

			// We assume that it's the callback
			callback = params;
			params = undefined;

		// Otherwise, build a param string
		} else if ( params && typeof params === "object" ) {
			type = "POST";
		}

		// If we have elements to modify, make the request
		if ( self.length > 0 ) {
			jQuery.ajax( {
				url: url,

				// If "type" variable is undefined, then "GET" method will be used.
				// Make value of this field explicit since
				// user can override it through ajaxSetup method
				type: type || "GET",
				dataType: "html",
				data: params
			} ).done( function( responseText ) {

				// Save response for use in complete callback
				response = arguments;

				self.html( selector ?

					// If a selector was specified, locate the right elements in a dummy div
					// Exclude scripts to avoid IE 'Permission Denied' errors
					jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

					// Otherwise use the full result
					responseText );

			// If the request succeeds, this function gets "data", "status", "jqXHR"
			// but they are ignored because response was set above.
			// If it fails, this function gets "jqXHR", "status", "error"
			} ).always( callback && function( jqXHR, status ) {
				self.each( function() {
					callback.apply( self, response || [ jqXHR.responseText, status, jqXHR ] );
				} );
			} );
		}

		return this;
	};




	// Attach a bunch of functions for handling common AJAX events
	jQuery.each( [
		"ajaxStart",
		"ajaxStop",
		"ajaxComplete",
		"ajaxError",
		"ajaxSuccess",
		"ajaxSend"
	], function( i, type ) {
		jQuery.fn[ type ] = function( fn ) {
			return this.on( type, fn );
		};
	} );




	jQuery.expr.filters.animated = function( elem ) {
		return jQuery.grep( jQuery.timers, function( fn ) {
			return elem === fn.elem;
		} ).length;
	};




	/**
	 * Gets a window from an element
	 */
	function getWindow( elem ) {
		return jQuery.isWindow( elem ) ? elem : elem.nodeType === 9 && elem.defaultView;
	}

	jQuery.offset = {
		setOffset: function( elem, options, i ) {
			var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
				position = jQuery.css( elem, "position" ),
				curElem = jQuery( elem ),
				props = {};

			// Set position first, in-case top/left are set even on static elem
			if ( position === "static" ) {
				elem.style.position = "relative";
			}

			curOffset = curElem.offset();
			curCSSTop = jQuery.css( elem, "top" );
			curCSSLeft = jQuery.css( elem, "left" );
			calculatePosition = ( position === "absolute" || position === "fixed" ) &&
				( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

			// Need to be able to calculate position if either
			// top or left is auto and position is either absolute or fixed
			if ( calculatePosition ) {
				curPosition = curElem.position();
				curTop = curPosition.top;
				curLeft = curPosition.left;

			} else {
				curTop = parseFloat( curCSSTop ) || 0;
				curLeft = parseFloat( curCSSLeft ) || 0;
			}

			if ( jQuery.isFunction( options ) ) {

				// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
				options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
			}

			if ( options.top != null ) {
				props.top = ( options.top - curOffset.top ) + curTop;
			}
			if ( options.left != null ) {
				props.left = ( options.left - curOffset.left ) + curLeft;
			}

			if ( "using" in options ) {
				options.using.call( elem, props );

			} else {
				curElem.css( props );
			}
		}
	};

	jQuery.fn.extend( {
		offset: function( options ) {
			if ( arguments.length ) {
				return options === undefined ?
					this :
					this.each( function( i ) {
						jQuery.offset.setOffset( this, options, i );
					} );
			}

			var docElem, win,
				elem = this[ 0 ],
				box = { top: 0, left: 0 },
				doc = elem && elem.ownerDocument;

			if ( !doc ) {
				return;
			}

			docElem = doc.documentElement;

			// Make sure it's not a disconnected DOM node
			if ( !jQuery.contains( docElem, elem ) ) {
				return box;
			}

			box = elem.getBoundingClientRect();
			win = getWindow( doc );
			return {
				top: box.top + win.pageYOffset - docElem.clientTop,
				left: box.left + win.pageXOffset - docElem.clientLeft
			};
		},

		position: function() {
			if ( !this[ 0 ] ) {
				return;
			}

			var offsetParent, offset,
				elem = this[ 0 ],
				parentOffset = { top: 0, left: 0 };

			// Fixed elements are offset from window (parentOffset = {top:0, left: 0},
			// because it is its only offset parent
			if ( jQuery.css( elem, "position" ) === "fixed" ) {

				// Assume getBoundingClientRect is there when computed position is fixed
				offset = elem.getBoundingClientRect();

			} else {

				// Get *real* offsetParent
				offsetParent = this.offsetParent();

				// Get correct offsets
				offset = this.offset();
				if ( !jQuery.nodeName( offsetParent[ 0 ], "html" ) ) {
					parentOffset = offsetParent.offset();
				}

				// Add offsetParent borders
				parentOffset.top += jQuery.css( offsetParent[ 0 ], "borderTopWidth", true );
				parentOffset.left += jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true );
			}

			// Subtract parent offsets and element margins
			return {
				top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
				left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
			};
		},

		// This method will return documentElement in the following cases:
		// 1) For the element inside the iframe without offsetParent, this method will return
		//    documentElement of the parent window
		// 2) For the hidden or detached element
		// 3) For body or html element, i.e. in case of the html node - it will return itself
		//
		// but those exceptions were never presented as a real life use-cases
		// and might be considered as more preferable results.
		//
		// This logic, however, is not guaranteed and can change at any point in the future
		offsetParent: function() {
			return this.map( function() {
				var offsetParent = this.offsetParent;

				while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
					offsetParent = offsetParent.offsetParent;
				}

				return offsetParent || documentElement;
			} );
		}
	} );

	// Create scrollLeft and scrollTop methods
	jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
		var top = "pageYOffset" === prop;

		jQuery.fn[ method ] = function( val ) {
			return access( this, function( elem, method, val ) {
				var win = getWindow( elem );

				if ( val === undefined ) {
					return win ? win[ prop ] : elem[ method ];
				}

				if ( win ) {
					win.scrollTo(
						!top ? val : win.pageXOffset,
						top ? val : win.pageYOffset
					);

				} else {
					elem[ method ] = val;
				}
			}, method, val, arguments.length );
		};
	} );

	// Support: Safari<7-8+, Chrome<37-44+
	// Add the top/left cssHooks using jQuery.fn.position
	// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
	// Blink bug: https://code.google.com/p/chromium/issues/detail?id=229280
	// getComputedStyle returns percent when specified for top/left/bottom/right;
	// rather than make the css module depend on the offset module, just check for it here
	jQuery.each( [ "top", "left" ], function( i, prop ) {
		jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
			function( elem, computed ) {
				if ( computed ) {
					computed = curCSS( elem, prop );

					// If curCSS returns percentage, fallback to offset
					return rnumnonpx.test( computed ) ?
						jQuery( elem ).position()[ prop ] + "px" :
						computed;
				}
			}
		);
	} );


	// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
	jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
		jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name },
			function( defaultExtra, funcName ) {

			// Margin is only for outerHeight, outerWidth
			jQuery.fn[ funcName ] = function( margin, value ) {
				var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
					extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

				return access( this, function( elem, type, value ) {
					var doc;

					if ( jQuery.isWindow( elem ) ) {

						// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
						// isn't a whole lot we can do. See pull request at this URL for discussion:
						// https://github.com/jquery/jquery/pull/764
						return elem.document.documentElement[ "client" + name ];
					}

					// Get document width or height
					if ( elem.nodeType === 9 ) {
						doc = elem.documentElement;

						// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
						// whichever is greatest
						return Math.max(
							elem.body[ "scroll" + name ], doc[ "scroll" + name ],
							elem.body[ "offset" + name ], doc[ "offset" + name ],
							doc[ "client" + name ]
						);
					}

					return value === undefined ?

						// Get width or height on the element, requesting but not forcing parseFloat
						jQuery.css( elem, type, extra ) :

						// Set width or height on the element
						jQuery.style( elem, type, value, extra );
				}, type, chainable ? margin : undefined, chainable, null );
			};
		} );
	} );


	jQuery.fn.extend( {

		bind: function( types, data, fn ) {
			return this.on( types, null, data, fn );
		},
		unbind: function( types, fn ) {
			return this.off( types, null, fn );
		},

		delegate: function( selector, types, data, fn ) {
			return this.on( types, selector, data, fn );
		},
		undelegate: function( selector, types, fn ) {

			// ( namespace ) or ( selector, types [, fn] )
			return arguments.length === 1 ?
				this.off( selector, "**" ) :
				this.off( types, selector || "**", fn );
		},
		size: function() {
			return this.length;
		}
	} );

	jQuery.fn.andSelf = jQuery.fn.addBack;




	// Register as a named AMD module, since jQuery can be concatenated with other
	// files that may use define, but not via a proper concatenation script that
	// understands anonymous AMD modules. A named AMD is safest and most robust
	// way to register. Lowercase jquery is used because AMD module names are
	// derived from file names, and jQuery is normally delivered in a lowercase
	// file name. Do this after creating the global so that if an AMD module wants
	// to call noConflict to hide this version of jQuery, it will work.

	// Note that for maximum portability, libraries that are not jQuery should
	// declare themselves as anonymous modules, and avoid setting a global if an
	// AMD loader is present. jQuery is a special case. For more information, see
	// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

	if ( true ) {
		!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function() {
			return jQuery;
		}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}



	var

		// Map over jQuery in case of overwrite
		_jQuery = window.jQuery,

		// Map over the $ in case of overwrite
		_$ = window.$;

	jQuery.noConflict = function( deep ) {
		if ( window.$ === jQuery ) {
			window.$ = _$;
		}

		if ( deep && window.jQuery === jQuery ) {
			window.jQuery = _jQuery;
		}

		return jQuery;
	};

	// Expose jQuery and $ identifiers, even in AMD
	// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
	// and CommonJS for browser emulators (#13566)
	if ( !noGlobal ) {
		window.jQuery = window.$ = jQuery;
	}

	return jQuery;
	}));


/***/ }
/******/ ]);