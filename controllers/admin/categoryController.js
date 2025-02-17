const Category = require('../../model/categorySchema')


const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 6
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);

        res.render('category', {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        })
    } catch (error) {
        console.error(error)
        res.redirect('/404error')
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
        const id = req.params.id
        const { categoryname, description } = req.body
        const existingCategory = await Category.findOne({ name: categoryname ,_id:{$ne:id}})

        if (existingCategory) {
            return res.status(400).json({ error: "Category already exist, please add another category" })
        }

        const updateCategory = await Category.findByIdAndUpdate(id, {
            name: categoryname,
            description: description,
        }, { new: true })

        if (updateCategory) {
            res.redirect('/admin/category')
        } else {
            res.status(400).json({ error: 'Category not found' })
        }
    } catch (error) {
        res.status(500).json({ error: "Internal server error" })
    }
}


const listcategory = async (req, res) => {
    try {
        const categoryId = req.query.id;
        // console.log("id", categoryId);
        await Category.updateOne({ _id: categoryId }, { $set: { islisted: true } });

        res.redirect('/admin/category')
    } catch (error) {
        console.log("category listing error:", error)
        res.redirect('/404error')
    }
}

const unlistcategory = async (req, res) => {
    try {
        console.log('asfhkl', req.query);

        const categoryId = req.query.id;
        console.log("id", categoryId);
        await Category.updateOne({ _id: categoryId }, { $set: { islisted: false } });

        res.redirect('/admin/category')
    } catch (error) {
        console.log("category listing error:", error)
        res.redirect('/404error')
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