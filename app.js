const express = require('express');
const app = express();
const path = require("path")
const session = require('express-session')
const passport = require('./config/passport')
const env = require("dotenv").config();
const userRouter = require('./routes/userRouter')
const db = require("./config/db")
const adminRouter = require('./routes/adminRouter')
const nocache = require("nocache");
const errorHandler = require('./middlewares/errorMiddleware')
const methodOverride = require('method-override');
const Razorpay = require('razorpay')
const bodyParser = require('body-parser')
const fs = require('fs')
const { validateWebhookSignature} = require('razorpay/dist/utils/razorpay-utils')


app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72*60*60*1000
    }
}))
app.use(nocache())
app.use(errorHandler);
app.use(methodOverride('_method'));

app.use(passport.initialize())
app.use(passport.session())

app.set("view engine","ejs")
app.set("views",[path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')])
app.use(express.static(path.join(__dirname, "public")))

app.use("/", userRouter)
app.use('/admin', adminRouter)
nocache();
db();
const PORT = 3002 || process.env.PORT
app.listen(PORT, ()=>{
    console.log("Server running..");
})

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}))


const razorpay = new Razorpay({
    key_id: 'rzp_test_fpueLavUtsLoKt',
    key_secret: 'Bk8bywg3LIZxueU2ZgCPN6zV',
})

///read data from JSON file///
const readData = () =>{
    if(fs.existsSync('orders.json')){
        const data = fs.readFileSync('orders.json')
        return JSON.parse(data);
    }
    return [];
}

///Write data to JSON file///
const writeData = (data) => {
    fs.writeFileSync('orders.json', JSON.stringify(data, null, 2));
}

///initializing orders.json///
if(!fs.existsSync('orders.JSON')){
    writeData([]);
}


app.get('/payment-success', (req, res)=>{
    res.sendFile(path.join(__dirname, '/paymentSuccess'))
})


module.exports = app;