// Small pure-function example; replace with tests of your own application.
function slugify(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
module.exports = { slugify };
