import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

export const oldImageToBeDeleted = async (imageUrl) => {
  try {
    if (!imageUrl) return null;
    // Extract public ID from the Cloudinary URL
    const publicId = imageUrl.split("/").pop().split(".")[0];
    const response = await cloudinary.uploader.destroy(publicId);
    console.log("file deleted ", response);
    return response;
  } catch (err) {
    return null;
  }
};
