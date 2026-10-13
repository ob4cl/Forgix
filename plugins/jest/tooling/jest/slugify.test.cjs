const { slugify } = require('./slugify.cjs');

test('normalizes whitespace and punctuation', () => {
  expect(slugify('  Hello,   World! ')).toBe('hello-world');
});
test('returns an empty slug for punctuation-only input', () => {
  expect(slugify('!?')).toBe('');
});
test('preserves digits in an already valid slug', () => {
  expect(slugify('api-v2')).toBe('api-v2');
});
