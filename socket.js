'use strict';
/* ***модуль обработки событий socket *** */
var AdrServ = process.argv[2];
var io = require('socket.io')(server); //подулючаем socket.io

io.on('connection', socket => {
  socket.emit('AdrServ', AdrServ); //отправка клиенту адерса сервера

})

