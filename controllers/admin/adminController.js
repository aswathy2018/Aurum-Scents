const User = require('../../model/userSchema')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')


const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect('/admin/dashboard')
    }
    res.render('adminLogin', { message: null })
}


const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const admin = await User.findOne({ email: username, isAdmin: true });

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            
            if (passwordMatch) {
                req.session.admin = admin._id

                return res.redirect('/admin/dashboard');
            } else {
                return res.render('adminLogin', { 
                    error: 'Invalid Username or password',
                    username: username 
                });
            }
        } else {
            return res.render('adminLogin', { 
                error: 'Invalid email or password',
                username: username 
            });
        }
    } catch (error) {
        console.log("Login error", error);
        return res.render('adminLogin', { 
            error: 'An unexpected error occurred',
            username: username 
        });
    }
}


const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            res.render('dashboard')
        } catch (error) {
            console.log('loadDashboard error');

            res.redirect('/admin/404error')
        }
    }
}

const errorPage = async (req, res) => {
    try {
        res.render('404error')
    } catch (error) {
        res.redirect('/admin/404error')
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log("Error destroying session", err);
                return res.redirect('/admin/404error')
            }
            res.redirect('/admin/login')
        })

    } catch (error) {
        console.log("Unexpected error occured", error);
        res.redirect('/admin/404error')
    }
}

const users = async (req, res) => {
    try {
        res.render('users')
    } catch (error) {

        res.redirect('/admin/404error')
    }
}

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    errorPage,
    logout,
    users
}