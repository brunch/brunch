exports.clean = (error, coerce) => {
  const err = typeof error === 'string' ? new Error(error) : error;
  const data = coerce ? {error: err.message} : new Error(err.message);
  ['stack', 'line', 'col'].filter(n => n in err).forEach(n => data[n] = err[n]);
  return data;
}
