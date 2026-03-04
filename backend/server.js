const express = require("express");
const { createServer } = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config({ quiet: true });

const allowedOrigin = "http://localhost:3000";

const app = express();
app.use(express.json());
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(cookieParser());

const server = createServer(app);

const initSockets = require("./socket");
initSockets(server, app);

const routes = require("./routes");
app.use("/api", routes);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`✅ server running on port ${PORT}`);
});
