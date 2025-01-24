const express = require('express')
const router = express.Router();
const adminController = require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const {userAuth, adminAuth} = require('../middlewares/auth')


//404 page not found
router.get('/404error', adminController.errorPage)


//login management
router.get('/login', adminController.loadLogin)
router.post('/login', adminController.login)
router.get('/dashboard', adminAuth, adminController.loadDashboard)
router.get('/logout', adminController.logout)


//customer management
router.get('/users', adminAuth, customerController.customerinfo)
router.get('/blockCustomer', adminAuth, customerController.customerBlocked)
router.get('/unblockCustomer', adminAuth, customerController.customerunBlocked)

router.get('/*', adminController.errorPage)



module.exports = router;