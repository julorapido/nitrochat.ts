const mongoose : any = require('mongoose');
var uniqueValidator : any = require('mongoose-unique-validator');
import {chn} from '../types/chnTypes';

const liveChannelSchema : chn = new mongoose.Schema(
    { 
        channelName:{
            type: String,
            minLength: 3,
            maxLength: 32,
            unique: true,
            required: true
        },
        usersIds:{
           type: [{
                userId : String, 
                roles: String,
                timestamp: Number
           }],
           maxLength: 512,
           required: true 
        },
        channelRoles: {
            type: [{
                name: String,
                canViewRooms: Boolean,
                canVocal : Boolean, 
                canEditRoles: Boolean,
                canEdit: Boolean,
                canEditPictures: Boolean,
                canFacecam : Boolean, 
                canTextualChat: Boolean,
                canKick: Boolean,
                canPin: Boolean,
                canBan: Boolean,
                canInvite: Boolean,
                color: String,
                timestamp: Number
           }],
           default : [{
            name: "admin",
            canViewRooms: true,
            canEditRoles: true,
            canVocal : true, 
            canFacecam : true, 
            canEdit: true,
            canEditPictures: true,
            canTextualChat: true,
            canKick: true,
            canBan: true,
            canInvite: true,
            canPin: true,
            color: "#ffc400",
            timestamp: new Date().getTime()
            },{
                name: "member",
                canVocal : true, 
                canViewRooms: true,
                canEditRoles: false,
                canFacecam : true, 
                canEdit: false,
                canEditPictures: false,
                canTextualChat: true,
                canKick: false,
                canBan: false,
                canPin: false,
                canInvite: true,
                color: "#84a5bf",
                timestamp: new Date().getTime()
            }],
           maxLength: 24,
           required: true 
        },
        channelPicture: {
            type: String,
            default: "http://localhost:3000/uploads/channels/defaultChannel.png",
            required: true
        },
        channelBanner: {
            type: String,
            default: "http://localhost:3000/uploads/channels/template5.png",
            minLength: 2,
            required: true
        },
        channelDescription: {
            type: String,
            default: "Nitrochat Channel Description",
            minLength: 3,
            maxLength: 256,
            required: true
        },
        messages:{
            type: [{
                    userId :  String, 
                    content: String,
                    timestamp: Number
            }],
            default: [] 
        },
        length: {
            type: Number,
            default: 0,
            min: 0
        },
        generalChannel:{
            type: Boolean,
            default: false
        },
        private:{
            type: Boolean,
            default: false
        },
        fade:{
            type: Boolean,
            default: false
        },
        fadeValues:{
            type: [String],
            default: ["", ""],
            maxLength: 2
        },
        bannedUsers:{
            type: [String],
            default: [],
        },
        pinnedMessages:{
            type: [String],
            default: [],
        },
    },{
        timestamps: true
    }
);



const liveChannelModel = mongoose.model("liveChannels", liveChannelSchema);
module.exports = liveChannelModel;