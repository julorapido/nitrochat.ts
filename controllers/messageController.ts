const ObjectID = require("mongoose").Types.ObjectId;
const UserModel = require('../models/userModel');
const DmModel = require('../models/dmModel');
const nitroMiddleware : any = require('../middleware/nitroMiddleware');
import { Request, Response, NextFunction } from 'express';
import {usr} from '../types/usrType';
import {msg, msg_sn} from '../types/dmType';
// import {ntf} from '../types/ntfType';
// import {chn} from '../types/chnTypes';
// import {pst} from '../types/pstType';

const areUsersBlocked = async (user1 : string | string[] | undefined, user2 : string | string[] | undefined) => {
    const usr1 : usr = await UserModel.findById(user1).select('blockedUsers');
    const usr2 : usr = await UserModel.findById(user2).select('blockedUsers');
    if (usr1.blockedUsers.includes(user2 as string) || usr2.blockedUsers.includes((user1 as string))){
        return true;
    }else{
        return false;
    }
};

module.exports.initiateMessage = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id) && !ObjectID.isValid(req.body.userId) )
            return res.status(403).errored
    try{
        const cancel : boolean = await areUsersBlocked(req.headers.authentification, req.body.userId);
        let w = req.header as {header : { authentification: String}};
        if ( (req.body.userId === ((w.header.authentification))) || (cancel)){
            return res.status(403).send("unauthorized")
        }
        const dmAlrOp_: msg[] =  await DmModel.find({usersIds: [req.headers.authentification, req.body.userId]});
        const dmAlrOp_2: msg[] =  await DmModel.find({usersIds: [ req.body.userId ,req.headers.authentification]});
        
        if (dmAlrOp_.length == 0 && dmAlrOp_2.length == 0){
            //
            nitroMiddleware.nitroIntercation({
                user_id : req.headers.authentification,
                value  : 36
            });
            //
            const newDmThread = new DmModel({
                usersIds: [req.headers.authentification,req.body.userId],
                messages: [],
                seenState: [{
                    userId : req.headers.authentification,
                    seen: true,
                    unseenMessages: 0
                },{
                    userId : req.body.userId,
                    seen: true,
                    unseenMessages: 0
                }],
            });
            const dmSave: msg = await newDmThread.save();
            return res.status(200).send(dmSave._id);
        }else{
            var id : string | undefined = dmAlrOp_[0]._id;
            if (dmAlrOp_2.length > 0 ){id = dmAlrOp_2[0]._id}
            return res.status(201).send(id);
        }
    }catch(err){
        return res.status(401).send("Unauthorized");
    }
}

module.exports.userDms =  async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id) )
            return res.status(403).errored
    try{
        const usrs_dmFtch : msg[] = await DmModel.find({ usersIds : req.headers.authentification} );
        let w = req.header as {header : { authentification: String}};
        var e : {lastMessage: any[];
                user: any;
            }[] = await Promise.all(usrs_dmFtch.map(async (eachDm : msg) => { 
            var i2 = 1;
            if (eachDm.usersIds.indexOf(w.header.authentification as never) == 1){
                i2 = 0;
            }
            const usrD_ = await UserModel.findById(eachDm.usersIds[i2]).select('id').select('imageUrl').select('nom').select('prenom').select('pseudo').select('followers')
            .select('followers_Ids').select('followings').select('postsCount').select("verified")
            .select('createdAt').select('reports').select('nitroBadge').select('mediumBadge');
            const seenValue =  eachDm.seenState.find((seenObj : any) => seenObj.userId === req.headers.authentification);
            if (eachDm.messages.length > 0){
                 return {
                    lastMessage: [eachDm._id, eachDm.messages[eachDm.messages.length - 1], seenValue],
                    user: usrD_
                }            
            }
            return {
                lastMessage: [eachDm._id],
                user: usrD_
            }
        }));
        e = await Promise.all(e.sort(function(a, b) {return a.lastMessage[1]?.timestamp - b.lastMessage[1]?.timestamp}));
        e = await Promise.all(e.sort(function(a, b) {
            if (!a?.lastMessage[2]?.seen && b?.lastMessage[2]?.seen) {return 1;}
            if (a?.lastMessage[2]?.seen && !b?.lastMessage[2]?.seen) {return -1;}
            return 0;
        }));
        e = await Promise.all(e.sort(function(a, b) {
            if (a?.lastMessage?.length > 1) {return 1;}
            else{return - 1;}
            return 0;
        }));
        e = e.reverse();
        return res.status(201).send(e);
    }catch(err){
        return res.status(401).send("Unauthorized");
    }
}

module.exports.getUnseenMessages =  async(req : Request, res : Response) => {
    if(!ObjectID.isValid(req.params.id) )
            return res.status(403).errored
    try{
        const usrsDm_f : msg[] = await DmModel.find({ usersIds : req.headers.authentification} ).select('seenState');
        var unseenCount = 0;
        const e : void[] = await Promise.all(usrsDm_f.map(async (eDm : msg) => { 
            const seenIndex =  eDm.seenState.findIndex(seen_ => seen_.userId === req.headers.authentification);
            if (eDm.seenState[seenIndex].seen == false){unseenCount ++;}
        }));
        return res.status(201).send(unseenCount.toString());
    }catch(err){
        return res.status(401).send("Unauthorized");
    }
}

module.exports.specificDM =  async(req : Request, res : Response) => {
    if(!ObjectID.isValid(req.params.id) )
            return res.status(403).errored
    try{
        const fetchedWholeDm = await DmModel.findById(req.params.id);
        if (!fetchedWholeDm.usersIds.includes(req.headers.authentification)){
            return res.status(403).send('Unauthorized');
        }
        const seen_u : msg_sn[]= fetchedWholeDm.seenState;
        const updSn_ : number = seen_u.findIndex((seen_o : msg_sn) => seen_o.userId === (req.headers.authentification) );
        seen_u[updSn_].seen = true;
        seen_u[updSn_].unseenMessages = 0;
        const seen: msg = await DmModel.findByIdAndUpdate(req.params.id,{
            $set:{
                seenState : seen_u 
            }
        });
        return res.status(201).send(fetchedWholeDm);
    }catch(err){
        return res.status(401).send("Unauthorized");
    }
}



module.exports.sendMessage =  async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id) )
            return res.status(403).send('Unauthorized')
    try{
        const dm_U : msg = await DmModel.findById(req.params.id).select('usersIds').select('seenState');
        let w = req.header as {header : { authentification: String}};
        if (!dm_U.usersIds.includes(req.headers.authentification as never)){
            return res.status(403).send('Unauthorized');
        }
        var user_seen_indx : number  = dm_U.usersIds.indexOf(req.headers.authentification as never);
        //
        const senderIndx : number = dm_U.seenState.findIndex(seenObj => seenObj.userId === dm_U.usersIds[user_seen_indx]);
        dm_U.seenState[senderIndx].seen = true; dm_U.seenState[senderIndx].unseenMessages = 0;   
        //
        const cancel = await areUsersBlocked(dm_U.usersIds[0], dm_U.usersIds[1]);
        if (cancel){return res.status(400).send('Users Blocked')}
        if (user_seen_indx === 1){
            user_seen_indx = user_seen_indx - 1
        }else{
            user_seen_indx = user_seen_indx + 1
        }
        //
        nitroMiddleware.nitroIntercation({
            user_id : req.headers.authentification,
            value  : 1
        });
        //
        const idx : number = dm_U.seenState.findIndex(seen_o => seen_o.userId === dm_U.usersIds[user_seen_indx]);
        dm_U.seenState[idx].seen = false;    
        dm_U.seenState[idx].unseenMessages += 1;    
        const re : msg = await DmModel.findByIdAndUpdate(
            req.params.id,
            {
                $push: {
                    messages: {
                        userId: req.headers.authentification,
                        content: req.body.content,
                        timestamp: new Date().getTime()
                    },
                },
                $set: {
                    seenState: dm_U.seenState
                },
                $inc: {
                    length: 1,
                }
            },

        )
        return re;
    }catch(err){
        return res.status(401).send("Unauthorized");
    }
}

module.exports.pinConversation =  async(req : Request, res : Response) => {
    if(!ObjectID.isValid(req.params.id) )
            return res.status(403).errored
    try{
        const usr_ : usr = await UserModel.findById(req.headers.authentification).select('pinnedConversations');
        const ix : number = usr_.pinnedConversations.findIndex((i : string) => i === req.params.id);
        if (ix === -1){
            usr_.pinnedConversations.push(req.params.id);
            await UserModel.findByIdAndUpdate(req.headers.authentification, {
                $push: {
                    pinnedConversations: req.params.id
                }
            })
        }else{
            usr_.pinnedConversations.splice(ix, ix + 1);
            await UserModel.findByIdAndUpdate(req.headers.authentification, {
                $set: {
                    pinnedConversations: usr_.pinnedConversations
                }
            }) 
        }
        return res.status(201).send(usr_.pinnedConversations);
    }catch(err){
        return res.status(401).send("Unauthorized");        
    }
}