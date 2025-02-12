const User = require('../../model/userSchema')


const customerinfo = async (req, res) => {
    try {
        let search = ""
        if (req.query.search) {
            search = req.query.search.trim();
        }
        let page = parseInt(req.query.page) || 1;

        const limit = 5;
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        const count = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        }).countDocuments();

        const totalPages = Math.ceil(count / limit);

        res.render('customers', { data: userData, currentPage: page, totalPages })
    } catch (error) {
        console.error("Error fetching customer data:", error);
        res.status(500).send("Error fetching customer data");
    }
}


const customerBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/404error')
    }
}


const customerunBlocked = async (req, res) => {
    try {
        let id = req.query.id
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } })
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/404error')
    }
}


module.exports = {
    customerinfo,
    customerBlocked,
    customerunBlocked
}