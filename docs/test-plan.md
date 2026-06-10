# 🛡️ INTELLIHUNT — SQA Test Plan

**Project Name:** Intellihunt (AI-Powered Cyber Threat Hunting Copilot)  
**Phase:** Phase 1 — Test Planning (Week 1)  
**Prepared By:** SQA & Testing Team  
**Date:** May 30, 2026  
**Document Version:** 1.0  
**Target Repository Path:** `/docs/test-plan.md`  

---

## 1. Introduction & Objectives

### 1.1 Purpose
This Test Plan acts as a foundational blueprint for all Software Quality Assurance (SQA) and testing activities of **Intellihunt** — a full-stack, AI-powered Cyber Threat Hunting Copilot. The document outlines the testing scope, objectives, chosen automation framework (Selenium), test types, key risk areas, and transition criteria. 

### 1.2 Testing Objectives
* **Ensure Functional Integrity:** Verify that the 3-Layer Consensus Engine accurately processes network flows and flags threats.
* **Validate End-to-End User Experience:** Ensure the React-based frontend dashboard displays real-time network logs and alert details flawlessly.
* **Confirm Security & Access Controls:** Validate the robustness of Authentication and Role-Based Access Control (RBAC).
* **Verify Copilot Capabilities:** Ensure the Grok-powered AI copilot successfully explains alerts, generates playbooks, and maps attacks to the MITRE ATT&CK framework.
* **Establish Test Automation:** Implement reproducible End-to-End (E2E) UI tests using **Selenium WebDriver** in Python to verify dashboard interactions and core user flows.

---

## 2. Target Technology Stack

Understanding the technology stack allows for optimal testing tool selection and automated integration hooks:

* **Frontend:** React 18, TypeScript, Vite, TailwindCSS, Radix UI, Recharts, TanStack Query, Framer Motion
* **Backend:** FastAPI (Python), Uvicorn ASGI Server, Motor (Async MongoDB Driver)
* **Database:** MongoDB Atlas (Cloud/Document-oriented)
* **Ingestion:** NFStream (Python-based network flow analysis wrapper for libpcap)
* **AI Copilot:** Grok (xAI API) via OpenAI-compatible endpoints
* **Threat Intelligence:** VirusTotal API, AbuseIPDB API
* **Alert Notifications:** SMTP (Gmail), Slack Webhooks, MS Teams Webhooks

---

## 3. Test Scope

### 3.1 In-Scope Features (To Be Tested)
The following major modules and user flows are included in the E2E and functional test suites:

* **Authentication & User Management:** Signup, login, local session caching, Clerk session handling, and role-based permissions (admin vs. analyst).
* **Ingestion Controls:** Uploading `.pcap` / `.pcapng` files, triggering live packet capturing on network interfaces, and CSV/Parquet uploads.
* **Real-Time Dashboards:** Interactive widgets, threat maps, incident statistics, network throughput graphs, and 2-second polling reactivity.
* **Alert System:** Interactive alerts table, severity indicators, consensus engine vote breakdowns (RF, IF, and Threat Intel), and MITRE ATT&CK mapping displays.
* **Grok AI Copilot Integration:** Interactive chat window, contextual explanation of specific alerts, dynamic response playbook generation, and PDF executive incident reports.
* **Threat Intel & Forensic Timelines:** Searching IP reputations manually, viewing forensic timeline summaries for specific source/destination IPs.
* **System Settings & Policies:** Dynamic configurations of alerting channels (SMTP, Slack, Teams), CRUD operations on the IP Blocklist, and enforcement checks.

### 3.2 Out-of-Scope Features (Excluded)
The following elements are excluded from the core automated testing cycles:

* **Third-Party API Real-Time Connectivity Stress:** We will mock external threat intel APIs (VirusTotal, AbuseIPDB) and the Grok LLM endpoint in test environments to prevent:
  * Incurring excessive API usage costs.
  * Encountering API rate-limiting issues (e.g., 4 requests/min on the VirusTotal free tier).
  * Flaky E2E tests due to internet connectivity or external API downtime.
* **Physical Hardware & OS-Specific Network Interfaces:** Automated tests will run against simulated flow data rather than listening to physical, promiscuous-mode hardware interfaces, ensuring platform independence (e.g., test runs can succeed on Windows, macOS, or headless Linux CI/CD environments).

---

## 4. Test Strategy & Selected SQA Tools

We select specialized tools that map directly to the Intellihunt architecture for maximum coverage and reliability:

| Test Level / Target | Selected Tool | Rationale for Choice |
| :--- | :--- | :--- |
| **End-to-End UI Automation** | **Selenium WebDriver (Python)** | Since the backend and ML layers are Python-native, writing Selenium tests in Python allows the test codebase to reside in a single language, reuse backend database helpers, and share configurations within `.venv`. |
| **Test Runner & Assertions** | **PyTest** | Standard, highly extensible Python test framework featuring fixtures, parametrization, and clean reporting. |
| **Backend API Integration** | **FastAPI TestClient + HTTPX** | Provides high-speed, in-memory execution of endpoints without needing a running server instance during unit testing. |
| **Database Mocking / Caching** | **Mongomock & Local stubs** | Mocks MongoDB databases in memory for rapid, side-effect-free test execution. |
| **UI Component & Visuals** | **Vitest / Jest** | Rapid unit testing of individual React components. |

---

## 5. Critical Features to Test & Risk Areas

### 5.1 Critical Test Scenarios
These flows represent the "critical path" of Intellihunt. Failure in any of these will severely compromise system integrity:

1. **The Ingestion-to-Alert Pipeline (Core Value Loop):**
   * *Flow:* User uploads a malicious `.pcap` file $\rightarrow$ NFStream extracts flow features $\rightarrow$ Consensus Engine computes verdict (Random Forest + Isolation Forest + Threat Intel) $\rightarrow$ An alert is generated and stored in MongoDB $\rightarrow$ The real-time Dashboard lists the alert.
   * *Selenium Target:* Confirming that uploading a PCAP dynamically inserts a new alert item in the UI list.
2. **Authentication Guarding:**
   * *Flow:* Unauthenticated user attempts to visit `/dashboard` or `/alerts`.
   * *Selenium Target:* Ensuring the routing middleware intercepts the request and redirects them to `/auth/login`.
3. **Consensus Vote Explainer & AI Copilot Actionability:**
   * *Flow:* User clicks "Analyze with Copilot" on a Critical Alert $\rightarrow$ Prompt is compiled and sent $\rightarrow$ Grok returns plain-English explanation, MITRE ATT&CK mapping, and playbook.
   * *Selenium Target:* Asserting the copilot chat panel opens, displays structured text, and handles user chat inputs.
4. **Enforcement & Blocklist Synchronization:**
   * *Flow:* Admin adds an IP to the blocklist $\rightarrow$ New flows containing that IP must be instantly dropped/flagged as blocked.
   * *Selenium Target:* Adding an IP through the Settings blocklist UI and verifying it is saved and enforced.
5. **SMTP / Slack Alert Notification Dispatch:**
   * *Flow:* System detects a confirmed threat $\rightarrow$ Gmail SMTP or Slack Webhook sends formatting adaptive card/email.
   * *Selenium Target:* Triggering a mock threat and asserting that notification dispatchers were called with appropriate payloads.

### 5.2 High-Risk Areas
We identify the following technical risk areas and establish mitigation strategies:

* **NFStream Windows/Platform Differences:** NFStream heavily relies on C-based packages (`libpcap` / `WinPcap` / `Npcap`). Installing and executing NFStream live capture on Windows hosts often causes driver errors or dependency failures.
  * *Mitigation:* E2E test runs will focus on **PCAP upload simulations** and mocked flow injections to run reliably on Windows, leaving live capture as a platform-specific feature.
* **Grok AI Non-Determinism:** LLM responses are not 100% deterministic, which can break classic static string assertions.
  * *Mitigation:* Test assertions will validate the *presence of JSON structures* and *key phrases* (e.g., matching standard MITRE ATT&CK patterns like `T1046` or `T1567`) rather than exact text matches.
* **Database State Contamination:** E2E tests write alerts and logs, which could corrupt production collections or cause test results to leak across runs.
  * *Mitigation:* Implement a dedicated `test_intellihunt` database in MongoDB, and write a setup/teardown fixture that clears test data before and after each Selenium suite run.

---

## 6. Test Types to Be Used

To achieve comprehensive SQA coverage, we implement a multi-layered testing taxonomy:

```
┌─────────────────────────────────────────────────────────┐
│              E2E UI Testing (Selenium)                  │  <-- Focus of Phase 2
└────────────────────────────┬────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────┐
│         API Integration Testing (FastAPI + HTTPX)       │
└────────────────────────────┬────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────┐
│        Unit & ML Testing (PyTest / StandardScaler)      │
└─────────────────────────────────────────────────────────┘
```

1. **End-to-End (E2E) UI Testing:** Using Selenium WebDriver to simulate real analyst actions: opening pages, typing login details, navigating between tabs, clicking alert details, downloading PDFs, and entering prompt queries.
2. **API Integration Testing:** Verifying FastAPI routing contracts, Pydantic type validation, database retrieval performance, and custom headers.
3. **ML Inference and Consensus Validation:** Feeding deterministic flow features (such as synthetic DDoS, PortScan, and Benign flows) to the Random Forest and Isolation Forest models and ensuring their prediction probabilities meet specified thresholds.
4. **Security Testing (Auth & RBAC):** Injecting empty headers, invalid tokens, and trying to bypass route guards to verify system security.
5. **Regression Testing:** Automated test execution on every major branch merge to catch side effects or broken dependencies early.

---

## 7. Entry and Exit Criteria

To manage the progression of testing phases systematically, the following transition criteria are established:

### 7.1 Entry Criteria (When to Start Testing)
1. **Core Stability:** The frontend (React) and backend (FastAPI) applications compile and run locally without fatal runtime crashes.
2. **Test Environment Provisioned:** A separate local or staging database (`test_intellihunt`) is configured.
3. **Selenium Infrastructure Configured:** Python Virtual Environment (`.venv`) is activated, and required packages (`selenium`, `webdriver-manager`, `pytest`) are successfully installed.
4. **Third-Party Mocks Ready:** API stubs for VirusTotal, AbuseIPDB, and Grok are created and switchable via environment variables.

### 7.2 Exit Criteria (When to Complete Testing)
1. **Test Execution Coverage:** 100% of all planned "Critical Path" E2E Selenium scenarios are automated and executed.
2. **Pass Rate Target:** Minimum **95% pass rate** across all automated E2E tests, with **100% pass rate** for critical authentication and data ingestion tests.
3. **Defect Resolution:** 
   * Zero open "Critical" or "Major" severity defects in the application.
   * "Medium" or "Minor" defects documented and scheduled for post-delivery patches.
4. **Validation Documentation:** Full walkthrough and test execution logs successfully logged and saved in the repository under `/docs/walkthrough.md`.

---

## 8. SQA Project Schedule & Phases

We will adhere to the following phased roadmap:

* **Phase 1: Test Planning (Current):** Establish scope, tools, architecture, and commit the Test Plan document.
* **Phase 2: Selenium E2E Automation (Next):** Implement the Python Selenium scripts, set up local database isolation, write helpers for element selection, and execute UI tests.
* **Phase 3: Security & Performance Audit:** Run access control checks and API latency testing.
* **Phase 4: Walkthrough & Delivery:** Compile final reports, capture visual execution artifacts, and deliver the final codebase.
