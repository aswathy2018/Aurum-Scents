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

            const variant = products.variants && products.variants[0];
            if (!variant) {
                return res.status(400).json({ message: "Invalid variants data" });
            }

            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                brand: products.brand,
                category: categoryId._id,
                quantity: variant.stock,
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
            throw createError(404, 'Product not found');
        }

        res.redirect('/admin/products');
    } catch (error) {
                res.redirect('/404error')
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
            throw createError(404, 'Product not found');
        }

        res.redirect('/admin/products');
    } catch (error) {
                res.redirect('/404error')
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
            return res.status(400).json({ error: "Invalid Product ID format" });
        }

        const product = await Product.findOne({ _id: id });
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        const data = req.body;
        console.log("Request body data:", data);

        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id },
        });
        if (existingProduct) {
            return res.status(400).json({
                error: "Product already exists. Please try again with another name.",
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
            salePrice: data.salePrice,
            quantity: data.quantity,
            size: data.size,
            color: data.color,
        };

        if (image.length > 0) {
            updateFields.$push = { productImage: { $each: image } };
        }

        console.log("Update fields:", updateFields);

        await Product.findByIdAndUpdate(id, updateFields, { new: true });

        console.log("Product updated successfully");
        res.redirect("/admin/products");
    } catch (error) {
        console.error("Error updating product:", error);
        res.redirect("/pagenotfound");
    }
};

const deleteoneimage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;
        console.log(imageNameToServer, productIdToServer)

        if (!imageNameToServer || !productIdToServer) {
            return res.status(400).json({ status: false, message: "Invalid data provided" });
        }

        const product = await Product.findByIdAndUpdate(productIdToServer, {
            $pull: { productImage: imageNameToServer },
        });

        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const imagePath = path.join(__dirname, "public", "uploads", "product-images", imageNameToServer);

        if (fs.existsSync(imagePath)) {
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error("Failed to delete file:", err);
                    return res.status(500).json({ status: false, message: "File deletion failed" });
                }
                console.log(`Image ${imageNameToServer} deleted successfully.`);
            });
        } else {
            console.log(`Image ${imageNameToServer} not found.`);
        }

        res.status(200).json({ status: true, message: "Image deleted successfully" });
    } catch (error) {
        console.error("Error deleting image:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
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
    deleteoneimage  
}