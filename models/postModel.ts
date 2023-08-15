const mongoose = require('mongoose');
const postSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxLength: 751,
        },
        imageUrl: {
            type: String,
            default: " ",
            required: true
        },
        likes:{
            type: Number,
            default: 0,
            min: 0
        },
        reports:{
            type: Number,
            default: 0,
            min: 0,
            max: 200
        },
        usersLiked:{
            type: [String],
            default: [],
        },

        retweets:{
            type: Number,
            default: 0,
            min: 0
        },
        userRetweets:{
            type: [String],
            default: []
        },

        comments: {
            type: [
                {
                    postId: String,
                    commenterId: String,
                    text: String,
                    likes: [String],
                    replyTo : String,
                    timestamp: Number
                }
            ],
            required: true,
        },  
        community:{
            type: String,
            default: "Main_Community",
            required: true,
        },
        hashtags:{
            type: [String],
            default: [], 
            maxLength: 12
        },
        mentions:{
            type: [{
                _id: String,
                pseudo: String,
            }],
            default: [], 
            maxLength: 8
        },
        bookmarksCount:{
            type: Number,
            default: 0,
            min: 0,
            max: 500
        },
        
    },{
        timestamps: true
    }
);



const postModel = mongoose.model("post", postSchema);
module.exports = postModel;