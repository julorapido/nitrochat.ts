const express = require("express");
const router = express.Router();
const messgController = require('../controllers/messageController');
const jwtAuth = require('../middleware/authMiddleware');
const  rateLimit = require('express-rate-limit');


const msgLimits : any = rateLimit({
	windowMs: 10 * 60 * 1000, //
	max: 200, // 
	message:
		'Try Again Later',
	standardHeaders: true, 
	legacyHeaders: false, 
})

router.post("/initiate/:id",msgLimits,jwtAuth.checkToken, messgController.initiateMessage);
router.get("/:id",jwtAuth.checkToken, messgController.userDms);
router.get("/dm/:id",jwtAuth.checkToken, messgController.specificDM);
router.post("/dm/:id",msgLimits, jwtAuth.checkToken, messgController.sendMessage);
router.get("/unseenMsgs/:id",jwtAuth.checkToken, messgController.getUnseenMessages);
router.post("/pin/:id",jwtAuth.checkToken, messgController.pinConversation);

module.exports = router;