import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
// using app.use we write the middleware code

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

app.use(express.json({ limit: "16kb" })); // accept the request in json format like if you have form data
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // search params=mariya%20sada so handling this kind of data
app.use(express.static("public")); // handling file and images (user's file uploading and all this handle using this we are storing into public folder)
app.use(cookieParser()); // before sending the  response we check the cokkie using this middleware
export { app };
