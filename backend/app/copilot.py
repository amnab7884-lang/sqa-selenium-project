"""
AI Copilot backend for Intellihunt — uses Grok API (xAI) via OpenAI-compatible endpoint.
Explains alerts in plain English and suggests mitigation strategies.
"""

import os
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

GROK_API_KEY = os.getenv("GROK_API_KEY", "")
GROK_API_URL = os.getenv("GROK_API_URL", "https://api.x.ai/v1/chat/completions")
GROK_MODEL = os.getenv("GROK_MODEL", "grok-3-mini-fast")

SYSTEM_PROMPT = """You are INTELLIHUNT Copilot — an AI security analyst embedded in a Cyber Threat Hunting platform.

RESPONSE FORMAT RULES (CRITICAL):
- Keep responses SHORT and STRUCTURED. Max 150 words unless user asks for detail.
- Use this structure for alert analysis:
  ## Summary
  One sentence: what happened and why it matters.
  ## Risk Level
  Critical/High/Medium/Low + one-line justification.
  ## Mitigation Steps
  1. First action (most urgent)
  2. Second action
  3. Third action
- Use bullet points, not paragraphs.
- Bold key terms like **IP addresses**, **attack types**, and **risk scores**.
- If the user asks a general question, answer concisely with bullet points.
- Never repeat the question back. Jump straight to the answer.
- Reference threat intel data (VirusTotal, AbuseIPDB) when available.
- Use professional security terminology but explain jargon in parentheses."""


async def chat_with_copilot(
    user_message: str,
    alert_context: Optional[dict] = None,
    system_stats: Optional[dict] = None,
) -> str:
    """
    Send a message to the Grok API and get a response.

    Args:
        user_message: The user's question
        alert_context: Optional alert data for context
        system_stats: Optional system stats for context
    """
    if not GROK_API_KEY:
        return (
            "⚠️ **Copilot is not configured.** Add your Grok API key to `.env`:\n\n"
            "```\nGROK_API_KEY=xai-your-key-here\n```\n\n"
            "Get a key at [console.x.ai](https://console.x.ai)"
        )

    # Build context message
    context_parts = []
    if alert_context:
        context_parts.append(f"**Current Alert Context:**\n"
            f"- Type: {alert_context.get('type', 'N/A')}\n"
            f"- Source IP: {alert_context.get('source', 'N/A')}\n"
            f"- Destination IP: {alert_context.get('destination', 'N/A')}\n"
            f"- Risk Score: {alert_context.get('score', 0):.0%}\n"
            f"- Anomaly Detected: {'Yes' if alert_context.get('anomaly') else 'No'}\n"
            f"- Threat Intel: {alert_context.get('intel', {})}\n"
            f"- Timestamp: {alert_context.get('timestamp', 'N/A')}")

    if system_stats:
        context_parts.append(f"**System Stats:**\n"
            f"- Total logs: {system_stats.get('total_logs', 0):,}\n"
            f"- Total alerts: {system_stats.get('total_alerts', 0)}\n"
            f"- Anomalies: {system_stats.get('anomaly_count', 0)}\n"
            f"- High-risk events: {system_stats.get('high_risk_count', 0)}")

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if context_parts:
        messages.append({"role": "system", "content": "\n\n".join(context_parts)})
    messages.append({"role": "user", "content": user_message})

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROK_API_URL,
                headers={
                    "Authorization": f"Bearer {GROK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROK_MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1024,
                },
            )

            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                logger.error(f"Grok API error: {response.status_code} {response.text}")
                return f"⚠️ Copilot API error ({response.status_code}). Please check your GROK_API_KEY."

    except httpx.TimeoutException:
        return "⚠️ Copilot request timed out. Please try again."
    except Exception as e:
        logger.error(f"Copilot error: {e}")
        return f"⚠️ Copilot error: {str(e)}"


async def classify_mitre_attack(alert: dict) -> dict:
    """
    Auto-classify an alert to a MITRE ATT&CK technique using Grok.
    Returns: {technique_id, technique_name, tactic, description}
    """
    if not GROK_API_KEY:
        return {"technique_id": "N/A", "technique_name": "Not configured", "tactic": "N/A", "description": "Add GROK_API_KEY"}

    prompt = f"""Classify this network security alert to a MITRE ATT&CK technique.

Alert: {alert.get('type', 'Unknown')}
Source IP: {alert.get('source', 'N/A')}
Destination: {alert.get('destination', 'N/A')}
Risk Score: {alert.get('score', 0):.0%}
Anomaly: {alert.get('anomaly', False)}

Respond ONLY with valid JSON (no markdown, no code fences):
{{"technique_id": "T1234", "technique_name": "Name", "tactic": "Tactic Phase", "description": "One sentence"}}"""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                GROK_API_URL,
                headers={"Authorization": f"Bearer {GROK_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": GROK_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are a MITRE ATT&CK classifier. Respond ONLY with valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.2,
                    "max_tokens": 200,
                },
            )
            if resp.status_code == 200:
                import json
                text = resp.json()["choices"][0]["message"]["content"].strip()
                # Strip any markdown code fences
                text = text.replace("```json", "").replace("```", "").strip()
                return json.loads(text)
            return {"technique_id": "Error", "technique_name": "API Error", "tactic": "N/A", "description": str(resp.status_code)}
    except Exception as e:
        logger.error(f"MITRE classification error: {e}")
        return {"technique_id": "Error", "technique_name": "Classification Failed", "tactic": "N/A", "description": str(e)}


async def get_playbook_steps(alert: dict) -> list:
    """
    Generate automated response playbook steps for an alert using Grok.
    Returns a list of step dicts: [{step, action, description, auto}]
    """
    if not GROK_API_KEY:
        return [{"step": 1, "action": "Configure API", "description": "Add GROK_API_KEY to .env", "auto": False}]

    prompt = f"""Generate an incident response playbook for this alert.

Alert Type: {alert.get('type', 'Unknown')}
Source IP: {alert.get('source', 'N/A')}
Destination: {alert.get('destination', 'N/A')}
Risk Score: {alert.get('score', 0):.0%}
Anomaly: {alert.get('anomaly', False)}

Return ONLY a JSON array (no markdown, no code fences) with 4-6 response steps:
[{{"step": 1, "action": "Short Title", "description": "What to do", "auto": true/false}}]

Rules:
- "auto": true means the system can execute this automatically (e.g., block IP, send alert)
- "auto": false means it needs human review (e.g., investigate endpoint)
- Order from most urgent to least urgent
- Be specific with IP addresses and actions"""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                GROK_API_URL,
                headers={"Authorization": f"Bearer {GROK_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": GROK_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are an incident response expert. Respond ONLY with valid JSON arrays."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500,
                },
            )
            if resp.status_code == 200:
                import json
                text = resp.json()["choices"][0]["message"]["content"].strip()
                text = text.replace("```json", "").replace("```", "").strip()
                return json.loads(text)
            return [{"step": 1, "action": "Error", "description": f"API returned {resp.status_code}", "auto": False}]
    except Exception as e:
        logger.error(f"Playbook generation error: {e}")
        return [{"step": 1, "action": "Error", "description": str(e), "auto": False}]


async def generate_attack_report(stats: dict) -> str:
    """
    Generate a statistical analysis report of attack patterns using Grok.
    """
    if not GROK_API_KEY:
        return "⚠️ Add GROK_API_KEY to .env to generate reports."

    prompt = f"""Analyze these cybersecurity statistics and generate a concise report.

Data:
{stats}

Write a professional security report with these sections:
## Executive Summary
One paragraph overview.

## Attack Pattern Analysis
- Most common attack types and their frequency
- Peak attack hours/patterns
- Source IP analysis

## Risk Assessment
- Overall risk posture (Critical/High/Medium/Low)
- Key vulnerabilities identified

## Training Recommendations
Based on the attack patterns, recommend specific areas where the security team needs more training.

## Recommended Actions
Numbered list of concrete next steps.

Keep it concise — max 400 words. Use bullet points."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                GROK_API_URL,
                headers={"Authorization": f"Bearer {GROK_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": GROK_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are a cybersecurity analyst writing an executive report. Be concise and data-driven."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.4,
                    "max_tokens": 1500,
                },
            )
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
            return f"⚠️ Report generation failed (HTTP {resp.status_code})"
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        return f"⚠️ Report generation error: {str(e)}"

