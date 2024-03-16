import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res, next) => {
  console.log(req.body, "check data");
  res.status(200).json({ message: "first api request" });
});

export { registerUser };
