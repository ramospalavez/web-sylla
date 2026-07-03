const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'data.json');

function readData() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

module.exports = { readData, writeData, genId };
