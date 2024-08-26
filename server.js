const { InfluxDB } = require('@influxdata/influxdb-client');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Importer les conditions
const checkTempsPcc = require('./conditions/tempsPcc');
const checkTempsSccIn = require('./conditions/tempsSccIn');
const checkSuction = require('./conditions/suction');
const checkOxygene = require('./conditions/oxygene');
const checkEjectorSpeed = require('./conditions/ejectorSpeed');
const checkSccAir = require('./conditions/sccAir');
const checkSideAir = require('./conditions/sideAir');
const checkBypass = require('./conditions/bypass');
const checkCremating = require('./conditions/cremating');
const checkTopAir = require('./conditions/topAir');
const checkMode = require('./conditions/mode');
const checkCo = require('./conditions/co');
const checkFgtBagInTemp = require('./conditions/fgtBagInTemp');
const checkTempsFlue = require('./conditions/tempsFlue');
const checkBagDiff = require('./conditions/bagDiff');

// Configuration 
const influxToken = 'UWpmFyL15ivVjBJ9sjxCbWZzcmx3P_YIqwFmguKj_xQf1ZT1DCTa2fnjQb2IgdQCh5le6V2mIJdIrorX4EnJMA==';
const influxURL = 'https://us-central1-1.gcp.cloud2.influxdata.com';
const org = 'Dev Team';
const bucket = 'equipments';

const stateFilePath = './serverState.json';

const influxDB = new InfluxDB({ url: influxURL, token: influxToken });
const queryApi = influxDB.getQueryApi(org);

let monitoredEquipments = {};

const loadState = () => {
  if (fs.existsSync(stateFilePath)) {
    const data = fs.readFileSync(stateFilePath);
    monitoredEquipments = JSON.parse(data);
  }
};

const saveState = () => {
  fs.writeFileSync(stateFilePath, JSON.stringify(monitoredEquipments, null, 2));
};

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading page');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content, 'utf-8');
      }
    });
  } else if (req.url === '/data') {
    const filePath = path.join(__dirname, 'sorted_influxdata.json');
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading data');
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(content, 'utf-8');
      }
    });
  } else {
    res.writeHead(404);
    res.end('Page not found');
  }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  const sendData = async () => {
    try {
      const now = new Date();
      const tenSecondsAgo = new Date(now.getTime() - 100 * 1000).toISOString();
      const nowISOString = now.toISOString();

      const fluxQuery = `
        from(bucket: "${bucket}")
          |> range(start: ${tenSecondsAgo}, stop: ${nowISOString})
          |> filter(fn: (r) => r["_measurement"] != "")
          |> sort(columns: ["_time"], desc: true)
      `;

      const results = [];

      await queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);

          let conditionMet = true;

          switch (o._measurement) {
            case 'Temps_PCC':
              conditionMet = checkTempsPcc(o._value);
              break;
            case 'Temps_SCC_in':
              conditionMet = checkTempsSccIn(o._value);
              break;
            case 'Suction':
              conditionMet = checkSuction(o._value);
              break;
            case 'Oxygene':
              conditionMet = checkOxygene(o._value);
              break;
            case 'Ejector_Speed':
              conditionMet = checkEjectorSpeed(o._value);
              break;
            case 'SCCair':
              conditionMet = checkSccAir(o._value);
              break;
            case 'Sideair':
              conditionMet = checkSideAir(o._value);
              break;
            case 'bypass':
              conditionMet = checkBypass(o._value);
              break;
            case 'Cremating':
              conditionMet = checkCremating(o._value);
              break;
            case 'Topair':
              conditionMet = checkTopAir(o._value);
              break;
            case 'Mode':
              conditionMet = checkMode(o._value);
              break;
            case 'CO':
              conditionMet = checkCo(o._value);
              break;
            case 'FGT_Bag_in_temp':
              conditionMet = checkFgtBagInTemp(o._value);
              break;
            case 'Temps_Flue':
              conditionMet = checkTempsFlue(o._value);
              break;
            case 'Bag_Diff':
              conditionMet = checkBagDiff(o._value);
              break;
            default:
              break;
          }

          if (!conditionMet) {
            if (!monitoredEquipments[o.E_ID]) {
              monitoredEquipments[o.E_ID] = { measurements: {}, lastUpdate: nowISOString };
            }
            if (!monitoredEquipments[o.E_ID].measurements[o._measurement]) {
              monitoredEquipments[o.E_ID].measurements[o._measurement] = { 
                value: o._value, 
                firstOutOfTolerance: nowISOString, 
                count: 1, 
                lastOutOfTolerance: nowISOString 
              };
            } else {
              const measurement = monitoredEquipments[o.E_ID].measurements[o._measurement];
              measurement.value = o._value;
              if (new Date(o._time) - new Date(measurement.lastOutOfTolerance) > 10000) {
                measurement.count++;
              }
              measurement.lastOutOfTolerance = nowISOString;
            }
            monitoredEquipments[o.E_ID].lastUpdate = nowISOString;

            results.push({
              measurement: o._measurement,
              E_ID: o.E_ID,
              field: o._field,
              value: o._value,
              time: o._time,
              firstOutOfTolerance: monitoredEquipments[o.E_ID].measurements[o._measurement].firstOutOfTolerance,
              count: monitoredEquipments[o.E_ID].measurements[o._measurement].count
            });
          }
        },
        error(error) {
          console.error('Query ERROR', error);
        },
        complete() {
          console.log('Query complete');
          monitorEquipments(nowISOString);
          saveState();
          ws.send(JSON.stringify(results));
        },
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const monitorEquipments = (currentTime) => {
    const updatedResults = [];

    Object.keys(monitoredEquipments).forEach(E_ID => {
      const equipment = monitoredEquipments[E_ID];
      let outOfTolerance = false;

      for (const [measurement, info] of Object.entries(equipment.measurements)) {
        let conditionMet = true;
        switch (measurement) {
          case 'Temps_PCC':
            conditionMet = checkTempsPcc(info.value);
            break;
          case 'Temps_SCC_in':
            conditionMet = checkTempsSccIn(info.value);
            break;
          case 'Suction':
            conditionMet = checkSuction(info.value);
            break;
          case 'Oxygene':
            conditionMet = checkOxygene(info.value);
            break;
          case 'Ejector_Speed':
            conditionMet = checkEjectorSpeed(info.value);
            break;
          case 'SCCair':
            conditionMet = checkSccAir(info.value);
            break;
          case 'Sideair':
            conditionMet = checkSideAir(info.value);
            break;
          case 'bypass':
            conditionMet = checkBypass(info.value);
            break;
          case 'Cremating':
            conditionMet = checkCremating(info.value);
            break;
          case 'Topair':
            conditionMet = checkTopAir(info.value);
            break;
          case 'Mode':
            conditionMet = checkMode(info.value);
            break;
          case 'CO':
            conditionMet = checkCo(info.value);
            break;
          case 'FGT_Bag_in_temp':
            conditionMet = checkFgtBagInTemp(info.value);
            break;
          case 'Temps_Flue':
            conditionMet = checkTempsFlue(info.value);
            break;
          case 'Bag_Diff':
            conditionMet = checkBagDiff(info.value);
            break;
          default:
            break;
        }

        if (!conditionMet) {
          outOfTolerance = true;
          updatedResults.push({
            E_ID,
            measurement,
            value: info.value,
            time: equipment.lastUpdate,
            firstOutOfTolerance: info.firstOutOfTolerance,
            count: info.count
          });
        }
      }

      if (!outOfTolerance) {
        delete monitoredEquipments[E_ID];
      }
    });

    if (updatedResults.length > 0) {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(updatedResults));
        }
      });
    }
  };

  loadState();
  sendData();
  const interval = setInterval(sendData, 10000);

  ws.on('close', () => {
    clearInterval(interval);
    console.log('Client disconnected');
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
