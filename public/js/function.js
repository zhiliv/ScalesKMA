'use strict'; //строгая типизация

var socket = io(); //создание сокета

$.datetimepicker.setLocale('ru'); //установка локации для datitimepicker

/* ПРИ ЗАГРУЗКЕ СТРАНИЦЫ */
$(window).on('load', () => {
	$('#Data').show('', () => {
		$('#ListScalesDataMass').height(GetHeightListScalesDataMass() - 64); //установка высоты для блока ListScalesDataMass
	});
	$('.loader').hide(); //скрыть элемент
	ItemMainNav_Graphics();
});

/* ПРИ НАЖАТИ НА КНОПКУ "ГРАФИКИ" В ГЛАВНОМ МЕНЮ */
function ItemMainNav_Graphics() {
	$('#ItemMainNav_Graphics')
		.parent('li')
		.addClass('active'); //добавление класса элементу
	$(window).on('resize', () => {});
	$('#MainData').load('public/Forms/mainChart.html', () => {
		//загрузка файла html
		$('#ListScalesDataMass').height(GetHeightListScalesDataMass() - 64); //установка высоты для блока ListScalesDataMass
		FillDateTimemainGraphics(); //заполнение дат в input
		$('#MainGraphicsApply').on('click', () => {
			//при нажатии на кнопку "Применить" на вкладке "Графики" для главного графика
			FillScales().then(NameScales => {
				//обход ивсех весов по именам
				GetDataOfSacels(NameScales).then(Data => {
					//полчение данных по весам
					console.log(Data);
					OrganizationData(Data);
				});
			});
		});
	});
}

/* ФОРМИРОВАНИЕ МАССИВОВ С ДАННЫМИ ДЛЯ ВЫВОДА В ДИАГРАММУ */
function OrganizationData(Data) {
	OrganizationDate(Data).then(labelDate => {
		OrganizationArrValues(labelDate, Data).then(res => {
			console.log('​OrganizationData -> res', res);
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
			ListData.forEach((rowlistData, indListData) => {
				TempArrData.push(rowlistData);
			});
		});

		arrData.forEach((rowArrData, indarrData) => {
			arrNameScales.push(rowArrData[0].NameScales);
		});

		ListDate.forEach((rowListDate, indListDate) => {
			var TMP = _.where(TempArrData, { Date: rowListDate });
			if (TMP.length != arrNameScales.length) {
				arrNameScales.forEach((rowNameScales, indNameScales) => {
					var CheckScales = _.where(TempArrData, { NameScales: rowNameScales, Date: rowListDate });
					console.log('​OrganizationArrValues -> CheckScales', CheckScales);
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
				console.log('​OrganizationArrValues -> TMP', TMP);
				TMP.forEach((row, ind) => {
					console.log('​OrganizationArrValues -> row', row);
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
}

/* ПРИЕМ ДАННЫХ ПО ВЕСАМ */
function GetDataOfSacels(NameScales) {
	var result = Q.defer(); //создание promise
	var arr = []; //создание массива
	NameScales.forEach(async (Scales, ind) => {
		//обход всех имен весов
		await GetSostavGroupOfVagonsForDay(Scales).then(Data => {
			//получение данных с массами по весам
			arr.push(Data); //добавление данных в массив
		});
		if (ind == NameScales.length - 1) {
			//проверка на последний элемент массива
			result.resolve(arr); //добавление результата в promise
		}
	});
	return result.promise; //возврат результата в promise
}

/* ПОЛУЧЕНИЕ МАССЫ ДОБЫЧИ */
function GetSostavGroupOfVagonsForDay(NameScales) {
	var result = Q.defer(); //создание promise
	var params = {}; //создание объекта для хранения параметров
	var DateTimeStart = new Date($('#datetimeStart').val()); //добавлегние в переменную значения жаты начала
	params.DateTimeStart = moment(new Date(DateTimeStart)).format('YYYY-MM-DD HH:mm'); //дата начала
	var DateTimeEnd = new Date(Date($('#datetimeEnd').val())); //добавление переменной со значением даты
	params.DateTimeEnd = moment(DateTimeEnd).format('YYYY-MM-DD HH:mm'); //дата окончания
	params.NameScales = NameScales; //имя весов
	socket.emit('GetSostavGroupOfVagonsForDay', params, res => {
		//отправить запрос через socket
		result.resolve(res); //добавление результата в promise
	});
	return result.promise; //возврат результа в promise
}

/* ОБХОД ВСЕХ ВЕСОВ */
function FillScales() {
	var arr = []; //создание массива
	var result = Q.defer(); //создание promise
	socket.emit('GetNameScales', list => {
		//получение имен весов
		list.forEach(async (Scales, ind) => {
			//перебор полученных значений
			var NameScales = Scales['name']; //имя весов
			await arr.push(NameScales); //добавление имени весов в массив
			if (ind == list.length - 1) {
				//проверка на последний элемент в массиве
				result.resolve(arr); //добавление рзультата в promise
			}
		});
	});
	return result.promise; //возврат результата в promise
}

/* ОПРЕДЕЛЕНИЕ ВЫСОТЫ #LISTSCALESDATAMASS */
function GetHeightListScalesDataMass() {
	var result = 0; //результат
	var HeightNavigate = 0; //высота навигации
	var HeightFooter = 0; //высота футера
	var HeightBody = 0; //получение высоты окна

	/* ПОЛУЧЕНИЕ ВЫСОТА МЕНЮ НАВИГАЦИИ */
	function GetHeightNavigate() {
		var height = $('#MainNavigateMenu').height(); //получение высоты элемента
		return height; //возврат результата
	}
	HeightNavigate = GetHeightNavigate(); //высота блока навигации

	/* ПОЛУЧЕНИЕ ВЫСОТЫ FOOTER */
	function GetHeightFooter() {
		var height = $('.page-footer').height(); //получение высоты футера
		return height; //возрат результата
	}
	HeightFooter = GetHeightFooter(); //высота блока footer

	/* ПОЛУЧЕНИЕ ВЫСОТЫ BODY */
	function GetHeightBody() {
		var height = $('body').height(); //получение высоты body
		return height; //возврат результата
	}

	HeightBody = GetHeightBody(); //высота страницы
	result = HeightBody - (HeightNavigate + HeightFooter); //получение высоты без учета блоков
	return result; //возврат результата
}

/* ЗАПОЛНЕНИЕ ДАТ НАЧАЛА И ТЕКУЩИЮ ДАТУ В ГАВНОМ КГРАФИКЕ */
function FillDateTimemainGraphics() {
	/* получение даты начала месяца */
	function GetStartDate() {
		var date = moment()
			.add(-1, 'M')
			.startOf('month')
			.format('DD.MM.YYYY HH:mm'); //установка формата времени moment
		return date; //возврат значения
	}
	var datetimeStart = GetStartDate(); //начало месяца

	/* ПОЛУЧЕНИЕ ТЕКУЩЕЙ ДАТЫ */
	function GetEndtDate() {
		var date = moment().format('DD.MM.YYYY HH:mm'); //установка даты в нудном формате
		return date; //возврат значения
	}
	var datetimeEnd = GetEndtDate(); //текущая дата

	$('#datetimeStart').val(datetimeStart); //заполнение поля
	$('#datetimeStart')
		.next()
		.each((ind, el) => {
			//перебор элементов
			$(el).addClass('active'); //добавление класса для label
		});
	$('#datetimeEnd').val(datetimeEnd);
	$('#datetimeEnd')
		.next()
		.each((ind, el) => {
			//перебор элементов
			$(el).addClass('active'); //добавление класса для label
		});

	/* УСТАНОВКА ТИПА DATETIMEPICKER ДЛЯ INPUT */
	function SetDatePimePicker() {
		$('#datetimeStart').datetimepicker({
			timepicker: true,
			format: 'Y.m.d H:i',
		}); //указываем что это datepicker
		$('#datetimeEnd').datetimepicker({
			timepicker: true,
			format: 'Y.m.d H:i',
		}); //указываем что это datepicker
	}

	SetDatePimePicker(); //установка datetimepicker для полей input
}
