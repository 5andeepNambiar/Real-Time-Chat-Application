require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const harperSaveMessage = require('./services/harper-save-message');
const harperGetMessages = require('./services/harper-get-messages');
const leaveRoom = require('./utils/leave-room');

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

class MessageSender {
  constructor(id, username, room) {
    this.id = id;
    this.username = username;
    this.room = room;
  }

  sendMessage(socket, message, username, room) {
    const __createdtime__ = Date.now();
    socket.to(room).emit('receive_message', {
      message,
      username: this.username
    });
  }
}

class User extends MessageSender {
  constructor(id, username, room) {
    super(id, username, room);
  }
}

class ChatBot extends MessageSender {
  constructor() {
    super('chatbot-id', 'ChatBot', 'common-room');
  }

  static getInstance() {
    if (!ChatBot.instance) {
      ChatBot.instance = new ChatBot();
    }
    return ChatBot.instance;
  }
}

class ChatRoomManager {
  constructor() {
    if (!ChatRoomManager.instance) {
      this.allUsers = [];
      ChatRoomManager.instance = this;
    }
    return ChatRoomManager.instance;
  }

  addUser(user) {
    this.allUsers.push(user);
  }

  removeUser(userId) {
    this.allUsers = this.allUsers.filter((user) => user.id !== userId);
  }

  getAllUsers() {
    return this.allUsers;
  }
}

const chatRoomManager = new ChatRoomManager();
const chatBot = ChatBot.getInstance();

io.on('connection', (socket) => {
  console.log(`User connected ${socket.id}`);

  socket.on('join_room', (data) => {
    const { username, room } = data;
    socket.join(room);

    chatBot.sendMessage(socket, `${username} has joined the chat room`,username,room);

    socket.emit('receive_message', {
        message: `Welcome ${username}`,
        username: chatBot.username,
        __createdtime__: Date.now(),
      });

    chatRoomManager.addUser(new User(socket.id, username, room));
    const chatRoomUsers = chatRoomManager.getAllUsers().filter((user) => user.room === room);
    socket.to(room).emit('chatroom_users', chatRoomUsers);
    socket.emit('chatroom_users', chatRoomUsers);

    harperGetMessages(room)
      .then((last100Messages) => {
        socket.emit('last_100_messages', last100Messages);
      })
      .catch((err) => console.log(err));
  });

  socket.on('send_message', (data) => {
    const { message, username, room, __createdtime__ } = data;
    io.in(room).emit('receive_message', data);
    harperSaveMessage(message, username, room, __createdtime__)
      .then((response) => console.log(response))
      .catch((err) => console.log(err));
  });

  socket.on('leave_room', (data) => {
    const { username, room } = data;
    socket.leave(room);

    chatBot.sendMessage(socket, `${username} has left the chat room`,username,room);

    chatRoomManager.removeUser(socket.id);
    const chatRoomUsers = chatRoomManager.getAllUsers().filter((user) => user.room === room);
    socket.to(room).emit('chatroom_users', chatRoomUsers);
    console.log(`${username} has left the chat`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected from the chat');
    const user = chatRoomManager.getAllUsers().find((user) => user.id === socket.id);
    if (user?.username) {
      chatRoomManager.removeUser(socket.id);
      const chatRoomUsers = chatRoomManager.getAllUsers().filter((u) => u.room === user.room);
      socket.to(user.room).emit('chatroom_users', chatRoomUsers);
      socket.to(user.room).emit('receive_message', {
        message: `${user.username} has disconnected from the chat.`,
      });
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
