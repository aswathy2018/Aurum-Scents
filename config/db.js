const mongoose = require("mongoose")
const env = require("dotenv").config()
const mongoDBUrl = process?.env?.MONGODB_URI



const connectDB = async () => {
    
    try{
        await mongoose.connect(mongoDBUrl)
        .then(()=>{
            console.log('MongoDB connected successfully')
            console.log('http://localhost:3002');
        }).catch((error)=>{
            console.log('MongoDB connect error',error)
        })
       
        
    }
    catch(error){
        console.log("DB Connection error", error.message);
        process.exit(1)
        
    }
}


module.exports = connectDB