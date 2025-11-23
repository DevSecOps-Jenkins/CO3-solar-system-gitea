let mongoose = require("mongoose");
let server = require("./app");
let chai = require("chai");
let chaiHttp = require("chai-http");

chai.should();
chai.use(chaiHttp);

// (opsional tapi bagus) pastikan koneksi siap sebelum tes
before(async () => {
  // kalau app.js sudah connect, bagian ini bisa dilewati.
  // Tetapi aman juga dibiarkan kosong.
});

after(async () => {
  // tutup koneksi bila perlu
  await mongoose.connection.close().catch(() => {});
});

describe("Planets API Suite", () => {
  describe("Fetching Planet Details", () => {
    it("should fetch a planet named Mercury", async () => {
      const res = await chai.request(server).post("/planet").send({ id: 1 });
      res.should.have.status(200);
      res.body.should.have.property("id").eql(1);
      res.body.should.have.property("name").eql("Mercury");
    });

    it("should fetch a planet named Venus", async () => {
      const res = await chai.request(server).post("/planet").send({ id: 2 });
      res.should.have.status(200);
      res.body.should.have.property("id").eql(2);
      res.body.should.have.property("name").eql("Venus");
    });

    it("should fetch a planet named Earth", async () => {
      const res = await chai.request(server).post("/planet").send({ id: 3 });
      res.should.have.status(200);
      res.body.should.have.property("id").eql(3);
      res.body.should.have.property("name").eql("Earth");
    });

    it("should fetch a planet named Mars", async () => {
      const res = await chai.request(server).post("/planet").send({ id: 4 });
      res.should.have.status(200);
      res.body.should.have.property("id").eql(4);
      res.body.should.have.property("name").eql("Mars");
    });

    it("should fetch a planet named Jupiter", async () => {
      const res = await chai.request(server).post("/planet").send({ id: 5 });
      res.should.have.status(200);
      res.body.should.have.property("id").eql(5);
      res.body.should.have.property("name").eql("Jupiter");
    });

    it("should fetch a planet named Saturn", async () => {
      const res = await chai.request(server).post("/planet").send({ id: 6 });
      res.should.have.status(200);
      res.body.should.have.property("id").eql(6);
      res.body.should.have.property("name").eql("Saturn");
    });

    it("should fetch a planet named Uranus", async () => {
      const res = await chai.request(server).post("/planet").send({ id: 7 });
      res.should.have.status(200);
      res.body.should.have.property("id").eql(7);
      res.body.should.have.property("name").eql("Uranus");
    });

    it("should fetch a planet named Neptune", async () => {
      const res = await chai.request(server).post("/planet").send({ id: 8 });
      res.should.have.status(200);
      res.body.should.have.property("id").eql(8);
      res.body.should.have.property("name").eql("Neptune");
    });
  });
});

// Use below test case to achieve coverage
describe("Testing Other Endpoints", () => {
  describe("it should fetch OS Details", () => {
    it("should fetch OS details", async () => {
      const res = await chai.request(server).get("/os");
      res.should.have.status(200);
    });
  });

  describe("it should fetch Live Status", () => {
    it("checks Liveness endpoint", async () => {
      const res = await chai.request(server).get("/live");
      res.should.have.status(200);
      res.body.should.have.property("status").eql("live");
    });
  });

  describe("it should fetch Ready Status", () => {
    it("checks Readiness endpoint", async () => {
      const res = await chai.request(server).get("/ready");
      res.should.have.status(200);
      res.body.should.have.property("status").eql("ready");
    });
  });
});
