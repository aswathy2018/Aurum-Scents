const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const passport = require('passport');
const { userAuth } = require('../middlewares/auth');


router.get('/pageNotFound', userController.pageNotFound)



//signup routes
router.get('/',userController.loadHomepage)
router.get('/signup', userController.loadSignup)
router.post('/signup', userController.signup)
router.get('/otp', userController.getOtp)
router.post('/otp', userController.otp)
router.get('/resend-otp', userController.resendOtp)
router.get('/productDetails/:id', userAuth, userController.productDetails)


//login and logout routes
router.get('/login', userController.loadLogin)
router.post('/login', userController.login)
router.get('/logout', userController.logout)
router.get('/check-user-status', userController.checkUserStatus);


//google authentication
router.get('/auth/google', passport.authenticate('google', {scope: ['profile', 'email']}))


//shop Page
router.get('/shop',userAuth,userController.shop)

//success and failure state handling
router.get('/google/callback', passport.authenticate('google', {failureRedirect: '/signup?message=Your account has been blocked by Admin'}), (req,res)=>{
    console.log('sucyrbiu', req.user);
    const user = req.user
    req.session.user = user._id
    res.redirect('/')
})


module.exports = router