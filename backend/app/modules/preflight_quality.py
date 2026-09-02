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
        self, image_bgr: np.ndarray, gray: np.ndarray
    ) -> Tuple[np.ndarray, float]:
        """Detects document rotation skew angle via minimum bounding rect and deskews using affine warp."""
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        coords = np.column_stack(np.where(thresh > 0))

        if coords.size == 0:
            return image_bgr, 0.0

        rect = cv2.minAreaRect(coords)
        angle = rect[-1]

        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        else:
            angle = -angle

        if abs(angle) < 0.2:
            return image_bgr, 0.0

        h, w = image_bgr.shape[:2]
        center = (w // 2, h // 2)
        rot_mat = cv2.getRotationMatrix2D(center, angle, 1.0)
        deskewed = cv2.warpAffine(
            image_bgr, rot_mat, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(255, 255, 255)
        )
        return deskewed, round(angle, 2)

    def process(self, image_bgr: np.ndarray, is_digital_pdf: bool = False) -> Dict[str, Any]:
        """Runs pre-flight quality checks and returns normalized image and telemetry."""
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        blur_res = self.check_blur(gray)
        glare_res = self.check_glare(gray, is_digital_pdf=is_digital_pdf)
        deskewed, angle = self.detect_and_correct_skew(image_bgr, gray)

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
