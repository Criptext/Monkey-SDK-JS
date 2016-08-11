/*
Protocol Enums
*/

/*
Start Message class definition
*/

module.exports = class MOKMessage{
  constructor(command, args){
    //check if loading from DB
    if (args.args != null) {
      this.buildFromDB(args);
      return;
    }

    this.args = args;

    if (args.app_id != null) {
      this.app_id = args.app_id;
    }
    this.protocolCommand = command;
    this.protocolType = parseInt(args.type);

    this.senderId = args.sid;
    this.recipientId = args.rid;

    this.datetimeOrder = this.getCurrentTimestamp();
    this.datetimeCreation = args.datetime == null? this.datetimeOrder : args.datetime;

    this.readByUser = args.readByUser || false;

    //parse props
    if (args.props != null && typeof(args.props) != "undefined" && args.props !== "") {
      if (typeof(args.props) === "string") {
        this.props = JSON.parse(args.props);
      }else{
        this.props = args.props;
      }
    }else{
      this.props = {encr: 0};
    }

    //parse params
    if (args.params != null && args.params !== "" && typeof(args.params) != "undefined") {
      if (typeof(args.params) === "string") {
        this.params = JSON.parse(args.params);
      }else{
        this.params = args.params;
      }
    }

    //parse message id
    if (args.id == null) {//didn't come from the socket
    this.id = this.generateRandomMessageId();
    this.oldId = this.id;

    this.props.old_id = this.id;
  }else{//it came from the socket
    this.id = args.id;
    this.oldId = this.props.old_id;
  }

  this.encryptedText = args.msg;
  this.text = args.msg;

  switch(command){
    case 205:{
      this.buildAcknowledge(this.props);
      break;
    }
    default:{
      break;
    }
  }
}

generateRandomMessageId(){
  return (Math.round((new Date().getTime() / 1000) * -1))+(Math.random().toString(36).substring(14));
}
getCurrentTimestamp(){
  return (new Date().getTime() / 1000);
}
buildFromDB(storedArgs){
  this.args = storedArgs.args;

  if (storedArgs.app_id != null) {
    this.app_id = storedArgs.app_id;
  }
  this.protocolCommand = storedArgs.protocolCommand;
  this.protocolType = storedArgs.protocolType;

  this.senderId = storedArgs.senderId;
  this.recipientId = storedArgs.recipientId;

  this.datetimeOrder = storedArgs.datetimeOrder;
  this.datetimeCreation = storedArgs.datetimeCreation;

  this.readByUser = storedArgs.readByUser;

  this.props = storedArgs.props;
  this.params = storedArgs.params

  this.id = storedArgs.id;
  this.oldId = storedArgs.oldId;

  this.encryptedText = storedArgs.encryptedText;
  this.text = storedArgs.text;

}
buildAcknowledge(props){
  if (typeof(props.message_id) != "undefined" || props.message_id != null) {
    this.id = props.message_id;
  }
  if (typeof(props.new_id) != "undefined" || props.new_id != null) {
    this.id = props.new_id;
  }
  if (typeof(props.old_id) != "undefined" || props.old_id != null) {
    this.oldId = props.old_id;
  }
}
compressionMethod(){
  if (this.isCompressed) {
    return this.props.cmpr;
  }
  return null;
}

isGroupMessage(){
  return this.recipientId.indexOf('G:') > -1
}

isCompressed(){
  if (this.props == null || typeof(this.props.cmpr) == "undefined" || this.props.cmpr == null) {
    console.log('MONKEY - props null');
    return false;
  }
  return this.props.cmpr? true : false;
}

isEncrypted(){
  if (this.props == null || typeof(this.props.encr) == "undefined" || this.props.encr == null) {
    return false;
  }
  return this.props.encr == 1? true : false;
}
setEncrypted(flag){
  this.props.encr = flag? 1 : 0;
}
}
