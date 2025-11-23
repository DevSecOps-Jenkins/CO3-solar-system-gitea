const path = require("path");
const fs = require("fs");
const express = require("express");
const OS = require("os");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const app = express();
const cors = require("cors");
// const serverless = require('serverless-http');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "/")));
app.use(cors());

// ⬇️ Mongoose v7: jangan pakai callback/option legacy
mongoose
  .connect(process.env.MONGO_URI, {
    user: process.env.MONGO_USERNAME,
    pass: process.env.MONGO_PASSWORD,
    // useNewUrlParser / useUnifiedTopology diabaikan di v7, jadi tak perlu
  })
  .then(() => {
    // console.log('MongoDB Connection Successful');
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

const Schema = mongoose.Schema;

const dataSchema = new Schema({
  name: String,
  id: Number,
  description: String,
  image: String,
  velocity: String,
  distance: String,
});

const planetModel = mongoose.model("planets", dataSchema);

// ⬇️ Ganti callback → async/await
app.post("/planet", async function (req, res, next) {
  try {
    // pastikan id berupa number
    const id = Number(req.body.id);
    const planetData = await planetModel.findOne({ id }).lean();
    if (!planetData) {
      return res.status(404).send("Planet not found");
    }
    res.json(planetData);
  } catch (err) {
    // hapus alert(...) (tidak ada di Node)
    next(err);
  }
});

app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "/", "index.html"));
});

app.get("/api-docs", (req, res) => {
  fs.readFile("oas.json", "utf8", (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      res.status(500).send("Error reading file");
    } else {
      res.json(JSON.parse(data));
    }
  });
});

app.get("/os", function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.send({
    os: OS.hostname(),
    env: process.env.NODE_ENV,
  });
});

app.get("/live", function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.send({ status: "live" });
});

app.get("/ready", function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.send({ status: "ready" });
});

// NOTE: Untuk test biasanya lebih baik tidak listen di sini.
// Tapi kalau pipeline kamu memang jalankan server, biarkan saja.
app.listen(3000, () => {
  console.log("Server successfully running on port - " + 3000);
});

module.exports = app;
// module.exports.handler = serverless(app);
