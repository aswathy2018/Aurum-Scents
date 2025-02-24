const Category = require('../../model/categorySchema')


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

module.exports = {
    categoryInfo,
    addCategory,
    getEditCategory,
    editCategory,
    listcategory,
    unlistcategory,

}