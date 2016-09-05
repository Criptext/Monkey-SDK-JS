
'use strict';

module.exports = (function() {

  let monkeyKeystore = {};

  const store = require('./store.js');
  const CryptoJS = require('node-cryptojs-aes').CryptoJS;

  monkeyKeystore.storeData = function(key, value, myaeskey, myaesiv){
    store.set(key, this.aesEncrypt(value, myaeskey, myaesiv));
  }

  monkeyKeystore.storeMessage = function(key, value){
    store.set(key, value);
  }

  monkeyKeystore.getData = function(key, myaeskey, myaesiv){
    let encrypted = store.get(key, "");
    if(encrypted.length === 0){
      return {key: "", iv: ""};
    }

    let decrypted = this.aesDecrypt(encrypted, myaeskey, myaesiv);
    if(decrypted.length === 0){
      return {key: "", iv: ""};
    }

    return {key: decrypted.split(":")[0], iv: decrypted.split(":")[1]};
  }

  monkeyKeystore.getMessage = function(key){
    return store.get(key, "");
  }

  monkeyKeystore.aesEncrypt = function(dataToEncrypt, key, iv){

    let aesKey=CryptoJS.enc.Base64.parse(key);
    let initV= CryptoJS.enc.Base64.parse(iv);
    let encryptedData = CryptoJS.AES.encrypt(dataToEncrypt, aesKey, { iv: initV });

    return encryptedData.toString();

  }

  monkeyKeystore.aesDecrypt = function(dataToDecrypt, key, iv){

    try{
      let aesKey = CryptoJS.enc.Base64.parse(key);
      let initV = CryptoJS.enc.Base64.parse(iv);
      let cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(dataToDecrypt) });
      let decrypted = CryptoJS.AES.decrypt(cipherParams, aesKey, { iv: initV }).toString(CryptoJS.enc.Utf8);
      return decrypted;
    }
    catch(e){
      return "";
    }

  }

  return monkeyKeystore;

}())
