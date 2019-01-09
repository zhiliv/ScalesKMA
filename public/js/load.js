"use strict"
/* ==========Модуль для работы с загрузкой данных=========== */

var timeAnimate = 1200; //время анимации
var HeightData = GetHeightDataBlock();
var socket = io.connect(AdrServ);

/* загрузка формы статистики полсе нажатия кнопа "Статистика получаемых данных" в главном меню */
$('#ItemMainNav_Statistics').on('click', () => {
  $('#MainData').hide(timeAnimate, () => {
    RemoveClassItemMainNav();
    $('#ItemMainNav_Statistics').parent('li').addClass('active');
    $('#MainData').load('public/Forms/Statistics.html', () => {
      LoadStatistics();
    });
  });
  $('#MainData').show(timeAnimate);
});

/* загрузка формы графиков после нажатия на кнопку "Графики" в главном меню */
$('#ItemMainNav_Graphics').on('click', () => {
  RemoveClassItemMainNav();
  $('#ItemMainNav_Graphics').parent('li').addClass('active');
  $('#MainData').load('public/Forms/Graphics.html', () => {
    $('.RightGraphicsMainRightBlock').css('height', HeightData + 'px');
    MainDateTimePicker();
    $('#MainData').show(timeAnimate);
    MainGraphicsApply();
    $('#MainGraphicsApply').click();
    $('.LeftGraphicsMainRightBlock').load('public/Forms/TotalProductionToday.html', () => {
      GetAllDPKTotalProductionToday();
      GetDataShiftToday();
      LoadModal(); //загрузка модального окна
    })
  });
  /* загрузка модального  окна для показа смен */
  function LoadModal() {
    $('#Modal').load('public/Forms/FromModalHoursShift.html');
  }
});