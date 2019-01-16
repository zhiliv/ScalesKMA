'use strict'; //строгая типизация

var socket = io(); //создание сокета

$.datetimepicker.setLocale('ru'); //установка локации для datitimepicker

/* ПРИ ЗАГРУЗКЕ СТРАНИЦЫ */
$(window).on('load', () => {
	$('#Data').show('', () => {
		$('#ListScalesDataMass').height(GetHeightListScalesDataMass() - 64); //установка высоты для блока ListScalesDataMass
	});
	$('.loader').hide(); //скрыть элемент
	OnLoadIndex(); //после заггрузки главной страницы
	FillDateTimemainGraphics(); //заполнение дат
});

/* НАЖАТИЕ НА КНОПКУ "ГРАФИК" */
$('#ItemMainNav_Graphics').on('click', LoadFormGraphics()); //при нажитии на кнопку "Применить" - загрузить форму с графиком

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

/* ПОСЛЕ ЗАГРУЗКИ ГЛАВНОЙ СТРАНИЦЫ */
function OnLoadIndex() {
	$('#ItemMainNav_Graphics')
		.parent('li')
		.addClass('active'); //добавление класса элементу
	$('#ItemMainNav_Graphics').click(); //нажатие кнопки
	$(window).on('resize', () => {
		//при изменнеии размеров формы
		$('#ListScalesDataMass').height(GetHeightListScalesDataMass() - 64); //установка высоты для блока ListScalesDataMass
	});
	FillCardsScales(); //заполнение карточек весов
}

/* ЗАГРУЗКА ФОРМЫ ГРАФИКИ */
function LoadFormGraphics() {
	$('#MainData').load('public/Forms/mainChart.html', () => {
		//загрузка файла html
		$('#ListScalesDataMass').height(GetHeightListScalesDataMass() - 64); //установка высоты для блока ListScalesDataMass
	});
}

/* ЗАПОЛНЕНИЕ КАРТОЧЕК ВЕСОВ */
function FillCardsScales() {
	$('#ListScalesDataMass .scrollbar-primary').empty(); //очистка блока
	socket.emit('GetNameScales', list => {
		//получение имен весов
		list.forEach((Scales, ind) => {
			//перебор полученных значений
			var NameScales = Scales['name']; //имя весов
			GetSostavGroupOfVagonsForDay(NameScales);
			Card(NameScales, ind); //формирование карточки весов
		});
	});

	/* ГАНЕРАЦИЯ КАРТОЧКИ */
	function Card(NameScales, ind) {
		$('<div>', {
			class: 'col-xs-12 col-sm-12 col-md-12 col-lg-12 col-xl-12',
			style: 'padding-top: 3%;',
		}).appendTo('#ListScalesDataMass .scrollbar-primary'); //создание блока

		$('<div>', {
			class: 'card',
		}).appendTo($('#ListScalesDataMass .scrollbar-primary .col-xs-12')[ind]); //создание блока

		$('<div>', {
			class: 'card-body',
		}).appendTo($('.scrollbar-primary  .card')[ind]); //создание блока

		$('<h4>', {
			class: 'card-title',
			text: NameScales,
		}).appendTo($('.scrollbar-primary  .card-body')[ind]); //создание заголовка с именем весов
	}

	/* ПОЛУЧЕНИЕ МАССЫ ДОБЫЧИ */
	function GetSostavGroupOfVagonsForDay(NameScales) {
		var params = {}; //создание объекта для хранения параметров
		var DateTimeStart = new Date($('#datetimeStart').val()); //добавлегние в переменную значения жаты начала
		params.DateTimeStart = moment(new Date(DateTimeStart)).format('YYYY-MM-DD HH:mm'); //дата начала
		var DateTimeEnd = new Date(Date($('#datetimeEnd').val())); //добавление переменной со значением даты
		params.DateTimeEnd = moment(DateTimeEnd).format('YYYY-MM-DD HH:mm'); //дата окончания
		params.NameScales = NameScales; //имя весов
		socket.emit('GetSostavGroupOfVagonsForDay', params, result => {
			//отправить запрос через socket
			console.log(result);
		});
	}
}
