'use strict'; //строгая типизация

var socket = io (); //создание сокета

$.datetimepicker.setLocale ('ru'); //установка локации для datitimepicker

/* ПРИ ЗАГРУЗКЕ СТРАНИЦЫ */
$ (window).on ('load', async () => {
  $ ('.mainloader').removeClass ('h-100'); //удаление класса
  $ ('.mainloader .spinner-border').hide (); //скрыть элемент с лоадером
  $ ('#Data').show ('', () => {
    $ ('#ListScalesDataMass').height (GetHeightListScalesDataMass () - 72); //установка высоты для блока ListScalesDataMass
  });
  await ItemMainNav_Graphics (); //событие при нажатии на кнопку "применить" у главной диаграммы
  await GetTotalWeight ().then (res => {
    //получение суммы массы за день
    res = Math.floor (res); //округление знания до целого
    $ ('.total-weight').text (res + 'т.'); //вывод данных суммы массы за день в поле
  });
  var MassScalesOfDay; //масса с  весов за день
  await GetMassWeightofDay ().then (res => {
    MassScalesOfDay = res; //присвоение результата переменной
  });
  await GetNameScales ().then (res => {
    //получение имен весов
    async.forEachOfSeries (res, async (row, ind) => {
      //обход имен весов
      var DataScales = _.where (MassScalesOfDay, {
        text: row.name, //имя весов
      }); //поиск строки с имененм весов
      var MassOfDay = DataScales[0].values[0]; //получение масы по весам за день
      Addcard (row.name, MassOfDay); //добавление элментов с весами
    });
  });
  await GetDataScalesofHour ().then (res => {
    EventClickCard (res);
    //
  });
});

function EventClickCard (data) {
  $ ('.TotalData').on ('click', (el, ind) => {
    var NameScales = $ (el.target).attr ('value');
    FillTemplateModal (data, NameScales);
    $ ('#DataOfHour').modal ();
  });
}

function FillTemplateModal (data, NameScales) {
  $ ('.modal-body').empty ();
  socket.emit ('GetTimeSmen', schedule => {
    var NumSmenList = _.groupBy (schedule, 'NumSmen');
    var KeySmenList = _.keys (NumSmenList);
    async.eachOfSeries (KeySmenList, async (row, ind) => {
      var div = $ ('<div>', {
        id: 'NumSmen_' + row,
      }).appendTo ('.modal-body');
      $ ('<h3>', {
        class: 'text-center',
        text: 'Смена ' + row,
        NumSmen: row,
      }).appendTo (div);
      async.eachOfSeries (schedule, async (Times, ind) => {
        if (Times.NumSmen == row) {
          $ ('<span>', {
            class: 'time',
            text: Times.TimeStart + '-' + Times.TimeEnd,
          }).appendTo (div);
          var DataHour = _.where (data, {
            NameScales: NameScales,
            Hour: Times.Hour,
            NumSmen: Number (row),
          });
          var SumMassHour = 0;
          await async.eachOfSeries (
            DataHour,
            async (rowDataHour, indDataHour) => {
              SumMassHour += rowDataHour.Mass;
            }
          );
          SumMassHour = SumMassHour / 1000;
          $ ('<span>', {
            text: ' ' + SumMassHour + 'т.',
          }).appendTo (div);
          $ ('<br>').appendTo (div);
        }
      });
    });
  });
}

/* ДОБАВЛЕНИЕ ЭЛЕМЕНТА В СПИСОК ВЕСОВ */
function Addcard (Name, MassOfDay) {
  var card = $ ('<div>', {
    class: 'card',
    style: 'margin-top: 5%;',
    value: Name,
  }).appendTo ('#ListScalesDataMass > .force-overflow .List'); //создание и добавление элемента
  var div = $ ('<div>', {
    class: 'TotalData',
    value: Name,
  }).appendTo (card);
  var cardBody = $ ('<div>', {
    class: 'card-body',
    value: Name,
  }).appendTo (div);
  $ ('<h2>', {
    class: 'text-center',
    text: Name,
    value: Name,
  }).appendTo (cardBody); //создание и добавление элемента
  $ ('<h4>', {
    text: 'Масса за день: ' + MassOfDay + 'т.',
    class: 'MassOfday',
    value: Name,
  }).appendTo (cardBody); //создание и добавление элемента
}

/* ПОЛЧЕНИЕ ИМЕН ВЕСОВ */
function GetNameScales () {
  var result = Q.defer (); //создание promise
  socket.emit ('GetNameScales', res => {
    //отправка события сокет
    result.resolve (res); //добавление результата в promise
  });
  return result.promise; //возврат результата в promise
}

/* ПОЛУЧЕНИЕ ОБЩЕЙ СУММЫ ЗА ДЕНЬ */
function GetMassWeightofDay () {
  var result = Q.defer (); //создание promise
  var params = {}; //создание объекта для хранения параметров
  var arr = []; //создание массива для хранения результата
  params.DateTimeStart = moment ().startOf ('Day').format ('YYYY-MM-DD HH:mm'); //получение начала текущего дня
  params.DateTimeEnd = moment ().endOf ('Day').format ('YYYY-MM-DD HH:mm'); //получение конца текущего дня
  socket.emit ('GetTotalWeight', params, res => {
    async.forEachOfSeries (res.Data, async (row, ind) => {
      //обход значений массива
      arr.push (row);
      if (ind == res.Data.length - 1) {
        //проверка на последний элемент массива
        result.resolve (arr); //добавление результата в promise
      }
    });
  });
  return result.promise; //возврат результата в promise
}

/* ПОЛУЧЕНИЕ ОБЩЕЙ СУММЫ ЗА ДЕНЬ */
function GetTotalWeight () {
  var result = Q.defer (); //создание promise
  var params = {}; //создание объекта для хранения параметров
  var summ = 0; //переменная для хранения суммы
  params.DateTimeStart = moment ().startOf ('Day').format ('YYYY-MM-DD HH:mm'); //получение начала текущего дня
  params.DateTimeEnd = moment ().endOf ('Day').format ('YYYY-MM-DD HH:mm'); //получение конца текущего дня
  socket.emit ('GetTotalWeight', params, res => {
    async.forEachOfSeries (res.Data, async (row, ind) => {
      summ += row.values[0]; //итератор суммы
      if (ind == res.Data.length - 1) {
        //проверка на последний элемент массива
        result.resolve (summ); //добавление результата в promise
      }
    });
  });
  return result.promise; //возврат результата в promise
}

/* ПРИ НАЖАТИ НА КНОПКУ "ГРАФИКИ" В ГЛАВНОМ МЕНЮ */
function ItemMainNav_Graphics () {
  $ ('#ItemMainNav_Graphics').parent ('li').addClass ('active'); //добавление класса элементу
  $ ('#MainData').load ('public/Forms/mainChart.html', () => {
    //загрузка файла html
    $ ('#ListScalesDataMass').height (GetHeightListScalesDataMass () - 72); //установка высоты для блока ListScalesDataMass
    FillDateTimemainGraphics (); //заполнение дат в input
    $ ('#MainGraphicsApply').on ('click', () => {
      BuildMainGrafics (); //сборка диаграммы
    });
    BuildMainGrafics (); //сборка диаграммы
  });
}

/* Собрать диаграмму по данным */
function BuildMainGrafics () {
  var params = {}; //создание объекта для хранения параметров
  params.DateTimeStart = moment (
    $ ('#datetimeStart').val (),
    'DD.MM.YYYY HH:mm'
  ).format ('YYYY-MM-DD HH:mm'); //дата начала
  params.DateTimeEnd = moment (
    $ ('#datetimeEnd').val (),
    'DD.MM.YYYY HH:mm'
  ).format ('YYYY-MM-DD HH:mm'); //дата окончания

  socket.emit ('MainGraphicsApply', params, resultData => {
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
    zingchart.render ({
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
function GetHeightListScalesDataMass () {
  var result = 0; //результат
  var HeightNavigate = 0; //высота навигации
  var HeightFooter = 0; //высота футера
  var HeightBody = 0; //получение высоты окна

  /* ПОЛУЧЕНИЕ ВЫСОТА МЕНЮ НАВИГАЦИИ */
  function GetHeightNavigate () {
    var height = $ ('nav').height (); //получение высоты элемента
    return height; //возврат результата
  }
  HeightNavigate = GetHeightNavigate (); //высота блока навигации

  /* ПОЛУЧЕНИЕ ВЫСОТЫ FOOTER */
  function GetHeightFooter () {
    var height = $ ('.page-footer').height (); //получение высоты футера
    return height; //возрат результата
  }
  HeightFooter = GetHeightFooter (); //высота блока footer

  /* ПОЛУЧЕНИЕ ВЫСОТЫ BODY */
  function GetHeightBody () {
    var height = $ ('body').height (); //получение высоты body
    return height; //возврат результата
  }

  HeightBody = GetHeightBody (); //высота страницы
  result = HeightBody - (HeightNavigate + HeightFooter); //получение высоты без учета блоков
  return result; //возврат результата
}

/* ЗАПОЛНЕНИЕ ДАТ НАЧАЛА И ТЕКУЩИЮ ДАТУ В ГАВНОМ КГРАФИКЕ */
function FillDateTimemainGraphics () {
  /* получение даты начала месяца */
  function GetStartDate () {
    var date = moment ().add (-7, 'd').format ('DD.MM.YYYY HH:mm'); //установка формата времени moment
    return date; //возврат значения
  }
  var datetimeStart = GetStartDate (); //начало месяца

  /* ПОЛУЧЕНИЕ ТЕКУЩЕЙ ДАТЫ */
  function GetEndtDate () {
    var date = moment ().format ('DD.MM.YYYY HH:mm'); //установка даты в нудном формате
    return date; //возврат значения
  }
  var datetimeEnd = GetEndtDate (); //текущая дата

  $ ('#datetimeStart').val (datetimeStart); //заполнение поля
  $ ('#datetimeStart').next ().each ((ind, el) => {
    //перебор элементов
    $ (el).addClass ('active'); //добавление класса для label
  });
  $ ('#datetimeEnd').val (datetimeEnd);
  $ ('#datetimeEnd').next ().each ((ind, el) => {
    //перебор элементов
    $ (el).addClass ('active'); //добавление класса для label
  });

  /* УСТАНОВКА ТИПА DATETIMEPICKER ДЛЯ INPUT */
  function SetDatePimePicker () {
    $ ('#datetimeStart').datetimepicker ({
      timepicker: true,
      format: 'd.m.Y H:i',
    }); //указываем что это datepicker
    $ ('#datetimeEnd').datetimepicker ({
      timepicker: true,
      format: 'd.m.Y H:i',
    }); //указываем что это datepicker
  }

  SetDatePimePicker (); //установка datetimepicker для полей input
}

/* ПОЛУЧЕНИЕ ДАННЫХ ПО ВЕСА ЗА КАЖДЫЙ ЧАС */
function GetDataScalesofHour () {
  var result = Q.defer ();
  var params = {}; //создание объекта для хранения параметров
  socket.emit ('GetDataScalesofHour', params, res => {
    var groupData = _.groupBy (res, 'NameScales');
    groupData = _.toArray (groupData); //конвертируем объект в массив
    result.resolve (res);
  });
  return result.promise;
}
