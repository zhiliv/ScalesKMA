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

const arrTypeScales = ['brutto', 'netto']; //создание массива с типоами весов

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
  FillArr(params).then(res => { //Обход массива типов весов
    CompareDataScales(res)
    //callback(res) //возврат результата в callback
  })

  /* обход типов весов */
  function FillArr(params) {
    var result = Q.defer(); //создание promise
    var arr = []; //новый массив
    var sql = 'SELECT date_format(DateTimeOp, "%Y-%m-%d %H:%i") as DateTimeOp, MAX(NumVagons) as CountVagons,  SUM(Mass) as Mass FROM DataScales WHERE (DateTimeOp BETWEEN ? AND ?) AND CountWagons>4 AND Scales=? AND typeScales=? GROUP BY DateTimeOp'; //формирование запроса
    arrTypeScales.forEach(async (typeScaels, ind) => {
      var value = await [params.DateTimeStart, params.DateTimeEnd, params.NameScales, typeScaels]
      sql = await DB.format(sql, value); //формирование sql запроса со значениями для параметров
      var Obj = {}; //создание нового объекта
      Obj.NameScales = params.NameScales; //доабвление в объект имени весов
      Obj.typeScaels = typeScaels; //добалвние в объект типа весов
      await ExecuteQery(sql).then(async res => { //выполнение 
        Obj.List = res; //доабвлекние в объеккт результата запроса
        await arr.push(Obj); //добавление объекта в массив
      })
      if (ind == arrTypeScales.length - 1) { //првоерка на последнее выполенение 
        result.resolve(arr); //доабвление 
      }
    })
    return result.promise; //возврат результата в promise
  }

  /* выполнение запроса */
  function ExecuteQery(sql) {
    var result = Q.defer(); //создание promise
    DB.query(sql, async (err, rows) => { //выполнение sql зарпоса
      result.resolve(rows); //доабвление результата в promise
    })
    return result.promise; //возврат результата в promise
  }

  /* перебор массивов для формирования выходных данных */
  function CompareDataScales(ArrDataOfScales) {
    var arrConformity = []; //создаем массив для хранения данных которые соответствуют(брутто /нетто) по времени
    var arrBrutto = []; //создание массива для хренения веса БРУТТО
    var arrNetto = []; //создане массива для ранения НЕТТО
    ArrDataOfScales.forEach(async row => { //ассинхронный обход массива 
      let typeScaels = row.typeScaels; //объявляем тип весов
      if (typeScaels == 'brutto') { //првоерка типа весов
        arrBrutto = row.List; //присвоние данных массиву
      }
      if (typeScaels == 'netto') { //првоерка типа весов
        arrNetto = row.List; //присвоние данных массиву
      }
    })
    arrBrutto.forEach(async (rowBrutto, indBrutto) => {
      console.log(rowBrutto)
      var DateOpBrutto = rowBrutto.DateTimeOp;
      var CountVagonsBrutto = rowBrutto.CountVagons;
      var MassBrutto = rowBrutto.Mass;
      arrNetto.forEach(async (rowNetto, indNetto) => {
        var DateOpNetto = rowNetto.DateTimeOp;
        var CountVagonsNetto = rowNetto.CountVagons;
        var MassNetto = rowNetto.Mass;
        
      })
    })

  }
}