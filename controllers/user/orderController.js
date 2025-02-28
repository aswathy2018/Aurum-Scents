const Order = require('../../model/orderSchema')
const User = require('../../model/userSchema')
const Address = require('../../model/addressSchema')
const Product = require('../../model/productSchema')
const Cart = require('../../model/cartSchema')
const mongoose = require('mongoose')


const getCheckOut = async (req, res) => {
    try {
        const user = req.session.user
        const userData = await User.findById(user)
        const address = await Address.findOne({userId: user})
        const cart = await Cart.findOne({ userId: user }).populate('items.productId');
        
        res.render('checkOut', {user: userData, address, cart})
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

module.exports = {
    getCheckOut,
}