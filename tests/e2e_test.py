from selenium import webdriver
from selenium.webdriver.common.by import By
import time
import os

def setup():
    driver = webdriver.Chrome()
    driver.maximize_window()
    return driver

def save_screenshot(driver, name):
    os.makedirs("test-results/screenshots", exist_ok=True)
    driver.save_screenshot(f"test-results/screenshots/{name}.png")

def test_valid_login():
    driver = setup()
    driver.get("https://practicetestautomation.com/practice-test-login/")

    driver.find_element(By.ID, "username").send_keys("student")
    driver.find_element(By.ID, "password").send_keys("Password123")
    driver.find_element(By.ID, "submit").click()

    time.sleep(2)
    save_screenshot(driver, "valid_login_success")

    assert "logged-in-successfully" in driver.current_url
    driver.quit()

def test_invalid_login():
    driver = setup()
    driver.get("https://practicetestautomation.com/practice-test-login/")

    driver.find_element(By.ID, "username").send_keys("wrong")
    driver.find_element(By.ID, "password").send_keys("wrong")
    driver.find_element(By.ID, "submit").click()

    time.sleep(2)
    save_screenshot(driver, "invalid_login_error")

    error = driver.find_element(By.ID, "error").text
    assert "Your username is invalid" in error
    driver.quit()

def test_empty_login():
    driver = setup()
    driver.get("https://practicetestautomation.com/practice-test-login/")

    driver.find_element(By.ID, "submit").click()

    time.sleep(2)
    save_screenshot(driver, "empty_login_error")

    assert "Your username is invalid" in driver.page_source
    driver.quit()

def test_page_title():
    driver = setup()
    driver.get("https://practicetestautomation.com/practice-test-login/")

    save_screenshot(driver, "login_page_title")

    assert "Test Login" in driver.title
    driver.quit()

# E2E TC5: Logout Flow
def test_logout_flow():
    driver = setup()
    driver.get("https://practicetestautomation.com/practice-test-login/")

    driver.find_element(By.ID, "username").send_keys("student")
    driver.find_element(By.ID, "password").send_keys("Password123")
    driver.find_element(By.ID, "submit").click()

    save_screenshot(driver, "before_logout")

    driver.find_element(By.LINK_TEXT, "Log out").click()

    save_screenshot(driver, "after_logout")

    assert "practice-test-login" in driver.current_url
    driver.quit()