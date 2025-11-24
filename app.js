// app.js
const path = require('path');
const fs = require('fs');
const express = require('express');
const OS = require('os');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));
app.use(cors());

// in-memory planets fallback (dipakai saat test atau saat DB belum punya data)
const inMemoryPlanets = [
  { id: 1, name: 'Mercury', description: 'Mercury desc', image: '' },
  { id: 2, name: 'Venus', description: 'Venus desc', image: '' },
  { id: 3, name: 'Earth', description: 'Earth desc', image: '' },
  { id: 4, name: 'Mars', description: 'Mars desc', image: '' },
  { id: 5, name: 'Jupiter', description: 'Jupiter desc', image: '' },
  { id: 6, name: 'Saturn', description: 'Saturn desc', image: '' },
  { id: 7, name: 'Uranus', description: 'Uranus desc', image: '' },
  { id: 8, name: 'Neptune', description: 'Neptune desc', image: '' }
];

if (process.env.NODE_ENV !== 'test' && process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, {
    user: process.env.MONGO_USERNAME,
    pass: process.env.MONGO_PASSWORD,
    useNewUrlParser: true,
    useUnifiedTopology: true
  }, function(err) {
    if (err) {
      console.log("error!! " + err);
    } else {
      // console.log("MongoDB Connection Successful");
    }
  });
} else {
  // In test: skip DB connect
  if (process.env.NODE_ENV === 'test') {
    console.log('Skipping mongoose.connect because NODE_ENV=test');
  } else {
    console.log('MONGO_URI not set - skipping mongoose.connect');
  }
}

const Schema = mongoose.Schema;

const dataSchema = new Schema({
  name: String,
  id: Number,
  description: String,
  image: String,
  velocity: String,
  distance: String
});

// If mongoose connected to a DB, this will point to the collection; if not, model still exists but queries return null
let planetModel;
try {
  planetModel = mongoose.model('planets');
} catch (e) {
  planetModel = mongoose.model('planets', dataSchema);
}

// POST /planet - try DB first, otherwise fallback to inMemoryPlanets
app.post('/planet', function(req, res) {
  const requestedId = Number(req.body && req.body.id);
  if (!requestedId) {
    return res.status(400).send({ error: 'id is required' });
  }

  // If mongoose connection exists and model can search, try DB
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    planetModel.findOne({ id: requestedId }, function(err, planetData) {
      if (err) {
        console.error('DB findOne error', err);
        return res.status(500).send({ error: 'Error in Planet Data' });
      }
      if (planetData) {
        return res.json(planetData);
      }
      // fallback to in-memory
      const fallback = inMemoryPlanets.find(p => p.id === requestedId);
      if (fallback) return res.json(fallback);
      return res.status(404).json({ error: 'not found' });
    });
  } else {
    // No DB connection -> use in-memory planets
    const fallback = inMemoryPlanets.find(p => p.id === requestedId);
    if (fallback) return res.json(fallback);
    return res.status(404).json({ error: 'not found' });
  }
});

app.get('/', async (req, res) => {
  res.sendFile(path.join(__dirname, '/', 'index.html'));
});

app.get('/api-docs', (req, res) => {
  fs.readFile('oas.json', 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      res.status(500).send('Error reading file');
    } else {
      res.json(JSON.parse(data));
    }
  });
});

app.get('/os', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send({
    "os": OS.hostname(),
    "env": process.env.NODE_ENV || 'undefined'
  });
});

app.get('/live', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send({ "status": "live" });
});

app.get('/ready', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send({ "status": "ready" });
});

// Start listening only if not in test
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => { console.log("Server successfully running on port - " + PORT); });
} else {
  console.log('NODE_ENV=test -> not starting listener');
}

module.exports = app;
