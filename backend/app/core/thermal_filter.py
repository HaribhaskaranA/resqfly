"""
RESQFLY Thermal & Optical Post-Processing Filter
Strict rejection of false positive hallucinations, sun glint, water ripples, and hot rooftops.
"""
from typing import List, Tuple, Dict, Any, Optional
import cv2
import numpy as np

# Operational Thresholds
CONFIDENCE_THRESHOLD = 0.70
IOU_THRESHOLD = 0.25
HUMAN_CLASSES = {"person"}
MAX_DETECTIONS = 15


def extract_true_heat_signatures(flir_frame: np.ndarray) -> List[Dict[str, Any]]:
    """
    Extracts true heat signatures (Peak body and motor heat) from FLIR pseudo-color frames (Ironbow / Rainbow).
    Isolates Bright Yellow & High-Heat Orange and Hot Red while completely excluding Green roofs and Blue water.
    Captures rescue raft, boat motors, and swimmers floating in water corridors.
    """
    if flir_frame is None or flir_frame.size == 0:
        return []

    # Handle grayscale or single-channel inputs
    if len(flir_frame.shape) == 2 or (len(flir_frame.shape) == 3 and flir_frame.shape[2] == 1):
        flir_frame = cv2.cvtColor(flir_frame, cv2.COLOR_GRAY2BGR)

    h_img, w_img = flir_frame.shape[:2]

    is_monochrome = (
        len(flir_frame.shape) == 2 or
        (len(flir_frame.shape) == 3 and np.max(np.abs(flir_frame[:, :, 0].astype(int) - flir_frame[:, :, 1].astype(int))) < 15)
    )

    if is_monochrome:
        gray = flir_frame if len(flir_frame.shape) == 2 else flir_frame[:, :, 0]
        bg_mean = cv2.blur(gray, (21, 21))
        local_diff = cv2.subtract(gray, bg_mean)
        clean_mask = cv2.inRange(local_diff, 15, 120)
    else:
        # Convert FLIR image to HSV for precise thermal color isolation
        hsv = cv2.cvtColor(flir_frame, cv2.COLOR_BGR2HSV)

        # 1. Mask for Bright Yellow & High-Heat Orange (Peak body / motor heat)
        # Hue: 15 to 35 (Yellow-Orange), High Saturation, High Value (Brightness)
        lower_yellow = np.array([15, 140, 160])
        upper_yellow = np.array([35, 255, 255])
        mask_yellow = cv2.inRange(hsv, lower_yellow, upper_yellow)

        # 2. Mask for Hot Red
        lower_red1 = np.array([0, 140, 150])
        upper_red1 = np.array([14, 255, 255])
        lower_red2 = np.array([170, 140, 150])
        upper_red2 = np.array([180, 255, 255])
        mask_red = cv2.inRange(hsv, lower_red1, upper_red1) | cv2.inRange(hsv, lower_red2, upper_red2)

        # Combined true heat mask (Excludes Green roofs and Blue water)
        heat_mask = cv2.bitwise_or(mask_yellow, mask_red)

        # Morphological clean up to remove single-pixel artifacts
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        clean_mask = cv2.morphologyEx(heat_mask, cv2.MORPH_OPEN, kernel)
        clean_mask = cv2.dilate(clean_mask, kernel, iterations=1)

    # Find contours of true hotspots
    contours, _ = cv2.findContours(clean_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    detected_boxes = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        orig_x, orig_y, orig_w, orig_h = cv2.boundingRect(cnt)

        # Minimum size clamp: Discard boxes smaller than 12x12 pixels (eliminates isolated wire pole and foliage noise)
        if orig_w < 12 or orig_h < 12 or (orig_w * orig_h) < 144:
            continue

        pad = 2
        x1 = max(0, orig_x - pad)
        y1 = max(0, orig_y - pad)
        x2 = min(w_img, orig_x + orig_w + pad)
        y2 = min(h_img, orig_y + orig_h + pad)
        bw = x2 - x1
        bh = y2 - y1
        box_area = bw * bh

        # Reject tall vertical wire / telephone poles
        if bw < 16 and (float(bh) / float(max(1, bw))) > 2.2:
            continue

        # 1. Helicopter / Aircraft Engine Heat Exclusion
        # If detected hot cluster matches aircraft proportions (horizontal rotor/tail boom width > 2.2 * height
        # or bounding area > 5000 px):
        is_aircraft = (bw > 2.2 * bh and box_area > 1200) or (box_area > 5000) or (area > 5000)

        # 2. Rescue Boat / Raft vs Stranded Victim Classification
        crop = flir_frame[y1:y2, x1:x2]
        is_yellow = False
        if crop.size > 0 and len(crop.shape) == 3:
            crop_hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
            ym = cv2.inRange(crop_hsv, np.array([15, 140, 160]), np.array([35, 255, 255]))
            if np.sum(ym > 0) >= 10:
                is_yellow = True

        # Reject broad flat roof slabs / sun glint if not a rescue boat or aircraft
        if not is_yellow and not is_aircraft and (float(bw) / float(max(1, bh))) > 2.0 and box_area > 1200:
            continue

        if is_aircraft:
            label = "FRIENDLY ASSET: RESCUE HELI (AIR-01)"
            is_human = False
            conf = 0.98
        elif is_yellow:
            label = "RESCUE BOAT / RAFT"
            is_human = False
            conf = 0.95
        else:
            label = "STRANDED VICTIM (FLOOD CORRIDOR)"
            is_human = True
            conf = 0.94

        # Discard extreme background artifacts exceeding 20% of the entire frame
        if box_area > (w_img * h_img * 0.20):
            continue

        detected_boxes.append({
            "box": [x1, y1, x2, y2],
            "label": label,
            "confidence": conf,
            "is_aircraft": is_aircraft,
            "is_human": is_human
        })

    return detected_boxes


def apply_aggressive_nms(
    boxes: List[List[int]],
    confs: List[float],
    conf_thresh: float = CONFIDENCE_THRESHOLD,
    iou_thresh: float = IOU_THRESHOLD
) -> List[int]:
    """
    Applies aggressive Non-Maximum Suppression (IOU 0.35, Conf 0.65)
    to collapse duplicate, stacked, and overlapping candidate boxes.
    """
    if not boxes or not confs:
        return []

    cv_boxes = [[int(b[0]), int(b[1]), max(1, int(b[2] - b[0])), max(1, int(b[3] - b[1]))] for b in boxes]
    indices = cv2.dnn.NMSBoxes(cv_boxes, confs, score_threshold=conf_thresh, nms_threshold=iou_thresh)
    if len(indices) == 0:
        return []
    return list(indices.flatten())


def is_geometrically_plausible(
    x1: int, y1: int, x2: int, y2: int,
    image_width: int, image_height: int
) -> bool:
    """
    Aspect Ratio & Geometric Plausibility Check (Aerial Drone Scale):
    - Minimum box area: width * height >= 64 pixels (eliminates 2x2px noise).
    - Maximum box area: width * height <= (image_width * image_height * 0.05) (humans cannot occupy 5%+ of panoramic frame).
    - Human aspect ratio clamp: 0.28 <= (width / height) <= 2.20 (strips ultra-wide ripples & ultra-tall poles).
    """
    w = max(0, x2 - x1)
    h = max(0, y2 - y1)
    area = w * h

    if area < 64:
        return False

    max_area = (image_width * image_height) * 0.05
    if area > max_area:
        return False

    aspect = float(w) / float(max(1, h))
    if aspect < 0.28 or aspect > 2.20:
        return False

    return True


def is_inside_building_footprint(
    box: List[int],
    building_footprints: Optional[List[List[int]]] = None
) -> bool:
    """
    Rejects detection if the box is fully contained inside a detected static building footprint.
    """
    if not building_footprints:
        return False
    bx1, by1, bx2, by2 = box
    for fp in building_footprints:
        fx1, fy1, fx2, fy2 = fp
        # Fully contained check with 2px margin
        if bx1 >= fx1 - 2 and by1 >= fy1 - 2 and bx2 <= fx2 + 2 and by2 <= fy2 + 2:
            return True
    return False


def filter_local_thermal_contrast(
    box: List[int],
    thermal_img: np.ndarray,
    min_contrast_celsius: float = 3.5,
    ring_thickness: int = 10,
    building_footprints: Optional[List[List[int]]] = None
) -> bool:
    """
    Local Contrast Thermal Rejection (Kills Hot Rooftops & Solar Gain):
    A human heat signature is a localized Gaussian heat anomaly, NOT a broad rectangular rooftop.
    Samples the immediate 10px boundary ring surrounding the bounding box.
    If mean(box_interior_heat) - mean(box_exterior_surroundings) < 3.5°C, DISCARDS the box.
    Also rejects broad uniform heat masses (tin roofs, brick walls) with near-zero variance
    and boxes fully contained inside static building footprints.
    """
    if is_inside_building_footprint(box, building_footprints):
        return False

    if thermal_img is None or thermal_img.size == 0:
        return True

    h_th, w_th = thermal_img.shape[:2]
    if len(thermal_img.shape) == 3:
        is_mono = np.max(np.abs(thermal_img[:, :, 0].astype(int) - thermal_img[:, :, 1].astype(int))) < 15
        if is_mono:
            gray = thermal_img[:, :, 0]
        else:
            # For Ironbow color palette, red channel reflects temperature strongest
            gray = thermal_img[:, :, 2]
    else:
        gray = thermal_img

    x1, y1, x2, y2 = box
    x1, y1 = max(0, min(w_th - 1, int(x1))), max(0, min(h_th - 1, int(y1)))
    x2, y2 = max(x1 + 1, min(w_th, int(x2))), max(y1 + 1, min(h_th, int(y2)))

    interior = gray[y1:y2, x1:x2]
    if interior.size < 4:
        return False

    mean_interior = float(np.mean(interior))
    std_interior = float(np.std(interior))

    # Broad uniform heat mass rejection:
    # A sun-heated roof or solar panel is large (>35px) and has flat variance (std < 3.0)
    if (x2 - x1) > 35 and (y2 - y1) > 35 and std_interior < 3.0:
        return False

    # Sample immediate 10px boundary ring surrounding the box
    rx1 = max(0, x1 - ring_thickness)
    ry1 = max(0, y1 - ring_thickness)
    rx2 = min(w_th, x2 + ring_thickness)
    ry2 = min(h_th, y2 + ring_thickness)

    outer_region = gray[ry1:ry2, rx1:rx2]
    mask = np.ones(outer_region.shape, dtype=bool)

    in_oy1 = y1 - ry1
    in_oy2 = in_oy1 + (y2 - y1)
    in_ox1 = x1 - rx1
    in_ox2 = in_ox1 + (x2 - x1)
    mask[in_oy1:in_oy2, in_ox1:in_ox2] = False

    ring_pixels = outer_region[mask]
    if ring_pixels.size < 8:
        return True

    mean_surroundings = float(np.mean(ring_pixels))

    # In 8-bit FLIR Lepton normalization (~15°C to 45°C across 256 intensity levels),
    # 1°C = ~4.0 to 6.5 intensity units.
    # 3.5°C delta corresponds to >= 14 intensity units.
    min_intensity_delta = min_contrast_celsius * 4.0
    contrast_delta = mean_interior - mean_surroundings

    if contrast_delta < min_intensity_delta:
        return False

    return True


def filter_water_specular_reflections(
    box: List[int],
    rgb_img: np.ndarray,
    thermal_img: Optional[np.ndarray] = None,
    water_mask: Optional[np.ndarray] = None
) -> bool:
    """
    Water Specular Reflection Rejection (RGB Mode):
    In mud/flood water, sun glint and ripples cause high-frequency luma spikes.
    If thermal variance across the box is near zero and water mask covers the surrounding area
    without an edge silhouette, suppresses the box.
    """
    if rgb_img is None or rgb_img.size == 0:
        return True

    h, w = rgb_img.shape[:2]
    x1, y1, x2, y2 = box
    x1, y1 = max(0, min(w - 1, int(x1))), max(0, min(h - 1, int(y1)))
    x2, y2 = max(x1 + 1, min(w, int(x2))), max(y1 + 1, min(h, int(y2)))

    crop_rgb = rgb_img[y1:y2, x1:x2]
    if crop_rgb.size == 0:
        return False

    # Check against thermal feed if available
    if thermal_img is not None and thermal_img.size > 0:
        th_h, th_w = thermal_img.shape[:2]
        tx1 = int(x1 * (th_w / float(w)))
        ty1 = int(y1 * (th_h / float(h)))
        tx2 = int(x2 * (th_w / float(w)))
        ty2 = int(y2 * (th_h / float(h)))
        th_crop = thermal_img[ty1:ty2, tx1:tx2]
        if th_crop.size > 0:
            th_mean = float(np.mean(th_crop))
            th_std = float(np.std(th_crop))
            # Water reflections have cold background heat (< 130) and no human thermal anomaly
            if th_mean < 135 or th_std < 2.5:
                return False

    # If water mask is supplied or detectable
    if water_mask is not None and water_mask.shape[:2] == (h, w):
        crop_water = water_mask[y1:y2, x1:x2]
        if crop_water.size > 0:
            water_ratio = np.count_nonzero(crop_water) / float(crop_water.size)
            if water_ratio > 0.85 and thermal_img is None:
                # Pure water without confirmed thermal body
                gray_crop = cv2.cvtColor(crop_rgb, cv2.COLOR_BGR2GRAY)
                edges = cv2.Canny(gray_crop, 50, 150)
                if np.count_nonzero(edges) < 10:
                    return False

    return True


def apply_strict_aerial_filters(
    boxes: List[List[int]],
    confs: List[float],
    image_shape: Tuple[int, ...],
    thermal_img: Optional[np.ndarray] = None,
    rgb_img: Optional[np.ndarray] = None,
    water_mask: Optional[np.ndarray] = None,
    building_footprints: Optional[List[List[int]]] = None,
    min_conf: float = CONFIDENCE_THRESHOLD,
    max_iou: float = IOU_THRESHOLD,
    max_det: int = MAX_DETECTIONS
) -> Tuple[List[List[int]], List[float]]:
    """
    Orchestrates end-to-end post-processing pipeline:
    1. Rejects confidence < 0.70
    2. Aggressive NMS (IoU 0.25)
    3. Geometric Plausibility & Altitude Aspect Ratio
    4. Local Contrast Thermal Rejection (kills hot roofs)
    5. Building Footprint Rejection
    6. Water Specular Glint & Ripple Rejection
    7. Caps maximum detections to max_det (default 15)
    """
    if not boxes:
        return [], []

    h, w = image_shape[:2]

    # Step 1: Pre-filter by confidence & basic geometry
    filtered_boxes = []
    filtered_confs = []

    for b, c in zip(boxes, confs):
        if c < min_conf:
            continue
        if not is_geometrically_plausible(b[0], b[1], b[2], b[3], w, h):
            continue
        if is_inside_building_footprint(b, building_footprints):
            continue
        filtered_boxes.append(b)
        filtered_confs.append(c)

    if not filtered_boxes:
        return [], []

    # Step 2: Aggressive NMS to collapse stacked/duplicate boxes
    nms_indices = apply_aggressive_nms(filtered_boxes, filtered_confs, conf_thresh=min_conf, iou_thresh=max_iou)
    nms_boxes = [filtered_boxes[i] for i in nms_indices]
    nms_confs = [filtered_confs[i] for i in nms_indices]

    # Step 3: Local Thermal Contrast & Water Reflection Verification
    final_boxes = []
    final_confs = []

    for b, c in zip(nms_boxes, nms_confs):
        # Thermal contrast check
        if thermal_img is not None:
            if not filter_local_thermal_contrast(
                b, thermal_img, min_contrast_celsius=3.5, ring_thickness=10, building_footprints=building_footprints
            ):
                continue

        # Water reflection check
        if rgb_img is not None:
            if not filter_water_specular_reflections(b, rgb_img, thermal_img=thermal_img, water_mask=water_mask):
                continue

        final_boxes.append(b)
        final_confs.append(c)

    return final_boxes[:max_det], final_confs[:max_det]


def compute_box_iou(boxA: List[int], boxB: List[int]) -> float:
    """
    Computes Intersection over Union (IoU) between two bounding boxes:
    box = [x1, y1, x2, y2].
    """
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    inter_width = max(0, xB - xA)
    inter_height = max(0, yB - yA)
    inter_area = inter_width * inter_height

    boxA_area = max(0, boxA[2] - boxA[0]) * max(0, boxA[3] - boxA[1])
    boxB_area = max(0, boxB[2] - boxB[0]) * max(0, boxB[3] - boxB[1])

    union_area = float(boxA_area + boxB_area - inter_area)
    if union_area <= 0:
        return 0.0

    return inter_area / union_area


def warp_coordinates(
    box: List[int],
    H: Optional[np.ndarray] = None,
    src_shape: Optional[Tuple[int, ...]] = None,
    dst_shape: Optional[Tuple[int, ...]] = None
) -> List[int]:
    """
    Transforms bounding box coordinates from thermal sensor domain to optical RGB domain:
    - If homography matrix H (3x3) is provided, performs spatial perspective warp on bounding box corners.
    - Otherwise applies proportional geospatial viewport scaling from src_shape to dst_shape.
    """
    x1, y1, x2, y2 = box

    # 1. Spatial Homography Transformation
    if H is not None:
        try:
            pts = np.array([
                [[x1, y1]],
                [[x2, y1]],
                [[x2, y2]],
                [[x1, y2]]
            ], dtype=np.float32)
            warped = cv2.perspectiveTransform(pts, H)
            wx1 = int(round(np.min(warped[:, 0, 0])))
            wy1 = int(round(np.min(warped[:, 0, 1])))
            wx2 = int(round(np.max(warped[:, 0, 0])))
            wy2 = int(round(np.max(warped[:, 0, 1])))
            if dst_shape:
                h_dst, w_dst = dst_shape[:2]
                wx1 = max(0, min(w_dst - 1, wx1))
                wy1 = max(0, min(h_dst - 1, wy1))
                wx2 = max(wx1 + 4, min(w_dst, wx2))
                wy2 = max(wy1 + 4, min(h_dst, wy2))
            return [wx1, wy1, wx2, wy2]
        except Exception:
            pass

    # 2. Viewport / Resolution Geospatial Scaling
    if src_shape and dst_shape:
        h_src, w_src = src_shape[:2]
        h_dst, w_dst = dst_shape[:2]
        if h_src > 0 and w_src > 0:
            scale_x = float(w_dst) / float(w_src)
            scale_y = float(h_dst) / float(h_src)
            rx1 = max(0, min(w_dst - 1, int(round(x1 * scale_x))))
            ry1 = max(0, min(h_dst - 1, int(round(y1 * scale_y))))
            rx2 = max(rx1 + 4, min(w_dst, int(round(x2 * scale_x))))
            ry2 = max(ry1 + 4, min(h_dst, int(round(y2 * scale_y))))
            return [rx1, ry1, rx2, ry2]

    return [x1, y1, x2, y2]


def extract_dual_band_thermal_candidates(
    flir_frame: np.ndarray,
    building_footprints: Optional[List[List[int]]] = None
) -> List[Dict[str, Any]]:
    """
    Extracts high-confidence human candidate thermal anomalies for dual-band verification:
    1. Segments true human core temperatures (bright yellow/orange/white highlights where R > 210, G > 130).
    2. Rejects massive uniform thermal blocks (roofs, aircraft turbine plumes) using an area and
       aspect-ratio clamp (0.35 <= width/height <= 2.4).
    3. Computes local thermal contrast score for candidate weighting.
    """
    if flir_frame is None or flir_frame.size == 0:
        return []

    # Handle grayscale / single-channel inputs
    if len(flir_frame.shape) == 2 or (len(flir_frame.shape) == 3 and flir_frame.shape[2] == 1):
        flir_frame = cv2.cvtColor(flir_frame, cv2.COLOR_GRAY2BGR)

    h_img, w_img = flir_frame.shape[:2]
    frame_area = w_img * h_img

    is_monochrome = (
        len(flir_frame.shape) == 2 or
        (len(flir_frame.shape) == 3 and np.max(np.abs(flir_frame[:, :, 0].astype(int) - flir_frame[:, :, 1].astype(int))) < 15)
    )

    if is_monochrome:
        gray = flir_frame if len(flir_frame.shape) == 2 else flir_frame[:, :, 0]
        bg_mean = cv2.blur(gray, (25, 25))
        local_diff = cv2.subtract(gray, bg_mean)
        heat_mask = cv2.inRange(local_diff, 18, 140)
    else:
        # RGB condition: R > 210, G > 130 (Bright Yellow / Orange / White core body heat)
        # Note: in OpenCV default BGR, index 2 is Red, index 1 is Green
        b_ch, g_ch, r_ch = cv2.split(flir_frame)
        mask_rgb_core = ((r_ch > 210) & (g_ch > 130)).astype(np.uint8) * 255

        # HSV Yellow/Orange & Hot Red masks
        hsv = cv2.cvtColor(flir_frame, cv2.COLOR_BGR2HSV)
        mask_yellow = cv2.inRange(hsv, np.array([15, 140, 160]), np.array([35, 255, 255]))
        mask_red1 = cv2.inRange(hsv, np.array([0, 140, 150]), np.array([14, 255, 255]))
        mask_red2 = cv2.inRange(hsv, np.array([170, 140, 150]), np.array([180, 255, 255]))
        mask_red = cv2.bitwise_or(mask_red1, mask_red2)

        # White-hot saturation mask (plumes, motors, saturated human centers)
        mask_white = cv2.inRange(flir_frame, np.array([230, 230, 230]), np.array([255, 255, 255]))

        heat_mask = cv2.bitwise_or(mask_rgb_core, cv2.bitwise_or(mask_yellow, cv2.bitwise_or(mask_red, mask_white)))

    # Morphological refinement
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    clean_mask = cv2.morphologyEx(heat_mask, cv2.MORPH_OPEN, kernel)
    clean_mask = cv2.dilate(clean_mask, kernel, iterations=1)

    contours, _ = cv2.findContours(clean_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    candidates = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        orig_x, orig_y, orig_w, orig_h = cv2.boundingRect(cnt)

        # Minimum size check: discard sub-pixel noise < 48 px
        box_area = orig_w * orig_h
        if box_area < 48 or orig_w < 6 or orig_h < 6:
            continue

        pad = 2
        x1 = max(0, orig_x - pad)
        y1 = max(0, orig_y - pad)
        x2 = min(w_img, orig_x + orig_w + pad)
        y2 = min(h_img, orig_y + orig_h + pad)
        bw = max(1, x2 - x1)
        bh = max(1, y2 - y1)
        b_area = bw * bh

        # Check aspect ratio clamp: 0.35 <= width / height <= 2.40
        aspect_ratio = float(bw) / float(bh)
        if aspect_ratio < 0.35 or aspect_ratio > 2.40:
            continue

        # Reject massive uniform thermal blocks (roofs, aircraft turbine plumes)
        # Humans cannot occupy > 12% of an aerial panoramic frame
        if b_area > (frame_area * 0.12):
            continue

        # Check for static building footprint containment
        if building_footprints and is_inside_building_footprint([x1, y1, x2, y2], building_footprints):
            continue

        # Measure local thermal contrast delta
        crop = flir_frame[y1:y2, x1:x2]
        gray_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
        interior_mean = float(np.mean(gray_crop))
        interior_std = float(np.std(gray_crop))

        # Reject large flat uniform surfaces (sun-baked concrete/tin: area > 900 and std < 2.5)
        if b_area > 900 and interior_std < 2.5:
            continue

        # Calculate local contrast against surrounding boundary ring
        rx1, ry1 = max(0, x1 - 8), max(0, y1 - 8)
        rx2, ry2 = min(w_img, x2 + 8), min(h_img, y2 + 8)
        outer_crop = flir_frame[ry1:ry2, rx1:rx2]
        outer_gray = cv2.cvtColor(outer_crop, cv2.COLOR_BGR2GRAY) if len(outer_crop.shape) == 3 else outer_crop
        outer_mean = float(np.mean(outer_gray))

        contrast_delta = max(0.0, interior_mean - outer_mean)
        # Compute normalized thermal confidence score (0.70 to 0.98)
        conf_thermal = round(min(0.98, max(0.70, 0.70 + (contrast_delta / 80.0) * 0.28)), 2)

        candidates.append({
            "box": [x1, y1, x2, y2],
            "confidence": conf_thermal,
            "contrast_delta": round(contrast_delta, 1),
            "aspect_ratio": round(aspect_ratio, 2),
            "area": b_area
        })

    # Apply NMS on thermal candidates
    if candidates:
        c_boxes = [c["box"] for c in candidates]
        c_confs = [c["confidence"] for c in candidates]
        nms_idx = apply_aggressive_nms(c_boxes, c_confs, conf_thresh=0.65, iou_thresh=0.30)
        candidates = [candidates[i] for i in nms_idx]

    candidates.sort(key=lambda c: (c["box"][1], c["box"][0]))
    return candidates[:15]
