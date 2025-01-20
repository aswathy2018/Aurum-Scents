const User = require('../../model/userSchema')


const pageNotFound = async(req,res)=>{
    try{
        res.render("page-404")
    }
    catch(error){
        res.redirect("/pageNotFound")
    }
}



const loadHomepage = async (req,res)=>{
    try{
        return res.render("home")
    }
    catch(error){
        console.log("Home page not found!!");
        res.status(500).send("Internal server issue")
    }
}



const loadSignup = async (req,res)=>{
    try{
        return res.render('signup')
    }
    catch(error){
        console.log("page not loading..", error);
        res.status(500).send("Server error..")
        
    }
}



const signup = async(req,res)=>{
    const {name, email, phone, password, confirmPassword} = req.body
    try{
        const newUser = await User.create({name, email, phone, password})
        console.log(newUser);
        return res.redirect('/signup')
        
    }
    catch(error){
        console.error("Error when saving the user")
        res.status(500).send("Server error")
    }
}



const loadLogin = async (req,res)=>{
    try{
        return res.render('login')
    }
    catch(error){
        console.log("Page not loading..", error);
        res.status(500).send("Server error..")
        
    }
}



const loadShop = async (req,res)=>{
    try{
        return res.render('shop')
    }
    catch(error){
        console.log("Page not loading..", error);
        res.status(500).send("Internal server error..")
    }
}



module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    loadLogin,
    loadShop
}