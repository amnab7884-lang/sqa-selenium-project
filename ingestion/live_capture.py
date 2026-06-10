import httpx
import time
import os
import sys
import subprocess
from nfstream import NFStreamer

# Configuration — interface can be overridden by the backend via CAPTURE_INTERFACE env var
API_URL = "http://127.0.0.1:8000/ingest"

def get_windows_interface():
    """Programmatically detects the active Windows network adapter GUID for Npcap."""
    if os.name == 'nt':  # Windows
        try:
            # Query PowerShell for the active (Status = 'Up') network adapter GUID
            cmd = "Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -ExpandProperty InterfaceGuid | Select-Object -First 1"
            guid = subprocess.check_output(["powershell", "-Command", cmd], text=True).strip()
            if guid:
                # Npcap expects exactly one set of curly braces: \Device\NPF_{GUID}
                # If PowerShell returned '{GUID}', strip them before wrapping
                clean_guid = guid.strip("{}")
                return f"\\Device\\NPF_{{{clean_guid}}}"
        except Exception as e:
            print(f"Warning: Failed to auto-detect Windows interface: {e}")
    return os.environ.get("CAPTURE_INTERFACE", "en0")

INTERFACE = get_windows_interface()


def map_nfstream_to_cicids(flow):
    """
    Maps nfstream flow object features to CICIDS-like feature names.
    """
    duration = flow.bidirectional_duration_ms
    data = {
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
        "SRC_IP": flow.src_ip,
        "DST_IP": flow.dst_ip,
        "TIMESTAMP": time.strftime('%Y-%m-%dT%H:%M:%S')
    }
    return data

def main():
    print(f"Starting Real-time Traffic Capture on {INTERFACE}...")
    print(f"Sending flows to {API_URL}")
    print("NOTE: You must run this script with sudo/root permissions.")
    
    try:
        # statistical_analysis=True is required for flow metrics
        # active_timeout/idle_timeout reduced to make flows emit much faster for demo purposes
        streamer = NFStreamer(source=INTERFACE, 
                              promiscuous_mode=True, 
                              statistical_analysis=True,
                              active_timeout=5,   # Force emit after 5s even if connection is still alive
                              idle_timeout=2)     # Force emit if no packets for 2s
        
        for flow in streamer:
            log_data = map_nfstream_to_cicids(flow)
            payload = {"data": log_data}
            
            try:
                response = httpx.post(API_URL, json=payload, timeout=15.0)
                if response.status_code == 200:
                    result = response.json().get("prediction", {})
                    status = "ANOMALY" if result.get("is_anomaly") else "Normal"
                    score = result.get("risk_score", 0)
                    print(f"[{status}] Flow: {flow.src_ip} -> {flow.dst_ip} | Score: {score:.2f}")
                else:
                    print(f"Backend error: {response.status_code}")
            except Exception as e:
                print(f"Failed to send flow to backend: {e}")
                
    except Exception as e:
        print(f"Capture error: {e}")
        print("Tip: Run with 'sudo ./.venv/bin/python ingestion/live_capture.py'")

if __name__ == "__main__":
    main()
