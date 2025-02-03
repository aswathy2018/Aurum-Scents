const Product = require('../../model/productSchema')
const Category = require('../../model/categorySchema')
const Brand = require('../../model/brandSchema')
const User = require('../../model/userSchema')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')



const getProductAddPage = async (req,res)=>{
    try {
        const category = await Category.find({islisted: true});
        const brand = await Brand.find({isBlocked: false});

        res.render('productAdd',{
            cat:category,
            brand:brand
        })
    } catch (error) {
        console.error('Error fetching data:', error);
        res.redirect('/404error');
    }
    
}


const productAdd = async (req, res)=>{
    try {
        const products = req.body
        const productExists = await Product.findOne({
            productName:products.productName
        })
        if(!productExists){
            const images = []
            if(req.files && req.files.length>0){
                for(let i=0 ; i<req.files.length ; i++){
                    const originalImagePath = req.files[i].path

                    const resizedImagePath = path.join('public', 'uploads', 'image', req.files[i].fileName);
                    await sharp(originalImagePath).resize({width:440,height:400}).toFile(resizedImagePath)
                    images.push(req.files[i].fileName)
                }
            }

            const categoryId = await Category.findOne({name:products.category})

            if(!categoryId){
                return res.status(400).join("Invalid category name")
            }

            const newProduct = new Product({
                productName:products.productName,
                description:products.description,
                brand:products.brand,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salesPrice:products.salesPrice,
                createdOn:new Date(),
                // quantity:products.size,
                // color
                productImage:images,
                status:'Available',

            })
            await newProduct.save()
            return res.redirect('/admin/productAdd')
        }
        else{
            return res.status(400).json("Product is already exist, Please try with another name")
        }
    } catch (error) {
        console.error("Error in saving product", error)
        return res.redirect('/admin/404error')
    }
}


module.exports = {
    getProductAddPage,
    productAdd,

}