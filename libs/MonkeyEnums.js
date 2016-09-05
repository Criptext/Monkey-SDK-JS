(function () {
  'use strict';

  /**
  * Class for managing Monkey enums.
  *
  * @class MonkeyEnums Manages Monkey declared enums.
  */
  function MonkeyEnums() {}

  // Shortcuts to improve speed and size
  let proto = MonkeyEnums.prototype;
  let exports = this;
  
  let originalGlobalValue = exports.Monkey;

  proto.Status = {
    OFFLINE:0,
    LOGOUT:1,
    CONNECTING:2,
    ONLINE:3
  }

  proto.ProtocolCommand = {
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

  proto.MessageType = {
    TEXT:1,
    FILE:2,
    TEMP_NOTE:3,
    NOTIF:4,
    ALERT:5
  }

  proto.FileType = {
    AUDIO:1,
    VIDEO:2,
    PHOTO:3,
    ARCHIVE:4
  }

  proto.GetType = {
    HISTORY:1,
    GROUPS:2
  }

  proto.SyncType = {
    HISTORY:1,
    GROUPS:2
  }

  proto.GroupAction = {
    CREATE:1,
    DELETE:2,
    NEW_MEMBER:3,
    REMOVE_MEMBER:4
  }

  /**
  * Reverts the global {@link MonkeyEnums} to its previous value and returns a reference to this version.
  *
  * @return {Function} Non conflicting EventEmitter class.
  */
  MonkeyEnums.noConflict = function noConflict() {
    exports.MonkeyEnums = originalGlobalValue;
    return MonkeyEnums;
  };

  // Expose the class either via AMD, CommonJS or the global object
  /* global define */
  if (typeof define === 'function' && define.amd) {
    define(function () {
      return MonkeyEnums;
    });
  }
  else if (typeof module === 'object' && module.exports){
    module.exports = MonkeyEnums;
  }
  else {
    exports.MonkeyEnums = MonkeyEnums;
  }
})();
