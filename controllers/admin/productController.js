const Product = require('../../model/productSchema')
const Category = require('../../model/categorySchema')
const Brand = require('../../model/brandSchema')
const User = require('../../model/userSchema')
const {statusCodes} = require('../../utils/statusCode')
const {MESSAGES,ERROR} = require('../../utils/constant')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const mongoose = require('mongoose')



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
                return res.status(400).json({ message: MESSAGES.INVALID_CATEGORY_NAME });
            }

            const variant = products.variants && products.variants[0];
            if (!variant) {
                return res.status(400).json({ message: MESSAGES.INVALID_VARIANTS_DATA });
            }

            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                brand: products.brand,
                category: categoryId._id,
                quantity: variant.stock,
                regularPrice: variant.regularPrice,
                salesPrice: variant.salesPrice,
                createdOn: new Date(),
                size: variant.size,
                productImage: images,
                status: 'Available',
            });

            await newProduct.save();
            return res.status(200).json({ message: MESSAGES.PRODUCT_ADDED_SUCCESSFULLY });
        } else {
            return res.status(400).json({ message: MESSAGES.PRODUCT_ALREADY_EXISTS });
        }
    } catch (error) {
        console.error("Error in saving product", error);
        return res.status(500).json({ message: MESSAGES.UNEXPECTED_ERROR });
    }
};


const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 6;

        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ]
        })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('category')
            .exec();
            
            
        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + "") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ]
        }).countDocuments();

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false })

        if (category && brand) {
            res.render("products", {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: category,
                brand: brand,
            })
        } else {
            res.render("404error")
        }

    } catch (error) {

        res.redirect('/404error')

    }
}


const productBlocked = async (req, res, next) => {
    try {
        let id = req.body.id;
        const result = await Product.updateOne(
            { _id: id }, 
            { $set: { isBlocked: true } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: MESSAGES.PRODUCT_NOT_FOUND });
        }

        res.status(200).json({ success: true, message: MESSAGES.PRODUCT_BLOCKED_SUCCESSFULLY });
    } catch (error) {
        res.status(500).json({ success: false, message: ERROR.GENERIC_ERROR });
    }
}

const productunBlocked = async (req, res, next) => {
    try {
        let id = req.body.id;
        const result = await Product.updateOne(
            { _id: id }, 
            { $set: { isBlocked: false } }
        );

        if (result.matchedCount === 0) {
            return res.status(statusCodes.Not_Found).json({ success: false, message: MESSAGES.PRODUCT_NOT_FOUND });
        }

        res.status(200).json({ success: true, message: MESSAGES.PRODUCT_UNBLOCKED_SUCCESSFULLY });
    } catch (error) {
        res.status(500).json({ success: false, message: ERROR.GENERIC_ERROR });
    }
}


const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const product = await Product.findOne({ _id: id }).populate('category').populate('productImage');
        const category = await Category.find({});
        const brand = await Brand.find({});

        if (!product) {
            return res.redirect("/404error");
        }

        res.render("editProduct", {
            product: product,
            cat: category,
            brand: brand
        });
    } catch (error) {
        console.error(error);
        res.redirect("/404error");
    }
}


const updateProduct = async (req, res) => {
    try {
        const id = req.params.id.replace(/^id=/, "");

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: ERROR.INVALID_PRODUCT_ID_FORMAT });
        }

        const product = await Product.findOne({ _id: id });
        if (!product) {
            return res.status(404).json({ error: MESSAGES.PRODUCT_NOT_FOUND });
        }

        const data = req.body;

        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id },
        });
        if (existingProduct) {
            return res.status(400).json({
                error: MESSAGES.PRODUCT_ALREADY_EXISTS,
            });
        }

        const image = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                image.push(req.files[i].filename);
            }
        }

        const updateFields = {
            productName: data.productName,
            description: data.description,
            brand: data.brand,
            category: data.category,
            regularPrice: data.regularPrice,
            salesPrice: data.salePrice,
            quantity: data.quantity,
            size: data.size,
        };

        if (image.length > 0) {
            updateFields.$push = { productImage: { $each: image } };
        }

        await Product.findByIdAndUpdate(id, updateFields, { new: true });

        if (data.imagesToDelete) {
            const imagesToDelete = JSON.parse(data.imagesToDelete);

            for (const imageName of imagesToDelete) {
                await Product.findByIdAndUpdate(id, {
                    $pull: { productImage: imageName },
                });

                const imagePath = path.join(__dirname, "public", "uploads", "product-images", imageName);
                if (fs.existsSync(imagePath)) {
                    fs.unlink(imagePath, (err) => {
                        if (err) {
                            console.error("Failed to delete file:", err);
                        } else {
                            console.log(`Image ${imageName} deleted successfully.`);
                        }
                    });
                }
            }
        }

        const isAjaxRequest = req.xhr || req.headers.accept.indexOf('json') > -1;
        
        if (isAjaxRequest) {
            return res.status(200).json({ 
                success: true, 
                message: MESSAGES.PRODUCT_UPDATED_SUCCESSFULLY 
            });
        } else {
            return res.redirect("/admin/products");
        }
    } catch (error) {
        console.error("Error updating product:", error);
        
        const isAjaxRequest = req.xhr || req.headers.accept.indexOf('json') > -1;
        
        if (isAjaxRequest) {
            return res.status(500).json({ 
                error: error.message || "An error occurred while updating the product" 
            });
        } else {
            return res.redirect("/404error");
        }
    }
};

const deleteoneimage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;
        console.log(imageNameToServer, productIdToServer)

        if (!imageNameToServer || !productIdToServer) {
            return res.status(400).json({ status: false, message: ERROR.INVALID_DATA_PROVIDED });
        }

        const product = await Product.findByIdAndUpdate(productIdToServer, {
            $pull: { productImage: imageNameToServer },
        });

        if (!product) {
            return res.status(404).json({ status: false, message: MESSAGES.PRODUCT_NOT_FOUND });
        }

        const imagePath = path.join(__dirname, "public", "uploads", "product-images", imageNameToServer);

        if (fs.existsSync(imagePath)) {
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error("Failed to delete file:", err);
                    return res.status(500).json({ status: false, message: MESSAGES.FILE_DELETION_FAILED });
                }
                console.log(`Image ${imageNameToServer} deleted successfully.`);
            });
        } else {
            console.log(`Image ${imageNameToServer} not found.`);
        }

        res.status(200).json({ status: true, message: MESSAGES.IMAGE_DELETED_SUCCESSFULLY });
    } catch (error) {
        console.error("Error deleting image:", error);
        res.status(500).json({ status: false, message: ERROR.SERVER_ERROR });
    }
};


const getAddProductOffer = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const limit = 5;
        const totalProduct = await Product.find().countDocuments();
        const products = await Product.find()
        .sort({ createdAt: -1 })
          .limit(limit * 1)
            .skip((page - 1) * limit)
        const totalPages = Math.ceil(totalProduct / limit);
        res.render('addProductOffer', {products, currentPage: page, totalPages})
    } catch (error) {
        console.log('Error in opening Product offer page..',error);
        res.redirect('/404error')
    }
}

const addproductoffer = async (req, res) => {
    try {
        const { productId, offerPercentage } = req.body;

        if (offerPercentage < 0 || offerPercentage > 100) {
            return res.status(400).json({ success: false, message: MESSAGES.INVALID_OFFER_PRICE_RANGE });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: MESSAGES.PRODUCT_NOT_FOUND });
        }

        if (!product.originalPrice) {
            product.originalPrice = product.salesPrice;
        }

        const categoryId = product.category;
        const category = await Category.findById(categoryId);
        const categoryOffer = category?.categoryOffer || 0;
        const productDiscountPrice = product.salesPrice - (product.salesPrice * offerPercentage) / 100;
        const categoryDiscountPrice = product.salesPrice - (product.salesPrice * categoryOffer) / 100;

        product.productOffer = offerPercentage;

        if (productDiscountPrice <= categoryDiscountPrice) {
            product.salesPrice = Math.round(productDiscountPrice);
        } else {
            product.salesPrice = Math.round(categoryDiscountPrice);
        }

        await product.save();

        res.status(200).json({ success: true, message: MESSAGES.OFFER_APPLIED_SUCCESSFULLY });
    } catch (error) {
        console.log("Error adding product offer:", error);
        res.status(500).json({ success: false, message: ERROR.SERVER_ERROR });
    }
};

const removeOffer = async (req, res) => {
    try {
        const productId = req.query.id;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: MESSAGES.INVALID_PRODUCT_ID });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: MESSAGES.PRODUCT_NOT_FOUND });
        }

        const categoryId = product.category;
        const category = await Category.findById(categoryId);
        const categoryOffer = category?.categoryOffer || 0;
        let newSalesPrice = product.originalPrice || product.salesPrice;
        if (categoryOffer > 0) {
            newSalesPrice = Math.round(newSalesPrice - (newSalesPrice * categoryOffer) / 100);
        }

        await Product.findByIdAndUpdate(productId, {
            $set: { 
                productOffer: 0, 
                salesPrice: newSalesPrice
            }
        });

        res.status(200).json({ success: true, message: MESSAGES.OFFER_REMOVED_SUCCESSFULLY });

    } catch (error) {
        console.error("Error removing product offer:", error);
        res.status(500).json({ success: false, message: MESSAGES.OFFER_REMOVAL_FAILED });
    }
};


module.exports = {
    getProductAddPage,
    productAdd,
    getAllProducts,
    productBlocked,
    productunBlocked,
    getEditProduct,
    updateProduct,
    deleteoneimage,
    getAddProductOffer,
    addproductoffer,
    removeOffer,
}