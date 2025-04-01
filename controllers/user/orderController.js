const Order = require('../../model/orderSchema')
const User = require('../../model/userSchema')
const Address = require('../../model/addressSchema')
const Product = require('../../model/productSchema')
const Cart = require('../../model/cartSchema')
const mongoose = require('mongoose')
const PDFDocument = require('pdfkit');
const fs = require('fs');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Coupon = require('../../model/couponSchema')


const getWallet = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        console.log(userData)

        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const totalTransactions = userData.wallet.transactions.length;
        const transactions = userData.wallet.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(skip, skip + limit);

        const totalPages = Math.ceil(totalTransactions / limit);

        res.render('wallet', {
            user:userData,
            walletBalance: userData.wallet.balance,
            walletTransactions: transactions,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.log(error);
        res.redirect('/pagenotfound');
    }
};

const topUpWallet = async (req, res) => {
    try {
        const userId = req.session.user;
        const { amount } = req.body;

        const user = await User.findById(userId);
        if (!user.wallet) {
            user.wallet = {
                balance: 0,
                transactions: []
            };
        }
        user.wallet.balance += Number(amount);
        user.wallet.transactions.push({
            type: "credit",
            amount: Number(amount),
            description: "Wallet Top-Up"
        });
        await user.save();

        res.redirect("/userProfile");
    } catch (error) {
        console.error("Error topping up wallet:", error);
        res.status(500).send("Failed to top up wallet.");
    }
};


const refundToWallet = async (orderId, userId, amount) => {
    try {
        console.log('Refund to wallet - OrderId:', orderId, 'UserId:', userId, 'Amount:', amount);

        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found.");
        }

        if (!amount || amount <= 0) {
            throw new Error("Invalid refund amount.");
        }

        user.wallet.balance += amount;
        user.wallet.transactions.push({
            type: "credit",
            amount: amount,
            description: `Refund for Order #${orderId}`,
            date: new Date()
        });

        await user.save();

        return { success: true, walletBalance: user.wallet.balance };
    } catch (error) {
        console.error("Error processing refund:", error);
        throw error;
    }
};

const getCheckOut = async (req, res) => {
    try {
        const user = req.session.user
        const userData = await User.findById(user)
        const address = await Address.findOne({userId: user})
        const cart = await Cart.findOne({ userId: user }).populate('items.productId');

        const coupons = await Coupon.find({isActive: true})
        
        res.render('checkOut', {user: userData, address, cart, cartItems:cart, coupons})
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

const applyCoupon = async (req, res) => {
    try {
      const { couponCode, totalAmount } = req.body;
      const userId = req.session.user;
      console.log("couponcode",req.body)
  
      const coupon = await Coupon.findOne({
        couponCode: couponCode,
        isActive: true,
      });
  
      if (!coupon) {
        return res.json({
          success: false,
          message: "Invalid or expired coupon code"
        });
      }
      if (totalAmount < coupon.minimumprice) {
        return res.json({
          success: false,
          message: `Minimum purchase amount of ₹${coupon.minimumprice} required to use this coupon`
        });
      }

      const discountAmount = (totalAmount*coupon.offerPercentage)/100;
  
      res.json({
        success: true,
        coupon: {
          _id: coupon._id,
          name: coupon.name,
          discountAmount
        },
        message: "Coupon applied successfully"
      });
      
    } catch (error) {
      console.error("Error applying coupon:", error);
      res.status(500).json({
        success: false,
        message: "Failed to apply coupon"
      });
    }
  };
  
const razorpayInstance = new Razorpay({
    key_id: "rzp_test_fpueLavUtsLoKt",
    key_secret: "Bk8bywg3LIZxueU2ZgCPN6zV"
});

const createOrder = async (req, res) => {
    const { totalAmount } = req.body.orderData;

    const options = {
        amount: totalAmount * 100,
        currency: 'INR',
        receipt: `order_rcptid_${Math.random()}`
    };

    try {
        const order = await razorpayInstance.orders.create(options);
        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: "rzp_test_fpueLavUtsLoKt"
        });
    } catch (error) {
        
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
    }
};

const verifyPayment = async (req, res) => {
    const userId = req.session.user
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData,couponCode} = req.body;
    console.log("Online payment: ", req.body);
    
    const hmac = crypto.createHmac('sha256', "Bk8bywg3LIZxueU2ZgCPN6zV");
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === razorpay_signature) {
        const { addressId, paymentMethod, totalAmount } = orderData;

        try {
            let discount = 0
            
            if(couponCode){
                const coupon=await Coupon.findOne({couponCode:couponCode});
                discount=(totalAmount*coupon.offerPercentage)/100
                console.log('discount------------: ', discount)
            }
            let foundAddress;

            if (!mongoose.isValidObjectId(addressId)) {
                return res.status(400).json({ error: "Invalid address ID." });
            }

            const cart = await Cart.findOne({ userId }).populate('items.productId');

            if (!cart || cart.items.length === 0) {
                return res.status(400).json({ error: "Cart is empty or invalid." });
            }

            const address = await Address.findOne({
                userId: new mongoose.Types.ObjectId(userId),
                "address._id": new mongoose.Types.ObjectId(addressId),
            });

            if (!address) {
                return res.status(400).json({ error: "The selected address is not valid." });
            }

            foundAddress = address.address.find(addr => addr._id.toString() === addressId);

            if (!foundAddress) {
                return res.status(400).json({ error: "Address not found in user data." });
            }

            if (!paymentMethod || !totalAmount) {
                return res.status(400).json({ error: "Payment method and total amount are required." });
            }

            const orderItems = cart.items.map(item => {
                if (!item.productId || !item.productId._id) {
                    throw new Error(`Invalid product data in cart: ${JSON.stringify(item)}`);
                }
                return {
                    product: item.productId._id,
                    quantity: item.quantity,
                    price: item.productId.salesPrice,
                };
            });

            const order = new Order({
                userId: req.session.user,
                paymentMethod,
                totalAmount:totalAmount,
                orderedItems: orderItems,
                address: foundAddress,
                paymentStatus: 'Paid',
                couponCode: couponCode,
                couponApplied: true,
                discount: discount
            });

            await order.save();

            for (let i = 0; i < cart.items.length; i++) {
                const product = await Product.findById(cart.items[i].productId._id);
                if (product) {
                    if (product.quantity >= cart.items[i].quantity) {
                        product.quantity -= cart.items[i].quantity;
                        await product.save();
                    } else {
                        return res.status(400).json({ success: false, message: `Insufficient stock for product: ${product.productName}.` });
                    }
                } else {
                    return res.status(400).json({ success: false, message: "Product not found." });
                }
            }

            cart.items = [];
            await cart.save();

            console.log("Order Placed Successfully");
            return res.json({success:true, message: "Order placed successfully." });

        } catch (error) {
            console.error("Error processing order:", error.message,error);
            return res.status(500).json({ success:false, error: "Failed to place order. Please try again later." });
        }

    } else {
        res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
};


const paymentFail = async (req, res) => {
    try {
        const userId = req.session.user;
        const { orderData, couponCode, error } = req.body;
        const { addressId, paymentMethod, totalAmount } = orderData;
        
        console.log("Payment failure reported from client:", error);
        
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: "Cart is empty or invalid." });
        }
        
        const address = await Address.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            "address._id": new mongoose.Types.ObjectId(addressId),
        });
        
        if (!address) {
            return res.status(400).json({ error: "The selected address is not valid." });
        }
        
        const foundAddress = address.address.find(addr => addr._id.toString() === addressId);
        const orderItems = cart.items.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.productId.salesPrice,
        }));
        const failedOrder = new Order({
            userId,
            paymentMethod,
            totalAmount,
            orderedItems: orderItems,
            address: foundAddress,
            paymentStatus: 'Failed',
            couponCode,
            couponApplied: !!couponCode,
            discount: 0,
            paymentErrorMessage: error?.description || 'Payment failed'
        });
        
        await failedOrder.save();
        console.log("Failed order registered from client notification");
        
        return res.json({ success: true, message: "Failed payment recorded successfully" });
    } catch (error) {
        console.error("Error recording payment failure:", error);
        return res.status(500).json({ success: false, error: "Failed to record payment failure" });
    }
};

const placeorder = async (req, res) => {
    const userId = req.session.user;
    const { orderData } = req.body;
    
    const { addressId, paymentMethod, totalAmount, coupon } = orderData;
    let couponCode = coupon ? coupon.code : null;
    console.log(couponCode);
    
    try {
        if (paymentMethod === 'COD') {
            try {
                let foundAddress;

                if (!mongoose.isValidObjectId(addressId)) {
                    return res.status(400).json({ error: "Invalid address ID." });
                }

                const cart = await Cart.findOne({ userId }).populate('items.productId');

                if (!cart || cart.items.length === 0) {
                    return res.status(400).json({ error: "Cart is empty or invalid." });
                }

                const address = await Address.findOne({
                    userId: new mongoose.Types.ObjectId(userId),
                    "address._id": new mongoose.Types.ObjectId(addressId),
                });

                if (!address) {
                    return res.status(400).json({ error: "The selected address is not valid." });
                }

                foundAddress = address.address.find(addr => addr._id.toString() === addressId);

                if (!foundAddress) {
                    return res.status(400).json({ error: "Address not found in user data." });
                }

                if (!paymentMethod || !totalAmount) {
                    return res.status(400).json({ error: "Payment method and total amount are required." });
                }
               
                const orderItems = cart.items.map(item => {
                    if (!item.productId || !item.productId._id) {
                        throw new Error(`Invalid product data in cart: ${JSON.stringify(item)}`);
                    }
                    return {
                        product: item.productId._id,
                        quantity: item.quantity,
                        price: item.productId.salesPrice,
                    };
                });

                const originalAmount = cart.items.reduce(
                    (sum, item) => sum + (item.productId.salesPrice * item.quantity), 
                    0
                );

                const order = new Order({
                    userId: req.session.user,
                    paymentMethod,
                    totalAmount: parseFloat(totalAmount),
                    orderedItems: orderItems,
                    address: foundAddress,
                    coupon: coupon ? {
                        code: coupon.code,
                        discountAmount: coupon.discountAmount,
                        originalAmount: originalAmount
                    } : null
                });

                await order.save();

                for (let i = 0; i < cart.items.length; i++) {
                    const product = await Product.findById(cart.items[i].productId._id);
                    if (product) {
                        if (product.quantity >= cart.items[i].quantity) {
                            product.quantity -= cart.items[i].quantity;
                            await product.save();
                        } else {
                            return res.status(400).json({ 
                                success: false, 
                                message: `Insufficient stock for product: ${product.productName}.` 
                            });
                        }
                    } else {
                        return res.status(400).json({ 
                            success: false, 
                            message: "Product not found." 
                        });
                    }
                }

                if (coupon && coupon.code) {
                    await Coupon.findOneAndUpdate(
                        { couponCode: coupon.code },
                        { $inc: { usageCount: 1 } }
                    );
                }

                cart.items = [];
                await cart.save();

                if (req.session.appliedCoupon) {
                    delete req.session.appliedCoupon;
                }

                console.log("Order Placed Successfully");
                return res.json({
                    success: true, 
                    message: "Order placed successfully."
                });

            } catch (error) {
                console.error("Error processing order:", error.message);
                return res.status(500).json({ 
                    success: false, 
                    error: "Failed to place order. Please try again later." 
                });
            }
        } else if (paymentMethod === "Wallet") {
            console.log('Processing Wallet Payment: ', orderData);
        
            try {
                const user = await User.findById(userId);
                if (!user) {
                    return res.status(400).json({ success: false, message: "User not found." });
                }
                if (user.wallet.balance < totalAmount) {
                    return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
                }
        
                let discount = 0;
                let foundAddress;

                if (couponCode) {
                    const coupon = await Coupon.findOne({ couponCode: couponCode, isActive: true });
                    
                    if (coupon && totalAmount < coupon.minimumprice) {
                        discount = orderData.coupon.discountAmount || Math.round((originalAmount * coupon.offerPercentage) / 100);
                    } else {
                        couponCode = null;
                        discount = 0;
                    }
                }
        
                if (!mongoose.isValidObjectId(addressId)) {
                    return res.status(400).json({ success: false, message: "Invalid address ID." });
                }
        
                const cart = await Cart.findOne({ userId }).populate('items.productId');
                const address = await Address.findOne({
                    userId: new mongoose.Types.ObjectId(userId),
                    "address._id": new mongoose.Types.ObjectId(addressId),
                });
        
                if (!address) {
                    return res.status(400).json({ success: false, message: "Address not selected." });
                }
        
                foundAddress = address.address.find((addr) => addr._id.toString() === addressId);
        
                if (!paymentMethod || !totalAmount) {
                    return res.status(400).json({ success: false, message: "Payment method and total amount are required." });
                }
        
                const orderItems = cart.items.map(item => ({
                    product: item.productId,
                    quantity: item.quantity,
                    price: item.productId.salesPrice,
                }));
        
                const originalAmount = cart.items.reduce(
                    (sum, item) => sum + (item.productId.salesPrice * item.quantity),
                    0
                );
        
                const order = new Order({
                    userId: req.session.user,
                    paymentMethod,
                    totalAmount: parseFloat(totalAmount),
                    orderedItems: orderItems,
                    address: foundAddress,
                    paymentStatus: 'Paid',
                    couponCode: couponCode,
                    couponApplied: !!couponCode,
                    discount: discount,
                    originalAmount: originalAmount
                });
        
                console.log('Order before save: ', order);
                await order.save();
        
                user.wallet.balance -= parseFloat(totalAmount);
                user.wallet.transactions.push({
                    type: "debit",
                    amount: parseFloat(totalAmount),
                    description: `Payment for Order ${order._id}`,
                    date: Date.now()
                });
                user.orderHistory.push(order._id);
                await user.save();
        
                for (let item of cart.items) {
                    const product = await Product.findById(item.productId._id);
                    if (!product) {
                        return res.status(400).json({ success: false, message: `Product not found: ${item.productId.productName}` });
                    }
                    if (product.quantity < item.quantity) {
                        return res.status(400).json({ success: false, message: `Insufficient stock for product: ${product.productName}` });
                    }
                    product.quantity -= item.quantity;
                    await product.save();
                }

                if (couponCode) {
                    await Coupon.findOneAndUpdate(
                        { code: couponCode },
                        { $inc: { usageCount: 1 } }
                    );
                }
        
                cart.items = [];
                await cart.save();
        
                return res.status(200).json({ success: true, message: "Order placed successfully with Wallet." });
        
            } catch (error) {
                console.error("Error processing wallet payment:", error.stack);
                return res.status(500).json({ success: false, message: "Failed to place order. Please try again later.", error: error.message });
            }
        }else {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid payment method' 
            });
        }
    } catch (error) {
        console.error("Unexpected Error:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Unable to process order' 
        });
    }
};

const success = async (req,res)=>{
    try {
        res.render('paymentSuccess')
    } catch (error) {
        console.log('Error in payment success',error);
        res.redirect('/pageNotFound')
    }
}

const getOrderList = async (req, res) => {

    try {
        const userId = req.session.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        const total = await Order.find({ userId }).countDocuments();
        const totalPages = Math.ceil(total / limit)
        const orderDetails = await Order.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("orderedItems.product")
        const user = await User.findById(userId)
        // console.log('----------------orderDetails: ', orderDetails);
        

        res.render("orderDetaile", { orderDetails, currentPage: page, totalPages, user })


    } catch (error) {
        console.log("Error geting the order listing page:", error);
        res.redirect('/pagenotfound')
    }


}

const invoice = async (req, res) => {
    try {
        const { orderId } = req.query
        const userId= req.session.user
        const user= await User.findById(userId)
        const Id = new mongoose.Types.ObjectId(orderId)
        const order = await Order.findById(Id).populate('userId').populate('orderedItems.product')

        res.render('invoice', { order,user })
    } catch (error) {
        console.log("error in getting invoice", error);
        res.redirect('/pagenotfound');

    }
}

const generateInvoicePdf = async (req, res) => {
    try {
        const { orderId } = req.query;
        const Id = new mongoose.Types.ObjectId(orderId);
        const order = await Order.findById(Id)
            .populate("userId")
            .populate("orderedItems.product");

        if (!order) {
            return res.status(404).send("Order not found");
        }

        const pdfDoc = new PDFDocument({ margin: 30 });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=Invoice_${order._id}.pdf`);
        pdfDoc.pipe(res);

        pdfDoc
            .font("Helvetica-Bold")
            .fontSize(20)
            .text("Aurum Scents", { align: "center" })
            .moveDown(0.7);

        pdfDoc
            .fontSize(16)
            .text("Invoice", { align: "center" })
            .moveDown(0.5);

        pdfDoc
            .fontSize(12)
            .text(`order_id: ${order._id}`, { align: "center" })
            .moveDown(0.2);
        pdfDoc
            .text(`Date: ${order?.createdAt?.toDateString()}`, { align: "center" })
            .moveDown(0.5);
        pdfDoc
            .fontSize(14)
            .text(`Customer Name: ${order?.userId?.name || "N/A"}`)
            .moveDown(0.2);
        pdfDoc.text(`Email: ${order?.userId?.email || "N/A"}`).moveDown(1);

        const tableTop = 200;
        const columnWidths = [100, 150, 70, 100, 70, 80];
        const rowHeight = 25;
        const xStart = 30;
        let y = tableTop;

        pdfDoc.fontSize(10).font("Helvetica-Bold");

        ["Date", "Item", "Quantity", "Status", "Price", "Discount"].forEach((header, index) => {
            pdfDoc
                .rect(xStart + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), y, columnWidths[index], rowHeight)
                .stroke()
                .text(header, xStart + columnWidths.slice(0, index).reduce((a, b) => a + b, 0) + 6, y + 6);
        });

        y += rowHeight;
        pdfDoc.fontSize(10).font("Helvetica");

        order.orderedItems.forEach((item, rowIndex) => {
            const createdAt = item?.product?.createdAt.toDateString() || "N/A";
            const itemName = item?.product?.productName || "N/A";
            const quantity = item.quantity || 0;
            const status = item.status || "N/A";
            const price = item.price || 0;
            const discount = order.discount;

            [createdAt, itemName, quantity.toString(), status, `${price.toFixed(2)}`, `${discount.toFixed(2)}`].forEach((text, colIndex) => {
                pdfDoc
                    .rect(xStart + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), y, columnWidths[colIndex], rowHeight)
                    .stroke()
                    .text(text, xStart + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0) + 6, y + 6);
            });

            y += rowHeight;
            if (y > 750) {
                pdfDoc.addPage();
                y = tableTop;
            }
        });

        pdfDoc
            .fontSize(12)
            .font("Helvetica-Bold")
            .text(`Total Amount: ${order.totalAmount.toFixed(2)}`, xStart, y + 20);

        pdfDoc.end();
    } catch (error) {
        console.error("Error generating invoice PDF:", error);
        res.status(500).send("Failed to generate invoice PDF");
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId, product } = req.params;
        const userId = req.session.user;

        const order = await Order.findOne({ _id: orderId, userId }).populate('orderedItems.product');

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        let orderedProduct = order.orderedItems.find((item) =>
            item.product._id.toString() === product.toString()
        );

        if (!orderedProduct) {
            return res.status(404).json({ success: false, message: "Product not found in order." });
        }

        if (orderedProduct.status === "Delivered" || orderedProduct.status === "Return") {
            return res.status(400).json({
                success: false,
                message: "Product has already been delivered or returned and cannot be canceled."
            });
        }

        if (orderedProduct.status === "Cancelled") {
            return res.status(400).json({ success: false, message: "Product is already canceled." });
        }

        // Calculate refund amount for this specific product
        const refundAmount = orderedProduct.price * orderedProduct.quantity;

        orderedProduct.status = "Cancelled";
        const productDoc = await Product.findById(product);
        if (productDoc) {
            productDoc.quantity += orderedProduct.quantity;
            await productDoc.save();
        }

        if ((order.paymentMethod === "online" || order.paymentMethod === "Wallet") && order.paymentStatus === "Paid") {
            await refundToWallet(orderId, userId, refundAmount);
        }

        await order.save();

        res.status(200).json({ success: true, message: "Order cancelled successfully" });
    } catch (error) {
        console.error("Error canceling product:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cancel the product. Please try again later."
        });
    }
};

const returnOrder = async (req, res) => {
    try {
        const { orderId, product } = req.params;
        const { returnReason } = req.body;
        const userId = req.session.user;

        const order = await Order.findOne({ _id: orderId, userId }).populate('orderedItems.product');

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        let orderedProduct = order.orderedItems.find((item) =>
            item.product._id.toString() === product.toString()
        );

        if (!orderedProduct) {
            return res.status(404).json({ success: false, message: "Product not found in this order." });
        }

        if (orderedProduct.status === "Cancelled") {
            return res.status(400).json({
                success: false,
                message: "Cancelled products cannot be returned."
            });
        }

        if (orderedProduct.status !== "Delivered") {
            return res.status(400).json({
                success: false,
                message: "Only delivered products can be returned."
            });
        }

        if (orderedProduct.status === "Return") {
            return res.status(400).json({
                success: false,
                message: "The product is already returned."
            });
        }

        orderedProduct.status = "Return";
        orderedProduct.returnReason = returnReason;
        const productDoc = await Product.findById(product);
        if (productDoc) {
            productDoc.quantity += orderedProduct.quantity;
            await productDoc.save();
        }

        const refundAmount = orderedProduct.price * orderedProduct.quantity;
        if ((order.paymentMethod === "online" || order.paymentMethod === "Wallet") && order.paymentStatus === "Paid") {
            await refundToWallet(orderId, userId, refundAmount);
        } else if (order.paymentMethod === "COD" && orderedProduct.status === "Delivered") {
            await refundToWallet(orderId, userId, refundAmount);
        }

        await order.save();

        return res.status(200).json({
            success: true,
            message: "Product return initiated successfully"
        });
    } catch (error) {
        console.error("Error processing return:", error);
        res.status(500).json({
            success: false,
            message: "Failed to return the product. Please try again later."
        });
    }
};



module.exports = {
    getWallet,
    getCheckOut,
    applyCoupon,
    placeorder,
    success,
    getOrderList,
    paymentFail,
    invoice,
    generateInvoicePdf,
    cancelOrder,
    returnOrder,
    verifyPayment,
    createOrder,
    topUpWallet,
    refundToWallet,
    
}