<!DOCTYPE html>
<html>

<head>
	<title>Chat Server</title>
	<script src="https://cdn.socket.io/socket.io-1.4.5.js"></script>
	<script src="server.js"></script>
	<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>

	<style type="text/css">
	body{
		padding: 25px 50px;
		width: 1000px; /* how wide to make your web page */
		background-color: #5155A6; /* what color to make the background */
		margin: 0 auto;
		font:12px/16px Verdana, sans-serif; /* default font */
		font-family: "Lucida Sans Unicode", "Lucida Grande", sans-serif;
		text-decoration-color: white;
	}
	div#chatlog{
		width: 400px;
		float: left;
		color: "white";
		border-radius: 10px;
		padding: 20px;
		background-color: rgb(242,107,107);
		word-wrap:break-word;
		vertical-align: top;
		overflow:auto;
	}
	div#members{
		float: right;
		margin: 0px 5px 5px 5px;
		padding: 10px;
		background-color: rgb(252,207,29);
		border-radius: 25px;
		word-wrap:break-word;
		vertical-align: top;
		overflow:auto;
	}
	div#chatrooms{
		float: right; 
		padding: 10px;
		background-color: rgb(110,191,73);
		border-radius: 25px;
		word-wrap:break-word;
		vertical-align: top;
		overflow:auto;
	}

	.chatrooms{
		padding: 25px 50px;
	}

	</style>

	<script>

//listeners 
document.addEventListener("DOMContentLoaded", function(event) {

	//Sets the divs to hidden because they have buffers so their background colors don't show prior to logging in 
	document.getElementById("chatlog").style.visibility = 'hidden';
	document.getElementById("members").style.visibility = 'hidden';
	document.getElementById("chatrooms").style.visibility = 'hidden';

	var username;
	var currentRoom = "lobby";
	var onCreate = true;

	//Submit username listener, starts chat infra
	document.getElementById("submitUsername").addEventListener("click", function(event) {
		username = document.getElementById("username").value;
		$(".login").toggle();
		addChatInfra();
	});

	var socketio = io.connect();

	//Message recieved from client, show it to user
	socketio.on("message_to_client",function(data) {
		//Get room
		var room = data["room"];

		if(room == currentRoom) {
			var text = document.createTextNode(data["name"] + ": " + data["message"]);
			document.getElementById("chatlog").appendChild(text);
			document.getElementById("chatlog").style.color = "white";
			document.getElementById("chatlog").appendChild(document.createElement("hr"));
		}
	}, false);

	//When a user joins a room, add it to the members div
	socketio.on("user_joined_room", function(data) {
		var checkCurrentRoom = currentRoom;
		if(data["room"] == currentRoom) {
			var listOfUsers = data["users"];
			var ownerName = data["owner"];
			var isOwner = false;

			if(ownerName == username)
				isOwner = true;

			while (document.getElementById("list").hasChildNodes()) {   
				document.getElementById("list").removeChild(document.getElementById("list").firstChild);
			}

			if(isOwner) {
				if(document.getElementById("usersDropDown") != null) {
					$("#usersDropDown").remove();
					$("#removeButton").remove();
					$("#removePerm").remove();
					$("#hr1").remove();
				}

				var dropDown = document.createElement("SELECT");
				dropDown.setAttribute("id", "usersDropDown");

				var button = document.createElement("button");
				button.setAttribute("id","removeButton");
				var textForButton = document.createTextNode("Remove User");

				button.appendChild(textForButton);
				document.getElementById("chatrooms").appendChild(dropDown);

				var buttonPerm = document.createElement("button");
				buttonPerm.setAttribute("id", "removePerm");
				var texForPermButton = document.createTextNode("Ban User");
				buttonPerm.appendChild(texForPermButton);

				document.getElementById("chatrooms").appendChild(button);
				document.getElementById("chatrooms").appendChild(buttonPerm);
				var hr = document.createElement("hr");
				hr.setAttribute("id", "hr1");
				document.getElementById("chatrooms").appendChild(hr);

				buttonPerm.addEventListener("click", function() {
					var userToRemove = $('#usersDropDown :selected').text();
					socketio.emit("user_removal", {removeUser:userToRemove, currentUser:username, room:currentRoom});
					socketio.emit("remove_user_perm", {removeUser:userToRemove, currentUser:username, room:currentRoom});
				});

				button.addEventListener("click", function() {
					var userToRemove = $('#usersDropDown :selected').text();
					socketio.emit("user_removal", {removeUser:userToRemove, currentUser:username, room:currentRoom});
				});
			}
			$("#pmdropdown").empty();
			for(var i = 0; i < listOfUsers.length; i++) {
				var item = document.createElement('li');
				item.appendChild(document.createTextNode(listOfUsers[i]));
				document.getElementById("list").appendChild(item);

				if(document.getElementById("pmdropdown") != null) {
					var u = document.createElement("option");
					u.setAttribute("value", listOfUsers[i]);
					var t = document.createTextNode(listOfUsers[i]);
					u.appendChild(t);
					document.getElementById("pmdropdown").appendChild(u);
				}

				if(document.getElementById("usersDropDown") != null && isOwner) {
					var u = document.createElement("option");
					u.setAttribute("value", listOfUsers[i]);
					var t = document.createTextNode(listOfUsers[i]);
					u.appendChild(t);
					document.getElementById("usersDropDown").appendChild(u);
				}
				else {
					if(document.getElementById("usersDropDown") != null && $("#usersDropDown").is(':visible') && data["room"] == currentRoom) {
						$("#usersDropDown").remove();
						$("#usersDropDown").empty();
						$("#removeButton").remove();
						$("#removePerm").remove();
						$("#hr1").remove();
					}
				}
			}
		}

	});

	//Broadcasts a message to all users
	function sendMessage(){
		var msg = document.getElementById("chatbox").value;
		document.getElementById("chatbox").value = "";
		socketio.emit("message_to_server", {message:msg,name:username,room:currentRoom});
	}

	//Join room, send over username 
	function sendUsername(newRoom) {
		if(newRoom == null)
			newRoom = currentRoom;
		var password = document.getElementById("chatRoomPassword").value;
		socketio.emit("user_logged_in", {name:username, room:newRoom, password:password,currentRoom:currentRoom})
	}



	/*//When someone joins a room, add it to the members div
	socketio.on("user_joined_room", function(data) {
		roomNameFS = data["room"];
		if(currentRoom == roomNameFS) {
			users = data["users"];
			for(var i = 0; i < users.length; i++) {
			}
		}
	});*/

	//Remove person from room 
	socketio.on("user_to_be_removed", function(data) {
		var userToRemove = data["username"];
		var roomRemove = data["removealRoom"];

		if(roomRemove == currentRoom && username == userToRemove) {
			currentRoom = "lobby";
			document.getElementById("currentRoomTag").innerHTML = "You are in: lobby";
			$("#currentRoomTag").fadeIn(1000).fadeOut(1000).fadeIn(1000).fadeOut(1000).fadeIn(1000);
			$("chatlog").empty();
			socketio.emit("user_leaves_room", {user:username,room:roomRemove})
			sendUsername("lobby");
		}
	});

	//When user denied entry due to ban
	socketio.on("user_denied", function(data) {
		var banNotice = document.createElement("p");
		var text = document.createTextNode("YOU HAVE BEEN BANNED FROM THIS ROOM");
		banNotice.appendChild(text);
		banNotice.setAttribute("id", "banNotice");
		banNotice.style.color = "red";
		banNotice.fontSize = "xx-large";
		document.getElementById("header").appendChild(banNotice);
		$("#banNotice").fadeOut(2000, function() {
			$("#banNotice").remove();
		});
	});

	socketio.on("user_denied_pass", function(data) {
		var banNotice = document.createElement("p");
		var text = document.createTextNode("YOU HAVE ENTERED INCORRECT PASSWORD");
		banNotice.appendChild(text);
		banNotice.setAttribute("id", "banNotice");
		banNotice.style.color = "red";
		banNotice.fontSize = "xx-large";
		document.getElementById("header").appendChild(banNotice);
		$("#banNotice").fadeOut(2000, function() {
			$("#banNotice").remove();
		});
	});

	//When a new room is created 
	socketio.on("new_room", function(data) {
		var rooms = data["rooms"];
		$('.roomButtons').remove();
		for(var i = 0; i < rooms.length; i++) {
			var button = document.createElement("button");
			var room = rooms[i];
			button.setAttribute("id", room);

			var div = document.createElement("div");
			var buttonText = document.createTextNode(rooms[i]);
			button.appendChild(buttonText);
			button.setAttribute("class", "roomButtons");

			button.addEventListener("click", function(event) {
				currentRoomOld = currentRoom;
				// currentRoom = this.id;
				// document.getElementById("currentRoomTag").innerHTML = "You are in : " + currentRoom.toUpperCase();
				// $("#currentRoomTag").fadeIn(1000).fadeOut(1000).fadeIn(1000).fadeOut(1000).fadeIn(1000);
				sendUsername(this.id);
				$("chatlog").empty();
			});

			document.getElementById("chatrooms").appendChild(div);
			document.getElementById("chatrooms").appendChild(button);
		}
	});

	socketio.on("room_change_success", function(data){
		var user = data["user"];
		var oldRoom = data["oldRoom"];
		if(user == username) {
			var newRoom = data["room"];
			currentRoom = newRoom;
			document.getElementById("currentRoomTag").innerHTML = "You are in: " + currentRoom.toUpperCase();
			$("#currentRoomTag").fadeIn(1000).fadeOut(1000).fadeIn(1000).fadeOut(1000).fadeIn(1000);
			if(oldRoom != currentRoom)
				socketio.emit("user_leaves_room", {user:username,room:oldRoom})
		}
	});

	//Function to setup page after user picks a username 
	function addChatInfra() {

		//the chat box
		var chatBox = document.createElement("input");
		chatBox.setAttribute("id", "chatbox");
		document.getElementById("chatlog").appendChild(chatBox);

		//*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
		var typingTimer;                
		var doneTypingInterval = 2000;  //time in ms, 2 secs
		var $input = $('#chatbox');

		//on keyup, start the countdown
		$input.on('keyup', function () {
			clearTimeout(typingTimer);
			typingTimer = setTimeout(doneTyping, doneTypingInterval);
		});

		//on keydown, clear the countdown 
		$input.on('keydown', function () {
			clearTimeout(typingTimer);
			if($("#typing_text").is(":visible") == false) {
				socketio.emit("typing_happening", {username:username, room:currentRoom});
			}
		});

		socketio.on("typing_add", function(data) {
			name = data["name"];
			room = data["room"];
			if(room == currentRoom && $("#typing_text").is(":visible") == false) {
				var text = document.createElement("p");
				var textForText = document.createTextNode(name + " is typing...");
				text.appendChild(textForText);
				text.setAttribute("id", "typing_text");
				document.getElementById("chatlog").appendChild(text);
			}
		});

		//user is "finished typing," do something
		function doneTyping () {
			socketio.emit("done_typing", {room:currentRoom});
		}

		socketio.on("typing_delete",function(data) {
			if(data["room"] == currentRoom)
				$("#typing_text").remove();
		});



		//*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-

		//the send button
		var button = document.createElement("button");
		var text = document.createTextNode("Submit");
		button.setAttribute("id", "submitButton");
		button.appendChild(text);
		document.getElementById("chatlog").appendChild(button);
		document.getElementById("chatlog").appendChild(document.createElement('br'));


		//Div for adding and managing chat rooms
		var textChatRoom = document.createElement("p");
		textChatRoom.innerHTML = "Create your own chat room!";

		var chatRoomName = document.createElement("input");
		chatRoomName.setAttribute("id", "chatRoomNameInput");
		chatRoomName.placeholder = "Chat Room Name";

		var chatRoomPassword = document.createElement("input");
		chatRoomPassword.setAttribute("type","password");
		chatRoomPassword.placeholder = "Optional Password";
		chatRoomPassword.setAttribute("id", "chatRoomPassword");

		var createChatRoomButton = document.createElement("button");
		createChatRoomButton.setAttribute("id", "addChatRoomButton");
		var textAddChatRoomButton = document.createTextNode("Create Chat Room");
		createChatRoomButton.appendChild(textAddChatRoomButton);
		$('#addChatRoomButton').append('<p>Click on button to join new room</p>');

		var privateInput = document.createElement("input");
		privateInput.setAttribute("id", "privateInput");
		privateInput.placeholder = ("Send PM to selected uer");
		var buttonSendPrivate = document.createElement("button");
		var textForPrivButton = document.createTextNode("Send PM To SLCT Usr");
		buttonSendPrivate.appendChild(textForPrivButton);

		var pmDropDown = document.createElement("SELECT");
		pmDropDown.setAttribute("id", "pmdropdown");

		buttonSendPrivate.addEventListener("click", function() {
			var user = username;
			var userToSendMessageTo = $('#pmdropdown :selected').text();
			var msg = document.getElementById("privateInput").value;
			socketio.emit("broadcast_to_server", {sender:username,recp:userToSendMessageTo,msg:msg});
		});

		//Adding elements to dom
		document.getElementById("chatrooms").appendChild(textChatRoom);
		document.getElementById("chatrooms").appendChild(chatRoomName);
		document.getElementById("chatrooms").appendChild(document.createElement("br"));
		document.getElementById("chatrooms").appendChild(chatRoomPassword);
		document.getElementById("chatrooms").appendChild(document.createElement("br"));
		document.getElementById("chatrooms").appendChild(createChatRoomButton);
		document.getElementById("chatrooms").appendChild(document.createElement("hr"));
		document.getElementById("chatrooms").appendChild(privateInput);
		document.getElementById("chatrooms").appendChild(buttonSendPrivate);
		document.getElementById("chatrooms").appendChild(pmDropDown);
		document.getElementById("chatrooms").appendChild(document.createElement("hr"));

		var memberTitle = document.createElement("p");
		var memberTitleText = document.createTextNode("Members");
		memberTitle.appendChild(memberTitleText);
		document.getElementById("members").appendChild(memberTitle);

		var member = document.createElement("ul");
		member.setAttribute("id", "list");
		document.getElementById("members").appendChild(member);

		document.getElementById("chatlog").style.visibility = 'visible';
		document.getElementById("members").style.visibility = 'visible';
		document.getElementById("chatrooms").style.visibility = 'visible';

		sendUsername(null);

		document.getElementById("addChatRoomButton").addEventListener("click", function() {
			$("#chatRoomPassword").empty();
			createNewChatRoom();
		});

		document.getElementById("submitButton").addEventListener("click", function() {
			sendMessage();
		}, false);
	}

	//Creates a new room
	function createNewChatRoom() {
		var chatRoomName = document.getElementById("chatRoomNameInput").value;
		var password = document.getElementById("chatRoomPassword").value;
		document.getElementById("currentRoomTag").innerHTML = "You are in : " + chatRoomName.toUpperCase();
		$("#currentRoomTag").fadeIn(1000).fadeOut(1000).fadeIn(1000).fadeOut(1000).fadeIn(1000);
		currentRoomOld = currentRoom;
		currentRoom = chatRoomName;
		var owner = username;
		socketio.emit("user_leaves_room", {user:username,room:currentRoomOld})
		socketio.emit("create_new_chat_room", {roomName:chatRoomName, mod: owner, password:password});
		sendUsername(null);
		$("chatlog").empty();
	}

	socketio.on("cannot_delete_self", function() {
		alert("Cannot delete self");
	});

	socketio.on("broadcast", function(data) {
		var msg = data["msg"];
		var to = data["to"];
		var from = data["from"];

		if(to == username) {
			var toEmit = "PM From " + from + ": " + msg;
			alert(toEmit);
		}
	});

});

</script>
</head>

<body>

	<strong id = "currentRoomTag"></strong>

	<h1 id = "header" style="color:white">Chat Server</h1>
	<input type="text" id="username" class = "login" placeholder="Username" />

	<button type="button" id = "submitUsername" class = "login">Login</button>
	<div id="chatlog"></div>

	<div id = "chatrooms"></div>

	<div id = "members"></div>

</body>

</html>
