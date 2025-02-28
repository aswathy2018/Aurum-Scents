const User = require('../../model/userSchema')
const Address = require('../../model/addressSchema')
const Product = require('../../model/productSchema')
const Cart = require('../../model/cartSchema')
const env = require('dotenv').config()
const mongoose = require('mongoose')


const getCart = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findById(user);
        let cart = await Cart.findOne({ userId: user })
            .populate({
                path: 'items.productId',
                populate: [
                    { path: 'category' },
                    { path: 'brand' }
                ]
            });

        if (!cart) {
            return res.render('cart', { user: userData, cart: { items: [] } });
        }

        const originalItemsCount = cart.items.length;

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

        if (originalItemsCount !== cart.items.length) {
            await cart.save();
        }

        res.render('cart', { user: userData, cart });

    } catch (error) {
        console.error("Error while loading cart:", error);
        res.redirect('/pageNotFind');
    }
};


const addToCart = async (req, res) => {
    try {
        const user = req.session.user;
        const { productId, quantity } = req.body;
        const itemQuantity = parseInt(quantity || 1);

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        let cart = await Cart.findOne({ userId: user });

        if (!cart) {
            cart = new Cart({
                userId: user,
                items: [{
                    productId,
                    quantity: itemQuantity,
                    price: product.salesPrice,
                    totalPrice: product.salesPrice * itemQuantity
                }]
            });
            await cart.save();
            return res.status(200).json({ success: true, message: "Product added to cart successfully" });
        } else {
            const existingItemIndex = cart.items.findIndex(item =>
                item.productId.toString() === productId
            );

            if (existingItemIndex !== -1) {
                return res.status(200).json({
                    success: false,
                    exists: true,
                    message: "Product already exists in your cart"
                });
            } else {
                cart.items.push({
                    productId,
                    quantity: itemQuantity,
                    price: product.salesPrice,
                    totalPrice: product.salesPrice * itemQuantity
                });
                await cart.save();
                return res.status(200).json({
                    success: true,
                    message: "Product added to cart successfully"
                });
            }
        }
    } catch (error) {
        console.log("Error in addToCart", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}


const updateCart = async (req, res) => {
    try {
        const user = req.session.user;
        const { productId, quantity } = req.body;

        const newQuantity = parseInt(quantity);
        if (isNaN(newQuantity) || newQuantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid quantity"
            });
        }

        const cart = await Cart.findOne({ userId: user });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        const itemIndex = cart.items.findIndex(item =>
            item.productId.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found in cart"
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        if (newQuantity > product.quantity) {
            return res.status(400).json({
                success: false,
                message: "Requested quantity exceeds available stock"
            });
        }

        cart.items[itemIndex].quantity = newQuantity;
        cart.items[itemIndex].totalPrice = cart.items[itemIndex].price * newQuantity;

        await cart.save();
        return res.status(200).json({
            success: true,
            message: "Cart updated successfully"
        });

    } catch (error) {
        console.log("Error in updateCart", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const removeFromCart = async (req, res) => {
    try {
        const user = req.session.user;
        const { productId } = req.body;

        const cart = await Cart.findOne({ userId: user });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        const itemIndex = cart.items.findIndex(item =>
            item.productId.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found in cart"
            });
        }

        cart.items.splice(itemIndex, 1);
        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Product removed from cart"
        });

    } catch (error) {
        console.log("Error in removeFromCart", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


module.exports = {
    getCart,
    addToCart,
    removeFromCart,
    updateCart,
}