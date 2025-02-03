const Brand = require('../../model/brandSchema')
const Product = require('../../model/productSchema')


// const getBrandPage = async(req,res)=>{
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = 4;
//         const skip = (page-1)*limit;
//         const brandData = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit);
//         const totalBrands = await Brand.countDocuments();
//         const totalPages = Math.ceil(totalBrands/limit)
//         const reverseBrand = brandData.reverse();
//         res.render('brands',{
//             data : reverseBrand,
//             currentPage : page,
//             totalPage : totalPages,
//             totalBrands : totalBrands
//         })
//     } catch (error) {
//         res.redirect('/404error')
//     }
// }


const getBrandPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page
        const limit = 4; // Brands per page
        const skip = (page - 1) * limit; // Calculate skip
        const totalBrands = await Brand.countDocuments(); // Total number of brands
        const totalPages = Math.ceil(totalBrands / limit); // Calculate total pages

        // Validate page number to ensure it is within range
        if (page < 1 || page > totalPages) {
            return res.redirect('/brands?page=1'); // Redirect to the first page
        }

        // Fetch brand data with pagination
        const brandData = await Brand.find({})
            .sort({ createdAt: -1 }) // Sort by latest creation time
            .skip(skip)
            .limit(limit);

        res.render('brands', {
            data: brandData, // Pass brand data to template
            currentPage: page, // Current page
            totalPages: totalPages, // Total pages
            totalBrands: totalBrands // Total number of brands
        });
    } catch (error) {
        console.error('Error fetching brands:', error); // Log error for debugging
        res.status(500).redirect('/error'); // Redirect to a generic error page
    }
};



const addBrand = async(req,res)=>{
    try {
        const brand = req.body.brandName
        const findBrand = await Brand.findOne({brandName:brand})
        if(!findBrand){
            const image = req.file.filename
            const newBrand = new Brand({
                brandName:brand,
                brandImage:image,
            })
            await newBrand.save()
            res.redirect('/admin/brands')
        }else {
            res.render('brands', { message: 'Brand already exists!' });
        }
    } catch (error) {
        console.error('Error adding brand:', error);
        res.redirect('/404error')
    }
}


const blockBrand = async (req,res)=>{
    try {
        const id = req.query.id
        await Brand.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/brands')
    } catch (error) {
        res.redirect('/404error')
    }
}


const unBlockBrand = async (req,res)=>{
    try {
        const id = req.query.id
        await Brand.updateOne({_id:id}, {$set:{isBlocked:false}})
        res.redirect('/admin/brands')
    } catch (error) {
        res.redirect('/404error')
    }
}

const deleteBrand = async (req,res)=>{
    try {
        const {id} = req.query
        if(!id){
            return res.status(400).redirect('404error')
        }
        await Brand.deleteOne({_id:id})
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