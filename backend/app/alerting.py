"""
Alerting module for Intellihunt Cyber Threat Hunting Copilot.
Sends real-time notifications via Gmail (SMTP), Slack Webhooks, and Microsoft Teams Webhooks
when high-risk threats or anomalies are detected.
"""

import os
import ssl
import json
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ─── Configuration (loaded from .env via database.py's load_dotenv) ──────

# Gmail SMTP
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")  # Use App Password for Gmail
ALERT_EMAIL_TO = os.getenv("ALERT_EMAIL_TO", "")  # Comma-separated recipients

# Slack
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")

# Microsoft Teams
TEAMS_WEBHOOK_URL = os.getenv("TEAMS_WEBHOOK_URL", "")


def _is_enabled(channel: str) -> bool:
    """Check if a notification channel is configured."""
    if channel == "email":
        return bool(SMTP_USER and SMTP_PASS)
    elif channel == "slack":
        return bool(SLACK_WEBHOOK_URL)
    elif channel == "teams":
        return bool(TEAMS_WEBHOOK_URL)
    return False


def get_alert_config():
    """Return current alerting configuration status."""
    return {
        "email": {
            "enabled": _is_enabled("email"),
            "recipient": ALERT_EMAIL_TO if ALERT_EMAIL_TO else "From authorized users DB",
        },
        "slack": {
            "enabled": _is_enabled("slack"),
        },
        "teams": {
            "enabled": _is_enabled("teams"),
        },
    }


async def _get_recipient_emails() -> list:
    """Get email recipients: authorized users from DB + ALERT_EMAIL_TO fallback."""
    recipients = set()

    # 1. Fetch from MongoDB authorized_users collection
    try:
        from database import get_db
        db = get_db()
        async for user in db.authorized_users.find({}, {"email": 1, "_id": 0}):
            email = user.get("email", "").strip()
            if email:
                recipients.add(email)
    except Exception as e:
        logger.warning(f"Could not fetch authorized users from DB: {e}")

    # 2. Fallback: add ALERT_EMAIL_TO from .env
    if ALERT_EMAIL_TO:
        for email in ALERT_EMAIL_TO.split(","):
            email = email.strip()
            if email:
                recipients.add(email)

    return list(recipients)


async def send_email_alert(alert: dict):
    """Send alert notification via Gmail SMTP to all authorized users."""
    if not _is_enabled("email"):
        return

    try:
        # Get recipients from DB + .env
        recipients = await _get_recipient_emails()
        if not recipients:
            logger.warning("No email recipients configured (add users in Users page or set ALERT_EMAIL_TO)")
            return

        subject = f"🚨 INTELLIHUNT Alert: {alert.get('type', 'Unknown')} — Risk {alert.get('score', 0):.0%}"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background: #1a1a2e; color: #e0e0e0; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background: #16213e; border-radius: 12px; padding: 24px; border: 1px solid #0f3460;">
                <h1 style="color: #e94560; margin-top: 0;">🛡️ INTELLIHUNT Security Alert</h1>
                <hr style="border-color: #0f3460;">
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px; color: #a0a0a0;">Alert Type</td>
                        <td style="padding: 8px; font-weight: bold; color: #e94560;">{alert.get('type', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; color: #a0a0a0;">Risk Score</td>
                        <td style="padding: 8px; font-weight: bold; color: #ff6b6b;">{alert.get('score', 0):.2%}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; color: #a0a0a0;">Source IP</td>
                        <td style="padding: 8px; font-family: monospace;">{alert.get('source', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; color: #a0a0a0;">Destination IP</td>
                        <td style="padding: 8px; font-family: monospace;">{alert.get('destination', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; color: #a0a0a0;">Anomaly Detected</td>
                        <td style="padding: 8px;">{"⚠️ YES" if alert.get('anomaly') else "No"}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; color: #a0a0a0;">Timestamp</td>
                        <td style="padding: 8px;">{alert.get('timestamp', 'N/A')}</td>
                    </tr>
                </table>
                
                <hr style="border-color: #0f3460;">
                <p style="color: #a0a0a0; font-size: 12px; margin-bottom: 0;">
                    Sent by Intellihunt Cyber Threat Hunting Copilot<br>
                    Recipients: {', '.join(recipients)}
                </p>
            </div>
        </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = ", ".join(recipients)
        msg.attach(MIMEText(html_body, "html"))

        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, recipients, msg.as_string())

        logger.info(f"📧 Email alert sent to {len(recipients)} recipients: {', '.join(recipients)}")

    except Exception as e:
        logger.error(f"❌ Email alert failed: {e}")


async def send_slack_alert(alert: dict):
    """Send alert notification to Slack via Incoming Webhook."""
    if not _is_enabled("slack"):
        return

    try:
        risk_emoji = "🔴" if alert.get("score", 0) > 0.8 else "🟡"
        anomaly_text = "⚠️ Anomaly Detected" if alert.get("anomaly") else ""

        payload = {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": f"🛡️ INTELLIHUNT: {alert.get('type', 'Security Alert')}",
                        "emoji": True,
                    },
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Risk Score:*\n{risk_emoji} {alert.get('score', 0):.2%}"},
                        {"type": "mrkdwn", "text": f"*Alert Type:*\n{alert.get('type', 'N/A')}"},
                        {"type": "mrkdwn", "text": f"*Source IP:*\n`{alert.get('source', 'N/A')}`"},
                        {"type": "mrkdwn", "text": f"*Destination:*\n`{alert.get('destination', 'N/A')}`"},
                    ],
                },
                {
                    "type": "context",
                    "elements": [
                        {"type": "mrkdwn", "text": f"{anomaly_text} | {alert.get('timestamp', '')}"},
                    ],
                },
            ]
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(SLACK_WEBHOOK_URL, json=payload)
            if response.status_code == 200:
                logger.info("💬 Slack alert sent")
            else:
                logger.error(f"❌ Slack alert failed: {response.status_code}")

    except Exception as e:
        logger.error(f"❌ Slack alert failed: {e}")


async def send_teams_alert(alert: dict):
    """Send alert notification to Microsoft Teams via Incoming Webhook."""
    if not _is_enabled("teams"):
        return

    try:
        risk_color = "FF0000" if alert.get("score", 0) > 0.8 else "FFA500"

        # Adaptive Card payload for Teams
        payload = {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.4",
                        "body": [
                            {
                                "type": "TextBlock",
                                "text": f"🛡️ INTELLIHUNT: {alert.get('type', 'Security Alert')}",
                                "weight": "Bolder",
                                "size": "Large",
                                "color": "Attention",
                            },
                            {
                                "type": "FactSet",
                                "facts": [
                                    {"title": "Risk Score", "value": f"{alert.get('score', 0):.2%}"},
                                    {"title": "Alert Type", "value": alert.get("type", "N/A")},
                                    {"title": "Source IP", "value": alert.get("source", "N/A")},
                                    {"title": "Destination", "value": alert.get("destination", "N/A")},
                                    {"title": "Anomaly", "value": "⚠️ YES" if alert.get("anomaly") else "No"},
                                    {"title": "Timestamp", "value": alert.get("timestamp", "N/A")},
                                ],
                            },
                        ],
                    },
                }
            ],
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(TEAMS_WEBHOOK_URL, json=payload)
            if response.status_code in (200, 202):
                logger.info("📢 Teams alert sent")
            else:
                logger.error(f"❌ Teams alert failed: {response.status_code} {response.text}")

    except Exception as e:
        logger.error(f"❌ Teams alert failed: {e}")


async def send_all_alerts(alert: dict):
    """Send alert to all configured channels."""
    await send_email_alert(alert)
    await send_slack_alert(alert)
    await send_teams_alert(alert)
