const express = require('express');
const app = express();
const path = require("path")
const env = require("dotenv").config();
const userRouter = require('./routes/userRouter')
const db = require("./config/db")



app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.set("view engine","ejs")
app.set("views",[path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')])
app.use(express.static(path.join(__dirname, "public")))
app.use("/", userRouter)

db();
const PORT = 3002 || process.env.PORT
app.listen(PORT, ()=>{
    console.log("Server running..");
})


module.exports = app;