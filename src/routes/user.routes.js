import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateAvatarImage,
  updateCoverImage,
} from "../controllers/user.controller.js";
import { uploadfile } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();
// point to be noted here:  when you have to use multer or any extra middleware for handling file uploads you should add the  function here in routes
router.route("/register").post(
  uploadfile.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
); // controller function

router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-passwoard").post(verifyJWT, changeCurrentPassword);
router.route("/currentUser").get(verifyJWT, getCurrentUser);
router.route("/update-account-details").patch(verifyJWT, updateAccountDetails);
router
  .route("/avatar")
  .patch(verifyJWT, uploadfile.single("avatar"), updateAvatarImage);

router
  .route("/coverImage")
  .patch(verifyJWT, uploadfile.single("coverImage"), updateCoverImage);

router.route("/channel/:username").get(verifyJWT, getUserChannelProfile);
router.route("/watch-history").get(verifyJWT, getWatchHistory);

// router.route("/register").post((req, res) => {
//   registerUser(req, res); // Call your controller function
// });

export default router;
