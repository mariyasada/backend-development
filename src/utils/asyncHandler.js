// as we can see we are going to use try catch or async-await for every request  so we make a wrapper around the function
// method 1 using promise
export const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => {
      console.error(err, "error");
      next(err);
    });
  };
};

//method 2 try catch

// export const asyncHandler = (requestHandler) => async (err, req, res, next) => {
//   try {
//     await requestHandler(err, req, res, next);
//   } catch (err) {
//     res.status(err.code || 500).json({ success: false, message: err.message });
//   }
// };
//currying
// const asyncHandler = () => {}
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}
