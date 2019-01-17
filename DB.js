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
	database: 'scales', //имя БД
});

module.exports.DB = DB; //делаем модуль экспортным
DB.connect(); //устанавливаем соединение с БД
handleDisconnect(DB); //поддержка постоянного соединения с БД

/* ПОДДЕРЖКА ПОСТОЯННОГО СОЕДИНЕНИЯ С БД */
function handleDisconnect(client) {
	client.on('error', error => {
		console.log(error);
		if (!error.fatal) return;
		if (error.code !== 'PROTOCOL_CONNECTION_LOST') throw err;
		DB = mysql.createConnection(client.config);
		handleDisconnect(DB);
		DB.connect();
	});
}

/* ОБРАБОТКА ОШИБОК ЗАПРОСОВ */
function DefineError(err, FuncName) {
	if (err)
		throw console.log(clc.red(moment().format('LLL') + ' Произошла ошибка:' + err + '\n' + 'в функции: ' + FuncName)); //вывод сообщения
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

//TODO
/* ПОЛУЧЕНИЕ  ГРУППИРОВАННЫХ ВАГОНОВ У СОСТАВОВ ПО ДНЯМ НА ВЕСАХ */
exports.GetSostavGroupOfVagonsForDay = async (params, callback) => {
	FillArr(params).then(ArrInitial => {
		//Обход массива типов весов
		GetArrDate(ArrInitial).then(arrDate => {
			//получение массива дат(по дням)
			GetArrDateDay(arrDate, params.DateTimeEnd).then(ResArrDate => {
				//получение массива уникальных дней
				FillArrDate(ResArrDate, params.NameScales).then(DataScales => {
					//объод массива с уникальными днями
					CheckSostavOfTime(DataScales).then(res => {
						console.log('finish');
						callback(res);
					});
				});
			});
		});
	});

	/* Проверка соответствия составо и времени */
	function CheckSostavOfTime(DataScales) {
		var result = Q.defer();
		var arrResult = [];
		var arrBrutto = DataScales.Brutto;
		var arrNetto = DataScales.Netto;
		arrBrutto.forEach(async (rowBrutto, indRowBrutto) => {
			var DateStartBrutto = rowBrutto[0].DateTimeStart;
			var FndInd = -1;
			FndInd = arrNetto.findIndex(rowNetto => {
				var DateStartNetto = rowNetto[0].DateTimeStart;
				if (DateStartNetto == DateStartBrutto) {
					return true;
				}
			});

			if (FndInd != -1) {
				//console.log('ind', FndInd);
				var ListBrutto = rowBrutto[0].List;
				var ListNetto = arrNetto[FndInd][0].List;
				ListBrutto.forEach((rowListBrutto, indLitBrutto) => {
					var DateTimeOpBruttoCompare = rowListBrutto.DateTimeOp;
					var CountVagonsBrutto = rowListBrutto.CountVagons;
					var FndIndListRow = -1;
					FndIndListRow = ListNetto.findIndex(rowListNetto => {
						var DateTimeOpNettoCompare = rowListNetto.DateTimeOp;
						var CountVagonsNetto = rowListNetto.CountVagons;
						//console.log('​CheckSostavOfTime -> rowListNetto', rowListNetto);
						for (var tmr = 2; tmr <= 12; tmr++) {
							var DateOpNettoAdd = moment(DateTimeOpNettoCompare)
								.add(tmr, 'minutes')
								.format('YYYY-MM-DD HH:mm');
							if (DateTimeOpBruttoCompare == DateOpNettoAdd && CountVagonsBrutto == CountVagonsNetto) {
								return true;
							}
						}
					});
					if (FndIndListRow != -1) {
						var Obj = {};
						Obj.Brutto = rowListBrutto;
						Obj.Netto = ListNetto[FndIndListRow];
						console.log(Obj);
						arrResult.push(Obj);
					}
				});
			}
			if (indRowBrutto == arrBrutto.length - 1) {
				result.resolve(arrResult);
			}
		});
		return result.promise;
	}

	/* ОБХОД ТИПОВ ВЕСОВ */
	async function FillArr(params) {
		var result = Q.defer(); //создание promise
		var arr = []; //новый массив
		var sql =
			'SELECT date_format(DateTimeOp, "%Y-%m-%d %H:%i") as DateTimeOp, MAX(NumVagons) as CountVagons,  SUM(Mass) as Mass FROM DataScales WHERE (DateTimeOp BETWEEN ? AND ?) AND CountWagons>4 AND Scales=? AND typeScales=? GROUP BY DateTimeOp'; //формирование запроса
		var value = [params.DateTimeStart, params.DateTimeEnd, params.NameScales, 'brutto'];
		sql = await DB.format(sql, value); //формирование sql запроса со значениями для параметров
		console.log('​FillArr -> sql', sql);
		var Obj = {}; //создание нового объекта
		Obj.NameScales = params.NameScales; //доабвление в объект имени весов
		Obj.typeScaels = 'brutto'; //добалвние в объект типа весов
		await ExecuteQery(sql).then(async res => {
			//выполнение
			Obj.List = res; //доабвлекние в объеккт результата запроса
			await arr.push(Obj); //добавление объекта в массив
		});
		await result.resolve(arr); //доабвление
		return result.promise; //возврат результата в promise
	}

	/* ОБХОД МАССИВА С ДАТАМИ */
	function FillArrDate(ArrDate, NameScales) {
		var result = Q.defer(); //создание promise
		var res = {}; //создание объекта для хранения разуьтата
		var arrBrutto = []; //массив для хранения результата "Брутто"
		var arrNetto = []; //массив для хранения результата "Нетто"
		ArrDate.forEach(async (row, ind) => {
			//объод массива дат
			await GetDataBruttoOfPeriod(row.StartDay, row.EndDay, NameScales).then(async bruttoDate => {
				//получение данных по "Брутто"
				await arrBrutto.push(bruttoDate); //добавление результата в массив
			});
			await GetDataNettoOfPeriod(row.StartDay, row.EndDay, NameScales).then(async NettoDate => {
				//получение данных по "Нетто"
				await arrNetto.push(NettoDate); //добавление результата в массив
			});
			if (ind == ArrDate.length - 1) {
				//проверка на последиее значение массива
				res.Brutto = arrBrutto; //добавление в объект массива "Брутто"
				res.Netto = arrNetto; //добавление в объект массива "Нетто"
				result.resolve(res);
			}
		});
		return result.promise;
	}

	/* ПОЛУЧЕНИЕ ДАННЫХ С ВЕСОВ БРУТТО ЗА ПЕРИОД */
	async function GetDataBruttoOfPeriod(DateTimeStart, DateTimeEnd, NameScales) {
		var result = Q.defer(); //создание promise
		var arr = []; //новый массив
		var sql =
			'SELECT date_format(DateTimeOp, "%Y-%m-%d %H:%i") as DateTimeOp, MAX(NumVagons) as CountVagons,  SUM(Mass) as Mass FROM DataScales WHERE (DateTimeOp BETWEEN ? AND ?) AND CountWagons>4 AND Scales=? AND typeScales=? GROUP BY DateTimeOp'; //формирование запроса
		var value = [DateTimeStart, DateTimeEnd, NameScales, 'brutto'];
		sql = await DB.format(sql, value); //формирование sql запроса со значениями для параметров
		var Obj = {}; //создание нового объекта
		Obj.NameScales = params.NameScales; //доабвление в объект имени весов
		Obj.typeScaels = 'brutto'; //добалвние в объект типа весов
		Obj.DateTimeStart = DateTimeStart; //дата начала
		Obj.DateTimeEnd = DateTimeEnd; //дата окончания
		await ExecuteQery(sql).then(async res => {
			//выполнение
			Obj.List = res; //доабвлекние в объеккт результата запроса
			await arr.push(Obj); //добавление объекта в массив
		});
		await result.resolve(arr); //доабвление
		return result.promise; //возврат результата в promise
	}

	/* ПОЛУЧЕНИЕ ДАННЫХ С ВЕСОВ БРУТТО ЗА ПЕРИОД */
	async function GetDataNettoOfPeriod(DateTimeStart, DateTimeEnd, NameScales) {
		var result = Q.defer(); //создание promise
		var arr = []; //новый массив
		var sql =
			'SELECT date_format(DateTimeOp, "%Y-%m-%d %H:%i") as DateTimeOp, MAX(NumVagons) as CountVagons,  SUM(Mass) as Mass FROM DataScales WHERE (DateTimeOp BETWEEN ? AND ?) AND CountWagons>4 AND Scales=? AND typeScales=? GROUP BY DateTimeOp'; //формирование запроса
		var value = [DateTimeStart, DateTimeEnd, NameScales, 'netto'];
		sql = await DB.format(sql, value); //формирование sql запроса со значениями для параметров
		var Obj = {}; //создание нового объекта
		Obj.NameScales = params.NameScales; //доабвление в объект имени весов
		Obj.typeScaels = 'brutto'; //добалвние в объект типа весов
		Obj.DateTimeStart = DateTimeStart; //дата начала
		Obj.DateTimeEnd = DateTimeEnd; //дата окончания
		await ExecuteQery(sql).then(async res => {
			//выполнение
			Obj.List = res; //доабвлекние в объеккт результата запроса
			await arr.push(Obj); //добавление объекта в массив
		});
		await result.resolve(arr); //доабвление
		return result.promise; //возврат результата в promise
	}

	/* ВЫПОЛНЕНИЕ ЗАПРОСА */
	function ExecuteQery(sql) {
		var result = Q.defer(); //создание promise
		DB.query(sql, async (err, rows) => {
			//выполнение sql зарпоса
			result.resolve(rows); //доабвление результата в promise
		});
		return result.promise; //возврат результата в promise
	}

	/* ПОЛУЧЕНИЕ МАССИВА ДАТ */
	function GetArrDate(List) {
		var result = Q.defer(); //создание promise
		var arrDate = []; //создание масива дляхранения дат
		var Listdate = List[0].List; //исходный массив дат
		Listdate.forEach(async (rowBrutto, indBrutto) => {
			//обход значений массива
			await arrDate.push(rowBrutto.DateTimeOp); //добавление в массив строки
			if (indBrutto == List.length - 1) {
				//првоерка последней строки
				result.resolve(arrDate); //добавлние рузльтата в promise
			}
		});
		return result.promise; //возврат результата в promise
	}

	/* ПОЛУЧЕНИЕ МАССИВА УНИКАЛЬНЫХ ДНЕЙ*/
	async function GetArrDateDay(List, DateTimeEnd, DateTimeStart) {
		var result = Q.defer(); //создание promise
		var arrDate = []; //массив для хранения результата
		var BeginDate = ''; //дата начала
		await List.forEach(async (row, indRow) => {
			//обход массива
			if (indRow == 0) {
				BeginDate = moment(new Date(row)).format('YYYY-MM-DD HH:mm'); //начало дня
			}
			var EndDate = moment(new Date(row))
				.endOf('day')
				.format('YYYY-MM-DD HH:mm'); //начало дня
			var StartDay = moment(new Date(row))
				.startOf('day')
				.format('YYYY-MM-DD HH:mm'); //начало дня
			var ind = arrDate
				.map(row => {
					return row.StartDay;
				})
				.indexOf(StartDay); //поиск в массиве элементов
			if (ind == -1) {
				var Obj = {}; //создание новго объекта
				Obj.StartDay = StartDay; //добавление даты начала
				Obj.EndDay = EndDate; //добавление даты окончания
				await arrDate.push(Obj); //добавление объекта в массив
			}
			if (indRow == List.length - 1) {
				//проверка на последнюю запись в массиве
				arrDate = ChangeDateRow(arrDate, BeginDate, DateTimeEnd); //переформирование объектов массива
				result.resolve(arrDate); //добавление результата в promise
			}
		});
		return result.promise; //возврат результата в promise
	}

	/* ДОБАВЛЕНИЕ ДАТЫ НАЧАЛА И КОНЦА В ПЕРВУЮ И ПОСЕЛДНЮЮ СТРОКУ */
	function ChangeDateRow(arrDate, BeginDate, EndDate) {
		arrDate[0].StartDay = BeginDate; //изменение даты начала в первой строке
		arrDate[arrDate.length - 1].EndDay = EndDate; //зименение даты окончания в последней строке
		return arrDate; //возврат результата
	}

	/*  */
};

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
