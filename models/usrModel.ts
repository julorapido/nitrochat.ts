const sanitizeHtml = require('sanitize-html');
const mongoose: any = require('mongoose');
const bcrypt = require('bcrypt');
// Importation de isEMAIL de la bibliothèque validator
const { isEmail} = require('validator');
var uniqueValidator = require('mongoose-unique-validator');
var sanitize = require('mongo-sanitize');

const userSchema = new mongoose.Schema(
{
    email: {
        type: String,
        unique: true,
        required: true,
        validate: [isEmail],
        lowercase: true,
        maxLength: 1000,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minLength: 6,
        maxLength: 128,
    },
    imageUrl: {
        type: String,
        default: process.env.DEFAULT_USR_PFP,
        maxLength: 5000,
        minLength: 0,
        required: true
    },
    profileBanner: {
        type: String,
        default: process.env.DEFAULT_USR_BNR,
        maxLength: 5000,
        minLength: 0,
        required: true
    }, 
    nom: {
        type: String,
        required: true,
        trim: true,
        minLength: 2,
        maxLength: 24,
    },
    prenom: {
        type: String,
        required: true,
        trim: true,
        minLength: 2,
        maxLength: 24,
    },
    biography: {
        type: String,
        maxLength: 128,
        minLength: 1,
        default: "Nitrochat user biography </>"
    }, 
    pseudo: {
        type: String,
        trim: true,
        maxLength: 28,
        default: " ",
        unique: true
    },
    retweets:{
        type: [String],
        default: []
    },
    authentified:{
        type: Boolean,
        default: false
    },
    
    /// Followers
    followers:{
        type: Number,
        default: 0,
        min : 0
    },
    followers_Ids: {
        type: [
            String
        ],
        default: []
    },

    /// FOLLOWINGs
    followings:{
        type: Number,
        default: 0
    },
    followings_Ids: {
        type: [
            String
        ],
        default: []
    },
    channelsCount:{
        type: Number,
        required: true,
        default: 0,
        min: 0,
        max: 10
    },
    postsCount:{
        type: Number,
        default: 0,
        min: 0
    },
    notifications: {
        type: [{
                emitterId: String,
                notificationType: String,
                postDescription: String,
                postId: String,
                timestamp: Number,
                seen : Boolean,
                archived : Boolean
        }],
        default: [],
        required: true,
        maxLength: 300000,
        minLength: 0
    }, 
    verified:{
        type: Boolean,
        default: false
    },
    country:{
        type: String,
        maxLength: 32,
        default: "",
    },
    profileLink:{
        type: String,
        maxLength: 512,
        minLength: 0,
        default: "",
    },
    city:{
        type: String,
        maxLength: 32,
        default: "",
    },

    bookmarks: {
        required: true,
        type: [
            String
        ],
        default: []
    },

    pinnedConversations: {
        required: true,
        type: [ String],
        maxLength: 256,
        default: []
    },
    blockedUsers: {
        required: true,
        type: [ String],
        maxLength: 128,
        default: []
    },
    notifMutedUsers: {
        required: true,
        type: [ String],
        maxLength: 128,
        default: []
    },
    reports:{
        type: [String],
        default: 0,
        maxLength: 128,
    },
    nitro:{
        type: Number,
        default: 0,
        min: 0,
        max: 5000000
    },
    interactions:{
        type: Number,
        default: 0,
        min: 0,
        max: 5000000
    },
    channelsCreated: {
        type: [ String],
        maxLength: 128,
        default: []
    },
    nitroUnlocks: {
        type: {
                longerMessages: Boolean,
                postVideos: Boolean,
                mediumBadge: Boolean,
                gradientProfile: Boolean,
                channelsThemes: Boolean,
                animatedPfp: Boolean,
                animatedBanner: Boolean,
                animatedChannels: Boolean,
                nitroBadge: Boolean,
        },
        default: {
            longerMessages: false,
            postVideos: false,
            mediumBadge: false,
            gradientProfile: false,
            channelsThemes: false,
            animatedPfp: false,
            animatedBanner: false,
            animatedChannels: false,
            nitroBadge: false,
        },
        required: true,
    }, 
    mediumBadge:{
        type: Boolean,
        default: false
    },
    nitroBadge:{
        type: Boolean,
        default: false
    },
    profileFade:{
        type: Boolean,
        default: false
    },
    fadeValues:{
        type: [String],
        default: ["", ""],
        maxLength: 2,
        minLength: 0
    },
},
{
    timestamps: true
}
);

// play function before save into DB
userSchema.pre("save", async function (next : any){
    this.prenom = this.prenom.replaceAll(/\s/g,'');
    this.nom = this.nom.replaceAll(/\s/g,'');
    const salt = await bcrypt.genSalt(20);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.statics.login = async function(email : any, password : any) {
     //email = sanitizeHtml(email);
    //password = sanitizeHtml(password);
    const user = await this.findOne({email}).select('password').select('nom').select('authentified');
    if (user){
        if (!user.authentified){
            throw Error('verify first');
        }
        const auth = await bcrypt.compare(password, user.password);
        if (auth){
            return user;
        }
        throw Error('incorrect password');
    }
    throw Error('incorrect email');
}



userSchema.plugin(uniqueValidator);
const UserModel : any = mongoose.model('user', userSchema);
module.exports = UserModel;