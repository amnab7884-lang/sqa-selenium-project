import joblib
import pandas as pd
import numpy as np
import os

# Paths to artifacts
MODEL_DIR = "backend/ml"
RF_MODEL = os.path.join(MODEL_DIR, "rf_model.pkl")
ISO_MODEL = os.path.join(MODEL_DIR, "iso_model.pkl")
SCALER = os.path.join(MODEL_DIR, "scaler.pkl")
FEATURES = os.path.join(MODEL_DIR, "feature_names.pkl")

def explain_risk(log_data):
    """
    Takes a raw log dictionary, passes it through the trained ML models
    (Random Forest + Isolation Forest), and explains the verdict.
    
    No weights are assigned — the raw model outputs drive the decision:
      - Random Forest: predict_proba > 0.5 → "ATTACK"
      - Isolation Forest: predict == -1 → "ANOMALY"
    """
    # 1. Load Models
    rf = joblib.load(RF_MODEL)
    iso = joblib.load(ISO_MODEL)
    scaler = joblib.load(SCALER)
    feature_names = joblib.load(FEATURES)
    
    # 2. Standardize Input
    standardized = {k.replace("_", " ").upper(): v for k, v in log_data.items()}
    df = pd.DataFrame([standardized])
    X = df.reindex(columns=feature_names, fill_value=0).astype(float)
    
    # 3. Pass through models (no weight manipulation)
    X_scaled = scaler.transform(X)
    
    # Random Forest: direct probability from model
    rf_prob = rf.predict_proba(X_scaled)[0][1]
    rf_verdict = "ATTACK" if rf_prob > 0.5 else "BENIGN"
    
    # Isolation Forest: direct prediction from model
    iso_pred = iso.predict(X_scaled)[0]
    iso_verdict = "ANOMALY" if iso_pred == -1 else "NORMAL"
    
    print(f"\n{'='*55}")
    print(f"  INTELLIHUNT — Risk Audit Report (No Weights)")
    print(f"{'='*55}")
    print(f"  Target Flow: {log_data.get('SRC_IP', 'Unknown')} → {log_data.get('DST_IP', 'Unknown')}")
    
    print(f"\n  ┌─ Random Forest Model ─────────────────────────┐")
    print(f"  │  Probability: {rf_prob:.4f}                        │")
    print(f"  │  Verdict:     {rf_verdict:<30s}    │")
    print(f"  │  Method:      model.predict_proba()            │")
    print(f"  └────────────────────────────────────────────────┘")
    
    print(f"\n  ┌─ Isolation Forest Model ──────────────────────┐")
    print(f"  │  Raw Output:  {iso_pred:>3d} (-1=anomaly, 1=normal)    │")
    print(f"  │  Verdict:     {iso_verdict:<30s}    │")
    print(f"  │  Method:      model.predict()                  │")
    print(f"  └────────────────────────────────────────────────┘")
    
    # 4. Vote-based consensus (no weights)
    votes = sum([rf_prob > 0.5, iso_pred == -1])
    
    print(f"\n  ┌─ Consensus (Vote-Based, No Weights) ─────────┐")
    print(f"  │  Votes: {votes}/2 layers flagged as threat         │")
    
    if votes == 2:
        print(f"  │  ✅ CONFIRMED THREAT — Both models agree      │")
    elif votes == 1:
        if rf_prob > 0.5:
            print(f"  │  ⚠️  LIKELY THREAT — RF detects attack        │")
        else:
            print(f"  │  ⚠️  SUSPICIOUS — Anomaly without signature   │")
    else:
        print(f"  │  🟢 BENIGN — Both models agree: normal traffic│")
    
    print(f"  └────────────────────────────────────────────────┘")
    
    # 5. Top features the model relied on (for interpretability)
    importances = rf.feature_importances_
    indices = np.argsort(importances)[::-1]
    
    print(f"\n  Top 5 Features the Model Relied On:")
    print(f"  {'─'*45}")
    for i in range(5):
        feat = feature_names[indices[i]]
        val = X[feat].values[0]
        imp = importances[indices[i]]
        print(f"  {i+1}. {feat:25} | Value: {val:<10.2f} | Importance: {imp:.4f}")
    print(f"  {'─'*45}")
    
    return {
        "rf_probability": float(rf_prob),
        "rf_verdict": rf_verdict,
        "iso_prediction": int(iso_pred),
        "iso_verdict": iso_verdict,
        "votes": f"{votes}/2",
        "consensus": "CONFIRMED THREAT" if votes == 2 else "LIKELY THREAT" if rf_prob > 0.5 else "SUSPICIOUS" if iso_pred == -1 else "BENIGN"
    }

if __name__ == "__main__":
    # Example: Audit a suspicious flow from your network_logs.json
    # You can paste any dictionary from your logs here to test it.
    sample_log = {
        "FLOW DURATION": 1,
        "TOTAL FWD PACKETS": 1,
        "TOTAL BACKWARD PACKETS": 0,
        "FLOW PACKETS/S": 10000.0, # High rate for 1ms
        "FWD PACKET LENGTH MEAN": 500.0,
        "SRC_IP": "116.168.1.2"
    }
    
    explain_risk(sample_log)
