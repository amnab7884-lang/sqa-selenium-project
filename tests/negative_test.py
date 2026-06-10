# Negative / Edge Case Tests

def test_empty_username():
    username = ""
    assert username == ""

def test_empty_password():
    password = ""
    assert password == ""

def test_short_password():
    password = "123"
    assert len(password) < 8

def test_invalid_email_no_at():
    email = "testgmail.com"
    assert "@" not in email

def test_invalid_email_no_domain():
    email = "test@"
    assert email.endswith("@")

def test_boundary_age_under_18():
    age = 17
    assert age < 18

def test_large_input_string():
    text = "a" * 1000
    assert len(text) == 1000

def test_negative_number_input():
    number = -5
    assert number < 0

def test_zero_quantity():
    quantity = 0
    assert quantity == 0

def test_special_characters_input():
    username = "@@@###"
    assert not username.isalnum()