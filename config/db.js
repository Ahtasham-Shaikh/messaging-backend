const mysql = require("mysql2/promise");
const config = require("./index");

const pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool
  .getConnection()
  .then((conn) => {
    console.log(`Successfully connected to MySQL database: ${config.db.database}`);
    conn.release();
  })
  .catch((err) => {
    console.error("Error connecting to the MySQL database:", err.message);
  });

module.exports = pool;
