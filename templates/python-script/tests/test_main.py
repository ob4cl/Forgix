import contextlib
import io
import unittest
from main import main


class ScriptTests(unittest.TestCase):
    def test_greets_named_user(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(main(['--name', 'Starter']), 0)
        self.assertEqual(output.getvalue(), 'Hello, Starter! Welcome to {{projectName}}.\n')

    def test_defaults_to_world(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(main([]), 0)
        self.assertIn('Hello, world!', output.getvalue())

    def test_rejects_unknown_option(self):
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as error:
                main(['--unknown'])
        self.assertEqual(error.exception.code, 2)


if __name__ == '__main__':
    unittest.main()
