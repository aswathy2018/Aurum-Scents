const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const passport = require('passport');
const { userAuth } = require('../middlewares/auth');
const profileController = require('../controllers/user/profileController');
const cartController = require('../controllers/user/cartController')
const orderController = require('../controllers/user/orderController')
const {uploads} = require('../helpers/multer');


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
router.get("/search", userAuth, userController.searchProducts);
router.get("/shops", userController.categoryfilter);


//success and failure state handling
router.get('/google/callback', passport.authenticate('google', {failureRedirect: '/signup?message=Your account has been blocked by Admin'}), (req,res)=>{
    console.log('sucyrbiu', req.user);
    const user = req.user
    req.session.user = user._id
    res.redirect('/')
})


//Profile Management
router.get('/forgotPassword', profileController.getForgotPassPage)
router.post('/mailverification', profileController.forgotEmailValid)
router.post('/verify-forgotPassOTP', profileController.verifyForgotPassOTP)
router.get('/resetPassword', profileController.getResetPassword)
router.post('/resendfpotp', profileController.resendOTP)
router.post('/resetPassword', profileController.resetPassword)
router.get('/userProfile', userAuth, profileController.profile)
router.post('/profileImage',uploads.single('profileImage'),profileController.profileImage)
router.get('/address', userAuth, profileController.address)
router.get('/changePassword', userAuth, profileController.changePasswordPage);
router.post('/changePassword', userAuth, profileController.changePassword);
router.get('/editProfile', userAuth, profileController.editProfile)
router.post('/editProfile', userAuth, profileController.postEditProfile)
router.post('/verify-otp', userAuth, profileController.otpVerification);
router.get('/resendOtp', userAuth, profileController.profileResendOTP);


//Address management
router.get('/addAddress', userAuth, profileController.addAddress)
router.post('/addAddress', userAuth, profileController.postAddAddress)
router.get('/editAddress', userAuth, profileController.editAddress)
router.post('/editAddress', userAuth, profileController.postEditAddress)
router.get('/deleteAddress', userAuth, profileController.deleteAddress)


//Cart management
router.get('/cart', userAuth, cartController.getCart)
router.post('/manageCart', userAuth, cartController.addToCart)
router.post('/updateCart', userAuth, cartController.updateCart);
router.post('/removeFromCart', userAuth, cartController.removeFromCart);


//Wishlist management
router.get("/wishlist", userAuth, cartController.loadwhishlist);
router.post("/addTowishlist", userAuth, cartController.addToWishlist);
router.post('/removeFromWishlist', userAuth, cartController.removeFromWishlist);
router.post('/addToCartFromWishlist', userAuth, cartController.addToCartFromWishlist);
router.post('/checkAddAddress', userAuth, cartController.checkAddAddress)


//Order Management
router.get('/checkOut', userAuth, orderController.getCheckOut)
router.post("/checkout/process", userAuth, orderController.placeorder);
router.get('/paymentSuccess', userAuth, orderController.success)
router.get('/payementFail', userAuth, orderController.paymentFail)
router.get('/orderDetaile', userAuth, orderController.getOrderList)
router.get('/invoice', userAuth, orderController.invoice)
router.get("/download-invoice", userAuth, orderController.generateInvoicePdf);

module.exports = router