import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(
  express.json({
    limit: "25kb",
  })
);
app.use(express.urlencoded({ extended: true, limit: "25kb" }));
app.use(express.static("public"));

// Routes import
import userRouter from "./routes/user.routes.js";

// Routes declaration
app.use("/api/v1/users", userRouter);

export default app;
