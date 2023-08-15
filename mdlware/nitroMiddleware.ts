import { Request, Response, NextFunction} from "express";
const UserModel = require('../models/userModel');
const ObjectID = require("mongoose").Types.ObjectId;

type ntr = {
    value : number | null,
    user_id : string,
}
module.exports.nitroIntercation = async (nitroObj : ntr) => {
    if(!ObjectID.isValid(nitroObj.user_id)){
        return 'Unauthorized'
    }
    nitroObj.value = Math.ceil(<number>(nitroObj).value);
    nitroObj.value = nitroObj.value * 12;
    const o = await UserModel.findByIdAndUpdate(nitroObj.user_id, {
        $inc: {
            nitro : nitroObj.value,
            interactions: 1
        }
    });
}