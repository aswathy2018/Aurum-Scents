const User = require('../../model/userSchema')
const Order = require('../../model/orderSchema')
const mongoose = require("mongoose");


const customerinfo = async (req, res) => {
    try {
        let search = ""
        if (req.query.search) {
            search = req.query.search.trim();
        }
        let page = parseInt(req.query.page) || 1;

        const limit = 5;
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        const count = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        }).countDocuments();

        const totalPages = Math.ceil(count / limit);

        res.render('customers', { data: userData, currentPage: page, totalPages })
    } catch (error) {
        console.error("Error fetching customer data:", error);
        res.status(500).send("Error fetching customer data");
    }
}


const customerBlocked = async (req, res) => {
    try {
        let id = req.body.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.status(200).json({ success: true, message: "User blocked successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};

const customerunBlocked = async (req, res) => {
    try {
        let id = req.body.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.status(200).json({ success: true, message: "User unblocked successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};


const getAllOrders = async (req,res) =>{
    try {
      const page = req.query.page || 1;
      const limit = 5;
        const totalOrders = await Order.find().countDocuments();
        const orders = await Order.find({})
          .populate("userId")
          .sort({ createdAt: -1 })
          .limit(limit * 1)
            .skip((page - 1) * limit)
        const totalPages = Math.ceil(totalOrders / limit);
        res.render("orderListing", { orders, currentPage: page, totalPages });
      } catch (error) {
        console.error(error);
        res.redirect("/pageNotFound");
      }
}


const getOrderDetails = async (req, res) => {
    try {
      const { orderId } = req.params;
  
      const order = await Order.findById(orderId)
        .populate("userId").populate("orderedItems.product")
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      res.render("orderDetailes", { order });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch order details" });
    }
  };

  
  const updateOrderStatus = async (req, res) => {
    try {
      const { orderId, product } = req.params;
      const { status } = req.body;

      if (!orderId || !product) {
        return res.status(400).json({ error: "Missing orderId or product" });
    }
  
      if (
        !["Pending", "Shipped", "Delivered", "Return", "Cancelled"].includes(
          status
        )
      ) {
        return res.status(400).json({ error: "Invalid status" });
      }
  
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const productVal = order.orderedItems.find(
        (item) => item.product.toString() === product
      );
      if (!productVal) {
        return res.status(404).json({ error: "Product not found in this order" });
      }
      productVal.status = status;
      if (status === "Delivered") {
        order.paymentStatus = "Paid";
      }
      await order.save();
  
      res.redirect(`/admin/orders/${orderId}`);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  };


module.exports = {
    customerinfo,
    customerBlocked,
    customerunBlocked,
    getAllOrders,
    getOrderDetails,
    updateOrderStatus,
}