import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrorHandler } from "../utils/apiErrorHandler.js";
import { uploadFileOnCloudinary } from "../utils/fileUpload.js";
import { Video } from "../models/video.model.js";
import { apiResponse } from "../utils/ApiResponse.js";

const publishAVideo = asyncHandler(async (req, res) => {
  // steps so, basically required in model means we can't send a create field empty when we rae saving that data in mongoDB
  //1. we are taking title and description from req.body and check if the file is empty or not if so then throw an error and upload both video and image on cloudinary
  //2. we are taking response.url of video and image from cloudinary and create one video object like we created a user object in

  const { title, description } = req.body;
  //   if (title === "" || description === "") {
  //     throw new ApiErrorHandler(400, "All fields are required");
  //   }
  if ([title, description].some((field) => field.trim() === "")) {
    throw new ApiErrorHandler(400, "All fields are required");
  }

  const videoFileLocalPath = req.files?.videoFile[0].path;
  const thumbnailImageLocalPath = req.files?.thumbnail[0].path;

  if (!videoFileLocalPath) {
    throw new ApiErrorHandler(400, "videoFile is missing");
  }
  if (!thumbnailImageLocalPath) {
    throw new ApiErrorHandler(400, "thumbnail image is missing");
  }

  const video = await uploadFileOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadFileOnCloudinary(thumbnailImageLocalPath);

  if (!video) {
    throw new ApiErrorHandler(400, "Video ris rqeuired");
  }
  if (!thumbnail) {
    throw new ApiErrorHandler(400, "thumbnail is required");
  }
  const publishedVideo = await Video.create({
    videoFile: video?.url,
    thumbnail: thumbnail?.url,
    duration: video?.duration,
    title,
    description,
    views: 0,
    isPublished: false,
    videoOwner: req.user?._id,
  });

  const isVideoUploded = await Video.findById(publishedVideo?._id);
  if (!isVideoUploded) {
    throw new ApiErrorHandler(
      500,
      "There is something wrong while uploading video or uploading failed"
    );
  }
  return res
    .status(200)
    .json(
      new apiResponse(200, publishAVideo, "Video uploaded successfully!!!..😎")
    );
});

const getVideoByID = asyncHandler(async (req, res) => {
  // 1. we have fetch the video by it's id
  // 2. we need these details: likes, comments, tweet, channelname, user, suscribed or not so we have to perform some queries

  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiErrorHandler(400, "VideoId is not valid");
  }
  if (!isValidObjectId(req?.user?._id)) {
    throw new ApiErrorHandler(400, "Invalid UserId");
  }

  // match vidoeid
  // lookup for video likes
  //lookup for comments also

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes", // database mein jis name se save hua hoga uska
        localField: "_id",
        foreignField: "video",
        as: "videolikes",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "videocomments",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "videoOwner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers", // to find how may subscribers are there CAC--->a CAC--->b type
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req?.user?._id, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              subscribedCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$videolikes",
        },
        owner: {
          $first: "$owner",
        },
        comments: {
          $first: "$videocomments",
        },
        isLiked: {
          $cond: {
            if: { $in: [req?.user?._id, "$videolikes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        thumbnail: 1,
        videoFile: 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
        owner: 1,
        isPublished: 1,
      },
    },
  ]);

  // if video fetched sucefully then add video id to watchhistory
  if (!video) {
    throw new ApiErrorHandler(500, "Oops!! Failed to fetch video");
  }
  await Video.findByIdAndUpdate(videoId, {
    $addToSet: { watchHistory: videoId },
  });

  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });
  return res
    .status(200)
    .json(new apiResponse(200, video, "Video successfully fetched"));
});

// delete video by id
const deleteVideoByID = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const video = await Video.deleteOne(videoId);
});

export { publishAVideo, getVideoByID };
