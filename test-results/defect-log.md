\# Defect Log



| Defect ID | Description | Severity | Priority | Steps to Reproduce | Expected Result | Actual Result | Status |

|---|---|---|---|---|---|---|---|

| BUG-001 | Invalid login shows error message | Medium | Medium | 1. Open login page 2. Enter wrong username/password 3. Click submit | Error message should appear | Error message appeared correctly | Fixed |

| BUG-002 | Empty login form validation triggered | Low | Medium | 1. Open login page 2. Leave username/password empty 3. Click submit | Validation error should appear | Username invalid error appeared | Fixed |

| BUG-003 | Short password edge case detected | Medium | High | 1. Enter password less than 8 characters 2. Run negative test | Password should be rejected | Test detected short password input | Open |

