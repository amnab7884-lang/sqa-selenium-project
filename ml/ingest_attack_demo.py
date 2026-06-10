#!/usr/bin/env python3
"""
Live Attack Demo — Ingests labeled CICIDS2017 attack data through the
running backend to demonstrate real-time detection on the dashboard.

Shows the dashboard lighting up with alerts as attack traffic is detected.

Usage:
  .venv/bin/python ml/ingest_attack_demo.py                  # Default: 100 samples
  .venv/bin/python ml/ingest_attack_demo.py -n 200            # 200 samples
  .venv/bin/python ml/ingest_attack_demo.py --attack-only      # Only attack traffic
  .venv/bin/python ml/ingest_attack_demo.py --dataset portscan # Use portscan data
"""

import os
import sys
import time
import random
import argparse
import numpy as np
import pandas as pd
import requests
import kagglehub

API_URL = "http://localhost:8000/ingest"

# CICIDS2017 known attacker/victim IPs (from the dataset documentation)
ATTACKER_IPS = ["205.174.165.73", "205.174.165.69", "205.174.165.70", "205.174.165.71"]
VICTIM_IPS = ["192.168.10.50", "192.168.10.51", "192.168.10.8", "192.168.10.25",
              "192.168.10.15", "192.168.10.9", "192.168.10.14", "192.168.10.5"]
BENIGN_SRC_IPS = ["192.168.10.3", "192.168.10.4", "192.168.10.12", "192.168.10.17"]
BENIGN_DST_IPS = ["172.217.14.100", "93.184.216.34", "104.18.32.7", "13.107.42.14"]

DATASET_MAP = {
    "ddos": "DDoS-Friday-no-metadata.parquet",
    "portscan": "Portscan-Friday-no-metadata.parquet",
}


def run_demo(num_samples=100, attack_only=False, dataset_key="ddos"):
    filename = DATASET_MAP.get(dataset_key, DATASET_MAP["ddos"])

    print("=" * 60)
    print("🛡️  INTELLIHUNT — Live Attack Demo")
    print("=" * 60)

    # Download dataset
    print(f"\n📦 Downloading CICIDS2017 ({dataset_key})...")
    data_path = kagglehub.dataset_download("dhoogla/cicids2017")
    filepath = os.path.join(data_path, filename)

    if not os.path.exists(filepath):
        print(f"❌ File not found: {filepath}")
        sys.exit(1)

    df = pd.read_parquet(filepath)
    df.columns = df.columns.str.upper()

    # Get attack and benign samples
    benign = df[df["LABEL"].str.upper() == "BENIGN"]
    attack = df[df["LABEL"].str.upper() != "BENIGN"]

    print(f"   Dataset: {len(df):,} total ({len(benign):,} benign, {len(attack):,} attack)")
    print(f"   Attack types: {attack['LABEL'].unique().tolist()}")

    # Build sample set
    if attack_only:
        samples = attack.sample(min(num_samples, len(attack)))
    else:
        n_attack = min(num_samples // 2, len(attack))
        n_benign = min(num_samples - n_attack, len(benign))
        samples = pd.concat([
            benign.sample(n_benign),
            attack.sample(n_attack),
        ]).sample(frac=1)  # Shuffle

    print(f"\n🚀 Ingesting {len(samples)} flows to {API_URL}")
    print(f"   Open http://localhost:8080 to watch the dashboard\n")

    success = 0
    alerts = 0
    anomalies = 0

    for idx, (_, row) in enumerate(samples.iterrows()):
        label = row.get("LABEL", "UNKNOWN")
        is_attack = label.upper() != "BENIGN"

        # Use realistic IPs from CICIDS2017 documentation
        if is_attack:
            src_ip = random.choice(ATTACKER_IPS)
            dst_ip = random.choice(VICTIM_IPS)
        else:
            src_ip = random.choice(BENIGN_SRC_IPS)
            dst_ip = random.choice(BENIGN_DST_IPS)

        flow_data = {
            "SRC_IP": src_ip,
            "DST_IP": dst_ip,
            "TIMESTAMP": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }

        # Add all numeric features
        for col in row.index:
            if col != "LABEL":
                try:
                    val = float(row[col])
                    if not np.isnan(val) and not np.isinf(val):
                        flow_data[col] = val
                except (ValueError, TypeError):
                    pass

        try:
            resp = requests.post(API_URL, json={"data": flow_data}, timeout=5)
            if resp.status_code == 200:
                result = resp.json().get("prediction", {})
                risk = result.get("risk_score", 0)
                is_anomaly = result.get("is_anomaly", False)

                if risk > 0.5:
                    alerts += 1
                if is_anomaly:
                    anomalies += 1

                # Color-coded output
                if risk > 0.8:
                    status = f"\033[91m🔴 HIGH {risk:.0%}\033[0m"
                elif risk > 0.5:
                    status = f"\033[93m🟡 MED  {risk:.0%}\033[0m"
                else:
                    status = f"\033[92m🟢 LOW  {risk:.0%}\033[0m"

                anomaly_tag = " ⚡ANOMALY" if is_anomaly else ""
                actual = f"\033[91m[{label}]\033[0m" if is_attack else f"\033[92m[{label}]\033[0m"

                print(f"  [{idx+1:3d}/{len(samples)}] {status} {actual:40s} {src_ip:>18s} → {dst_ip}{anomaly_tag}")
                success += 1
            else:
                print(f"  [{idx+1:3d}] ❌ HTTP {resp.status_code}")
        except Exception as e:
            print(f"  [{idx+1:3d}] ❌ {e}")

        time.sleep(0.05)  # Small delay for real-time effect on dashboard

    # Summary
    print(f"\n{'='*60}")
    print(f"📊 Demo Complete")
    print(f"{'='*60}")
    print(f"   Processed: {success}/{len(samples)}")
    print(f"   Alerts triggered: {alerts}")
    print(f"   Anomalies detected: {anomalies}")
    print(f"\n   🌐 Check your dashboard: http://localhost:8080")
    print(f"   📜 Check log history: http://localhost:8080/history")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Live attack demo using CICIDS2017")
    parser.add_argument("-n", "--num-samples", type=int, default=100)
    parser.add_argument("--attack-only", action="store_true", help="Only send attack traffic")
    parser.add_argument("--dataset", choices=["ddos", "portscan"], default="ddos")
    args = parser.parse_args()

    run_demo(num_samples=args.num_samples, attack_only=args.attack_only, dataset_key=args.dataset)
