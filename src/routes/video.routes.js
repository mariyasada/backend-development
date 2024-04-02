import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getVideoByID,
  publishAVideo,
} from "../controllers/video.controller.js";
import { uploadfile } from "../middleware/multer.middleware.js";

const router = Router();

//publish video route
router.route("/publish").post(
  verifyJWT,
  uploadfile.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishAVideo
);
router.route("/v/:videoId").get(verifyJWT, getVideoByID);

export default router;
