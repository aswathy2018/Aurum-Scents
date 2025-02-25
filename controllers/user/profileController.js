const User = require('../../model/userSchema')
const env = require ('dotenv').config()
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const session = require('express-session')


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
            subject: "Your OTP for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b><h3>Your OTP: ${otp}</h3></b>`
        })

        return info.accepted.length>0
    }
    catch(error){
        console.error("Error sending email",error.message)
        return false
    }
}


const getForgotPassPage = async(req,res)=>{
    try {
        res.render('forgotPassword')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const forgotEmailValid = async (req,res)=>{
    try {
        const {email} = req.body;
        const findUser = await User.findOne({email:email})
        if(findUser){
            const otp = generateOTP();
            const emailSent = await sendVerificationMail(email,otp)
            if(emailSent){
                req.session.userOtp = otp
                req.session.email = email
                res.render("mailverification")
                console.log("OTP: ",otp);
                
            }else{
                res.json({success:false, message:"Failed to send OTP. Please try again.."})
            }
        }else{
            res.render('forgotPassword',{
                message: "User with this email does not exist"
            })
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const verifyForgotPassOTP = async (req,res)=>{
    try {
        const enteredOTP = req.body.otp
        if(enteredOTP === req.session.userOtp){
            res.json({success:true, redirectUrl:'/resetPassword'})
        }else{
            res.json({success:false,message:"OTP not matching"})
        }
    } catch (error) {
        res.status(500).json({success:false,message: "An error occured. Please try again.."})
    }
}


const getResetPassword = async (req,res)=>{
    try {
        res.render('resetPassword')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const resendOtp = async (req,res)=>{
    try {
        const otp = generateOTP()
        req.session.userOtp = otp
        const email = req.session.email
        console.log("Email of the resnd OTP: ", email);
        const emailSent = await sendVerificationMail(email,otp)
        if(emailSent){
            console.log("Resended OTP: ",otp);
            res.status(200).json({success:true, message: "Successfully sended resend OTP"})
            
        }
        
    } catch (error) {
        console.error("Error in resend OTP", error)
        res.status(500).json({success:false, message:'Internal server error'})
    }
}


const hashpassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;
    } catch (error) {
        console.log("password hasing is failed, the password is stored in readeable formate Please check the bcrypt module is working propperly ", error);

    }
}

const resetPassword= async (req,res)=>{
    try {
        const {newPass1 , newPass2}=req.body;
        
        const user=await User.findById(req.session.user)

        const email= req.session.email;
        if(newPass1 === newPass2){
            const passwordHarsh= await hashpassword(newPass1);
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHarsh}}
            )
            res.redirect('/login')

        }else{
            res.render('resetpassword',{user,
                message:"password do not match"
            })
        }
    } catch (error) {
        res.redirect('/pageNotFound')
        
    }
}


module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOTP,
    getResetPassword,
    resendOtp,
    resetPassword,
}