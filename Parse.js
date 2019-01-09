'use strict';
/* Модуль для парсинга XML файлов */

var xml2js = require('xml2js'), //модуль для перевода xml в json
  fs = require('fs'), //модиль для работы с файловой системой
  clc = require('cli-color'),
  moment = require('moment'),
  Q = require('q'),
  express = require('express'), //подключаем Express
  app = express(), //создаем приложение
  DB = require('./DB'),
  server = require('http').Server(app), //создаем сервер
  io = require('socket.io')(server), //подулючаем socket.io
  path = require('path');

var parser = new xml2js.Parser(); //создание нового парсера

/* Получение списка файлов в папке */
function GetListAllFile(DirName) {
  var ListFile = []; //массив для хранения разультатов файлов
  fs.readdirSync(DirName).forEach(FileName => {
    //обход списка файлов
    ListFile.push(FileName); //добавление в массив имени файла
  });
  return ListFile; //возврат результата
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

/* вывод в терминал информации о загруженных файлах */
function TerminalInfoLoadFile(data) {
  console.log(
    clc.yellowBright.bold(
      moment().format() + ' Загружено файлов: ' + String(data)
    )
  );
  console.log(
    clc.yellowBright(
      '■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■' +
      '■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■'
    )
  );
}

/* получение даты в формате DATETIME */
function GetDate(FileName) {
  var DataYear = FileName.substr(0, 4); //получение года
  var DataMonth = FileName.substr(4, 2); //получение месяца
  var DataDay = FileName.substr(6, 2); //получение дня
  var DataHour = FileName.substr(9, 2); //получение часа
  var DataMinute = FileName.substr(11, 2); //получение минут
  var DataSeconds = FileName.substr(13, 2); //получение секунд
  var ParamDate = new Date(
    DataYear,
    DataMonth - 1,
    DataDay,
    DataHour,
    DataMinute,
    DataSeconds
  ); //формирование значени едаты для записи в БД
  return ParamDate;
}

/* удаление прочитанного файла */
function DelFile(DirName, FileName) {
  var FILE = path.join(DirName, FileName);
  fs.unlink(FILE, async err => {
    DefineError(err, 'DelFile');
  });
}

/* получение суммы массы состава */
function GetSummMass(data) {
  var SummMass = 0; //обнуление переменной
  data.forEach(row => {
    //обход значений
    var Massa = row['Massa']; //получение массы
    SummMass += Number(Massa); //добавление массы для получения суммы
  });
  return SummMass; //возврат результата
}

/* посылаем обновление страницы */
function SendUpdateTable(data) {
  io.on('connection', socket => {
    //если установлено соединение по socket
    socket.emit('UpdateDataStatistics', {
      //отправка события с парметром
      data,
    });
  });
}

/* обработка файлов */
function GetDataFile(DirName, TypeScales, Scales, callback) {
  var result = []; //массив для хранения результата
  var ListFile = GetListAllFile(DirName); //получение списка файлов
  ListFile.forEach((FileName, index) => { //обход всех имен файлов
    var ExplansioFile = FileName.substr(FileName.length - 4); //получения расширения фалйа
    if (ExplansioFile == '.xml') { //проверка расширения
      var DateTimeOp = GetDate(FileName); //получение даты взвешивания
      var FILE = path.join(DirName, FileName); //полчение файла
      var contant = fs.readFileSync(FILE); //полчение данных файла
      var XMLResult = {}; //создание объекта с с результатами Xml
      parser.parseString(contant, (err, result) => { //  парсинг данных  
        DefineError(err, 'GetDataFile'); //обработка ошибок
        XMLResult = result; //присвоение обекту начений и свойств
      });
      var jsonObj = {}; //создание объекта с данными
      jsonObj.data = XMLResult; //присваиваем значение полученных из файла
      jsonObj.typeScales = TypeScales; //присваиваем тип весов
      jsonObj.date = DateTimeOp; //присвоение даты
      jsonObj.Sclares = Scales; //присвоение весов
      jsonObj.DirName = DirName; //присвоение дикерктории считывания
      jsonObj.FileName = FileName; //присвоение имени файла
      result.push(jsonObj); //
      DelFile(DirName, FileName);
    }
  });
  if (result.length > 0) {
    TerminalInfoLoadFile(result.length);
  }
  return callback(result);
};

/* получение параметров весов */
exports.FillScales = ScalesAdress => {
  DB.GetNettoAdress([
    [ScalesAdress]
  ], NettoAdress => {
    //получение адреса нетто
    NettoAdress.forEach((rowNettoAdress, index) => {
      //обход всех значений
      var AdressNetto = rowNettoAdress['Adress']; //переменная для адресса нетто
      GetDataFile(AdressNetto, 'netto', ScalesAdress, DataFile => {
        DataFile.forEach((rowDataFile, ind) => {
          //обход данныхз файла
          var DateTimeParse = moment().format('YYYY-MM-DD HH:MM'); //время считывания файла
          var DateTimeWeighing = rowDataFile['date']; //время взвешивания
          var typeScales = rowDataFile['typeScales']; //тип весов
          var CountVagons = 0; //переменная для хранения количества вагонов
          var SummMass = 0; //переменная для хранения суммы массы
          if (rowDataFile['data']['Sostav'] != '') {
            var Vagon = rowDataFile['data']['Sostav']['Vagon'];
            if (Vagon != undefined) {
              //првоерка на пустоту
              SummMass = GetSummMass(Vagon); //получение и присвоенние суммы массы состава
              CountVagons = Vagon.length; //получение и присвоение количества вагонов в составе
              DB.BypassungVagon([DataFile[ind]]); //обход вагонов
            }
          }
          SendUpdateTable({
            DateTimeParse: DateTimeParse, //дата парсинга файла
            DateTimeWeighing: DateTimeWeighing, //дата взвешивания
            CountVagons: CountVagons, //количество вагонов
            SummMass: SummMass, //сумарная масса
            typeScales: typeScales, //тип весов
            ScalesAdress: ScalesAdress, //адрес весов
          }); //посылаем обновление страницы
          DB.InsertStatistics([
            //вставить аднные в таблицу Statistis
            [DateTimeParse], //дата пасинга файла
            [DateTimeWeighing], //дата взвешивания состава
            [CountVagons], //количесто вагонов
            [SummMass], //сумма масс
            [typeScales], //тип весов
            [ScalesAdress], //адрес весов
          ]);
        });
      });
    });
  });

  DB.GetBruttoAdress([
    [ScalesAdress]
  ], BruttoAdress => {
    BruttoAdress.forEach((rowBruttoAdress, index) => {
      //обход значений
      var AdressBrutto = rowBruttoAdress['Adress']; //переменная для адресса брутто
      GetDataFile(AdressBrutto, 'brutto', ScalesAdress, DataFile => {
        //получение всех файлов
        DataFile.forEach((rowDataFile, ind) => {
          var DateTimeParse = moment().format('YYYY-MM-DD HH:MM'); //время считывания файла
          var DateTimeWeighing = rowDataFile['date']; //время взвешивания
          var typeScales = rowDataFile['typeScales']; //тип весов
          var CountVagons = 0; //переменная для хранения количества вагонов в составе
          var SummMass = 0; //переменная для зранения суммы массы
          if (rowDataFile['data']['Sostav'] != '') {
            var Vagon = DataFile[ind]['data']['Sostav']['Vagon'];
            if (Vagon != undefined) {
              //првоерка на пустоту
              SummMass = GetSummMass(Vagon); //получение и присвоенние суммы массы состава
              CountVagons = Vagon.length; //получение и присвоение количества вагонов в составе
              DB.BypassungVagon([rowDataFile]); //обход вагонов
            }
          }
          SendUpdateTable({
            DateTimeParse: DateTimeParse, //дата парсинга файла
            DateTimeWeighing: DateTimeWeighing, //дата взвешивания
            CountVagons: CountVagons, //количество вагонов
            SummMass: SummMass, //сумарная масса
            typeScales: typeScales, //тип весов
            ScalesAdress: ScalesAdress, //адрес весов
          }); //посылаем обновление страницы
          DB.InsertStatistics([
            //вставить аднные в таблицу Statistis
            [DateTimeParse], //дата пасинга файла
            [DateTimeWeighing], //дата взвешивания состава
            [CountVagons], //количесто вагонов
            [SummMass], //сумма масс
            [typeScales], //тип весов
            [ScalesAdress], //адрес весов
          ]);
        });
      });
    });
  });
}