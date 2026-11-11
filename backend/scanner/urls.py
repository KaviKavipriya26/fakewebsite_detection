from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health, name="api_health"),
    path("scan/", views.scan, name="api_scan"),
]
