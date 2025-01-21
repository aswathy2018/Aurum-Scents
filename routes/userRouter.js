const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const passport = require('passport');


router.get('/pageNotFound', userController.pageNotFound)
router.get('/',userController.loadHomepage)
router.get('/shop', userController.loadShop)
router.get('/signup', userController.loadSignup)
router.post('/signup', userController.signup)
router.get('/login', userController.loadLogin)
router.get('/otp', userController.getOtp)
router.post('/otp', userController.otp)
router.get('/resend-otp', userController.resendOtp)



//google authentication
router.get('/auth/google', passport.authenticate('google', {scope: ['profile', 'email']}))

//success and failure state handling
router.get('/google/callback', passport.authenticate('google', {failureRedirect: '/signup'}), (req,res)=>{
    res.redirect('/')
})


module.exports = router