const { InfluxDB } = require('@influxdata/influxdb-client');
const fs = require('fs');

// Configuration
const influxToken = 'UWpmFyL15ivVjBJ9sjxCbWZzcmx3P_YIqwFmguKj_xQf1ZT1DCTa2fnjQb2IgdQCh5le6V2mIJdIrorX4EnJMA=='; // Remplacez par votre token
const influxURL = 'https://us-central1-1.gcp.cloud2.influxdata.com'; // Remplacez par votre URL InfluxDB
const org = 'Dev Team'; // Remplacez par votre organisation
const bucket = 'equipments'; // Remplacez par votre bucket

// Initialisation du client InfluxDB
const influxDB = new InfluxDB({ url: influxURL, token: influxToken });
const queryApi = influxDB.getQueryApi(org);

// Définir les conditions
const conditions = {
  "Temps_PCC": value => value >= 0 && value <= 800,
  "Temps_SCC_in": value => value >= 0 && value <= 900,
  "Suction": value => value >= 0 && value <= 10,
  "Oxygene": value => value >= 0 && value <= 20,
  "Ejector_Speed": value => value >= 0 && value <= 100,
  "SCCair": value => value >= 0 && value <= 50,
  "Sideair": value => value >= 0 && value <= 30,
  "bypass": value => value === 0 || value === 1,
  "Cremating": value => value === 0 || value === 1,
  "Topair": value => value >= 0 && value <= 50,
  "Mode": value => [0, 1, 2, 5].includes(value),
  "CO": value => value >= 0,
  "FGT_Bag_in_temp": value => value >= 0 && value <= 200,
  "Temps_Flue": value => value >= 0 && value <= 400,
  "Bag_Diff": value => value >= 0 && value <= 10
};

const getBucketData = async () => {
  try {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString();
    const nowISOString = now.toISOString();
    console.log('Current Time:', nowISOString);
    console.log('One Minute Ago:', oneMinuteAgo);

    const fluxQuery = `
      from(bucket: "${bucket}")
        |> range(start: ${oneMinuteAgo}, stop: ${nowISOString})
        |> filter(fn: (r) => r["_measurement"] != "")
        |> sort(columns: ["_time"], desc: true)
    `;

    console.log('Executing query:', fluxQuery);

    const results = [];

    // Exécution de la requête
    await queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        const conditionMet = conditions[o._measurement] ? conditions[o._measurement](o._value) : true;
        if (!conditionMet) {
          results.push({
            measurement: o._measurement,
            E_ID: o.E_ID,
            field: o._field,
            value: o._value,
            time: o._time
          });
        }
      },
      error(error) {
        console.error('Query ERROR', error);
      },
      complete() {
        console.log('Query complete');

        // Trier et regrouper les valeurs par E_ID
        const groupedData = results.reduce((acc, currentValue) => {
          const { E_ID, measurement, field, value, time } = currentValue;
          if (!acc[E_ID]) {
            acc[E_ID] = [];
          }
          acc[E_ID].push({ measurement, field, value, time });
          return acc;
        }, {});

        // Écrire les résultats triés dans un fichier avec un nom fixe
        const fileName = 'sorted_influxdata.json';
        fs.writeFile(fileName, JSON.stringify(groupedData, null, 2), (err) => {
          if (err) {
            console.error('Error writing file', err);
          } else {
            console.log(`Results written to ${fileName}`);
          }
        });
      },
    });
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

// Exécution du script
getBucketData();
