'use strict';
/* ==========Модуль для работы с даными из БД=========== */

var mysql = require ('mysql'), //подключение библиотеки для работы с mysql
  clc = require ('cli-color'), //подключение библиотеки для выдления цветом в терминале
  Q = require ('Q'), //подклчение бибилиотеки для работы с promise
  moment = require ('moment'), //подключение momentjs
  _ = require ('lodash'); //библиотека для работы с массивами
moment.locale ('ru'); //указание локации у moment js

/* указываем параметры соединения с БД */
var DB = mysql.createConnection ({
  host: 'localhost', //адрес сервера БД
  user: 'Scales', //имя пользователя БД
  password: '12345', //пароль БД
  database: 'scales', //имя БД
});

module.exports.DB = DB; //делаем модуль экспортным
DB.connect (); //устанавливаем соединение с БД
handleDisconnect (DB); //поддержка постоянного соединения с БД

/* поддержка постоянного соединения с БД */
function handleDisconnect (client) {
  client.on ('error', error => {
    console.log(error)
    if (!error.fatal) return;
    if (error.code !== 'PROTOCOL_CONNECTION_LOST') throw err;
    DB = mysql.createConnection (client.config);
    handleDisconnect (DB);
    DB.connect ();
  });
}

/* обработка ошибок запросов */
function DefineError (err, FuncName) {
  if (err)
    throw console.log (
      clc.red (
        moment ().format ('LLL') +
          ' Произошла ошибка:' +
          err +
          '\n' +
          'в функции: ' +
          FuncName
      )
    );
}

/* добавление в БД */
function InsertData (value) {
  var sql =
    'INSERT INTO DataScales (DateTimeOp, CountWagons, NumVagons, Mass, Speed, typeScales, Scales) VALUES (?, ?, ?, ?, ?, ?, ?)'; //формирование запроса
  sql = DB.format (sql, value); //присвоение значений параметрам у запроса
  DB.query (sql, err => {
    //выполнение запроса
    DefineError (err, 'InsertData'); //обрабока ошибок
  });
}

/* возвращаем подключенную базу */
exports.connectToDataBase = () => {
  return DB;
};

/* получение имени весов */
exports.GetNameScales = callback => {
  var sql = 'SELECT Name FROM AdressScales GROUP BY Name'; //формирование sql запроса
  DB.query (sql, (err, rows) => {
    //выаполнение запроса
    DefineError (err, 'GetNameScales'); //обрабока ошибок
    callback (rows); //возвратрезультата в callback
  });
};

/* получение адресса нетто по имени весов */
exports.GetNettoAdress = (ScalseAdress, callback) => {
  var sql = 'SELECT * FROM AdressScales WHERE Name=? AND typeScales="netto"';
  var value = [[ScalseAdress]]; //формирование значений для параметров
  sql = DB.format (sql, value); //формирование sql запроса со значениями для параметров
  DB.query (sql, (err, rows) => {
    //выполнение sql запроса
    DefineError (err, 'GetNettoAdress'); //обрабока ошибок
    callback (rows); //возврат результата в callback
  });
};

/* получение адресса брутто по имени весов */
exports.GetBruttoAdress = (ScalseAdress, callback) => {
  var sql = 'SELECT * FROM AdressScales WHERE Name=? AND typeScales="brutto"'; //формирование sql запроса
  var value = [[ScalseAdress]]; //формирование значений для параметров
  sql = DB.format (sql, value); //формирование sql запроса со значениями для параметров
  DB.query (sql, (err, rows) => {
    //выполнение sql запроса
    DefineError (err, 'GetBruttoAdress'); //обрабока ошибок
    callback (rows); //возврат результата в callback
  });
};

/* добавление динных в БД о полученных данных для статистики */
exports.InsertStatistics = params => {
  var sql =
    'INSERT INTO Statistics (DateTimeParse, DateTimeWeighing, CountVagons, SummMass, TypeScale, AdrScales) VALUES (?,?,?,?,?,?)'; //формирование sql запроса
  sql = DB.format (sql, params); //формирование sql запроса со значениями для параметров
  DB.query (sql, err => {
    //выполнение sql запроса
    DefineError (err, 'InsertStatistics'); //обрабока ошибок
  });
};

/* получение послудних 100 срок для вкладки "Статистика получаемых данных" */
exports.AllRows = callback => {
  var sql = 'SELECT * FROM Statistics ORDER BY id DESC LIMIT 100'; //формирование sql запроса
  DB.query (sql, (err, rows) => {
    //выполнение sql запроса
    DefineError (err, 'AllRows'); //обрабока ошибок
    callback (rows); //возврат результата в callback
  });
};

/* получение всех весов */
exports.GetAllScales = () => {
  var result = Q.defer ();
  var sql = 'SELECT DISTINCT Name FROM AdressScales';
  DB.query (sql, (err, rows, fields) => {
    DefineError (err, 'GetAllScales'); //обрабока ошибок
    result.resolve (rows);
  });
  return result.promise;
};

/* обзод значений ваговов */
exports.BypassungVagon = data => {
  data = data[0];
  var Vagon = data['data']['Sostav']['Vagon'];
  var CountWagons = Vagon.length;
  var typeScales = data['typeScales'];
  var dateWeighing = data['date'];
  var Scales = data['Sclares'];
  Vagon.forEach(row => {
    var NvagInSostav = row['NvagInSostav'];
    var Mass = row['Massa'];
    var Speed = row['Speed'];
    InsertData ([
      [dateWeighing],
      [CountWagons],
      [NvagInSostav],
      [Mass],
      [Speed],
      [typeScales],
      [Scales],
    ]);
  })
};
