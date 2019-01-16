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

/* получение имен весов */
exports.GetNameScales = callback => {
    var sql = 'SELECT DISTINCT name FROM AdressScales'; //формирование звапроса
    DB.query(sql, (err, rows) => { //выполнение запроса
        DefineError(err, 'GetNameScales'); //обрабока ошибок
        callback(rows); //возвратрезультата в callback
    })
}

//TODO
/* получение  группированных вагонов у составов по дням на весах*/
exports.GetSostavGroupOfVagonsForDay = async(params, callback) => {
    FillArr(params).then(ArrInitial => { //Обход массива типов весов
        GetArrDate(ArrInitial).then(arrDate => {
            GetArrDateDay(arrDate)
        })
    })

    /* обход типов весов */
    async function FillArr(params) {
        var result = Q.defer(); //создание promise
        var arr = []; //новый массив
        var sql = 'SELECT date_format(DateTimeOp, "%Y-%m-%d %H:%i") as DateTimeOp, MAX(NumVagons) as CountVagons,  SUM(Mass) as Mass FROM DataScales WHERE (DateTimeOp BETWEEN ? AND ?) AND CountWagons>4 AND Scales=? AND typeScales=? GROUP BY DateTimeOp'; //формирование запроса
        var value = [params.DateTimeStart, params.DateTimeEnd, params.NameScales, 'brutto']
        sql = await DB.format(sql, value); //формирование sql запроса со значениями для параметров
        var Obj = {}; //создание нового объекта
        Obj.NameScales = params.NameScales; //доабвление в объект имени весов
        Obj.typeScaels = 'brutto'; //добалвние в объект типа весов
        await ExecuteQery(sql).then(async res => { //выполнение 
            Obj.List = res; //доабвлекние в объеккт результата запроса
            await arr.push(Obj); //добавление объекта в массив
        })
        await result.resolve(arr); //доабвление 
        return result.promise; //возврат результата в promise
    }

    /* выполнение запроса */
    function ExecuteQery(sql) {
        var result = Q.defer(); //создание promise
        DB.query(sql, async(err, rows) => { //выполнение sql зарпоса
            result.resolve(rows); //доабвление результата в promise
        })
        return result.promise; //возврат результата в promise
    }

    /* получение массива дат */
    function GetArrDate(List) {
        var result = Q.defer(); //создание promise
        var arrDate = []; //создание масива дляхранения дат
        var Listdate = List[0].List; //исходный массив дат 
        Listdate.forEach(async(rowBrutto, indBrutto) => { //обход значений массива
            await arrDate.push(rowBrutto.DateTimeOp); //добавление в массив строки
            if (indBrutto == List.length - 1) { //првоерка последней строки
                result.resolve(arrDate); //добавлние рузльтата в promise
            }
        })
        return result.promise //возврат результата в promise
    }

    /* получение массива уникальных дней */
    async function GetArrDateDay(List) {
        var result = Q.defer(); //создание promise
        var arrDate = []; //массив для хранения результата
        await List.forEach(async(row) => { //обход массива
            var StartDay = moment(new Date(row)).startOf('day').format('YYYY-MM-DD HH:mm'); //начало дня
            var EndDay = moment(new Date(row)).endOf('day').format('YYYY-MM-DD HH:mm'); //начало дня 
            var ind = arrDate.map(row => {
                return row.StartDay
            }).indexOf(StartDay); //поиск в массиве элементов
            if (ind == -1) {
                var Obj = {};
                Obj.StartDay = StartDay;
                Obj.EndDay = EndDay;
                await arrDate.push(Obj)
                    //console.log(StartDay)
            }
        })
        console.log(arrDate)
    }




    /*   var s =arrDate.indexOf(date => {
        date =  moment(new Date(date)).startOf('day').format('YYYY-MM-DD HH:mm');
        date == StartDay;
        console.log('ss')
      }) */


    /*     ArrDataOfScales.forEach(async row => { //ассинхронный обход массива 
      NameScales = row.NameScales; //имя весов
      let typeScaels = row.typeScaels; //объявляем тип весов
      arrBrutto = row.List; //присвоние данных массиву
    });
    arrBrutto.forEach(async (rowBrutto, indBrutto) => { //обход знаений массива Брутто
      var DateOpBrutto = moment(rowBrutto.DateTimeOp).format('YYYY-MM-DD HH:mm'); //дата операции Брутто
      var CountVagonsBrutto = rowBrutto.CountVagons; //количество вагонов Брутто
      var MassBrutto = rowBrutto.Mass; //Масса состава брутто
      var Status = false; //указывает былли ли добавлены данные в массив соответствия
      for (var i = 2; i <= 12; i++) { //цикл для увеличения времени
        var t = arrNetto.findIndex(rowNetto => {
          var DateOpNetto = moment(rowNetto.DateTimeOp).format('YYYY-MM-DD HH:mm'); //дата операции Нетто
          var FindDateTime = moment(DateOpNetto).add(i, 'minutes').format('YYYY-MM-DD HH:mm');
          DateOpNetto == FindDateTime;
        })
        console.log(t)
      }
 */


    /*       arrNetto.filter(rowNetto => {
            var Obj = {};//создание объекта для хранения данных
            var DateOpNetto = moment(rowNetto.DateTimeOp).format('YYYY-MM-DD HH:mm'); //дата операции Нетто
            var CountVagonsNetto = rowNetto.CountVagons; //количество вагонов в составе Нетто
            var MassNetto = rowNetto.Mass; //масса состава Нетто
            for (var i = 2; i <= 12; i++) { //цикл для увеличения времени
              var FindDateTime = moment(DateOpNetto).add(i, 'minutes').format('YYYY-MM-DD HH:mm');
              if((FindDateTime == DateOpBrutto) && (CountVagonsNetto == CountVagonsBrutto)){
                Obj.DatetimeOp = DateOpBrutto;
                Obj.MassBrutto = MassBrutto;
                Obj.MasNetto = MassNetto;
                arrConformity.push(Obj);
                console.log(DateOpBrutto)
                Status = true;
                break;
              }
            }
          }) */




    /*        arrNetto.forEach(async (rowNetto, indNetto) => {
              var Obj = {};//создание объекта для хранения данных
              var DateOpNetto = moment(rowNetto.DateTimeOp).format('YYYY-MM-DD HH:mm'); //дата операции Нетто
              var CountVagonsNetto = rowNetto.CountVagons; //количество вагонов в составе Нетто
              var MassNetto = rowNetto.Mass; //масса состава Нетто
              
              for (var i = 2; i <= 12; i++) { //цикл для увеличения времени
                var FindDateTime = moment(DateOpNetto).add(i, 'minutes').format('YYYY-MM-DD HH:mm');
                if((FindDateTime == DateOpBrutto) && (CountVagonsNetto == CountVagonsBrutto)){
                  Obj.DatetimeOp = DateOpBrutto;
                  Obj.MassBrutto = MassBrutto;
                  Obj.MasNetto = MassNetto;
                  arrConformity.push(Obj);
                  console.log(DateOpBrutto)
                  Status = true;
                  break;
                }
              }
            })  
    }) */
    //callback(arrConformity)

}