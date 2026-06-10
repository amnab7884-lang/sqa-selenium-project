import argparse
import pandas as pd
import requests
import kagglehub
import os
import time

API_URL = "http://localhost:8000/ingest"

def main():
    parser = argparse.ArgumentParser(description="Ingest CICIDS2017 attacks to trigger alerts.")
    parser.add_argument("-n", "--num", type=int, default=50, help="Number of attacks to ingest")
    args = parser.parse_args()

    print(f"🔍 Locating cached CICIDS2017 dataset...")
    # Bypass kagglehub API to avoid 403 errors. We know the files are cached locally from training.
    path = os.path.expanduser("~/.cache/kagglehub/datasets/cicdataset/cicids2017/versions")
    
    if not os.path.exists(path):
        print(f"❌ Could not find cached dataset at {path}")
        return
        
    # Get the latest version folder
    versions = os.listdir(path)
    if not versions:
        print("❌ No versions found in cache.")
        return
    path = os.path.join(path, versions[-1])

    csv_dir = os.path.join(path, "MachineLearningCVE")
    if not os.path.exists(csv_dir):
        print(f"❌ CSV directory not found at {csv_dir}")
        return

    # Find a file with attacks (PortScan or DDoS)
    target_file = None
    for f in os.listdir(csv_dir):
        if f.endswith('.csv') and ('PortScan' in f or 'DDoS' in f):
            target_file = os.path.join(csv_dir, f)
            break
            
    if not target_file:
        csvs = [f for f in os.listdir(csv_dir) if f.endswith('.csv')]
        if not csvs:
            print("❌ No CSV files found.")
            return
        target_file = os.path.join(csv_dir, csvs[0])

    print(f"📂 Loading data from: {os.path.basename(target_file)}")
    try:
        df = pd.read_csv(target_file)
    except Exception as e:
        print(f"❌ Failed to read CSV: {e}")
        return
    
    # Clean column names (strip whitespace and uppercase)
    df.columns = df.columns.str.strip().str.upper()
    
    # Filter for ATTACKS only (ignore BENIGN)
    attacks_df = df[df['LABEL'] != 'BENIGN']
    
    if attacks_df.empty:
        print("⚠️ No attacks found in this file. Try a different one.")
        return

    # Take the requested number of samples
    attacks_df = attacks_df.head(args.num)
    
    print(f"🚀 Found {len(attacks_df)} attack flows. Starting ingestion to {API_URL}...\n")
    
    success = 0
    for i, row in attacks_df.iterrows():
        flow_data = row.to_dict()
        label = flow_data.pop('LABEL', 'Unknown Attack')
        
        # Ensure IPs exist for the dashboard visual
        if 'SRC IP' not in flow_data and 'SRC_IP' not in flow_data:
            flow_data['SRC_IP'] = "185.15.59.224" # Simulate external malicious IP
            flow_data['DST_IP'] = "192.168.1.100" # Simulate internal victim IP
            
        try:
            res = requests.post(API_URL, json={"data": flow_data})
            if res.status_code == 200:
                verdict = res.json().get('prediction', {}).get('verdict', 'UNKNOWN')
                score = res.json().get('prediction', {}).get('risk_score', 0)
                print(f"[{success+1}/{args.num}] Original Label: {label:<15} | System Verdict: {verdict} (Score: {score:.2f})")
                success += 1
            else:
                print(f"❌ API Error: {res.status_code} - {res.text}")
        except requests.exceptions.ConnectionError:
            print("\n❌ Connection refused. Make sure your backend is running!")
            print("   Run: bash start_demo.sh")
            break
        except Exception as e:
            print(f"❌ Error: {e}")
            
        # Small delay so the dashboard UI looks realistic
        time.sleep(1)
        
    print(f"\n✅ Finished! Successfully ingested {success} alerts.")

if __name__ == "__main__":
    main()
