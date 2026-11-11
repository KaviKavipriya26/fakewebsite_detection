from django.db import models


class ScanRecord(models.Model):
    """Stores every website scan record with URL, risk score, classification, and extracted features."""
    url = models.CharField(max_length=2048)
    prediction = models.CharField(max_length=64)  # "Legitimate", "Suspicious", "Fraudulent"
    risk_score = models.IntegerField()  # 0 to 100
    features = models.JSONField(default=dict, blank=True)
    reasons = models.JSONField(default=list, blank=True)
    domain_info = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"ScanRecord({self.url} -> {self.prediction} [{self.risk_score}%])"


class Alert(models.Model):
    """Stores automated security alerts triggered by suspicious or fraudulent websites."""
    scan_record = models.ForeignKey(
        ScanRecord, on_delete=models.CASCADE, null=True, blank=True, related_name="alerts"
    )
    url = models.CharField(max_length=2048)
    severity = models.CharField(
        max_length=20,
        choices=[
            ("high", "High"),
            ("medium", "Medium"),
            ("low", "Low"),
            ("info", "Info"),
        ],
        default="high",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    recommendations = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Alert([{self.severity.upper()}] {self.title} - {self.url})"


class TransactionCheck(models.Model):
    """Stores online transaction fraud checks evaluated via rule-based heuristics."""
    transaction_id = models.CharField(max_length=64, unique=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=64)
    merchant_name = models.CharField(max_length=255, blank=True, default="")
    merchant_category = models.CharField(max_length=128)
    user_ip = models.CharField(max_length=64, blank=True, default="")
    card_country = models.CharField(max_length=64, blank=True, default="")
    billing_country = models.CharField(max_length=64, blank=True, default="")
    is_first_time_merchant = models.BooleanField(default=False)
    is_device_new = models.BooleanField(default=False)
    risk_score = models.IntegerField()  # 0 to 100
    risk_level = models.CharField(max_length=32)  # "Low Risk", "Medium Risk", "High Risk"
    triggered_rules = models.JSONField(default=list, blank=True)
    notes = models.TextField(
        blank=True,
        default="Rule-based heuristic evaluation (College Project Prototype - No Transaction Dataset)",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"TransactionCheck({self.transaction_id} -> {self.risk_level} [{self.risk_score}%])"
