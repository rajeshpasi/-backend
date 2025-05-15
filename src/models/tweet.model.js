import mongoose, { Schema } from "mongoose";


const tweetSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: "Like",
  }],
},
{ timestamps: true }
);  

export const Tweet = mongoose.model("Tweet", tweetSchema);
