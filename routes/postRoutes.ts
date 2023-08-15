const express = require("express");
const router = express.Router();
const postController = require('../controllers/postController');
const upload = require('../middleware/uploadMiddleware');
const jwtAuth = require('../middleware/authMiddleware');
const  rateLimit = require('express-rate-limit');

const postLimits = rateLimit({
	windowMs: 20 * 60 * 1000, //
	max: 80, // 
	message:
		'Try Again Later',
	standardHeaders: true, 
	legacyHeaders: false, 
})

// 
//router.use('*', jwtAuth.checkToken);
//
//router.get("/", postController.getAllPostsCount);
router.get("/:id",jwtAuth.checkToken, postController.getSpecificPost);

router.post("/",jwtAuth.checkToken,postLimits, upload.uploadImage, upload.uploadCloud, postController.createNewPost);
router.get("/user/:id", jwtAuth.checkToken,postController.getUserPostCount);

router.delete("/:id",jwtAuth.checkToken, postController.deletePost);
//router.put("/:id", jwtAuth.checkToken,postController.updatePost);
router.post("/:id",jwtAuth.checkToken, postController.likePost);
router.post("/report/:id",jwtAuth.checkToken, postController.reportPost);

// 
router.post("/comment/:id", postLimits,jwtAuth.checkToken,postController.commentPost);
router.post("/deleteComment/:id", jwtAuth.checkToken,postController.deleteCommentPost);
router.post("/modifyComment/:id", jwtAuth.checkToken,postController.editCommentPost);
router.post("/likeComment/:id", jwtAuth.checkToken,postController.likeComment);
//

// 
router.post("/bookmark/:id", jwtAuth.checkToken, postController.bookmarkPost);
//router.post("/userBookmarks/:id", jwtAuth.checkToken, postController.getBookmarkPosts);

// 
router.post("/retweet/:id",jwtAuth.checkToken, postController.retweetPost);

// 
router.get("/suggsWindow/:token/:id",jwtAuth.checkToken, postController.getSuggsWindow);

module.exports = router;