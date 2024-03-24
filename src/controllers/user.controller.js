import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadFileOnCloudinary } from "../utils/fileUpload.js";
import { apiResponse } from "../utils/ApiResponse.js";

// creating generalaccessatoken method for code readability
export const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId); // we got the object from backend
    console.log(user, "check user");
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
  console.log(req.files, "check files ");
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
  console.log(user, "check user in loginuser");

  if (!user) {
    throw new ApiErrorHandler(404, "User does not exist in database");
  }
  const isPasswordValid = await user.isPasswordCorrect(password); // return true or false
  if (!isPasswordValid) {
    throw new ApiErrorHandler(401, "Invalid use creadentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

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
export { registerUser, loginUser, logoutUser };
