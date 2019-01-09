"use strict"
/* ==========Модуль для построения диаграмм========== */

function DataMainGraphics() {
  var socket = io.connect(AdrServ);
  socket.on('DataMainGraphics', DataMainGraphics => {
    result = DataMainGraphics;
  })

}

function LoadMainDiagram(data) {
  var values = [];
  var valDate = [];
  for (var i = 0; i <= data.length - 1; i++) {
    var row = {};
    valDate = [];
    var text = '';
    var val = [];
    for (var j = 0; j <= data[i].length - 1; j++) {
      val.push(data[i][j]['SummMass'] / 1000);
      text = data[i][j]['NameScales'];
      valDate.push(moment(data[i][j]['Date'], 'DD.MM.YYYY')
      .format('DD.MM.YYYY') )
    }
    row.values = val;
    row.text = text;
    values.push(row);
  }
  var chartData = {
    "legend": {
      "layout": "x2",
      "align": "right"
    },
    type: "line", // Specify your chart type here.
    series: values,

    "scaleX": {
      markers: ['1', '2', '3', '4'],
      labels: valDate,
      offsetEnd: 20,
    },
  };
  zingchart.render({ // Render Method[3]
    id: 'MainGraphics',
    data: chartData,
    height: '100%',
    width: '100%'
  });
}
