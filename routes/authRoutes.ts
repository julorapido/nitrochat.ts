const  rateLimit = require('express-rate-limit');
const express = require("express");
const router = express.Router();
const authController = require('../controllers/authController');
const notificationMiddleware = require('../middleware/notificationMiddleware');
const upload = require('../middleware/uploadMiddleware');
const jwtAuth = require('../middleware/authMiddleware');

const createAccountLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, //
	max: 15, 
	message:'Try Again Later',
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

const loginLimiter = rateLimit({
	windowMs: 30 * 60 * 1000, // 
	max: 80, // 
	message:
		'Try Again Later',
	standardHeaders: true, 
	legacyHeaders: false, 
})

// 
router.get("/counts", authController.getCounts);
// 
router.post("/verify/:id/:token", createAccountLimiter, authController.verifySignupToken);
router.post("/signup", createAccountLimiter, authController.signup);
router.post("/login",loginLimiter, authController.login);
router.post("/OAuthSignup",  authController.OAuthSignup);
router.post("/OAuthSignIn", createAccountLimiter,authController.OAuthSignIn);
router.post("/checktoken", jwtAuth.onLogCheck);
// 
router.get("/:id",jwtAuth.checkToken, authController.getSpecificUser);
router.post("/userFollowings/:id",authController.getOwnFollowings);
//
router.get("/notifications/:id",jwtAuth.checkToken, authController.getUserNotifications);
router.post("/notifications/:id",jwtAuth.checkToken, authController.markAsSeen);
router.get("/notificationsLen/:id",jwtAuth.checkToken, authController.getNotificationsLen);
//router.post("/archiveNotification/:id",jwtAuth.checkToken, notificationMiddleware.archiveNotification);
//
router.post("/checktoken", jwtAuth.onLogCheck);
//
router.post("/editPhoto/:id",createAccountLimiter,jwtAuth.checkToken,  upload.uploadProfile, upload.uploadCloud, authController.editBannerOrPfp);
router.post("/editUser/:id",jwtAuth.checkToken,  authController.editUser);
router.post("/editPassword/:id",jwtAuth.checkToken,  authController.editPassword);
router.post("/editGif/:id",jwtAuth.checkToken,  upload.gifUpload, upload.gifUploadCloud, authController.editBannerOrPfp);
router.post("/follow/:id",jwtAuth.checkToken, authController.followUser);
//
router.post("/research/:id",jwtAuth.checkToken,  authController.searchFor);

router.post("/muteNotification/:id",jwtAuth.checkToken, authController.notificationMuteUser);
router.post("/block/:id",jwtAuth.checkToken, authController.blockUser);
router.post("/report/:id",jwtAuth.checkToken, authController.reportUser);
//router.get("/logout", authController.logout); 
router.post("/researchIdentification/:id",jwtAuth.checkToken,  authController.searchForIdentification);
router.get("/nitroInfos/:id",jwtAuth.checkToken, authController.getNitroInf);
router.post("/nitroUnlock/:id",jwtAuth.checkToken, authController.nitroUnlock);
router.post("/editFade/",jwtAuth.checkToken, authController.fadeEdit);
router.post("/editChannelFade/:id",jwtAuth.checkToken, authController.fadeEditChannel);

 
module.exports = router;