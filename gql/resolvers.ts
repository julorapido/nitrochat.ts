// The root provides a resolver function for each API endpoint
const User = require("../models/userModel");
const Post = require("../models/postModel");
const ObjectID = require("mongoose").Types.ObjectId;
var ObjectId = require('mongodb').ObjectId;
var moment = require('moment'); // require
import {usr} from '../types/usrType';
import {msg, msg_sn} from '../types/dmType';
import {ntf} from '../types/ntfType';
import {chn} from '../types/chnTypes';
import {pst} from '../types/pstType';
// Not all types definitions declared here
// for more check https://graphql.org/graphql-js/type/#graphqlobjecttype
type GraphQLArgumentConfig = {
    type: GraphQLInputType; defaultValue?: any;
    description?: string | null | undefined;
  }

type GraphQLResolveInfo = {
    fieldName: string,
    fieldNodes?: Array<Field>,
    returnType?: GraphQLOutputType,
    parentType?: GraphQLCompositeType,
    schema?: GraphQLSchema,
    fragments: { [fragmentName: string]: FragmentDefinition },
    rootValue: any,
    operation: OperationDefinition,
    variableValues: { [variableName: string]: any },
}
  
type GraphQLFieldResolveFn = (
    source?: any,
    args?: {[argName: string]: any},
    context?: any,
    info?: GraphQLResolveInfo
  ) => any;

const isAuth = async (agr_id : string, context_ : any) => {
    let o = agr_id; let b = null;
    let x = context_.rawHeaders.findIndex(a => a === "authentification");
    //let y = context_.rawHeaders.findIndex(b => b === "authorization");
    if (context_.rawHeaders[x + 1] == o){
        b = true;
    }else{
        b = false;
    }
    return b;
}

const uniqueUser = async(args : any, context : any, info: any) => {
    try{
        const v = isAuth(args.id, context);
        if (!v){return "err";}

        let f : any[] = [];
        f = info.fieldNodes[0].selectionSet.selections.map((field : any) => {
            if(field.name.value !== "password" || field.name.value !== "admin" || field.name.value !== "email" ){
                return field.name.value
            }
        })
        const i =  await User.findById(args.id, f.join(' '));
        return(i);
    }catch(err){
        return "err"
    }

}

// OLD RESOLVER !!!
const oldWhoFollowsYou : GraphQLFieldResolveFn = async(args : any) => {
    try{
        const u_F: usr = await User.findById(args.id).select('followings_Ids').select('followers_Ids').select('blockedUsers');
        const f_F: string[] = u_F.followers_Ids.filter((F : any) => !u_F.followings_Ids.includes(<never>F) && !u_F.blockedUsers.includes(F) );
        if (u_F.followers_Ids.length > 1){
            const cmpl_usr_fll = await Promise.all( f_F.map(async (eF : any) => {
                var fetchedUser =  await User.findById(eF).select('imageUrl').select('mediumBadge').select('nitroBadge').select('nom').select('prenom').select('verified').select('pseudo').exec();
                return(fetchedUser)
            }));
            if (f_F.length < 4){
                var p_A : usr[] = [];
                var lL : number = 8 - f_F.length ;
                for (var i = 0; i < u_F.followers_Ids.length; i++) {
                    if (p_A.length < lL){
                        const aF_ofF : usr =  await User.findById(u_F.followers_Ids[i]).select('followings_Ids');
                        for (var e = 0; e < aF_ofF.followings_Ids.length; e++) {
                            const usr_ : usr = await User.findById(aF_ofF.followings_Ids[e]).select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('nitroBadge').select('mediumBadge');
                            if(f_F.includes(usr_.id) == false){
                                if (usr_._id != args.id){
                                    if (u_F.followings_Ids.includes(<never>usr_._id) == false && !u_F.blockedUsers.includes(usr_._id)){
                                        const isId = (element : any) => element.pseudo == usr_.pseudo;
                                        if (p_A.findIndex(isId) == -1){
                                            p_A.push(usr_);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                return(cmpl_usr_fll.concat(p_A));
            }   
            var fltr_f : usr[] = [];
            (cmpl_usr_fll.map((aUser) => {
                let ix : number = fltr_f.findIndex((usr : usr) => usr._id === aUser._id);
                if (ix === -1){ fltr_f.push(aUser);}
            }));
            return(fltr_f);
        }else{
            const randm_U : usr[] = await User.find({ _id :  { $ne: args.id }}).select('imageUrl').select('nom').select('prenom').select('nitroBadge').select('verified').select('pseudo').select('mediumBadge').sort({ followers: -1}).limit(15);
            return((randm_U.filter((us_: usr) =>
                u_F.followings_Ids.includes(<never>us_._id) == false
            )))
        }
    }catch(err){
        throw err
    }
}

const whoFollowsYou : GraphQLFieldResolveFn = async(args: any, context : any) => {
    try{
        const v = isAuth(args.id, context);
        if (!v){return "err";}

        //type usr_ff = usr && Array=<string | 0>
        const u_F : usr = await User.findById(args.id).select('followings_Ids').select('followers_Ids').select('blockedUsers');
        const f_F : string[] = u_F.followers_Ids.filter((f_ : string) => !u_F.followings_Ids.includes(<never>f_) && !u_F.blockedUsers.includes(f_) );
        if (u_F.followers_Ids.length > 1){
            const cmp_UsFl_ : usr[] = await Promise.all( f_F.map(async (e_F: string) => {
                var fe_U : usr =  await User.findById(e_F).select('imageUrl').select('mediumBadge').select('nitroBadge').select('nom').select('prenom').select('verified').select('pseudo').exec();
                return(fe_U);
            }));

            if (cmp_UsFl_.length < 4){
                const p : Array<usr> = await User.find( {$and: [ {_id : {$nin : f_F}}, {_id : {$ne : args.id}}]}).limit(2).select('imageUrl').select('mediumBadge').select('nitroBadge').select('nom').select('prenom').select('verified').select('pseudo');
                p.map((user : usr) => {
                    let m  : number = cmp_UsFl_.findIndex(s => s._id === user._id);
                    if (m == -1){cmp_UsFl_.push(user);}
                })
            }   
            return cmp_UsFl_;
        }else{
            const rand_Us = await User.find({ _id :  { $ne: args.id }}).select('imageUrl').select('nom').select('prenom').select('nitroBadge').select('verified').select('pseudo').select('mediumBadge').sort({ followers: -1}).limit(12);
            return((rand_Us.filter((user: usr) =>
                u_F.followings_Ids.includes(<never>user._id) == false
            )))
        }
    }catch(err){
        return "err"
    }
}

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

const ReturnCommentsofPost = async(args : any) => {
    try{
        const cmnts_ : pst = await Post.findById(args.id).select('comments');
        const cmnts_L : cm_[] = cmnts_.comments;
        return cmnts_L.map(async (e_C : cm_) => {
            var fU : usr =  await User.findById(e_C.commenterId).select('mediumBadge').select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('nitroBadge');
            return{
                comment: e_C,
                user: fU 
            }
        })
    }catch(err){
        return "err"
    }
}

const SpecificPostComments = async(args : any) => {
    try{
        const cmnts_ : pst = await Post.findById(args.id).select('comments');
        const cmnts_l : cm_[] = cmnts_.comments;
        const sPc : Array<{comments: Array<{comment: cm_, user ?: usr}> }> = [];
        await Promise.all(cmnts_l.map(async (e_C : cm_) => {
            var fetchedUser =  await User.findById(e_C.commenterId).select('mediumBadge').select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('nitroBadge').exec();

            if (((e_C as cm_).replyTo as string).length < 2){ 
                const commentObj = [{
                    comment : e_C,
                    user :  fetchedUser
                }]
                sPc.push({comments: commentObj})
                return
            }

            await Promise.all(sPc.map(async (ePc : {
                comments: Array<{
                    comment: cm_;
                    user?: usr;
                }>; }, index ) => {
                    if (ePc.comments[0].comment.id == e_C.replyTo) {
                        sPc[index].comments.push({
                            comment: e_C,
                            user: fetchedUser
                    })
                        return
                    }
            }))
        }))
        return(sPc);
    }catch(err){
        return "err"
    }
}


const GetUserForumPosts : GraphQLFieldResolveFn = async (args : any, context : any) => {
    try{
        const v : Promise<boolean> = isAuth(args.id, context);
        if (!v){return "err";}

        const fet_p : pst[] = await Post.find({userId: args.id });
        return fet_p.map(async (eP : pst) => { 
            var id : string = new ObjectId(eP.userId);
            var us_v : usr = await User.findById(id).select('mediumBadge').select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('nitroBadge').exec();
            return {
                post: eP, user: us_v
            }
        });
    }catch(err){
        return "err"
    }
}

const GetUserAlternativePosts : GraphQLFieldResolveFn = async (args : any) => {
    if(!ObjectID.isValid(args.id))
        return 'err'

    try{
        const r_V : pst[] = await Post.find( {$or: [
            { userRetweets: { $regex: args.id} },
            { usersLiked: { $regex: args.id} },
        ]});
        return r_V.map(async (x : pst) => {
            const us_I : usr = await User.findById(x.userId).select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('nitroBadge').select('mediumBadge');
                return{
                    post : x,
                    user: us_I
                };   
        })    
    }catch(err){
        return "err"
    }

}

const ForumPostsQuery : GraphQLFieldResolveFn  = async () => {//// 
    try{
        
        const f_P : pst[] = await Post.find().limit(45).sort({ createdAt: -1});
        var usrs_D : Array<string | usr>= [];
        f_P.forEach((pst : pst) => {if (!usrs_D.includes(pst.userId)){usrs_D.push(pst.userId) }
        else if ((pst.comments.length > 0 && (!usrs_D.includes(pst.comments[pst.comments.length - 1].commenterId ) )) ){
            usrs_D.push(pst.comments[pst.comments.length - 1].commenterId);
        } });
        for (let i = 0; i < usrs_D.length; i ++){
            const b :usr = await User.findById(usrs_D[i]).select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('nitroBadge').select('mediumBadge').select('biography');
            usrs_D[i] = b;
        }
        return f_P.map(async eachPost => { 
            //var idToSearch = new ObjectId(eachPost.userId);
            let usV_i : number =  usrs_D.findIndex((usr_) => (<usr>usr_)._id.toString() === eachPost.userId);
            let tCi : number =  usrs_D.findIndex(usr_ => (<usr>usr_)._id.toString() === eachPost.comments[eachPost.comments.length - 1]?.commenterId );
            let tC  : string | usr | null = eachPost.comments.length > 0 ? usrs_D[tCi] : null;
            return {
                post: eachPost,
                user: usrs_D[usV_i],
                t_C : tC
            }
        });
    }catch(err){
        console.log(err);
        return "err"
    }
}

const resolvePersonnalPosts : GraphQLFieldResolveFn  = async(args : any) => {///
    if(!ObjectID.isValid(args.id))
        return 

    try{
        const us_F_ids : usr = await User.findById(args.id).select('followings_Ids');
        var nw_Ar : usr[] =[];
        for (let i = 0; i < us_F_ids.followings_Ids.length; i++){
            if (us_F_ids.followings_Ids[i] === args.id){
                us_F_ids.followings_Ids[i] = '';
            }else{
                const user_ : usr = await User.findById(us_F_ids.followings_Ids[i]).select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('nitroBadge').select('mediumBadge').select('biography');
                nw_Ar[i] = user_;
            }
        }
        const fp_ : pst[] = await Post.find({userId : {$in: us_F_ids.followings_Ids } } ).sort({ createdAt: -1});
        nw_Ar = nw_Ar.filter(usr => usr);
        
        const i : Array<{post ?: pst, user : usr, t_C ?: usr | null}> = await Promise.all(fp_.map(async (e_p : pst) => { 
            var ix : number = nw_Ar.findIndex((usr) => usr?._id.toString() === e_p.userId);
            var tcI : number = nw_Ar.findIndex((usr) => usr?._id.toString() ===  e_p.comments[e_p.comments.length - 1]?.commenterId);
            let tC : usr | null = e_p.comments.length > 0 ? nw_Ar[tcI] : null; 
            return {
                post: e_p,
                user:  nw_Ar[ix],
                t_C : tC
            }
        }));
        return i;
    }catch(err){
        return "err"
    }
}

const resolveForumTrends  : GraphQLFieldResolveFn = async (args : any) => {
    // if(!ObjectID.isValid(args.id) && args)
    //     return 'Unauthorized'
    try{
        var n_P : pst[] | Array<string> | Array<{hashtags : string[]}> | any = [];
        if (args){
            const UserFlwngIds = await User.findById(args.id).select('followings_Ids');
            let e : pst[] = await Post.find().select('hashtags').select('userId').then((psts_ : pst[]) => {
                    psts_.map(async (x : any) => {
                        if (UserFlwngIds.followings_Ids.includes(x.userId) == true){
                            (n_P as any) =  n_P.concat(x.hashtags); 
                        }
                })
            })
        }else{
            n_P  = await Post.find({hashtags: {$ne : [] }}).select('hashtags');
        }
        var al_T  : any[] = [];
        var tags_Stat_ : any = {};
        (n_P as  Array< {hashtags : string[]}>).map(async eachPostHashtags => {
            var e : any =  eachPostHashtags.hashtags;
            if (args){
                e  = eachPostHashtags;
            }
            if (e.length > 0){
                al_T =  al_T.concat(e);
            }
        });
        al_T.forEach(tag => {
        if (!tags_Stat_.hasOwnProperty(tag) ){
                tags_Stat_[tag] = 1;
        }else{
                tags_Stat_[tag] = (tags_Stat_[tag] + 1);
        }
        })
        al_T = [];
        for (const [key, value] of Object.entries(tags_Stat_)) {
            al_T.push({
                    trendName: key,
                    trendCount: value
                })        
        }
        al_T = al_T.sort((tr1 , tr2) => (tr1.trendCount < tr2.trendCount) ? 1 : (tr1.trendCount > tr2.trendCount) ? -1 : 0);
        al_T = al_T.slice(0,6);
        //console.log(allTags);
        return (al_T);
    }catch(err){
        return err
    }

}

const resolveUserFollows : GraphQLFieldResolveFn  = async (args : any, context : any) => {
    if(!ObjectID.isValid(args.id) )
            return ("error")

    try {
        const v : Promise<boolean> = isAuth(args.id, context);
        if (!v){return "err";}

        const usrsFlwTyp_ : {f1: usr[], f2 : usr[]} = {
            f1 : [],
            f2: []
        };
        const fl_fg : usr = await User.findById(args.id).select('followings_Ids').select('followers_Ids');
        await Promise.all(fl_fg.followings_Ids.map(async (usr_id : string) => {
            const us_d : usr = await User.findById(usr_id).select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('biography').select('nitroBadge').select('mediumBadge');
            usrsFlwTyp_.f1.push(us_d);
        }));
        await Promise.all(fl_fg.followers_Ids.map(async (usr_id : string) => {
            const us_d :usr = await User.findById(usr_id).select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('biography').select('nitroBadge').select('mediumBadge');
            usrsFlwTyp_.f2.push(us_d);
        }));     
        return(usrsFlwTyp_);
    } catch (error) {
        return "err"
    }

}


const resolveExplore = async (args : any) => {
    if(!ObjectID.isValid(args.id))
        return 'Unauthorized'

    try{
        const usrPfrls : usr[] = await User.find({"id" : {$ne :  args.id}}).limit(40).sort({ createdAt: -1}).select('imageUrl').select('profileBanner').select('nom').select('prenom').select('verified').select('pseudo').select('biography').select('postsCount')
        .select('followers').select('followers_Ids').select('followings_Ids').select('nitroBadge').select('mediumBadge');
        //-------------------------------
        var pst_of_thWk : pst[] | Array <{post: pst, user : usr}> = await Post.find({ createdAt: {
                $gte: new Date(moment().subtract(20, 'w')),
                 $lt:  new Date(moment())
        } }).sort({ likes: -1}).limit(40).select('likes').select('retweets').select('comments').select('description');
        var slctd_pst_offWk : any = {"count": 0, "id" : ""};
        (<pst[]>pst_of_thWk).forEach((post) => {
            let count = post.likes + post.retweets + post.comments.length;
            if (count > slctd_pst_offWk.count){
                slctd_pst_offWk.count = count; slctd_pst_offWk.id = post._id;
            }
        })
        slctd_pst_offWk = await Post.findById(slctd_pst_offWk.id);
        const usrOfTheWeek = await User.findById(slctd_pst_offWk.userId).select('pseudo').select('nom').select('prenom').select('verified').select('imageUrl').select('nitroBadge').select('mediumBadge');
        pst_of_thWk = [{post : slctd_pst_offWk,user : usrOfTheWeek}];
        //-------------------------------
        const media_Psts : pst[] = await Post.find({"imageUrl" :{$gte: 1} }).limit(30).sort({ createdAt: -1});
        const users : string[] |  usr[]  = [];
        await Promise.all(media_Psts.map((post: pst) =>{ if (!(<string[]>users).includes(post.userId)) {(<string[]>users).push(post.userId)} }));
        await Promise.all(users.map(async (user, index) => {users[index] = await User.findById(user).select('pseudo').select('nom').select('prenom').select('verified').select('imageUrl').select('nitroBadge').select('mediumBadge')  }));
        const media_Psts_cmpltd : Array<{post : pst, user: usr  |string}> = await Promise.all(media_Psts.map((post : pst, index : number) => {
            let user_ : number = (<usr[]>users).findIndex((usr) => (usr)._id.toString() === post.userId);
            return { 
                post : post,
                user: users[user_]
            }
        }));
        //-------------------------------
        const filtr_Tr : Array<{trendName : string, trendCount : number}> = [];
        const trends = await Post.find({"hashtags" : { $ne: [] } }).select("hashtags");
        await Promise.all(trends.map((Trend : any )=> {
            Trend.hashtags.forEach((aHashtg : string) => {
                if (aHashtg.length > 0){
                    const isD: number = filtr_Tr.findIndex((fltrdTrend) => fltrdTrend.trendName == aHashtg );
                    if (isD === -1){
                        filtr_Tr.push({
                            trendName: aHashtg,
                            trendCount : 1
                        })
                        return
                    }      
                    filtr_Tr[isD].trendCount ++;
                }
            })
        }));
        return ({
            trends : filtr_Tr,
            profiles : usrPfrls,
            pinnedPost : pst_of_thWk[0],
            mediaPosts: media_Psts_cmpltd
        })
    }catch(err){
        return "err"
    }

}



const resolveBookmarks = async (args : any, context : any) => {
    try{
        const v = isAuth(args.id, context);
        if (!v){return "err";}

        const fetch_bm = await User.findById(args.id).select('bookmarks');
        var usts_Pst_d : usr[] |  string[] = [];
        var posts : pst[] =  await Promise.all(fetch_bm.bookmarks.map(async (ep_id : string) => { 
            let f_p : pst = await Post.findById(ep_id);
            if (!f_p){return null}
            var idToSearch:string = new ObjectId(f_p.userId);
            if (!(<string[]>usts_Pst_d).includes(idToSearch)){(<string[]>usts_Pst_d).push(idToSearch);}
            return { f_p}
        }));
        usts_Pst_d = await Promise.all(usts_Pst_d.map(async userId => {
            var userValue :usr = await User.findById(userId).select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('nitroBadge').select('mediumBadge').exec();
            return userValue;
        }));
        posts = await Promise.all(posts.filter(post => post !== null));
        type pst_p = pst & {fetchedPost : pst};
        const i : Array<{post : pst_p | pst, user : usr | string}> = posts.map(post => {
            let index : number = (<usr[]>usts_Pst_d).findIndex(user => user._id.toString() === (<pst_p>post).fetchedPost.userId);
            return{
                post : (<pst_p>post).fetchedPost,
                user : usts_Pst_d[index]
            }
        })
        return i;
    }catch(err){
        return "err"
    }
}

const resolveLiveChatUsers = async () => {
    try{
        const fe_u : usr[] = await User.find().select('id').select('imageUrl').select('nom').select('prenom').select('pseudo').select('followers').select('nitroBadge').select('mediumBadge')
        .select('followings').select('retweets').select('profileBanner').select('channelsCount').select('postsCount').select("verified").select('createdAt').select('biography').select('fadeValues').select('profileFade').sort({ createdAt: -1});
        return fe_u;
    }catch(err){
        return "err"
    }
}
const resolveSpecificTrendPosts = async (arg:  any) => {
    try{
        const fe_p : pst[] = await Post.find({"hashtags" : {$eq: arg.trend}}).sort({ createdAt: 1});
        var usrs_D_ :  any[] = [];
        fe_p.forEach((pst : pst) => {if (!usrs_D_.includes(pst.userId)){usrs_D_.push(pst.userId) }
        else if ((pst.comments.length > 0 && (!usrs_D_.includes(pst.comments[pst.comments.length - 1].commenterId ) )) ){
            usrs_D_.push(pst.comments[pst.comments.length - 1].commenterId);
        } });
        for (let i = 0; i < usrs_D_.length; i ++){
            const b : usr = await User.findById(usrs_D_[i]).select('imageUrl').select('nom').select('prenom').select('verified').select('pseudo').select('nitroBadge').select('mediumBadge').select('biography');
            usrs_D_[i] = b;
        }
        return fe_p.map(async eachPost => { 
            var indexUsr = usrs_D_.findIndex((usr) => usr?._id.toString() === eachPost.userId);
            var tcI  : number = usrs_D_.findIndex((usr) => usr?._id.toString() ===  eachPost.comments[eachPost.comments.length - 1]?.commenterId);
            let tC : usr | null = eachPost.comments.length > 0 ? usrs_D_[tcI] : null; 
            return {
                post: eachPost,
                user: usrs_D_[indexUsr],
                t_C : tC
            }
        });
    }catch(err){
        return "err"
    }
}


var root = {
    allPosts: () => Post.find(),
    getUser: (args : any, context : any, info : any) => uniqueUser(args, context, info),
    
    forumPosts: () => ForumPostsQuery(),
    specificTrendPost: (args : any) => resolveSpecificTrendPosts(args),
    followingsPosts: (args : any) => resolvePersonnalPosts(args),

    whoFollowsYou: (args : any, context : any) => whoFollowsYou(args, context),
    getPostComments: (args : any) => ReturnCommentsofPost(args),
    specificPostComments: (args : any) => SpecificPostComments(args),

    userForumPosts: (args : any, context : any) => GetUserForumPosts(args, context),
    userAlternativePosts: (args : any) => GetUserAlternativePosts(args),

    forumTrends: () => resolveForumTrends(Promise<unknown>),
    personalTrends: (args : any) => resolveForumTrends(args),

    userFollows: (args : any, context : any) => resolveUserFollows(args, context),

    explore: (args : any) => resolveExplore(args),

    getUserBookmarks: (args : any, context : any) => resolveBookmarks(args, context),

    getLiveChatUsers: () => resolveLiveChatUsers(),
    
}

module.exports = root
