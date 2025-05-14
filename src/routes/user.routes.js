import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refereshAccessToken,
  changeCurrentUserPassword,
  getWatchHistory,
  getCurrentUser,
  updateCurrentUser,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
} from "../controllers/user.controllwes.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secure routes
router
 .route("/logout").post(verifyJWT, logoutUser);
router
 .route("/refresh-token").post(refereshAccessToken);
router
 .route("/change-password").post(verifyJWT, changeCurrentUserPassword);
router
 .route("/current-user").get(verifyJWT, getCurrentUser);
router
 .route("/update-user").patch(verifyJWT, updateCurrentUser);
router
  .route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router
  .route("/channel-profile/:username").get(verifyJWT, getUserChannelProfile);
router
 .route("/watch-history").get(verifyJWT, getWatchHistory);

export default router;
