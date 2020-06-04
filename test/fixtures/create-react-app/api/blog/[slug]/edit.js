module.exports = (req, res) => {
  res.send(`edit blogSlug: ${req.query.slug}`);
};
