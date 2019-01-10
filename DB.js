'use strict';
/* ==========Модуль для работы с даными из БД=========== */

var mysql = require('mysql'), //подключение библиотеки для работы с mysql
  clc = require('cli-color'), //подключение библиотеки для выдления цветом в терминале
  Q = require('q'), //подклчение бибилиотеки для работы с promise
  moment = require('moment'), //подключение momentjs
  _ = require('lodash'), //библиотека для работы с массивами
  async = require('async'); //библиотека для асинхронной работы
moment.locale('ru'); //указание локации у moment js

/* указываем параметры соединения с БД */
var DB = mysql.createConnection({
  host: '10.50.0.127', //адрес сервера БД
  user: 'userScales', //имя пользователя БД
  password: 'scales', //пароль пользователя БД
  database: 'scales' //имя БД
});

const arrTypeScales = ['netto', 'brutto']; //создание массива с типоами весов

module.exports.DB = DB; //делаем модуль экспортным
DB.connect(); //устанавливаем соединение с БД
handleDisconnect(DB); //поддержка постоянного соединения с БД

/* поддержка постоянного соединения с БД */
function handleDisconnect(client) {
  client.on('error', error => {
    console.log(error)
    if (!error.fatal) return;
    if (error.code !== 'PROTOCOL_CONNECTION_LOST') throw err;
    DB = mysql.createConnection(client.config);
    handleDisconnect(DB);
    DB.connect();
  });
}

/* обработка ошибок запросов */
function DefineError(err, FuncName) {
  if (err)
    throw console.log(
      clc.red(
        moment().format('LLL') +
        ' Произошла ошибка:' +
        err +
        '\n' +
        'в функции: ' +
        FuncName
      )
    );
}

/* получение емен весов */
exports.GetNameScales = callback => {
  var sql = 'SELECT DISTINCT name FROM AdressScales'; //формирование звапроса
  DB.query(sql, (err, rows) => { //выполнение запроса
    DefineError(err, 'GetNameScales'); //обрабока ошибок
    callback(rows); //возвратрезультата в callback
  })
}

//TODO
/* получение  группированных вагонов у составов по дням на весах*/
exports.GetSostavGroupOfVagonsForDay = async (params, callback) => {
  FillArr(params).then(res => {
    callback(res)
  })

/* обход типов весов */
  function FillArr(params) {
    var result = Q.defer(); //создание promise
    var arr = [];//новый массив
    var sql = 'SELECT date_format(DateTimeOp, "%Y-%m-%d %H:%i") as DateTimeOp, MAX(NumVagons),  SUM(Mass) FROM DataScales WHERE (DateTimeOp BETWEEN ? AND ?) AND CountWagons>4 AND Scales=? AND typeScales=? GROUP BY DateTimeOp';  //формирование запроса
    arrTypeScales.forEach(async (typeScaels, ind)=> {
      var value = await params; //формирование значений для параметров
      value[3] = await typeScaels;
      sql = await DB.format(sql, value); //формирование sql запроса со значениями для параметров
      var Obj = {};
      /*     Obj.NameScales = NameScales;
          Obj.typeScaels = typeScaels;  */
      Obj.Sql = await sql;  
      await arr.push(Obj);
      if (ind == arrTypeScales.length-1) {
        result.resolve(arr);
      }
    })
    return result.promise;
  }
}