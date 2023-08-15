const express = require("express");
const router = express.Router();
const channelController = require('../controllers/channelController');
const {rateLimiterMiddleware, rateLimitSecond} = require('../middleware/rateLimiter');
const jwtAuth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const  rateLimit = require('express-rate-limit');

const msgLimits = rateLimit({
	windowMs: 10 * 60 * 1000, // 
	max: 150, // 
	message:
		'Try Again Later',
	standardHeaders: true, 
	legacyHeaders: false, 
})

router.get("/homeDiscover/", channelController.homeDiscover);
router.post("/initiate/", upload.uploadChannelPic, upload.uploadCloud, jwtAuth.checkToken, channelController.initiateChanel);
router.post("/availableChannels/:id",jwtAuth.checkToken, channelController.getAvailableChannels);
router.post("/:id",jwtAuth.checkToken, channelController.getChannel);

router.post("/sendMessage/:id",msgLimits, jwtAuth.checkToken, channelController.sendMessage);
router.post("/pinMessage/:id", jwtAuth.checkToken, channelController.pinMessage);


router.get("/discover/", jwtAuth.checkToken, channelController.discover);
router.post("/join/:id", jwtAuth.checkToken, channelController.joinChannel);
router.post("/invite/:id", jwtAuth.checkToken, channelController.invite);
router.post("/getFriendsInvites/:id", jwtAuth.checkToken, channelController.getFriendsInvites);

router.post("/editChannelGif/:id", upload.gifUpload, upload.gifUploadCloud, jwtAuth.checkToken, channelController.editChannelBannerPicture);
router.post("/editChannelPicture/:id", upload.uploadChannelPic, upload.uploadCloud, jwtAuth.checkToken, channelController.editChannelBannerPicture);
router.post("/editChannel/:id", jwtAuth.checkToken, channelController.editChannelInformations);

router.post("/createRole/:id", jwtAuth.checkToken, channelController.createRole);
router.post("/editRole/:id", jwtAuth.checkToken, channelController.modifyRole);
router.post("/assignRole/:id", jwtAuth.checkToken, channelController.assignRole);

router.post("/banMember/:id", jwtAuth.checkToken, channelController.banMember);
router.post("/kickMember/:id", jwtAuth.checkToken, channelController.kickMember);
router.post("/unbanMember/:id", jwtAuth.checkToken, channelController.unbanMember);

//router.use(rateLimitSecond);
module.exports = router;
