import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
// using app.use for writing middleware code

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

app.use(express.json({ limit: "16kb" })); // accept the request in json format like if you have form data
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // search params=mariya%20sada so handling this kind of data
app.use(express.static("public")); // handling file and images (user's file uploading and all this handle using this we are storing into public folder)
app.use(cookieParser()); // before sending the response we check the cokkie using this middleware

app.get("/", (req, res) => {
  res.send("Initial request of server");
});
app.post("/users", (req, res) => {
  res.json({ message: "i don't know why i got this error" });
});

// route imports
import userRouter from "./routes/user.routes.js";

// route declaration means which url used for which route , here we have to use middleware that's why we are using use
app.use("/api/v1/users", userRouter);
// router name

export { app };
