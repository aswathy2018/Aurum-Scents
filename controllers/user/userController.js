const User = require('../../model/userSchema')
const env = require ('dotenv').config()
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')


const pageNotFound = async(req,res)=>{
    try{
        res.render("page-404")
    }
    catch(error){
        res.redirect("/pageNotFound")
    }
}


const securePassword = async(password)=>{
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {
        
    }
}

const getOtp = async(req,res)=>{
    try {
        res.render('otp')
    } catch (error) {
        res.redirect('/login')
    }
}

const otp = async(req,res)=>{
    try{
        const {otp} = req.body

        if(otp===req.session.userOtp){
            const user = req.session.userData
            const passwordHash = await securePassword(user.password)

            const existingUser = await User.findOne({ email: user.email });
            if (existingUser) {
                res.json({ success: false, message: "User already exists. Please log in." });
                return;
            }


           const newUser = await User.create({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash
            })

            console.log('asdfghjkl',newUser)
            req.session.userOtp = null;
            req.session.userData = null;
            req.session.user = newUser._id
            res.json({success: true, redirectUrl: '/'})
        }
        else{
            res.status(400).json({success: false, message: "Invalid OTP, Please try again.."})
        }
        
    }
    catch(error){
        console.error("Error verifying OTP", error)
        res.status(500).json({success: false, message: "An error occured"})
    }
}

const loadHomepage = async (req,res)=>{
    try{
        const user = req.session.user
        
        if(user){
            const userData = await User.findById(user)
            res.render('home', {user: userData})
            
        }
        else{
            return res.render('home')
        }
    }
    catch(error){
        console.log("Home page not found!!");
        res.status(500).send("Internal server issue")
    }
}

const loadSignup = async (req,res)=>{
    try{
        return res.render('signup')
    }
    catch(error){
        console.log("page not loading..", error);
        res.status(500).send("Server error..")
        
    }
}


function generateOTP(){
    return Math.floor(100000 + Math.random()*900000).toString();
}

async function sendVerificationMail(email,otp){
    try{
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account..",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`
        })

        return info.accepted.length>0
    }
    catch(error){
        console.error("Error sending email",error.message)
        return false
    }
}

const signup = async(req,res)=>{
    try{
        const {name, phone, email, password, cpassword} = req.body
        if(password != cpassword){
            return res.render("signup", {message: "Passwords are not matching"})
        }
        const findUser = await User.findOne({email})
        if(findUser){
            return res.render("signup", {message: "User with this mail id is already exist"})
        }
        

        const otp = generateOTP();
        
        const emailSent = await sendVerificationMail(email,otp)
        if(!emailSent){
            return res.json("email-error")
        }

        req.session.userOtp = otp
        req.session.userData = {name, phone, email, password}

        res.render("otp")
        console.log("OTP Sent", otp);
        //res.redirect('/otp')
        
    }
    catch(error){
        console.error("Signup error", error)
        res.redirect("/pageNotFound")
    }
}

const loadLogin = async (req,res)=>{
    try{
        const userId = req.session.user

        const user = await User.findById(userId)
        if(!userId || user.isBlocked === true){
            return res.render('login')
        }
        else{
            res.redirect('/')
        }
        
    }
    catch(error){
        res.redirect('/pageNotFound')
        
    }
}

const login = async(req, res)=>{
    try {
        const {email, password} = req.body
        const findUser = await User.findOne({isAdmin:0, email: email})

        if(!findUser){
            return res.render('login', {message: "User not found"})
        }
        if(findUser.isBlocked){
            return res.render('login', {message: "User is blocked by admin.."})
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password)

        if(!passwordMatch){
            return res.render('login', {message: "Incorrect password"})
        }

        req.session.user = findUser._id;
        res.redirect('/')
    } catch (error) {
        console.error("Login error", error)
        res.render('login', {message: "Login failed. Please try again"})
    }
}

const loadShop = async (req,res)=>{
    try{
        return res.render('shop')
    }
    catch(error){
        console.log("Page not loading..", error);
        res.status(500).send("Internal server error..")
    }
}

const resendOtp = async (req,res)=>{
    try {
        
        const {email} = req.session.userData;
        
        const otp = generateOTP();
        
        
        const emailSent = await sendVerificationMail(email,otp)
        if(!emailSent){
            return res.json("email-error")
        }
        console.log("resendOtp", otp);
        req.session.userOtp = otp;
        res.json({success: true})
    } catch (error) {
       console.error(500)
       res.json("OTP issue") 
    }
}

const logout = async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destruction error", err.message);
                return res.redirect('/pageNotFound')
            }
            return res.redirect('/login')
        })
    } catch (error) {
        console.log("Logout error", error);
        res.redirect('/pageNotFound')
        
    }
}

module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    loadLogin,
    login,
    loadShop,
    otp,
    getOtp,
    resendOtp,
    logout
}