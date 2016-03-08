# Initializing
Download from Bower

`bower install monkeykit --save`

Then initialize Monkey:

`monkey.init(<app key>, <app secret>, userObj);`

The userObj is a JSON object representing the user metadata (e.g. name, country, etc) in which can be included a `monkey_id` to reuse an existing monkey id.

# Sending Messages
To send a message:

`monkey.sendMessage(<text>, <recipient monkey id>, optionalParams);`

- The optionalParams is a JSON object representing extra params that the developer wants to send.
- The optionalPush could be a String or if you want to send a localized push, then it could be a JSON object.

To send a encrypted message:

`monkey.sendEncryptedMessage(<text>, <recipient monkey id>, optionalParams);`

- The optionalParams is a JSON object representing extra params that the developer wants to send.
- The optionalPush could be a String or if you want to send a localized push, then it could be a JSON object.

**Both these functions return a MOKMessage object** (See end of document for reference)

To send a notification:

`monkey.sendNotification(<recipient monkey id>, optionalParams, optionalPush);`

- The optionalParams is a JSON object representing extra params that the developer wants to send.
- The optionalPush could be a String or if you want to send a localized push, then it could be a JSON object.

# Sending Files
To send a file:

`monkey.sendFile(<data>, <recipient monkey id>, <file name>, <file type>, <bool compressionFlag>, optionalParams, optionalPush, callback);`

- <file type> is of type `MOKMessageFileType` (See end of document for reference).
- <bool compressionFlag> boolean that determines if the data should be compressed or not.
- The optionalParams is a JSON object representing extra params that the developer wants to send.
- The optionalPush could be a String or if you want to send a localized push, then it could be a JSON object.

To send a encrypted file:

`monkey.sendEncryptedFile(<data>, <recipient monkey id>, <file name>, <file type>, <bool compressionFlag>, optionalParams, optionalPush, callback);`

- <file type> is of type `MOKMessageFileType` (See end of document for reference).
- <bool compressionFlag> boolean that determines if the data should be compressed or not.
- The optionalParams is a JSON object representing extra params that the developer wants to send.
- The optionalPush could be a String or if you want to send a localized push, then it could be a JSON object.

**Both these functions return a MOKMessage object** (See end of document for reference)

# Events
The events to listen to are:
- `onMessage` - Triggered when a message arrives
- `onNotification` - Triggered when a notification arrives
- `onAcknowledge` - Triggered when an acknowledge of a message arrives
- `onConnect` - Triggered when there's a connection established to the socket server
- `onDisconnect` - Triggered when there's a disconnection to the socket server

# Creating groups
To create a group you can do it with a given `id` or you can let monkey generate an `id` for you:
```javascript
//array of monkey ids
var members = [<monkey id1>, <monkey id 2>];

//JSON object defined by the developer (anything can go there)
var groupInfo = {name: "los del barrio", admin: <monkeyId>};

//A push notification can be sent to mobile devices that have registered their push token in monkey
var optionalPush = "test";

//You can set the id that you want for your group
//if that id is already taken, those members and info will be added to the existing group
var optionalId = "G:Mesa1";

monkey.createGroup(members, groupInfo, optionalPush, optionalId, function(error, groupInfo){
  if(error){//error message
    console.log(error);
  }
  console.log(JSON.stringify(groupInfo));
});
```
`groupInfo` will contain a JSON Object with: 
- `group_id` all group ids start with prefix `G:`, if the id provided doesn't have the prefix, the group will still be created with the `G:` prefix and messages should be sent using this id. If you don't provide an id, then Monkey will provide the id (e.g. `G:1`, `G:2`, and so on).
- `members` -> array of Monkey ids
- `members_info` -> dictionary of {<Monkey id>:<user metadata>}
- `info` -> JSON object defined by the user

To send messages to the group, you use the same `monkey.sendMessage` and in the `recipientMonkeyId` you will put the id of your group.
```javascript
var optionalParams = {cardPlayed: "3B"};
var message = monkey.sendMessage("sending test text", "G:Mesa1", optionalParams);
```

The message returned by `sendMessage` is of the `MOKMessage` class

# Remove and Adding members to group
```javascript
//you can have two different push messages
//for the new member, and for all the existing members
var optionalPushNewMember = "hello";
var optionalPushExistingMember = "derp has joined the game!";

var newMemberId = <Monkey id>;
var groupId = <group id>;
monkey.addMemberToGroup(groupId, newMemberId, optionalPushNewMember, optionalPushExistingMembers, function(error, groupInfo){
  if(error){//error message
    console.log(error);
  }
  //just like with create group, add member will return all the current info about the group
  console.log(JSON.stringify(groupInfo));
});

var userLost = <Monkey id>;

monkey.removeMemberFromGroup(groupId, userLost, function(error, groupInfo){
  if(error){//error message
    console.log(error);
  }
  //just like with create group and add member, remove member will return all the current info about the group
  console.log(JSON.stringify(groupInfo));
});
```

# User or group info
To get the info just call
```javascript
//you can request the info for a monkey user or a group
var someId = "G:Mesa1";//or <Monkey id>
monkey.getInfoById(someId, function(error, info){
  if(error){//error message
    console.log(error);
  }
  console.log(JSON.stringify(groupInfo));
});
```
# MOKMessage reference
- message.id -> id of the message
- message.oldId -> old id of the message
- message.params -> custom params sent by the developer in `optionalParams`
- message.text -> text of the message
- message.encryptedText -> encrypted text of the message
- message.isEncrypted() -> returns true/false if the message text is encrypted
//to be continues