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


// const customerBlocked = async (req, res) => {
//     try {
//         let id = req.body.id;
//         await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
//         res.status(200).json({ success: true, message: "User blocked successfully" });
//     } catch (error) {
//         res.status(500).json({ success: false, message: "An error occurred" });
//     }
// };

// const customerunBlocked = async (req, res) => {
//     try {
//         let id = req.body.id;
//         await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
//         res.status(200).json({ success: true, message: "User unblocked successfully" });
//     } catch (error) {
//         res.status(500).json({ success: false, message: "An error occurred" });
//     }
// };

const customerBlocked = async (req, res) => {
    try {
        let id = req.body.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.status(200).json({ success: true, message: "User blocked successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};

const customerunBlocked = async (req, res) => {
    try {
        let id = req.body.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.status(200).json({ success: true, message: "User unblocked successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};


module.exports = {
    customerinfo,
    customerBlocked,
    customerunBlocked,
}