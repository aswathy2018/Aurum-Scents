const mongoose = require('mongoose')
const {Schema} = mongoose
// mongoose.set('autoIndex', false);

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: false,
        unique: false,
        sparse: true,
        default: null
    },
    userImage: {
        type: String,
        required: false
    },
    googleId: {
        type: String,
        unique: true
    },
    password: {
        type: String,
        required: false,
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    wallet: {
        balance: { type: Number, default: 0 },
        transactions: [
          {
            type: { type: String, enum: ["credit", "debit"], required: true },
            amount: { type: Number, required: true },
            description: { type: String, required: true },
            date: { type: Date, default: Date.now }
          }
        ]
      },
    orderHistory: [{
        type:Schema.Types.ObjectId,
        ref: "Order"
    }],
    createdOn: {
        type: Date,
        default: Date.now
    },
    referalCode: {
        type: String,
        //default: null,
        // unique: true
    },
    redeemed: {
        type: Boolean,
        //default: false
    },
    redeemedUsers: [{
        type:Schema.Types.ObjectId,
        ref: "User"
    }],
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category"
        },
        brand: {
            type: String,
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }]
})



const User = mongoose.model("User",userSchema)

module.exports = User;