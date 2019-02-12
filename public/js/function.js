'use strict'; //строгая типизация

var socket = io(); //создание сокета

$.datetimepicker.setLocale('ru'); //установка локации для datitimepicker

/* ПРИ ЗАГРУЗКЕ СТРАНИЦЫ */
$(window).on('load', async () => {
	NavTabClick();
	$('.mainloader').removeClass('h-100'); //удаление класса
	$('.mainloader .spinner-border').hide(); //скрыть элемент с лоадером
	$('#Data').show('', () => {
		$('#ListScalesDataMass').height(GetHeightListScalesDataMass() - 72); //установка высоты для блока ListScalesDataMass
	});
	await ItemMainNav_Graphics(); //событие при нажатии на кнопку "применить" у главной диаграммы
	NavTabClick(); //обраболтка нажатия кнопок в главном меню
	await GetTotalWeight().then(res => {
		//получение суммы массы за день
		res = Math.floor(res); //округление знания до целого
		$('.total-weight').text(res + 'т.'); //вывод данных суммы массы за день в поле
	});
	var MassScalesOfDay; //масса с  весов за день
	await GetMassWeightofDay().then(res => {
		MassScalesOfDay = res; //присвоение результата переменной
	});
	GetDataScalesofHour().then(res => {});
	await GetNameScales().then(res => {
		//получение имен весов
		async.forEachOfSeries(res, async (row, ind) => {
			//обход имен весов
			var DataScales = _.where(MassScalesOfDay, {
				text: row.Name, //имя весов
			}); //поиск строки с имененм весов
			var MassOfDay = DataScales[0].values[0]; //получение масы по весам за день
			Addcard(row.Name, MassOfDay); //добавление элментов с весами
		});
	});
	await FillSmen();
	await GetDataScalesofHour().then(res => {
		//получение данных по часам
		EventClickCard(res);
		//
	});
});

function NavTabClick() {
	BtnGraphics();
	BtnStatistic();

	/* УДАЛЕНИЕ ВЫДЕЛЕННЫХ ПУНКТОВ МЕНЮ */
	function DelActiveNav() {
		$('.MainNav ul > li').removeClass('active'); //удаление класса
	}

	function BtnGraphics() {
		DelActiveNav(); //удаление выдлеения в меню
		$('#ItemMainNav_Graphics').on('click', el => {
			location.reload(); //обновление страницы
		});
	}

	/* ОБРАБОТКА НАЖАТИЯ КНОПКИ "ИСТОРИЯ ПОЛУЧАЕМЫХ ДАННЫХ" */
	function BtnStatistic() {
		$('#ItemMainNav_Statistics').on('click', el => {
			//обработка события клик
			DelActiveNav(); //удаление выделения пункта меню
			$('#MainData').empty(); //очистка блока
			$('#MainData').load('public/Forms/Statistic.html', () => {
				//загрузка формы
				$(el.target)
					.parent()
					.addClass('active');
				$('tbody').empty(); //очистка таблицы
				socket.emit('GetStatistics', async res => {
					//отправка сокет запроса для получения статистики
					async.eachOfSeries(res, async (row, ind) => {
						//обход всех строк
						var tr = $('<tr>').appendTo('tbody'); //создание элемента tr
						$('<th>', {
							class: 'text-center',
							text: row.id,
							scope: row,
						}).appendTo(tr); //создание элемента
						$('<td>', {
							class: 'text-center',
							text: moment(row.DateTimeParse).format('DD.MM.YYYY  HH:mm'),
						}).appendTo(tr); //создание элемента
						$('<td>', {
							class: 'text-center',
							text: moment(row.DateTimeWeighing).format('DD.MM.YYYY  HH:mm'),
						}).appendTo(tr); //создание элемента
						$('<td>', {
							class: 'text-center',
							text: row.CountVagons,
						}).appendTo(tr); //создание элемента
						$('<td>', {
							class: 'text-center',
							text: row.SummMass,
						}).appendTo(tr); //создание элемента
						$('<td>', {
							class: 'text-center',
							text: row.TypeScale,
						}).appendTo(tr); //создание элемента
						$('<td>', {
							class: 'text-center',
							text: row.AdrScales,
						}).appendTo(tr); //создание элемента
					});
				});
			});
		});
	}
}

/* СОБЫТИЕ ПРИ КЛИКЕ НА КАРТУ */
function EventClickCard(data) {
	$('.TotalData').on('click', (el, ind) => {
		//обработка события клик
		var NameScales = $(el.target).attr('value'); //получение имени весов
		FillTemplateModal(data, NameScales); //заполнить модальное окно карточки
		$('#DataOfHour').modal(); //показать модальное окно
	});
}

function FillTemplateModal(data, NameScales) {
	$('.modal-body').empty(); //очистка блока
	socket.emit('GetTimeSmen', schedule => {
		//получение данных по  сменам
		var NumSmenList = _.groupBy(schedule, 'NumSmen'); //группирока часов по сменам
		var KeySmenList = _.keys(NumSmenList); //получение ключей сгупированного объекта
		async.eachOfSeries(KeySmenList, async (row, ind) => {
			//обход знаычений по часам
			var div = $('<div>', {
				id: 'NumSmen_' + row,
			}).appendTo('.modal-body'); //создание элемента
			$('<h3>', {
				class: 'text-center',
				text: 'Смена ' + row,
				NumSmen: row,
			}).appendTo(div); //создание элемента
			async.eachOfSeries(schedule, async (Times, ind) => {
				//обход смен
				if (Times.NumSmen == row) {
					//проверка времени
					$('<span>', {
						class: 'time',
						text: Times.TimeStart + '-' + Times.TimeEnd,
					}).appendTo(div); //создание эдемента
					var DataHour = _.where(data, {
						NameScales: NameScales,
						Hour: Times.Hour,
						NumSmen: Number(row),
					}); //выборка наднных с условиями
					var SumMassHour = 0; //переменная для хранения суммы массы за час
					await async.eachOfSeries(DataHour, async (rowDataHour, indDataHour) => {
						//обход данных
						SumMassHour += rowDataHour.Mass; //итерация суммы
					});
					SumMassHour = SumMassHour / 1000; //делим на 1000 чтобы получить тонны
					$('<span>', {
						text: ' ' + SumMassHour + 'т.',
					}).appendTo(div); //создаем эелмент
					$('<br>').appendTo(div); //создаем элемент
				}
			});
		});
	});
}

function ClearCardscales() {
	$('.List').empty();
}

/* ДОБАВЛЕНИЕ ЭЛЕМЕНТА В СПИСОК ВЕСОВ */
function Addcard(Name, MassOfDay) {
	var card = $('<div>', {
		class: 'card',
		style: 'margin-top: 5%;',
		value: Name,
	}).appendTo('#ListScalesDataMass > .force-overflow .List'); //создание и добавление элемента
	var div = $('<div>', {
		class: 'TotalData',
		value: Name,
	}).appendTo(card);
	var cardBody = $('<div>', {
		class: 'card-body',
		value: Name,
	}).appendTo(div);
	$('<h2>', {
		class: 'text-center',
		text: Name,
		value: Name,
	}).appendTo(cardBody); //создание и добавление элемента
	$('<h4>', {
		text: 'Масса за день: ' + MassOfDay + 'т.',
		class: 'MassOfday',
		value: Name,
	}).appendTo(cardBody); //создание и добавление элемента
}

/* ПОЛЧЕНИЕ ИМЕН ВЕСОВ */
function GetNameScales() {
	var result = Q.defer(); //создание promise
	socket.emit('GetNameScales', res => {
		//отправка события сокет
		result.resolve(res); //добавление результата в promise
	});
	return result.promise; //возврат результата в promise
}

/* ПОЛУЧЕНИЕ ОБЩЕЙ СУММЫ ЗА ДЕНЬ */
function GetMassWeightofDay() {
	var result = Q.defer(); //создание promise
	var params = {}; //создание объекта для хранения параметров
	var arr = []; //создание массива для хранения результата
	params.DateTimeStart = moment()
		.startOf('Day')
		.format('YYYY-MM-DD HH:mm'); //получение начала текущего дня
	params.DateTimeEnd = moment()
		.endOf('Day')
		.format('YYYY-MM-DD HH:mm'); //получение конца текущего дня
	socket.emit('GetTotalWeight', params, res => {
		async.forEachOfSeries(res.Data, async (row, ind) => {
			//обход значений массива
			arr.push(row);
			if (ind == res.Data.length - 1) {
				//проверка на последний элемент массива
				result.resolve(arr); //добавление результата в promise
			}
		});
	});
	return result.promise; //возврат результата в promise
}

/* ПОЛУЧЕНИЕ ОБЩЕЙ СУММЫ ЗА ДЕНЬ */
function GetTotalWeight() {
	var result = Q.defer(); //создание promise
	var params = {}; //создание объекта для хранения параметров
	var summ = 0; //переменная для хранения суммы
	params.DateTimeStart = moment()
		.startOf('Day')
		.format('YYYY-MM-DD HH:mm'); //получение начала текущего дня
	params.DateTimeEnd = moment()
		.endOf('Day')
		.format('YYYY-MM-DD HH:mm'); //получение конца текущего дня
	socket.emit('GetTotalWeight', params, res => {
		async.forEachOfSeries(res.Data, async (row, ind) => {
			summ += row.values[0]; //итератор суммы
			if (ind == res.Data.length - 1) {
				//проверка на последний элемент массива
				result.resolve(summ); //добавление результата в promise
			}
		});
	});
	return result.promise; //возврат результата в promise
}

/* ПРИ НАЖАТИ НА КНОПКУ "ГРАФИКИ" В ГЛАВНОМ МЕНЮ */
function ItemMainNav_Graphics() {
	$('#ItemMainNav_Graphics')
		.parent('li')
		.addClass('active'); //добавление класса элементу
	$('#MainData').load('public/Forms/mainChart.html', () => {
		//загрузка файла html
		$('#ListScalesDataMass').height(GetHeightListScalesDataMass() - 72); //установка высоты для блока ListScalesDataMass
		FillDateTimemainGraphics(); //заполнение дат в input
		$('#MainGraphicsApply').on('click', () => {
			BuildMainGrafics();
		});
		BuildMainGrafics();
	});
}

function LoadDiagram(){
  $('#MainGraphics').empty();
  var main = $('<div>', {
    class: 'justify-content-center text-center'
  }).appendTo('#MainGraphics');
  $('<h1>', {
    class: 'text-center',
    text: 'Идет загрузка...'
  }).appendTo(main);
  var mainDiv = $('<div>', {
  class: 'preloader-wrapper big active crazy '
}).appendTo(main);
  var divTwo = $('<div>', {
    class: 'spinner-layer spinner-blue-only justify-content-center'
  }).appendTo(mainDiv);
   var divThree = $('<div>', {
    class: 'circle-clipper left'
  }).appendTo(divTwo);
  $('<div>', {
    class: 'circle'
  }).appendTo(divThree);
  var divFour = $('<div>', {
    class: 'gap-patch'
  }).appendTo(divTwo);
  $('<div>', {
    class: 'circle'
  }).appendTo(divFour);
  var divFive = $('<div>', {
    class: 'circle-clipper right'
  }).appendTo(divTwo);
  $('<div>', {
    class: 'circle'
  }).appendTo(divFive); 

}

/* Собрать диаграмму по данным */
function BuildMainGrafics() {
  LoadDiagram();//очистка блока диаграммы
	var params = {}; //создание объекта для хранения параметров
	params.DateTimeStart = moment($('#datetimeStart').val(), 'DD.MM.YYYY HH:mm').format('YYYY-MM-DD HH:mm'); //дата начала
	params.DateTimeEnd = moment($('#datetimeEnd').val(), 'DD.MM.YYYY HH:mm').format('YYYY-MM-DD HH:mm'); //дата окончания
	socket.emit('MainGraphicsApply', params, async resultData => {
		var chartData = {
			legend: {
				layout: 'x2',
				align: 'right',
			},
			type: 'line', //тип диаграммы
			series: resultData.Data, //данные
			scaleX: {
				labels: resultData.labelDate, //даты
			},
    };
    $('#MainGraphics').empty();
		await zingchart.render({
			//выгрузка данных в блок для формирования гшрафика
			id: 'MainGraphics', //id элемента в который выгружаем
			data: chartData, //формированные данные
			height: '99%', //высота
			width: '99%', //ширина
		});
	});
	//при нажатии на кнопку "Применить" на вкладке "Графики" для главного графика
}

/* ОПРЕДЕЛЕНИЕ ВЫСОТЫ #LISTSCALESDATAMASS */
function GetHeightListScalesDataMass() {
	var result = 0; //результат
	var HeightNavigate = 0; //высота навигации
	var HeightFooter = 0; //высота футера
	var HeightBody = 0; //получение высоты окна

	/* ПОЛУЧЕНИЕ ВЫСОТА МЕНЮ НАВИГАЦИИ */
	function GetHeightNavigate() {
		var height = $('nav').height(); //получение высоты элемента
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
			.add(-7, 'd')
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
			format: 'd.m.Y H:i',
		}); //указываем что это datepicker
		$('#datetimeEnd').datetimepicker({
			timepicker: true,
			format: 'd.m.Y H:i',
		}); //указываем что это datepicker
	}

	SetDatePimePicker(); //установка datetimepicker для полей input
}

/* ПОЛУЧЕНИЕ ДАННЫХ ПО ВЕСА ЗА КАЖДЫЙ ЧАС */
function GetDataScalesofHour() {
	var result = Q.defer(); //создание promise
	var params = {}; //создание объекта для хранения параметров
	socket.emit('GetDataScalesofHour', params, res => {
		var groupData = _.groupBy(res, 'NameScales'); //группировка данных
		groupData = _.toArray(groupData); //конвертируем объект в массив
		result.resolve(res); //добавление результата в promise
	});
	return result.promise; //возарт результата в promise
}

socket.on('UpdateData', async () => {
	await ClearCardscales();
	await GetTotalWeight().then(res => {
		//получение суммы массы за день
		res = Math.floor(res); //округление знания до целого
		$('.total-weight').text(res + 'т.'); //вывод данных суммы массы за день в поле
	});
	var MassScalesOfDay; //масса с  весов за день
	await GetMassWeightofDay().then(res => {
		MassScalesOfDay = res; //присвоение результата переменной
	});
	await GetNameScales().then(res => {
		//получение имен весов
		async.forEachOfSeries(res, async (row, ind) => {
			//обход имен весов
			var DataScales = _.where(MassScalesOfDay, {
				text: row.Name, //имя весов
			}); //поиск строки с имененм весов
			var MassOfDay = DataScales[0].values[0]; //получение масы по весам за день
			Addcard(row.Name, MassOfDay); //добавление элментов с весами
		});
	});

	await GetDataScalesofHour().then(res => {
		//получение данных по часам
		EventClickCard(res);
	});

	await FillSmen();
});

function FillSmen() {
	$('.smen').remove();
	GetDataOfSmen().then(res => {
		async.eachSeries(res, async (rowData, indData) => {
			var NameScales = rowData.NameScales;
			$('.TotalData').each((ind, row) => {
				var CardNameScales = $(row).attr('value');
				if (NameScales == CardNameScales) {
					var ParentElem = $(row).find('.card-body');
					$('<h6>', {
						text: 'Смена ' + rowData.NumSmen + ': ' + rowData.Summ + 'т.',
						calss: 'smen',
					}).appendTo(ParentElem);
				}
			});
		});
	});
}

/* ПОЛУЧЕНИЕ ДННЫХ ПО СМЕНАМ */
function GetDataOfSmen() {
	var result = Q.defer();
	var arr = [];
	socket.emit('GetDataOfSmens', res => {
		var GroupScales = _.groupBy(res, 'NameScales');
		var group = _.toArray(GroupScales); //конвертируем объект в массив
		async.forEachOfSeries(group, async (row, ind) => {
			var NameScales = row[0].NameScales;
			var GroupSmen = _.toArray(_.groupBy(row, 'NumSmen'));
			await async.forEachSeries(GroupSmen, async (rowSmen, indSmen) => {
				var Obj = {};
				var Summ = 0;
				await async.forEachOfSeries(rowSmen, async (rowData, indData) => {
					Obj.NumSmen = rowData.NumSmen;
					Summ += rowData.Mass;
				});
				Obj.Summ = Summ / 1000;
				Obj.NameScales = NameScales;
				arr.push(Obj);
			});

			if (ind == group.length - 1) {
				result.resolve(arr);
			}
		});
	});
	return result.promise;
}
