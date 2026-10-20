const extraOf = (error) => {
  const extra = {};
  if (error?.status) extra.status = error.status;
  if (error?.code) extra.code = error.code;
  if (error?.cause?.message) extra.cause = error.cause.message;
  return extra;
};

const logError = (scope, error, details = {}) => {
  const extra = { ...extraOf(error), ...details };
  console.error(`[${scope}] ${error?.message || error}`);
  if (Object.keys(extra).length > 0) {
    console.error(`[${scope}]`, extra);
  }
  if (error?.stack) {
    console.error(error.stack);
  }
};

module.exports = { logError };
