const Order = require('../../model/orderSchema')
const User = require('../../model/userSchema')
const Address = require('../../model/addressSchema')
const Product = require('../../model/productSchema')
const Cart = require('../../model/cartSchema')
const mongoose = require('mongoose')
const PDFDocument = require('pdfkit');
const fs = require('fs');


const getCheckOut = async (req, res) => {
    try {
        const user = req.session.user
        const userData = await User.findById(user)
        const address = await Address.findOne({userId: user})
        const cart = await Cart.findOne({ userId: user }).populate('items.productId');
        
        res.render('checkOut', {user: userData, address, cart, cartItems:cart})
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

const placeorder = async (req, res) => {
    const userId = req.session.user;
    const { orderData } = req.body;

    const { addressId, paymentMethod, totalAmount } = orderData;

    try {
        if (paymentMethod === 'COD') {
            try {
                let foundAddress;

                // Validate addressId
                if (!mongoose.isValidObjectId(addressId)) {
                    return res.status(400).json({ error: "Invalid address ID." });
                }

                // Fetch cart and populate product details
                const cart = await Cart.findOne({ userId }).populate('items.productId');

                if (!cart || cart.items.length === 0) {
                    return res.status(400).json({ error: "Cart is empty or invalid." });
                }

                // Validate address selection
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

                // Validate payment details
                if (!paymentMethod || !totalAmount) {
                    return res.status(400).json({ error: "Payment method and total amount are required." });
                }

                // Create order items with validation
                const orderItems = cart.items.map(item => {
                    if (!item.productId || !item.productId._id) {
                        throw new Error(`Invalid product data in cart: ${JSON.stringify(item)}`);
                    }
                    return {
                        product: item.productId._id, // ✅ Change `productId` to `product` to match schema
                        quantity: item.quantity,
                        price: item.productId.salesPrice,
                    };
                });

                // Create and save the order
                const order = new Order({
                    userId: req.session.user,
                    paymentMethod,
                    totalAmount,
                    orderedItems: orderItems,
                    address: foundAddress,
                });

                await order.save();

                // Update product stock
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

                // Clear the cart
                cart.items = [];
                await cart.save();

                console.log("Order Placed Successfully");
                return res.json({success:true, message: "Order placed successfully." });

            } catch (error) {
                console.error("Error processing order:", error.message);
                return res.status(500).json({ success:false, error: "Failed to place order. Please try again later." });
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


const paymentFail = async (req,res)=>{
    try {
        res.render('paymentFail')
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
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

        // Fetch the order details
        const Id = new mongoose.Types.ObjectId(orderId);
        const order = await Order.findById(Id)
            .populate("userId")
            .populate("orderedItems.product");

        if (!order) {
            return res.status(404).send("Order not found");
        }

        // Create a new PDF document
        const pdfDoc = new PDFDocument({ margin: 30 });

        // Set the response headers for the PDF download
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=Invoice_${order._id}.pdf`
        );

        // Pipe the PDF to the response
        pdfDoc.pipe(res);

        // Add title and header
        pdfDoc
            .fontSize(18)
            .text("Invoice", { align: "center" })
            .moveDown(0.5);
        pdfDoc
            .fontSize(12)
            .text(`Order ID: ${order._id}`, { align: "center" })
            .moveDown(0.2);
        pdfDoc
            .text(`Date: ${order.createdAt.toDateString()}`, { align: "center" })
            .moveDown(0.5);
        pdfDoc
            .fontSize(14)
            .text(`Customer Name: ${order?.userId?.name || "N/A"}`)
            .moveDown(0.2);
        pdfDoc.text(`Email: ${order?.userId?.email || "N/A"}`).moveDown(1);

        // Table layout settings
        const tableTop = 200;
        const columnWidths = [200, 70, 100, 70, 100];
        const rowHeight = 20;
        const xStart = 50;
        let y = tableTop;

        // Draw table headers
        pdfDoc
            .fontSize(12)
            .font("Helvetica-Bold")
            .rect(xStart, y, columnWidths[0], rowHeight).stroke()
            .text("Item", xStart + 5, y + 5);

        pdfDoc
            .rect(xStart + columnWidths[0], y, columnWidths[1], rowHeight).stroke()
            .text("Quantity", xStart + columnWidths[0] + 5, y + 5);

        pdfDoc
            .rect(xStart + columnWidths[0] + columnWidths[1], y, columnWidths[2], rowHeight).stroke()
            .text("Status", xStart + columnWidths[0] + columnWidths[1] + 5, y + 5);

        pdfDoc
            .rect(xStart + columnWidths[0] + columnWidths[1] + columnWidths[2], y, columnWidths[3], rowHeight).stroke()
            .text("Price", xStart + columnWidths[0] + columnWidths[1] + columnWidths[2] + 5, y + 5);

        pdfDoc
            .rect(xStart + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], y, columnWidths[4], rowHeight).stroke()
            .text("discount", xStart + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + 5, y + 5);


        y += rowHeight;

        // Draw table rows for each item
        pdfDoc.fontSize(10).font("Helvetica");
        order.orderedItems.forEach((item) => {
            const itemName = item?.product?.productName || "N/A";
            const quantity = item.quantity || 0;
            const status = item.status || "N/A";
            const price = item.price || 0;
            const discount = order.discount
            const total = quantity * price;

            pdfDoc.rect(xStart, y, columnWidths[0], rowHeight).stroke()
                .text(itemName, xStart + 5, y + 5);

            pdfDoc.rect(xStart + columnWidths[0], y, columnWidths[1], rowHeight).stroke()
                .text(quantity.toString(), xStart + columnWidths[0] + 5, y + 5);

            pdfDoc.rect(xStart + columnWidths[0] + columnWidths[1], y, columnWidths[2], rowHeight).stroke()
                .text(status, xStart + columnWidths[0] + columnWidths[1] + 5, y + 5);

            pdfDoc.rect(xStart + columnWidths[0] + columnWidths[1] + columnWidths[2], y, columnWidths[3], rowHeight).stroke()
                .text(`${price.toFixed(2)}`, xStart + columnWidths[0] + columnWidths[1] + columnWidths[2] + 5, y + 5);

            pdfDoc.rect(xStart + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], y, columnWidths[4], rowHeight).stroke()
                .text(`${discount.toFixed(2)}`, xStart + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + 5, y + 5);


            y += rowHeight;

            if (y > 750) {
                pdfDoc.addPage();
                y = tableTop;
            }
        });

        // Add total amount
        pdfDoc
            .fontSize(12)
            .font("Helvetica-Bold")
            .text(`Total Amount: ${order.totalAmount.toFixed(2)}`, xStart, y + 20);

        // Finalize the PDF
        pdfDoc.end();
    } catch (error) {
        console.error("Error generating invoice PDF:", error);
        res.status(500).send("Failed to generate invoice PDF");
    }
};


module.exports = {
    getCheckOut,
    placeorder,
    success,
    getOrderList,
    paymentFail,
    invoice,
    generateInvoicePdf,
}