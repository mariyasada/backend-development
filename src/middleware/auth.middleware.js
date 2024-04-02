import { User } from "../models/user.model.js";
import { ApiErrorHandler } from "../utils/apiErrorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  // what we are doing
  //1. we create middlware for protected route so suppose if we want to access logout route then first we check if user have avalid accesstoken or not
  //2. we take accesstaoken from cookies or from authorization's bearer token
  //3. if token is there then we decoded it with our secret key else throwing an error
  //4. so decodetoken have id,email,username and fullname property in object
  //5. now we find the user from database based on decoded token's  and take user object without password and refresh token field
  //6. we are setting this user object into request object so we can access that user object in logoutuser route.

  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorizaton")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiErrorHandler(401, "unauthorized access for this request");
    }

    // when we are generating token we passes _id, email, username,fullname for sign a token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiErrorHandler(401, "Invalid access token");
    }
    req.user = user;
    next(); // means mera kaam ho gaya next ka tum dekhlo(i have done my job now handle whatever comes next or caaling next controller function)
  } catch (error) {
    throw new ApiErrorHandler(401, error?.message || "Invalid access token");
  }
});
