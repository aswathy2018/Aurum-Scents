const Brand = require('../../model/brandSchema')
const Product = require('../../model/productSchema')


const getBrandPage = async (req, res) => {    
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands / limit);


        const brandData = await Brand.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        res.render('brands', {
            data: brandData,
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands
        });
    } catch (error) {
        console.error('Error fetching brands:', error);
        res.status(500).redirect('/404error');
    }
};



const addBrand = async (req, res) => {
    try {
        const brand = req.body.brandName
        const findBrand = await Brand.findOne({ brandName: brand })
        if (!findBrand) {
            const image = req.file.filename
            const newBrand = new Brand({
                brandName: brand,
                brandImage: image,
            })
            await newBrand.save()
            res.redirect('/admin/brands')
        } else {
            res.render('brands', { message: 'Brand already exists!' });
        }
    } catch (error) {
        console.error('Error adding brand:', error);
        res.redirect('/404error')
    }
}


const blockBrand = async (req, res) => {
    try {
        const id = req.query.id
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } })
        res.redirect('/admin/brands')
    } catch (error) {
        res.redirect('/404error')
    }
}


const unBlockBrand = async (req, res) => {
    try {
        const id = req.query.id
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } })
        res.redirect('/admin/brands')
    } catch (error) {
        res.redirect('/404error')
    }
}

const deleteBrand = async (req, res) => {
    try {
        const { id } = req.query
        if (!id) {
            return res.status(400).redirect('404error')
        }
        await Brand.deleteOne({ _id: id })
        res.redirect('/admin/brands')
    } catch (error) {
        console.error("Error in deleting brand: ", error)
        res.status(500).redirect('/404error')
    }
}


module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand,
}