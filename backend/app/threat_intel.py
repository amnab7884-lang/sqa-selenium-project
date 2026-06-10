import httpx
import os
import ipaddress
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the project root (two levels up from backend/app/)
_project_root = Path(__file__).resolve().parent.parent.parent
load_dotenv(_project_root / ".env")

VT_API_KEY = os.getenv("VT_API_KEY", "")
ABUSE_IPDB_KEY = os.getenv("ABUSE_IPDB_KEY", "")


def detect_ip_version(ip: str) -> dict:
    """
    Detect whether an IP is IPv4 or IPv6 and flag known limitations.
    Returns metadata that the consensus engine uses to adjust its weights.
    """
    try:
        addr = ipaddress.ip_address(ip)
        is_v6 = addr.version == 6
        is_private = addr.is_private
        is_loopback = addr.is_loopback
        is_link_local = addr.is_link_local
    except ValueError:
        # Not a valid IP (could be hostname or "Unknown")
        return {"version": "unknown", "is_ipv6": False, "is_private": False,
                "ti_reliability": "normal", "note": ""}

    if is_v6:
        return {
            "version": "IPv6",
            "is_ipv6": True,
            "is_private": is_private,
            "ti_reliability": "low",
            "note": "IPv6 — Threat Intel databases have sparse coverage. ML behavior analysis is primary.",
        }
    else:
        return {
            "version": "IPv4",
            "is_ipv6": False,
            "is_private": is_private,
            "ti_reliability": "high" if not is_private else "low",
            "note": "Private IP — not routable on the internet." if is_private else "",
        }


async def check_ip_reputation(ip: str):
    """
    Checks the reputation of an IP address using VirusTotal and AbuseIPDB.
    Returns structured data with both human-readable strings AND numeric scores
    so the consensus engine can factor them into the unified verdict.

    For IPv6 addresses, the reliability of Threat Intel is flagged as 'low'
    because databases have extremely sparse IPv6 coverage. The consensus engine
    will automatically reduce the weight of TI and rely more on ML models.
    """
    ip_info = detect_ip_version(ip)

    results = {
        "virustotal": "API Key Missing",
        "abuseipdb": "API Key Missing",
        # Numeric scores for the consensus engine (0.0 = clean, 1.0 = malicious)
        "vt_malicious_count": 0,
        "vt_score": 0.0,
        "abuse_confidence": 0,
        "abuse_score": 0.0,
        "intel_threat_score": 0.0,  # Combined Threat Intel score (0-1)
        # IPv6/IPv4 metadata
        "ip_version": ip_info["version"],
        "is_ipv6": ip_info["is_ipv6"],
        "is_private": ip_info["is_private"],
        "ti_reliability": ip_info["ti_reliability"],
        "ip_note": ip_info["note"],
    }

    # Skip Threat Intel lookups for private/loopback IPs (they'll always return nothing)
    if ip_info["is_private"]:
        results["virustotal"] = "Skipped (private IP)"
        results["abuseipdb"] = "Skipped (private IP)"
        results["ti_reliability"] = "none"
        return results

    # VirusTotal Check
    if VT_API_KEY:
        try:
            url = f"https://www.virustotal.com/api/v3/ip_addresses/{ip}"
            headers = {"x-apikey": VT_API_KEY}
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    stats = data['data']['attributes']['last_analysis_stats']
                    malicious = stats.get('malicious', 0)
                    suspicious = stats.get('suspicious', 0)
                    harmless = stats.get('harmless', 0)
                    total = malicious + suspicious + harmless + stats.get('undetected', 0)

                    results["virustotal"] = f"Malicious: {malicious}, Harmless: {harmless}"
                    results["vt_malicious_count"] = malicious + suspicious
                    results["vt_score"] = min((malicious + suspicious) / 5.0, 1.0) if total > 0 else 0.0
                elif response.status_code == 404 and ip_info["is_ipv6"]:
                    # VirusTotal often returns 404 for IPv6 — not an error, just no data
                    results["virustotal"] = "No data (IPv6 not indexed)"
                    results["vt_score"] = 0.0
                else:
                    results["virustotal"] = f"Error: {response.status_code}"
        except Exception as e:
            results["virustotal"] = f"Error: {str(e)}"

    # AbuseIPDB Check
    if ABUSE_IPDB_KEY:
        try:
            url = f"https://api.abuseipdb.com/api/v2/check"
            params = {"ipAddress": ip, "maxAgeInDays": "90"}
            headers = {"Key": ABUSE_IPDB_KEY, "Accept": "application/json"}
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, params=params)
                if response.status_code == 200:
                    data = response.json()
                    confidence = data['data']['abuseConfidenceScore']
                    total_reports = data['data'].get('totalReports', 0)
                    results["abuseipdb"] = f"Confidence Score: {confidence}%"
                    results["abuse_confidence"] = confidence
                    results["abuse_score"] = confidence / 100.0

                    # IPv6 with 0 reports is meaningless — don't trust the "clean" result
                    if ip_info["is_ipv6"] and total_reports == 0 and confidence == 0:
                        results["abuseipdb"] += " (no IPv6 reports — unreliable)"
                else:
                    results["abuseipdb"] = f"Error: {response.status_code}"
        except Exception as e:
            results["abuseipdb"] = f"Error: {str(e)}"

    # Combined Threat Intel score (average of available scores)
    scores = []
    if results["vt_score"] > 0 or VT_API_KEY:
        scores.append(results["vt_score"])
    if results["abuse_score"] > 0 or ABUSE_IPDB_KEY:
        scores.append(results["abuse_score"])

    results["intel_threat_score"] = sum(scores) / len(scores) if scores else 0.0

    return results
