const NETWORK_CODES = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'];

function isDbUnreachable(err) {
  return err && NETWORK_CODES.includes(err.code);
}

function handleDbError(err, res, context, fallbackMessage = 'Something went wrong') {
  if (!isDbUnreachable(err)) return false;
  console.error(context + ': database unreachable');
  res.status(503).json({
    message: 'Database temporarily unreachable. Check your internet and try again.',
  });
  return true;
}

module.exports = { isDbUnreachable, handleDbError };
