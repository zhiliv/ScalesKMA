'use strict';

var Q = require('q'),
  _ = require('underscore'),
  async = require('async'),
    DB = require('./DB'); //подключения модуля для работы с БД

exports.GetMainGraphics = async (params, callback) => {
  var ListScales;
  await FillScales().then(res => { //получение списка весов
    ListScales = res; //присвоение переменной значения результата
  })
  var ListData;
  await FillNameScalesForData(ListScales, params).then(res => {
    ListData = res;
  })
  var ListDate;
  await OrganizationDate(ListData).then(res => {
    ListDate = res;
  });
  var labelDate;
  await SortListDate(ListDate).then(res => {
    labelDate = res;
  })
  var DataToProcess;
  await OrganizationArrValues(ListDate, ListData).then(res => {
    DataToProcess = res;
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
      })
      if (ind == ListScales.length - 1) { //проверка на последний элемент массива с весами
        result.resolve(arr); //добавление результата в promise
      }
    })
    return result.promise; //возврат результата в promise
  }

  /* ПОЛУЧЕНИЕ МАССЫ ДОБЫЧИ */
  function GetSostavGroupOfVagonsForDay(InpParams, NameScales) {
    var result = Q.defer(); //создание promise
    InpParams.NameScales = NameScales; //имя весов
    DB.GetSostavGroupOfVagonsForDay(InpParams, res => {
      result.resolve(res); //добавление результата в promise
    });
    return result.promise; //возврат результа в promise
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

}


exports.GetMainGraphics = async (params, callback) => {
  var ListScales;
  await FillScales().then(res => { //получение списка весов
    ListScales = res; //присвоение переменной значения результата
  })
  var ListData;
  await FillNameScalesForData(ListScales, params).then(res => {
    ListData = res;
  })
  var ListDate;
  await OrganizationDate(ListData).then(res => {
    ListDate = res;
  });
  var labelDate;
  await SortListDate(ListDate).then(res => {
    labelDate = res;
  })
  var DataToProcess;
  await OrganizationArrValues(ListDate, ListData).then(res => {
    DataToProcess = res;
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
      })
      if (ind == ListScales.length - 1) { //проверка на последний элемент массива с весами
        result.resolve(arr); //добавление результата в promise
      }
    })
    return result.promise; //возврат результата в promise
  }

  /* ПОЛУЧЕНИЕ МАССЫ ДОБЫЧИ */
  function GetSostavGroupOfVagonsForDay(InpParams, NameScales) {
    var result = Q.defer(); //создание promise
    InpParams.NameScales = NameScales; //имя весов
    DB.GetSostavGroupOfVagonsForDay(InpParams, res => {
      result.resolve(res); //добавление результата в promise
    });
    return result.promise; //возврат результа в promise
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

}