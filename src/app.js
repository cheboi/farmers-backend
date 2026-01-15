const express = require("express");
const cors = require("cors");
const requestLogger = require("./middlewares/requestLogger");

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/auth", require("./routes/auth.routes"));
app.use("/farmers", require("./routes/farmer.routes"));

module.exports = app;
