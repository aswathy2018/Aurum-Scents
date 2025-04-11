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


const createCoupons = async (req, res) => {
    try {
      const { couponCode, offerPercentage, startingDate, expiryDate, minimumprice } = req.body;
      console.log(req.body);

      if (new Date(startingDate) >= new Date(expiryDate)) {
        return res.status(500).send("Start date must be before the end date.");
      }
  
      let coupon = Coupon.findOne({couponCode});
      if(coupon) {
        return res.json({ success: false, message : "Coupon code already exists."});
      }
      const today = new Date();
  
      const newCoupon = new Coupon({
        couponCode,
        offerPercentage,
        startingDate: today,
        expiryDate,
        minimumprice,
      });
  
      await newCoupon.save();
      res.json({ success: true, message: "the coupon added success" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ success: false, message: "An error occured" });
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