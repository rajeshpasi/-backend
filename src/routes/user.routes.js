import { Router } from "express";
import { registerUser, loginUser, logoutUser, refereshAccessToken } from "../controllers/user.controllwes.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

// router.post("/register", registerUser);
router.route("/register").post(upload.fields([{name: "avatar", maxCount: 1}, {name: "coverImage", maxCount: 1}]), registerUser);

router.route("/login").post(loginUser);

//secure routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refereshAccessToken);

export default router;
