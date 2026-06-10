#!/usr/bin/env python3
"""
PCAP Ingestion Script for Intellihunt Security Dashboard
=========================================================

This script processes .pcap files and sends the extracted network flows 
to the backend API for ML-based threat analysis.

Usage:
    python ingest_pcap.py <pcap_file>           # Process a single file
    python ingest_pcap.py --dir <folder>        # Process all PCAP files in a folder
    python ingest_pcap.py --watch <folder>      # Watch folder for new PCAP files

Requirements:
    pip install nfstream requests

Note: The backend must be running at http://localhost:8000
"""

import os
import sys
import time
import json
import argparse
import requests
from datetime import datetime

# Try importing nfstream
try:
    from nfstream import NFStreamer
except ImportError:
    print("❌ Error: nfstream is not installed.")
    print("   Install it with: pip install nfstream")
    sys.exit(1)

# Configuration
API_URL = "http://localhost:8000/ingest"
MAX_FLOWS_PER_FILE = 500  # Limit flows per file to avoid overwhelming the system

def extract_flows_from_pcap(pcap_path):
    """
    Extract network flows from a PCAP file using NFStream.
    
    Args:
        pcap_path: Path to the PCAP file
        
    Returns:
        List of flow dictionaries
    """
    import bz2
    import shutil
    
    actual_pcap = pcap_path
    temp_unzipped = None
    
    # Handle compressed files
    if pcap_path.endswith(".bz2"):
        print(f"📦 Decompressing: {pcap_path}")
        temp_unzipped = pcap_path.replace(".bz2", "")
        with bz2.open(pcap_path, "rb") as source, open(temp_unzipped, "wb") as dest:
            shutil.copyfileobj(source, dest)
        actual_pcap = temp_unzipped
    
    print(f"🔍 Extracting flows from: {actual_pcap}")
    
    flows = []
    try:
        streamer = NFStreamer(source=actual_pcap, statistical_analysis=True)
        
        for flow in streamer:
            if len(flows) >= MAX_FLOWS_PER_FILE:
                print(f"⚠️  Reached limit of {MAX_FLOWS_PER_FILE} flows")
                break
            
            duration = flow.bidirectional_duration_ms
            
            # Map to CICIDS2017 feature format
            mapped_flow = {
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
            }
            flows.append(mapped_flow)
        
        print(f"✅ Extracted {len(flows)} flows")
        
    finally:
        # Cleanup temporary unzipped file
        if temp_unzipped and os.path.exists(temp_unzipped):
            os.remove(temp_unzipped)
    
    return flows


def send_flows_to_backend(flows, show_progress=True):
    """
    Send extracted flows to the backend API for analysis.
    
    Args:
        flows: List of flow dictionaries
        show_progress: Whether to print progress
        
    Returns:
        Tuple of (success_count, alert_count)
    """
    success_count = 0
    alert_count = 0
    
    print(f"📤 Sending {len(flows)} flows to {API_URL}...")
    
    for i, flow in enumerate(flows):
        try:
            response = requests.post(API_URL, json={"data": flow}, timeout=5)
            
            if response.status_code == 200:
                result = response.json()
                risk = result.get("prediction", {}).get("risk_score", 0)
                is_anomaly = result.get("prediction", {}).get("is_anomaly", False)
                
                success_count += 1
                if risk > 0.5 or is_anomaly:
                    alert_count += 1
                
                if show_progress:
                    status = "🔴" if risk > 0.5 else "🟢"
                    anomaly = "⚠️" if is_anomaly else ""
                    print(f"  [{i+1}/{len(flows)}] {status} Risk: {risk:.2f} {anomaly}")
            else:
                print(f"  ❌ Failed: {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print(f"\n❌ Connection Error: Backend not running at {API_URL}")
            print("   Start the backend with: python backend/app/main.py")
            return success_count, alert_count
        except Exception as e:
            print(f"  ❌ Error: {e}")
        
        # Small delay to avoid overwhelming the API
        time.sleep(0.05)
    
    return success_count, alert_count


def process_pcap_file(pcap_path):
    """Process a single PCAP file and send flows to backend."""
    if not os.path.exists(pcap_path):
        print(f"❌ File not found: {pcap_path}")
        return
    
    print(f"\n{'='*60}")
    print(f"📁 Processing: {pcap_path}")
    print(f"{'='*60}")
    
    flows = extract_flows_from_pcap(pcap_path)
    
    if flows:
        success, alerts = send_flows_to_backend(flows)
        print(f"\n📊 Results:")
        print(f"   • Flows processed: {success}/{len(flows)}")
        print(f"   • Alerts generated: {alerts}")
    else:
        print("⚠️  No flows extracted from this file")


def process_directory(directory):
    """Process all PCAP files in a directory."""
    if not os.path.exists(directory):
        print(f"❌ Directory not found: {directory}")
        return
    
    valid_extensions = (".pcap", ".pcapng", ".bz2")
    pcap_files = [f for f in os.listdir(directory) 
                  if f.lower().endswith(valid_extensions)]
    
    if not pcap_files:
        print(f"⚠️  No PCAP files found in {directory}")
        print(f"   Place .pcap or .pcapng files in the directory")
        return
    
    print(f"🔍 Found {len(pcap_files)} PCAP files in {directory}")
    
    for filename in pcap_files:
        process_pcap_file(os.path.join(directory, filename))
    
    print(f"\n✅ All files processed!")
    print(f"🌐 Check your dashboard at http://localhost:8080")


def watch_directory(directory, interval=5):
    """Watch a directory for new PCAP files and process them."""
    if not os.path.exists(directory):
        os.makedirs(directory)
        print(f"📁 Created watch directory: {directory}")
    
    processed_files = set()
    valid_extensions = (".pcap", ".pcapng", ".bz2")
    
    print(f"👁️  Watching {directory} for new PCAP files...")
    print(f"   Press Ctrl+C to stop\n")
    
    try:
        while True:
            for filename in os.listdir(directory):
                if filename.lower().endswith(valid_extensions):
                    filepath = os.path.join(directory, filename)
                    
                    if filepath not in processed_files:
                        process_pcap_file(filepath)
                        processed_files.add(filepath)
            
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print("\n\n👋 Stopped watching")


def main():
    parser = argparse.ArgumentParser(
        description="Ingest PCAP files into Intellihunt Security Dashboard",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python ingest_pcap.py capture.pcap              # Process single file
  python ingest_pcap.py --dir pcaps/              # Process all files in directory
  python ingest_pcap.py --watch pcaps/            # Watch for new files
  python ingest_pcap.py --limit 100 capture.pcap  # Limit to 100 flows
        """
    )
    
    parser.add_argument("file", nargs="?", help="PCAP file to process")
    parser.add_argument("--dir", "-d", help="Directory containing PCAP files")
    parser.add_argument("--watch", "-w", help="Watch directory for new files")
    parser.add_argument("--limit", "-l", type=int, default=500, 
                        help="Max flows per file (default: 500)")
    
    args = parser.parse_args()
    
    global MAX_FLOWS_PER_FILE
    MAX_FLOWS_PER_FILE = args.limit
    
    print("=" * 60)
    print("🛡️  INTELLIHUNT PCAP INGESTION TOOL")
    print("=" * 60)
    print(f"Backend API: {API_URL}")
    print(f"Max flows per file: {MAX_FLOWS_PER_FILE}")
    print()
    
    if args.watch:
        watch_directory(args.watch)
    elif args.dir:
        process_directory(args.dir)
    elif args.file:
        process_pcap_file(args.file)
    else:
        # Default: process pcaps/ directory
        default_dir = os.path.join(os.path.dirname(__file__), "..", "pcaps")
        if os.path.exists(default_dir):
            process_directory(default_dir)
        else:
            parser.print_help()


if __name__ == "__main__":
    main()
