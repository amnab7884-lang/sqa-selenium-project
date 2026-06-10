#!/usr/bin/env python3
"""
CICIDS2017 Model Validation — Generates evaluation metrics and visualizations.
Downloads labeled attack data via kagglehub, runs it through the trained
Random Forest + Isolation Forest models, and produces:
  1. Classification Report (Precision, Recall, F1)
  2. Confusion Matrix (saved as PNG)
  3. ROC Curve (saved as PNG)
  4. Per-attack-type detection rates
  5. Summary report (saved as TXT)

Usage:
  .venv/bin/python ml/validate_model.py
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
import kagglehub
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_curve, auc,
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
)

# ─── Configuration ───────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "backend", "ml")
OUTPUT_DIR = os.path.join(BASE_DIR, "ml", "evaluation_results")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load trained models
print("📦 Loading trained models...")
rf_model = joblib.load(os.path.join(MODEL_DIR, "rf_model.pkl"))
iso_model = joblib.load(os.path.join(MODEL_DIR, "iso_model.pkl"))
scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
feature_names = joblib.load(os.path.join(MODEL_DIR, "feature_names.pkl"))
print(f"   Features: {len(feature_names)}")

# ─── Download CICIDS2017 Data ────────────────────────────────────
print("\n🌐 Downloading CICIDS2017 dataset via kagglehub...")
data_path = kagglehub.dataset_download("dhoogla/cicids2017")
print(f"   Dataset path: {data_path}")

# Test on multiple attack types
DATASET_FILES = {
    "DDoS": "DDoS-Friday-no-metadata.parquet",
    "PortScan": "Portscan-Friday-no-metadata.parquet",
    "Botnet": "Botnet-Friday-no-metadata.parquet",
    "WebAttack": "WebAttacks-Thursday-no-metadata.parquet",
    "Infiltration": "Infiltration-Thursday-no-metadata.parquet",
    "BruteForce": "Bruteforce-Tuesday-no-metadata.parquet",
    "DoS": "DoS-Wednesday-no-metadata.parquet"
}

all_results = []
all_y_true = []
all_y_prob = []
all_labels = []

for attack_name, filename in DATASET_FILES.items():
    filepath = os.path.join(data_path, filename)
    if not os.path.exists(filepath):
        print(f"   ⚠️ {filename} not found, skipping...")
        continue

    print(f"\n{'='*60}")
    print(f"📊 Evaluating: {attack_name} ({filename})")
    print(f"{'='*60}")

    df = pd.read_parquet(filepath)
    df.columns = df.columns.str.upper()

    # Create binary labels
    y_true = (df["LABEL"].str.upper() != "BENIGN").astype(int)
    benign_count = (y_true == 0).sum()
    attack_count = (y_true == 1).sum()
    print(f"   Total samples: {len(df):,}")
    print(f"   Benign: {benign_count:,} | Attack: {attack_count:,}")

    # Prepare features
    X = df.select_dtypes(include=["number"]).fillna(0).astype(float)
    X = X.reindex(columns=feature_names, fill_value=0)
    X_scaled = scaler.transform(X)

    # ─── Random Forest Evaluation ────────────────────────────
    print(f"\n🌲 Random Forest Results ({attack_name}):")
    rf_pred = rf_model.predict(X_scaled)
    rf_prob = rf_model.predict_proba(X_scaled)[:, 1]

    print(classification_report(y_true, rf_pred,
          target_names=["Benign", "Attack"], zero_division=0))

    acc = accuracy_score(y_true, rf_pred)
    prec = precision_score(y_true, rf_pred, zero_division=0)
    rec = recall_score(y_true, rf_pred, zero_division=0)
    f1 = f1_score(y_true, rf_pred, zero_division=0)
    auc_score = roc_auc_score(y_true, rf_prob) if len(set(y_true)) > 1 else 0

    print(f"   Accuracy:  {acc:.4f}")
    print(f"   Precision: {prec:.4f}")
    print(f"   Recall:    {rec:.4f}")
    print(f"   F1-Score:  {f1:.4f}")
    print(f"   ROC-AUC:   {auc_score:.4f}")

    # ─── Isolation Forest Evaluation ─────────────────────────
    print(f"\n🕵️ Isolation Forest Results ({attack_name}):")
    iso_raw = iso_model.predict(X_scaled)
    iso_pred = np.where(iso_raw == -1, 1, 0)
    print(classification_report(y_true, iso_pred,
          target_names=["Benign", "Attack"], zero_division=0))

    # ─── Per-attack-type breakdown ───────────────────────────
    if "LABEL" in df.columns:
        print(f"\n📋 Detection by Attack Type ({attack_name}):")
        for label in df["LABEL"].unique():
            mask = df["LABEL"] == label
            label_count = mask.sum()
            if label_count == 0:
                continue
            detected = rf_pred[mask].sum()
            rate = detected / label_count * 100
            status = "✅" if rate > 70 else "⚠️" if rate > 30 else "❌"
            print(f"   {status} {label:30s} → {detected:,}/{label_count:,} detected ({rate:.1f}%)")

    # Collect for aggregate
    all_y_true.extend(y_true.tolist())
    all_y_prob.extend(rf_prob.tolist())
    all_labels.append(attack_name)

    all_results.append({
        "dataset": attack_name,
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1": f1,
        "roc_auc": auc_score,
        "confusion_matrix": confusion_matrix(y_true, rf_pred).tolist(),
    })

# ─── Generate Visualizations ─────────────────────────────────────
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import seaborn as sns

    print(f"\n📈 Generating visualizations in {OUTPUT_DIR}/...")

    # 1. Confusion Matrix for each dataset
    for result in all_results:
        cm = np.array(result["confusion_matrix"])
        fig, ax = plt.subplots(figsize=(6, 5))
        sns.heatmap(cm, annot=True, fmt=",d", cmap="Blues",
                    xticklabels=["Benign", "Attack"],
                    yticklabels=["Benign", "Attack"], ax=ax)
        ax.set_xlabel("Predicted")
        ax.set_ylabel("Actual")
        ax.set_title(f"Confusion Matrix — {result['dataset']}")
        plt.tight_layout()
        path = os.path.join(OUTPUT_DIR, f"confusion_matrix_{result['dataset'].lower()}.png")
        plt.savefig(path, dpi=150)
        plt.close()
        print(f"   ✅ {path}")

    # 2. ROC Curve (aggregate)
    if len(all_y_true) > 0 and len(set(all_y_true)) > 1:
        fpr, tpr, _ = roc_curve(all_y_true, all_y_prob)
        roc_auc_val = auc(fpr, tpr)

        fig, ax = plt.subplots(figsize=(6, 5))
        ax.plot(fpr, tpr, color="#3B82F6", lw=2, label=f"ROC (AUC = {roc_auc_val:.4f})")
        ax.plot([0, 1], [0, 1], color="#555", lw=1, linestyle="--", alpha=0.5)
        ax.set_xlabel("False Positive Rate")
        ax.set_ylabel("True Positive Rate")
        ax.set_title("ROC Curve — Random Forest (CICIDS2017)")
        ax.legend(loc="lower right")
        ax.grid(alpha=0.2)
        plt.tight_layout()
        path = os.path.join(OUTPUT_DIR, "roc_curve.png")
        plt.savefig(path, dpi=150)
        plt.close()
        print(f"   ✅ {path}")

    # 3. Metrics comparison bar chart
    fig, ax = plt.subplots(figsize=(8, 4))
    metrics = ["accuracy", "precision", "recall", "f1", "roc_auc"]
    x = np.arange(len(metrics))
    width = 0.35
    for i, result in enumerate(all_results):
        values = [result[m] for m in metrics]
        ax.bar(x + i * width, values, width, label=result["dataset"], alpha=0.85)
    ax.set_ylabel("Score")
    ax.set_title("Model Performance Metrics by Dataset")
    ax.set_xticks(x + width / 2)
    ax.set_xticklabels(["Accuracy", "Precision", "Recall", "F1", "ROC-AUC"])
    ax.legend()
    ax.set_ylim(0, 1.05)
    ax.grid(axis="y", alpha=0.2)
    plt.tight_layout()
    path = os.path.join(OUTPUT_DIR, "metrics_comparison.png")
    plt.savefig(path, dpi=150)
    plt.close()
    print(f"   ✅ {path}")

except ImportError:
    print("   ⚠️ matplotlib/seaborn not installed — skipping charts")
    print("   Install with: pip install matplotlib seaborn")

# ─── Save Summary Report ─────────────────────────────────────────
report_path = os.path.join(OUTPUT_DIR, "validation_report.txt")
with open(report_path, "w") as f:
    f.write("INTELLIHUNT — ML Model Validation Report\n")
    f.write("=" * 50 + "\n\n")
    for r in all_results:
        f.write(f"Dataset: {r['dataset']}\n")
        f.write(f"  Accuracy:  {r['accuracy']:.4f}\n")
        f.write(f"  Precision: {r['precision']:.4f}\n")
        f.write(f"  Recall:    {r['recall']:.4f}\n")
        f.write(f"  F1-Score:  {r['f1']:.4f}\n")
        f.write(f"  ROC-AUC:   {r['roc_auc']:.4f}\n")
        f.write(f"  Confusion Matrix: {r['confusion_matrix']}\n\n")

# ─── Save JSON for Backend API ───────────────────────────────────
import json
json_path = os.path.join(OUTPUT_DIR, "metrics.json")
json_data = {
    "validated_at": datetime.now().isoformat() if 'datetime' in dir() else __import__('datetime').datetime.now().isoformat(),
    "datasets": all_results,
    "aggregate": {
        "total_samples": len(all_y_true),
        "attack_types_tested": all_labels,
    }
}
with open(json_path, "w") as f:
    json.dump(json_data, f, indent=2)
print(f"📊 JSON metrics saved: {json_path}")

print(f"\n📄 Report saved: {report_path}")
print("\n✅ Validation complete!")
