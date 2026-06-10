import unittest

class UnitTests(unittest.TestCase):

    def test_add(self):
        self.assertEqual(2 + 2, 4)

    def test_subtract(self):
        self.assertEqual(5 - 3, 2)

    def test_multiply(self):
        self.assertEqual(3 * 3, 9)

    def test_divide(self):
        self.assertEqual(10 / 2, 5)

    def test_string_empty(self):
        self.assertEqual(len(""), 0)

    def test_string_length(self):
        self.assertEqual(len("SQA"), 3)

    def test_email_contains_at(self):
        self.assertIn("@", "test@gmail.com")

    def test_password_length(self):
        self.assertTrue(len("password123") > 6)

    def test_number_positive(self):
        self.assertTrue(10 > 0)

    def test_boundary(self):
        self.assertTrue(100 >= 100)

    def test_username_valid(self):
        username = "student"
        self.assertNotEqual(username, "")

    def test_password_not_empty(self):
        password = "Password123"
        self.assertNotEqual(password, "")

    def test_email_invalid_missing_at(self):
        email = "testgmail.com"
        self.assertNotIn("@", email)

    def test_age_boundary_valid(self):
        age = 18
        self.assertGreaterEqual(age, 18)

    def test_marks_boundary(self):
        marks = 100
        self.assertLessEqual(marks, 100)