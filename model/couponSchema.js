const mongoose = require('mongoose')
const {Schema} = mongoose

const couponSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    offerprice: {
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
    userId: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
})


const Coupon = mongoose.model('Coupon', couponSchema)
module.exports = Coupon