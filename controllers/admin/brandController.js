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
        const brand = req.body.brandName;

        if (!brand) {
            return res.status(400).json({ 
                success: false, 
                message: "Brand name is required" 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: "Brand image is required" 
            });
        }

        const findBrand = await Brand.findOne({ 
            brandName: { $regex: new RegExp(`^${brand}$`, 'i') } 
        });

        if (!findBrand) {
            const newBrand = new Brand({
                brandName: brand,
                brandImage: [req.file.filename],
                isBlocked: false
            });

            await newBrand.save();

            return res.status(201).json({ 
                success: true, 
                message: "Brand added successfully" 
            });
        } else {
            return res.status(409).json({ 
                success: false, 
                message: "The brand already exists" 
            });
        }
    } catch (error) {
        console.error('Error adding brand:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Failed to add brand. Please try again." 
        });
    }
}


const blockBrand = async (req, res) => {
    try {
        const { id } = req.body;
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

const unBlockBrand = async (req, res) => {
    try {
        const { id } = req.body;
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

const deleteBrand = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, error: 'Brand ID is required' });
        }
        await Brand.deleteOne({ _id: id });
        res.json({ success: true });
    } catch (error) {
        console.error("Error in deleting brand: ", error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand,
}