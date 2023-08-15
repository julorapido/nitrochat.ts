const ObjectID = require("mongoose").Types.ObjectId;
const UserModel = require('../models/userModel');
const ChannelModel = require('../models/chnlModel');
const fs = require('fs');
const serverController = require('../server');
var validator = require('validator');
var BadWords = require('bad-words');
const frenchBadwords = require('french-badwords-list');
const nitroMiddleware = require('../middleware/nitroMiddleware');
const notificationMiddleware = require('../middleware/notificationMiddleware');
import { Request, Response, NextFunction } from 'express';
import {usr} from '../types/usrType';
// import {msg, msg_sn} from '../types/dmType';
// import {ntf} from '../types/ntfType';
import {chn} from '../types/chnTypes';
//import {pst} from '../types/pstType';

type get_roleT_ = {
    name: string,
    canViewRooms: boolean,
    canVocal : boolean, 
    canEditRoles: boolean,
    canEdit: boolean,
    canEditPictures: boolean,
    canFacecam : boolean, 
    canTextualChat: boolean,
    canKick: boolean,
    canPin: boolean,
    canBan: boolean,
    canInvite: boolean,
    color: string,
    timestamp: number
} | {
    userId: string;
    roles: string;
    timestamp: number;
} | undefined | {
    "canVocal": boolean,
    "canFacecam": boolean,
    "canTextualChat": boolean
};

type rl_ = {
    _id ?: string,  name: string;canViewRooms: boolean; canVocal: boolean;canEditRoles: boolean; canEdit: boolean;canEditPictures: boolean;
    canFacecam: boolean;canTextualChat: boolean;canKick: boolean; canPin: boolean;canBan: boolean;canInvite: boolean; color: string; timestamp: number;
};

type us_id = {
    userId : string, roles: string,
    timestamp: number
};

const channelDefaultPics = [process.env.PIC1, process.env.PIC2,
    process.env.PIC3, process.env.PIC4,
    process.env.PIC5, process.env.PIC6,
];
const channelDefaultBanners = [process.env.BN_PIC1, process.env.BN_PIC2,
    process.env.BN_PIC3, process.env.BN_PIC4,
    process.env.BN_PIC5, process.env.BN_PIC6, process.env.BN_PIC7, process.env.BN_PIC8, process.env.BN_PIC9];

const get_Role = async (user_Id : string, channelId : string) => {
        const chans_D: chn = await ChannelModel.findById(channelId).select("usersIds").select("channelRoles").select("generalChannel");
        if(chans_D.generalChannel){
            return {
                "canVocal": true,
                "canFacecam": true,
                "canTextualChat": true
            }
        }
        const get_User : string | {
            userId: string;
            roles: string;
            timestamp: number;
        } | undefined  = (<us_id[]>chans_D.usersIds).find((user : any) => user.userId === user_Id);
        const returnRole = chans_D.channelRoles.find((role : {name: String | "member", canViewRooms: Boolean,
            canVocal : Boolean,  canEditRoles: Boolean, canEdit: Boolean, canEditPictures: Boolean, canFacecam : Boolean,  canTextualChat: Boolean, canKick: Boolean, canPin: Boolean, canBan: Boolean,
            canInvite: Boolean, color: String | "#84a5bf", timestamp: Number
        }) => role.name === (get_User as {
            userId: string;
            roles: string;
            timestamp: number;
        })?.roles);
        return(returnRole)
};

const bot_Message = async (messageType : string,messageContent : string, channelId : string) => {
    try{
        const re: chn = await ChannelModel.findByIdAndUpdate(
                channelId,
                {
                    $push: {
                        messages: {
                            userId: messageType,
                            content: messageContent,
                            timestamp: new Date().getTime()
                        },
                    },
    
                    $inc: {
                        length: 1,
                    }
                },
    
            )
        return 0;
    }catch(err){
        return err;
    }
};

module.exports.GetRoleJoinCall = async(us : string, id : string) => {
    const o : get_roleT_ = await get_Role(us, id);
    return o;
}

module.exports.PostBotMessage = async(a : string, e: string, i:string) => {
    const p : unknown = await bot_Message(a, e, i);
    return p;
}


module.exports.homeDiscover = async(req : Request | any, res : Response) => {
    if( (Object.keys(req.body).length > 0) || req.file)
        return res.status(401).send('Unauthorized')

    try{
        type chn_ = chn & {_doc ?: chn[]};
        var chn_Dt : chn_[] = await ChannelModel.find().select('usersIds').select('generalChannel').select('channelBanner').select('channelPicture').select('channelName').select('channelDescription').select('private');
        for (let i = 0; i < chn_Dt.length; i ++){
            var l  = (chn_Dt[i]?.usersIds as string[]).length; var o = {...chn_Dt[i]._doc};
            (o[0] as chn_).usersIds = l;
            chn_Dt[i] = o[0];
        }

        return res.status(200).send(chn_Dt);
    }catch(err){
        return res.status(401).send('Unauthorized');

    }
}


module.exports.initiateChanel = async(req : Request | any, res : Response)  => {
    if(!ObjectID.isValid(req.body.userId)  || (req.body.userId !== req.headers.authentification) || (req.body.channelName.length > 32 || req.body.channelName.length < 3))
        return res.status(403).errored
    
    try{
        const usrCnt_ : usr = await UserModel.findById(req.headers.authentification).select('channelsCount').select('nom').select('prenom');
        if (usrCnt_.channelsCount <= 9){
            var newChannel = new ChannelModel();
            var imageStr : string  = '';
            
            if (req.file){
                imageStr = req.body.newFilename;
            }else{
                const randPics =  Math.floor(Math.random() * channelDefaultPics.length);
                imageStr = channelDefaultPics[randPics] as string;
            }
    
            const rnd_bnr : number =  Math.floor(Math.random() * channelDefaultBanners.length);
            newChannel = new ChannelModel({
                channelName: req.body.channelName,
                usersIds: [{
                   userId : req.headers.authentification,
                   roles: "admin",
                   timestamp: new Date().getTime()
                }],
                channelPicture: imageStr,
                channelBanner: channelDefaultBanners[rnd_bnr],
                channelDescription: "The Official " +  usrCnt_.nom + " " + usrCnt_.prenom + " Nitrochat Server! Join to interact and chat with his community.",
                messages: [],
            });
            //
            nitroMiddleware.nitroIntercation({
                user_id : req.headers.authentification,
                value  : 74
            });
            //
            const channelSave : chn = await newChannel.save();
            await UserModel.findByIdAndUpdate(req.headers.authentification, {
                $inc: {
                    channelsCount: 1,
                },
                $push: {
                    channelsCreated: channelSave._id
                }
            });
            return res.status(200).send(channelSave);
        }
        return res.status(203).send("Maxed Channels slots creation");
    }catch(err){
        console.log(err);
        return res.status(401).send(err);
    }
}

module.exports.getAvailableChannels = async(req : Request | any, res : Response)  => {
    if(!ObjectID.isValid(req.params.id)  || req.params.id !== req.headers.authentification)
            return res.status(403).errored
    
        try{
            const gn_c : chn[] = await ChannelModel.find({generalChannel: true}).select('channelName').select('length').select('channelPicture').select('generalChannel');
            const pv_c : chn[] = await ChannelModel.find({'usersIds': {$elemMatch: {userId: req.headers.authentification}}}).select('channelName').select('length').select('channelPicture').select('generalChannel');
            const _cmbnd: chn[] = pv_c.concat(gn_c);
            return res.status(201).send(_cmbnd);
        }catch(err){
            return res.status(400).send("Unauthorized");
        }

}


module.exports.getChannel = async(req : Request | any, res : Response)  => {
    //console.log(req.params.id);
    if(!ObjectID.isValid(req.params.id)  || !ObjectID.isValid(req.body.userId) || (req.body.userId !== req.headers.authentification))
            return res.status(403).errored
    
    const slctd_chnlIds : chn = await ChannelModel.findById(req.params.id).select('usersIds').select('generalChannel');

    const isIn: (true | undefined)[] = await Promise.all((<{userId: string;roles: string;timestamp: number;}[]>slctd_chnlIds?.usersIds).map((id_: {userId :string}) => {
        if (id_.userId == req.headers.authentification){
            return(true);
        }
    }));
    if (slctd_chnlIds.generalChannel == true || isIn.includes(true) == true){
        try{
            const slct_ : chn = await ChannelModel.findById(req.params.id);
            return res.status(201).send(slct_); 
        }catch(err){
            throw err;
        }
    }else{
        return res.status(400).send("UnAuthorized");
    }

}

module.exports.discover = async(req : Request, res : Response) => {
    // .log(req.params.id);
    try{
        const chnls_dt = await ChannelModel.find().select('usersIds').select('bannedUsers').select('generalChannel').select('channelBanner').select('channelPicture').select('createdAt').select('channelName').select('channelDescription').select('private');
        return res.status(200).send(chnls_dt);
    }catch(err){
        return res.status(400).send("Unauthorized");
    }
}

module.exports.joinChannel =  async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.body.userId) || !ObjectID.isValid(req.params.id) )
        return res.status(403).errored

    const chnl_if  = await ChannelModel.findById(req.params.id).select('private').select('usersIds').select('generalChannel').select('bannedUsers');
    const alr_i = chnl_if.usersIds.findIndex((usrId : {userId: string}) => { if (usrId.userId === req.body.userId){return true;} });

    if ( (alr_i !== -1)  || (chnl_if.private === true)  || (chnl_if.generalChannel === true) || (chnl_if.bannedUsers.includes(req.body.userId))){
        return res.status(400).send("UnAuthorized");
    }
    try{
        //
        nitroMiddleware.nitroIntercation({
            user_id : req.headers.authentification,
            value  : 34
        });
        //
        await ChannelModel.findByIdAndUpdate(req.params.id, {
                $push: {
                    usersIds: {
                        userId: req.body.userId,
                        roles: "member",
                        timestamp: new Date().getTime()
                },
        }});
        await bot_Message("join" + " " + req.body.userId,"has joined the channel" ,req.params.id);
        serverController.liveBotMessages("has joined the channel",req.params.id,"join" + " " + req.body.userId);
        serverController.liveUsersUpdate(req.params.id);
        return res.status(200).send("joined");
    }catch(err){
        return res.status(400).send("Unauthorized");
    }
}


module.exports.invite = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id) )
        return res.status(403).errored

    await Promise.all(req.body.usersList.map((user : string, index : number) => {
        if(!ObjectID.isValid(user))
            return res.status(403).errored
    }));
    const usr_R : get_roleT_ = await get_Role(req.headers.authentification, req.params.id);
    const chn_i  = await ChannelModel.findById(req.params.id).select('usersIds').select('generalChannel').select('bannedUsers');
    const newUsers = chn_i.usersIds;

    if (!(<{ name: string; canViewRooms: boolean; canVocal: boolean; canEditRoles: boolean; canEdit: boolean; canEditPictures: boolean; canFacecam: boolean; canTextualChat: boolean; canKick: boolean;
        canPin: boolean; canBan: boolean; canInvite: boolean; color: string; timestamp: number;
 }>usr_R)?.canInvite || chn_i.generalChannel){
        return res.status(401).send("Unauthorized");    
    }
    await Promise.all(req.body.usersList.map(async (user : string, index : number) => {
        const alr_i = newUsers.findIndex((usrId : { userId : string}) => { if (usrId.userId === user){return true;} });
        if (alr_i === -1 &&  (!chn_i.bannedUsers.includes(user) )){
            newUsers.push({
                userId: user,
                roles: "member",
                timestamp: new Date().getTime()
            });
            notificationMiddleware.sendNotification({
                type: "ChannelInvite",
                sendTo : user,
                emitterId: req.headers.authentification,
                postId : chn_i._id,
                postDescription : ""
            });
            await bot_Message("invite" + " " + user,"has been invited in the channel" ,req.params.id);
            serverController.liveBotMessages("has been invited in the channel",req.params.id,"invite" + " " + user);
        }
    }));
    try{
        //
        nitroMiddleware.nitroIntercation({
            user_id : req.headers.authentification,
            value  : req.body.usersList.length * 3
        });
        //
        await ChannelModel.findByIdAndUpdate(req.params.id, {
            $set: {
                usersIds: newUsers,
            }
        });
        serverController.liveUsersUpdate(req.params.id);
        return res.status(200).send("Users Invited"); 
    }catch(err){
        return res.status(400).send("Unauthorized");
    }
}

module.exports.getFriendsInvites = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id) )
        return res.status(403).errored
    
    try{
        const re_A : usr[] = [];
        const userFriends  = await UserModel.findById(req.params.id).select('followings_Ids');
        await Promise.all(userFriends.followings_Ids.map(async (friend : string, index : number) => {
            const pushUser:usr  = await UserModel.findById(friend).select('id').select('imageUrl').select('nom').select('prenom').select('pseudo');
            re_A.push(pushUser);
        }));
       
        return res.status(200).send(re_A);
    }catch(err){
        return res.status(400).send("Unauthorized");
    }
}

module.exports.sendMessage = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id) || !ObjectID.isValid(req.headers.authentification) || !req.body.content)
            return res.status(403).errored

    try{
        var c_f = new BadWords({ placeHolder: '*'});
        c_f.addWords(...frenchBadwords.array);
        const filtered = c_f.clean(req.body.content);
        //
        nitroMiddleware.nitroIntercation({
            user_id : req.headers.authentification,
            value  : 1
        });
        //
        if (req.body.content.length > 0){
            const re = await ChannelModel.findByIdAndUpdate(
                req.params.id,
                {
                    $push: {
                        messages: {
                            userId: req.headers.authentification,
                            content: filtered,
                            timestamp: new Date().getTime()
                        },
                    },
    
                    $inc: {
                        length: 1,
                    }
                },
    
            )
            return res.status(200).send(req.body.content);
        }else{
            return res.status(400).send("Unauthorized");
        }
    }catch(er_){
        console.log(er_);
        return res.status(400).send("Unauthorized");
    }
}

module.exports.editChannelBannerPicture = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id))
        return res.status(403).errored

    const userRole : get_roleT_ = await get_Role(req.headers.authentification, req.params.id);

    if (!req.file || !(<{name: string;canViewRooms: boolean;canVocal: boolean;canEditRoles: boolean;
        canEdit: boolean;
        canEditPictures: boolean;
        canFacecam: boolean;
        canTextualChat: boolean;
        canKick: boolean;
        canPin: boolean;
        canBan: boolean;
        canInvite: boolean;
        color: string;
        timestamp: number;
    }>userRole).canEditPictures){
        return res.status(401).send("Unauthorized");    
    }else {
        const chns_d = await ChannelModel.findById(req.params.id).select('channelPicture').select('channelBanner').select('generalChannel');
        
        if(chns_d.generalChannel){  return res.status(401).send("Unauthorized");};

        // if (req.body.isBanner){
        //         const filename = ChannelData.channelBanner.split('/uploads/channels/channelBanners/')[1];
        //         if (channelDefaultBanners.includes(ChannelData.channelPicture) === false){
        //             fs.unlink(`uploads/channels/channelBanners/${filename}`, (err => {if (err) console.log(err)}));
        //         }

        // }else{
        //         const filename = ChannelData.channelPicture.split('/uploads/channels/channelPictures/')[1];
        //         if (channelDefaultPics.includes(ChannelData.channelPicture) === false){
        //             fs.unlink(`uploads/channels/channelPictures/${filename}`, (err => {if (err) console.log(err)}));
        //         } 
        // }
        }
        try{
            nitroMiddleware.nitroIntercation({
                user_id : req.headers.authentification,
                value  : 10
            });
            const new_u = req.body.newFilename;
            if (!new_u){return res.status(401).send("Unauthorized");}
            if (req.body.isBanner){            
                const upd_c : chn  = await ChannelModel.findByIdAndUpdate(req.params.id, { $set: {
                    channelBanner: new_u,
                }});
                await bot_Message("banner" + " " + req.headers.authentification ,"has changed channel banner" ,req.params.id);
                return res.status(201).json(new_u);
            }else{
                const upd_c : chn = await ChannelModel.findByIdAndUpdate(req.params.id, { $set: {
                    channelPicture: new_u,
                }});
                await bot_Message("picture" + " " + req.headers.authentification,"has changed channel picture" ,req.params.id);
                return res.status(201).json(new_u);
            }
        }catch(err){
            return res.status(401).send("Unauthorized");
        }
}

module.exports.editChannelInformations = async(req : Request | any, res : Response)  => {
    if(!ObjectID.isValid(req.params.id))
        return res.status(403).errored

    const userRole = await get_Role(req.headers.authentification, req.params.id);
    
    if (!(userRole as {name: string;canViewRooms: boolean;canVocal: boolean;canEditRoles: boolean; canEdit: boolean;
        canEditPictures: boolean; canFacecam: boolean; canTextualChat: boolean;
        canKick: boolean; canPin: boolean; canBan: boolean;
        canInvite: boolean; color: string; timestamp: number}).canEdit){
        return res.status(401).send("Unauthorized");    
    }
    try{
        nitroMiddleware.nitroIntercation({
            user_id : req.headers.authentification,
            value  : 5
        });
        var c_f : any = new BadWords({ placeHolder: '*'});
        c_f.addWords(...frenchBadwords.array);
        const f_ = c_f.clean(req.body.channelName);
        const f_c = c_f.clean(req.body.channelDescription);

        await ChannelModel.findByIdAndUpdate(req.params.id , {
            $set: {
                channelName: f_,
                channelDescription: f_c,
                private: req.body.channelPrivate,
            }
         });  
        return res.status(200).send('User modified');
    } catch(err){
        return res.status(401).send("Unauthorized");
    }
}


module.exports.createRole = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id))
        return res.status(403).errored

    const userR_R : get_roleT_ = await get_Role(req.headers.authentification, req.params.id);
    if (!(<{
        name: string;
        canViewRooms: boolean;
        canVocal: boolean;
        canEditRoles: boolean;
        canEdit: boolean;
        canEditPictures: boolean;
        canFacecam: boolean;
        canTextualChat: boolean;
        canKick: boolean;
        canPin: boolean;
        canBan: boolean;
        canInvite: boolean;
        color: string;
        timestamp: number;
    } >userR_R).canEditRoles){
        return res.status(401).send("Unauthorized");    
    }
    const sl_c = await ChannelModel.findById(req.params.id).select('generalChannel').select('channelRoles');
    if (sl_c.generalChannel === true ){return res.status(401).send("Unauthorized");}

    const role_Name = "New Member Role" + ( (sl_c.channelRoles.length - 2) + 1);
    try{
        nitroMiddleware.nitroIntercation({
            user_id : req.headers.authentification,
            value  : 20
        });
        await ChannelModel.findByIdAndUpdate(req.params.id, {
            $push: {
                channelRoles: {
                    name:  role_Name,
                    canViewRooms:  true,
                    canVocal :  false,
                    canEditRoles: false,
                    canEdit: false,
                    canEditPictures: false,
                    canFacecam : false,
                    canTextualChat:  true,
                    canKick: false,
                    canBan: false,
                    canInvite:  false,
                    color: "#84a5bf",
                    timestamp: new Date().getTime()
                }
            }
        });
        return res.status(201).send('Role Created');
    }catch(err){
        return res.status(401).send("Unauthorized");
    }
}


module.exports.modifyRole = async(req : Request | any, res : Response) => {
    //console.log(req.params.id);
    if(!ObjectID.isValid(req.params.id)  && !ObjectID.isValid(req.body.roleData._id) )
            return res.status(403).errored

    type rl_ = {
        _id ?: string,  name: string;canViewRooms: boolean; canVocal: boolean;canEditRoles: boolean; canEdit: boolean;canEditPictures: boolean;
        canFacecam: boolean;canTextualChat: boolean;canKick: boolean; canPin: boolean;canBan: boolean;canInvite: boolean; color: string; timestamp: number;
    };

    type us_id = {
            userId : string, roles: string,
            timestamp: number
    };
    const usr_R = await get_Role(req.headers.authentification, req.params.id);

    if (!(<rl_>usr_R).canEditRoles || req.body.roleData.name.length > 28 || req.body.roleData.name.toLowerCase() === "admin"){
        return res.status(401).send("Unauthorized");
    }
    const sl_C : chn = await ChannelModel.findById(req.params.id).select('usersIds').select('generalChannel').select('channelRoles');
    const r_i : number = (sl_C.channelRoles.findIndex((r_ : rl_) => (r_._id == req.body.roleData._id) ));
    const alr_i : number = (sl_C.channelRoles.findIndex((r_ : rl_) => (r_.name == req.body.roleData.name) ));
    const new_R : rl_[] = sl_C.channelRoles;
    if (new_R[r_i].name === "admin" || (alr_i !== -1 &&  new_R[r_i].name !== req.body.roleData.name) || !validator.isHexColor(req.body.roleData.color)){
        return res.status(401).send("Unauthorized");    
    }
    if((new_R[r_i].name === "member")){
        req.body.roleData.name = "member";
    }
    
    const prev_R : rl_ = new_R[r_i];
    new_R[r_i] = req.body.roleData;
    try{
        nitroMiddleware.nitroIntercation({
            user_id : req.headers.authentification,
            value  : 15
        });
        if (prev_R.name !== "member"){
            const new_u_r : us_id[] = [];
            await Promise.all((<Array<us_id>>sl_C.usersIds).map((_usr_ : us_id, index : number) => {
                if (_usr_.roles === prev_R.name){
                    _usr_.roles = req.body.roleData.name;
                }
                new_u_r.push(_usr_);
            }));
            await ChannelModel.findByIdAndUpdate(req.params.id, {
                $set: {
                    channelRoles: new_R,
                    usersIds: new_u_r
                }
            });
            return res.status(201).send('Role modified');
        }
        return res.status(401).send("Unauthorized");    
    }catch(err){
        return res.status(401).send("Unauthorized");
    }

}

module.exports.assignRole = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id) || req.body.roleToAdd === "admin" || !(typeof req.body.roleToAdd === "string"))
            return res.status(403).send('Unauthorized');
    
    const usr_r : get_roleT_ = await get_Role(req.headers.authentification, req.params.id);
    const slc_c = await ChannelModel.findById(req.params.id).select('usersIds').select('generalChannel').select('channelRoles');

    if (req.body.userToAdds.includes(req.headers.authentification) || !(<{_id ?: string,  name: string;canViewRooms: boolean; canVocal: boolean;canEditRoles: boolean; canEdit: boolean;canEditPictures: boolean;
        canFacecam: boolean;canTextualChat: boolean;canKick: boolean; canPin: boolean;canBan: boolean;canInvite: boolean; color: string; timestamp: number;}>usr_r)
    .canEditRoles || slc_c.generalChannel){
        return res.status(401).send("Unauthorized");
    }

    type us_id = {
        userId : string, roles: string,
        timestamp: number
    };
    var role_d : rl_ | string[] = slc_c.channelRoles.find((rol : rl_) => rol.name === req.body.roleToAdd);
    const m_role_d : rl_ = role_d as rl_;
    role_d = [m_role_d["name"], m_role_d['color'] ];
    
    try{
        nitroMiddleware.nitroIntercation({
            user_id : req.headers.authentification,
            value  : 12
        });
        const atr_b: us_id[] = [];
        await Promise.all(slc_c.usersIds.map(async (user : us_id, index : number) => {
            if (req.body.userToAdds.includes(user.userId) && user.roles !== "admin"){
                if (user.roles === req.body.roleToAdd){
                    user.roles = "member";
                    notificationMiddleware.sendNotification({
                        type: "RoleDestitution",
                        sendTo : user.userId,
                        emitterId: req.headers.authentification,
                        postId : slc_c._id,
                        postDescription : ""
                    });
                }else{
                    user.roles = req.body.roleToAdd;
                    notificationMiddleware.sendNotification({
                        type: "RoleAttribution",
                        sendTo : user.userId,
                        emitterId: req.headers.authentification,
                        postId : slc_c._id,
                        postDescription : m_role_d["name"] + " " + m_role_d["color"]
                    });
                }
            }
            
            atr_b.push(user);
        }));
        await ChannelModel.findByIdAndUpdate(req.params.id, {
            $set: {
                usersIds: atr_b
            }
        });
        return res.status(201).send('Role Assigned');
    }catch(err){
        return res.status(401).send("Unauthorized");
    }

}


module.exports.pinMessage = async(req : Request | any, res : Response)  => {
    if(!ObjectID.isValid(req.params.id) || !ObjectID.isValid(req.body.messageId) )
            return res.status(403).errored
    
    const usr_R : get_roleT_ = await get_Role(req.headers.authentification, req.params.id);
    const slc_ : chn = await ChannelModel.findById(req.params.id).select('generalChannel').select('pinnedMessages');

    if (!(<{
        name: string;
        canViewRooms: boolean;
        canVocal: boolean;
        canEditRoles: boolean;
        canEdit: boolean;
        canEditPictures: boolean;
        canFacecam: boolean;
        canTextualChat: boolean;
        canKick: boolean;
        canPin: boolean;
        canBan: boolean;
        canInvite: boolean;
        color: string;
        timestamp: number;
    } >usr_R).canPin || slc_.generalChannel){
        return res.status(401).send("Unauthorized");    
    }
    const nw_p : string[] =  slc_.pinnedMessages;
    const ix_ : number = nw_p.findIndex((pn_ : string) => pn_ === req.body.messageId);
    if (ix_ === -1){
        nw_p.push(req.body.messageId);
    }else{
        nw_p.splice(ix_, 1);
    }
    try{
        await ChannelModel.findByIdAndUpdate(req.params.id, {
            $set: {
                pinnedMessages: nw_p
            }
        });
        return res.status(201).send('Message Pined');
    }catch(err){
        return res.status(401).send(err);
    }

}

module.exports.kickMember = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id) || !ObjectID.isValid(req.body.memberId) )
            return res.status(403).errored
    
    const us_r : get_roleT_ = await get_Role(req.headers.authentification, req.params.id);
    const slc_c : chn = await ChannelModel.findById(req.params.id).select('usersIds').select('generalChannel');
    const kckd_r : get_roleT_ = await get_Role(req.body.memberId, req.params.id);
    
   
    if (!(<rl_>us_r)?.canKick || slc_c.generalChannel  || (<rl_>kckd_r)?.name === "admin" || (req.headers.authentification === req.body.memberId) ){
        return res.status(401).send("Unauthorized");    
    }
    try{
        nitroMiddleware.nitroIntercation({
            user_id : req.headers.authentification,
            value  : 20
        });
        type l_ = Array<{
            userId: string;
            roles: string;
            timestamp: number;
        }>;
        var new_u : l_ = slc_c.usersIds as l_;  
        const us_i = new_u.findIndex(u => u.userId === req.body.memberId);
        if (us_i !== -1){
            new_u.splice(us_i, 1);
        }
        await ChannelModel.findByIdAndUpdate(req.params.id, {
            $set: {
                usersIds: new_u,
            }
        });
        await bot_Message("kick" + " " + req.body.memberId,"has been banned from this channel" ,req.params.id);
        serverController.liveBotMessages("has been kicked from this channel", req.params.id, "kick" + " " + req.body.memberId);
        serverController.liveUsersUpdate(req.params.id);
        serverController.punishSound(req.params.id, 2);
        return res.status(201).send('User ' +  req.body.memberId + ' Kicked');
    }catch(err){
        return res.status(401).send("Unauthorized");
    }

}
module.exports.banMember = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id) || !ObjectID.isValid(req.body.memberId) )
            return res.status(403).errored
    

    const us_r : rl_ = <rl_>(await get_Role(req.headers.authentification, req.params.id));
    const selectedChannel = await ChannelModel.findById(req.params.id).select('usersIds').select('generalChannel').select('bannedUsers');
    const bn_R : rl_ = <rl_>(await get_Role(req.body.memberId, req.params.id));
    
    if (!us_r.canBan || selectedChannel.generalChannel  || bn_R.name === "admin" || (req.headers.authentification === req.body.memberId) ||  selectedChannel.bannedUsers.includes(req.body.memberId)){
        return res.status(401).send("Unauthorized");    
    }
    try{
        nitroMiddleware.nitroIntercation({
            user_id : req.headers.authentification,
            value  : 31
        });
        const new_ar : string[] = selectedChannel.bannedUsers;  
        var ne_u = selectedChannel.usersIds;  
        const us_ix : number = ne_u.findIndex((user : {userId : string}) => user.userId === req.body.memberId);
        new_ar.push(req.body.memberId);
        if (us_ix !== -1){
            ne_u.splice(us_ix, 1);
        }
        await ChannelModel.findByIdAndUpdate(req.params.id, {
            $set: {
                usersIds: ne_u,
                bannedUsers: new_ar
            }
        });
        await bot_Message("ban" + " " + req.body.memberId,"has been banned from this channel" ,req.params.id);
        serverController.liveBotMessages("has been banned from this channel",req.params.id,"ban" + " " + req.body.memberId);
        serverController.liveUsersUpdate(req.params.id); serverController.punishSound(req.params.id, 3);
        return res.status(201).send('User ' +  req.body.memberId + ' Banned');
    }catch(err){
        return res.status(401).send("Unauthorized");
    }

}

module.exports.unbanMember = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id) || !ObjectID.isValid(req.body.memberId) )
            return res.status(403).errored
    
    const  us_r : rl_ = <rl_> await get_Role(req.headers.authentification, req.params.id);
    const sl_C = await ChannelModel.findById(req.params.id).select('generalChannel').select('bannedUsers');
    
    if (!us_r.canBan || sl_C.generalChannel  || (req.headers.authentification === req.body.memberId) ||  !sl_C.bannedUsers.includes(req.body.memberId)){
        return res.status(401).send("Unauthorized");    
    }
    try{
        const n_b = sl_C.bannedUsers;
        const b_i = sl_C.bannedUsers.findIndex((id : string) => id === req.body.memberId);
        n_b.splice(b_i, 1);
        const f_ : usr = await UserModel.findById(req.body.memberId);
        await ChannelModel.findByIdAndUpdate(req.params.id, {
            $set: {
                bannedUsers: sl_C.bannedUsers
            }
        });
        return res.status(201).send('User ' +  req.body.memberId + ' UnBanned');
    }catch(err){
        return res.status(401).send("Unauthorized");
    }

}


