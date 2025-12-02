const countries = require('world-countries');

const france = countries.find(c => c.cca2 === 'FR');
console.log('France coordinates:', france.latlng);
