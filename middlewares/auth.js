const User = require('../model/userSchema')


const userAuth = async (req, res, next) => {
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user);
            if(user.isBlocked == true){
                return res.redirect('/login')
            }
            
            if (user && user.isBlocked === false) {
                next();
            } else {
                // If user is blocked, destroy their session and redirect to login
                req.session.destroy((err) => {
                    if (err) {
                        console.log("Error destroying session:", err);
                    }
                    res.redirect('/login');
                });
            }
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.log("Error in user Auth middleware:", error);
        res.status(500).send("Internal server error");
    }
};



const adminAuth = (req,res,next)=>{
    const admin = req.session.admin
    
    
    User.findOne({_id:admin,isAdmin: true})
    .then(data=>{
        
        if(data){
            next();
        }else{
            res.redirect('/admin/login')
        }
    })
    .catch(error=>{
        console.log("Error in admin Auth middleware", error);
        res.status(500).send("Internal server error")
    })
}


module.exports = {
    userAuth,
    adminAuth
}