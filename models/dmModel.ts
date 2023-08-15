const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

const dmSchema = new mongoose.Schema(
    { 
        usersIds:{
           type: [String],
           maxLength: 2,
           unique: true,
           required: true 
        },
        messages:{
            type: [{
                    userId :  String, 
                    content: String,
                    timestamp: Number
            }],
            maxLength: 8064,
            default: [] 
        },
        seenState:{
            type: [{
                userId :  String, 
                seen: Boolean,
                unseenMessages: Number
            }],
            maxLength: 2,
            required: true 
         },
        length: {
            type: Number,
            default: 0,
            min: 0
        }
    },{
        timestamps: true
    }
);



const dmModel = mongoose.model("dm", dmSchema);
module.exports = dmModel;