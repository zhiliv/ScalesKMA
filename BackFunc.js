'use strict';

var Q = require('q'),
  _ = require('underscore'),
  async = require('async'),
    moment = require('moment'), //подключение momentjs
    DB = require('./DB'); //подключения модуля для работы с БД

moment.locale('ru'); //указание локации у moment js

exports.GetMainGraphics = async (params, callback) => {
  var ListScales;
  await FillScales().then(res => { //получение списка весов
    ListScales = res; //присвоение переменной значения результата
  })
  var ListData; //переменная для хранения данных
  await FillNameScalesForData(ListScales, params).then(res => {
    console.log('TCL: exports.GetMainGraphics -> res', res)
    ListData = res; //присовение переменной значения
  })
  var ListDate; //переменная для хранения списка дат
  await OrganizationDate(ListData).then(res => {

    ListDate = res; //присвоение переменной значения результата
  });
  var labelDate; //сформированный список дат для выовда на диаграмму
  await SortListDate(ListDate).then(res => {
    labelDate = res; //присовение результата переменной
  })
  var DataToProcess; //переменная для хранения данных для обработки
  await OrganizationArrValues(ListDate, ListData).then(res => {
    DataToProcess = res; //присвоение результата перменной
  });
  await OrganizationResultData(DataToProcess).then(res => {
    var result = {}; //создание объекта
    result.labelDate = labelDate; //добавление в объект списка дат
    result.Data = res; //добавление  в объект данных
    callback(result) //возврат результата в callback
  })

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

  /* Сортировка массива и добалвение 0 к отсутствующим датам */
  async function OrganizationArrValues(ListDate, arrData) {
    var result = Q.defer();
    var TempArrData; //создание массива для временного хранения данных
    await TempArrData(arrData).then(res => { //формирование временного массива
      TempArrData = res; //присовение переменной результата
    })

    var arrNameScales;
    await GetNameScales(arrData).then(res => {
      arrNameScales = res;
    })

    await GetresultArr(TempArrData, labelDate).then(res => {
      result.resolve(res);
    })
    return result.promise;

    function GetNameScales(arrData) {
      var result = Q.defer();
      var arrNameScales = [];
      async.forEachOfSeries(arrData, async (row, ind) => {
        arrNameScales.push(row[0].NameScales); //формированеи массива со спискем имен весов
        if (ind == arrData.length - 1) {
          result.resolve(arrNameScales);
        }
      })
      return result.promise;
    }

    function GetresultArr(TempArrData, ListDate) {
      var TmpArrResult = []
      var result = Q.defer();
      ListDate.forEach((rowListDate, indListDate) => {
        //обход массива с датами
        var TMP = _.where(TempArrData, {
          Date: rowListDate
        }); //нахождение (проверка на сущестоввание) элемента массиа
        if (TMP.length != arrNameScales.length) {
          //првоерка на существование массива
          arrNameScales.forEach(async (rowNameScales, indNameScales) => {
            //обход всех имен весов
            var CheckScales = _.where(TempArrData, {
              NameScales: rowNameScales,
              Date: rowListDate
            }); //нахождение элемента мссива по свойству объетка(првоерка на существование)
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
      return result.promise;
    }

    /* ФОРМИРОВАНИЕ ВРЕМЕННОГО МАССИВА */
    function TempArrData() {
      var result = Q.defer(); //создание promise
      var TmpArrResult = []; //массив для создания результата
      async.forEachOfSeries(arrData, async (rowData, ind) => { //обход значений по весам
        await async.each(rowData, row => { //обход каждого значения
          TmpArrResult.push(row); //доабвление данных во временный массив
        })
        if (ind == arrData.length - 1) { //проверка на соследний элемент
          result.resolve(TmpArrResult); //добавление результата в promise
        }
      })
      return result.promise; //возврат результата в promise
    }
  }

  /* СОРТИРОВКА ДАТ ОТ МЕНЬШЕЙ К БОЛЬШЕЙ */
  function SortListDate(ListDate) {
    var result = Q.defer(); //создание promise
    ListDate = _.sortBy(ListDate, (i) => { //сортировка по датам
      return i; //возврат значения в массив
    })
    result.resolve(ListDate) //добавления результата в promise
    return result.promise //возврат результата в promise
  }

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
        result.resolve(arrDate); //добавление результата в promise
      }
    });
    return result.promise; //возврат результата в promise
  }

  /* ПОЛУЧЕНИЕ ДАННЫМ ПО ВЕСАМ ЗА ПЕРИОД */
  function FillNameScalesForData(ListScales, params) {
    var result = Q.defer(); //создание promise
    var arr = []; //создание массива для хранения результата
    async.forEachOfSeries(ListScales, async (row, ind) => { //обход значений массива с имененм весов
      await GetSostavGroupOfVagonsForDay(params, row).then(res => { //поулчение данных из БД
        arr.push(res); //добавление результата в массив
        if (ind == ListScales.length - 1) { //проверка на последний элемент массива с весами
          result.resolve(arr); //добавление результата в promise
        }
      })
    })
    return result.promise; //возврат результата в promise
  }

  /* ПОЛУЧЕНИЕ МАССЫ ДОБЫЧИ */
  async function GetSostavGroupOfVagonsForDay(InpParams, NameScales) {
    var result; //переменная для хранения результата
    var params = {};
    params = InpParams;
    params.NameScales = NameScales;
    var ArrInitial;
    await FillArr(params).then(res => {
      ArrInitial = res;
    })
    var arrDate;
    await GetArrDate(ArrInitial).then(res => {
      arrDate = res;
    }); //получение массива дат(по дням)
    var ResArrDate;
    await GetArrDateDay(arrDate, params.DateTimeEnd).then(res => {
      ResArrDate = res;
    }); //получение массива уникальных дней 
    var DataScales;
    await FillArrDate(ResArrDate, params.NameScales).then(res => {
      DataScales = res;
    }); //объод массива с уникальными днями
    await CheckSostavOfTime(DataScales).then(res => {
      result = res;
    });
    return result;

    /* ПРОВЕРКА СООТВЕТСТВИЯ СОСТАВF И ВРЕМЕНИ */
    function CheckSostavOfTime(DataScales) {
      var result = Q.defer(); //создние promise
      var arrResult = []; //создание массива
      var arrBrutto = DataScales.Brutto; //массив "Нетто"
      var arrNetto = DataScales.Netto; //массив "Брутто"
      _.each(arrBrutto, async (rowBrutto, indRowBrutto) => {
        //объод массива
        var DateStartBrutto = rowBrutto.DateTimeStart; //дата начала
        var ConformityNetto = _.findWhere(arrNetto, {
          DateTimeStart: DateStartBrutto
        }); //найденный эелмент "Нетто" по времени
        var ListBrutto = rowBrutto.List; //список отгрузок по времени "Брутто"
        var ListNetto = ConformityNetto.List; //список отгрузок по времени "Нетто"
        _.each(ListBrutto, rowListBrutto => {
          //обход массива строк "Нетто"
          var DateTimeOpBruttoCompare = rowListBrutto.DateTimeOp; //дата для сравнения
          for (var tmr = 2; tmr <= 12; tmr++) {
            //цикл для добавления времени
            var DateOpNettoAdd = moment(DateTimeOpBruttoCompare)
              .add(tmr, 'minutes')
              .format('YYYY-MM-DD HH:mm'); //добавление 1 минуты к дате
            var ConformityValue = _.findWhere(ListNetto, {
              DateTimeOp: DateOpNettoAdd
            }); //проверка времени и нахождение элемента
            if (ConformityValue != undefined) {
              //проверка элемента на существование
              var Mass = GetMass(rowListBrutto.Mass, ConformityValue.Mass); //разницы БРУТТО-НЕТТО
              var Obj = {}; //создание объекта
              Obj.Mass = Mass; //добавление суммы массы в объект
              Obj.NameScales = rowBrutto.NameScales; //добавление имени весов в объект
              Obj.Date = moment(ConformityValue.DateTimeOp).format('YYYY-MM-DD'); //добавление даты в объект
              arrResult.push(Obj); //добавление объекта в массив
              break; //прервать цикл for
            }
          }
        });
        if (indRowBrutto == arrBrutto.length - 1) {
          result.resolve(GetArrResult(arrResult)); //добавление результата в promise
        }
      });
      return result.promise; //возврат результата в promise4

      /* ПОЛУЧЕНИЕ РАЗНИЦЫ БРУТТО-НЕТТО */
      function GetMass(Brutto, Netto) {
        var result = 0; //объявление переменной с результатом
        if (Brutto == 0) {
          //проверка БРУТТО на 0
          result = 0; //присовение 0 результату
        } else {
          result = Brutto - Netto; //получение разницы
          if (result < 0) {
            //проверка результата
            result = 0; //присвоение 0 результату
          }
        }
        return result; //возврат результата
      }

      /* ПОЛУЧЕНИЕ РЕЗУЛЬТАТАНОГО МАССИВА */
      function GetArrResult(arrResult) {
        var arr = []; //создание массива
        var GroupData = _.groupBy(arrResult, 'Date'); //группировка элементов по дате
        for (var key in GroupData) {
          //обход всех свойств объекта
          var List = GroupData[key]; //получение группированного списка с результатами
          var NameScales = ''; //объявление переменной для имени весов
          var SumMass = 0; //сумма массы
          _.each(List, (row, ind) => {
            //объод массива с данными
            SumMass += row.Mass; //получение суммы массы
            NameScales = row.NameScales; //Имя весов
          });
          var Obj = {}; //создание объекта
          Obj.Date = key; //добавление даты в объект
          Obj.SummMass = SumMass; //добавление суммы массы
          Obj.NameScales = NameScales; //добавление имени весов
          arr.push(Obj); //добавление объекта в массив
        }
        return arr;
      }
    }

    /* ОБХОД МАССИВА С ДАТАМИ */
    function FillArrDate(ArrDate, NameScales) {
      var result = Q.defer(); //создание promise
      var res = {}; //создание объекта для хранения разуьтата
      var arrBrutto = []; //массив для хранения результата "Брутто"
      var arrNetto = []; //массив для хранения результата "Нетто"
      async.forEachOfSeries(ArrDate, async (row, ind) => {
        //объод массива дат
        await GetDataBruttoOfPeriod(row.StartDay, row.EndDay, NameScales).then(async bruttoDate => {
          //получение данных по "Брутто"
          await arrBrutto.push(bruttoDate); //добавление результата в массив
        });
        await GetDataNettoOfPeriod(row.StartDay, row.EndDay, NameScales).then(async NettoDate => {
          //получение данных по "Нетто"
          await arrNetto.push(NettoDate); //добавление результата в массив
        });
        if (ind == ArrDate.length - 1) {
          //проверка на последиее значение массива
          res.Brutto = arrBrutto; //добавление в объект массива "Брутто"
          res.Netto = arrNetto; //добавление в объект массива "Нетто"
          result.resolve(res);
        }
      });
      return result.promise;

      function GetDataNettoOfPeriod(DateTimeStart, DateTimeEnd, NameScales) {
        var result = Q.defer(); //создание promise
        var params = {}; //содаем объект жля ханения параетров
        params.DateTimeStart = DateTimeStart; //добавление даты начала в параметр
        params.DateTimeEnd = DateTimeEnd; //добавление даты конца в обхект
        params.NameScales = NameScales; //добавление имени весов в обхект
        DB.GetDataNettoOfPeriod(params, res => { //получение результата из БД
          result.resolve(res); //добавление результата в promise
        })
        return result.promise; //вовзврат результата в promise
      }

      function GetDataBruttoOfPeriod(DateTimeStart, DateTimeEnd, NameScales) {
        var result = Q.defer(); //создание promise
        var params = {}; //содаем объект жля ханения параетров
        params.DateTimeStart = DateTimeStart; //добавление даты начала в параметр
        params.DateTimeEnd = DateTimeEnd; //добавление даты конца в обхект
        params.NameScales = NameScales; //добавление имени весов в обхект
        DB.GetDataBruttoOfPeriod(params, res => { //получение результата из БД
          result.resolve(res); //добавление результата в promise
        })
        return result.promise; //вовзврат результата в promise
      }
    }

    /* ПОЛУЧЕНИЕ МАССИВА УНИКАЛЬНЫХ ДНЕЙ*/
    async function GetArrDateDay(List, DateTimeEnd) {
      var result = Q.defer(); //создание promise
      var arrDate = []; //массив для хранения результата
      var BeginDate = ''; //дата начала
      async.forEachOfSeries(List, async (row, indRow) => {
        //обход массива
        if (indRow == 0) {
          BeginDate = moment(new Date(row)).format('YYYY-MM-DD HH:mm'); //начало дня
        }
        var EndDate = moment(new Date(row))
          .endOf('day')
          .format('YYYY-MM-DD HH:mm'); //начало дня
        var StartDay = moment(new Date(row))
          .startOf('day')
          .format('YYYY-MM-DD HH:mm'); //начало дня
        var ind = arrDate
          .map(row => {
            return row.StartDay;
          })
          .indexOf(StartDay); //поиск в массиве элементов
        if (ind == -1) {
          var Obj = {}; //создание новго объекта
          Obj.StartDay = StartDay; //добавление даты начала
          Obj.EndDay = EndDate; //добавление даты окончания
          await arrDate.push(Obj); //добавление объекта в массив
        }
        if (indRow == List.length - 1) {
          //проверка на последнюю запись в массиве
          arrDate = ChangeDateRow(arrDate, BeginDate, DateTimeEnd); //переформирование объектов массива
          result.resolve(arrDate); //добавление результата в promise
        }
      });
      return result.promise; //возврат результата в promise

      /* ДОБАВЛЕНИЕ ДАТЫ НАЧАЛА И КОНЦА В ПЕРВУЮ И ПОСЕЛДНЮЮ СТРОКУ */
      function ChangeDateRow(arrDate, BeginDate, EndDate) {
        arrDate[0].StartDay = BeginDate; //изменение даты начала в первой строке
        arrDate[arrDate.length - 1].EndDay = EndDate; //зименение даты окончания в последней строке
        return arrDate; //возврат результата
      }
    }


    /* ОБХОД МАССИВА С ДАННЫМИ */
    function FillArr(params) {
      var result = Q.defer(); //создание promise
      DB.FillArr(params, async res => { //получение данных из БД
        result.resolve(res); //добавление результата в promise
      }); //Обход массива типов весов
      return result.promise; //возврат результата в promise
    }

    /* ПОЛУЧЕНИЕ МАССИВА ДАТ */
    function GetArrDate(List) {
      var result = Q.defer(); //создание promise
      var arrDate = []; //создание масива дляхранения дат
      var Listdate = List.List; //исходный массив дат
      async.forEachOfSeries(Listdate, async (row, ind) => {
        //обход значений массива
        await arrDate.push(row.DateTimeOp); //добавление в массив строки
        if (ind == Listdate.length - 1) {
          //првоерка последней строки
          result.resolve(arrDate); //добавлние рузльтата в promise
        }
      });
      return result.promise; //возврат результата в promise
    }
  }
}

/* ПОЛУЧЕНИЕ ИМЕН ВЕСОВ */
async function FillScales() {
  var result = Q.defer(); //создание promise
  var ListScales; //переменная для хранения списка весов
  await GetScalesOutDB().then(res => { //получение весов из БД
    ListScales = res; //присовение результата переменной
  })
  await GetListNameScales(ListScales).then(res => { //получение массива имен весов
    result.resolve(res) //добавление результата в promise
  })
  return result.promise; //возврат результата в promise

  /* ПОЛУЧЕНИЕ МАССИВА ИМЕН ВЕСОВ */
  function GetListNameScales(ListScales) {
    var result = Q.defer(); //создане promise
    var arr = []; //создание массива
    async.forEachOfSeries(ListScales, async (row, ind) => { //обход значений массива с полученными данными из БД
      arr.push(row.name); //добавление имени весов в массив
      if (ind == ListScales.length - 1) { //првоерка на последний элемент массива
        result.resolve(arr); //добавление презультата в promise
      }
    })
    return result.promise; //возврат результа в promise
  }

  /* ПОЛУЧЕНИЕ СПИСКА ВЕСОВ ИЗ бд */
  function GetScalesOutDB() {
    var result = Q.defer(); //создание promise
    DB.GetNameScales(res => { //получение результата из БД
      result.resolve(res) //добавление разультата в promise
    });
    return result.promise; //возврат результата в promise
  }
}

exports.GetDataScalesofHour = async (params, callback) => {
  var ListScales;
  await FillScales().then(res => { //получение списка весов
    ListScales = res; //присвоение переменной значения результата
  })
  var ListTimeSmens;
  await GetTimeSmen().then(res => { //полчение смен по часам
    ListTimeSmens = res; //добавление результата в переменную
  })
  var Data;
  await GetData(ListScales).then(res => {
    Data = res
  })
  CheckSostav(Data).then(res => {
    callback(res)
  });


  function CheckSostav(Data) {
    var arr = [];
    var result = Q.defer();
    async.forEachOfSeries(Data, async (row, ind) => {
      var arrNetto = row.Netto.List;
      var arrBrutto = row.Brutto.List;
      var NameScales = row.Brutto.NameScales;
      await Takedata(arrBrutto, arrNetto, NameScales).then(res => {
        arr.push(res);
      })
      if (ind == Data.length - 1) {
        result.resolve(arr)
      }
    })
    return result.promise;

    function Takedata(arrBrutto, arrNetto, NameScales) {
      var result = Q.defer();
      var arrResult = [];
      async.forEachOfSeries(arrBrutto, async (rowBrutto, indBrutto) => {
        var DateTimeOpBruttoCompare = rowBrutto.DateTimeOp; //дата для сравнения
        for (var tmr = 2; tmr <= 12; tmr++) {
          //цикл для добавления времени
          var DateOpNettoAdd = moment(DateTimeOpBruttoCompare)
            .add(tmr, 'minutes')
            .format('YYYY-MM-DD HH:mm'); //добавление 1 минуты к дате
          var ConformityValue = _.findWhere(arrNetto, {
            DateTimeOp: DateOpNettoAdd
          }); //проверка времени и нахождение элемента
          if (ConformityValue != undefined) {
            //проверка элемента на существование
            var Mass = GetMass(rowBrutto.Mass, ConformityValue.Mass); //разницы БРУТТО-НЕТТО
            var Obj = {}; //создание объекта
            Obj.Mass = Mass; //добавление суммы массы в объект
            Obj.NameScales = NameScales; //добавление имени весов в объект
            Obj.Date = moment(ConformityValue.DateTimeOp).format('YYYY-MM-DD'); //добавление даты в объект
            arrResult.push(Obj); //добавление объекта в массив
          }
        }
        if (indBrutto == arrBrutto.length - 1) {
          result.resolve(arrResult)
        }
      })
      return result.promise;
    }


    /* ПОЛУЧЕНИЕ РАЗНИЦЫ БРУТТО-НЕТТО */
    function GetMass(Brutto, Netto) {
      var result = 0; //объявление переменной с результатом
      if (Brutto == 0) {
        //проверка БРУТТО на 0
        result = 0; //присовение 0 результату
      } else {
        result = Brutto - Netto; //получение разницы
        if (result < 0) {
          //проверка результата
          result = 0; //присвоение 0 результату
        }
      }
      return result; //возврат результата
    }
  }

  /* Получение смен по часам */
  function GetTimeSmen() {
    var result = Q.defer(); //создание promise
    DB.GetTimeSmen(res => { //получение данных из БД
      result.resolve(res); //добавление результата в promise
    })
    return result.promise; //возврат результата в promise
  }

  function GetData(ListScales) {
    var result = Q.defer();
    var arr = [];
    var DateStart = moment().startOf('day').format('YYYY-MM-DD HH:mm');
    var DateEnd = moment().format('YYYY-MM-DD HH:mm');
    async.forEachOfSeries(ListScales, async (row, ind) => {
      var resData = {};
      await GetDataBruttoOfPeriod(DateStart, DateEnd, row).then(res => {
        resData.Brutto = res;
      })
      await GetDataNettoOfPeriod(DateStart, DateEnd, row).then(res => {
        resData.Netto = res;
      })
      await arr.push(resData)
      if (ind == ListScales.length - 1) {
        await result.resolve(arr);
      }
    })
    return result.promise;

    function GetDataNettoOfPeriod(DateTimeStart, DateTimeEnd, NameScales) {
      var result = Q.defer(); //создание promise
      var params = {}; //содаем объект жля ханения параетров
      params.DateTimeStart = DateTimeStart; //добавление даты начала в параметр
      params.DateTimeEnd = DateTimeEnd; //добавление даты конца в обхект
      params.NameScales = NameScales; //добавление имени весов в обхект
      DB.GetDataNettoOfPeriod(params, res => { //получение результата из БД
        result.resolve(res); //добавление результата в promise
      })
      return result.promise; //вовзврат результата в promise
    }

    function GetDataBruttoOfPeriod(DateTimeStart, DateTimeEnd, NameScales) {
      var result = Q.defer(); //создание promise
      var params = {}; //содаем объект жля ханения параетров
      params.DateTimeStart = DateTimeStart; //добавление даты начала в параметр
      params.DateTimeEnd = DateTimeEnd; //добавление даты конца в обхект
      params.NameScales = NameScales; //добавление имени весов в обхект
      DB.GetDataBruttoOfPeriod(params, res => { //получение результата из БД
        result.resolve(res); //добавление результата в promise
      })
      return result.promise; //вовзврат результата в promise
    }
  }

}