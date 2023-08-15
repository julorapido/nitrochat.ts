const rateLimit = require('express-rate-limit');
const rateLimiter = require('./middleware/rateLimiter');
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const channelRoutes = require('./routes/channelRoutes');
const postRoutes = require('./routes/postRoutes');
const authMiddleware = require('../back/middleware/authMiddleware');
const ObjectID = require("mongoose").Types.ObjectId;
const UserModel = require('./models/userModel');
const ChannelModel = require('./models/channelModel');
const channelController = require('./controllers/channelController');
const mongoSanitize = require('express-mongo-sanitize');
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');
const validator = require('validator');
const cors = require('cors');
import { Request, Response, NextFunction } from 'express';

//const { RateLimiterMemory } = require('rate-limiter-flexible');
// const rateLimiterrr = new RateLimiterMemory(
//   {
//     points: 5, // 5 points
//     duration: 10, // per second
//   });
//const passport = require("passport");
cloudinary.config({
  secure: true,
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});
//console.log(cloudinary.config());


var BadWords = require('bad-words');
const frenchBadwords = require('french-badwords-list');

var http = require('http');

var cookieParser = require('cookie-parser')

require('dotenv').config({path: './config/.env'});
require('./config/db');
const app = express();

var whitelist = [process.env.CLIENT_URL];
var corsOptions = {
  origin: function (origin : any, callback : any) {
 //   console.log(origin);
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback("Cors No Origin Block.", false);
    }
  }
}

app.use(cors(corsOptions));
console.log(`Cors Origin ${process.env.CLIENT_URL}`);



////////////////////////////////////////////////////////////////////////



//app.use(express.static(__dirname + '/public'));
//app.use('/uploads', express.static('uploads'));
app.use(express.json({ limit: "8000kb" }));

app.use(cookieParser());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


/////////////////////////////////// GQL ////////////////////////////////////
var { graphqlHTTP } = require('express-graphql');
const schema = require('./graphql/schema');
const res0lvers = require('./graphql/resolvers');

app.use('/api/graphql', authMiddleware.checkToken);
app.use('/api/graphql',
  graphqlHTTP({
    schema: schema,
    rootValue: res0lvers,
  }),
);
// app.use('/api/graphql', (req,res) => {
//     return graphqlHTTP({context: { req, res }, })(req,res);
//   }
// );
console.log(`GraphQL API server on port ${process.env.PORT}`)


//get request to check access to api
app.get('/', function (req: Request, res) {
  res.send('GET request to the homepage');
}); 

// RATE LIMIT ++ //
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 
	max: 400, //o 500 requests per `window`
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Your limit exceeded"
});
app.use(rateLimiter.rateLimiterMiddleware);
app.use('*',apiLimiter)
//app.set('trust proxy', numberOfProxies)

///////////////////

app.use(mongoSanitize());
app.use('/api/auth', authRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/post', postRoutes);
app.use('/api/channel', channelRoutes);



var server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server,  {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["*"]
  },
 });
 

// server.listen(process.env.SOCKET_PORT, () => {
//   console.log(`Listening Socket on port ${process.env.SOCKET_PORT}`);
// })

// io.listen(process.env.SOCKET_PORT);
// console.log(`Listening Socket on port ${process.env.SOCKET_PORT}`);

server.listen(process.env.PORT , () => {
  console.log(`Listening on port ${process.env.PORT}`);
  console.log(`Listening Socket on port ${process.env.PORT}`);
})


io.use((socket : any, next : any) => {
  const username = socket.handshake.auth.userId;
  const tokenJwt = socket.handshake.auth.jwt;
  //console.log(socket);
  if (!tokenJwt){
    return next(new Error("Unauthorized"));
  }
  const decodedToken = jwt.verify(tokenJwt, process.env.TOKEN_SECRET);    

  //console.log(decodedToken);
  if (!username ||  !tokenJwt || (!ObjectID.isValid(username)) || (decodedToken.userId !== username)  || !validator.isJWT(tokenJwt)) {
    return next(new Error("Unauthorized"));
  }
  socket.username = username;
  next();
});




//--CONNECTIONS--//
const users : string[] =  [];
io.on("connection", (socket : any) => {
  socket.on("connect_error", (err : any) => {
    console.log(`connect_error due to ${err.message}`);
  });

  const rooms = io.of('/').adapter.rooms; 
  for (let [id, socket] of io.of("/").sockets) {
    if (users.includes(socket.username) == false){
      users.push( socket.username);
    }
  }
  socket.emit("users", users);
  socket.broadcast.emit("userConnected",socket.username);

  socket.on('disconnect', function() {
      //console.log('Got disconnect!');
      var i = users.indexOf(socket.username);
      users.splice(i, i + 1);
      socket.broadcast.emit("users",users);
  });

    // socket.on('bcast', async (data) => {
    //   console.log(data);
    //   try {
    //     await rateLimiterrr.consume(socket.handshake.address); // consume 1 point per event from IP
    //     socket.emit('news', { 'data': data });
    //     socket.broadcast.emit('news', { 'data': data });
    //   } catch(rejRes) {
    //     // no available points to consume
    //     // emit error or warning message
    //     socket.emit('blocked', { 'retry-ms': rejRes.msBeforeNext });
    //   }
    // });

});

const dmNamespace = io.of("/dm");
dmNamespace.on("connection", (socket : any) => {
  console.log("dm connextion " + socket.username);
  socket.on("privateMessage", ({ content, to, from } : {content : any, to : string, from : string}) => {
    console.log("dm sent " + content);
    for (let [id, socket] of dmNamespace.sockets) {
      if (to === socket.username){
        dmNamespace.to(id).emit("privateMessage", {
          content: content,
          from: from,   
        });
      }}
  });
})


interface channelRoom {
  channelId : string,
  vocalRoom: string[],
  facetimeRoom : string[],

  vocalSignals?: string[],
  facetimeSignals?: string[]
}
const channelsRooms : channelRoom[] = [];
const channelNamespace = io.of("/channel");

module.exports.liveBotMessages = (msgContent : any, channelId : any, senderId : any) => {
  channelNamespace.to(channelId).emit("channelMessage", {
    content: msgContent,
    concernedChannel: channelId,
    from: senderId
  });
}


module.exports.liveUsersUpdate = (channelId : any) => {
    channelNamespace.to(channelId).emit("channelUsersUpdate", {
      channelId: channelId
    });
    channelNamespace.to(channelId).emit("channelSound", 0);
}

module.exports.punishSound = (channelId : any, nmbr : any) => {
  channelNamespace.to(channelId).emit("channelSound", nmbr);
}

channelNamespace.use((socket : any, next : any) => {
  const channelName = socket.handshake.auth.channelId;
  const userName = socket.handshake.auth.userId;

  console.log("channl connection " + socket.handshake.auth);
 // console.log(socket.handshake.auth);
  if (socket.handshake?.auth?.jwt){
    const decodedToken = jwt.verify(socket.handshake?.auth?.jwt, process.env.TOKEN_SECRET);    
    if(decodedToken.userId !== userName){
      console.log("1st trigger");
      return next(new Error("Unauthorized"));
    }
  }else{
    console.log("2nd trigger");
    return next(new Error("Unauthorized"));
  }

  if (!channelName || !ObjectID.isValid(userName) || !ObjectID.isValid(channelName)) {
    console.log("3rd trigger");
    return next(new Error("Unauthorized"));
  }

  socket.userName = userName;
  socket.channelName = channelName;
  next();
});

channelNamespace.on("connection", (socket : any) => {
  const rooms = channelNamespace.adapter.rooms; 

  const disconnect = (socket : any) => {
    const index : number = channelsRooms.findIndex(room => {
      if (room.channelId === socket.channelName){return true;}
    });
    
    if (!channelsRooms[index]?.facetimeRoom || !channelsRooms[index]?.vocalRoom){
        return 0;
    }
   // var vocalIndx = channelsRooms[index]?.vocalRoom.indexOf(socket.userName);
    var vocalIndx = channelsRooms[index]?.vocalRoom.findIndex(roomUser => {if ((roomUser).user_id === socket.userName){return true;}});
    
    //var facetimeIndx = channelsRooms[index]?.facetimeRoom.indexOf(socket.userName);
    var facetimeIndx = channelsRooms[index]?.facetimeRoom.findIndex(roomUser => {if (roomUser.user_id === socket.userName){return true;}});

    if (vocalIndx !== -1 || facetimeIndx !== -1){
      var splceIndex = facetimeIndx;
      if (vocalIndx !== -1){
        splceIndex = vocalIndx;
      }
      if (splceIndex > 0 ){
        splceIndex = (splceIndex - 1);
      }  
      channelNamespace.to(socket.channelName).emit("channelSound", -1);
      channelNamespace.to(socket.channelName).emit("leaveCall", {
          from: socket.userName,
          signalIndex: splceIndex
      });
    }

    channelsRooms[index].vocalRoom.splice(vocalIndx, vocalIndx + 1);
    channelsRooms[index].facetimeRoom.splice(facetimeIndx, facetimeIndx + 1);
    channelNamespace.to(socket.channelName).emit("channelCallsData",channelsRooms[index]);

    const facetimeIndex : number | undefined =  channelsRooms[index]?.facetimeSignals?.findIndex(signal => {if (signal?.signalerId === socket.channelName){return true;}});
     
    const vocalIndex : number | undefined =  channelsRooms[index]?.vocalSignals?.findIndex(signal => {if (signal?.signalerId === socket.channelName){return true;}});

    if (vocalIndex !== -1){
      channelsRooms[index].vocalSignals?.splice(vocalIndex as number, (vocalIndex as number) + 1);
    }
    if (facetimeIndex !== -1){
      channelsRooms[index].facetimeSignals?.splice( (facetimeIndex as number), (facetimeIndex as number) + 1);
    }
  };

  socket.on('disconnect', function() {
    disconnect(socket);
  }); 
  socket.on('leaveCall', function() {
    disconnect(socket);
  }); 

  socket.on('joinChannel', ( {leaveChannelId, channelId} : {leaveChannelId : string, channelId : string}) => {

    if (!ObjectID.isValid(leaveChannelId) && leaveChannelId || !ObjectID.isValid(channelId) ) {
      return ("Unauthorized");
    }
    socket.leave(leaveChannelId);
    socket.join(channelId);
    const index = channelsRooms.findIndex(room => {
      if (room.channelId === channelId){
        return true;
      }
    })
    if(index === -1){
      channelsRooms.push({
        channelId : channelId,
        vocalRoom: [],
        facetimeRoom : [],

        vocalSignals: [],
        facetimeSignals: [],
      });
      if(channelsRooms[index]){
        channelNamespace.to(channelId).emit("channelCallsData",channelsRooms[index]);
      }
      return 0;
    }
    channelNamespace.to(channelId).emit("channelCallsData",channelsRooms[index]);
  }); 

  socket.on("channelMessage", ({ content, toChannel, from } : {content : string, toChannel : string, from : string}) => {
      var customFilter = new BadWords({ placeHolder: '*'});
      customFilter.addWords(...frenchBadwords.array);
      const filtered = customFilter.clean(content);

      console.log("chann msg sent " + filtered);
      channelNamespace.to(toChannel).emit("channelMessage", {
          content: filtered,
          concernedChannel: toChannel,
          from: from
      });
  });

  socket.on("channelUpdate", ({channelId} : {channelId : string }) => {
    //console.log(channelId);
    channelNamespace.to(channelId).emit("channelUpdate", {
      channelId: channelId
    });
  });

  socket.on('joinCall', async ({ groupToCall, signalData, from, isFacetimeRoom} : {groupToCall: string,signalData : string, from : string, isFacetimeRoom : string}) => {
    const role_perm = await channelController.GetRoleJoinCall(from, groupToCall);
  
    const index = channelsRooms.findIndex(room => {
      if (room.channelId === groupToCall){
        return true;
      }
    });
    var param_ =  "";
    var scnd_param = "";
    if (isFacetimeRoom){
      if (!role_perm?.canFacecam){return 0;}
      param_ = "facetimeRoom";
      scnd_param = "facetimeSignals";
    }else{
      if (!role_perm?.canVocal){return 0;}
      param_ = "vocalRoom";
      scnd_param = "vocalSignals";
    }
  
    if (channelsRooms[index]?.[param_]?.length > 8){
      return "Unauthorized";
    }
    const param_INDEX = channelsRooms[index]?.[param_]?.findIndex(room_user => {
      if (room_user.user_id === from){ return true;}
    })
    if (param_INDEX === -1){
        channelsRooms[index][param_].push({
          "user_id" :from,
          "microphoneMute": false,
          "cameraMute": false,
        });
        const Indx =  channelsRooms[index][scnd_param]?.findIndex(signal => {
          if (signal.signalerId === from){return true;}
        });

        if (Indx == -1){
              channelsRooms[index][scnd_param].push({
                  "signalerId" : from,
                  "signalValue" : signalData
              });
        }else{
          channelsRooms[index][scnd_param][Indx].signalValue = signalData;
        }
    }
    channelNamespace.to(groupToCall).emit("channelCallsData",channelsRooms[index]);
    channelNamespace.to(groupToCall).emit("channelSound", 1);

    var returnSignals : string[] | undefined = [];
    if (isFacetimeRoom){
      returnSignals = channelsRooms[index]?.facetimeSignals;
    }else{
      returnSignals = channelsRooms[index]?.vocalSignals;
    };


    channelNamespace.to(groupToCall).emit("joinCall", {
      presentSignals: returnSignals, 
      from : from,
      groupId : groupToCall,
      signal: signalData
    });
    
}); 

socket.on("streamSetting", ({channelId, roomType,setting, settingValue, from} : 
  {channelId : string, roomType : string, setting : string, settingValue : string, from : string}) => {
  const index = channelsRooms.findIndex(room => {if (room.channelId === channelId){ return true;}});
  const user_index : number = channelsRooms[index][roomType]?.findIndex(room_user => {
      if (room_user.user_id === from){ return true;} })

  channelsRooms[index][roomType][user_index][setting] = settingValue;
  channelNamespace.to(channelId).emit("channelCallsData",channelsRooms[index]);
  });

})

