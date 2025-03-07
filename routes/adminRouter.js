const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const productController = require('../controllers/admin/productController');
const brandController = require('../controllers/admin/brandController');
const {userAuth, adminAuth} = require('../middlewares/auth');
const {uploads} = require('../helpers/multer');


//404 page not found
router.get('/404error', adminController.errorPage)


//login management
router.get('/login', adminController.loadLogin)
router.post('/login', adminController.login)
router.get('/dashboard', adminController.loadDashboard)
router.get('/logout', adminController.logout)


//customer management
router.get('/users', adminAuth, customerController.customerinfo)
router.patch('/blockCustomer', adminAuth, customerController.customerBlocked);
router.patch('/unblockCustomer', adminAuth, customerController.customerunBlocked);


//category management
router.get('/category', adminAuth, categoryController.categoryInfo)
router.post('/addCategory', adminAuth, categoryController.addCategory)
router.get('/editCategory', adminAuth, categoryController.getEditCategory)
router.post('/editCategory/:id', adminAuth, categoryController.editCategory)
router.patch('/listcategory', adminAuth, categoryController.listcategory)
router.patch('/unlistcategory', adminAuth, categoryController.unlistcategory)


//Brand management
router.get('/brands', brandController.getBrandPage)
router.post('/addBrand', adminAuth,(req,res,next)=>{
    next();
}, uploads.single ('brandImage'), brandController.addBrand);
router.patch('/blockBrand', adminAuth, brandController.blockBrand)
router.patch('/unBlockBrand', adminAuth, brandController.unBlockBrand)
router.delete('/deleteBrand', adminAuth, brandController.deleteBrand)


//Product management
router.get('/productAdd', adminAuth, productController.getProductAddPage)
router.post('/productAdd', adminAuth, uploads.array("images", 4), productController.productAdd)
router.get('/products', adminAuth, productController.getAllProducts)
router.patch('/blockProduct', adminAuth, productController.productBlocked);
router.patch('/unblockProduct', adminAuth, productController.productunBlocked);
router.get('/editProduct', adminAuth, productController.getEditProduct)
router.post('/editProduct/:id',adminAuth,uploads.array("images",4),productController.updateProduct)
router.post('/deleteImage',adminAuth,productController.deleteoneimage)


router.get('/*', adminController.errorPage)


module.exports = router;