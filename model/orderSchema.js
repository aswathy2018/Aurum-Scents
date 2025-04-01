const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderedItems: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ["Pending", "Shipped", "Delivered", "Return", "Cancelled"],
            default: "Pending", 
        },
        returnReason:String
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    discount: { 
        type: Number,
        default: 0
    },
    address: {
        addressType: String,
        name: String,
        city: String,
        landMark: String,
        state: String,
        pincode: Number,
        phone: String,
        alternativePhone: String
    },
    paymentMethod: {
        type: String,
        enum: ['COD','online', 'Wallet'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid','Failed'],
        default: 'Pending'
    },
    invoiceDate: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    couponCode: {
        type: String,
        default:null
    },
    originalAmount: {
        type: Number
    }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order; 