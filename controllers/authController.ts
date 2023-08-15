const UserModel : any = require('../models/userModel');
const TokenModel : any = require('../models/tokenModel');
const ChannelModel : any = require('../models/chnlModel');
const jwt : any = require('jsonwebtoken');
const {signUpErrors, signInErrors } = require('../utils/errorsUtils');
const {sendEmail} = require('../utils/emails');
const fs : NodeRequire = require('fs');
const bcrypt : any = require('bcrypt');
const ObjectID : any = require("mongoose").Types.ObjectId;
const mongoose : any = require("mongoose");
const notificationMiddleware : any = require('../middleware/notificationMiddleware');
const locationMiddle : any = require('../middleware/locationMiddleware');
const PostModel : any = require('../models/postModel');
var randomstring : any = require("randomstring");
var sanitize : any = require('mongo-sanitize');
var validator : any = require('validator');
var BadWords : any = require('bad-words');
const frenchBadwords = require('french-badwords-list');
const {OAuth2Client} = require('google-auth-library');
const client : any = new OAuth2Client(process.env.CLIENT_ID);
var generator: any = require('generate-password');
const nitroMiddleware : any = require('../middleware/nitroMiddleware');
//const crypto = import("crypto");
const {nanoid} = require('nanoid');
import { Request, Response, NextFunction } from 'express';
import {usr} from '../types/usrType';
import {ntf} from '../types/ntfType';
import {chn} from '../types/chnTypes';
import {pst} from '../types/pstType';

const auth_Secure = async (req : Request, userToAuth : string) => {
    const token = req.headers.authorization;
    const decodedToken = (jwt.verify(token, process.env.TOKEN_SECRET));
    let user : usr = await UserModel.findById(decodedToken.userId).select("userId");

    if (user._id.toString() !== userToAuth){
        console.log("User tried to Token Falsify ");
        return false;    
    }
    return true;    
};



module.exports.getCounts = async (req : Request, res : Response) => {
    try{
        const q = await UserModel.count();
        const q1 = await PostModel.count();
        const q2 = await ChannelModel.count();
        var q3 = await UserModel.aggregate([  
            {$match: {nitro: {$exists: true}}},
            {$group: {
                _id: null,
                nitro: {
                  $avg: "$nitro"
                }
            }}  
        ]);
        q3 = Math.floor(q3[0].nitro);

        const p : {users: any;posts: any;channels: any;nitro: any;}= {"users": q,
            "posts" : q1,
            "channels" : q2,
            "nitro" : q3 
        };
        return res.status(200).send(p);
    }catch(err){
        console.log(err);
        return res.status(400).send("Unauthorized");
    }

}

module.exports.signup = async (req : Request, res : Response) => {
    //console.log(req.body);
    if (Object.keys(req.body).length > 6){
        return res.status(400).send("Unauthorized");
    }
    var {email, password, nom, prenom} = req.body
    var MongooseRndm_ =  mongoose.Types.ObjectId().toString().slice(-5);
    var randomUserName = "User"+ "D" + MongooseRndm_+ randomstring.generate(7);
    //console.log(email);
    if ( !validator.isEmail(email) || password.length < 6){
        return res.status(400).send("Unauthorized");
    }
    try{
        // const alr = await UserModel.findOne({ email: email}).select('email');
        // console.log(alr);
        // if (alr) return res.status(400).send("Unauthorized");
        const user : usr = await UserModel.create({
            email: email,
            password: password,
            nom: nom,
            prenom: prenom,
            pseudo:  randomUserName
                 //   imageUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
        });
        const sTken = nanoid(128); //instead of crypto.randomBytes(64).toString('hex')
        //console.log(sTken);
        let token = await new TokenModel({
            userId: user._id,
            token: sTken,
          }).save();
        const message = `${process.env.BASE_URL}/login/verify/${user.id}/${sTken}`;
        await sendEmail(user.email, "Nitrochat Email Verification", message);
        return res.status(200).send("Email Sent to Verify your Account");
    }catch(err){
        console.log(err);
        const errors = signUpErrors(err);   
        return res.status(201).send({errors})
    }
};

module.exports.verifySignupToken = async (req : Request, res : Response) => {
    if(!req.params.id || !req.params.token){
        return res.status(400).send("An error occured");
    }
    console.log(req.params.id);
    try {
        console.log(req.params.token);
        const user = await UserModel.findOne({ _id: req.params.id }).select('nom');
        if (!user) return res.status(400).send("Invalid link");
    
        // const token = await TokenModel.find({token: {$regex : req.params.token}}).select('userId');
        // console.log(token);
        // if (!token) {console.log('falsefied email');return res.status(400).send("Invalid link");}
    
        await UserModel.findByIdAndUpdate(req.params.id,{
            $set: {
                authentified: true 
            }
        });
        //await TokenModel.findByIdAndRemove(token._id);
    
        return res.status(200).send("email verified sucessfully");
      } catch (error) {
        console.log(error);
        return res.status(400).send("An error occured");
      } 
};

module.exports.login = async (req : Request, res : Response) => {
    const {email, password} = req.body;
    //console.log(req.headers['x-forwarded-for']);
    if ( !validator.isEmail(req.body.email)){
        return res.status(201).send({
            errors: { email: 'E-mail Unknown.', password: '', verify: '' }
        });
    }

    try{
        // Appel de le fonction login du schema
        const userData = await UserModel.login(email, password);
      //  if (!userData.authentified){console.log("zer");return res.status(400).send('Verify Email Link First')}
        locationMiddle.setUserLocation(req.ip, userData.id);
        return res.status(200).send({userId: userData.id,
                            token: jwt.sign(
                                {userId : userData.id},
                                process.env.TOKEN_SECRET,
                                { expiresIn: '24h' }
                            )
        });
    }catch(err){
        const errors = signInErrors(err);   
        return res.status(201).send({errors});
    }

}



module.exports.getSpecificUser = async (req : Request, res : Response) => {
    if(!ObjectID.isValid(req.params.id))
        return res.status(403).errored

    try {
            const User = await UserModel.findById(req.params.id).select('id').select('imageUrl').select('nom').select('prenom').select('pseudo').select('followers').select('nitro')
            .select('followers_Ids').select('followings').select('followings_Ids').select('retweets').select('profileBanner').select('channelsCount').select('postsCount').select("verified")
            .select('city').select('country').select('createdAt').select('biography').select('profileLink').select('nitroBadge').select('mediumBadge').select('profileFade').select('fadeValues');
            return res.status(201).json(User);
    }catch(err){
            return res.status(400).send(err);
    }
}

module.exports.editBannerOrPfp = async (req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id) || Object.keys(req.body).length > 4)
        return res.status(403).errored

    const secure = auth_Secure(req, req.params.id);
    if (!secure){
        return res.status(403).send("Unauthorized");    
    }

    if (!req.files){
            return res.status(401).send("Unauthorized");    
    }else {
        //const getUser = await UserModel.findById(req.params.id).select('profileBanner').select('imageUrl');
        // if (req.body.isBanner){
        //         const filename = getUser.profileBanner.split('/uploads/banners/')[1];
        //         if (getUser.profileBanner != "http://localhost:3000/uploads/.png"){ /// <= MODIFY THIS AFTER UPLOAD
        //             fs.unlink(`uploads/banners/${filename}`, (err => {if (err) console.log(err)}));
        //         }
        //     }else{
        //         const filename = getUser.imageUrl.split('/uploads/profiles/')[1];
        //         if (getUser.imageUrl != "http://localhost:3000/uploads/.png"){ /// <= MODIFY THIS AFTER UPLOAD
        //         fs.unlink(`uploads/profiles/${filename}`, (err => {if (err) console.log(err)}));
        // }

        try{
            const newUrl = req.body.newFilename;
            if (!newUrl){return res.status(401).send("Unauthorized");}
            if (req.body.isBanner){            
                const updatedUser = await UserModel.findByIdAndUpdate(req.headers.authentification, { $set: {
                    profileBanner: newUrl,
                }});
                return res.status(201).json(newUrl);
            }else{
                const updatedUser = await UserModel.findByIdAndUpdate(req.headers.authentification, { $set: {
                    imageUrl: newUrl,
                }});
                return res.status(201).json(newUrl);
            }
        }catch(err){
        return res.status(401).send('Unauthorized')   
        }
    }
}

module.exports.editPassword = async (req : Request, res : Response) => {
    if(!ObjectID.isValid(req.params.id) || (req.params.id !== req.headers.authentification) || (req.body.password.length < 6))
        return res.status(403).send('Unauthorized')

    const secure: Promise<Boolean> = auth_Secure(req, req.params.id);
    if (!secure){
        return res.status(403).send("Wrong Auth.");    
    }
    
    try{
        const salt: any = await bcrypt.genSalt(12);
        const newP : string = await bcrypt.hash(req.body.password, salt);
        await UserModel.findByIdAndUpdate(req.headers.authentification , {
            $set: {
                password: newP
            }
         });  
        return res.status(200).send("Password Modified");
    }catch(err){
        return res.status(401).send('Unauthorized')   
    }
  
}

module.exports.editUser = async (req : Request, res : Response) => {
    if(!ObjectID.isValid(req.params.id) || (req.headers.authentification !== req.params.id))
        return res.status(403).errored
    
    const secure: Promise<Boolean> = auth_Secure(req, req.params.id);
    if (!secure){
        return res.status(403).send("Wrong Auth.");    
    }
    if (!validator.isURL(req.body.link)){
        req.body.link = "";
    }

    try{
        const {pseudo, biography, nom, prenom} : {pseudo : string, biography : string, nom : string, prenom : string} = req.body;

        var customFilter : any = new BadWords({ placeHolder: '*'});
        customFilter.addWords(...frenchBadwords.array);
        var filtered_ps = customFilter.clean(req.body.pseudo);
        const filtered_b = customFilter.clean(req.body.biography);
        var filtered_p = customFilter.clean(req.body.prenom);
        var filtered_n = customFilter.clean(req.body.nom);

        // filtered_p = filtered_p.replaceAll(' ', '');
        // filtered_n = filtered_n.replaceAll(' ', '');
        // filtered_ps = filtered_ps.replaceAll(' ', '');

        const a: usr = await UserModel.findByIdAndUpdate(req.headers.authentification , {
            $set: {
                prenom: filtered_p.replace(/ /g, ''),
                nom: filtered_n.replace(/ /g, ''),
                pseudo: filtered_ps.replace(/ /g, ''),
                biography: filtered_b,
                profileLink: req.body.link,
            }
         });  
        return res.status(200).send('User modified');
    }catch(err){
        return res.status(401).send('Unauthorized')   
    }
}

module.exports.followUser = async (req : Request, res : Response) => {
    if(!ObjectID.isValid(req.params.id) || req.params.id == req.headers.authentification)
            return res.status(403).errored

    try{
        if (ObjectID.isValid(req.body.userId) == true){
            const UserEmitter =  await UserModel.findById(req.headers.authentification).select('followers_Ids').select('followers').select('followings_Ids').select('followings');
            const usr_rv =  await UserModel.findById(req.params.id).select('followers_Ids').select('followers').select('followings_Ids').select('followings');
    
            if (usr_rv.followers_Ids.indexOf(req.headers.authentification) != -1){ 
                
                await UserModel.findByIdAndUpdate(req.params.id , {//////
                    $pull: {followers_Ids : req.headers.authentification,},
                    $set:{followers : usr_rv.followers - 1}
                }); 
                await UserModel.findByIdAndUpdate(req.headers.authentification , {//////
                    $pull: {followings_Ids : req.params.id,},
                    $set:{followings : UserEmitter.followings - 1}
                }); 

                return res.status(202).send("Follow Intercation");
                
            }else{

                await UserModel.findByIdAndUpdate(req.params.id , {/////// USER RECEIVING
                        $push: {followers_Ids : req.headers.authentification,},
                        $set:{followers : usr_rv.followers +  1}
                    }); 

                await UserModel.findByIdAndUpdate(req.headers.authentification , {/////// MODIFY USER SENDING
                    $push: {followings_Ids : req.params.id,},
                    $set:{followings :  UserEmitter.followings + 1 }
                }); 

                nitroMiddleware.nitroIntercation({ user_id : req.headers.authentification , value  : 7 });
                notificationMiddleware.sendNotification({
                    type: "Follow",
                    sendTo : req.params.id,
                    emitterId: req.headers.authentification,
                    postId : "",
                    postDescription : ""
                });
                return res.status(200).send("Follow Intercation");
            }
        }
    }catch(err){
        return res.status(400).send("Unauthorized");
    }

}


module.exports.OAuthSignup= async (req : Request, res : Response) => {
    if (!req.body.authToken || Object.keys(req.body).length > 2){
        return res.status(203).send("Unauthorized");
    }
    var MongooseRndm_ =  mongoose.Types.ObjectId().toString().slice(-5);
    var randomUserName = "User"+ "G" + MongooseRndm_+ randomstring.generate(7);
    try{
        var password_ = generator.generate({
            length: 10,
            numbers: true
        });
        client.verifyIdToken({idToken: req.body.authToken, audience: process.env.CLIENT_ID}).then(async (resp : any) => {
            if (resp.payload.email_verified){
                const AlreadyCreated = await UserModel.findOne({email: resp.payload.email}).select('email');
                if(!AlreadyCreated){
                    // if (resp.payload.family_name.length < 1){
                    //     resp.payload.family_name = resp.payload.given_name;
                    // }
                    const user : usr = await UserModel.create({
                            email: resp.payload.email,
                            password: password_,
                            nom: (resp.payload.family_name.length > 1 ? resp.payload.family_name.length : resp.payload.given_name),
                            prenom: resp.payload.given_name,
                            pseudo:  randomUserName,
                            imageUrl: resp.payload.picture,
                            authentified: true
                    });
                    return res.status(200).send("Sucess");
                }else{
                    return res.status(202).send("Already registered");
                }
            }else{
                return res.status(202).send("Already registered");
            }
        }).catch( (err:any) => {
            console.log(err);
            return res.status(401).send("Unauthorized");
        });

    }catch(err){
        console.log(err);
        return res.status(401).send(err);
    }


}
module.exports.OAuthSignIn= async (req : Request, res : Response) => {
    if (!req.body.authToken){
        return res.status(203).send("Unauthorized");
    }

    try{
        client.verifyIdToken({idToken: req.body.authToken, audience: process.env.CLIENT_ID}).then(async (resp : any) => {
            if (resp.payload.email_verified){
                 const AlreadyCreated = await UserModel.findOne({email: resp.payload.email}).select('email');
                if(AlreadyCreated){
                    locationMiddle.setUserLocation(req.ip, AlreadyCreated.id);
                    return res.status(200).send({userId: AlreadyCreated.id,
                        token: jwt.sign(
                            {userId : AlreadyCreated.id},
                            process.env.TOKEN_SECRET,
                            { expiresIn: '72h' }
                         )
                    });
                }else{
                    return res.status(401).send("Unknown");
                }
            }else{
                return res.status(202).send("Register first");
            }
        }).catch((err : any) => {
            console.log(err);
            return res.status(401).send("Unauthorized");
        });
    }catch(err){
        console.log(err);
        return res.status(401).send(err);
    }
}



module.exports.getNotificationsLen= async (req : Request, res : Response) => {
    if(!ObjectID.isValid(req.params.id))
        return res.status(403).errored

    try{
        const usrntfs : {notifications : ntf[]} = await UserModel.findById(req.params.id).select('notifications');
        const usNs : ntf[] = usrntfs.notifications.filter((n : ntf) => n.seen == false);
        return res.status(201).send({len: usNs.length});
    }catch(err){
        return res.status(401).send(err);
    }
}



module.exports.getUserNotifications = async (req : Request, res : Response) => {
    if(!ObjectID.isValid(req.params.id))
        return res.status(403).errored
    
    const usrDt_ : {notifications : ntf[] } = await UserModel.findById(req.headers.authentification).select('notifications');

    //type ntf_ = ntf & {post: pst};
    var postsNotif_: ntf[] | Array <{post : pst, user : usr}> | string[] | any= [];
    var chanNotif_:ntf[] | any[] = [];
    const user_data: ntf[] | usr[]  = [];

    usrDt_.notifications.map(async (notif : ntf, index : number) => {
        if (notif.notificationType === "Retweet" || notif.notificationType === "Mention" || notif.notificationType === "Like"  ||  notif.notificationType === "Comment"){
            let ps_ = postsNotif_ as Array<string | undefined>;
            if (!ps_.includes(notif.postId)){
                ps_.push(notif.postId);
            }
            postsNotif_ = ps_;
        }
        if(notif.notificationType === "RoleDestitution" || notif.notificationType === "RoleAttribution"  || notif.notificationType === "ChannelInvite") {
            let chnNf_ = chanNotif_ as Array<string | undefined>;
            if (!chnNf_.includes(notif.postId)){
                chnNf_.push(notif.postId);
            } 
            chanNotif_ = chnNf_;
        }
    });
    try{
        await Promise.all(chanNotif_.map(async (ch, index) => {
            let p = await ChannelModel.findById(ch).select('channelName').select('channelBanner').select('channelPicture').select('private');
            chanNotif_[index] = p;
        }))
        await Promise.all(postsNotif_.map(async (post : any, index : number) => {
            const i = await PostModel.findById(post);
            postsNotif_[index] = i;
            if (i === null){return}
            if (!user_data.includes(i.userId)){
                user_data.push(i.userId);
            }
        }));
          
        await Promise.all(user_data.map(async (userId, index) => {
            const e  = await UserModel.findById(userId).select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('nitroBadge').select('mediumBadge');
            user_data[index] = e;
        }));

        let x : void[] = await Promise.all(postsNotif_.map(async (post : pst, index : number) => {
            if (post == null){return}
            const user_indx = user_data.findIndex((usrDt_) => (usrDt_ as usr)._id.toString() === post.userId);
            postsNotif_[index] = {
                "post": post,
                "user": user_data[user_indx] as usr
            };
        }));

        var ursrsArMp_ : string[] = [];
        usrDt_.notifications.map(async (notif : ntf, index) => {
            if (!ursrsArMp_.includes(notif.emitterId)){ ursrsArMp_.push(notif.emitterId);}
        })

        const returnUsr_ = await Promise.all(ursrsArMp_.map( async (id, ix) => {
            let usr_ = await UserModel.findById(id).select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('nitroBadge').select('mediumBadge');
            return usr_;
        }));

        return res.status(200).send({
            "userNotifications" : usrDt_.notifications,
            "notificationsPosts" : postsNotif_,
            "notificationsChannels" : chanNotif_,
            "usersData_" : returnUsr_
        });
    }catch(err){
        return res.status(401).send(err);
    }

}



module.exports.markAsSeen= async (req : Request, res : Response)  => {
    if(!ObjectID.isValid(req.params.id))
        return res.status(403).errored
    
    const usNd_ = await UserModel.findByIdAndUpdate(req.params.id, {$set: {
        'notifications.$[].seen': true 
    }});
    return res.status(200).send(usNd_);
}

module.exports.searchFor= async (req : Request, res : Response)  => {
    if (req.params.id.length > 40){
        return res.status(401).send('Unauthorized')   
    }
    
    try{
        const PostsTrends = await PostModel.find({hashtags: {$regex: req.params.id }}).select('hashtags');
        const srcPf_ = await UserModel.find({
            $or: [
              { nom: { $regex: req.params.id, '$options' : 'i'} },
              { prenom: { $regex:  req.params.id, '$options' : 'i'  } },
              { pseudo: { $regex:  req.params.id, '$options' : 'i'  } },
            ],
          }).limit(20).select('id').select('imageUrl').select('nom').select('prenom').select('pseudo').select('verified').select('mediumBadge').select('nitroBadge');
          
        const ftTr : any[] = [];
        await Promise.all(PostsTrends.map((aTr : {hashtags : string[]}, ix : number) => {
            aTr.hashtags.map((hshtg : string) => {
                if (ftTr.includes(hshtg) === false){
                    ftTr.push(hshtg);
                }
            })
        }));
    
        return res.status(200).send({
            searchProfiles : srcPf_,
            searchTrends:  ftTr
          })
    }catch(err){
        return res.status(401).send('Unauthorized')   
    }
}

module.exports.searchForIdentification = async (req : Request, res : Response)  => {
    //console.log(req.params.id);
    try{
        const srcPf_ = await UserModel.find({
            $or: [
              { nom: { $regex: req.params.id, '$options' : 'i'} },
              { prenom: { $regex:  req.params.id, '$options' : 'i'  } },
              { pseudo: { $regex:  req.params.id, '$options' : 'i'  } },
            ],
            $and: [
                {_id : {$ne: req.headers.authentification}},
            ]
          }).limit(20).select('id').select('imageUrl').select('nom').select('prenom').select('pseudo').select('verified');
          
        
        return res.status(200).send({
            searchProfiles : srcPf_,
          })
    }catch(err){
        return res.status(401).send('Unauthorized')   
    }
}




module.exports.getOwnFollowings = async (req : Request, res : Response)  => {
    if(!ObjectID.isValid(req.params.id) ||  (Object.keys(req.body).length > 2))
        return res.status(403).send('Unauthorized')   

    try{
        const tk : string = req.body.jwt; const authId = req.body.userId;
        const dT : {userId : string} = (jwt.verify(tk, process.env.TOKEN_SECRET));
        let user = await UserModel.findById(dT.userId).select("authentified");
        if (user._id.toString() !== authId){return res.status(403).send('Unauthorized') }

        const SearchProfile : {followings_Ids : string[]} = await UserModel.findById(req.body.userId).select('followings_Ids');
        const relationsData_ : usr[] = await Promise.all(SearchProfile.followings_Ids.map(async (pf_id) => {
            let p :usr = await UserModel.findById(pf_id).select('nom').select('prenom').select('imageUrl');
            return p;
        }));
        return res.status(201).send({
            ids: SearchProfile,
            relationsData : relationsData_
        });
    }catch(err){
        return res.status(401).send('Unauthorized')   
    }
}

module.exports.notificationMuteUser = async (req : Request, res : Response) => {
    if(!ObjectID.isValid(req.params.id) || (req.params.id === req.headers.authentification))
        return res.status(403).errored   

    try{
        const ownUs_:usr = await UserModel.findById(req.headers.authentification).select('notifMutedUsers');
        const ix : number = ownUs_.notifMutedUsers.findIndex((muted_id : string) => muted_id === req.params.id);
        var status = 201;
        if (ix === -1){
            ownUs_.notifMutedUsers.push(req.params.id);
        }else{
            status = 200;
            ownUs_.notifMutedUsers.splice(ix, ix + 1);
        }
        await UserModel.findByIdAndUpdate(req.headers.authentification, {
            $set: {
                notifMutedUsers: ownUs_.notifMutedUsers
            }
        })
        return res.status(status).send(ownUs_.notifMutedUsers);
    }catch(err){
        return res.status(401).send('Unauthorized')   
    }
}


module.exports.blockUser = async (req : Request, res : Response)  => {
    if(!ObjectID.isValid(req.params.id) || (req.params.id === req.headers.authentification))
        return res.status(403).errored   

    try{
        const ownUs_ = await UserModel.findById(req.headers.authentification).select('followings_Ids').select('followings').select('blockedUsers');
        const index = ownUs_.blockedUsers.findIndex((blocked_id : string) => blocked_id === req.params.id);
        const othrUsr_ = await UserModel.findById(req.params.id).select('followers_Ids').select('followers');
        const isF = ownUs_.followings_Ids.findIndex((id : string) => id === req.params.id);
        const e = othrUsr_.followers_Ids.findIndex((id : string) => id === req.headers.authentification);

        if (isF !== -1){ ownUs_.followings_Ids.splice(isF, isF + 1); ownUs_.followings --; }
        if (e !== -1){
            othrUsr_.followers_Ids.splice(e, e + 1); othrUsr_.followers --; 
            await UserModel.findByIdAndUpdate(req.params.id, {$set : {followers:  othrUsr_.followers_Ids.length, followers_Ids: othrUsr_.followers_Ids}});
        }
        if (index === -1){
            ownUs_.blockedUsers.push(req.params.id);
        }else{
            ownUs_.blockedUsers.splice(index, index + 1);
        }
        await UserModel.findByIdAndUpdate(req.headers.authentification, {
            $set: {
                blockedUsers: ownUs_.blockedUsers,
                followings: ownUs_.followings_Ids.length,
                followings_Ids: ownUs_.followings_Ids
            }
        })
        
        if (index === -1){ return res.status(201).send(ownUs_.blockedUsers);}
        else{ return res.status(200).send(ownUs_.blockedUsers); }
    }catch(err){
        return res.status(401).send('Unauthorized')   
    }
}

module.exports.reportUser = async (req : Request, res : Response) => {
    if(!ObjectID.isValid(req.params.id) || (req.params.id === req.headers.authentification))
        return res.status(403).errored

    try{
        const usr_rprts : {reports : string[]} = await UserModel.findById(req.params.id).select('reports');
        const ix : number = usr_rprts.reports.findIndex((reportId : string) => reportId === req.headers.authentification);
        if (ix === -1){
            const User:usr = await UserModel.findByIdAndUpdate(req.params.id , {
                $push:{reports : req.headers.authentification}
            });
            usr_rprts.reports.push(req.headers.authentification as string)
            return res.status(201).send(usr_rprts.reports);
        }else{
            usr_rprts.reports.splice(ix, ix + 1);
            const User:usr = await UserModel.findByIdAndUpdate(req.params.id , {
                $set:{reports : usr_rprts.reports}
            });
            return res.status(202).send(usr_rprts.reports);
        }
    }catch(err){
        return res.status(401).send('Unauthorized')   
    }
} 


// module.exports.nitroshopBuy = async (req,res) => {
//     if(!ObjectID.isValid(req.params.id) ||  (req.params.id !== req.headers.authentification))
//         return res.status(403).error
    
//     try{
//         let price = 0;
//         switch(req.body.unlockType){
//             case 'e':
//                 price = 100;
//                 break;
//             case 'e':
//                 price = 100;
//                 break;
//             case 'e':
//                 price = 100;
//                 break;
//         }
//     }catch(err){
//         res.status(401).send(err);
//     }
// } 


module.exports.getNitroInf =  async (req : Request, res : Response) => {
    if(!ObjectID.isValid(req.params.id) ||  (req.params.id !== req.headers.authentification))
        return res.status(403).errored
    
    try{
        type usr_ = usr[] & Array<{averageNitro: number, averageRelations : number}>

        const a :usr_ = await UserModel.aggregate([  
            {$match: {nitro: {$exists: true}}},
            {$group: {
                _id: null,
                averageNitro: {
                  $avg: "$nitro"
                }
            }}  
        ]);
        const b :usr_ = await UserModel.aggregate([  
            {$match: {interactions: {$exists: true}}},
            {$group: {
                _id: null,
                averageRelations: {
                  $avg: "$interactions"
                }
            }}  
        ]);
        const i = await UserModel.findById(req.headers.authentification).select('nitroUnlocks').select('verified').select('nitro').select('channelsCreated').select('nom').select('prenom').select('followers').select('postsCount')
        .select('imageUrl').select('interactions').select('profileBanner').select('pseudo').select('biography').select('updatedAt').select('nitroBadge').select('mediumBadge').select('profileFade').select('fadeValues');
        const c = await ChannelModel.find({_id : {$in: i.channelsCreated}}).select('channelName').select('channelPicture').select('channelBanner').select('private').select('usersIds').select('fade')
        .select('length').select('fadeValues');
    
        for (let i = 0; i < c.length; i ++){
            var l  = c[i].usersIds.length; var o = {...c[i]._doc};
            o.usersIds = l;
            c[i] = o;
        }
        a[0].averageNitro = Math.ceil(a[0].averageNitro);
        b[0].averageRelations = Math.ceil(b[0].averageRelations);
        let x = {averageNitro : Math.ceil(((i.nitro- a[0].averageNitro )/ a[0].averageNitro) * 100),
            averageRelations : Math.ceil(((i.interactions- b[0].averageRelations )/ b[0].averageRelations) * 100),
            userChannels : c
        };
        let resp = { ...x, ...i._doc}; 
        return res.status(200).send(resp);
    }catch(err){
        return res.status(400).send(err);
    }
}


module.exports.nitroUnlock = async (req : Request, res : Response)  => {
    const unlocks = [ "longerMessages","postVideos","mediumBadge","gradientProfile","channelsThemes","animatedPfp","animatedBanner","animatedChannels", "nitroBadge"];
    if (!unlocks.includes(req.params.id.toString()) || req.body.length > 0){
        return res.status(400).send('unauthorized');
    }
    
    try {
        type usr_ = usr & {averageNitro: number, averageRelations : number, nitroUnlocks : string[] | any};
        const usrNtr_ : usr_ = await UserModel.findById(req.headers.authentification).select('nitro').select('nitroUnlocks').select('nitroBadge').select('mediumBadge').select('profileFade');
        if (usrNtr_.nitroUnlocks[req.params.id]){return res.status(400).send("Unauthorized");}
        var price = 0;
        switch(req.params.id){
            case"longerMessages":
                price = 10000;
                break;
            case"postVideos":
                price = 20000;
                break; 
            case"mediumBadge":
                price = 30000;
                break;
            case"gradientProfile":
                price = 45000;
                break;   
            case"channelsThemes":
                price = 50000;
                break;   
            case"animatedPfp":
                price = 65000;
                break;   
            case"animatedBanner":
                price = 80000;
                break;   
            case"animatedChannels":
                price = 100000;
                break;   
            case"nitroBadge":
                price = 125000;
                break;   
        }
        if (usrNtr_.nitro >= price && !usrNtr_.nitroUnlocks[req.params.id]){
            
            let newUnlocks = {...usrNtr_.nitroUnlocks._doc};
            newUnlocks[req.params.id] = true;
    
            let prFadeBool = usrNtr_.profileFade;
            let medmBdg : boolean = usrNtr_.mediumBadge; let ntroBdge = usrNtr_.nitroBadge;
            if (req.params.id === "mediumBadge"){medmBdg = true;}
            if (req.params.id === "nitroBadge"){ntroBdge = true;}
            if (req.params.id === "gradientProfile"){prFadeBool = true;}

            const p:usr = await UserModel.findByIdAndUpdate(req.headers.authentification, {
                $set: {
                    nitroUnlocks: newUnlocks,
                    nitro : usrNtr_.nitro - price,
                    nitroBadge: ntroBdge,
                    mediumBadge: medmBdg,
                    profileFade : prFadeBool
                }
            }).select('nitro');
            return res.status(201).send("Unlocked");
        }else{
            console.log('Too Poor' + req.params.id);
            return res.status(401).send('Too Poor');
        }
    } catch (error) {
        return res.status(400).send(error);
    }

}

module.exports.fadeEdit = async (req : Request, res : Response) => {
    if (!validator.isHexColor(req.body.newColors[0]) || !validator.isHexColor(req.body.newColors[1]) || req.body.newColors.length > 2){
        return res.status(400).send('Unauthorized');
    }

    try{
        const userData : usr = await UserModel.findById(req.headers.authentification).select('profileFade').select('fadeValues').select('nitroUnlocks');
        if (!userData.nitroUnlocks.gradientProfile){return res.status(400).send('Unauthorized');}

        await UserModel.findByIdAndUpdate(req.headers.authentification, {
            $set: {
                fadeValues: req.body.newColors,
                profileFade: req.body.active
            }
        });
        return res.status(201).send("Colors Modified");
    }catch(err){
        return res.status(400).send(err);
    }
}

module.exports.fadeEditChannel = async (req : Request, res : Response) => {
    if (!ObjectID.isValid(req.params.id)  || !validator.isHexColor(req.body.newColors[0]) || !validator.isHexColor(req.body.newColors[1]) || req.body.newColors.length > 2){
        return res.status(400).send('Unauthorized');
    }

    try{
        const userData = await UserModel.findById(req.headers.authentification).select('nitroUnlocks').select('channelsCreated');
        if (!userData.nitroUnlocks.channelsThemes || !userData.channelsCreated.includes(req.params.id) ){return res.status(400).send('Unauthorized');}
         await ChannelModel.findByIdAndUpdate(req.params.id, {
             $set: {
                fadeValues: req.body.newColors,
                fade: req.body.active
            }
         });
        return res.status(201).send({
            "id" : req.params.id,
            "colors" :req.body.newColors
        });
    }catch(err){
        return res.status(400).send(err);
    }
}



// module.exports.fixFollowingsFollowers = async (req, res) => {
//     if (req.params.id !== process.env.FIXING_SECRET){
//         return res.status(400).send('Unauthorized');
//     }

//     try{
//         const allUsers = await UserModel.find().select('followers_Ids').select('followers').select('followings_Ids').select('followings');
//         console.log(allUsers.length);
//         await Promise.all(allUsers.map(async (user) => {
//             var fl = user.followers_Ids;
//             var fg = user.followings_Ids;
//             var nfl = fl.filter((c, index) => {return fl.indexOf(c) === index;});
//             var nfg = fg.filter((c, index) => {return fg.indexOf(c) === index;});
//             await UserModel.findByIdAndUpdate(user._id , {
//                 $set: {
//                     followers_Ids: nfl,
//                     followers: nfl.length,

//                     followings_Ids : nfg,
//                     followings : nfg.length,
//                 }
//             });
//             console.log('prev followers' + fl.length +"=>" + nfl.length + " followings "+ fg.length + "=>" + nfg.length );
//             return res.status(200).send("good");
//         }));  
//     }catch(err){
//         return res.status(400);
//     }
// }