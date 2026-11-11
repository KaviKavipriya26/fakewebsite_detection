from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
from django.db.models import Q
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import ScanRecord, Alert, TransactionCheck
from .model import predict
from .transaction_fraud import evaluate_transaction
from .pipeline.reports import (
    generate_csv_report_data,
    generate_summary_metrics,
    prepare_printable_report_context,
)


# ==========================================
# REST API (JSON Endpoints for legacy React & external apps)
# ==========================================

@api_view(["GET"])
def health(request):
    """Health check endpoint."""
    return Response({"status": "ok"})


@api_view(["POST"])
def scan(request):
    """Scan URL endpoint. Saves scan to DB and returns JSON result."""
    url = str(request.data.get("url", "")).strip()
    if not url:
        return Response({"error": "url is required"}, status=400)
    if not url.lower().startswith(("http://", "https://")):
        return Response({"error": "url must start with http:// or https://"}, status=400)

    result = predict(url)

    # Save to database
    try:
        record = ScanRecord.objects.create(
            url=result["url"],
            prediction=result["prediction"],
            risk_score=result["risk_score"],
            features=result["features"],
            reasons=result["reasons"],
            domain_info=result.get("domain_info", {}),
        )
        for alert_data in result.get("alerts", []):
            Alert.objects.create(
                scan_record=record,
                url=result["url"],
                severity=alert_data.get("severity", "high"),
                title=alert_data.get("title", "Security Alert"),
                message=alert_data.get("message", ""),
                recommendations=alert_data.get("recommendations", []),
            )
    except Exception as exc:
        print(f"[API] Error saving scan to DB: {exc}")

    return Response({
        "url": result["url"],
        "prediction": result["prediction"],
        "risk_score": result["risk_score"],
        "features": result["features"],
        "reasons": result["reasons"],
        "domain_info": result.get("domain_info", {}),
        "alerts": result.get("alerts", []),
    })


# ==========================================
# Django Template Views (Full Web UI)
# ==========================================

def home_view(request):
    """Home landing page with system overview and KPI highlights."""
    scans = ScanRecord.objects.all()
    metrics = generate_summary_metrics(scans)
    recent_scans = scans[:5]
    recent_alerts = Alert.objects.all()[:4]

    context = {
        "metrics": metrics,
        "recent_scans": recent_scans,
        "recent_alerts": recent_alerts,
        "active_tab": "home",
    }
    return render(request, "home.html", context)


def scan_view(request):
    """Website URL Scanner page with detailed results and explanations."""
    result = None
    url = ""
    error = None

    if request.method == "POST":
        url = request.POST.get("url", "").strip()
        if not url:
            error = "Please enter a valid website URL."
        elif not url.lower().startswith(("http://", "https://")):
            url = "http://" + url

        if not error:
            result = predict(url)
            # Save every scan to database
            try:
                record = ScanRecord.objects.create(
                    url=result["url"],
                    prediction=result["prediction"],
                    risk_score=result["risk_score"],
                    features=result["features"],
                    reasons=result["reasons"],
                    domain_info=result.get("domain_info", {}),
                )
                for alert_data in result.get("alerts", []):
                    Alert.objects.create(
                        scan_record=record,
                        url=result["url"],
                        severity=alert_data.get("severity", "high"),
                        title=alert_data.get("title", "Security Alert"),
                        message=alert_data.get("message", ""),
                        recommendations=alert_data.get("recommendations", []),
                    )
            except Exception as exc:
                print(f"[ScanView] DB save error: {exc}")

    context = {
        "result": result,
        "url": url,
        "error": error,
        "active_tab": "scan",
    }
    return render(request, "scan.html", context)


def transaction_view(request):
    """Online Transaction Fraud Detection page with rule-based evaluation."""
    result = None
    form_data = {}

    if request.method == "POST":
        form_data = {
            "transaction_id": request.POST.get("transaction_id", "").strip(),
            "amount": request.POST.get("amount", "0"),
            "payment_method": request.POST.get("payment_method", "Credit Card"),
            "merchant_name": request.POST.get("merchant_name", "").strip(),
            "merchant_category": request.POST.get("merchant_category", "E-Commerce"),
            "card_country": request.POST.get("card_country", "").strip().upper(),
            "billing_country": request.POST.get("billing_country", "").strip().upper(),
            "is_first_time_merchant": "is_first_time_merchant" in request.POST,
            "is_device_new": "is_device_new" in request.POST,
        }
        result = evaluate_transaction(form_data)

        # Save to database
        try:
            TransactionCheck.objects.create(
                transaction_id=result["transaction_id"],
                amount=result["amount"],
                payment_method=result["payment_method"],
                merchant_name=result["merchant_name"],
                merchant_category=result["merchant_category"],
                card_country=form_data["card_country"],
                billing_country=form_data["billing_country"],
                is_first_time_merchant=form_data["is_first_time_merchant"],
                is_device_new=form_data["is_device_new"],
                risk_score=result["risk_score"],
                risk_level=result["risk_level"],
                triggered_rules=result["triggered_rules"],
            )
        except Exception as exc:
            print(f"[TransactionView] DB save error: {exc}")

    context = {
        "result": result,
        "form_data": form_data,
        "active_tab": "transaction",
    }
    return render(request, "transaction.html", context)


def dashboard_view(request):
    """Analytics dashboard presenting KPIs, distributions, and recent alerts."""
    scans = ScanRecord.objects.all()
    metrics = generate_summary_metrics(scans)
    transactions = TransactionCheck.objects.all()
    alerts = Alert.objects.all()

    context = {
        "metrics": metrics,
        "total_transactions": transactions.count(),
        "total_alerts": alerts.count(),
        "recent_scans": scans[:8],
        "recent_alerts": alerts[:5],
        "recent_transactions": transactions[:5],
        "active_tab": "dashboard",
    }
    return render(request, "dashboard.html", context)


def history_view(request):
    """Scan history page with search and filtering."""
    query = request.GET.get("q", "").strip()
    classification = request.GET.get("class", "").strip()

    scans = ScanRecord.objects.all()
    if query:
        scans = scans.filter(url__icontains=query)
    if classification:
        scans = scans.filter(prediction__iexact=classification)

    context = {
        "scans": scans[:150],  # Show up to 150 recent
        "query": query,
        "classification": classification,
        "total_count": scans.count(),
        "active_tab": "history",
    }
    return render(request, "history.html", context)


def alerts_view(request):
    """Dedicated security alerts page."""
    severity = request.GET.get("severity", "").strip()
    alerts = Alert.objects.all()

    if severity:
        alerts = alerts.filter(severity__iexact=severity)

    context = {
        "alerts": alerts[:100],
        "severity": severity,
        "total_alerts": alerts.count(),
        "active_tab": "alerts",
    }
    return render(request, "alerts.html", context)


def reports_view(request):
    """Reports page with summary analytics and export triggers."""
    scans = ScanRecord.objects.all()
    transactions = TransactionCheck.objects.all()
    metrics = generate_summary_metrics(scans)

    context = {
        "metrics": metrics,
        "total_transactions": transactions.count(),
        "active_tab": "reports",
    }
    return render(request, "reports.html", context)


def export_csv_view(request):
    """Download CSV file of all scan records."""
    scans = ScanRecord.objects.all()
    csv_data = generate_csv_report_data(scans)
    response = HttpResponse(csv_data, content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="fake_website_detection_report.csv"'
    return response


def printable_report_view(request):
    """Printable forensic / academic review report."""
    scans = ScanRecord.objects.all()
    transactions = TransactionCheck.objects.all()
    context = prepare_printable_report_context(scans, transactions)
    return render(request, "printable_report.html", context)
