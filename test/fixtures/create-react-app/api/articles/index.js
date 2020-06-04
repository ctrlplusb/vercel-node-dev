module.exports = (req, res) => {
  res.send(JSON.stringify(req.body, null, 2));
};
