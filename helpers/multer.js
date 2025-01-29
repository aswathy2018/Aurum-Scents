// const multer = require('multer')
// const path = require('path')
// const { db } = require('../model/categorySchema')

// const storage = multer.diskStorage({
//     destination:(req,file,cb)=>{
//         cb(null,path.join(__dirname,"../public/uploads/image"))
//     },
//     filename:(req,file,cb)=>{
//         cb(null,Date.now()+"-"+file.originalname)
//     }
// })
// const uploads = multer({storage})
// module.exports = uploads;


// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');




// // Function to ensure a directory exists
// const ensureDirectoryExists = (directory) => {
//     if (!fs.existsSync(directory)) {
//         fs.mkdirSync(directory, { recursive: true });
//     }
// };


// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         const folderPath = './uploads/images';
//         ensureDirectoryExists(folderPath);
//         cb(null, folderPath);
//     },
//     filename: (req, file, cb) => {
//         // Use the original file name and append a timestamp to it to avoid conflicts
//         const uniqueName = `${Date.now()}-${file.originalname}.png`;
//         cb(null, uniqueName);
//     }
// });


// // Initialize multer with storage and file filters
// const upload = multer({
//     storage,
//     limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
//     fileFilter: (req, file, cb) => {
//         const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
//         if (allowedTypes.includes(file.mimetype)) {
//             cb(null, true);
//         } else {
//             cb(new Error('Invalid file type! Only JPEG, PNG, and JPG are allowed.'));
//         }
//     }
// });

// module.exports = {upload}
const multer = require('multer');
const path = require('path');

// Define storage configuration for multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, './public/uploads/image'); // folder where images will be stored
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
  
  // Set file size limit and the storage engine
  const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for example
  });

const uploads = multer({ storage });
module.exports = { uploads };
