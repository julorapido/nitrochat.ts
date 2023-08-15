
import {usr} from '../types/usrType';
import { Request, Response, NextFunction} from "express";
const UserModel = require('../models/userModel');
const ObjectID = require("mongoose").Types.ObjectId;

const areUsersBlockedMuted : (usr_1: string, usr_2: string) => Promise<boolean> = async (usr_1 : string, usr_2 : string) => {
    const usr1 : usr = await UserModel.findById(usr_1).select('blockedUsers').select('notifMutedUsers') ;
    const usr2 : usr = await UserModel.findById(usr_2).select('blockedUsers').select('notifMutedUsers');
    if (usr1.blockedUsers.includes(usr_2) || usr2.blockedUsers.includes(usr_1) || usr1.notifMutedUsers.includes(usr_2) || usr2.notifMutedUsers.includes(usr_1) ){
        return true;
    }else{
        return false;
    }
};
type nt_o = {
    sendTo : string,
    emitterId : string,
    postId ?: string | null,
    postDescription ?: string | null,
    type : string | "Follow"| "Mention" | "ChannelInvite"| "RoleAttribution" | "RoleAttribution"
};

module.exports.sendNotification = async (ntf_obj : nt_o) => {
    const userData = await UserModel.findById(ntf_obj.sendTo).select('notifications');
    var dlbon_ = false;
    const canceld : boolean = await areUsersBlockedMuted(ntf_obj.emitterId, ntf_obj.sendTo);
    if ((ntf_obj.emitterId === ntf_obj.sendTo)|| (canceld)){
        return;
    }
    if (ntf_obj.type == "Follow"){
        userData.notifications.forEach((ntf_ : any) => {
            if(ntf_.type == "Follow"){
                if (ntf_.emitterId == ntf_obj.emitterId){
                    return dlbon_ = true;
                }
            }
        }); 
    }else if (ntf_obj.type == "Mention" || ntf_obj.type == "ChannelInvite" || ntf_obj.type == "RoleAttribution" || ntf_obj.type == "RoleDestitution"){
    }else{
        userData.notifications.forEach((ntf_:  any) => {
            if( (ntf_.emitterId == ntf_obj.emitterId) && ( ntf_obj.type == ntf_.notificationType) && (ntf_.postId == ntf_obj.postId) ){
                return dlbon_ = true;
            }
        });
    }
    if (dlbon_ == false){
        const re = await UserModel.findByIdAndUpdate(ntf_obj.sendTo,
            {
                $push: {
                    notifications: 
                    {
                        emitterId: ntf_obj.emitterId,
                        notificationType: ntf_obj.type,
                        postDescription: ntf_obj.postDescription,
                        postId: ntf_obj.postId,
                        timestamp: new Date().getTime(),
                        seen: false,
                        archived: false
                    },
              },
            },
            {new: true}
        )
        return re;
    }
    return 0
}

// module.exports.archiveNotification = async (req, res) => {
    
//      UserModel.findById(
//         req.params.id,
//         (err, docs) => {
//             const theComment = docs.notifications.find((notification) =>
//                 notification._id.equals(req.body.notifId)
//             )

//             if (!theComment) return res.status(404).send('Notification not found !')
//             theComment.archived = !theComment.archived;

//             return docs.save((err) => {
//                 if (!err) return res.status(200).send(docs);
//                 return res.status(500).send(err)
//             })

//         }
//     )

// }
