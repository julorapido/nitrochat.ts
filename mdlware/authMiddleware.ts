import { Request, Response, NextFunction} from "express";
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const ObjectID = require("mongoose").Types.ObjectId;
const validator = require('validator');

module.exports.onLogCheck = async (req : Request, res : Response, next : NextFunction) => {
    try{
        const tkn_ = req.body.authorization;
        const ath_id = req.body.authentification;

        if (!tkn_ || !ath_id){return res.status(400).send("Unauthorized");}
        if( !ObjectID.isValid(req.body.authentification)  ||  !validator.isJWT(tkn_) || (Object.keys(req.body).length > 2) ){
            return res.status(400).send("Unauthorized");
        }

        const decodedToken =(jwt.verify(tkn_, process.env.TOKEN_SECRET));
        let user = await UserModel.findById(decodedToken.userId).select("authentified");
        
        if (user._id == ath_id){
           return res.status(200).send('Authentified');
        }
    }catch(er_){
        console.log(er_);
        return res.status(400).send("Unathorized");
    }

}

module.exports.checkToken = async (req : Request, res : Response, next : NextFunction) => {
        try{
            const tkn_ = req.headers.authorization;
            const th_id = req.headers.authentification;
            // if (req.originalUrl.split('/').includes("graphql")){
              //  console.log(req.originalUrl);
              //  console.log(req.args);
            // }
            if (!tkn_ || !th_id){return res.status(400).send("Unauthorized");}

            if( !ObjectID.isValid(req.headers.authentification)  ||  !validator.isJWT(tkn_) || (Object.keys(req.body).length > 30) ){
                return res.status(400).send("Unauthorized");
            }

            const dcd_tkn_ =(jwt.verify(tkn_, process.env.TOKEN_SECRET));
            let user = await UserModel.findById(dcd_tkn_.userId).select("authentified");
            
            if (user._id == th_id){
                next();
            }
        }catch(er_){
            console.log(er_);
            return res.status(400).send("Unauthorized");
        }

}
