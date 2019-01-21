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
	OrganizationDate(Data).then(labelDate => {
		OrganizationArrValues(labelDate, Data).then(res => {
			callback(res);
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

	function OrganizationArrValues(ListDate, arrData) {
		var result = Q.defer();
		var TempArrData = [];
		var arrNameScales = [];
		var TmpArrResult = [];

		arrData.forEach((ListData, indData) => {
			ListData.forEach(rowlistData => {
				TempArrData.push(rowlistData);
			});
		});

		arrData.forEach(rowArrData => {
			arrNameScales.push(rowArrData[0].NameScales);
		});

		ListDate.forEach((rowListDate, indListDate) => {
			var TMP = _.where(TempArrData, { Date: rowListDate });
			if (TMP.length != arrNameScales.length) {
				arrNameScales.forEach(async (rowNameScales, indNameScales) => {
					var CheckScales = _.where(TempArrData, { NameScales: rowNameScales, Date: rowListDate });
					if (CheckScales.length == 0) {
						var Obj = {};
						Obj.NameScales = rowNameScales;
						Obj.Data = rowListDate;
						Obj.SummMass = 0;
						TmpArrResult.push(Obj);
					} else {
						var Obj = {};
						Obj.NameScales = CheckScales[0].NameScales;
						Obj.Data = CheckScales[0].Date;
						Obj.SummMass = CheckScales[0].SummMass;
						TmpArrResult.push(Obj);
					}
				});
			} else {
				TMP.forEach((row, ind) => {
					var Obj = {};
					Obj.NameScales = row.NameScales;
					Obj.Data = row.Date;
					Obj.SummMass = row.SummMass;
					TmpArrResult.push(Obj);
				});
			}
			if (indListDate == rowListDate.length) {
				result.resolve(TmpArrResult);
			}
		});
		return result.promise;
	}
};
