const User = require('../../model/userSchema')
const Address = require('../../model/addressSchema')
const env = require('dotenv').config()
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const session = require('express-session')
const mongoose = require('mongoose')



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
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b><h3>Your OTP: ${otp}</h3></b>`
        });

        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email", error.message);
        return false;
    }
}



const getForgotPassPage = async (req, res) => {
    try {
        res.render('forgotPassword')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        
        const findUser = await User.findOne({ email: email })
        if (findUser) {
            const otp = generateOTP();
            const emailSent = await sendVerificationMail(email, otp)
            if (emailSent) {
                req.session.userOtp = otp
                req.session.email = email
                res.render("mailverification")
                console.log("OTP: ", otp);

            } else {
                res.json({ success: false, message: "Failed to send OTP. Please try again.." })
            }
        } else {
            res.render('forgotPassword', {
                message: "User with this email does not exist"
            })
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const verifyForgotPassOTP = async (req, res) => {
    try {
        const enteredOTP = req.body.otp
        if (enteredOTP === req.session.userOtp) {
            res.json({ success: true, redirectUrl: '/resetPassword' })
        } else {
            res.json({ success: false, message: "OTP not matching" })
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "An error occured. Please try again.." })
    }
}


const getResetPassword = async (req, res) => {
    try {
        res.render('resetPassword')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const resendOTP = async (req, res) => {
    try {
        const otp = generateOTP()
        req.session.userOtp = otp
        const email = req.session.email
        console.log("Email of the resnd OTP: ", email);
        const emailSent = await sendVerificationMail(email, otp)
        if (emailSent) {
            console.log("Resended OTP: ", otp);
            res.status(200).json({ success: true, message: "Successfully sended resend OTP" })

        }

    } catch (error) {
        console.error("Error in resend OTP", error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}


const hashpassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;
    } catch (error) {
        console.log("password hasing is failed, check the bcrypt module is working propperly ", error);
    }
}

const resetPassword = async (req, res) => {
    try {
        const { newPass1, newPass2 } = req.body;

        const user = await User.findById(req.session.user)

        const email = req.session.email;
        if (newPass1 === newPass2) {
            const passwordHarsh = await hashpassword(newPass1);
            await User.updateOne(
                { email: email },
                { $set: { password: passwordHarsh } }
            )
            res.redirect('/login')

        } else {
            res.render('resetpassword', {
                user,
                message: "password do not match"
            })
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const profile = async (req, res) => {
    try {
        const user = req.session.user
        const userData = await User.findById(user)
        res.render('userProfile', { user: userData })
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

const profileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, message: "No image uploaded" });
        }

        const userId = req.session.user;
        const user = await User.findById(userId);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        console.log(req.file);

        await User.findByIdAndUpdate(userId, { $set: { userImage: req.file.filename } });

        res.json({ success: true, message: "Image upload success" });
    } catch (error) {
        console.error("Error uploading image:", error);
        res.json({ success: false, message: "Failed to upload image" });
    }
};


const changePasswordPage = async (req, res) => {
    try {
        const user = req.session.user
        const userData = await User.findById(user)
        res.render('changePassword', { user: userData })
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound');
    }
};


const changePassword = async (req, res) => {
    try {
        const user = req.session.user
        const userData = await User.findById(user)
        const { currentPassword, newPassword, confirmPassword } = req.body
        const passwordMatch = await bcrypt.compare(currentPassword, userData.password)

        if (!passwordMatch) {
            return res.render('changePassword', { message: 'Current password is incorrect.' });
        }

        if (newPassword != confirmPassword) {
            return res.render('changePassword', { message: 'New passwords do not match.' });
        }

        const hashed = await hashpassword(newPassword)
        if (passwordMatch) {
            await User.findByIdAndUpdate(user, { $set: { password: hashed } })
            req.session.destroy((err) => {
                if (err) {
                    console.log("Session destruction error", err.message);
                    return res.redirect('/pageNotFound')
                }
                return res.redirect('/login?password_changed=true');
            })
        }
    } catch (error) {
        console.log(error);
        res.render('changePassword', { message: 'An error occurred. Please try again.' });
    }
};


const address = async (req, res) => {
    try {
        const user = req.session.user
        const address = await Address.findOne({ userId: user })

        const userData = await User.findById(user)
        res.render('address', { address, user: userData })
    } catch (error) {
        console.log(error);
        res.redirect('pageNotFound')
    }
}


const addAddress = async (req, res) => {
    try {
        const user = req.session.user
        const userData = await User.findById(user)
        res.render('addAddress', { user: userData })
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}


const postAddAddress = async (req, res) => {
    try {
        const userId = req.session.user
        const userData = await User.findOne({ _id: userId })
        const { addressType, name, city, landMark, state, pincode, phone, alternativePhone } = req.body

        const userAddress = await Address.findOne({ userId: userData._id })
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

        res.redirect('/address')

    } catch (error) {
        console.log("Error in adding address", error);
        res.redirect('/pageNotFound')

    }
}


const editAddress = async (req, res) => {
    try {
        const addressId = req.query.id
        const user = req.session.user
        const userData = await User.findById(user)
        const currentAddress = await Address.findOne({
            "address._id": addressId,
        })
        if (!currentAddress) {
            return res.redirect('/pageNotFound')
        }
        const addressData = currentAddress.address.find((item) => {
            return item._id.toString() === addressId.toString()
        })

        if (!addressData) {
            return res.redirect('/pageNotFound')
        }

        res.render('editAddress', { address: addressData, user: userData })
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}


const postEditAddress = async (req, res) => {
    try {
        const data = req.body
        const addressId = req.query.id
        const user = req.session.user
        const findAddress = await Address.findOne({ "address._id": addressId })

        if (!findAddress) {
            return res.redirect('/pageNotFound')
        }
        await Address.updateOne(
            { "address._id": addressId },
            {
                $set: {
                    "address.$": {
                        _id: addressId,
                        addressType: data.addressType,
                        name: data.name,
                        city: data.city,
                        landMark: data.landMark,
                        state: data.state,
                        pincode: data.pincode,
                        phone: data.phone,
                        alternativePhone: data.alternativePhone,
                    }
                }
            }
        )

        res.json({ success: true, message: "Updated successfully.." })
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}


const deleteAddress = async (req, res) => {
    try {
        const addressId = req.query.id
        const findAddress = await Address.findOne({ "address._id": addressId })
        if (!findAddress) {
            return res.status(404).send("Address Not Found")
        }
        await Address.updateOne(
            { "address._id": addressId },
            {
                $pull: {
                    address: {
                        _id: addressId,
                    }
                }
            }
        )
        res.json({ success: true, message: "Updated successfully.." })
    } catch (error) {
        console.log("An error occured, Deletion not possible", error);
        res.redirect('/pageNotFound')
    }
}


const editProfile = async (req, res) => {
    try {
        const user = req.session.user
        const userData = await User.findById(user)

        res.render('editProfile', { user: userData })
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}


const postEditProfile = async (req, res) => {
    try {
        const data = req.body;
        const user = req.session.user;

        const otp = generateOTP();

        req.session.userOtp = otp;
        req.session.updatedData = data;
        


        await sendVerificationMail(data.email, otp);
        console.log("Your OTP is: ", otp);


        res.render('otpVerification');
    } catch (error) {
        console.log("Error occurred when updating user profile", error);
        res.redirect('/pageNotFound');
    }
};


const otpVerification = async (req, res) => {
    try {
        const { otp } = req.body;

        if (otp === req.session.userOtp) {
            const userId = req.session.user;
            const updatedData = req.session.updatedData;

            await User.findByIdAndUpdate(userId, {
                $set: {
                    name: updatedData.userName,
                    email: updatedData.email,
                    phone: updatedData.number
                }
            });

            req.session.userOtp = null;
            req.session.userData = null;
            req.session.updatedData = null;

            res.json({ success: true, redirectUrl: '/userProfile' });
        } else {
            res.status(400).json({
                success: false,
                message: "Invalid OTP, Please try again.."
            });
        }
    } catch (error) {
        console.log("Error when updating the user details", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again later."
        });
    }
};


const profileResendOTP = async (req, res) => {
    try {
        const otp = generateOTP()
        req.session.userOtp = otp
        const userData = req.session.updatedData
        
        const email = userData.email
        console.log("Email of the resnd OTP: ", email);
        const emailSent = await sendVerificationMail(email, otp)
        if (emailSent) {
            console.log("Resended OTP: ", otp);
            res.status(200).json({ success: true, message: "Successfully sended resend OTP" })
        }
    } catch (error) {
        console.log(error)
        console.error(500)
        res.json("OTP issue")
    }
}

module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOTP,
    getResetPassword,
    resendOTP,
    resetPassword,
    profile,
    profileImage,
    changePassword,
    changePasswordPage,
    address,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    editProfile,
    postEditProfile,
    otpVerification,
    profileResendOTP,
}