import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId, res) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // store refresh token in db
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation -not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  // get user details from frontend
  const { username, email, fullName, password } = req.body;

  // validation -not empty
  if (!username || !email || !fullName || !password) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user already exists: username, email
  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (user) {
    throw new ApiError(400, "User already exists");
  }

  // check for images, check for avatar
  const avatarImage = req.files?.avatar[0]?.path;
  // const coverImage = req.files?.coverImage[0]?.path;

  let coverImage;
  if (req.files && Array.isArray(req.files.coverImage)) {
    coverImage = req.files.coverImage[0]?.path;
  }

  // check for images, check for avatar
  if (!avatarImage) {
    throw new ApiError(400, "Avatar is required");
  }

  // upload them to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarImage);
  // upload them to cloudinary, cover image
  const cover = await uploadOnCloudinary(coverImage);
  // check for avatar upload
  if (!avatar) {
    throw new ApiError(400, "Failed to upload images to cloudinary");
  }

  // create user object create entry in db
  const newUser = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    avatar: avatar.url,
    coverImage: cover?.url || "",
    password,
  });
  // Check if user was created successfully and get user details from database
  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }
  // यूज़र सफलतापूर्वक बन गया है और डेटाबेस में सेव हो गया है
  // अब हम यूज़र को रिस्पॉन्स भेज रहे हैं जिसमें यूज़र की जानकारी है (पासवर्ड और रिफ्रेश टोकन को छोड़कर)
  return res
    .status(200)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  //find the user
  //password check
  //access and referesh token
  //send cookie
  const { email, username, password } = req.body;
  if (!email && !username) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(400, "Invalid username or email");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid password");
  }

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id, res);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

/*
यह कोड एक्सेस टोकन को रिफ्रेश करने का काम करता है। चलिए इसे स्टेप बाय स्टेप समझते हैं:

कार्यप्रणाली:
1. यूजर से रिफ्रेश टोकन प्राप्त करता है (कुकीज या रिक्वेस्ट बॉडी से)
2. टोकन की वैधता जांचता है 
3. टोकन से यूजर की पहचान करता है
4. नए एक्सेस और रिफ्रेश टोकन जनरेट करता है
5. नए टोकन कुकीज में सेट करके रिस्पांस भेजता है

प्रयुक्त फंक्शन्स:
- asyncHandler: एसिंक्रोनस एरर हैंडलिंग के लिए
- jwt.verify(): JWT टोकन को वेरिफाई करने के लिए
- User.findById(): डेटाबेस से यूजर खोजने के लिए
- generateAccessTokenAndRefreshToken(): नए टोकन जनरेट करने के लिए
- ApiError: एरर हैंडलिंग के लिए
- ApiResponse: सफल रिस्पांस भेजने के लिए

सुधार के सुझाव:
1. refreshToken की स्पेलिंग सही करें (referesh -> refresh)
2. एरर मैसेज को और स्पष्ट बनाएं
3. टोकन एक्सपायरी की एक्सप्लिसिट चेकिंग जोड़ें
*/

const refereshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken.id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // check if refresh token is expired
    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "refresh token is expired");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshToken(user._id, res);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid refresh token");
  }
});

/*
changeCurrentUserPassword(): For changing password
- Gets old and new password from req.body
- Finds user from database
- Checks old password
- Sets new password
- Saves updated user

Improvement suggestions:
1. Add password validation
2. Add password hashing
3. Send response on successful update
*/

const changeCurrentUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id); // Finding user from database using logged in user's ID
  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

/*
getCurrentUser(): For getting current logged in user details
- Gets user from req.user (set by auth middleware)
- Returns user details in response
*/
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

/*
updateCurrentUser(): For updating current logged in user details
- Gets fullName and email from req.body
- Finds user from database
- Updates user details
- Returns updated user details in response
*/
const updateCurrentUser = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullName, email } },
    { new: true }
  ).select("-password");
  if (!user) {
    throw new ApiError(400, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Current user updated successfully"));
});

/*
updateUserAvatar(): For updating user avatar
- Gets avatar from req.file
- Uploads avatar to cloudinary
- Updates user avatar in database
- Returns updated user details in response
*/
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarImage = req.file?.path;
  if (!avatarImage) {
    throw new ApiError(400, "Avatar is required");
  }
  const avatar = await uploadOnCloudinary(avatarImage);
  if (!avatar.url) {
    throw new ApiError(400, "Failed to upload avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password");
  if (!user) {
    throw new ApiError(400, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

/*
updateUserCoverImage(): For updating user cover image
- Gets cover image from req.file
- Uploads cover image to cloudinary
- Updates user cover image in database
- Returns updated user details in response
*/
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImage = req.file?.path;
  if (!coverImage) {
    throw new ApiError(400, "Cover image is required");
  }
  const cover = await uploadOnCloudinary(coverImage);
  if (!cover.url) {
    throw new ApiError(400, "Failed to upload cover image");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: cover.url } },
    { new: true }
  ).select("-password");
  if (!user) {
    throw new ApiError(400, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});


const getUserChannelProfile = asyncHandler(async (req, res) => { 

  const { username } = req.params;    //Getting username from request parameters 

//Checking if username is present in request parameters
  if (!username?.trim()) {  
    throw new ApiError(400, "username is missing");
  }

  //Aggregating user details from database
  const channel = await User.aggregate([
    {
      // matching username with username in database
      $match: { username: username.toLowerCase() }, 
      //lookup is used to join the current collection with the referenced collection
      $lookup: {
        from: "Subscription",   //Subscription is the collection name
        localField: "_id",  //local field is the field in the current collection
        foreignField: "channel", //foreign field is the field in the referenced collection
        as: "subscribers", //subscribers is the name of the new field that will store the subscribers
      },
      //lookup is used to join the current collection with the referenced collection
      $lookup: {
        from: "Subscription", //Subscription is the collection name
        localField: "_id", //local field is the field in the current collection
        foreignField: "subscriber", //foreign field is the field in the referenced collection
        as: "subscribersTo", //subscribersTo is the name of the new field that will store the subscribersTo
      },
    },
    //adding fields to the aggregated result
    {
      //adding fields to the aggregated result
      $addFields: {
        subscribersCount: { $size: "$subscribers" }, //subscribersCount is the name of the new field that will store the subscribersCount
        channelsSubscribedToCount: { $size: "$subscribersTo" }, //channelsSubscribedToCount is the name of the new field that will store the channelsSubscribedToCount
        //checking if the user is subscribed to the channel
        isSubscribed: {
          //checking if the user is subscribed to the channel
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] }, //checking if the user is subscribed to the channel
            then: true, //if the user is subscribed to the channel then the value is true
            else: false, //if the user is not subscribed to the channel then the value is false
          },
        },
      },
    },
    //projecting the fields to the aggregated result
    {
      $project: {
        _id: 1, //_id is the field in the current collection
        username: 1, //username is the field in the current collection
        fullName: 1, //fullName is the field in the current collection
        subscribersCount: 1, //subscribersCount is the field in the current collection
        channelsSubscribedToCount: 1, //channelsSubscribedToCount is the field in the current collection
        isSubscribed: 1, //isSubscribed is the field in the current collection
        avatar: 1, //avatar is the field in the current collection
        coverImage: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(400, "Channel not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "Channel fetched successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refereshAccessToken,
  changeCurrentUserPassword,
  getCurrentUser,
  updateCurrentUser,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
};
