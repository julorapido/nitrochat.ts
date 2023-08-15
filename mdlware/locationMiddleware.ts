import { Request, Response, NextFunction} from "express";
var geoip = require('geoip-lite');
const UserModel = require('../models/userModel');
const ObjectID = require("mongoose").Types.ObjectId;
const address = require('address');

module.exports.setUserLocation = async (userIp : string, userId : string) => {

    var geo : any = geoip.lookup(userIp);
    if (userIp == "::1"){
        geo = geoip.lookup("90.27.209.236");
    }

    try{
        const e = await UserModel.findByIdAndUpdate(userId,{
            $set: {
                city: geo.city,
                country: geo.country
            }
        })
    }catch(err){
        return(err)
    }
    console.log(geo);
}