module.exports = (req, res) => {
  res.send(`blogSlug: ${req.query.slug}, blogAction: ${req.query.action}`);
};
