# -*- coding: utf-8 -*-
"""
=============================================================
 INTELLIHUNT — Multi-Class Training Pipeline
 Trains on ALL 7 attack types from the CICIDS2017 dataset
=============================================================
"""
import kagglehub
import pandas as pd
import numpy as np
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import (
    confusion_matrix, classification_report, roc_auc_score,
    accuracy_score, precision_score, recall_score, f1_score
)
import joblib

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

# ─── Step 1: Download Dataset ──────────────────────────────────
print("🚀 Step 1: Downloading CICIDS2017 Dataset via kagglehub...")
path = kagglehub.dataset_download("dhoogla/cicids2017")
print(f"Dataset path: {path}")

# ─── Step 2: Load ALL Attack Files ─────────────────────────────
DATASET_FILES = {
    "DDoS":          "DDoS-Friday-no-metadata.parquet",
    "PortScan":      "Portscan-Friday-no-metadata.parquet",
    "Botnet":        "Botnet-Friday-no-metadata.parquet",
    "BruteForce":    "Bruteforce-Tuesday-no-metadata.parquet",
    "DoS":           "DoS-Wednesday-no-metadata.parquet",
    "WebAttack":     "WebAttacks-Thursday-no-metadata.parquet",
    "Infiltration":  "Infiltration-Thursday-no-metadata.parquet",
    "Benign":        "Benign-Monday-no-metadata.parquet",
}

print("\n📂 Step 2: Loading ALL attack datasets...")
frames = []

for attack_name, filename in DATASET_FILES.items():
    filepath = os.path.join(path, filename)
    if not os.path.exists(filepath):
        print(f"  ⚠️  {filename} not found, skipping")
        continue

    df = pd.read_parquet(filepath)
    df.columns = df.columns.str.upper()
    
    # Count distribution
    if "LABEL" in df.columns:
        benign_count = (df["LABEL"].str.upper() == "BENIGN").sum()
        attack_count = (df["LABEL"].str.upper() != "BENIGN").sum()
        print(f"  ✅ {attack_name:15s} — {len(df):>8,} rows  (Benign: {benign_count:>7,}, Attack: {attack_count:>7,})")
    else:
        print(f"  ✅ {attack_name:15s} — {len(df):>8,} rows  (no LABEL column)")

    frames.append(df)

if not frames:
    print("❌ No datasets loaded! Check kagglehub cache.")
    exit(1)

# Combine all datasets
combined = pd.concat(frames, ignore_index=True)
print(f"\n📊 Combined Dataset: {len(combined):,} total rows")
print(f"Label distribution:\n{combined['LABEL'].value_counts()}")

# ─── Step 3: Prepare Features & Labels ──────────────────────────
X = combined.select_dtypes(include=["number"]).fillna(0).astype(float)

# Replace infinities with large finite values
X = X.replace([np.inf, -np.inf], np.nan).fillna(0)

# Binary labels: Attack=1, Benign=0
y = (combined["LABEL"].str.upper() != "BENIGN").astype(int)

print(f"\nFeatures: {X.shape[1]} columns")
print(f"Benign: {(y == 0).sum():,}  |  Attack: {(y == 1).sum():,}")

# ─── Step 4: Balanced Sampling ──────────────────────────────────
# To prevent DDoS from dominating (it has 128K rows vs Botnet's 1.9K),
# we cap each class to prevent the model from being biased.
MAX_PER_CLASS = 50000

benign_mask = y == 0
attack_mask = y == 1

benign_idx = X[benign_mask].sample(min(MAX_PER_CLASS, benign_mask.sum()), random_state=RANDOM_SEED).index
attack_idx = X[attack_mask].sample(min(MAX_PER_CLASS, attack_mask.sum()), random_state=RANDOM_SEED).index

balanced_idx = benign_idx.append(attack_idx)
X_balanced = X.loc[balanced_idx]
y_balanced = y.loc[balanced_idx]

print(f"\n🎯 Balanced Dataset: {len(X_balanced):,} rows")
print(f"Benign: {(y_balanced == 0).sum():,}  |  Attack: {(y_balanced == 1).sum():,}")

# ─── Step 5: Train/Test Split ──────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X_balanced, y_balanced, test_size=0.25, random_state=RANDOM_SEED, stratify=y_balanced
)

print(f"\nTrain: {len(X_train):,}  |  Test: {len(X_test):,}")

# Feature Scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
print("Feature Scaling Done")

# ─── Step 6: Train Random Forest ───────────────────────────────
print("\n🌲 Step 6: Training Random Forest on ALL attack types...")
rf = RandomForestClassifier(
    n_estimators=300,           # More trees for better generalization
    max_depth=30,               # Prevent overfitting
    min_samples_split=5,
    random_state=RANDOM_SEED,
    class_weight="balanced",
    n_jobs=-1,                  # Use all CPU cores
)

rf.fit(X_train_scaled, y_train)
print("Random Forest Training Complete")

# ─── Step 7: Evaluate ──────────────────────────────────────────
print("\n📊 Step 7: Evaluation")
y_pred = rf.predict(X_test_scaled)
y_prob = rf.predict_proba(X_test_scaled)[:, 1]

print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))
print("\nClassification Report:")
print(classification_report(y_test, y_pred, zero_division=0))
print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
print(f"Precision: {precision_score(y_test, y_pred, zero_division=0):.4f}")
print(f"Recall:    {recall_score(y_test, y_pred, zero_division=0):.4f}")
print(f"F1 Score:  {f1_score(y_test, y_pred, zero_division=0):.4f}")
print(f"ROC-AUC:   {roc_auc_score(y_test, y_prob):.4f}")

# ─── Step 8: Train Isolation Forest ────────────────────────────
print("\n🕵️ Step 8: Training Isolation Forest on ALL benign data...")
X_benign_train = X_train_scaled[y_train == 0]
print(f"Training Isolation Forest on {len(X_benign_train):,} benign flows")

iso = IsolationForest(
    n_estimators=200,
    contamination='auto',
    random_state=RANDOM_SEED,
    n_jobs=-1,
)
iso.fit(X_benign_train)

# Evaluate
iso_raw = iso.predict(X_test_scaled)
iso_preds = np.where(iso_raw == -1, 1, 0)
print("\nIsolation Forest Results:")
print(classification_report(y_test, iso_preds, target_names=["Benign", "Attack"], zero_division=0))

# ─── Step 9: Save Models ──────────────────────────────────────
output_dir = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(output_dir, exist_ok=True)

joblib.dump(rf, os.path.join(output_dir, "rf_model.pkl"))
joblib.dump(iso, os.path.join(output_dir, "iso_model.pkl"))
joblib.dump(scaler, os.path.join(output_dir, "scaler.pkl"))
joblib.dump(list(X.columns), os.path.join(output_dir, "feature_names.pkl"))

print(f"\n✅ All models saved to {output_dir}/")
print("   • rf_model.pkl      — Random Forest (trained on ALL 7 attack types)")
print("   • iso_model.pkl     — Isolation Forest (trained on benign from ALL files)")
print("   • scaler.pkl        — StandardScaler")
print("   • feature_names.pkl — Feature column names")

# ─── Step 10: Per-Attack-Type Validation ────────────────────────
print("\n🔍 Step 10: Per-Attack-Type Validation")
print("=" * 60)

for attack_name, filename in DATASET_FILES.items():
    if attack_name == "Benign":
        continue
    filepath = os.path.join(path, filename)
    if not os.path.exists(filepath):
        continue

    test_df = pd.read_parquet(filepath)
    test_df.columns = test_df.columns.str.upper()

    X_val = test_df.select_dtypes(include=["number"]).fillna(0).astype(float)
    X_val = X_val.replace([np.inf, -np.inf], np.nan).fillna(0)
    X_val = X_val.reindex(columns=X.columns, fill_value=0)
    X_val_scaled = scaler.transform(X_val)

    if "LABEL" in test_df.columns:
        y_val = (test_df["LABEL"].str.upper() != "BENIGN").astype(int)
        preds = rf.predict(X_val_scaled)
        acc = accuracy_score(y_val, preds)
        rec = recall_score(y_val, preds, zero_division=0)
        f1 = f1_score(y_val, preds, zero_division=0)
        print(f"  {attack_name:15s} — Accuracy: {acc:.3f}  Recall: {rec:.3f}  F1: {f1:.3f}")

print("\n✅ Multi-class training pipeline complete!")
