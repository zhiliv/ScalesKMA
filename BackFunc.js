'use strict';

var Q = require('q'),
	_ = require('underscore'),
	async = require('async'),
	DB = require('./DB'); //подключения модуля для работы с БД

/* ОБХОД ВСЕХ ВЕСОВ */
exports.FillScales = () => {
	var arr = []; //создание массива
	var result = Q.defer(); //создание promise
	DB.GetNameScales(List => {
		List.forEach((Scales, ind) => {
			//перебор полученных значений
			var NameScales = Scales['name']; //имя весов
			arr.push(NameScales); //добавление имени весов в массив
			if (ind == List.length - 1) {
				//проверка на последний элемент в массиве
				result.resolve(arr); //добавление рзультата в promise
			}
		});
	});
	return result.promise; //возврат результата в promise
};

/* ПРИЕМ ДАННЫХ ПО ВЕСАМ */
exports.GetDataOfSacels = (InpParams, NameScales) => {
	var result = Q.defer(); //создание promise
	var arr = []; //создание массива
	var i = 0;
	async.eachOfSeries(NameScales, async Scales => {
		//обход всех имен весов
		await GetSostavGroupOfVagonsForDay(InpParams, Scales).then(Data => {
			//получение данных с массами по весам
			arr.push(Data); //добавление данных в массив
		});
		if (i == NameScales.length - 1) {
			//проверка на последний элемент массива
			result.resolve(arr); //добавление результата в promise
		}
		i++;
	});
	return result.promise; //возврат результата в promise
};

/* ПОЛУЧЕНИЕ МАССЫ ДОБЫЧИ */
function GetSostavGroupOfVagonsForDay(InpParams, NameScales) {
	var result = Q.defer(); //создание promise
	InpParams.NameScales = NameScales; //имя весов
	DB.GetSostavGroupOfVagonsForDay(InpParams, res => {
		result.resolve(res);
	});
	return result.promise; //возврат результа в promise
}

/* ФОРМИРОВАНИЕ МАССИВОВ С ДАННЫМИ ДЛЯ ВЫВОДА В ДИАГРАММУ */
exports.OrganizationData = (Data, callback) => {
	var result = {};
	OrganizationDate(Data).then(labelDate => {
		//ПОЛУЧЕНИЕ МАССИВА УНИКАЛЬНЫХ ДАТ ПО ВСЕМ ВЕСАМ
		OrganizationArrValues(labelDate, Data).then(ReadyArr => {
			OrganizationResultData(ReadyArr).then(resultData => {
				result.labelDate = labelDate;
				result.Data = resultData;
				callback(result);
			});
		});
	});

	/* ПОЛУЧЕНИЕ МАССИВА УНИКАЛЬНЫХ ДАТ ПО ВСЕМ ВЕСАМ */
	function OrganizationDate(ListData) {
		var result = Q.defer(); //создание promise
		var arrDate = []; //создание массива с датами
		ListData.forEach((rowList, indList) => {
			//обход массива с данными
			rowList.forEach((row, ind) => {
				//получение строки данных за день
				var DateRow = row.Date; //дата в строке массва
				var t = _.contains(arrDate, DateRow); //поиск даты массиве с датами
				if (t === false) {
					//проверка на существование
					arrDate.push(DateRow); //добавление даты в массив дат
				}
			});
			if (indList == ListData.length - 1) {
				//проверка на последнюю запись при обходе
				result.resolve(arrDate); //добавление результата в promise
			}
		});
		return result.promise; //возврат результата в promise
	}

	/* Сортировка массива и добалвение 0 к отсутствующим датам */
	function OrganizationArrValues(ListDate, arrData) {
		var result = Q.defer(); //создание promise
		var TempArrData = []; //создание массива для временного хранения данных
		var arrNameScales = []; //массив имен весов
		var TmpArrResult = []; //массив для создания результата

		arrData.forEach(ListData => {
			//обход массива с данными
			ListData.forEach(rowlistData => {
				//  //обход массива по весам
				TempArrData.push(rowlistData); //доабвление данных во временный массив
			});
		});

		arrData.forEach(rowArrData => {
			//обход массива с данными
			arrNameScales.push(rowArrData[0].NameScales); //формированеи массива со спискем имен весов
		});
		ListDate.forEach((rowListDate, indListDate) => {
			//обход массива с датами
			var TMP = _.where(TempArrData, { Date: rowListDate }); //нахождение (проверка на сущестоввание) элемента массиа
			if (TMP.length != arrNameScales.length) {
				//првоерка на существование массива
				arrNameScales.forEach(async (rowNameScales, indNameScales) => {
					//обход всех имен весов
					var CheckScales = _.where(TempArrData, { NameScales: rowNameScales, Date: rowListDate }); //нахождение элемента мссива по свойству объетка(првоерка на существование)
					if (CheckScales.length == 0) {
						//проверка длины занчения
						var Obj = {}; //создание объекта
						Obj.NameScales = rowNameScales; //добавление свойства "Имя весов"
						Obj.Data = rowListDate; //добавлене совйства "Дата"
						Obj.SummMass = 0; //добавление совйтсва сумма массы
						TmpArrResult.push(Obj); //добавление объекта в массив
					} else {
						var Obj = {}; //создание объекта
						Obj.NameScales = CheckScales[0].NameScales; //добавление свойства "Имя весов"
						Obj.Data = CheckScales[0].Date; //добавлене совйства "Дата"
						Obj.SummMass = CheckScales[0].SummMass; //добавление совйтсва сумма массы
						TmpArrResult.push(Obj); //добавление объекта в массив
					}
				});
			} else {
				TMP.forEach(row => {
					//обход найденных значений
					var Obj = {}; //создание объекта
					Obj.NameScales = row.NameScales; //добавление свойства "Имя весов"
					Obj.Data = row.Date; //добавлене совйства "Дата"
					Obj.SummMass = row.SummMass; //добавление совйтсва сумма массы
					TmpArrResult.push(Obj); //добавление объекта в массив
				});
			}

			if (indListDate == ListDate.length - 1) {
				//если посдений элемент массива
				result.resolve(TmpArrResult); //добавление результата в promise
			}
		});
		return result.promise; //возварт результата в promise
	}

	/* ФОРМИРОВАНИЕ ДАННЫХ ДЛЯ ВЫГРУЗКИ В ДИАГРАММУ */
	function OrganizationResultData(Data) {
		var result = Q.defer(); //создание promise
		var resultArr = []; //массив результатов
		var group = _.groupBy(Data, 'NameScales'); //группируем по имени весов
		group = _.toArray(group); //конвертируем объект в массив
		group.forEach((rowNameScales, indNameScel) => {
			//обход сгруппированного массива с именами весов
			var Arr = []; //создаем массив
			var Obj = {}; //создаем обхект
			rowNameScales.forEach((row, ind) => {
				//обход массива с данными по весам
				Arr.push(row.SummMass / 1000); //добавление суммы массы в массив
				if (ind == rowNameScales.length - 1) {
					//проверка на последний элемент массива
					Obj.values = Arr; //добавление данных по весам в объект
					Obj.text = row.NameScales; //добавление емени весов в объект
				}
			});
			resultArr.push(Obj); //добавление объекта в массив
			if (indNameScel == group.length - 1) {
				//проверка на последний элемент в массиве
				result.resolve(resultArr); //добавление результата в promise
			}
		});
		return result.promise; //возврат результата в promise
	}
};
