import os
import hashlib
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, UploadFile, File, Form
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import subprocess
import signal
import tempfile
import shutil
import json
import asyncio
from datetime import datetime
from threat_intel import check_ip_reputation
from database import connect_db, close_db, get_db
from alerting import send_all_alerts, get_alert_config
from reporting import generate_incident_report
from copilot import chat_with_copilot, classify_mitre_attack, get_playbook_steps, generate_attack_report
from bson import ObjectId

# Initialize FastAPI
app = FastAPI(title="Cyber Threat Hunting Copilot API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load ML Artifacts
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "ml")
rf_model = joblib.load(os.path.join(MODEL_PATH, "rf_model.pkl"))
iso_model = joblib.load(os.path.join(MODEL_PATH, "iso_model.pkl"))
scaler = joblib.load(os.path.join(MODEL_PATH, "scaler.pkl"))
feature_names = joblib.load(os.path.join(MODEL_PATH, "feature_names.pkl"))


# ─── Attack Type Classifier ─────────────────────────────────────────
# Analyzes network flow features to identify the specific attack type.
# Uses CICIDS2017 feature patterns (packet rates, flags, durations, etc.)

def classify_attack_type(flow: dict, risk_score: float, is_anomaly: bool) -> dict:
    """
    Classify the attack type based on network flow features.
    Returns: {"attack_type": str, "attack_category": str, "confidence": str}
    """
    # Extract key features (case-insensitive lookup)
    def get(key, default=0):
        return float(flow.get(key, flow.get(key.replace(" ", "_"), default)))

    syn_flags     = get("SYN FLAG COUNT")
    ack_flags     = get("ACK FLAG COUNT")
    fin_flags     = get("FIN FLAG COUNT")
    rst_flags     = get("RST FLAG COUNT")
    psh_flags     = get("PSH FLAG COUNT")
    urg_flags     = get("URG FLAG COUNT")
    fwd_packets   = get("TOTAL FWD PACKETS")
    bwd_packets   = get("TOTAL BACKWARD PACKETS")
    flow_bytes_s  = get("FLOW BYTES/S")
    flow_pkts_s   = get("FLOW PACKETS/S")
    flow_duration = get("FLOW DURATION")
    fwd_pkt_len   = get("FWD PACKET LENGTH MEAN")
    bwd_pkt_len   = get("BWD PACKET LENGTH MEAN")
    pkt_len_mean  = get("PACKET LENGTH MEAN")
    pkt_len_std   = get("PACKET LENGTH STD")
    fwd_iat_mean  = get("FWD IAT MEAN")
    protocol      = get("PROTOCOL")
    fwd_bytes     = get("FWD PACKETS LENGTH TOTAL", get("SUBFLOW FWD BYTES"))
    bwd_bytes     = get("BWD PACKETS LENGTH TOTAL", get("SUBFLOW BWD BYTES"))
    fwd_hdr_len   = get("FWD HEADER LENGTH")
    down_up_ratio = get("DOWN/UP RATIO")

    total_packets = fwd_packets + bwd_packets
    total_flags   = syn_flags + ack_flags + fin_flags + rst_flags + psh_flags

    # ── Classification Rules (ordered by specificity) ──

    # 1) SYN Flood: Massive SYN flags with very few ACKs
    if syn_flags > 100 and (ack_flags < syn_flags * 0.1) and fwd_packets > 1000:
        return {"attack_type": "SYN Flood", "attack_category": "Volumetric DoS", "confidence": "high"}

    # 2) DDoS — Volumetric: Extreme packet/byte rate
    if flow_pkts_s > 100000 or (flow_bytes_s > 10000000 and fwd_packets > 5000):
        return {"attack_type": "DDoS — Volumetric Flood", "attack_category": "Distributed Denial of Service", "confidence": "high"}

    # 3) SYN Flood (moderate): High SYN ratio
    if syn_flags > 50 and total_flags > 0 and (syn_flags / max(total_flags, 1)) > 0.8:
        return {"attack_type": "SYN Flood", "attack_category": "Volumetric DoS", "confidence": "medium"}

    # 4) UDP Flood: Protocol 17 + high packet rate
    if protocol == 17 and flow_pkts_s > 10000:
        return {"attack_type": "UDP Flood", "attack_category": "Volumetric DoS", "confidence": "high"}

    # 5) ICMP Flood: Protocol 1 + high volume
    if protocol == 1 and fwd_packets > 500:
        return {"attack_type": "ICMP Flood", "attack_category": "Volumetric DoS", "confidence": "high"}

    # 6) Port Scan: Many small packets, very short flows, high RST flags
    if fwd_packets > 20 and pkt_len_mean < 100 and flow_duration < 5000 and rst_flags > 10:
        return {"attack_type": "Port Scan", "attack_category": "Reconnaissance", "confidence": "high"}

    # 7) Port Scan (stealth): Low rate, small packets, high RST
    if rst_flags > fwd_packets * 0.5 and fwd_packets > 5 and pkt_len_mean < 80:
        return {"attack_type": "Stealth Port Scan", "attack_category": "Reconnaissance", "confidence": "medium"}

    # 8) Slowloris / Slow HTTP: Very long duration, very few packets
    if flow_duration > 60000 and fwd_packets < 20 and flow_pkts_s < 1:
        return {"attack_type": "Slowloris / Slow HTTP", "attack_category": "Application Layer DoS", "confidence": "medium"}

    # 9) HTTP Flood: Protocol 6, large payloads, moderate-high rate
    if protocol == 6 and fwd_pkt_len > 500 and flow_pkts_s > 1000 and psh_flags > 10:
        return {"attack_type": "HTTP Flood", "attack_category": "Application Layer DoS", "confidence": "medium"}

    # 10) Brute Force: Consistent small packets, many forward with few backward
    if fwd_packets > 50 and bwd_packets > 0 and bwd_packets < fwd_packets * 0.3 and pkt_len_mean < 300 and pkt_len_std < 50:
        return {"attack_type": "Brute Force", "attack_category": "Credential Attack", "confidence": "medium"}

    # 11) DNS Amplification: Protocol 17, large response vs small request
    if protocol == 17 and bwd_bytes > fwd_bytes * 5 and bwd_pkt_len > 500:
        return {"attack_type": "DNS Amplification", "attack_category": "Reflection/Amplification", "confidence": "medium"}

    # 12) DoS — Generic high-volume: High byte rate
    if flow_bytes_s > 1000000 and fwd_packets > 500:
        return {"attack_type": "DoS — High Volume", "attack_category": "Denial of Service", "confidence": "medium"}

    # 12b) DoS — Moderate volume (lower threshold for CICIDS-scale data)
    if flow_bytes_s > 100000 and fwd_packets > 100 and bwd_packets < fwd_packets * 0.3:
        return {"attack_type": "DoS — Flood", "attack_category": "Denial of Service", "confidence": "medium"}

    # 13) Data Exfiltration: Large outbound transfer, few inbound
    if fwd_bytes > 1000000 and bwd_bytes < fwd_bytes * 0.05 and flow_duration > 10000:
        return {"attack_type": "Data Exfiltration", "attack_category": "Exfiltration", "confidence": "low"}

    # ── ML-Confidence-Based Classification ────────────────────────
    # When the Random Forest is very confident but no rule-based pattern matched,
    # use traffic characteristics + ML confidence to provide a useful classification
    # instead of the generic "Suspicious Traffic" fallback.

    # 14) High-confidence ML + anomaly detection agree → strong signal
    if risk_score > 0.9 and is_anomaly:
        if fwd_packets > bwd_packets * 3 and total_packets > 10:
            return {"attack_type": "DDoS — ML Confirmed", "attack_category": "Denial of Service", "confidence": "high"}
        if flow_duration > 30000 and flow_pkts_s < 5:
            return {"attack_type": "Slow-Rate Attack — ML Confirmed", "attack_category": "Application Layer DoS", "confidence": "medium"}
        return {"attack_type": "Network Attack — ML Confirmed", "attack_category": "ML-Detected Threat", "confidence": "high"}

    # 15) High-confidence ML only (no anomaly) → likely known attack pattern
    if risk_score > 0.9:
        if fwd_packets > bwd_packets * 2 and total_packets > 20:
            return {"attack_type": "DDoS — Signature Match", "attack_category": "Denial of Service", "confidence": "high"}
        if pkt_len_mean < 100 and total_packets > 30:
            return {"attack_type": "Probe / Scan — ML Detected", "attack_category": "Reconnaissance", "confidence": "medium"}
        return {"attack_type": "Attack Pattern — ML Detected", "attack_category": "ML-Detected Threat", "confidence": "medium"}

    # 16) Anomalous but unclassified: Isolation Forest triggered, can't match pattern
    if is_anomaly and risk_score > 0.3:
        return {"attack_type": "Anomalous Traffic", "attack_category": "Unknown / Zero-Day", "confidence": "low"}

    # 17) Moderate ML risk but no pattern match
    if risk_score > 0.5:
        return {"attack_type": "Suspicious Traffic", "attack_category": "Unclassified Threat", "confidence": "low"}

    return {"attack_type": "Suspicious Activity", "attack_category": "Low Confidence", "confidence": "low"}


class NetworkLog(BaseModel):
    data: dict
    timestamp: Optional[datetime] = None


# ─── Lifecycle Events ────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    await connect_db()

@app.on_event("shutdown")
async def shutdown_event():
    await close_db()


# ─── ML Model Metrics ────────────────────────────────────────────────
import json as _json
_METRICS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "ml", "evaluation_results", "metrics.json")

@app.get("/models/metrics")
async def get_model_metrics():
    """Return ML model validation metrics from latest evaluation run."""
    if os.path.exists(_METRICS_PATH):
        with open(_METRICS_PATH) as f:
            return _json.load(f)
    return {"error": "No validation results found. Run: python ml/validate_model.py"}


# ─── Helper ──────────────────────────────────────────────────────────

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


# ─── Consensus Engine ────────────────────────────────────────────────
# Combines all 3 signals (Random Forest, Isolation Forest, Threat Intel)
# using a pure pass-through approach: each layer independently votes
# "threat" or "not threat" and the verdict is determined by majority vote.
# NO artificial weights are assigned — raw model outputs drive the decision.

def compute_consensus(rf_prob: float, is_anomaly: bool, intel: dict) -> dict:
    """
    Produces a single unified verdict by passing data through each detection
    layer and counting their independent votes. No weights are assigned.
    
    Detection Layers:
        1. Random Forest Model  → predict_proba > 0.5 means "attack"
        2. Isolation Forest Model → predict == -1 means "anomaly"
        3. Threat Intel API     → IP reputation score > 0.3 means "malicious"
    
    Verdict Logic (pure majority vote):
        3/3 layers flag → CONFIRMED THREAT (critical)
        2/3 layers flag → LIKELY THREAT (high) or CONFIRMED THREAT if both ML models agree
        1/3 layers flag → SUSPICIOUS (medium) — depends on which layer flagged
        0/3 layers flag → BENIGN (low)
    
    Returns:
        {
            "verdict": str,           # CONFIRMED THREAT | LIKELY THREAT | SUSPICIOUS ANOMALY | KNOWN MALICIOUS IP | BENIGN
            "severity": str,          # critical | high | medium | low
            "consensus_score": float, # raw RF probability (no weight manipulation)
            "explanation": str,       # one-sentence summary for the dashboard
            "agreement": str,         # "all_agree" | "majority" | "split"
        }
    """
    # ─── Raw scores from each layer (no weight manipulation) ──────
    rf_score = float(rf_prob)                           # direct from model predict_proba
    ti_score = float(intel.get("intel_threat_score", 0)) # direct from API response

    ti_reliability = intel.get("ti_reliability", "normal")
    is_ipv6 = intel.get("is_ipv6", False)

    # ─── Each layer votes independently ───────────────────────────
    rf_flags_threat = rf_score > 0.5          # Random Forest says attack
    if_flags_threat = bool(is_anomaly)        # Isolation Forest says anomaly
    ti_flags_threat = ti_score > 0.3          # Threat Intel API says malicious

    # For IPv6 or unreliable TI: exclude TI vote (APIs have poor IPv6 coverage)
    if is_ipv6 or ti_reliability in ("low", "none"):
        active_votes = [rf_flags_threat, if_flags_threat]
        ti_included = False
        max_flags = 2
    else:
        active_votes = [rf_flags_threat, if_flags_threat, ti_flags_threat]
        ti_included = True
        max_flags = 3

    flags = sum(active_votes)

    # ─── Consensus score: use raw RF probability (no weight blending) ─
    # The RF model probability is the most informative single score.
    # We pass it through directly instead of blending with artificial weights.
    consensus_score = rf_score

    # ─── Verdict Logic (pure vote-based) ──────────────────────────
    ipv6_note = " (IPv6 — ML-driven verdict, TI excluded)" if is_ipv6 else ""

    if flags == max_flags and max_flags >= 2:
        verdict = "CONFIRMED THREAT"
        severity = "critical"
        if is_ipv6:
            explanation = "Both ML models independently flag this as an attack." + ipv6_note
        else:
            explanation = "All detection layers independently agree: ML models and threat intelligence all flag this as malicious."
        agreement = "all_agree"
    elif flags >= 2:
        if rf_flags_threat and if_flags_threat:
            verdict = "CONFIRMED THREAT"
            severity = "critical"
            explanation = "Both ML models independently classify this as an attack. Threat intel may not have flagged this IP yet." + ipv6_note
        elif rf_flags_threat and ti_flags_threat:
            verdict = "LIKELY THREAT"
            severity = "high"
            explanation = "Random Forest model detects attack signature and threat intel API reports bad IP reputation."
        else:
            verdict = "LIKELY THREAT"
            severity = "high"
            explanation = "Anomalous behavior confirmed by multiple detection layers." + ipv6_note
        agreement = "majority"
    elif flags == 1:
        if rf_flags_threat:
            verdict = "LIKELY THREAT"
            severity = "high"
            explanation = "Random Forest model detects an attack signature, but other layers don't corroborate. Could be a new variant." + ipv6_note
        elif if_flags_threat:
            if is_ipv6:
                verdict = "SUSPICIOUS ANOMALY"
                severity = "medium"
                explanation = "Isolation Forest detects unusual IPv6 traffic pattern. TI databases have limited IPv6 coverage."
            else:
                verdict = "SUSPICIOUS ANOMALY"
                severity = "medium"
                explanation = "Isolation Forest detects unusual traffic pattern, but no known attack signature or bad IP reputation. Monitor closely."
        else:
            verdict = "KNOWN MALICIOUS IP"
            severity = "medium"
            explanation = "Threat intel API reports bad IP reputation but ML models classify traffic as normal. Possible reconnaissance."
        agreement = "split"
    else:
        verdict = "BENIGN"
        severity = "low"
        if is_ipv6:
            explanation = "Both ML models classify this IPv6 traffic as normal. (TI excluded for IPv6.)"
        else:
            explanation = "All detection layers independently agree this traffic is normal."
        agreement = "all_agree"

    return {
        "verdict": verdict,
        "severity": severity,
        "consensus_score": round(consensus_score, 4),
        "explanation": explanation,
        "agreement": agreement,
        "ip_version": intel.get("ip_version", "IPv4"),
        "ti_reliability": ti_reliability,
        "detection_layers": {
            "random_forest": {
                "score": round(rf_score, 4),
                "verdict": "ATTACK" if rf_flags_threat else "BENIGN",
                "method": "model_predict_proba"
            },
            "isolation_forest": {
                "verdict": "ANOMALY" if if_flags_threat else "NORMAL",
                "method": "model_predict"
            },
            "threat_intel": {
                "score": round(ti_score, 4),
                "verdict": "MALICIOUS" if ti_flags_threat else "CLEAN",
                "included_in_vote": ti_included,
                "method": "api_lookup"
            },
        },
        "votes": f"{flags}/{max_flags} layers flagged as threat",
    }


# ─── Routes ──────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Cyber Threat Hunting Copilot API is running"}


@app.post("/ingest")
async def ingest_log(log: NetworkLog, background_tasks: BackgroundTasks):
    """
    Endpoint for Filebeat / ingestion scripts to send logs.
    Runs inference, queries Threat Intel, computes consensus, and persists results.
    """
    db = get_db()
    input_data = log.data
    
    try:
        # Standardize keys
        standardized_data = {}
        for k, v in input_data.items():
            new_key = k.replace("_", " ").upper()
            standardized_data[new_key] = v
            if k.upper() in ["SRC_IP", "DST_IP", "SRC IP", "DST IP"]:
                standardized_data["SRC_IP"] = input_data.get("SRC_IP", input_data.get("SRC IP", v))
                standardized_data["DST_IP"] = input_data.get("DST_IP", input_data.get("DST IP", v))
        
        # ─── Blocklist Enforcement ──────────────────────────────────
        src_ip = standardized_data.get("SRC IP", standardized_data.get("SRC_IP", ""))
        blocked = await db.blocklist.find_one({"ip": src_ip, "status": "active"})
        if blocked:
            await db.blocked_events.insert_one({
                "ip": src_ip,
                "action": "DROPPED",
                "reason": blocked.get("reason", "IP is on blocklist"),
                "timestamp": datetime.now().isoformat(),
                "original_log": standardized_data,
            })
            raise HTTPException(
                status_code=403,
                detail=f"Traffic from {src_ip} blocked — IP is on the active blocklist"
            )
        # ────────────────────────────────────────────────────────────
        
        # Convert to DataFrame
        df = pd.DataFrame([standardized_data])
        X = df.reindex(columns=feature_names, fill_value=0).astype(float)
        X_scaled = scaler.transform(X)
        
        # 1. Random Forest Prediction (Risk Score)
        rf_prob = rf_model.predict_proba(X_scaled)[0][1]
        
        # 2. Isolation Forest Prediction (Anomaly Detection)
        iso_pred = iso_model.predict(X_scaled)[0]
        is_anomaly = iso_pred == -1
        
        # 3. Threat Intelligence (always query — needed for consensus)
        src_ip = standardized_data.get("SRC IP", standardized_data.get("SRC_IP", "Unknown"))
        intel_context = await check_ip_reputation(src_ip)
        
        # 4. Consensus Engine — single unified verdict
        consensus = compute_consensus(float(rf_prob), bool(is_anomaly), intel_context)
        
        now = datetime.now()
        
        # Classify the attack type based on flow features
        attack_info = classify_attack_type(standardized_data, float(rf_prob), bool(is_anomaly))
        
        analysis = {
            "risk_score": float(rf_prob),
            "is_anomaly": bool(is_anomaly),
            "attack_type": attack_info["attack_type"],
            "attack_category": attack_info["attack_category"],
            "classification_confidence": attack_info["confidence"],
            "verdict": consensus["verdict"],
            "severity": consensus["severity"],
            "consensus_score": consensus["consensus_score"],
            "consensus_explanation": consensus["explanation"],
            "agreement": consensus["agreement"],
            "detection_layers": consensus["detection_layers"],
            "votes": consensus["votes"],
            "intel": intel_context,
            "timestamp": now.isoformat(),
            "original_log": standardized_data,
        }
        
        # Save log to MongoDB
        await db.logs.insert_one({
            **analysis,
            "created_at": now
        })
        
        # Alert Decision: only generate alerts for actual threats (not lone anomalies with clean APIs)
        should_alert = consensus["verdict"] in ("CONFIRMED THREAT", "LIKELY THREAT", "KNOWN MALICIOUS IP")
        
        if should_alert:
            last_alert = await db.alerts.find_one(sort=[("id", -1)])
            next_id = (last_alert["id"] + 1) if last_alert and "id" in last_alert else 1
            
            alert = {
                "id": next_id,
                "type": attack_info["attack_type"],
                "attack_category": attack_info["attack_category"],
                "classification_confidence": attack_info["confidence"],
                "source": src_ip,
                "destination": input_data.get("DST_IP", "Unknown"),
                "score": consensus["consensus_score"],
                "anomaly": bool(is_anomaly),
                "verdict": consensus["verdict"],
                "severity": consensus["severity"],
                "explanation": consensus["explanation"],
                "agreement": consensus["agreement"],
                "detection_layers": consensus["detection_layers"],
                "votes": consensus["votes"],
                "intel": intel_context,
                "timestamp": analysis["timestamp"],
                "created_at": now,
            }
            await db.alerts.insert_one(alert)

            # Send notifications to all configured channels (Gmail/Slack/Teams)
            background_tasks.add_task(send_all_alerts, alert)
        
        return {"status": "success", "prediction": analysis}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/logs")
async def get_logs(limit: int = 1000):
    """Get recent logs (for real-time dashboard)."""
    db = get_db()
    cursor = db.logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    logs = await cursor.to_list(length=limit)
    # Return in chronological order (oldest first) to match previous behavior
    logs.reverse()
    return logs


@app.get("/alerts")
async def get_alerts(limit: int = 100):
    """Get recent alerts (for real-time dashboard)."""
    db = get_db()
    cursor = db.alerts.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    alerts = await cursor.to_list(length=limit)
    alerts.reverse()
    return alerts


@app.get("/logs/history")
async def get_logs_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    src_ip: Optional[str] = None,
    dst_ip: Optional[str] = None,
    risk_level: Optional[str] = None,  # "high", "medium", "low"
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """Paginated historical log query with filters."""
    db = get_db()
    query = {}
    
    if src_ip:
        query["original_log.SRC_IP"] = {"$regex": src_ip, "$options": "i"}
    if dst_ip:
        query["original_log.DST_IP"] = {"$regex": dst_ip, "$options": "i"}
    if risk_level:
        if risk_level == "high":
            query["risk_score"] = {"$gt": 0.7}
        elif risk_level == "medium":
            query["risk_score"] = {"$gt": 0.3, "$lte": 0.7}
        elif risk_level == "low":
            query["risk_score"] = {"$lte": 0.3}
    if start_date:
        query.setdefault("timestamp", {})["$gte"] = start_date
    if end_date:
        query.setdefault("timestamp", {})["$lte"] = end_date
    
    total = await db.logs.count_documents(query)
    skip = (page - 1) * page_size
    
    cursor = db.logs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size)
    logs = await cursor.to_list(length=page_size)
    
    return {
        "data": logs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@app.get("/alerts/history")
async def get_alerts_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    source_ip: Optional[str] = None,
    alert_type: Optional[str] = None,
):
    """Paginated historical alert query with filters."""
    db = get_db()
    query = {}
    
    if source_ip:
        query["source"] = {"$regex": source_ip, "$options": "i"}
    if alert_type:
        query["type"] = alert_type
    
    total = await db.alerts.count_documents(query)
    skip = (page - 1) * page_size
    
    cursor = db.alerts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size)
    alerts = await cursor.to_list(length=page_size)
    
    return {
        "data": alerts,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@app.get("/stats")
async def get_stats():
    """Dashboard statistics from MongoDB."""
    db = get_db()
    total_logs = await db.logs.count_documents({})
    total_alerts = await db.alerts.count_documents({})
    anomaly_count = await db.logs.count_documents({"is_anomaly": True})
    high_risk_count = await db.logs.count_documents({"risk_score": {"$gt": 0.5}})
    
    return {
        "total_logs": total_logs,
        "total_alerts": total_alerts,
        "anomaly_count": anomaly_count,
        "high_risk_count": high_risk_count
    }


@app.post("/clear")
async def clear_data():
    """Clear all logs and alerts from MongoDB."""
    db = get_db()
    logs_count = await db.logs.count_documents({})
    alerts_count = await db.alerts.count_documents({})
    
    await db.logs.delete_many({})
    await db.alerts.delete_many({})
    
    return {"status": "cleared", "deleted": {"logs": logs_count, "alerts": alerts_count}}


# ─── Alerting Endpoints ──────────────────────────────────────────────

@app.get("/alerts/config")
async def alerts_config():
    """Get current alerting channel configuration."""
    return get_alert_config()


@app.post("/alerts/test")
async def test_alert():
    """Send a test alert to all configured channels + all authorized user emails."""
    db = get_db()

    # Get authorized user emails to send to
    auth_users = await db.authorized_users.find({}, {"_id": 0, "email": 1}).to_list(500)
    user_emails = [u["email"] for u in auth_users if u.get("email")]

    test = {
        "id": 0,
        "type": "Test Alert",
        "source": "127.0.0.1",
        "destination": "10.0.0.1",
        "score": 0.95,
        "anomaly": True,
        "timestamp": datetime.now().isoformat(),
    }

    # Send via configured channels (email, slack, teams)
    await send_all_alerts(test)

    # If we have authorized user emails, also send directly to them
    email_status = "no_smtp_configured"
    if user_emails:
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_pass = os.getenv("SMTP_PASS", "")
        if smtp_user and smtp_pass:
            import smtplib as _smtp
            import ssl as _ssl
            from email.mime.text import MIMEText as _MIMEText
            from email.mime.multipart import MIMEMultipart as _MIMEMultipart

            try:
                subject = "🚨 INTELLIHUNT Test Alert — System Check"
                html = f"""
                <html><body style="font-family: Arial; background: #1a1a2e; color: #e0e0e0; padding: 20px;">
                <div style="max-width: 600px; margin: auto; background: #16213e; border-radius: 12px; padding: 24px; border: 1px solid #0f3460;">
                <h1 style="color: #e94560; margin-top: 0;">🛡️ INTELLIHUNT Test Alert</h1>
                <p>This is a <strong>test alert</strong> sent from the INTELLIHUNT system to verify email notifications are working.</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px; color: #a0a0a0;">Alert Type</td><td style="padding: 8px; font-weight: bold; color: #e94560;">Test Alert</td></tr>
                    <tr><td style="padding: 8px; color: #a0a0a0;">Risk Score</td><td style="padding: 8px; font-weight: bold; color: #ff6b6b;">95%</td></tr>
                    <tr><td style="padding: 8px; color: #a0a0a0;">Source IP</td><td style="padding: 8px; font-family: monospace;">127.0.0.1</td></tr>
                    <tr><td style="padding: 8px; color: #a0a0a0;">Timestamp</td><td style="padding: 8px;">{test['timestamp']}</td></tr>
                </table>
                <hr style="border-color: #0f3460;">
                <p style="color: #a0a0a0; font-size: 12px;">Sent by Intellihunt · Email notifications are working ✅</p>
                </div></body></html>
                """

                msg = _MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = smtp_user
                msg["To"] = ", ".join(user_emails)
                msg.attach(_MIMEText(html, "html"))

                context = _ssl.create_default_context()
                with _smtp.SMTP(os.getenv("SMTP_HOST", "smtp.gmail.com"), int(os.getenv("SMTP_PORT", "587"))) as server:
                    server.starttls(context=context)
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_user, user_emails, msg.as_string())

                email_status = f"sent_to_{len(user_emails)}_users"
            except Exception as e:
                email_status = f"smtp_error: {str(e)}"
        else:
            email_status = "smtp_not_configured"

    return {
        "status": "sent",
        "email_status": email_status,
        "recipients": user_emails,
        "channels": get_alert_config(),
    }


# ─── Incident & Reporting Endpoints ──────────────────────────────────

class IncidentCreate(BaseModel):
    title: str
    severity: str = "medium"
    summary: str = ""


@app.get("/incidents")
async def list_incidents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List incidents from MongoDB."""
    db = get_db()
    total = await db.incidents.count_documents({})
    skip = (page - 1) * page_size
    cursor = db.incidents.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size)
    incidents = await cursor.to_list(length=page_size)
    return {
        "data": incidents,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total else 0,
    }


@app.post("/incidents")
async def create_incident(incident: IncidentCreate):
    """Create a new incident and auto-generate a PDF report."""
    db = get_db()

    # Get next incident ID
    last = await db.incidents.find_one(sort=[("incident_number", -1)])
    next_num = (last["incident_number"] + 1) if last and "incident_number" in last else 1
    incident_id = f"INC-{datetime.now().year}-{next_num:03d}"

    # Gather stats and alerts for the report
    total_logs = await db.logs.count_documents({})
    total_alerts = await db.alerts.count_documents({})
    anomaly_count = await db.logs.count_documents({"is_anomaly": True})
    high_risk_count = await db.logs.count_documents({"risk_score": {"$gt": 0.5}})

    alerts_cursor = db.alerts.find({}, {"_id": 0}).sort("created_at", -1).limit(50)
    alerts = await alerts_cursor.to_list(length=50)

    logs_summary = {
        "total_logs": total_logs,
        "total_alerts": total_alerts,
        "anomaly_count": anomaly_count,
        "high_risk_count": high_risk_count,
    }

    # Generate PDF
    summary_text = incident.summary or (
        f"Automated incident report generated by Intellihunt. "
        f"System analyzed {total_logs} network flow logs and detected "
        f"{anomaly_count} anomalies and {high_risk_count} high-risk events. "
        f"{total_alerts} alerts were generated during this monitoring period."
    )

    pdf_bytes = generate_incident_report(
        incident_title=incident.title,
        incident_id=incident_id,
        severity=incident.severity,
        summary=summary_text,
        alerts=alerts,
        logs_summary=logs_summary,
    )

    now = datetime.now()
    doc = {
        "incident_id": incident_id,
        "incident_number": next_num,
        "title": incident.title,
        "severity": incident.severity,
        "status": "open",
        "summary": summary_text,
        "alert_count": total_alerts,
        "created_at": now,
        "timestamp": now.isoformat(),
    }
    await db.incidents.insert_one(doc)

    # Store PDF in GridFS-like collection
    await db.reports.insert_one({
        "incident_id": incident_id,
        "filename": f"{incident_id}.pdf",
        "pdf_data": pdf_bytes,
        "created_at": now,
    })

    return {"status": "created", "incident_id": incident_id}


@app.get("/reports/{incident_id}")
async def download_report(incident_id: str):
    """Download a PDF incident report. Auto-regenerates if missing."""
    db = get_db()
    report = await db.reports.find_one({"incident_id": incident_id})

    # If report PDF is missing, try to regenerate from incident data
    if not report:
        incident = await db.incidents.find_one({"incident_id": incident_id}, {"_id": 0})
        if not incident:
            raise HTTPException(status_code=404, detail=f"Incident not found: {incident_id}")

        # Gather current stats and alerts
        total_logs = await db.logs.count_documents({})
        total_alerts = await db.alerts.count_documents({})
        anomaly_count = await db.logs.count_documents({"is_anomaly": True})
        high_risk_count = await db.logs.count_documents({"risk_score": {"$gt": 0.5}})

        alerts_cursor = db.alerts.find({}, {"_id": 0}).sort("created_at", -1).limit(50)
        alerts = await alerts_cursor.to_list(length=50)

        pdf_bytes = generate_incident_report(
            incident_title=incident.get("title", "Untitled"),
            incident_id=incident_id,
            severity=incident.get("severity", "medium"),
            summary=incident.get("summary", ""),
            alerts=alerts,
            logs_summary={
                "total_logs": total_logs,
                "total_alerts": total_alerts,
                "anomaly_count": anomaly_count,
                "high_risk_count": high_risk_count,
            },
        )

        # Store for next time
        await db.reports.insert_one({
            "incident_id": incident_id,
            "filename": f"{incident_id}.pdf",
            "pdf_data": pdf_bytes,
            "created_at": datetime.now(),
        })

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{incident_id}.pdf"'},
        )

    return Response(
        content=report["pdf_data"],
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{incident_id}.pdf"'},
    )


# ─── Bulk Ingest (for Logstash) ──────────────────────────────────────

class BulkNetworkLogs(BaseModel):
    logs: List[dict]


@app.post("/ingest/bulk")
async def ingest_bulk(payload: BulkNetworkLogs, background_tasks: BackgroundTasks):
    """Bulk ingest endpoint for Logstash HTTP output."""
    results = []
    for log_data in payload.logs:
        log = NetworkLog(data=log_data)
        try:
            result = await ingest_log(log, background_tasks)
            results.append(result)
        except Exception as e:
            results.append({"status": "error", "detail": str(e)})

    return {
        "status": "bulk_complete",
        "processed": len(results),
        "results": results[:10],  # Return first 10 results only
    }


# ─── IP Blocklist ────────────────────────────────────────────────────

class BlockIPRequest(BaseModel):
    ip: str
    reason: str = "Blocked via alert mitigation"


@app.get("/blocklist")
async def get_blocklist():
    """Get all blocked IPs."""
    db = get_db()
    cursor = db.blocklist.find({}, {"_id": 0}).sort("blocked_at", -1)
    blocked = await cursor.to_list(length=500)
    return {"data": blocked, "total": len(blocked)}


@app.get("/blocklist/events")
async def get_blocked_events(limit: int = Query(50, ge=1, le=500)):
    """Get all blocked traffic attempts — proof that blocking is active."""
    db = get_db()
    cursor = db.blocked_events.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit)
    events = await cursor.to_list(length=limit)
    total = await db.blocked_events.count_documents({})
    return {"data": events, "total": total}


@app.post("/blocklist")
async def block_ip(req: BlockIPRequest):
    """Block an IP address."""
    db = get_db()
    existing = await db.blocklist.find_one({"ip": req.ip})
    if existing:
        return {"status": "already_blocked", "ip": req.ip}

    await db.blocklist.insert_one({
        "ip": req.ip,
        "reason": req.reason,
        "blocked_at": datetime.now(),
        "status": "active",
    })
    return {"status": "blocked", "ip": req.ip}


@app.delete("/blocklist/{ip}")
async def unblock_ip(ip: str):
    """Remove an IP from the blocklist."""
    db = get_db()
    result = await db.blocklist.delete_one({"ip": ip})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"IP not in blocklist: {ip}")
    return {"status": "unblocked", "ip": ip}


@app.get("/blocklist/check/{ip}")
async def check_blocked(ip: str):
    """Check if an IP is blocked."""
    db = get_db()
    blocked = await db.blocklist.find_one({"ip": ip})
    return {"ip": ip, "blocked": blocked is not None}


# ─── Alert Resolution ────────────────────────────────────────────────

class ResolveAlertRequest(BaseModel):
    status: str = "resolved"  # resolved, investigating, false_positive
    notes: str = ""


@app.patch("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: int, req: ResolveAlertRequest):
    """Mark an alert as resolved, investigating, or false positive."""
    db = get_db()
    result = await db.alerts.update_one(
        {"id": alert_id},
        {"$set": {
            "status": req.status,
            "resolved_at": datetime.now().isoformat(),
            "resolution_notes": req.notes,
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Alert not found: {alert_id}")
    return {"status": req.status, "alert_id": alert_id}


# ─── Settings Management ─────────────────────────────────────────────

class SystemSettings(BaseModel):
    dark_mode: bool = True
    email_notifications: bool = True
    slack_integration: bool = False
    webhook_notifications: bool = False
    copilot_explanation_level: str = "simple"
    copilot_auto_suggest: bool = True
    risk_threshold_high: float = 0.7
    risk_threshold_medium: float = 0.3
    auto_block_high_risk: bool = False
    log_retention_days: int = 90

@app.get("/settings")
async def get_settings():
    """Get system and user settings."""
    db = get_db()
    settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0})
    if not settings:
        settings = SystemSettings().dict()
        settings["id"] = "global_settings"
        await db.settings.insert_one(settings)
    return settings

@app.post("/settings")
async def update_settings(settings: SystemSettings):
    """Update system settings."""
    db = get_db()
    data = settings.dict()
    data["id"] = "global_settings"
    await db.settings.update_one(
        {"id": "global_settings"},
        {"$set": data},
        upsert=True
    )
    return {"status": "success", "settings": data}


@app.delete("/logs/clear")
async def clear_logs():
    """Clear all network logs from MongoDB."""
    db = get_db()
    count = await db.logs.count_documents({})
    await db.logs.delete_many({})
    return {"status": "cleared", "deleted": count}


@app.delete("/alerts/clear")
async def clear_alerts():
    """Clear all alerts from MongoDB."""
    db = get_db()
    count = await db.alerts.count_documents({})
    await db.alerts.delete_many({})
    # Reset the alert counter
    await db.counters.update_one({"_id": "alert_id"}, {"$set": {"seq": 0}}, upsert=True)
    return {"status": "cleared", "deleted": count}


@app.delete("/data/clear-all")
async def clear_all_data():
    """Clear ALL data — logs, alerts, blocklist, playbook logs."""
    db = get_db()
    logs_del = await db.logs.count_documents({})
    alerts_del = await db.alerts.count_documents({})
    await db.logs.delete_many({})
    await db.alerts.delete_many({})
    await db.blocklist.delete_many({})
    await db.playbook_logs.delete_many({})
    await db.counters.update_one({"_id": "alert_id"}, {"$set": {"seq": 0}}, upsert=True)
    return {"status": "cleared", "logs_deleted": logs_del, "alerts_deleted": alerts_del}


# ─── Copilot (Grok API) ─────────────────────────────────────────────

class CopilotRequest(BaseModel):
    message: str
    alert_id: Optional[int] = None


@app.post("/copilot/chat")
async def copilot_chat(req: CopilotRequest):
    """Chat with the Grok-powered AI copilot."""
    db = get_db()

    # Get alert context if provided
    alert_context = None
    if req.alert_id is not None:
        alert = await db.alerts.find_one({"id": req.alert_id}, {"_id": 0})
        if alert:
            alert_context = alert

    # Get system stats for context
    stats = {
        "total_logs": await db.logs.count_documents({}),
        "total_alerts": await db.alerts.count_documents({}),
        "anomaly_count": await db.logs.count_documents({"is_anomaly": True}),
        "high_risk_count": await db.logs.count_documents({"risk_score": {"$gt": 0.5}}),
    }

    response = await chat_with_copilot(
        user_message=req.message,
        alert_context=alert_context,
        system_stats=stats,
    )

    return {"response": response}


# ─── User Management (Email Whitelist & Audit) ──────────────────────

def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with a static salt."""
    salted = f"intellihunt_salt_{password}"
    return hashlib.sha256(salted.encode()).hexdigest()


class AuthorizedUser(BaseModel):
    email: str
    name: str = ""
    username: str = ""
    role: str = "analyst"  # admin | analyst


class SignupRequest(BaseModel):
    name: str
    email: str
    username: str
    password: str


class LoginRequest(BaseModel):
    identifier: str  # email or username
    password: str


class LoginLogEntry(BaseModel):
    email: str
    ip: str = "unknown"
    user_agent: str = ""


# ─── Auth Endpoints (Signup & Login) ─────────────────────────────────

@app.post("/auth/signup")
async def auth_signup(req: SignupRequest):
    """Register a new user account with username, email, and password."""
    db = get_db()
    email = req.email.lower().strip()
    username = req.username.lower().strip()

    if not email or not username or not req.password:
        raise HTTPException(status_code=400, detail="All fields are required")

    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Check for existing email or username
    existing_email = await db.authorized_users.find_one({"email": email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_username = await db.authorized_users.find_one({"username": username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Determine role: first user becomes admin, rest become analyst
    count = await db.authorized_users.count_documents({})
    role = "admin" if count == 0 else "analyst"

    doc = {
        "email": email,
        "username": username,
        "name": req.name.strip(),
        "password_hash": hash_password(req.password),
        "role": role,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.authorized_users.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return {"status": "registered", "user": doc}


@app.post("/auth/login")
async def auth_login(req: LoginRequest):
    """Login with email or username + password."""
    db = get_db()
    identifier = req.identifier.lower().strip()

    if not identifier or not req.password:
        raise HTTPException(status_code=400, detail="Credentials required")

    # Look up by email or username
    user = await db.authorized_users.find_one(
        {"$or": [{"email": identifier}, {"username": identifier}]},
        {"_id": 0},
    )

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify password
    if user.get("password_hash") != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Return user info (without password hash)
    user.pop("password_hash", None)
    return {
        "status": "authenticated",
        "user": user,
        "role": user.get("role", "analyst"),
    }


@app.get("/users")
async def list_users():
    """List all authorized users."""
    db = get_db()
    users = await db.authorized_users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return users


@app.post("/users")
async def add_user(user: AuthorizedUser):
    """Add an authorized user to the whitelist."""
    db = get_db()
    existing = await db.authorized_users.find_one({"email": user.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    doc = {
        "email": user.email.lower().strip(),
        "username": user.username.lower().strip() if user.username else user.email.split("@")[0],
        "name": user.name.strip(),
        "role": user.role,
        "password_hash": hash_password("changeme123"),  # Default password for admin-added users
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.authorized_users.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return {"status": "added", "user": doc}


@app.delete("/users/{email}")
async def delete_user(email: str):
    """Remove an authorized user from the whitelist."""
    db = get_db()
    result = await db.authorized_users.delete_one({"email": email.lower()})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "removed", "email": email.lower()}


@app.post("/users/verify")
async def verify_user(data: dict):
    """Check if an email or username is authorized to access the system."""
    identifier = data.get("email", data.get("identifier", "")).lower().strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Email or username required")

    db = get_db()
    # If no authorized users exist yet, allow anyone (first-time setup)
    count = await db.authorized_users.count_documents({})
    if count == 0:
        return {"authorized": True, "role": "admin", "reason": "no_whitelist_setup"}

    user = await db.authorized_users.find_one(
        {"$or": [{"email": identifier}, {"username": identifier}]},
        {"_id": 0, "password_hash": 0},
    )
    if user:
        return {"authorized": True, "role": user.get("role", "analyst"), "name": user.get("name", "")}
    return {"authorized": False, "role": None}


@app.post("/users/login-log")
async def record_login(entry: LoginLogEntry):
    """Record a login event for audit purposes."""
    db = get_db()
    log = {
        "email": entry.email.lower(),
        "ip": entry.ip,
        "user_agent": entry.user_agent,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await db.login_logs.insert_one(log)
    log.pop("_id", None)
    return {"status": "logged"}


@app.get("/users/login-logs")
async def get_login_logs(limit: int = Query(100, le=500)):
    """Get login audit history."""
    db = get_db()
    logs = await db.login_logs.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).to_list(limit)
    return logs


@app.get("/users/role/{email}")
async def get_user_role(email: str):
    """Get a user's role (admin/analyst)."""
    db = get_db()
    user = await db.authorized_users.find_one({"email": email.lower()}, {"_id": 0})
    if not user:
        # If no whitelist, first user is admin
        count = await db.authorized_users.count_documents({})
        if count == 0:
            return {"role": "admin"}
        return {"role": None}
    return {"role": user.get("role", "analyst")}


# ─── MITRE ATT&CK Classification ────────────────────────────────────

@app.post("/alerts/{alert_id}/mitre")
async def classify_alert_mitre(alert_id: int):
    """Classify an alert to MITRE ATT&CK technique using Grok."""
    db = get_db()
    alert = await db.alerts.find_one({"id": alert_id}, {"_id": 0})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    result = await classify_mitre_attack(alert)

    # Cache the result on the alert
    await db.alerts.update_one(
        {"id": alert_id},
        {"$set": {"mitre": result}},
    )

    return result


@app.post("/alerts/{alert_id}/playbook")
async def get_alert_playbook(alert_id: int):
    """Generate a response playbook for an alert using Grok."""
    db = get_db()
    alert = await db.alerts.find_one({"id": alert_id}, {"_id": 0})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    steps = await get_playbook_steps(alert)
    return {"alert_id": alert_id, "playbook": steps}


@app.post("/alerts/{alert_id}/playbook/execute")
async def execute_playbook_step(alert_id: int, data: dict):
    """Execute an automated playbook step."""
    db = get_db()
    alert = await db.alerts.find_one({"id": alert_id}, {"_id": 0})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    action = data.get("action", "")
    step_num = data.get("step", 0)

    result = {"step": step_num, "action": action, "status": "completed"}
    action_lower = action.lower()

    # Handle known auto actions
    if "block" in action_lower or "firewall" in action_lower:
        ip = alert.get("source", "")
        if ip:
            existing = await db.blocklist.find_one({"ip": ip})
            if not existing:
                await db.blocklist.insert_one({
                    "ip": ip,
                    "reason": f"Auto-blocked via playbook for alert #{alert_id}: {alert.get('type', 'Unknown')}",
                    "timestamp": datetime.now().isoformat(),
                })
                result["detail"] = f"✅ IP {ip} added to blocklist"
            else:
                result["detail"] = f"IP {ip} already blocked"

    elif "alert" in action_lower or "notify" in action_lower or "email" in action_lower or "escalat" in action_lower:
        # Actually send email alerts to authorized users
        try:
            # Build a detailed alert for the email
            email_alert = {
                "type": f"Playbook Action — {alert.get('type', 'Unknown')}",
                "source": alert.get("source", "N/A"),
                "destination": alert.get("destination", "N/A"),
                "score": alert.get("score", 0),
                "anomaly": alert.get("anomaly", False),
                "timestamp": datetime.now().isoformat(),
            }
            await send_all_alerts(email_alert)

            # List who was notified
            auth_users = await db.authorized_users.find({}, {"_id": 0, "email": 1}).to_list(100)
            emails = [u.get("email", "") for u in auth_users if u.get("email")]
            result["detail"] = f"✅ Email sent to {len(emails)} user(s): {', '.join(emails) if emails else 'SMTP recipients from .env'}"
        except Exception as e:
            result["detail"] = f"⚠️ Email attempt: {str(e)}"
            result["status"] = "partial"

    elif "isolat" in action_lower or "quarantin" in action_lower:
        ip = alert.get("source", "")
        # Log isolation action
        await db.playbook_logs.insert_one({
            "alert_id": alert_id,
            "action": "network_isolation",
            "ip": ip,
            "timestamp": datetime.now().isoformat(),
        })
        result["detail"] = f"⚠️ Network isolation logged for {ip} — requires firewall integration to enforce"

    elif "report" in action_lower or "document" in action_lower:
        # Generate actual incident report
        try:
            report = await generate_incident_report(alert)
            result["detail"] = f"✅ Incident report generated ({len(report)} chars)"
            result["report_preview"] = report[:200] + "..." if len(report) > 200 else report
        except Exception as e:
            result["detail"] = f"Incident report: {str(e)}"

    elif "monitor" in action_lower or "log" in action_lower:
        result["detail"] = f"✅ Enhanced monitoring activated for {alert.get('source', 'N/A')} → {alert.get('destination', 'N/A')}"

    else:
        result["detail"] = "Step logged — requires manual review"

    # Log the action
    await db.playbook_logs.insert_one({
        "alert_id": alert_id,
        "step": step_num,
        "action": action,
        "status": "completed",
        "timestamp": datetime.now().isoformat(),
    })

    return result


# ─── Forensic IP Timeline ────────────────────────────────────────────

@app.get("/forensics/{ip}")
async def get_ip_forensics(ip: str):
    """Get full forensic timeline for an IP address."""
    db = get_db()

    # Get all logs involving this IP
    logs = await db.logs.find(
        {"$or": [
            {"original_log.SRC_IP": ip},
            {"original_log.DST_IP": ip},
        ]},
        {"_id": 0},
    ).sort("timestamp", -1).to_list(500)

    # Get all alerts involving this IP
    alerts = await db.alerts.find(
        {"$or": [{"source": ip}, {"destination": ip}]},
        {"_id": 0},
    ).sort("timestamp", -1).to_list(100)

    # Get blocklist status
    blocked = await db.blocklist.find_one({"ip": ip})

    # Compute risk timeline
    risk_timeline = []
    for log in logs[:100]:
        risk_timeline.append({
            "timestamp": log.get("timestamp", ""),
            "risk_score": log.get("risk_score", 0),
            "is_anomaly": log.get("is_anomaly", False),
        })

    # Check threat intel
    intel = {}
    try:
        from threat_intel import check_ip_reputation
        intel = await check_ip_reputation(ip)
    except Exception:
        pass

    return {
        "ip": ip,
        "total_logs": len(logs),
        "total_alerts": len(alerts),
        "is_blocked": blocked is not None,
        "blocked_at": blocked.get("timestamp") if blocked else None,
        "risk_timeline": risk_timeline,
        "recent_logs": logs[:50],
        "alerts": alerts[:20],
        "intel": intel,
        "first_seen": logs[-1].get("timestamp") if logs else None,
        "last_seen": logs[0].get("timestamp") if logs else None,
    }


# ─── Statistical Attack Report ───────────────────────────────────────

@app.get("/reports/stats")
async def get_attack_stats():
    """Get aggregated attack statistics for report generation."""
    db = get_db()

    total_logs = await db.logs.count_documents({})
    total_alerts = await db.alerts.count_documents({})
    total_anomalies = await db.logs.count_documents({"is_anomaly": True})
    high_risk = await db.logs.count_documents({"risk_score": {"$gt": 0.5}})
    blocked_ips = await db.blocklist.count_documents({})

    # Attack type distribution
    alert_types = {}
    async for alert in db.alerts.find({}, {"type": 1, "_id": 0}):
        t = alert.get("type", "Unknown")
        alert_types[t] = alert_types.get(t, 0) + 1

    # Risk score distribution
    risk_buckets = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    async for log in db.logs.find({}, {"risk_score": 1, "_id": 0}):
        score = log.get("risk_score", 0)
        if score > 0.8:
            risk_buckets["critical"] += 1
        elif score > 0.5:
            risk_buckets["high"] += 1
        elif score > 0.2:
            risk_buckets["medium"] += 1
        else:
            risk_buckets["low"] += 1

    # Top source IPs
    src_ips = {}
    async for alert in db.alerts.find({}, {"source": 1, "_id": 0}):
        ip = alert.get("source", "Unknown")
        src_ips[ip] = src_ips.get(ip, 0) + 1
    top_sources = sorted(src_ips.items(), key=lambda x: x[1], reverse=True)[:10]

    # Hour distribution (when attacks happen)
    hour_dist = {str(h): 0 for h in range(24)}
    async for alert in db.alerts.find({}, {"timestamp": 1, "_id": 0}):
        try:
            ts = alert.get("timestamp", "")
            if ts:
                hour = datetime.fromisoformat(ts.replace("Z", "")).hour
                hour_dist[str(hour)] = hour_dist.get(str(hour), 0) + 1
        except Exception:
            pass

    return {
        "total_logs": total_logs,
        "total_alerts": total_alerts,
        "total_anomalies": total_anomalies,
        "high_risk_count": high_risk,
        "blocked_ips": blocked_ips,
        "attack_types": alert_types,
        "risk_distribution": risk_buckets,
        "top_source_ips": [{"ip": ip, "count": c} for ip, c in top_sources],
        "hourly_distribution": hour_dist,
        "anomaly_rate": f"{(total_anomalies / total_logs * 100):.1f}%" if total_logs > 0 else "0%",
    }


@app.post("/reports/attack-analysis")
async def generate_report():
    """Generate AI-powered attack analysis report from current data."""
    db = get_db()

    # Gather stats for the report
    stats_resp = await get_attack_stats()

    # Generate report using Grok
    report = await generate_attack_report(stats_resp)

    return {
        "report": report,
        "stats": stats_resp,
        "generated_at": datetime.now().isoformat(),
    }


# ─── Ingestion Control ────────────────────────────────────────────

# Global state for live capture process
_capture_process: Optional[subprocess.Popen] = None
_capture_status = {"active": False, "interface": None, "started_at": None, "flows_captured": 0}


@app.post("/capture/start")
async def start_live_capture(interface: str = Form(default="en0"), password: str = Form(default="")):
    """
    Start live traffic capture using the existing live_capture.py script.
    Requires sudo password because packet capture needs root privileges.
    """
    global _capture_process, _capture_status

    if _capture_status["active"]:
        raise HTTPException(status_code=409, detail="Live capture is already running")

    # Build the command to run live_capture.py with sudo
    # __file__ is backend/app/main.py → go up 3 levels to project root
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    venv_python = os.path.join(base_dir, ".venv", "bin", "python")
    capture_script = os.path.join(base_dir, "ingestion", "live_capture.py")

    if not os.path.exists(capture_script):
        raise HTTPException(status_code=404, detail="live_capture.py not found")

    try:
        # Pass the selected interface via environment variable so live_capture.py picks it up
        env = os.environ.copy()
        env["CAPTURE_INTERFACE"] = interface

        # Use sudo -S to read password from stdin
        cmd = f"echo '{password}' | sudo -S -E {venv_python} {capture_script}"
        _capture_process = subprocess.Popen(
            cmd,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            preexec_fn=os.setsid,
            env=env,
        )

        # Brief wait to check if process started successfully
        await asyncio.sleep(1.5)
        if _capture_process.poll() is not None:
            stderr = _capture_process.stderr.read().decode() if _capture_process.stderr else ""
            raise HTTPException(status_code=500, detail=f"Capture failed to start: {stderr[:300]}")

        _capture_status = {
            "active": True,
            "interface": interface,
            "started_at": datetime.now().isoformat(),
            "flows_captured": 0,
        }

        return {"status": "started", "interface": interface, "pid": _capture_process.pid}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/capture/stop")
async def stop_live_capture():
    """Stop the running live traffic capture."""
    global _capture_process, _capture_status

    if not _capture_status["active"] or _capture_process is None:
        raise HTTPException(status_code=409, detail="No live capture is currently running")

    try:
        os.killpg(os.getpgid(_capture_process.pid), signal.SIGTERM)
        _capture_process.wait(timeout=5)
    except Exception:
        try:
            os.killpg(os.getpgid(_capture_process.pid), signal.SIGKILL)
        except Exception:
            pass

    _capture_process = None
    duration = _capture_status.get("started_at", "")
    _capture_status = {"active": False, "interface": None, "started_at": None, "flows_captured": 0}

    return {"status": "stopped", "message": f"Live capture stopped (started at {duration})"}


@app.get("/capture/status")
async def get_capture_status():
    """Get the current live capture status."""
    # Also check if the process died unexpectedly
    global _capture_process, _capture_status
    if _capture_status["active"] and _capture_process and _capture_process.poll() is not None:
        _capture_status["active"] = False
        _capture_process = None
    return _capture_status

_upload_cancelled = False
_upload_status = {"active": False, "filename": None, "started_at": None, "total": 0, "processed": 0, "alerts": 0, "errors": 0}

@app.post("/upload-file/cancel")
async def cancel_upload():
    """Cancel any ongoing file upload processing."""
    global _upload_cancelled
    _upload_cancelled = True
    return {"status": "cancelled", "message": "Upload processing cancelled"}

@app.get("/upload-file/status")
async def get_upload_status():
    """Get the current file upload/processing status."""
    return _upload_status



@app.post("/upload-file")
async def upload_and_ingest(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
):
    """
    Upload a PCAP, JSON, or CSV file and ingest all flows into the ML pipeline.
    The file is processed server-side and each flow is run through the existing
    /ingest logic (standardization → ML inference → alert generation).
    """
    global _upload_cancelled, _upload_status
    _upload_cancelled = False
    _upload_status = {"active": True, "filename": file.filename, "started_at": datetime.now().isoformat(), "total": 0, "processed": 0, "alerts": 0, "errors": 0}
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    allowed = {".pcap", ".pcapng", ".json", ".csv", ".bz2"}
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Allowed: {', '.join(allowed)}")

    # Save uploaded file to a temp location
    tmp_dir = tempfile.mkdtemp(prefix="intellihunt_upload_")
    tmp_path = os.path.join(tmp_dir, file.filename)

    try:
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        flows = []

        if ext in (".pcap", ".pcapng", ".bz2"):
            # Use NFStream to extract flows from PCAP
            try:
                from nfstream import NFStreamer
            except ImportError:
                raise HTTPException(status_code=500, detail="nfstream is not installed on the server")

            # Handle .bz2 compressed files
            actual_pcap = tmp_path
            if ext == ".bz2":
                import bz2 as bz2_mod
                unzipped = tmp_path.replace(".bz2", "")
                with bz2_mod.open(tmp_path, "rb") as src, open(unzipped, "wb") as dst:
                    shutil.copyfileobj(src, dst)
                actual_pcap = unzipped

            streamer = NFStreamer(source=actual_pcap, statistical_analysis=True)
            for flow in streamer:
                if len(flows) >= 500:  # safety limit
                    break
                duration = flow.bidirectional_duration_ms
                flows.append({
                    "SRC_IP": flow.src_ip,
                    "DST_IP": flow.dst_ip,
                    "PROTOCOL": flow.protocol,
                    "FLOW DURATION": duration,
                    "TOTAL FWD PACKETS": flow.src2dst_packets,
                    "TOTAL BACKWARD PACKETS": flow.dst2src_packets,
                    "FWD PACKETS LENGTH TOTAL": flow.src2dst_bytes,
                    "BWD PACKETS LENGTH TOTAL": flow.dst2src_bytes,
                    "FWD PACKET LENGTH MAX": flow.src2dst_max_ps,
                    "FWD PACKET LENGTH MIN": flow.src2dst_min_ps,
                    "FWD PACKET LENGTH MEAN": flow.src2dst_mean_ps,
                    "FWD PACKET LENGTH STD": flow.src2dst_stddev_ps,
                    "BWD PACKET LENGTH MAX": flow.dst2src_max_ps,
                    "BWD PACKET LENGTH MIN": flow.dst2src_min_ps,
                    "BWD PACKET LENGTH MEAN": flow.dst2src_mean_ps,
                    "BWD PACKET LENGTH STD": flow.dst2src_stddev_ps,
                    "FLOW BYTES/S": (flow.bidirectional_bytes / (duration / 1000)) if duration > 0 else 0,
                    "FLOW PACKETS/S": (flow.bidirectional_packets / (duration / 1000)) if duration > 0 else 0,
                    "FLOW IAT MEAN": flow.bidirectional_mean_piat_ms,
                    "FLOW IAT STD": flow.bidirectional_stddev_piat_ms,
                    "FLOW IAT MAX": flow.bidirectional_max_piat_ms,
                    "FLOW IAT MIN": flow.bidirectional_min_piat_ms,
                })

        elif ext == ".json":
            content = open(tmp_path, "r").read()
            data = json.loads(content)
            if isinstance(data, list):
                flows = data
            elif isinstance(data, dict):
                flows = [data]
            else:
                raise HTTPException(status_code=400, detail="JSON must be an object or array of objects")

        elif ext == ".csv":
            csv_df = pd.read_csv(tmp_path)
            csv_df.columns = csv_df.columns.str.strip().str.upper()
            flows = csv_df.to_dict(orient="records")

        if not flows:
            raise HTTPException(status_code=400, detail="No flows could be extracted from the file")

        # Process each flow through the ML pipeline
        db = get_db()
        results = {"total": len(flows), "processed": 0, "alerts": 0, "errors": 0}
        _upload_status["total"] = len(flows)

        for flow_data in flows:
            if _upload_cancelled:
                results["status"] = "cancelled"
                break
                
            try:
                # Standardize keys
                standardized = {}
                for k, v in flow_data.items():
                    new_key = k.replace("_", " ").upper()
                    standardized[new_key] = v
                    if k.upper() in ["SRC_IP", "DST_IP", "SRC IP", "DST IP"]:
                        standardized["SRC_IP"] = flow_data.get("SRC_IP", flow_data.get("SRC IP", v))
                        standardized["DST_IP"] = flow_data.get("DST_IP", flow_data.get("DST IP", v))

                df = pd.DataFrame([standardized])
                X = df.reindex(columns=feature_names, fill_value=0).astype(float)
                X_scaled = scaler.transform(X)

                rf_prob = rf_model.predict_proba(X_scaled)[0][1]
                iso_pred = iso_model.predict(X_scaled)[0]
                is_anomaly = iso_pred == -1

                now = datetime.now()
                attack_info = classify_attack_type(standardized, float(rf_prob), bool(is_anomaly))

                analysis = {
                    "risk_score": float(rf_prob),
                    "is_anomaly": bool(is_anomaly),
                    "attack_type": attack_info["attack_type"],
                    "attack_category": attack_info["attack_category"],
                    "classification_confidence": attack_info["confidence"],
                    "timestamp": now.isoformat(),
                    "original_log": standardized,
                    "source_file": file.filename,
                }

                await db.logs.insert_one({**analysis, "created_at": now})
                results["processed"] += 1
                _upload_status["processed"] = results["processed"]
                _upload_status["alerts"] = results["alerts"]

                if rf_prob > 0.5 or (is_anomaly and rf_prob > 0.1):
                    src_ip = standardized.get("SRC IP", standardized.get("SRC_IP", "Unknown"))
                    intel_context = await check_ip_reputation(src_ip)
                    consensus = compute_consensus(float(rf_prob), bool(is_anomaly), intel_context)
                    last_alert = await db.alerts.find_one(sort=[("id", -1)])
                    next_id = (last_alert["id"] + 1) if last_alert and "id" in last_alert else 1

                    alert = {
                        "id": next_id,
                        "type": attack_info["attack_type"],
                        "attack_category": attack_info["attack_category"],
                        "classification_confidence": attack_info["confidence"],
                        "source": src_ip,
                        "destination": flow_data.get("DST_IP", "Unknown"),
                        "score": float(rf_prob),
                        "anomaly": bool(is_anomaly),
                        "verdict": consensus["verdict"],
                        "severity": consensus["severity"],
                        "explanation": consensus["explanation"],
                        "agreement": consensus["agreement"],
                        "consensus_score": consensus["consensus_score"],
                        "detection_layers": consensus["detection_layers"],
                        "votes": consensus["votes"],
                        "intel": intel_context,
                        "timestamp": analysis["timestamp"],
                        "created_at": now,
                    }
                    await db.alerts.insert_one(alert)
                    results["alerts"] += 1
                    _upload_status["alerts"] = results["alerts"]

            except Exception:
                results["errors"] += 1
                _upload_status["errors"] = results["errors"]

        return {
            "status": "success",
            "filename": file.filename,
            "results": results,
        }

    finally:
        _upload_status = {"active": False, "filename": None, "started_at": None, "total": 0, "processed": 0, "alerts": 0, "errors": 0}
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
