/**
 * SAMPLE DATA — for UI previews only. Never mixed with real scan results.
 * Shown only when "Show sample data" is enabled in Settings, always labelled.
 */
import type { ScanResult } from "./types";

const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

export const SAMPLE_SCANS: ScanResult[] = [
  { id: "s1", url: "https://example.com", scannedAt: day(0), prediction: "legitimate", riskScore: 8, isSample: true,
    features: { https: true, url_length: 19, special_chars: 0, domain_age_days: 9000, redirects: 0, suspicious_keywords: 0 },
    reasons: ["Uses HTTPS", "Well-established domain"] },
  { id: "s2", url: "http://secure-login-paypa1.example-verify.net/account", scannedAt: day(1), prediction: "high_risk", riskScore: 92, isSample: true,
    features: { https: false, url_length: 52, special_chars: 6, domain_age_days: 3, redirects: 2, suspicious_keywords: 3 },
    reasons: ["No HTTPS", "Brand look-alike domain", "Keywords: secure, login, verify", "Newly registered domain"] },
  { id: "s3", url: "https://bit-deals-offer.shop/win?id=8823", scannedAt: day(2), prediction: "suspicious", riskScore: 61, isSample: true,
    features: { https: true, url_length: 40, special_chars: 4, domain_age_days: 40, redirects: 1, suspicious_keywords: 1 },
    reasons: ["Keyword: win", "Young domain", "Contains query parameters"] },
  { id: "s4", url: "https://wikipedia.org", scannedAt: day(3), prediction: "legitimate", riskScore: 4, isSample: true,
    features: { https: true, url_length: 21, special_chars: 0, domain_age_days: 9500, redirects: 0, suspicious_keywords: 0 },
    reasons: ["Uses HTTPS", "Well-established domain"] },
  { id: "s5", url: "http://192.168.10.4/bank/update", scannedAt: day(5), prediction: "high_risk", riskScore: 88, isSample: true,
    features: { https: false, url_length: 31, special_chars: 5, has_ip_address: true, redirects: 0, suspicious_keywords: 2 },
    reasons: ["IP address used instead of domain", "Keywords: bank, update"] },
];
