'use strict';
/* ==========модуль для работы с сервером и выполнение функций на стороне сервера========= */
var AdrServ = process.argv[2]; //параметр после имени файла указывает на адрес сервера
var PortServ = process.argv[3]; //параметр после адреса сервера - указание порта
var StartParseParams = process.argv[4]; //параметр после порта указывает ключен ли парсинг

const servers = {
  Adress: AdrServ,
  Port: PortServ,
}, //параметры сервера
  express = require ('express'), //подключаем Express
  app = express (), //создаем приложение
  DB = require ('./DB'), //подключаем файл с функциями базы данных
  clc = require ('cli-color'), //подключаем расцветку командной строки
  server = require ('http').Server (app), //создаем сервер
  io = require ('socket.io') (server), //подулючаем socket.io
  Parse = require ('./Parse'), //подключение библиотеки для парсинга xml
  moment = require ('moment'), //бибилотека для работы со временем
  clear = require ('console-clear'), //раскраска терминала
  FN = require ('./BackFunc'), //подключение функци
  $ = require ('jquery'), //подключаем jquery
  async = require ('async'); //библиотека для асинхронной работы
require ('events').EventEmitter.prototype._maxListeners = 10000; //TODO изменить на 300;
moment.locale ('ru'); //установка локации для moment.js

app.use ('/public', express.static ('public')); //используем папку для хранения статичесих фалов

/* ОБРАБОТКА ОТКРЫТИЯ СТРАНИЦЫ */
app.get ('/', function (req, res) {
  res.sendFile (__dirname + '/index.html'); //при открытии страницы index.html
});

/* ЗАПУСК СЕРВЕРА */
exports.StartServer = () => {
  server.listen (servers.Port, servers.Adress, () => {
    //запускаем сервер с адресом и портом
    //указываем параметры сервера
    clear (true); //очистка консоли
    console.log (
      clc.greenBright.bold (
        moment ().format ('LLL') +
          '\nСервер запущен по адресу: http://' +
          servers.Adress +
          ':' +
          servers.Port
      )
    ); //выаод сообщения о запущенном сервере в терминал
    console.log (
      clc.greenBright (
        '■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■' +
          '■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■'
      )
    ); //вывод линии в терминале

    setInterval (() => {
      //запуск сервера через интервал
      if (StartParseParams == 'true') {
        //првоерка параметра при запуске
        StartParse (); //запуск парсинга
      }
    }, 5000);
  });
};

/* ЗАПУСК ПАРСИНГА */
function StartParse () {
  DB.GetNameScales (NameScales => {
    //получение имен весов
    NameScales.forEach ((Scales, ind) => {
      //обход значений
      Parse.FillScales (Scales['Name']); //обход всесов
    });
  });
}

/* ОБРАБОТКА СОКЕТОВ */
io.on ('connection', socket => {
  /* получение всех имен весов */

  /* ПОЛУЧЕНИЕ ГЛАВНОГО ГРАФИКА */
  socket.on ('MainGraphicsApply', (params, callback) => {
    FN.GetMainGraphics (params, res => {
      callback (res); //возврат результата в callback
    });
  });

  /* ПОЛУЧЕНИЕ ОБЩЕЙ МАССЫ ЗА ДЕНЬ */
  socket.on ('GetTotalWeight', (params, callback) => {
    FN.GetTotalWeight (params, res => {
      callback (res); //возврат результата в callback
    });
  });

  /* ПОЛУЧЕНИЕ ИМЕН ВЕСОВ */
  socket.on ('GetNameScales', callback => {
    DB.GetNameScales (res => {
      callback (res); //возврат результата в callback
    });
  });

  /* ПОЛУЧЕННИЕ ДАННЫХ ПО ВЕСАМ ЗА КАЖДЫЙ ЧАС */
  socket.on ('GetDataScalesofHour', (params, callback) => {
    FN.GetDataScalesofHour (params, res => {
      callback (res);
    });
  });

  /* ПОЛУЧЕНИЕ СМЕН ИЗ БД */
  socket.on ('GetTimeSmen', callback => {
    DB.GetTimeSmen (res => {
      callback (res);
    });
  });
});
