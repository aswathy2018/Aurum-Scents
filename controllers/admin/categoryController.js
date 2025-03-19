const Category = require('../../model/categorySchema')
const Product = require('../../model/productSchema')
const mongoose = require('mongoose')


const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.max(1, Math.ceil(totalCategories / limit));

        const validatedPage = Math.min(Math.max(1, page), totalPages);

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip((validatedPage - 1) * limit)
            .limit(limit);

        res.render('category', {
            cat: categoryData,
            currentPage: validatedPage,
            totalPages: totalPages,
            totalCategories: totalCategories,
            limit: limit
        });
    } catch (error) {
        console.error(error);
        res.redirect('/404error');
    }
}



const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        const nameRegex = new RegExp(`^${name}$`, 'i');

        const existingCategory = await Category.findOne({
            name: { $regex: nameRegex }
        });

        if (existingCategory) {
            return res.status(400).json({
                error: `Category "${name}" already exists`
            });
        }

        const newCategory = new Category({
            name,
            description
        });

        await newCategory.save();
        return res.status(200).json({
            success: true,
            message: "Category added successfully"
        });

    } catch (error) {
        console.error('Error in addCategory:', error);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
};


const getEditCategory = async (req, res) => {
    try {
        const id = req.query.id
        const category = await Category.findOne({ _id: id })
        res.render("editCategory", { category: category })
    } catch (error) {
        res.redirect("/404error")
    }
}


const editCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const { categoryname, description } = req.body;

        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${categoryname}$`, 'i') },
            _id: { $ne: id }
        });

        if (existingCategory) {
            return res.status(400).json({ 
                error: "Category already exists, please use a different name" 
            });
        }

        const updateCategory = await Category.findByIdAndUpdate(id, {
            name: categoryname,
            description: description,
        }, { new: true });

        if (updateCategory) {
            res.status(200).json({ 
                success: true, 
                message: 'Category updated successfully' 
            });
        } else {
            res.status(404).json({ 
                error: 'Category not found' 
            });
        }
    } catch (error) {
        console.error('Error in editCategory:', error);
        res.status(500).json({ 
            error: "Internal server error" 
        });
    }
};


const listcategory = async (req, res) => {
    try {
        const { id } = req.body;
        await Category.updateOne({ _id: id }, { $set: { islisted: true } });
        res.json({ success: true });
    } catch (error) {
        console.log("category listing error:", error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

const unlistcategory = async (req, res) => {
    try {
        const { id } = req.body;
        await Category.updateOne({ _id: id }, { $set: { islisted: false } });
        res.json({ success: true });
    } catch (error) {
        console.log("category listing error:", error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}


const getOffer = async (req, res) => {
    try {
        const id=req.query.id
        const currcat=await Category.findById(id)
        const categories= await Category.find({isListed:true})
        res.render('categoryOffer',{categories,currcat})
    } catch (error) {
        console.log("Error in getting the category offer page");
        res.redirect('/pageNotFound')
    }
}

const categoryOffer = async (req, res) => {
    try {
        const { catid, offerValue } = req.body;

        if (offerValue < 0 || offerValue > 100) {
            return res.status(400).json({ success: false, message: "Offer is not valid" });
        }

        const category = await Category.findById(catid);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        category.categoryOffer = offerValue;
        await category.save();

        const products = await Product.find({ category: catid });

        for (const product of products) {
            if (!product.originalPrice) {
                product.originalPrice = product.salesPrice;
            }

            const productOfferPrice = product.originalPrice - 
                (product.originalPrice * (product.productOffer || 0)) / 100;
            const categoryOfferPrice = product.originalPrice - 
                (product.originalPrice * offerValue) / 100;

            const finalPrice = Math.min(productOfferPrice, categoryOfferPrice);
            product.salesPrice = Math.round(finalPrice);

            await product.save();
        }


        res.json({ success: true, message: "Category offer added successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const removeCategoryOffer = async (req, res) => {
    try {
        const { categoryId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ success: false, message: 'Invalid category ID' });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        category.categoryOffer = 0;
        await category.save();

        const products = await Product.find({ category: categoryId });

        for (const product of products) {
            let newSalesPrice = product.originalPrice || product.salesPrice;
            if (product.productOffer > 0) {
                newSalesPrice = Math.round(
                    newSalesPrice - (newSalesPrice * product.productOffer) / 100
                );
            }

            product.salesPrice = newSalesPrice;
            await product.save();
        }
        res.status(200).json({ success: true, message: 'Category offer removed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


module.exports = {
    categoryInfo,
    addCategory,
    getEditCategory,
    editCategory,
    listcategory,
    unlistcategory,
    getOffer,
    categoryOffer,
    removeCategoryOffer,
}