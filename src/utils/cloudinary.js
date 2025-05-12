import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null
    // Upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfully on cloudinary
    // console.log("File is uploaded on cloudinary", response.url);
    
    // file has been uploaded successfully on cloudinary
    // remove the locally stored file
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.error("Error uploading to cloudinary:", error);
    fs.unlinkSync(localFilePath); // Remove the locally stored file
    return null;
  }
};

export { uploadOnCloudinary };
