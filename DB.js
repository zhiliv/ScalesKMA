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
exports.GetSostavGroupOfVagonsForDay = (params, callback) => {
	FillArr(params).then(ArrInitial => {
		//Обход массива типов весов
		GetArrDate(ArrInitial).then(arrDate => {
			//получение массива дат(по дням)
			GetArrDateDay(arrDate, params.DateTimeEnd).then(ResArrDate => {
				//получение массива уникальных дней
				FillArrDate(ResArrDate, params.NameScales).then(DataScales => {
					//объод массива с уникальными днями
					CheckSostavOfTime(DataScales).then(result => {
						callback(result); //возврат результата в callback
					});
				});
			});
		});
	});

	/* ПРОВЕРКА СООТВЕТСТВИЯ СОСТАВF И ВРЕМЕНИ */
	function CheckSostavOfTime(DataScales) {
		var result = Q.defer(); //создние promise
		var arrResult = []; //создание массива
		var arrBrutto = DataScales.Brutto; //массив "Нетто"
		var arrNetto = DataScales.Netto; //массив "Брутто"
		underscore.each(arrBrutto, async (rowBrutto, indRowBrutto) => {
			//объод массива
			var DateStartBrutto = rowBrutto.DateTimeStart; //дата начала
			var ConformityNetto = underscore.findWhere(arrNetto, { DateTimeStart: DateStartBrutto }); //найденный эелмент "Нетто" по времени
			var ListBrutto = rowBrutto.List; //список отгрузок по времени "Брутто"
			var ListNetto = ConformityNetto.List; //список отгрузок по времени "Нетто"
			underscore.each(ListBrutto, rowListBrutto => {
				//обход массива строк "Нетто"
				var DateTimeOpBruttoCompare = rowListBrutto.DateTimeOp; //дата для сравнения
				for (var tmr = 2; tmr <= 12; tmr++) {
					//цикл для добавления времени
					var DateOpNettoAdd = moment(DateTimeOpBruttoCompare)
						.add(tmr, 'minutes')
						.format('YYYY-MM-DD HH:mm'); //добавление 1 минуты к дате
					var ConformityValue = underscore.findWhere(ListNetto, { DateTimeOp: DateOpNettoAdd }); //проверка времени и нахождение элемента
					if (ConformityValue != undefined) {
						//проверка элемента на существование
						var Mass = GetMass(rowListBrutto.Mass, ConformityValue.Mass); //разницы БРУТТО-НЕТТО
						var Obj = {}; //создание объекта
						Obj.Mass = Mass; //добавление суммы массы в объект
						Obj.NameScales = rowBrutto.NameScales; //добавление имени весов в объект
						Obj.Date = moment(ConformityValue.DateTimeOp).format('YYYY-MM-DD'); //добавление даты в объект
						arrResult.push(Obj); //добавление объекта в массив
						break; //прервать цикл for
					}
				}
			});
		});
		result.resolve(GetArrResult(arrResult)); //добавление результата в promise
		return result.promise; //возврат результата в promise
	}

	/* ПОЛУЧЕНИЕ РЕЗУЛЬТАТАНОГО МАССИВА */
	function GetArrResult(arrResult) {
		var arr = []; //создание массива
		var GroupData = underscore.groupBy(arrResult, 'Date'); //группировка элементов по дате
		for (var key in GroupData) {
			//обход всех свойств объекта
			var List = GroupData[key]; //получение группированного списка с результатами
			var NameScales = ''; //объявление переменной для имени весов
			var SumMass = 0; //сумма массы
			underscore.each(List, (row, ind) => {
				//объод массива с данными
				SumMass += row.Mass; //получение суммы массы
				NameScales = row.NameScales; //Имя весов
			});
			var Obj = {}; //создание объекта
			Obj.Date = key; //добавление даты в объект
			Obj.SummMass = SumMass; //добавление суммы массы
			Obj.NameScales = NameScales; //добавление имени весов
			arr.push(Obj); //добавление объекта в массив
		}
		callback(arr); //возврат результата в callback
	}

	/* ПОЛУЧЕНИЕ РАЗНИЦЫ БРУТТО-НЕТТО */
	function GetMass(Brutto, Netto) {
		var result = 0; //объявление переменной с результатом
		if (Brutto == 0) {
			//проверка БРУТТО на 0
			result = 0; //присовение 0 результату
		} else {
			result = Brutto - Netto; //получение разницы
			if (result < 0) {
				//проверка результата
				result = 0; //присвоение 0 результату
			}
		}
		return result; //возврат результата
	}

	/* ОБХОД ТИПОВ ВЕСОВ */
	async function FillArr(params) {
		var result = Q.defer(); //создание promise
		var arr = []; //новый массив
		var sql =
			'SELECT date_format(DateTimeOp, "%Y-%m-%d %H:%i") as DateTimeOp, MAX(NumVagons) as CountVagons,  SUM(Mass) as Mass FROM DataScales WHERE (DateTimeOp BETWEEN ? AND ?) AND CountWagons>4 AND Scales=? AND typeScales=? GROUP BY DateTimeOp'; //формирование запроса
		var value = [params.DateTimeStart, params.DateTimeEnd, params.NameScales, 'brutto'];
		sql = await DB.format(sql, value); //формирование sql запроса со значениями для параметров
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
		});
		await result.resolve(Obj); //доабвление
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
		});
		await result.resolve(Obj); //доабвление
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
};
