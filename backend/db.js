const pgp = require("pg-promise")();

const PGUSERNAME = process.env.PGUSERNAME;
const PGPASSWORD = process.env.PGPASSWORD;

const db = pgp({
  host: "127.0.0.1",
  port: 5432,
  database: "indead",
  user: process.env.PGUSERNAME,
  password: process.env.PGPASSWORD,
});

module.exports = db;