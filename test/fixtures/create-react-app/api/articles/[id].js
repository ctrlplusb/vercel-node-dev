module.exports = async (req, res) => {
  res.send(`articleId: ${req.query.id}`);
};
