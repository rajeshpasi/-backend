import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    fullName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// यह फंक्शन पासवर्ड को हैश करने के लिए है - जब भी यूजर सेव होगा तो पासवर्ड को एन्क्रिप्ट करेगा
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// यह फंक्शन पासवर्ड वेरिफिकेशन के लिए है - यूजर का दिया गया पासवर्ड सही है या नहीं चेक करता है
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// यह फंक्शन JWT टोकन जनरेट करने के लिए है - यूजर की ऑथेंटिकेशन के लिए एक्सेस टोकन बनाता है
userSchema.methods.generateAccessToken = function () {
  return jwt.sign({ id: this._id, username: this.username, email: this.email, fullName: this.fullName }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY
  });
};

// यह फंक्शन रिफ्रेश टोकन जनरेट करने के लिए है - यूजर की रिफ्रेश टोकन बनाता है
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ id: this._id}, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY
  });
};

export const User = mongoose.model("User", userSchema);
