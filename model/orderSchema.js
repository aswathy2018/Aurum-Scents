// const mongoose = require('mongoose')
// const {Schema} = mongoose
// const {v4:uuidv4}= require('uuid')

// const orderSchema = new Schema({
//     orderId: {
//         type: String,
//         default: ()=>uuidv4(),
//         unique: true
//     },
//     orderedItems: [{
//         product: {
//             type: Schema.Types.ObjectId,
//             ref:'Product',
//             required: true
//         },
//         quantity: {
//             type: Number,
//             required: true
//         },
//         price: {
//             type: Number,
//             default: 0
//         }
//     }],
//     totalPrice: {
//         type: Number,
//         required: true
//     },
//     discount: {
//         type: Number,
//         default: 0
//     },
//     finalAmount: {
//         type: Number,
//         required: true
//     },
//     address: {
//         type: Schema.Types.ObjectId,
//         ref: 'Address',
//         required: true
//     },
//     invoiceDate: {
//         type: Date
//     },
//     status: {
//         type: String,
//         required: true,
//         enum: ['Pending','Shipped', 'Delivered', 'Cancelled', 'Returned']
//     },
//     createdOn: {
//         type: Date,
//         default: Date.now,
//         required: true
//     },
//     couponApplied: {
//         type: Boolean,
//         default: false
//     }
// })



// const Order = mongoose.model('Order', orderSchema)
// module.exports = Order

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
            enum: ["Pending", "Shipped", "Delivered","Return", "Cancelled"],
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
        type: Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid'],
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
    }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;