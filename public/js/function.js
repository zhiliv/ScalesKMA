'use strict'; //строгая типизация

var socket = io(); //создание сокета

$.datetimepicker.setLocale('ru'); //установка локации для datitimepicker

/* при загрузке страницы */
$(window).on('load', () => {
  $('#Data').show('', () => {
    $('#ListScalesDataMass').height(GetHeightListScalesDataMass() - 64); //установка высоты для блока ListScalesDataMass
  });
  $('.loader').hide(); //скрыть элемент
  OnLoadIndex(); //после заггрузки главной страницы
  FillDateTimemainGraphics(); //заполнение дат
})

/* нажатие на кнопку "График" */
$('#ItemMainNav_Graphics').on('click', LoadFormGraphics()); //при нажитии на кнопку "Применить" - загрузить форму с графиком

/* заполнение дат начала и текущию дату в гавном кграфике */
function FillDateTimemainGraphics() {
  /* получение даты начала месяца */
  function GetStartDate() {
    var date = moment().add(-1, 'M').startOf('month').format('DD.MM.YYYY HH:mm'); //установка формата времени moment
    return date; //возврат значения
  }
  var datetimeStart = GetStartDate(); //начало месяца

  /* получение текущей даты */
  function GetEndtDate() {

    var date = moment().format('DD.MM.YYYY HH:mm'); //установка даты в нудном формате
    return date; //возврат значения
  }
  var datetimeEnd = GetEndtDate(); //текущая дата

  $('#datetimeStart').val(datetimeStart); //заполнение поля
  $('#datetimeStart').next().each((ind, el) => { //перебор элементов
    $(el).addClass('active') //добавление класса для label
  })
  $('#datetimeEnd').val(datetimeEnd);
  $('#datetimeEnd').next().each((ind, el) => { //перебор элементов
    $(el).addClass('active') //добавление класса для label
  })

  /* установка типа datetimepicker для input */
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

/* определение высоты #ListScalesDataMass */
function GetHeightListScalesDataMass() {
  var result = 0; //результат
  var HeightNavigate = 0; //высота навигации
  var HeightFooter = 0; //высота футера
  var HeightBody = 0; //получение высоты окна

  /* получение высота меню навигации */
  function GetHeightNavigate() {
    var height = $('#MainNavigateMenu').height(); //получение высоты элемента
    return height; //возврат результата
  }
  HeightNavigate = GetHeightNavigate(); //высота блока навигации

  /* получение высоты footer */
  function GetHeightFooter() {
    var height = $('.page-footer').height(); //получение высоты футера
    return height; //возрат результата
  }
  HeightFooter = GetHeightFooter(); //высота блока footer

  /* получение высоты body */
  function GetHeightBody() {
    var height = $('body').height(); //получение высоты body
    return height; //возврат результата
  }
  HeightBody = GetHeightBody(); //высота страницы

  result = HeightBody - (HeightNavigate + HeightFooter); //получение высоты без учета блоков

  return result; //возврат результата
}

/* после заггрузки главной страницы */
function OnLoadIndex() {
  $('#ItemMainNav_Graphics').parent('li').addClass('active'); //добавление класса элементу
  $('#ItemMainNav_Graphics').click(); //нажатие кнопки
  $(window).on('resize', () => { //при изменнеии размеров формы
    $('#ListScalesDataMass').height(GetHeightListScalesDataMass() - 64); //установка высоты для блока ListScalesDataMass
  })
  FillCardsScales(); //заполнение карточек весов
}

/* загрузка формы Графики */
function LoadFormGraphics() {
  $('#MainData').load('public/Forms/mainChart.html', () => { //загрузка файла html
    $('#ListScalesDataMass').height(GetHeightListScalesDataMass() - 64); //установка высоты для блока ListScalesDataMass
  })
}

/* заполнение каточек весов */
function FillCardsScales() {

  $('#ListScalesDataMass .scrollbar-primary').empty(); //очистка блока
  socket.emit('GetNameScales', list => { //получение имен весов
    list.forEach((Scales, ind) => { //перебор полученных значений
      var NameScales = Scales['name']; //имя весов
      GetSostavGroupOfVagonsForDay(NameScales);
      Card(NameScales, ind); //формирование карточки весов
    })
  })

  /* ганерания карточки */
  function Card(NameScales, ind) {
    $('<div>', {
        class: "col-xs-12 col-sm-12 col-md-12 col-lg-12 col-xl-12",
        style: "padding-top: 3%;"
      })
      .appendTo('#ListScalesDataMass .scrollbar-primary'); //создание блока

    $('<div>', {
        class: "card"
      })
      .appendTo($('#ListScalesDataMass .scrollbar-primary .col-xs-12')[ind]); //создание блока

    $('<div>', {
        class: "card-body"
      })
      .appendTo($('.scrollbar-primary  .card')[ind]); //создание блока

    $('<h4>', {
        class: "card-title",
        text: NameScales
      })
      .appendTo($('.scrollbar-primary  .card-body')[ind]); //создание заголовка с именем весов
  }

  /* получение массы добычи */
  function GetSostavGroupOfVagonsForDay(NameScales){
    var params = [];
    params.push($('#datetimeStart').val());
    params.push($('#datetimeEnd').val());
    params.push(NameScales);
    socket.emit('GetSostavGroupOfVagonsForDay', params, result => {
      console.log(result)
    })
  }

}