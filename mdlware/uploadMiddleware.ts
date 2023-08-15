import { Request, Response, NextFunction} from "express";
import {usr} from '../types/usrType';

const DatauriParser = require('datauri/parser');
const multer = require("multer");
const maxSize = 4 * 1024 * 1024 ; /// 4 MB PHOTO OR GIF
const cloudinary = require('cloudinary').v2;
const path = require('path');
const UserModel = require('../models/userModel');

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, './uploads');
//     },
//     filename: function (req, file, cb) {
//         cb(null,file.originalname);
//     }
// });  

const fileFilter = (req : Request | any, file : any, cb : CallableFunction) => {
    if((file.mimetype).includes('jpeg') || (file.mimetype).includes('png') || (file.mimetype).includes('jpg')|| (file.mimetype).includes('webp')){
        cb(null, true);
    } else{
        cb(null, false);
    }

};
const gifFileFilter = (req : Request | any, file : any, cb : CallableFunction) => {
    if((file.mimetype).includes('gif')){
        cb(null, true);
    } else{
        cb(null, false);
    }

};

// const profileStorage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         if (req.body.isBanner){
//             cb(null, './uploads/banners/');
//         }else{
//             cb(null, './uploads/profiles/');
//         }
//     },
//     filename: function (req, file, cb) {
//         cb(null,file.originalname);
//     }
// });  

// const channelStorage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         if (req.body.isBanner){
//             cb(null, './uploads/channels/channelBanners/');
//         }else{
//             cb(null, './uploads/channels/channelPictures/');
//         }
//     },
//     filename: function (req, file, cb) {
//         cb(null,file.originalname);
//     }
// });  


let upload = multer({ storage: multer.memoryStorage(), fileFilter: fileFilter, limits: { fileSize: maxSize }});
module.exports.uploadImage = upload.single('image');


let profileUpload :any = multer({ storage: multer.memoryStorage(), fileFilter: fileFilter, limits: { fileSize: maxSize }});
module.exports.uploadProfile = profileUpload.single('image');


let channelUpload = multer({ storage: multer.memoryStorage(), fileFilter: fileFilter, limits: { fileSize: maxSize }});
module.exports.uploadChannelPic = channelUpload.single('image');

let gifUpload = multer({ storage: multer.memoryStorage(), fileFilter: gifFileFilter, limits: { fileSize: maxSize }});
module.exports.gifUpload = gifUpload.single('image');


 module.exports.uploadCloud = async (req : Request | any,  res : Response, next : NextFunction) => {
    if (req.file){
        // console.log(multer.memoryStorage());
        // console.log(req.originalUrl);
        try {
            //console.log(req.originalUrl.split('/'));
            const url_inf : string[] = req.originalUrl.split('/');
            var fldr_nm : string = "";
            if (url_inf.includes("post")){
                fldr_nm  = "posts/";
            }else if (url_inf.includes("auth")){
                fldr_nm = "profiles/picture/";
                if  (req.body.isBanner){fldr_nm = "profiles/banner/"}
            }else if (url_inf.includes("channel")){
                fldr_nm = "channels/picture/";
                if  (req.body.isBanner){fldr_nm = "channels/banner/"}
            }else{
                next();
                return 0;
            }
            cloudinary.config({
                secure: true,
                cloud_name: process.env.CLOUD_NAME,
                api_key: process.env.CLOUD_API_KEY,
                api_secret: process.env.CLOUD_API_SECRET
            });

            const parser : any = new DatauriParser();
            parser.format('.png', req.file.buffer.buffer);
            const result = await cloudinary.uploader.upload(parser.content, {
               folder: 'nitrochat/' + fldr_nm,
               resource_type: 'image',
               quality: "auto"
            });
            req.body.newFilename = result.secure_url;
            next();
        }catch (error){
            console.error(error);
            return res.status(401).send("Unauthorized");
        }
    }else{
        next();
    }
};

module.exports.gifUploadCloud = async (req : Request | any,  res : Response, next : NextFunction) => {
    if (req.file){
        try {
            //console.log(req.originalUrl.split('/'));
            const usr : usr = await UserModel.findById(req.headers.authentification).select('nitroUnlocks').select('channelsCreated');
            const url_inf : string[] = req.originalUrl.split('/');

            var fldr_nm: string = "";
            if (url_inf.includes("auth")){
                fldr_nm = "profiles/picture/";
                if (req.body.isBanner){
                    fldr_nm = "profiles/banner/";
                    if (!usr.nitroUnlocks.animatedBanner){return 0;}

                }else if(!req.body.isBanner){ if (!usr.nitroUnlocks.animatedPfp){return 0;}}

            }else if (url_inf.includes("channel")){
                if (!usr.channelsCreated.includes(req.params.id)){return res.status(401).send("Unauthorized");}
                fldr_nm = "channels/picture/";
                if (!usr.nitroUnlocks.animatedChannels){return 0;}
                if (req.body.isBanner){ fldr_nm = "channels/banner/";}

            }else if (!req.body.hasOwnProperty("isBanner")){return 0;}

            else{
                next();
                return 0;
            }
            cloudinary.config({
                secure: true,
                cloud_name: process.env.CLOUD_NAME,
                api_key: process.env.CLOUD_API_KEY,
                api_secret: process.env.CLOUD_API_SECRET
            });

            const parser : any = new DatauriParser();
            parser.format('.gif', req.file.buffer.buffer);
            const result = await cloudinary.uploader.upload(parser.content, {
               folder: 'nitrochat/' + fldr_nm,
               resource_type: 'image',
               quality: "auto",
               flags: "lossy"
            });
            req.body.newFilename = result.secure_url;
            next();
        }catch (error){
            // console.log(error);
            // console.error(error);
            return res.status(401).send("Unauthorized");
        }
    }else{
        next();
    }
};