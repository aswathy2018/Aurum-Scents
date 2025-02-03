const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const passport = require('passport');
const { userAuth } = require('../middlewares/auth');


router.get('/pageNotFound', userController.pageNotFound)
router.get('/shop', userController.loadShop)



//signup routes
router.get('/',userAuth,userController.loadHomepage)
router.get('/signup', userController.loadSignup)
router.post('/signup', userController.signup)
router.get('/otp', userController.getOtp)
router.post('/otp', userController.otp)
router.get('/resend-otp', userController.resendOtp)



//login and logout routes
router.get('/login', userController.loadLogin)
router.post('/login', userController.login)
router.get('/logout', userController.logout)



//google authentication
router.get('/auth/google', passport.authenticate('google', {scope: ['profile', 'email']}))



//success and failure state handling
router.get('/google/callback', passport.authenticate('google', {failureRedirect: '/signup'}), (req,res)=>{
    console.log('sucyrbiu', req.user);
    const user = req.user
    req.session.user = user._id
    res.redirect('/')
})


module.exports = router