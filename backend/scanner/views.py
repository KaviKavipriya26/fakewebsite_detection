from rest_framework.decorators import api_view
from rest_framework.response import Response

from .model import predict


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


@api_view(["POST"])
def scan(request):
    url = str(request.data.get("url", "")).strip()
    if not url:
        return Response({"error": "url is required"}, status=400)
    if not url.lower().startswith(("http://", "https://")):
        return Response({"error": "url must start with http:// or https://"}, status=400)
    return Response(predict(url))
