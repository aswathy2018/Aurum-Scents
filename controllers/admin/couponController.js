const Coupon = require('../../model/couponSchema')


const getCoupon = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const limit = 5;
        const totalCoupon = await Coupon.find().countDocuments();
        const coupons = await Coupon.find({}).sort({ createdAt: -1 })
        .limit(limit * 1)
          .skip((page - 1) * limit)
      const totalPages = Math.ceil(totalCoupon / limit);
        res.render('coupons', {coupons, currentPage: page, totalPages})
    } catch (error) {
        console.log("Error in loading coupon page", error);
        res.redirect('/404error')
        
    }
}

// const createCoupons = async (req, res) => {
//   try {
//     const { couponCode, offerPercentage, expiryDate, minimumprice, maximumprice } = req.body;

//     if (!couponCode || !offerPercentage || !expiryDate || !minimumprice || !maximumprice) {
//       return res.status(400).json({ success: false, message: "All fields are required." });
//     }

//     const normalizedCouponCode = couponCode.trim().toUpperCase();

//     const existingCoupon = await Coupon.findOne({ couponCode: normalizedCouponCode });
//     if (existingCoupon) {
//       return res.status(400).json({ success: false, message: "Coupon code already exists." });
//     }

//     const today = new Date();
//     const expiry = new Date(expiryDate);
//     if (expiry <= today) {
//       return res.status(400).json({ success: false, message: "Expiry date must be in the future." });
//     }

//     const offer = parseFloat(offerPercentage);
//     const minPrice = parseFloat(minimumprice);
//     const maxPrice = parseFloat(maximumprice);
//     if (offer <= 0 || offer > 100) {
//       return res.status(400).json({ success: false, message: "Discount percentage must be between 1 and 100." });
//     }
//     if (minPrice <= 0) {
//       return res.status(400).json({ success: false, message: "Minimum purchase amount must be greater than 0." });
//     }
//     if (maxPrice <= 0) {
//       return res.status(400).json({ success: false, message: "Maximum purchase amount must be greater than 0." });
//     }
//     if (maxPrice < minPrice) {
//       return res.status(400).json({ success: false, message: "Maximum purchase amount must be greater than or equal to minimum purchase amount." });
//     }

//     const newCoupon = new Coupon({
//       couponCode: normalizedCouponCode,
//       offerPercentage: offer,
//       startingDate: today,
//       expiryDate: expiry,
//       minimumprice: minPrice,
//       maximumprice: maxPrice,
//     });

//     await newCoupon.save();
//     res.json({ success: true, message: "The coupon was added successfully" });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ success: false, message: "An error occurred while creating the coupon." });
//   }
// };

const createCoupons = async (req, res) => {
  try {
    const { couponCode, offerPercentage, expiryDate, minimumprice, maximumprice } = req.body;
    console.log("Request body:", req.body);

    // Validate required fields
    if (!couponCode || !offerPercentage || !expiryDate || !minimumprice || !maximumprice) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    // Normalize coupon code
    const normalizedCouponCode = couponCode.trim().toUpperCase();

    // Check if coupon already exists
    const existingCoupon = await Coupon.findOne({ couponCode: normalizedCouponCode });
    if (existingCoupon) {
      return res.status(400).json({ success: false, message: "Coupon code already exists." });
    }

    // Validate dates
    const today = new Date();
    const expiry = new Date(expiryDate);
    if (expiry <= today) {
      return res.status(400).json({ success: false, message: "Expiry date must be in the future." });
    }

    // Parse numeric values
    const offer = parseFloat(offerPercentage);
    const minPrice = parseFloat(minimumprice);
    const maxPrice = parseFloat(maximumprice);

    // Validate numeric values
    if (isNaN(offer) || offer <= 0 || offer > 100) {
      return res.status(400).json({ success: false, message: "Discount percentage must be between 1 and 100." });
    }
    if (isNaN(minPrice) || minPrice <= 0) {
      return res.status(400).json({ success: false, message: "Minimum purchase amount must be greater than 0." });
    }
    if (isNaN(maxPrice) || maxPrice <= 0) {
      return res.status(400).json({ success: false, message: "Maximum purchase amount must be greater than 0." });
    }
    if (maxPrice < minPrice) {
      return res.status(400).json({ success: false, message: "Maximum purchase amount must be greater than or equal to minimum purchase amount." });
    }

    // Create and save the new coupon
    const newCoupon = new Coupon({
      couponCode: normalizedCouponCode,
      offerPercentage: offer,
      startingDate: today,
      expiryDate: expiry,
      minimumprice: minPrice,
      maximumprice: maxPrice,
    });

    await newCoupon.save();
    
    console.log("Coupon saved successfully:", newCoupon);
    res.status(200).json({ success: true, message: "The coupon was added successfully" });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({ success: false, message: "An error occurred while creating the coupon." });
  }
};

  const deletCoupens = async (req, res) => {
    try {
      const { id } = req.params;
      await Coupon.findByIdAndDelete(id);
      res.redirect("/admin/coupon");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error deleting coupon.");
    }
  };



module.exports = {
    getCoupon,
    createCoupons,
    deletCoupens
}