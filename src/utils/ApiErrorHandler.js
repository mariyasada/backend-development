class ApiErrorHandler extends Error {
  constructor(
    statusCode,
    message = "something went wrong",
    errros = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errros = errros;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
export { ApiErrorHandler };
