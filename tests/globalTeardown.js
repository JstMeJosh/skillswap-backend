// Stop the shared in-memory MongoDB started in globalSetup.
module.exports = async () => {
  const instance = global.__MONGOINSTANCE;
  if (instance) await instance.stop();
};
