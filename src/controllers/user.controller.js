import { ApiErrorHandler } from "../utils/apiErrorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadFileOnCloudinary } from "../utils/fileUpload.js";
import { apiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { oldImageToBeDeleted } from "../utils/oldImageToBeDeleted.js";
import mongoose from "mongoose";

// creating generalaccessatoken method for code readability
export const generateAccessAndRefreshToken = async (user) => {
  //replaces user with userId
  try {
    // const user = await User.findById(userId); // we got the object from backend
    // console.log(user, "check user");
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); // because we don't have password here

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiErrorHandler(
      500,
      "Something went wrong while generating refresh and access token "
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, username, email, password } = req.body;
  if (fullName === "" || username === "" || password === "" || email === "") {
    throw new ApiErrorHandler(
      400,
      " All the fields required for user registration"
    );
  }
  // let validRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  if (!email.includes("@")) {
    throw new ApiErrorHandler(
      400,
      "please check your email properly,It must include @"
    );
  }

  if (password.length <= 6 || password.length >= 12) {
    throw new ApiErrorHandler(
      400,
      "Password length must be between 6 to 12 characters"
    );
  }

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiErrorHandler(
      400,
      "User already exists with the same username or email"
    );
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath;

  if (req?.files && req.files?.coverImage && req?.files.coverImage.length > 0) {
    coverImageLocalPath = req.files?.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiErrorHandler(400, "Avatar file is required");
  }
  let avatar = await uploadFileOnCloudinary(avatarLocalPath);
  let coverImage = await uploadFileOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiErrorHandler(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });
  const createdUser = await User.findById(user?._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiErrorHandler(
      500,
      "Something went wrong while registering user"
    );
  }
  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "user successfully registered"));
});

const loginUser = asyncHandler(async (req, res) => {
  // steps 1. extract info from req.body
  //2 check if username or email is not empty
  //3. check if user is exist or not
  //4. if exists then does password is matched or not with backend
  //5. if match then generate access refresh tokens
  //6. stored as cookie in browser

  const { username, email, password } = req.body;
  if (!(username || email)) {
    //
    throw new ApiErrorHandler(400, "username or email is required");
  }
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // here we can reduce one query operation like we are currently perform one query to find loggedin user so we can skip that if we write above query like this
  // const user = await User.findOne({
  //   $or: [{ username }, { email }],
  // }).select("-password -refreshToken") but we need password for that we access that whole object and then we perform second query without password. we can't do like this user.select because user is not coming from model

  if (!user) {
    throw new ApiErrorHandler(404, "User does not exist in database");
  }
  const isPasswordValid = await user.isPasswordCorrect(password); // return true or false
  if (!isPasswordValid) {
    throw new ApiErrorHandler(401, "Invalid use creadentials");
  }

  // const { accessToken, refreshToken } =
  //   await generateAccessAndRefreshToken(user._id);
  // here we are passing user._id and in generateaccessandRefreshtOken we are finding user object with user?._id so now i am modifying code i am directly passing the user object

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshToken(user);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = { httpOnly: true, secure: true };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User successfully loggedin...."
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: undefined },
    },
    { new: true }
  ); // req.user kaha se aaya? we are seeting user object in request via middleware
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User loggedout successfully"));
});

// refresh Token
const refreshAccessToken = asyncHandler(async (req, res) => {
  //1. taking refreshToken from request
  //2. if refreshtoken is there then decoded that token
  //3. if coming refreshToken and user's refreshToken is matched then we generate new access and refresh tojens and set into cookies

  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiErrorHandler(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiErrorHandler(401, "Invalid refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiErrorHandler(401, "RefreshToken is expired or already used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user);

    // console.log(newRefreshToken, "check refreshToken");

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "AccessToken refreshed succesfully"
        )
      );
  } catch (err) {
    throw new ApiErrorHandler(401, err?.message || "Invalid refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // takeing oldpassword,newpassword and confirmpassword
  //if new password and confirmpassword is not matching then throw and error
  // if matched then find user from database and check if the oldpassword and stored password are same or not
  // if same then then update new password and save into databse using save method
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!(newPassword === confirmPassword)) {
    throw new ApiErrorHandler(
      400,
      "newpassword and confirm password are not matching"
    );
  }
  const user = await User.findById(req?.user?._id);
  const isPassordisCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPassordisCorrect) {
    throw new ApiErrorHandler(400, "Oldpassword is incorrect");
  }
  user.password = newPassword;
  user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password changed successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // youtube doesn't provide an option to update your username and for files we are going to make seperate controller so there are two fileds left.
  const { email, fullName } = req.body;

  if (!email || !fullName) {
    throw new ApiErrorHandler(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req?.user?._id,
    { $set: { fullName, email } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new apiResponse(200, user, "All details are updated succesfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new apiResponse(200, req.user, "Current User Fetched successfully "));
});

const updateAvatarImage = asyncHandler(async (req, res) => {
  const avatarLocalPath = req?.file?.path;
  if (!avatarLocalPath) {
    throw new ApiErrorHandler(400, "Avatar file is missing");
  }

  const oldImageUrl = req.user?.avatar;
  const response = await oldImageToBeDeleted(oldImageUrl);

  const avatar = await uploadFileOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiErrorHandler(
      400,
      "Error while uploading the avatar on cloudinary"
    );
  }

  const user = await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: {
        avatar: avatar?.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new apiResponse(200, user, "Avatar image updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req?.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiErrorHandler(400, "CoverImage file is missing");
  }

  const oldCoverImageUrl = req.user?.coverImage;
  if (oldCoverImageUrl) {
    const response = await oldImageToBeDeleted(oldCoverImageUrl);
  }

  const coverImage = await uploadFileOnCloudinary(coverImageLocalPath);

  if (!coverImage?.url) {
    throw new ApiErrorHandler(
      400,
      "Error while uploading the coverimage on cloudinary"
    );
  }
  const user = await User.findByIdAndUpdate(
    req?.user?._id,
    { $set: { coverImage: coverImage?.url } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new apiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params; // because when we clicking some channel's profile picture we are redirecting to that route and fetch all details

  if (!username.trim()) {
    throw new ApiErrorHandler(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: _id,
        foreignField: "channel",
        as: "subscribers", // channel ke kitne subscribers hai
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: _id,
        foreignField: "subscriber",
        as: "subscribedTo", // kitni channel subscribed kiye uye hai
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        }, //condition
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        subscribersCount: 1,
        sunscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
    }, // kon kon se field object mein chahiye
  ]);
  if (!channel?.length) {
    throw new ApiErrorHandler(400, "channel doesn't exists");
  }
  return res
    .status(200)
    .json(new apiResponse(200, channel[0], "User Channel fetch successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  // we find the watchhistory of currentUser
  const user = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(req?.user?._id) } },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory", // watchhistory ke ander bhi videos aayenge and also owners sod hume owner ka data chhaiye that's why we do a nested pipelines for this
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    email: 1,
                    username: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: { owner: { $first: "$owner" } }, // watchhistory mein owners ka array aayega so hum uska first element elem[0] le rahe hai
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        user[0].watchHistory,
        "Watch History fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  updateAccountDetails,
  getCurrentUser,
  updateAvatarImage,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
