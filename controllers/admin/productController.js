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

module.exports = {
    getProductAddPage
}