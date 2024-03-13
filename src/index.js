import dotenv from "dotenv";
import { connectDB } from "./db/index.js";
import { app } from "./app.js";

dotenv.config({ path: "./env" });
const port = process.env.PORT || 5500;

// connectDb returns a promise so using then method we execute and run our application
connectDB()
  .then(() => {
    app.on("error", (err) => {
      console.log("something went wrong", err);
    });
    app.listen(port, () => {
      console.log(`app running on port ${port}`);
    });
  })
  .catch((err) => console.log("connection failed", err));
