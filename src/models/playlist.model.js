import mongoose, { Schema } from "mongoose";

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  videos:[
    {
    type: Schema.Types.ObjectId,
    ref: "Video",
  }
],
  description: {
    type: String,
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  

});


export const Playlist = mongoose.model("Playlist", playlistSchema);
