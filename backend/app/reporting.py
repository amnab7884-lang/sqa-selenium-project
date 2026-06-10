"""
Incident Reporting module for Intellihunt Cyber Threat Hunting Copilot.
Generates professional PDF incident reports with charts from MongoDB data.
"""

import os
import io
import tempfile
from datetime import datetime
from typing import List, Optional
from fpdf import FPDF

# Professional color palette
NAVY = (15, 23, 42)
DARK_BLUE = (30, 41, 59)
BLUE_ACCENT = (59, 130, 246)
SLATE = (100, 116, 139)
LIGHT_BG = (241, 245, 249)
WHITE = (255, 255, 255)
RED = (239, 68, 68)
AMBER = (245, 158, 11)
GREEN = (34, 197, 94)


class IntelliHuntReport(FPDF):
    """Professional PDF report with Intellihunt branding."""

    def header(self):
        # Top bar
        self.set_fill_color(*NAVY)
        self.rect(0, 0, 210, 18, "F")
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(*WHITE)
        self.set_xy(10, 4)
        self.cell(0, 10, "INTELLIHUNT", ln=False)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, "Cyber Threat Hunting Copilot", align="R")
        self.ln(18)

    def footer(self):
        self.set_y(-12)
        self.set_fill_color(*LIGHT_BG)
        self.rect(0, self.get_y() - 2, 210, 14, "F")
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*SLATE)
        self.cell(0, 10, f"INTELLIHUNT  |  Confidential  |  Page {self.page_no()}/{{nb}}  |  Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}", align="C")

    def section_title(self, title: str):
        self.ln(3)
        self.set_fill_color(*BLUE_ACCENT)
        self.rect(10, self.get_y(), 3, 8, "F")
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*NAVY)
        self.set_x(16)
        self.cell(0, 8, title, ln=True)
        self.ln(2)

    def key_value(self, key: str, value: str):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*SLATE)
        self.cell(45, 6, f"{key}:", ln=False)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*NAVY)
        self.cell(0, 6, str(value), ln=True)

    def stat_box(self, x: float, y: float, w: float, label: str, value: str, color: tuple):
        self.set_fill_color(*LIGHT_BG)
        self.rect(x, y, w, 22, "F")
        self.set_fill_color(*color)
        self.rect(x, y, w, 2, "F")  # Top accent line
        self.set_xy(x + 3, y + 4)
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*color)
        self.cell(w - 6, 8, value)
        self.set_xy(x + 3, y + 13)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*SLATE)
        self.cell(w - 6, 5, label.upper())

    def alert_row(self, alert: dict, index: int):
        if index % 2 == 0:
            self.set_fill_color(*LIGHT_BG)
        else:
            self.set_fill_color(*WHITE)

        risk = alert.get("score", 0)
        row_h = 5.5
        self.set_font("Helvetica", "", 7)

        # ID
        self.set_text_color(*NAVY)
        self.cell(10, row_h, str(alert.get("id", "")), fill=True, border=0)

        # Type with color
        alert_type = alert.get("type", "")
        if risk > 0.8:
            self.set_text_color(*RED)
        elif risk > 0.5:
            self.set_text_color(*AMBER)
        else:
            self.set_text_color(*GREEN)
        self.cell(24, row_h, alert_type, fill=True, border=0)

        self.set_text_color(*NAVY)
        self.cell(30, row_h, alert.get("source", ""), fill=True, border=0)
        self.cell(30, row_h, alert.get("destination", ""), fill=True, border=0)

        # Risk score bar
        if risk > 0.8:
            self.set_text_color(*RED)
        elif risk > 0.5:
            self.set_text_color(*AMBER)
        else:
            self.set_text_color(*GREEN)
        self.cell(16, row_h, f"{risk:.0%}", fill=True, border=0)

        self.set_text_color(*NAVY)
        anomaly = "YES" if alert.get("anomaly") else "NO"
        self.cell(14, row_h, anomaly, fill=True, border=0)

        ts = alert.get("timestamp", "")
        if isinstance(ts, str) and len(ts) > 16:
            ts = ts[:16]
        self.set_text_color(*SLATE)
        self.cell(0, row_h, str(ts), fill=True, border=0)
        self.ln()


def _generate_charts(alerts: List[dict], logs_summary: dict) -> dict:
    """Generate chart images and return their temp file paths."""
    charts = {}
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        # 1. Risk Distribution Pie Chart
        high = sum(1 for a in alerts if a.get("score", 0) > 0.8)
        medium = sum(1 for a in alerts if 0.5 < a.get("score", 0) <= 0.8)
        low = sum(1 for a in alerts if a.get("score", 0) <= 0.5)

        if high + medium + low > 0:
            fig, ax = plt.subplots(figsize=(4, 3))
            sizes = [high, medium, low]
            labels = [f"Critical ({high})", f"Medium ({medium})", f"Low ({low})"]
            colors_list = ["#EF4444", "#F59E0B", "#22C55E"]
            # Remove zero values
            non_zero = [(s, l, c) for s, l, c in zip(sizes, labels, colors_list) if s > 0]
            if non_zero:
                sizes, labels, colors_list = zip(*non_zero)
                ax.pie(sizes, labels=labels, colors=colors_list, autopct="%1.0f%%",
                       textprops={"fontsize": 8}, startangle=90, pctdistance=0.75)
                ax.set_title("Alert Severity Distribution", fontsize=10, fontweight="bold", pad=10)
                plt.tight_layout()
                path = tempfile.mktemp(suffix=".png")
                plt.savefig(path, dpi=150, bbox_inches="tight")
                plt.close()
                charts["risk_dist"] = path

        # 2. Alerts Timeline (by hour)
        from collections import Counter
        hours = Counter()
        for a in alerts:
            ts = a.get("timestamp", "")
            if ts:
                try:
                    h = datetime.fromisoformat(ts).strftime("%H:00")
                    hours[h] += 1
                except:
                    pass

        if hours:
            sorted_hours = sorted(hours.items())
            fig, ax = plt.subplots(figsize=(5, 2.5))
            ax.bar([h for h, _ in sorted_hours], [c for _, c in sorted_hours],
                   color="#3B82F6", alpha=0.8, width=0.6)
            ax.set_xlabel("Hour", fontsize=8)
            ax.set_ylabel("Alerts", fontsize=8)
            ax.set_title("Alert Activity Timeline", fontsize=10, fontweight="bold")
            ax.tick_params(labelsize=7)
            ax.grid(axis="y", alpha=0.2)
            plt.tight_layout()
            path = tempfile.mktemp(suffix=".png")
            plt.savefig(path, dpi=150, bbox_inches="tight")
            plt.close()
            charts["timeline"] = path

        # 3. Top Source IPs
        ip_counts = Counter(a.get("source", "Unknown") for a in alerts)
        top_ips = ip_counts.most_common(5)
        if top_ips:
            fig, ax = plt.subplots(figsize=(5, 2.5))
            ips = [ip for ip, _ in top_ips]
            counts = [c for _, c in top_ips]
            bars = ax.barh(ips, counts, color="#8B5CF6", alpha=0.8, height=0.5)
            ax.set_xlabel("Alert Count", fontsize=8)
            ax.set_title("Top Threat Sources", fontsize=10, fontweight="bold")
            ax.tick_params(labelsize=7)
            ax.invert_yaxis()
            ax.grid(axis="x", alpha=0.2)
            for bar, count in zip(bars, counts):
                ax.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height()/2,
                        str(count), va="center", fontsize=7, color="#64748B")
            plt.tight_layout()
            path = tempfile.mktemp(suffix=".png")
            plt.savefig(path, dpi=150, bbox_inches="tight")
            plt.close()
            charts["top_ips"] = path

    except ImportError:
        pass
    return charts


def generate_incident_report(
    incident_title: str,
    incident_id: str,
    severity: str,
    summary: str,
    alerts: List[dict],
    logs_summary: dict,
    generated_by: str = "System",
) -> bytes:
    """Generate a professional PDF incident report with charts."""
    pdf = IntelliHuntReport()
    pdf.alias_nb_pages()
    pdf.add_page()

    # ─── Report Metadata ─────────────────────────────────────
    pdf.section_title("Incident Report")
    pdf.key_value("Report ID", incident_id)
    pdf.key_value("Title", incident_title)
    pdf.key_value("Severity", severity.upper())
    pdf.key_value("Generated", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    pdf.key_value("Generated By", generated_by)
    pdf.ln(4)

    # ─── Stat Boxes ──────────────────────────────────────────
    y = pdf.get_y()
    box_w = 43
    pdf.stat_box(10, y, box_w, "Total Logs", str(logs_summary.get("total_logs", 0)), BLUE_ACCENT)
    pdf.stat_box(10 + box_w + 4, y, box_w, "Total Alerts", str(logs_summary.get("total_alerts", 0)), RED)
    pdf.stat_box(10 + (box_w + 4) * 2, y, box_w, "Anomalies", str(logs_summary.get("anomaly_count", 0)), AMBER)
    pdf.stat_box(10 + (box_w + 4) * 3, y, box_w, "High Risk", str(logs_summary.get("high_risk_count", 0)), RED)
    pdf.set_y(y + 28)

    # ─── Executive Summary ───────────────────────────────────
    pdf.section_title("Executive Summary")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(51, 65, 85)
    pdf.multi_cell(0, 5, summary)
    pdf.ln(3)

    # ─── Charts ──────────────────────────────────────────────
    charts = _generate_charts(alerts, logs_summary)

    if charts:
        pdf.section_title("Visual Analytics")

        if "risk_dist" in charts and "top_ips" in charts:
            y = pdf.get_y()
            pdf.image(charts["risk_dist"], x=10, y=y, w=90)
            pdf.image(charts["top_ips"], x=105, y=y, w=95)
            pdf.set_y(y + 60)
        elif "risk_dist" in charts:
            pdf.image(charts["risk_dist"], x=30, w=100)
            pdf.ln(5)

        if "timeline" in charts:
            pdf.image(charts["timeline"], x=20, w=170)
            pdf.ln(5)

        # Clean up temp files
        for path in charts.values():
            try:
                os.unlink(path)
            except:
                pass

    # ─── Alert Details ───────────────────────────────────────
    if alerts:
        pdf.add_page()
        pdf.section_title(f"Alert Details ({len(alerts)} alerts)")

        # Table header
        pdf.set_font("Helvetica", "B", 7)
        pdf.set_fill_color(*NAVY)
        pdf.set_text_color(*WHITE)
        row_h = 5.5
        pdf.cell(10, row_h, "ID", fill=True, border=0)
        pdf.cell(24, row_h, "Type", fill=True, border=0)
        pdf.cell(30, row_h, "Source IP", fill=True, border=0)
        pdf.cell(30, row_h, "Dest IP", fill=True, border=0)
        pdf.cell(16, row_h, "Risk", fill=True, border=0)
        pdf.cell(14, row_h, "Anomaly", fill=True, border=0)
        pdf.cell(0, row_h, "Timestamp", fill=True, border=0)
        pdf.ln()

        for i, alert in enumerate(alerts[:50]):
            pdf.alert_row(alert, i)

        if len(alerts) > 50:
            pdf.ln(2)
            pdf.set_font("Helvetica", "I", 8)
            pdf.set_text_color(*SLATE)
            pdf.cell(0, 5, f"... and {len(alerts) - 50} more alerts (truncated)", ln=True)

    # ─── Recommendations ─────────────────────────────────────
    pdf.ln(5)
    pdf.section_title("Recommendations")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(51, 65, 85)

    recommendations = [
        "1. Investigate all critical alerts (score > 80%) within the first hour.",
        "2. Block identified malicious IPs via the Intellihunt blocklist system.",
        "3. Review anomalous patterns for potential zero-day or advanced persistent threats.",
        "4. Update firewall rules and IDS signatures based on detected attack vectors.",
        "5. Run endpoint scans on affected destination hosts.",
        "6. Document response actions and update the incident response playbook.",
    ]
    for rec in recommendations:
        pdf.multi_cell(0, 5, rec)
        pdf.ln(1)

    # Return PDF bytes
    return bytes(pdf.output())
