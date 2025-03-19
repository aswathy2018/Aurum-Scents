const mongoose = require('mongoose')
const {Schema} = mongoose

const couponSchema = new Schema({

    couponCode: {
        type: String,
        required: true,
        unique: true,
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    startingDate: {
        type: Date,
        required: true,
    },
    expiryDate: {
        type: Date,
        required: true
    },
    offerPercentage: {
        type: Number,
        required: true
    },
    minimumprice: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
})


const Coupon = mongoose.model('Coupon', couponSchema)
module.exports = Coupon
