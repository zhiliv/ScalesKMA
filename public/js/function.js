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
			var params = {}; //создание объекта для хранения параметров
			var DateTimeStart = new Date($('#datetimeStart').val()); //добавлегние в переменную значения жаты начала
			params.DateTimeStart = moment(new Date(DateTimeStart)).format('YYYY-MM-DD HH:mm'); //дата начала
			var DateTimeEnd = new Date(Date($('#datetimeEnd').val())); //добавление переменной со значением даты
			params.DateTimeEnd = moment(DateTimeEnd).format('YYYY-MM-DD HH:mm'); //дата окончания
			socket.emit('MainGraphicsApply', params, resultData => {
				console.log('​functionItemMainNav_Graphics -> resultData', resultData.Data[0]);
				var chartData = {
					legend: {
						layout: 'x2',
						align: 'right',
					},
					type: 'line', // Specify your chart type here.
					series: resultData.Data,
					scaleX: {
						labels: resultData.labelDate,
					},
				};
				zingchart.render({
					id: 'MainGraphics',
					data: chartData,
					height: '99%',
					width: '100%',
				});
			});
			//при нажатии на кнопку "Применить" на вкладке "Графики" для главного графика
		});
	});
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

			onChangeDateTime: function(dp, $input) {
				$('#datetimeStart').val(moment(new Date($('#datetimeStart').val())).format('DD.MM.YYYY HH:mm')); //дата начала
			},
		}); //указываем что это datepicker
		$('#datetimeEnd').datetimepicker({
			timepicker: true,
			format: 'Y.m.d H:i',
		}); //указываем что это datepicker
	}

	SetDatePimePicker(); //установка datetimepicker для полей input
}
