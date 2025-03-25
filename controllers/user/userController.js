const User = require('../../model/userSchema')
const env = require('dotenv').config()
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const Product = require('../../model/productSchema')
const Category = require('../../model/categorySchema')
const Brand = require('../../model/brandSchema')
const Banner = require('../../model/bannerSchema')


const pageNotFound = async (req, res) => {
    try {
        res.render("page-404")
    }
    catch (error) {
        res.redirect("/pageNotFound")
    }
}


const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {

    }
}

const getOtp = async (req, res) => {
    try {
        res.render('otp')
    } catch (error) {
        res.redirect('/login')
    }
}

const otp = async (req, res) => {
    try {
        const { otp } = req.body

        if (otp === req.session.userOtp) {
            const user = req.session.userData
            const passwordHash = await securePassword(user.password)

            const existingUser = await User.findOne({ email: user.email });
            if (existingUser) {
                res.json({ success: false, message: "User already exists. Please log in." });
                return;
            }


            const newUser = await User.create({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash
            })
            req.session.userOtp = null;
            req.session.userData = null;
            req.session.user = newUser._id
            res.json({ success: true, redirectUrl: '/' })
        }
        else {
            res.status(400).json({ success: false, message: "Invalid OTP, Please try again.." })
        }

    }
    catch (error) {
        console.error("Error verifying OTP", error)
        res.status(500).json({ success: false, message: "An error occured" })
    }
}

const loadHomepage = async (req, res, next) => {
    try {
        const user = req.session.user

        const category = await Category.find({ islisted: true })

        const product = await Product.find({
            isBlocked: false,
            quantity: { $gt: 0 },
            category: { $in: category.map(cat => cat._id) },
        })

        product.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        if (user) {
            const userData = await User.findById(user);
            res.render('home', {
                user: userData,
                product
            })
        } else {
            return res.render('home', { product })
        }
    } catch (error) {
        console.error('Error in loadHomepage:', error);
        next(error);
    }
}

const loadSignup = async (req, res) => {
    try {
        const message = req.query.message

        return res.render('signup', { message })
    }
    catch (error) {
        console.log("page not loading..", error);
        res.status(500).send("Server error..")

    }
}


function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationMail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account..",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`
        })

        return info.accepted.length > 0
    }
    catch (error) {
        console.error("Error sending email", error.message)
        return false
    }
}


const signup = async (req, res) => {
    try {
        const { name, phone, email, password, cpassword } = req.body
        if (password != cpassword) {
            return res.render("signup", { message: "Passwords are not matching" })
        }
        const findUser = await User.findOne({ email })
        if (findUser) {
            return res.render("signup", { message: "User with this mail id is already exist" })
        }


        const otp = generateOTP();

        const emailSent = await sendVerificationMail(email, otp)
        if (!emailSent) {
            return res.json("email-error")
        }

        req.session.userOtp = otp
        req.session.userData = { name, phone, email, password }

        res.render("otp")
        console.log("OTP Sent", otp);

    }
    catch (error) {
        console.error("Signup error", error)
        res.redirect("/pageNotFound")
    }
}


const loadLogin = async (req, res) => {
    try {
        const userId = req.session.user

        const user = await User.findById(userId)
        if (!userId || user.isBlocked === true) {
            return res.render('login')
        }
        else {
            res.redirect('/')
        }

    }
    catch (error) {
        res.redirect('/pageNotFound')

    }
}


const login = async (req, res) => {
    try {
        const { email, password } = req.body
        const findUser = await User.findOne({ isAdmin: 0, email: email })

        if (!findUser) {
            return res.render('login', { message: "User not found" })
        }
        if (findUser.isBlocked) {
            return res.render('login', { message: "User is blocked by admin.." })
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password)

        if (!passwordMatch) {
            return res.render('login', { message: "Incorrect password" })
        }

        req.session.user = findUser._id;
        res.redirect('/?login_success=true')
    } catch (error) {
        console.error("Login error", error)
        res.render('login', { message: "Login failed. Please try again" })
    }
}


const loadShop = async (req, res) => {
    try {
        return res.render('shop')
    }
    catch (error) {
        console.log("Page not loading..", error);
        res.status(500).send("Internal server error..")
    }
}


const resendOtp = async (req, res) => {
    try {

        const { email } = req.session.userData;
                const otp = generateOTP();
                const emailSent = await sendVerificationMail(email, otp)
        
                if (!emailSent) {
                    return res.json("email-error")
                }
                console.log("resendOtp", otp);
                req.session.userOtp = otp;
                res.json({ success: true })
    } catch (error) {
        console.error(500)
        res.json("OTP issue")
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log("Session destruction error", err.message);
                return res.redirect('/pageNotFound')
            }
            return res.redirect('/login')
        })
    } catch (error) {
        console.log("Logout error", error);
        res.redirect('/pageNotFound')

    }
}

const productDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const productData = await Product.findById(id).populate('category').populate('brand')

        const userId = req.session.user
        const user = await User.findById(userId)

        const findCategory = productData.category;
        const relatedproducts = await Product.find({ category: findCategory._id, _id: { $ne: id } }).limit(4)

        res.render('productDetails', {
            product: productData,
            category: findCategory,
            relatedproducts: relatedproducts,
            user: user
        })

    } catch (error) {
        console.log("Product detail page error", error);
        res.redirect('/pageNotFound')
    }
}


const shop = async (req, res, next) => {
    try {
        const user = req.session.user;
        const categories = await Category.find({ islisted: true });
        const products = await Product.find({
            isBlocked: false,
            quantity: { $gt: 0 },
            category: { $in: categories.map(cat => cat._id) },
        });

        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const userData = await User.findById(user);
        req.session.categoryId = null;

        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        const { query, category, priceRange, sort } = req.query;
        
        const filters = {
            isBlocked: false,
            quantity: { $gt: 0 },
        };

        if (category && category !== "all") {
            filters.category = category;
        }

        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            filters.salesPrice = {};
            if (!isNaN(min)) filters.salesPrice.$gte = min;
            if (!isNaN(max)) filters.salesPrice.$lte = max;
        }


        if (query) {
            const searchRegex = new RegExp(query, "i");
            filters.$or = [{ productName: searchRegex }, { description: searchRegex }];
        }

        let filteredProducts = Product.find(filters).populate("category").skip(skip).limit(limit);

        if (sort === "lowToHigh") {
            filteredProducts = filteredProducts.sort({ salesPrice: 1 });
        } else if (sort === "highToLow") {
            filteredProducts = filteredProducts.sort({ salesPrice: -1 });
        } else if (sort === "aToZ") {
            filteredProducts = filteredProducts.sort({ productName: 1 });
        } else if (sort === "zToA") {
            filteredProducts = filteredProducts.sort({ productName: -1 });
        }

        const totalProducts = await Product.countDocuments(filters);
        const totalPages = Math.ceil(totalProducts / limit);
        const brands = await Brand.find({ isBlocked: false });

        res.render("shop", {
            user: userData,
            products: await filteredProducts,
            category: categories,
            brand: brands,
            totalProducts,
            currentPage: page,
            totalPages,
            searchQuery: query || "",
            selectedCategory: category || "",
            selectedPriceRange: priceRange || "",
            selectedSort: sort || "",
        });
    } catch (error) {
        console.error('Error in shop function:', error);
        next(error);
    }
};



const searchProducts = async (req, res) => {
    try {
        const { query, page = 1, limit = 10 } = req.query;
        const searchRegex = new RegExp(query, 'i');
        const category= await Category.find({islisted:false})
        const skip = (page - 1) * limit;

        const products = await Product.find({
            $or: [
                { productName: searchRegex },
                { description: searchRegex }
            ]
        })
            .skip(skip)
            .limit(parseInt(limit));

        const totalProducts = await Product.countDocuments({
            $or: [
                { productName: searchRegex },
                { description: searchRegex }
            ]
        });

        const totalPages = Math.ceil(totalProducts / limit);

        res.render('shop', {
            products,
            category,
            totalProducts,
            totalPages,
            currentPage: parseInt(page),
            query
        });
    } catch (error) {
        console.error('Error searching products:', error);
        res.redirect('/pagenotfound');
    }
};


const categoryfilter = async (req, res) => {
    try {
        const { category, sort, priceRange, query } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        const filters = {
            isBlocked: false,
            quantity: { $gt: 0 },
        };

        if (category && mongoose.Types.ObjectId.isValid(category)) {
            filters.category = new mongoose.Types.ObjectId(category);
        }

        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            filters.salePrice = {};
            if (!isNaN(min)) filters.salePrice.$gte = min;
            if (!isNaN(max)) filters.salePrice.$lte = max;
        }

        if (query) {
            const searchRegex = new RegExp(query, "i");
            filters.$or = [
                { productName: searchRegex },
                { description: searchRegex },
            ];
        }

        let products = Product.find(filters).skip(skip).limit(limit);

        if (sort === "lowToHigh") {
            products = products.sort({ salePrice: 1 });
        } else if (sort === "highToLow") {
            products = products.sort({ salePrice: -1 });
        } else if (sort === "aToZ") {
            products = products.sort({ productName: 1 });
        } else if (sort === "zToA") {
            products = products.sort({ productName: -1 });
        }

        const totalProducts = await Product.countDocuments(filters);
        const totalPages = Math.ceil(totalProducts / limit);

        res.render("shope", {
            user: req.session.user,
            products: await products,
            category: await Category.find({ isListed: true }),
            totalProducts,
            totalPages,
            currentPage: page,
            selectedCategory: category,
            selectedSort: sort,
            selectedPriceRange: priceRange,
            searchQuery: query,
        });
    } catch (error) {
        console.error("Error in categoryfilter:", error);
        res.redirect("/pagenotfound");
    }
};


const checkUserStatus = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.json({ isBlocked: true });
        }

        const user = await User.findById(req.session.user);

        if (user.isBlocked) {
            console.log('User is blocked, destroying session...');

            req.session.destroy((err) => {
                if (err) {
                    console.log("Session destruction error", err.message);
                    return res.redirect('/pageNotFound');
                }
                return res.redirect('/login');
            });

            return;
        }


        return res.json({ isBlocked: false });

    } catch (error) {
        console.log("Error checking user status:", error);
        return res.json({ isBlocked: true });
    }
};


module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    loadLogin,
    login,
    loadShop,
    otp,
    getOtp,
    resendOtp,
    logout,
    productDetails,
    shop,
    searchProducts,
    categoryfilter,
    checkUserStatus
}