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

        cart.items = cart.items.filter(item => {

            if (!item.productId || item.productId.isBlocked === true) {
                return false;
            }

            if (!item.productId.category || item.productId.category.islisted === false) {
                return false;
            }

            if (item.productId.brand && item.productId.brand.isBlocked === true) {
                return false;
            }

            return true;
        });
        
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
    const userId = req.session.user;
    const { orderData } = req.body;
    const { addressId, paymentMethod, totalAmount, coupon } = orderData;
    console.log('rrrrrrrrrrr: ', orderData);

    try {
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            populate: [
                { path: 'category' },
                { path: 'brand' }
            ]
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty or invalid." });
        }

        const blockedConditions = {
            blockedProduct: false,
            blockedCategory: false,
            blockedBrand: false,
            insufficientStock: false
        };
        let insufficientStockProduct = null;

        for (const item of cart.items) {
            if (!item.productId) continue;

            if (item.productId.isBlocked === true) {
                blockedConditions.blockedProduct = true;
                break;
            }
            if (item.productId.category && item.productId.category.islisted === false) {
                blockedConditions.blockedCategory = true;
                break;
            }
            if (item.productId.brand && item.productId.brand.isBlocked === true) {
                blockedConditions.blockedBrand = true;
                break;
            }
            if (item.productId.quantity < item.quantity) {
                blockedConditions.insufficientStock = true;
                insufficientStockProduct = item.productId.productName;
                break;
            }
        }

        if (blockedConditions.blockedProduct || blockedConditions.blockedCategory || blockedConditions.blockedBrand) {
            let errorMessage = "Cannot proceed with order: ";
            if (blockedConditions.blockedProduct) errorMessage += "Product is blocked";
            else if (blockedConditions.blockedCategory) errorMessage += "Product category is blocked";
            else if (blockedConditions.blockedBrand) errorMessage += "Product brand is blocked";
            errorMessage += " by the admin.";
            return res.status(403).json({ success: false, message: errorMessage });
        }
        if (blockedConditions.insufficientStock) {
            return res.status(400).json({
                success: false,
                message: `Quantity is not available for the product: ${insufficientStockProduct}.`
            });
        }

        const address = await Address.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            "address._id": new mongoose.Types.ObjectId(addressId),
        });
        if (!address) {
            return res.status(400).json({ success: false, message: "Invalid address." });
        }

        const foundAddress = address.address.find(addr => addr._id.toString() === addressId);
        if (!foundAddress) {
            return res.status(400).json({ success: false, message: "Address not found." });
        }

        const orderItems = cart.items.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.productId.salesPrice,
        }));

        const originalTotal = cart.items.reduce((sum, item) => sum + (item.quantity * item.productId.salesPrice), 0);

        cart.items = [];
        await cart.save();

        let discount = 0;
        let couponCode = null;
        let couponApplied = false;
        if (coupon && coupon.discountAmount) {
            discount = coupon.discountAmount;
            console.log("Discount from client: ))) ", discount);
            couponCode = coupon.code;
            couponApplied = true;
        } else if (coupon) {
            const coupons = await Coupon.findOne({ couponCode: coupon.code });
            if (coupons) {
                discount = (originalTotal * coupons.offerPercentage) / 100;
                console.log("Discount calculated: @@@@@@@@@@@@@@@@@@@@ ", discount);
                couponCode = coupon.code;
                couponApplied = true;
            }
        }

        const order = new Order({
            userId,
            paymentMethod,
            totalAmount,
            orderedItems: orderItems,
            address: foundAddress,
            paymentStatus: paymentMethod === 'online' ? 'Pending' : 'Pending',
            couponCode: couponCode,
            couponApplied: couponApplied,
            discount: discount,
            originalAmount: originalTotal
        });

        await order.save();

        if (paymentMethod === 'online') {
            const options = {
                amount: totalAmount * 100,
                currency: 'INR',
                receipt: `order_${order._id}`,
            };

            const razorpayOrder = await razorpayInstance.orders.create(options);
            res.json({
                success: true,
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                key: "rzp_test_fpueLavUtsLoKt",
                dbOrderId: order._id,
            });
        } else {
            res.json({ success: true, message: "Order placed successfully", orderId: order._id });
        }
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, message: 'Failed to create order' });
    }
};


const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId, couponCode } = req.body;

    const hmac = crypto.createHmac('sha256', "Bk8bywg3LIZxueU2ZgCPN6zV");
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === razorpay_signature) {
        try {
            const order = await Order.findById(dbOrderId);
            console.log("order ", order)
            if (!order) {
                return res.status(404).json({ success: false, message: "Order not found." });
            }

            order.paymentStatus = 'Paid';

            for (const item of order.orderedItems) {
                const product = await Product.findById(item.product);
                if (product && product.quantity >= item.quantity) {
                    product.quantity -= item.quantity;
                    await product.save();
                } else {
                    return res.status(400).json({ success: false, message: `Insufficient stock for ${product.productName}.` });
                }
            }

            await order.save();

            const cart = await Cart.findOne({ userId: req.session.user });
            if (cart) {
                cart.items = [];
                await cart.save();
            }

            res.json({ success: true, message: "Payment verified and order processed successfully." });
        } catch (error) {
            console.error("Error verifying payment:", error);
            res.status(500).json({ success: false, message: "Failed to verify payment." });
        }
    } else {
        const order = await Order.findById(dbOrderId);
        if (order) {
            order.paymentStatus = 'Failed';
            await order.save();
        }
        res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
};


const retryPayment =  async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const razorpay = new Razorpay({
            key_id: "rzp_test_fpueLavUtsLoKt",
            key_secret: "Bk8bywg3LIZxueU2ZgCPN6zV"
        });

        const options = {
            amount: order.totalAmount * 100,
            currency: "INR",
            receipt: `retry_${orderId}`,
        };

        const razorpayOrder = await razorpay.orders.create(options);

        res.json({
            success: true,
            key: "rzp_test_fpueLavUtsLoKt",
            amount: options.amount,
            currency: options.currency,
            orderId: razorpayOrder.id,
            dbOrderId: order._id,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const placeorder = async (req, res) => {
    const userId = req.session.user;
    const { orderData } = req.body;
    const { addressId, paymentMethod, totalAmount, coupon } = orderData;
    let couponCode = coupon ? coupon.code : null;

    try {
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            populate: [
                { path: 'category' },
                { path: 'brand' }
            ]
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty or invalid." });
        }

        const blockedConditions = {
            blockedProduct: false,
            blockedCategory: false,
            blockedBrand: false,
            insufficientStock: false
        };
        let insufficientStockProduct = null;

        for (const item of cart.items) {
            if (!item.productId) continue;

            if (item.productId.isBlocked === true) {
                blockedConditions.blockedProduct = true;
                break;
            }
            if (item.productId.category && item.productId.category.islisted === false) {
                blockedConditions.blockedCategory = true;
                break;
            }
            if (item.productId.brand && item.productId.brand.isBlocked === true) {
                blockedConditions.blockedBrand = true;
                break;
            }
            if (item.productId.quantity < item.quantity) {
                blockedConditions.insufficientStock = true;
                insufficientStockProduct = item.productId.productName;
                break;
            }
        }

        if (blockedConditions.blockedProduct || blockedConditions.blockedCategory || blockedConditions.blockedBrand) {
            let errorMessage = "Cannot proceed with order: ";
            if (blockedConditions.blockedProduct) errorMessage += "Product is blocked";
            else if (blockedConditions.blockedCategory) errorMessage += "Product category is blocked";
            else if (blockedConditions.blockedBrand) errorMessage += "Product brand is blocked";
            errorMessage += " by the admin.";
            return res.status(403).json({ success: false, message: errorMessage });
        }
        if (blockedConditions.insufficientStock) {
            return res.status(400).json({
                success: false,
                message: `Quantity is not available for the product: ${insufficientStockProduct}.`
            });
        }

        const address = await Address.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            "address._id": new mongoose.Types.ObjectId(addressId),
        });
        if (!address) {
            return res.status(400).json({ success: false, message: "Invalid address." });
        }

        const foundAddress = address.address.find(addr => addr._id.toString() === addressId);
        if (!foundAddress) {
            return res.status(400).json({ success: false, message: "Address not found." });
        }

        const orderItems = cart.items.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.productId.salesPrice,
        }));

        if (paymentMethod === 'COD') {
            const order = new Order({
                userId,
                paymentMethod,
                totalAmount: parseFloat(totalAmount),
                orderedItems: orderItems,
                address: foundAddress,
                coupon: coupon ? {
                    code: coupon.code,
                    discountAmount: coupon.discountAmount,
                    originalAmount: cart.items.reduce((sum, item) => sum + (item.productId.salesPrice * item.quantity), 0)
                } : null
            });

            await order.save();

            for (let item of cart.items) {
                const product = await Product.findById(item.productId._id);
                product.quantity -= item.quantity;
                await product.save();
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

            return res.json({ success: true, message: "Order placed successfully." });
        } else if (paymentMethod === "Wallet") {
            try {
                const user = await User.findById(userId);
                if (!user) {
                    return res.status(400).json({ success: false, message: "User not found." });
                }
                if (user.wallet.balance < parseFloat(totalAmount)) {
                    return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
                }
        
                const blockedConditions = {
                    blockedProduct: false,
                    blockedCategory: false,
                    blockedBrand: false,
                    insufficientStock: false
                };
                let insufficientStockProduct = null;
        
                for (const item of cart.items) {
                    if (!item.productId) continue;
        
                    if (item.productId.isBlocked === true) {
                        blockedConditions.blockedProduct = true;
                        break;
                    }
                    if (item.productId.category && item.productId.category.islisted === false) {
                        blockedConditions.blockedCategory = true;
                        break;
                    }
                    if (item.productId.brand && item.productId.brand.isBlocked === true) {
                        blockedConditions.blockedBrand = true;
                        break;
                    }
                    if (item.productId.quantity < item.quantity) {
                        blockedConditions.insufficientStock = true;
                        insufficientStockProduct = item.productId.productName;
                        break;
                    }
                }
        
                if (blockedConditions.blockedProduct || blockedConditions.blockedCategory || blockedConditions.blockedBrand) {
                    let errorMessage = "Cannot proceed with order: ";
                    if (blockedConditions.blockedProduct) errorMessage += "Product is blocked";
                    else if (blockedConditions.blockedCategory) errorMessage += "Product category is blocked";
                    else if (blockedConditions.blockedBrand) errorMessage += "Product brand is blocked";
                    errorMessage += " by the admin.";
                    return res.status(403).json({ success: false, message: errorMessage });
                }
                if (blockedConditions.insufficientStock) {
                    return res.status(400).json({
                        success: false,
                        message: `Quantity is not available for the product: ${insufficientStockProduct}.`
                    });
                }
        
                let discount = 0;
                if (couponCode) {
                    const coupon = await Coupon.findOne({ couponCode: couponCode, isActive: true });
                    const originalAmount = cart.items.reduce((sum, item) => sum + (item.productId.salesPrice * item.quantity), 0);
                    if (coupon) {
                        discount = orderData.coupon?.discountAmount || Math.round((originalAmount * coupon.offerPercentage) / 100);
                    } else {
                        couponCode = null;
                        discount = 0;
                    }
                }
        
                const order = new Order({
                    userId,
                    paymentMethod,
                    totalAmount: parseFloat(totalAmount),
                    orderedItems: orderItems,
                    address: foundAddress,
                    paymentStatus: 'Paid',
                    couponCode: couponCode,
                    couponApplied: !!couponCode,
                    discount: discount,
                    originalAmount: cart.items.reduce((sum, item) => sum + (item.productId.salesPrice * item.quantity), 0)
                });
        
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
                    product.quantity -= item.quantity;
                    await product.save();
                }
        
                if (couponCode) {
                    await Coupon.findOneAndUpdate(
                        { couponCode: couponCode },
                        { $inc: { usageCount: 1 } }
                    );
                }
        
                cart.items = [];
                await cart.save();
        
                return res.status(200).json({ success: true, message: "Order placed successfully with Wallet." });
            } catch (error) {
                console.error("Error in Wallet payment:", error);
                return res.status(500).json({ success: false, message: "Failed to process Wallet payment. Please try again." });
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid payment method' });
        }
    } catch (error) {
        console.error("Unexpected Error:", error);
        res.status(500).json({ success: false, message: 'Unable to process order' });
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
            .text(`order_id: ${order._id.toString().slice(-6)}`, { align: "center" })
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

        const refundAmount = order.totalAmount

        orderedProduct.status = "Cancelled";

        const allItemsCancelled = order.orderedItems.every(item => 
            item.status === "Cancelled" || item._id.toString() === orderedProduct._id.toString()
        );
        
        if (allItemsCancelled && order.paymentStatus === "Pending") {
            order.paymentStatus = "Failed";
        }

        const productDoc = await Product.findById(product);
        if (productDoc) {
            productDoc.quantity += orderedProduct.quantity;
            await productDoc.save();
        }

        if ((order.paymentMethod === "online" || order.paymentMethod === "Wallet") && 
            order.paymentStatus === "Paid") {
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

        const refundAmount = order.totalAmount;
        if ((order.paymentMethod === "online" || order.paymentMethod === "Wallet") && order.paymentStatus === "Paid") {
            await refundToWallet(orderId, userId, refundAmount);
        } else if (order.paymentMethod === "COD" && orderedProduct.status === "Delivered")  {
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
    invoice,
    generateInvoicePdf,
    cancelOrder,
    returnOrder,
    verifyPayment,
    createOrder,
    topUpWallet,
    refundToWallet,
    retryPayment,
}