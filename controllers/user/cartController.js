const User = require('../../model/userSchema')
const Address = require('../../model/addressSchema')
const Product = require('../../model/productSchema')
const Cart = require('../../model/cartSchema')
const Wishlist = require('../../model/wishListSchema')
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

        if (newQuantity > 5) {
            return res.status(400).json({
                success: false,
                message: "You can choose up to 5 items."
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


const loadwhishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        let wishlist = await Wishlist.findOne({ userId }).populate("products.productId")
        const user = await User.findById(userId)
        if (!wishlist) {
            wishlist = {
                user: req.session.user,
                products: [],
            };
        }
        return res.render('wishlist', { wishlist, user });

    } catch (error) {
        console.log(error.message);
        return res.redirect('/500')
    }
};


const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user;
        console.log("userId:", userId, "productId:", productId);

        let wishlist = await Wishlist.findOne({ userId });
        console.log(wishlist)

        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }
        const productExists = wishlist.products.some((item) => item.productId.equals(productId));

        if (productExists) {
            return res.status(400).json({ success: false, message: "Product already in wishlist" });
        }

        wishlist.products.push({ productId });
        await wishlist.save();

        res.status(200).json({ success: true, message: "Product added to wishlist", wishlist });
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


const removeFromWishlist = async (req, res) => {
    try {
        const user = req.session.user;
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required"
            });
        }

        const wishlist = await Wishlist.findOne({ userId: user });

        if (!wishlist || !wishlist.products) {
            return res.status(404).json({
                success: false,
                message: "Wishlist not found"
            });
        }

        const itemIndex = wishlist.products.findIndex(item => 
            item.productId && item.productId.toString() === productId
        );

        console.log("Item Index Found:", itemIndex);

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found in wishlist"
            });
        }

        wishlist.products.splice(itemIndex, 1);
        await wishlist.save();

        return res.status(200).json({
            success: true,
            message: "Product removed from wishlist"
        });

    } catch (error) {
        console.error("Error in removeFromWishlist", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


const addToCartFromWishlist = async (req, res) => {
    try {
        const user = req.session.user;
        const { productId, quantity } = req.body;
        const itemQuantity = parseInt(quantity || 1);
        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        
        let cart = await Cart.findOne({ userId: user });
        let wishlist = await Wishlist.findOne({ userId: user });
        
        if (!cart) {
            // If no cart exists, create a new one
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
            
            // Remove from wishlist since it was added to cart
            if (wishlist) {
                wishlist.products = wishlist.products.filter(item => 
                    item.productId.toString() !== productId
                );
                await wishlist.save();
            }
            
            return res.status(200).json({
                success: true,
                message: "Product added to cart and removed from wishlist"
            });
        } else {
            const existingItemIndex = cart.items.findIndex(item =>
                item.productId.toString() === productId
            );
            
            if (existingItemIndex !== -1) {
                // Product already exists in cart
                // Don't remove from wishlist if it's already in the cart
                return res.status(200).json({
                    success: false,
                    exists: true,
                    message: "Product already exists in your cart"
                });
            } else {
                // Add to cart
                cart.items.push({
                    productId,
                    quantity: itemQuantity,
                    price: product.salesPrice,
                    totalPrice: product.salesPrice * itemQuantity
                });
                await cart.save();
                
                // Remove from wishlist since it was added to cart
                if (wishlist) {
                    wishlist.products = wishlist.products.filter(item => 
                        item.productId.toString() !== productId
                    );
                    await wishlist.save();
                }
                
                return res.status(200).json({
                    success: true,
                    message: "Product added to cart and removed from wishlist"
                });
            }
        }
    } catch (error) {
        console.log("Error in addToCartFromWishlist", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


const checkAddAddress = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user })
        const { addressType, name, city, landMark, state, pincode, phone, alternativePhone } = req.body

        const userAddress = await Address.findOne({ userId: userData._id })
        // Validate required fields
        if (!userAddress) {
            const newAddress = new Address({
                userId: userData._id,
                address: [{ addressType, name, city, landMark, state, pincode, phone, alternativePhone }]
            })
            await newAddress.save();
        } else {
            userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, alternativePhone })
            await userAddress.save()
        }

        res.redirect('/checkOut')

    } catch (error) {
        console.error("Error in checkAddAddress:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


module.exports = {
    getCart,
    addToCart,
    removeFromCart,
    updateCart,
    loadwhishlist,
    addToWishlist,
    removeFromWishlist,
    addToCartFromWishlist,
    checkAddAddress,
}