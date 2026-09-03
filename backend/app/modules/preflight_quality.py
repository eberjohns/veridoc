import cv2
import numpy as np
from typing import Dict, Any, Tuple

class PreflightQualityChecker:
    """Evaluates document capture quality (blur, glare) and normalizes skew/orientation."""

    def __init__(
        self,
        blur_threshold: float = 100.0,
        glare_threshold_pct: float = 2.0,
        glare_intensity_cutoff: int = 250,
    ):
        self.blur_threshold = blur_threshold
        self.glare_threshold_pct = glare_threshold_pct
        self.glare_intensity_cutoff = glare_intensity_cutoff

    def check_blur(self, gray: np.ndarray) -> Dict[str, Any]:
        """Measures high-frequency Laplacian variance to detect out-of-focus or motion blur."""
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = float(laplacian.var())
        return {
            "blur_score": round(variance, 2),
            "is_blurry": variance < self.blur_threshold,
        }

    def check_glare(self, gray: np.ndarray, is_digital_pdf: bool = False) -> Dict[str, Any]:
        """Measures percentage of over-saturated hotspot pixels (camera flash/glare)."""
        if is_digital_pdf:
            return {
                "glare_percentage": 0.0,
                "has_excessive_glare": False,
                "note": "Skipped for digital PDF raster"
            }

        total_pixels = gray.shape[0] * gray.shape[1]
        glare_mask = gray >= self.glare_intensity_cutoff
        glare_count = np.sum(glare_mask)
        glare_pct = float((glare_count / total_pixels) * 100.0)

        return {
            "glare_percentage": round(glare_pct, 2),
            "has_excessive_glare": glare_pct > self.glare_threshold_pct,
        }

    def detect_and_correct_skew(
        self, image_bgr: np.ndarray, gray: np.ndarray, is_digital_pdf: bool = False
    ) -> Tuple[np.ndarray, float]:
        """
        Detects document rotation skew angle for scanned photos and deskews using affine warp.
        Digital PDFs are already vector-rasterized and 100% upright.
        """
        if is_digital_pdf:
            return image_bgr, 0.0

        try:
            # Use Hough lines on edge image for stable orientation detection
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 100, minLineLength=image_bgr.shape[1] // 4, maxLineGap=20)
            
            angles = []
            if lines is not None:
                for line in lines:
                    x1, y1, x2, y2 = line[0]
                    dx = x2 - x1
                    dy = y2 - y1
                    if abs(dx) > 1e-4:
                        angle_deg = np.degrees(np.arctan2(dy, dx))
                        if -45 < angle_deg < 45:
                            angles.append(angle_deg)
            
            if not angles:
                return image_bgr, 0.0

            median_angle = float(np.median(angles))
            # Ignore sub-degree or minor noise angles
            if abs(median_angle) < 1.5 or abs(median_angle) > 30:
                return image_bgr, 0.0

            h, w = image_bgr.shape[:2]
            center = (w // 2, h // 2)
            rot_mat = cv2.getRotationMatrix2D(center, median_angle, 1.0)
            deskewed = cv2.warpAffine(
                image_bgr, rot_mat, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_CONSTANT,
                borderValue=(255, 255, 255)
            )
            return deskewed, round(median_angle, 2)
        except Exception:
            return image_bgr, 0.0

    def process(self, image_bgr: np.ndarray, is_digital_pdf: bool = False) -> Dict[str, Any]:
        """Runs pre-flight quality checks and returns normalized image and telemetry."""
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        blur_res = self.check_blur(gray)
        glare_res = self.check_glare(gray, is_digital_pdf=is_digital_pdf)
        deskewed, angle = self.detect_and_correct_skew(image_bgr, gray, is_digital_pdf=is_digital_pdf)

        gate_passed = (not blur_res["is_blurry"]) and (not glare_res["has_excessive_glare"])
        return {
            "gate_passed": gate_passed,
            "metrics": {
                **blur_res,
                **glare_res,
                "skew_angle_corrected": angle,
            },
            "processed_image": deskewed,
        }
