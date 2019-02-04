'use strict';
/* ==========Модуль для работы с даными из БД=========== */

var mysql = require('mysql'), //подключение библиотеки для работы с mysql
  clc = require('cli-color'), //подключение библиотеки для выдления цветом в терминале
  Q = require('q'), //подклчение бибилиотеки для работы с promise
  moment = require('moment'), //подключение momentjs
  underscore = require('underscore'), //библиотека для работы с массивами
  async = require('async'); //библиотека для асинхронной работы
moment.locale('ru'); //указание локации у moment js

/* указываем параметры соединения с БД */
var DB = mysql.createConnection({
  host: '10.50.0.127', //адрес сервера БД
  user: 'userScales', //имя пользователя БД
  password: 'scales', //пароль пользователя БД
  database: 'scales', //имя БД
});

module.exports.DB = DB; //делаем модуль экспортным
try {
  DB.connect(); //устанавливаем соединение с БД
} catch (err) {
  console.log('Переподключение к БД');
}
handleDisconnect(DB); //поддержка постоянного соединения с БД

/* ПОДДЕРЖКА ПОСТОЯННОГО СОЕДИНЕНИЯ С БД */
function handleDisconnect(client) {
  client.on('error', error => {
    if (!error.fatal) return;
    //if (error.code !== 'PROTOCOL_CONNECTION_LOST') throw err;
    DB = mysql.createConnection(client.config);
    handleDisconnect(DB);
    DB.connect();
  });
}

/* ОБРАБОТКА ОШИБОК ЗАПРОСОВ */
function DefineError(err, FuncName) {
  if (err)
    console.log(clc.red(moment().format('LLL') + ' Произошла ошибка:' + err + '\n' + 'в функции: ' + FuncName)); //вывод сообщения
  handleDisconnect(DB)
}

/* ПОЛУЧЕНИЕ ИМЕН ВЕСОВ */
exports.GetNameScales = callback => {
  var sql = 'SELECT DISTINCT name FROM AdressScales'; //формирование звапроса
  DB.query(sql, (err, rows) => {
    //выполнение запроса
    DefineError(err, 'GetNameScales'); //обрабока ошибок
    callback(rows); //возвратрезультата в callback
  });
};


/* ОБХОД ТИПОВ ВЕСОВ */
exports.FillArr = (params, callback) => {
  var sql =
    'SELECT date_format(DateTimeOp, "%Y-%m-%d %H:%i") as DateTimeOp, MAX(NumVagons) as CountVagons,  SUM(Mass) as Mass FROM DataScales WHERE (DateTimeOp BETWEEN ? AND ?) AND CountWagons>4 AND Scales=? AND typeScales=? GROUP BY DateTimeOp'; //формирование запроса
  var value = [params.DateTimeStart, params.DateTimeEnd, params.NameScales, 'brutto'];
  sql = DB.format(sql, value); //формирование sql запроса со значениями для параметров
  var Obj = {}; //создание нового объекта
  Obj.NameScales = params.NameScales; //доабвление в объект имени весов
  Obj.typeScaels = 'brutto'; //добалвние в объект типа весов
  DB.query(sql, (err, res) => {
    Obj.List = res; //доабвлекние в объеккт результата запроса
    callback(Obj);
  })
}

/* ПОЛУЧЕНИЕ ДАННЫХ С ВЕСОВ БРУТТО ЗА ПЕРИОД */
/*    exports.GetDataBruttoOfPeriod = (DateTimeStart, DateTimeEnd, NameScales) { */
exports.GetDataBruttoOfPeriod = (params, callback) => {
  var sql =
    'SELECT date_format(DateTimeOp, "%Y-%m-%d %H:%i") as DateTimeOp, MAX(NumVagons) as CountVagons,  SUM(Mass) as Mass FROM DataScales WHERE (DateTimeOp BETWEEN ? AND ?) AND CountWagons>4 AND Scales=? AND typeScales=? GROUP BY DateTimeOp'; //формирование запроса
  var value = [params.DateTimeStart, params.DateTimeEnd, params.NameScales, 'brutto'];
  sql = DB.format(sql, value); //формирование sql запроса со значениями для параметров
  var Obj = {}; //создание нового объекта
  Obj.NameScales = params.NameScales; //доабвление в объект имени весов
  Obj.typeScaels = 'brutto'; //добалвние в объект типа весов
  Obj.DateTimeStart = params.DateTimeStart; //дата начала
  Obj.DateTimeEnd = params.DateTimeEnd; //дата окончания
  DB.query(sql, (err, res) => {
    Obj.List = res; //доабвлекние в объеккт результата запроса
    callback(Obj);
  })
}

/* ПОЛУЧЕНИЕ ДАННЫХ С ВЕСОВ БРУТТО ЗА ПЕРИОД */
exports.GetDataNettoOfPeriod = (params, callback) => {
  var sql =
    'SELECT date_format(DateTimeOp, "%Y-%m-%d %H:%i") as DateTimeOp, MAX(NumVagons) as CountVagons,  SUM(Mass) as Mass FROM DataScales WHERE (DateTimeOp BETWEEN ? AND ?) AND CountWagons>4 AND Scales=? AND typeScales=? GROUP BY DateTimeOp'; //формирование запроса
  var value = [params.DateTimeStart, params.DateTimeEnd, params.NameScales, 'netto'];
  sql = DB.format(sql, value); //формирование sql запроса со значениями для параметров
  var Obj = {}; //создание нового объекта
  Obj.NameScales = params.NameScales; //доабвление в объект имени весов
  Obj.typeScaels = 'netto'; //добалвние в объект типа весов
  Obj.DateTimeStart = params.DateTimeStart; //дата начала
  Obj.DateTimeEnd = params.DateTimeEnd; //дата окончания
  DB.query(sql, (err, res) => {
    Obj.List = res; //доабвлекние в объеккт результата запроса
    callback(Obj)
  })
}

/* ПОЛЧЕНИЕ ВРЕМЕНИ ПО СМЕНАМ */
exports.GetTimeSmen = callback => {
  var sql = 'SELECT * FROM Smens';
  DB.query(sql, (err, rows) => {
    callback(rows)
  })
}