from django.urls import include, path
from django.views.generic.base import RedirectView
from scanner import views

urlpatterns = [
    # Favicon route directly at root
    path("favicon.ico", RedirectView.as_view(url="/static/favicon.png", permanent=False)),

    # REST API endpoints (backward compatible with legacy_react_frontend & external tools)
    path("api/", include("scanner.urls")),

    # Python (Django) Template Frontend Pages (College Review Specification)
    path("", views.home_view, name="home"),
    path("scan/", views.scan_view, name="scan"),
    path("transaction/", views.transaction_view, name="transaction"),
    path("dashboard/", views.dashboard_view, name="dashboard"),
    path("history/", views.history_view, name="history"),
    path("alerts/", views.alerts_view, name="alerts"),
    path("reports/", views.reports_view, name="reports"),
    path("reports/export-csv/", views.export_csv_view, name="export_csv"),
    path("reports/printable/", views.printable_report_view, name="printable_report"),
]
