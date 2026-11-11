"""Module 5b: Reports and Analytics

Generates downloadable CSV export summaries and structured data
for printable academic review and forensic audit reports.
"""
from datetime import datetime, timezone
import io
import csv


def generate_csv_report_data(scan_records) -> str:
    """Generate RFC-compliant CSV string from a collection of ScanRecord instances."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Scan ID",
        "Website URL",
        "Classification",
        "Risk Score (%)",
        "Scan Timestamp (UTC)",
        "Key Threat Indicators",
    ])

    for record in scan_records:
        reasons_str = "; ".join(record.reasons) if isinstance(record.reasons, list) else str(record.reasons or "")
        created_str = (
            record.created_at.strftime("%Y-%m-%d %H:%M:%S")
            if hasattr(record, "created_at") and record.created_at
            else ""
        )
        writer.writerow([
            record.id if hasattr(record, "id") else "",
            record.url,
            record.prediction,
            record.risk_score,
            created_str,
            reasons_str,
        ])

    return output.getvalue()


def generate_summary_metrics(scan_records) -> dict:
    """Compute aggregate statistical indicators from scan records for reports."""
    records_list = list(scan_records)
    total = len(records_list)

    if total == 0:
        return {
            "total_scans": 0,
            "legitimate_count": 0,
            "legitimate_pct": 0.0,
            "suspicious_count": 0,
            "suspicious_pct": 0.0,
            "fraudulent_count": 0,
            "fraudulent_pct": 0.0,
            "avg_risk_score": 0.0,
        }

    legit = sum(1 for r in records_list if str(r.prediction).lower() in ["legitimate", "safe", "0"])
    suspicious = sum(1 for r in records_list if str(r.prediction).lower() == "suspicious")
    fraud = sum(1 for r in records_list if str(r.prediction).lower() in ["fraudulent", "high_risk", "1"])
    avg_score = sum(int(r.risk_score or 0) for r in records_list) / total

    return {
        "total_scans": total,
        "legitimate_count": legit,
        "legitimate_pct": round((legit / total) * 100, 1),
        "suspicious_count": suspicious,
        "suspicious_pct": round((suspicious / total) * 100, 1),
        "fraudulent_count": fraud,
        "fraudulent_pct": round((fraud / total) * 100, 1),
        "avg_risk_score": round(avg_score, 1),
    }


def prepare_printable_report_context(scan_records, transaction_records=None) -> dict:
    """Build the template context for a clean, formal printable review report."""
    metrics = generate_summary_metrics(scan_records)
    tx_list = list(transaction_records or [])
    tx_total = len(tx_list)
    tx_high_risk = sum(1 for t in tx_list if "high" in str(t.risk_level).lower())

    return {
        "report_generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "metrics": metrics,
        "scan_records": list(scan_records)[:100],  # Most recent 100 scans for report view
        "transaction_records": tx_list[:50],
        "transaction_summary": {
            "total_checks": tx_total,
            "high_risk_flagged": tx_high_risk,
        },
    }
