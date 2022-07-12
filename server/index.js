"use strict";

const express = require("express");
const app = express();
const socketio = require("socket.io");
const http = require("http");

const cors = require("cors");
const router = require("./router");

const { addUser, removeUser, getUser, getUsersInRoom } = require("./user");

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(router);

const server = http.createServer(app);
const io = socketio(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});

io.on("connection", (socket) => {
	socket.on("join", ({ name, room }, callback) => {
		const { error, user } = addUser({ id: socket.id, name, room });

		if (error) return callback(error);

		// 내가 나 자신에게 보내는 시스템 메세지
		socket.emit("message", {
			user: "admin",
			text: `${user.name}, welcome to the room ${user.room}`,
		});
		socket.broadcast
			.to(user.room)
			.emit("message", { user: "admin", text: `${user.name}, has joined!` });

		socket.join(user.room);

		io.to(user.room).emit("roomData", {
			room: user.room,
			users: getUsersInRoom(user.room),
		});

		callback();
	});

	socket.on("sendMessage", (message, callback) => {
		const user = getUser(socket.id);

		io.to(user.room).emit("message", { user: user.name, text: message });
		io.to(user.room).emit("roomData", {
			room: user.room,
			users: getUsersInRoom(user.room),
		});

		callback();
	});

	socket.on("disconnect", () => {
		const user = removeUser(socket.id);

		if (user) {
			io.to(user.room).emit("message", {
				user: "admin",
				text: `${user.name} has left.`,
			});
		}
	});
});

server.listen(PORT, () => {
	console.log(`SERVER HAS STARTED ON PORT ${PORT}`);
});
