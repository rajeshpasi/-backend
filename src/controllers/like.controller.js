import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "VideoId is missing or uncorrect");
  }

  const isLiked = await Like.findOne({
    video: videoId,
    likeBy: req.user._id,
  });

  let liked;
  if (!isLiked) {
    await Like.create({
      video: videoId,
      likeBy: req.user._id,
    });
    liked = true;
  } else {
    await Like.findByIdAndDelete({
      video: videoId,
      likeBy: req.user._id,
    });
    liked = false;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        liked,
        `Video ${liked ? "liked" : "unliked"} successfully`
      )
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "CommentId is missing or uncorrect");
  }
  const isLiked = await Like.findOne({
    comment: commentId,
    likeBy: req.user._id,
  });

  let liked;
  if (!isLiked) {
    await Like.create({
      comment: commentId,
      likeBy: req.user._id,
    });
    liked = true;
  } else {
    await Like.findByIdAndDelete({
      comment: commentId,
      likeBy: req.user._id,
    });
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        liked,
        `Comment ${liked ? "liked" : "unliked"} successfully`
      )
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "TweetId is missing or uncorrect");
  }

  const isLiked = await Like.findOne({
    tweet: tweetId,
    likeBy: req.user._id,
  });

  let liked;
  if (!isLiked) {
    await Like.create({
      tweet: tweetId,
      likeBy: req.user._id,
    });
    liked = true;
  } else {
    await Like.findByIdAndDelete({
      tweet: tweetId,
      likeBy: req.user._id,
    });
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        liked,
        `Tweet ${liked ? "liked" : "unliked"} successfully`
      )
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const likeVideos = await Like.aggregate([
    {
      $match: {
        likeBy: new mongoose.Types.ObjectId(`${req.user._id}`),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "video",
              as: "likes",
            },
          },
          {
            $addFields: {
              likes: { $size: "$likes" },
              isLiked: {
                $cond: {
                  if: {
                    $in: [
                      new mongoose.Types.ObjectId(`${req.user._id}`),
                      "$likes.likeBy",
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$video",
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "owner",
        as: "owner",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likeVideos, "Liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
