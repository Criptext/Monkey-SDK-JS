
'use strict';

module.exports = (function() {

  require('isomorphic-fetch');
  var apiconnector = {};
  var main;

  apiconnector.init = function(mainObject){
    main = mainObject;
  }

  apiconnector.basicRequest = function(method, endpoint, params, isFile, callback){

    var basic= this.getAuthParamsBtoA(main.appKey+":"+main.appSecret);

    var reqUrl = main.domainUrl+endpoint;

    var parseAsJson = true;

    if (main.session.debuggingMode) {
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

    var bodyReq = {
      method: method,
      credentials: 'include',
      headers: headersReq
    };

    if (method != 'GET') {
      bodyReq.body = data
    }

    if(method == 'GET' && isFile){
      parseAsJson = false;
    }

    fetch(reqUrl, bodyReq)
    .then(main.checkStatus)
    .then(parseAsJson ? main.parseJSON : main.parseFile)
    .then(function(respObj) {
      callback(null,respObj);
    }).catch(function(error) {
      callback(error);
    });// end of AJAX CALL

  }

  apiconnector.getAuthParamsBtoA = function(connectAuthParamsString){

    //window.btoa not supported in <=IE9
    var basic;
    if (window.btoa) {
      basic = window.btoa(connectAuthParamsString);
    }
    else{
      //for <= IE9
      var base64 = {};
      base64.PADCHAR = '=';
      base64.ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

      base64.makeDOMException = function() {
        // sadly in FF,Safari,Chrome you can't make a DOMException

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

  return apiconnector;

}())
