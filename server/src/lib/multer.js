import multer from "multer";
const memoryStorage = multer.memoryStorage();
const upload = multer({
    storage: memoryStorage,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
}).fields([
    {name:"video",maxCount:1},
    {name:"audio",maxCount:1}
]);


export default upload;