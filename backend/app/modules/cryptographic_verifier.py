import re
import cv2
import numpy as np
from typing import Dict, Any, Tuple, Optional, List
from ..schemas import Finding, BoundingBox

class ChecksumValidator:
    """Verhoeff check digit validation for identity and financial transaction strings."""

    _verhoeff_d = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
        [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
        [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
        [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
        [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    ]

    _verhoeff_p = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
        [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
        [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
        [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
        [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
        [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
        [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
    ]

    @classmethod
    def validate_verhoeff(cls, number_str: str) -> bool:
        clean_num = re.sub(r"\D", "", number_str)
        if not clean_num:
            return False

        c = 0
        reversed_digits = [int(d) for d in reversed(clean_num)]
        for i, digit in enumerate(reversed_digits):
            c = cls._verhoeff_d[c][cls._verhoeff_p[i % 8][digit]]
        return c == 0


class DocumentVerificationEngine:
    """Extracts barcodes/QR codes, verifies check digits, and cross-references against OCR text."""

    def __init__(self):
        self.checksum = ChecksumValidator()
        self.qr_detector = cv2.QRCodeDetector()

    def decode_codes(self, image_bgr: np.ndarray) -> Dict[str, Any]:
        """Detects QR codes and barcodes using OpenCV / pyzbar."""
        # 1. Try OpenCV QRCodeDetector
        try:
            val, points, _ = self.qr_detector.detectAndDecode(image_bgr)
            if val and len(val.strip()) > 0:
                rect = {"x": 0, "y": 0, "w": 50, "h": 50}
                if points is not None and len(points) > 0:
                    pts = points[0]
                    x_min, y_min = np.min(pts, axis=0)
                    x_max, y_max = np.max(pts, axis=0)
                    rect = {"x": int(x_min), "y": int(y_min), "w": int(x_max - x_min), "h": int(y_max - y_min)}
                return {
                    "code_present": True,
                    "type": "QR_CODE",
                    "data": val,
                    "rect": rect
                }
        except Exception:
            pass

        # 2. Try pyzbar if installed
        try:
            from pyzbar.pyzbar import decode as decode_barcode
            decoded = decode_barcode(image_bgr)
            if decoded:
                first_obj = decoded[0]
                raw_data = first_obj.data.decode("utf-8", errors="ignore")
                return {
                    "code_present": True,
                    "type": str(first_obj.type),
                    "data": raw_data,
                    "rect": {
                        "x": first_obj.rect.left,
                        "y": first_obj.rect.top,
                        "w": first_obj.rect.width,
                        "h": first_obj.rect.height
                    }
                }
        except Exception:
            pass

        return {"code_present": False, "data": None, "type": None, "rect": None}

    def verify_document(
        self,
        image_bgr: np.ndarray,
        extracted_id_candidate: Optional[str] = None
    ) -> Tuple[List[Finding], Dict[str, Any]]:
        findings: List[Finding] = []
        code_info = self.decode_codes(image_bgr)
        h, w = image_bgr.shape[:2]

        if extracted_id_candidate:
            clean_digits = re.sub(r"\D", "", extracted_id_candidate)
            
            # Verhoeff check for 12-digit IDs
            if len(clean_digits) == 12:
                if not self.checksum.validate_verhoeff(clean_digits):
                    findings.append(Finding(
                        id="finding-chk-verhoeff",
                        layer_type="math",
                        severity="Critical",
                        title="Verhoeff Checksum Failure",
                        description=f"Candidate document ID/number '{extracted_id_candidate}' failed the standard Verhoeff cryptographic checksum validation.",
                        confidence=0.98,
                        expected_value="Valid Verhoeff Check Digit",
                        found_value="Invalid Checksum",
                        bounding_boxes=[]
                    ))

            # Cross-reference with QR / Barcode
            if code_info["code_present"] and code_info.get("data"):
                barcode_data = str(code_info["data"])
                last_four = clean_digits[-4:] if len(clean_digits) >= 4 else clean_digits
                if last_four and (last_four not in barcode_data):
                    bx = code_info["rect"]
                    boxes = []
                    if bx and w > 0 and h > 0:
                        boxes.append(BoundingBox(
                            id="box-barcode-mismatch",
                            x=round((bx["x"] / w) * 100, 2),
                            y=round((bx["y"] / h) * 100, 2),
                            width=round((bx["w"] / w) * 100, 2),
                            height=round((bx["h"] / h) * 100, 2),
                            label="Barcode Mismatch",
                            layer_type="cross_reference",
                            color="#3B82F6",
                            target_finding_id="finding-barcode-mismatch"
                        ))

                    findings.append(Finding(
                        id="finding-barcode-mismatch",
                        layer_type="cross_reference",
                        severity="Critical",
                        title="Barcode vs OCR Cross-Mismatch",
                        description=f"Printed candidate number '{extracted_id_candidate}' does not match the cryptographically embedded barcode/QR data payload.",
                        confidence=0.95,
                        bounding_boxes=boxes,
                        details={"barcode_type": code_info.get("type"), "barcode_payload": barcode_data}
                    ))

        telemetry = {
            "code_detected": code_info["code_present"],
            "code_type": code_info.get("type"),
            "code_data_snippet": str(code_info.get("data"))[:50] if code_info.get("data") else None
        }

        return findings, telemetry
