const express = require("express");
const cors = require("cors");

const register = require("./register");
const login = require("./login");

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend dang chay");
});

app.post("/api/register", register);

app.post("/api/login", login);

app.listen(3000, () => {
    console.log("SERVER DANG CHAY TAI CONG 3000");
});