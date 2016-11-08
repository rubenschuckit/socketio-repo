// Require the packages we will use:
var http = require("http"),
socketio = require("socket.io"),
fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.

	fs.readFile("chat.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.

		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(process.env.PORT || 5000);

//Do the Socket.IO magic:

var roomArray = [];
roomArray[0] = new Room("lobby", null, "");
var testArray = [];

function Room(inName, inOwner, inPassword) {
	var name = inName;
	var users = [];
	var owner = inOwner;
	var bannedUsers = [];
	var password = inPassword;

	return {
		getName: function() {return name;},
		addUser: function(newUser) {users.push(newUser);},
		userExists: function(user) {
			if(users.indexOf(user) == -1)
				return false;
			else
				return true;
		},
		getUsers: function() {return users;},
		getOwner: function() {return owner;},
		removeUser: function(userName) {
			var index = users.indexOf(userName);
			if (index > -1) {
				users.splice(index, 1);
			}
		},
		addBannedUser: function(user) {bannedUsers.push(user);},
		getBannedUsers: function() {return bannedUsers;},
		getPassword: function() {return password;}
	};
}

var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.

	//Message sent to server to be broadcasted
	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.

		console.log("message: "+data["message"] + " name: " + data["name"]); // log it to the Node.JS output
		io.sockets.emit("message_to_client",{message:data["message"], name:data["name"], room:data["room"]}); // broadcast the message to other users
	});

	//When user logs in, emit that someone joined
	socket.on('user_logged_in', function(data) {
		var roomName = data["room"];
		var username = data["name"];
		var password = data["password"];
		var currentRoom = data["currentRoom"];

		console.log("User: " + username + " attempting to enter: " + roomName + " with password: " + password);

		for(var i = 0; i < roomArray.length; i++) {
			if(roomArray[i].getName() == roomName) {
				if(roomArray[i].getBannedUsers().indexOf(username) != -1) {
					io.sockets.emit("user_denied");
					return;
				}
				console.log(username + " is not banned");
				if(roomArray[i].getPassword() != password) {
					io.sockets.emit("user_denied_pass", {user:username});
					return;
				}
				console.log(username + " entered the correct password");
				if(roomArray[i].userExists(username) == false) {
					console.log(username + " does not already exist in list");
					roomArray[i].addUser(username);
					var ownerName = roomArray[i].getOwner();
					var arrayOfUsers = roomArray[i].getUsers();
					io.sockets.emit("room_change_success", {room:roomArray[i].getName(),user:username,oldRoom:currentRoom});
					io.sockets.emit("user_joined_room", {room:roomName,owner:ownerName,users:arrayOfUsers});
					break;
				}
			}
		}

		var roomNames= [];
		for(var i = 0; i < roomArray.length; i++) {
			roomNames.push(roomArray[i].getName());
		}

		io.sockets.emit("new_room", {rooms:roomNames});

	});

	//When someone creates a new room
	socket.on("create_new_chat_room", function(data){
		var roomName = data["roomName"];
		var owner = data["mod"];
		var password = data["password"];
		roomArray.push(new Room(roomName, owner, password));

		var roomNames = [];

		for(var i = 0; i < roomArray.length; i++) {
			roomNames.push(roomArray[i].getName());
		}

		io.sockets.emit("new_room", {rooms:roomNames});
	});

	socket.on("user_leaves_room", function(data) {
		var roomName = data["room"];
		var user = data["user"];

		for(var i = 0; i < roomArray.length; i++) {
			if(roomArray[i].getName() == roomName) {
				roomArray[i].removeUser(user);
				console.log("Users left after removing " + user + " from " + roomName + " " + roomArray[i].getUsers());
				var outOwner = roomArray[i].getOwner();
				io.sockets.emit("user_joined_room", {room:roomName,users:roomArray[i].getUsers(),owner:outOwner});
				break;
			}
		}
	});

	socket.on("remove_user_perm", function(data) {
		var currentUser = data["currentUser"];
		var personToRemove = data["removeUser"];
		var room = data["room"];

		if(currentUser == personToRemove) {
			io.sockets.emit("cannot_delete_self");
		}

		for(var i = 0; i < roomArray.length; i++) {
			if(roomArray[i].getName() == room) {
				roomArray[i].removeUser(personToRemove);
				roomArray[i].addBannedUser(personToRemove);
				var outOwner = roomArray[i].getOwner();
				io.sockets.emit("user_joined_room", {room:room,users:roomArray[i].getUsers(),owner:outOwner});
			}
		}
	});

	socket.on("user_removal", function(data) {
		var currentUser = data["currentUser"];
		var personToRemove = data["removeUser"];
		var room = data["room"];

		console.log("Person to remove: " + personToRemove + " remover: " + currentUser + " room" + room);

		if(currentUser == personToRemove) {
			io.sockets.emit("cannot_delete_self");
		}

		for(var i = 0; i < roomArray.length; i++) {
			if(roomArray[i].getName() == room) {
				roomArray[i].removeUser(personToRemove);
				var outOwner = roomArray[i].getOwner();
				io.sockets.emit("user_joined_room", {room:room,users:roomArray[i].getUsers(),owner:outOwner});
			}
		}

		io.sockets.emit("user_to_be_removed", {username:personToRemove,removealRoom:room});
	});

	socket.on("broadcast_to_server", function(data) {
		var from = data["sender"];
		var to = data["recp"];
		var msg = data["msg"];
		io.sockets.emit("broadcast", {to:to,from:from,msg:msg});
	});

	socket.on("typing_happening", function(data) {
		io.sockets.emit("typing_add", {name:data["username"],room:data["room"]});
	});

	socket.on("done_typing", function(data){
		io.sockets.emit("typing_delete",{room:data["room"]});
	});

});
