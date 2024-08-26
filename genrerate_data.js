const fs = require('fs');
const path = require('path');

function generateSyntheticData(numSamples) {
  const syntheticData = [];

  for (let i = 0; i < numSamples; i++) {
    // Données normales
    const normalData = {
      temperature: Math.random() * 30 + 60,  // Température entre 60 et 90
      oxygen: Math.random() * 10 + 15,       // Oxygène entre 15 et 25
      suction: Math.random() * 20 + 40,      // Succion entre 40 et 60
      label: 0                               // Normal
    };

    // Données de défaillance pour surchauffe
    const overheatData = {
      temperature: Math.random() * 20 + 80,  // Température entre 80 et 100
      oxygen: Math.random() * 10 + 15,       // Oxygène entre 15 et 25
      suction: Math.random() * 20 + 40,      // Succion entre 40 et 60
      label: 1                               // Surchauffe
    };

    // Données de défaillance pour absence d'oxygène
    const noOxygenData = {
      temperature: Math.random() * 30 + 60,  // Température entre 60 et 90
      oxygen: Math.random() * 5,             // Oxygène entre 0 et 5
      suction: Math.random() * 20 + 40,      // Succion entre 40 et 60
      label: 2                               // Absence d'oxygène
    };

    // Données de défaillance pour succion insuffisante
    const lowSuctionData = {
      temperature: Math.random() * 30 + 60,  // Température entre 60 et 90
      oxygen: Math.random() * 10 + 15,       // Oxygène entre 15 et 25
      suction: Math.random() * 20 + 20,      // Succion entre 20 et 40
      label: 3                               // Succion insuffisante
    };

    // Ajouter les données normales et de défaillance
    syntheticData.push(normalData);
    syntheticData.push(overheatData);
    syntheticData.push(noOxygenData);
    syntheticData.push(lowSuctionData);
  }

  return syntheticData;
}

const data = generateSyntheticData(1000); // Génère 1000 échantillons de données

// Sauvegarder les données générées dans un fichier
fs.writeFileSync(path.join(__dirname, 'synthetic_data.json'), JSON.stringify(data, null, 2));
