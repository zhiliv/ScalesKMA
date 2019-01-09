'use strict';

/* при загрузке страницы */
$(window).on('load', () => {
  $('#Data').show('', () => {
    $('#ListScalesDataMass').height(GetHeightListScalesDataMass() - 64); //установка высоты для блока ListScalesDataMass
  });
  $('.loader').hide()
  OnLoadIndex();
  FillDateTimemainGraphics()
})

/* нажатие на кнопку "График" */
$('#ItemMainNav_Graphics').on('click', LoadFormGraphics());

/* заоплнить дату начала и текущию дату в гавном кграфике */
function FillDateTimemainGraphics() {
  /* получение даты начала месяца */
  function GetStartDate() {
    var date = moment().startOf('month').format('DD.MM.YYYY HH:mm');
    return date;
  }
  var datetimeStart = GetStartDate(); //начало месяца

  /* получение текущей даты */
  function GetEndtDate() {
    var date = moment().format('DD.MM.YYYY HH:mm');
    return date;
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
}

/* загрузка формы Графики */
function LoadFormGraphics() {
  $('#MainData').load('public/Forms/mainChart.html', () => { //загрузка файла html
    $('#ListScalesDataMass').height(GetHeightListScalesDataMass() - 64); //установка высоты для блока ListScalesDataMass
  })
}