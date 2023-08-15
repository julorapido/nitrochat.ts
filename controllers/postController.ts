const ObjectID = require("mongoose").Types.ObjectId;
const PostModel = require('../models/postModel');
const fs = require('fs');
const UserModel = require("../models/userModel");
const mongoose = require("mongoose");
const notificationMiddleware = require('../middleware/notificationMiddleware');
const nitroMiddleware = require('../middleware/nitroMiddleware');
var BadWords = require('bad-words');
const frenchBadwords = require('french-badwords-list');
const ChannelModel = require('../models/chnlModel');
import { Request, Response, NextFunction } from 'express';
import {usr} from '../types/usrType';
import {msg, msg_sn} from '../types/dmType';
import {ntf} from '../types/ntfType';
import {chn} from '../types/chnTypes';
import {pst} from '../types/pstType';

type cm_ = {
    id?: string,
    _id: string,
    postId: string,
    commenterId: string,
    text: string,
    likes: [string] | [],
    replyTo ?: string,
    timestamp: number
};

module.exports.getAllPostsCount = async(req : Request, res : Response) => {
     const q = PostModel.find();
     q.count(function (err : any, docs : any){
        if (err) return res.status(400).send(err)
        else 
            {
                return res.status(200).send({docs});
            }
        })
}

module.exports.getSpecificPost = async(req : Request, res : Response) => {
    if(!ObjectID.isValid(req.params.id))
        return res.status(401).errored

    try{
        const p_q : pst = await PostModel.findById(req.params.id);
        if (p_q){
            return res.status(200).send(p_q);
        }
        return res.status(400).send("Post not found"); 
    }catch(err){
        return res.status(400).send('Unauthorized');
    }

}

module.exports.getUserPostCount = async(req : Request | any, res : Response) => {
    const userId = req.headers.authentification;

    try{
        await PostModel.find((err : any, docs : any) => {
            const p_f = docs.filter((all_P : pst) => 
                all_P.userId === userId
            );
             const ps_C = p_f.length;
             if (!err) {
                 return res.status(200).send(ps_C.toString());
             } 
             else {
                 res.send(err);
             }
         });
    }catch(err){
        return res.status(400).send('Unauthorized');
    }

}

module.exports.createNewPost = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.body.userId) ||  (req.body.userId !== req.headers.authentification) || (req.body.description.length > 752)){
        return res.status(401).errored
    }


    try{
        if (req.file){
            //let pre = req.body.mentions.replaceAll(',', " ");
            let pre : string = req.body.mentions.replace(/,/g, ' ');
            const p_s = pre.split(' ').map((w : string)=> {
                return w;
            })
            req.body.mentions = p_s;
    
           // req.body.hashtags = req.body.hashtags.replaceAll(',', " ");
            req.body.hashtags = req.body.hashtags.replace(/,/g, ' ');
            const rf_ : string[] = req.body.hashtags.split(' ').map((w : string) => {
                return w;
            })
            req.body.hashtags = rf_;
            
        }
        if (req.body.mentions.length > 8 ){ return res.status(401).errored}
    
        req.body.hashtags = req.body.hashtags.filter((tag : string) => tag.length > 2);
        req.body.mentions = req.body.mentions.filter((mtn : string) => mtn.length > 2);
    
    
        if (req.body.mentions.length > 0){
            req.body.mentions.forEach((mtn_ : string) => {
                if(!ObjectID.isValid(mtn_))
                    return res.status(401).errored
            })
        }
    
        var c_ff : any = new BadWords({ placeHolder: '*'});
        c_ff.addWords(...frenchBadwords.array);
        const filtered = c_ff.clean(req.body.description);
    
        var mtn_F : usr[] = [];
    
        if (req.body.mentions.length > 0){
            mtn_F = await Promise.all(req.body.mentions.map(async (mtn_ : string, index : number) => {
                console.log(mtn_);
                let u = await UserModel.findById(mtn_).select('pseudo');
                return u;
            }));
        }
        
        var n_p = new PostModel();
        if (req.file){
            //imageUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
            n_p = new PostModel({
                userId:  req.headers.authentification,
                description:  filtered || req.body.description,
                imageUrl: req.body.newFilename,
                hashtags: req.body.hashtags,
                mentions: mtn_F
            })    
        }else {
            n_p = new PostModel({
                userId:  req.headers.authentification,
                description:  filtered,
                hashtags: req.body.hashtags,
                mentions: mtn_F
            })
        }

        
        let p = 4;
        if (req.file){p = 10;}
        nitroMiddleware.nitroIntercation({
            user_id : req.headers.authentification,
            value  : p
        });
        nitroMiddleware.nitroIntercation({ user_id : req.headers.authentification, value  : 0 });
        const e = await UserModel.findByIdAndUpdate(req.headers.authentification, {
                $inc: {
                    postsCount: 1,
                }
        });
        
        const p_save = await n_p.save();
        mtn_F.forEach((m : {_id : string}) => {
            notificationMiddleware.sendNotification({
                type: "Mention",
                sendTo : m._id,
                emitterId: req.headers.authentification,
                postId : p_save._id,
                postDescription : filtered
            });
        });
     
        return res.status(201).json(p_save);
    }
    catch(err){
        return res.status(401).send(err);
    }
}


module.exports.deletePost = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id))
        return res.status(401).errored
    
    try{
        const g_p : pst = await PostModel.findById(req.params.id).select('imageUrl').select('userId');
        if (!g_p){return res.status(403).send('Unauthorized')}
        if (g_p.userId !== req.headers.authentification){
            return res.status(403).send('Unauthorized')
        }
        const fn : string = g_p.imageUrl.split('/uploads/')[1];
        if (fn){
        //    fs.unlink(`uploads/${filename}`, (err => {if (err) console.log(err)}));
        }
       const i : pst= await PostModel.findByIdAndDelete(req.params.id);
       const e : pst = await UserModel.findByIdAndUpdate(req.headers.authentification, {
            $inc: {
                postsCount: -1,
            }
        });
        return res.status(201).send("Post Deleted");
    }catch(err){
        return res.status(400).send(err);
    }
}

// module.exports.updatePost = async (req,res) => {

//     if (!req.file){
//         try{
//             const updatePost = await PostModel.findByIdAndUpdate(req.params.id, { $set: {
//                 description: req.body.description,
//             }});
//             return res.status(201).json(updatePost);
//         }catch(err){
//             return res.status(401).send(err);
//         }
        
//     }else {
//         const getPost = await PostModel.findById(req.params.id);
//         const filename = getPost.imageUrl.split('/uploads/')[1];
//         fs.unlink(`uploads/${filename}`, (err => {if (err) console.log(err)}));
//         ////////////////////////////////////////////////////////////
//         try{
//             const updatedPost = await PostModel.findByIdAndUpdate(req.params.id, { $set: {
//                 description: req.body.description,
//                 imageUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
//             }});

//             return res.status(201).json(updatedPost);
//         }catch(err){
//             return res.status(401).send(err);
//         }
//     }

// } 


module.exports.likePost = async(req : Request | any, res : Response)  => {
    if(!ObjectID.isValid(req.params.id))
        return res.status(403).errored

    try{
        type pst_ = pst & {save() : any};

        if (ObjectID.isValid(req.body.userId) == true){
            const us_st : usr = await UserModel.findById(req.headers.authentification).select('followers');
            await PostModel.findOne({
                _id: req.params.id
            }).then(async (p : pst_) => {
                    const i_o_u = p.usersLiked.indexOf(req.headers.authentification as never);
                    //console.log(indexOfUser);
                    if (i_o_u != -1){ //// 
                        p.likes--;// 
                        p.usersLiked.splice(i_o_u, i_o_u + 1);// 
                        await p.save();
                        if(p.userId !== req.headers.authentification){
                                nitroMiddleware.nitroIntercation({
                                user_id : p.userId,
                                value  : - (6 + (us_st.followers / 2))
                            });
                        }
                        return res.status(202).send("Unlike"); 
    
                    }else {//// 
                        p.likes++; // Like
                        p.usersLiked.push(req.headers.authentification as never);
                        await p.save();
    
                        notificationMiddleware.sendNotification({
                            type: "Like",
                            sendTo : p.userId,
                            emitterId: req.headers.authentification,
                            postId : p.id,
                            postDescription : p.description
                        });
                     
                        if(p.userId !== req.headers.authentification){
                            //
                            nitroMiddleware.nitroIntercation({
                                user_id : p.userId,
                                value  : (6 + (us_st.followers / 2))
                            });
                            nitroMiddleware.nitroIntercation({ user_id : req.headers.authentification, value  : 0 });
                            //
                        }
                
                    }
                
                return res.status(200).json(p);
            } 
            ).catch((err :any) => {
                res.status(401).send(err);
            })
    
        }else {
           console.log("Wrong user id")
           return res.status(401).send("wrong user id")
       }
    }catch(err){
        return res.status(400).send('Unauthorized');
    }
} 
                


module.exports.commentPost = async(req : Request, res : Response)  => {
    if (!ObjectID.isValid(req.params.id) || (req.body.commenterId !== req.headers.authentification))
        return res.status(400).send("Unauthorized");


    try {
        //type pst_ = pst & {save() : any};
        const p_id = req.params.id;
        const s_id : pst = await PostModel.findById(req.params.id).select('userId');
        const new_c : cm_ = {
            _id: mongoose.Types.ObjectId() as string,
            postId: p_id,
            commenterId: req.headers.authentification as string,
            text: req.body.text,
            likes: [],
            timestamp: new Date().getTime()
        };
        
         PostModel.findByIdAndUpdate(
            req.params.id,
            {
                $push: {
                    comments: {
                        postId: p_id,
                        commenterId: req.headers.authentification,
                        text: req.body.text,
                        replyTo: req.body.replyTo,
                        timestamp: new Date().getTime()
                    },
                },
            },
            { new: true},
            (err : any, docs : any) => {
                if (!err){
                    notificationMiddleware.sendNotification({
                        type: "Comment",
                        sendTo : s_id.userId,
                        emitterId: req.headers.authentification,
                        postId : p_id,
                        postDescription : req.body.text
                    });
                    nitroMiddleware.nitroIntercation({
                        user_id : req.headers.authentification,
                        value  : 3
                    });
                    if(s_id.userId !== req.headers.authentification){
                        nitroMiddleware.nitroIntercation({
                            user_id : s_id.userId,
                            value  : 8
                        });
                        nitroMiddleware.nitroIntercation({ user_id : req.headers.authentification, value  : 0 });
                    }
                    return res.status(200).send(new_c);
            } else{
               return res.status(400).send(err)
            }
            }
        );
    }catch (err){
        return res.status(400).send(err);
    }
}

module.exports.deleteCommentPost =  async(req : Request | any, res : Response) => {
    if (!ObjectID.isValid(req.params.id) || !ObjectID.isValid(req.body.commentId))
        return res.status(400).send("Unauthorized");

    try{
        return PostModel.findByIdAndUpdate(
            req.params.id,
            {
                $pull: {
                    comments: {
                        _id: req.body.commentId,
                    },
                },
            },
            {new : true},
            (err :any, docs: any) => {
                if (!err) return res.status(200).send(docs);
                else return res.status(400).send(err);
            }
        )
    }catch(err) {
        return res.status(400).send(err);
    }
}

module.exports.editCommentPost = async(req : Request | any, res : Response) => {
    if (!ObjectID.isValid(req.params.id) || !ObjectID.isValid(req.body.commentId) )
        return res.status(401).send("Unauthorized");

    try{
        return PostModel.findById(
            req.params.id,
            (err : any, docs : any) => {
                const the_C = docs.comments.find((cm : any) =>
                    cm._id.equals(req.body.commentId)
                )

                if (!the_C) return res.status(401).send('Unauthorized')
                if (the_C.commenterId !== req.headers.authentification) return res.status(401).send('Unauthorized') 
                the_C.text = req.body.text;


                return docs.save((err : any) => {
                    if (!err) return res.status(200).send(docs);
                    return res.status(500).send(err)
                })

            }
        )

    }catch(err){
        return(res.status(400).send(err))
    }
}

module.exports.retweetPost = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id) || !ObjectID.isValid(req.body.userId))
        return res.status(403).errored

    try{
        type pst_ = pst & {save() : any};
        const rt_U : usr = await UserModel.findById(req.headers.authentification).select('retweets').select('followers');
        PostModel.findOne({
                _id: req.params.id 
        }).then(async (p : pst_) => {
                    const indexOfUser = p.userRetweets.indexOf(req.headers.authentification as never);
                    const indexOfRt = rt_U.retweets.indexOf(<never>p._id);
                    if (indexOfUser != -1){ //// ALREADY RETWEET
                        p.retweets--;// Enlever rt
                        p.userRetweets.splice(indexOfUser, indexOfUser + 1);
                        rt_U.retweets.splice(indexOfRt, indexOfRt + 1);
                        await p.save();
                        await UserModel.findByIdAndUpdate(req.headers.authentification, {
                            $set: {
                                retweets: rt_U.retweets
                            }
                        });
                        if(p.userId !== req.headers.authentification){
                            nitroMiddleware.nitroIntercation({
                                user_id : p.userId,
                                value  : - (6 + (rt_U.followers / 2))
                            });
                        }
                        return res.status(202).json("Already Retweeted");
                    }else {///
                        p.retweets++; 
                        p.userRetweets.push(req.headers.authentification as never); 
                        rt_U.retweets.push(<never>(p._id));
                
                        notificationMiddleware.sendNotification({
                            type: "Retweet",
                            sendTo : p.userId,
                            emitterId: req.headers.authentification,
                            postId : p.id,
                            postDescription : p.description
                        });
                    }
    
                    await UserModel.findByIdAndUpdate(req.headers.authentification, {
                        $set: {
                            retweets: rt_U.retweets
                        }
                    });
                    await p.save();
                    if(p.userId !== req.headers.authentification){
                        nitroMiddleware.nitroIntercation({
                            user_id : p.userId,
                            value  : 6 + (rt_U.followers / 2)
                        });
                        nitroMiddleware.nitroIntercation({ user_id : req.headers.authentification, value  : 0 });
                    }
                    return res.status(200).json(p);
    
            } 
            ).catch((err : any) => {
                res.status(401).send(err);
            });

    }catch(err){
        return res.status(400).send('Unauthorized');
    }
   
}






module.exports.likeComment = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id) || !ObjectID.isValid(req.body.commentId) )
        return res.status(403).errored

    try{
        type pst_ = pst & {save() : any};
        if (ObjectID.isValid(req.body.userId)){
            const p_ : pst_ = await PostModel.findOne({
                _id: req.params.id
            })
            const l_c : cm_ = <cm_>(p_.comments.find((cE : cm_) => cE.id == req.body.commentId));
            const indexOfUser = l_c.likes.indexOf(req.headers.authentification as never);
            if (indexOfUser == -1){ /// Comment Already Liked
                l_c.likes.push(req.headers.authentification as never);
                await p_.save();
                return(res.status(200).send("Cancel Like -"));
            }else{
                l_c.likes.splice(indexOfUser, indexOfUser + 1);
                await p_.save();
                return(res.status(202).send("Like Comment +"))
            }
        }else {
           return res.status(401).send("wrong user id")
       }
    }catch(err){
        return res.status(400).send('Unauthorized');
    }
  
} 
           




module.exports.reportPost = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id))
        return res.status(403).errored

    try{
        const p:pst = await PostModel.findByIdAndUpdate(req.params.id , {
            $inc:{reports : 1}
        });
        return res.status(201).send("Post Reported")
    }catch(err){
        return res.status(401).send("Unauthorized");
    }
} 

           
module.exports.bookmarkPost = async(req : Request | any, res : Response) => {
    if(!ObjectID.isValid(req.params.id) || !ObjectID.isValid(req.body.userId)  || (req.headers.authentification != req.body.userId))
        return res.status(401).send("Unauthorized");

    try{
        const us : usr = await UserModel.findById(req.headers.authentification).select('bookmarks');
        const p_uId : pst = await PostModel.findById(req.params.id).select('userId');
        if (p_uId === req.headers.authentification){return res.status(401).send('Unauthorized')}
        const i_oB : number = us.bookmarks.indexOf(req.params.id);
        if (i_oB == -1 ){
            us.bookmarks.push(req.params.id);
            await UserModel.findByIdAndUpdate(req.headers.authentification, { $push:{ bookmarks : req.params.id } });
            await PostModel.findByIdAndUpdate(req.params.id, { $inc:{bookmarksCount: 1}});
            return res.status(200).send(us.bookmarks);
        }else{
            let indx : number = us.bookmarks.findIndex(bk => bk === req.params.id);
            us.bookmarks.splice(indx, indx + 1);
            await UserModel.findByIdAndUpdate(req.headers.authentification , { $pull:{ bookmarks : req.params.id }});
            await PostModel.findByIdAndUpdate(req.params.id, { $inc:{bookmarksCount: -1}});
            nitroMiddleware.nitroIntercation({ user_id : p_uId.userId , value  : 0 });
            return res.status(201).send(us.bookmarks);
        }
    }catch(err){
       return res.status(401).send("Unauthorized");
    }
} 
           


module.exports.getBookmarkPosts= async(req : Request | any, res : Response)  => {
    if(!ObjectID.isValid(req.params.id))
        return res.status(401).send("Unauthorized");
    
    try{
            const u_D = await UserModel.findById(req.headers.authentification).select('bookmarks');
            const b_m : string[] = [];
            await Promise.all(u_D.bookmarks.map(async (bm : string) =>  {
                const fetchedPost = await PostModel.findById(bm);
                b_m.push(fetchedPost);
            }));
            return res.status(200).send(b_m);
    }catch(err){
        return res.status(401).send("Unauthorized");
    }
}


module.exports.getSuggsWindow = async(req : Request | any, res : Response)  => {
    if (req.params.id.length > 15){
        return res.status(401).send("Unauthorized");
    }
    try{
        const x = await UserModel.findById(req.headers.authentification).select('followings_Ids');
        if (req.params.token == 1){
            var w = await PostModel.find({userId : {$in: x.followings_Ids } } ).sort({ createdAt: -1}).select('userId');
            w = w.map((p : pst) => {return p.userId});
            w = w.filter((c : pst, index : null) => {return w.indexOf(c) === index;});
            const c = await ChannelModel.find({'usersIds': {$elemMatch: {userId: {$in : w}   }}}).select('private').select('usersIds').select('channelDescription').select('channelName').select('length').select('channelPicture').select('generalChannel').limit(20);
            var e = c.sort((a : any, b : any) => 0.5 - Math.random());e = e.slice(0,3);
            const rw = await Promise.all(w.map(async (id : string) => {
                const usr = await UserModel.findById(id).select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('nitroBadge').select('mediumBadge').select('biography');
                return usr
            }));
            return res.status(200).send({
                users:  rw,
                channels : e
            });
        }else{
            var userPosts : Array<pst | string> = (req.params.id.length > 1 ? await PostModel.find({$and : [ {"hashtags" : {$eq: "#" + req.params.id}}, {userId: {$ne: req.headers.authentification} } ]}).select('userId').sort({ createdAt: 1}) 
            : await PostModel.find({userId: {$ne: req.headers.authentification}}).select('userId').sort({ createdAt: 1}).limit(30).sort({ createdAt: -1}));
            //userPosts = userPosts.map((post) => {return <string>(<pst>(post).userId)});
            userPosts = userPosts.filter((c, index) => {return userPosts.indexOf(c) === index;});
            var mch_ : (string | pst)[] = []; 
            if (!(req.params.id.length == 1)){mch_ = [...userPosts];}
            const r = await Promise.all(userPosts.map(async (id) => {
                const usr = await UserModel.findById(id).select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('nitroBadge').select('mediumBadge').select('biography');
                return usr
            }));
            if (req.params.id.length == 1){
                const c = await ChannelModel.find({'usersIds': {$elemMatch: {userId: {$ne : req.headers.authentification } }}}).select('usersIds').select('private').select('channelDescription').select('channelName').select('length').select('channelPicture').select('generalChannel').limit(3);
                return res.status(200).send({
                    users:  r,
                    channels : c
                });
            }else{
                const c = await ChannelModel.find({'usersIds': {$elemMatch: {userId: {$in : mch_  }   }}}).select('usersIds').select('private').select('channelDescription').select('channelName').select('length').select('channelPicture').select('generalChannel').limit(20);
                var e = c.sort((a : any, b : any) => 0.5 - Math.random());
                e = e.slice(0,3);
                return res.status(200).send({
                    users:  r,
                    channels : e
                });
            }
        }
    }catch(err){
        console.log(err);
        return res.status(401).send("Unauthorized");
    }
}
