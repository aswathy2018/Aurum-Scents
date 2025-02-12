const Product = require('../../model/productSchema')
const Category = require('../../model/categorySchema')
const Brand = require('../../model/brandSchema')
const User = require('../../model/userSchema')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')



const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({ islisted: true });
        const brand = await Brand.find({ isBlocked: false });

        res.render('productAdd', {
            cat: category,
            brand: brand
        })
    } catch (error) {
        console.error('Error fetching data:', error);
        res.redirect('/404error');
    }

}

const productAdd = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('Uploaded file:', req.files);

        const products = req.body;

        const productExists = await Product.findOne({
            productName: products.productName,
        });

        if (!productExists) {
            const images = [];
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;

                    const resizedImagePath = path.join('public', 'uploads', 'image', `resized-${req.files[i].filename}`);
                    await sharp(originalImagePath)
                        .resize({ width: 440, height: 400 })
                        .toFile(resizedImagePath);

                    images.push(`resized-${req.files[i].filename}`);
                }
            }

            const categoryId = await Category.findOne({ name: products.category });

            if (!categoryId) {
                return res.status(400).json({ message: "Invalid category name" });
            }

            // Extract `variants` information
            const variant = products.variants && products.variants[0]; // Assuming only one variant for now
            if (!variant) {
                return res.status(400).json({ message: "Invalid variants data" });
            }

            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                brand: products.brand,
                category: categoryId._id,
                regularPrice: variant.regularPrice,
                salesPrice: variant.salePrice,
                createdOn: new Date(),
                size: variant.size,
                productImage: images,
                status: 'Available',
            });

            await newProduct.save();
            return res.redirect('/admin/productAdd');
        } else {
            return res.status(400).json("Product already exists. Please try with another name.");
        }
    } catch (error) {
        console.error("Error in saving product", error);
        return res.redirect('/admin/404error');
    }
};



module.exports = {
    getProductAddPage,
    productAdd,

}