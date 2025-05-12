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
      .json(new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "Access token refreshed successfully"));
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid refresh token");
  }
});

export { registerUser, loginUser, logoutUser, refereshAccessToken };
