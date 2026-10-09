import io
import os
import re
from typing import Dict, Any, Optional, Tuple
from PIL import Image
import pytesseract
from pypdf import PdfReader
import docx

try:
    import cv2
    import numpy as np
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

try:
    import pypdfium2 as pdfium
    HAS_PDFIUM = True
except ImportError:
    HAS_PDFIUM = False

try:
    from pptx import Presentation
    HAS_PPTX = True
except ImportError:
    HAS_PPTX = False

# Ensure Tesseract OCR path is configured if on Windows
TESSERACT_WINDOWS_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(TESSERACT_WINDOWS_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_WINDOWS_PATH


def clean_extracted_text(text: str) -> str:
    """Normalize whitespace and strip excessive empty lines."""
    if not text:
        return ""
    # Normalize CRLF to LF
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Replace 3 or more consecutive newlines with 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def post_process_handwritten_markdown(raw_text: str) -> str:
    """
    Format OCR results from handwritten notes into structured, readable Markdown:
    - Removes hallucinated stray lines and isolated punctuation from paper rulings
    - Formats bullet points (- item) and numbered lists (1. item)
    - Formats top titles and headings
    """
    if not raw_text:
        return ""

    lines = raw_text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    formatted_lines = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            formatted_lines.append("")
            continue

        # Skip isolated stray paper artifacts (e.g. '|', '~', '_', '—', '¢', '^')
        if re.fullmatch(r"^[|\-_~—^`'.:;,\/\\*]{1,3}$", stripped):
            continue

        # Convert bullet variations (e.g. 'o ', '* ', '• ', '+ ') to standard markdown '- '
        bullet_match = re.match(r"^([•\*\+oO]\s+|\-\s+)(.*)$", stripped)
        if bullet_match:
            formatted_lines.append(f"- {bullet_match.group(2).strip()}")
            continue

        # Convert numbered list variations (e.g. '1) ', '1. ', '1 - ')
        num_match = re.match(r"^(\d+)[\.\)\-]\s+(.*)$", stripped)
        if num_match:
            formatted_lines.append(f"{num_match.group(1)}. {num_match.group(2).strip()}")
            continue

        # Strip dangling vertical pipes commonly caught from notebook margin lines
        clean_line = re.sub(r"^\s*\|\s*", "", stripped)
        clean_line = re.sub(r"\s*\|\s*$", "", clean_line)

        # Detect potential title / heading: First non-empty line or short uppercase line (< 60 chars)
        if not formatted_lines and len(clean_line) < 60 and not clean_line.startswith("#"):
            formatted_lines.append(f"# {clean_line}")
        else:
            formatted_lines.append(clean_line)

    result = "\n".join(formatted_lines)
    return clean_extracted_text(result)


def deskew_image(gray: "np.ndarray") -> "np.ndarray":
    """Detect dominant text line angle and rotate to horizontal."""
    try:
        # Binarize inverted so ink strokes are white on black
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) < 100:
            return gray

        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        else:
            angle = -angle

        # Only deskew if skew is noticeable and realistic
        if abs(angle) < 0.5 or abs(angle) > 35:
            return gray

        (h, w) = gray.shape[:2]
        center = (w // 2, h // 2)
        m = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            gray, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=255
        )
        return rotated
    except Exception:
        return gray


def preprocess_handwritten_image(file_bytes: bytes, mode: str = "auto") -> Tuple[Image.Image, Image.Image, Dict[str, Any]]:
    """
    State-of-the-art preprocessing pipeline for camera photos of handwritten paper:
    1. Dimension resizing: Limits large phone images (e.g. 48MP) to ~2000px for speed,
       or upscales small low-res crops for optimal character recognition.
    2. Background illumination normalization / Shadow removal:
       Dilation and division removes phone camera shadows and uneven page lighting.
    3. CLAHE (Contrast Limited Adaptive Histogram Equalization):
       Enhances local contrast so faint pencil or blue ballpoint pen stands out sharply.
    4. Deskewing: Straightens tilted phone camera angles.
    5. Adaptive Otsu Binarization: Creates clean black text on pure white paper.
    """
    metadata: Dict[str, Any] = {
        "enhanced": False,
        "deskewed": False,
        "shadow_removal": False,
    }

    if not HAS_OPENCV:
        # Fallback to basic PIL
        pil_img = Image.open(io.BytesIO(file_bytes))
        if pil_img.mode not in ("RGB", "L"):
            pil_img = pil_img.convert("RGB")
        return pil_img, pil_img, metadata

    # Decode bytes with OpenCV
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        return pil_img, pil_img, metadata

    h, w = img.shape[:2]
    # Optimal resolution scaling for Tesseract (max dimension ~2000px, min ~1000px)
    max_dim = max(h, w)
    min_dim = min(h, w)
    if max_dim > 2200:
        scale = 2200.0 / max_dim
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    elif min_dim < 700:
        scale = 1200.0 / max(min_dim, 1)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Shadow Removal & Background Normalization
    kernel_size = 21 if max(gray.shape) > 1200 else 15
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
    dilated = cv2.dilate(gray, kernel)
    bg = cv2.medianBlur(dilated, kernel_size)
    diff = 255 - cv2.absdiff(gray, bg)
    norm = cv2.normalize(diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8UC1)
    metadata["shadow_removal"] = True

    # Deskew
    deskewed = deskew_image(norm)
    metadata["deskewed"] = True

    # CLAHE Local Contrast Enhancement
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced_gray = clahe.apply(deskewed)
    metadata["enhanced"] = True

    # Adaptive Otsu Binarization with subtle Gaussian smoothing
    blurred = cv2.GaussianBlur(enhanced_gray, (3, 3), 0)
    _, binarized = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    pil_enhanced = Image.fromarray(enhanced_gray)
    pil_binary = Image.fromarray(binarized)

    return pil_enhanced, pil_binary, metadata


def derive_title(filename: str, first_heading: Optional[str] = None) -> str:
    """Derive a friendly note title from the first heading or filename."""
    if first_heading and len(first_heading.strip()) > 2:
        clean_h = first_heading.strip().lstrip("#").strip()
        if len(clean_h) < 100:
            return clean_h
    base = os.path.splitext(filename)[0]
    base = re.sub(r"[_\-]+", " ", base)
    words = [w.capitalize() for w in base.split() if w]
    return " ".join(words) if words else "Imported Note"


def extract_from_image(file_bytes: bytes, mode: str = "auto") -> Dict[str, Any]:
    """
    Perform high-efficiency OCR on an image file:
    - Applies advanced shadow removal, CLAHE enhancement, and Otsu binarization
    - Uses Tesseract LSTM Neural Network engine with multi-pass evaluation
    - Post-processes text into clean, structured Markdown
    """
    pil_enhanced, pil_binary, prep_meta = preprocess_handwritten_image(file_bytes, mode=mode)

    # Multi-pass OCR for maximum accuracy and character extraction:
    # Pass 1: Neural network LSTM with uniform block segmentation (--psm 6) on clean binarized image
    custom_config_lstm_block = r"--oem 1 --psm 6"
    pass1_text = ""
    try:
        pass1_text = pytesseract.image_to_string(pil_binary, config=custom_config_lstm_block)
    except Exception:
        pass

    # Pass 2: If pass 1 produced low yield or empty, try automatic segmentation (--psm 3) on enhanced grayscale
    best_text = pass1_text
    if len(pass1_text.strip()) < 40:
        custom_config_lstm_auto = r"--oem 1 --psm 3"
        try:
            pass2_text = pytesseract.image_to_string(pil_enhanced, config=custom_config_lstm_auto)
            if len(pass2_text.strip()) > len(pass1_text.strip()):
                best_text = pass2_text
        except Exception:
            pass

    cleaned_markdown = post_process_handwritten_markdown(best_text)

    return {
        "text": cleaned_markdown,
        "width": pil_enhanced.width,
        "height": pil_enhanced.height,
        "format": "IMAGE",
        "ocr_engine": "Tesseract OCR (LSTM Neural Net + Adaptive Preprocessing)",
        "preprocessing": prep_meta,
    }


def extract_from_pdf(file_bytes: bytes) -> Dict[str, Any]:
    """Extract text from a PDF document page by page."""
    reader = PdfReader(io.BytesIO(file_bytes))
    total_pages = len(reader.pages)
    pages_text = []

    for idx, page in enumerate(reader.pages):
        page_content = page.extract_text() or ""
        page_clean = clean_extracted_text(page_content)
        if page_clean:
            if total_pages > 1:
                pages_text.append(f"### Page {idx + 1}\n\n{page_clean}")
            else:
                pages_text.append(page_clean)

    full_text = "\n\n---\n\n".join(pages_text) if pages_text else ""
    return {
        "text": full_text,
        "total_pages": total_pages,
    }


def extract_from_docx(file_bytes: bytes) -> Dict[str, Any]:
    """Extract structured Markdown from a Word (.docx) document."""
    doc = docx.Document(io.BytesIO(file_bytes))
    parts = []

    for element in doc.element.body:
        # Check if element is paragraph
        if element.tag.endswith("p"):
            for p in doc.paragraphs:
                if p._element == element:
                    p_text = p.text.strip()
                    if not p_text:
                        continue
                    style_name = p.style.name.lower() if p.style else ""
                    if "heading 1" in style_name:
                        parts.append(f"# {p_text}")
                    elif "heading 2" in style_name:
                        parts.append(f"## {p_text}")
                    elif "heading 3" in style_name:
                        parts.append(f"### {p_text}")
                    elif "bullet" in style_name:
                        parts.append(f"- {p_text}")
                    elif "number" in style_name:
                        parts.append(f"1. {p_text}")
                    else:
                        parts.append(p_text)
                    break
        # Check if element is table
        elif element.tag.endswith("tbl"):
            for tbl in doc.tables:
                if tbl._element == element:
                    table_rows = []
                    for row_idx, row in enumerate(tbl.rows):
                        cells = [cell.text.replace("\n", " ").strip() for cell in row.cells]
                        table_rows.append("| " + " | ".join(cells) + " |")
                        if row_idx == 0:
                            table_rows.append("| " + " | ".join(["---"] * len(cells)) + " |")
                    if table_rows:
                        parts.append("\n".join(table_rows))
                    break

    full_text = "\n\n".join(parts)
    return {
        "text": clean_extracted_text(full_text),
        "paragraphs_count": len(doc.paragraphs),
        "tables_count": len(doc.tables),
    }


def render_pdf_to_images(file_bytes: bytes, base_filename: str, max_pages: int = 50) -> list:
    """
    Renders all pages of a PDF into sharp, high-efficiency WebP images and saves them to static uploads/ storage.
    WebP compression reduces image size from ~2.5 MB down to ~180-250 KB (90%+ savings) while preserving crisp text readability.
    Returns list of dicts with page_number, image_url, width, height.
    """
    if not HAS_PDFIUM:
        return []
    try:
        import uuid
        pdf = pdfium.PdfDocument(file_bytes)
        total_pages = len(pdf)
        pages_images = []
        
        uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
        os.makedirs(uploads_dir, exist_ok=True)
        
        clean_base = re.sub(r"[^a-zA-Z0-9_-]", "_", os.path.splitext(base_filename)[0])
        uid = uuid.uuid4().hex[:8]
        
        limit = min(total_pages, max_pages)
        for idx in range(limit):
            page = pdf[idx]
            # scale=2.0 generates ~150 DPI sharp, crisp text suitable for reading
            bitmap = page.render(scale=2.0)
            pil_image = bitmap.to_pil()
            
            # Save as optimized WebP (quality 82, method 4 for fast high-efficiency compression)
            img_filename = f"pdf_{uid}_{clean_base}_page_{idx + 1}.webp"
            img_path = os.path.join(uploads_dir, img_filename)
            try:
                pil_image.save(img_path, format="WEBP", quality=82, method=4)
            except Exception:
                # Fallback to PNG if WebP fails
                img_filename = f"pdf_{uid}_{clean_base}_page_{idx + 1}.png"
                img_path = os.path.join(uploads_dir, img_filename)
                pil_image.save(img_path, format="PNG")
            
            pages_images.append({
                "page_number": idx + 1,
                "image_url": f"/uploads/{img_filename}",
                "width": pil_image.width,
                "height": pil_image.height,
            })
        return pages_images
    except Exception as e:
        print(f"Warning: could not render PDF pages to images: {e}")
        return []


def render_pptx_to_images(file_bytes: bytes, base_filename: str, max_slides: int = 50) -> list:
    """
    Renders PowerPoint slides into crisp images and saves them to static uploads/ storage.
    Uses PowerPoint COM automation on Windows or extracts slide pictures via python-pptx.
    Returns list of dicts with page_number, image_url, width, height.
    """
    import uuid
    import tempfile
    import subprocess
    import shutil

    slides_images = []
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
    os.makedirs(uploads_dir, exist_ok=True)
    clean_base = re.sub(r"[^a-zA-Z0-9_-]", "_", os.path.splitext(base_filename)[0])
    uid = uuid.uuid4().hex[:8]

    # Method 1: PowerPoint COM Automation via PowerShell script
    script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "export_pptx_slides.ps1"))
    if os.path.exists(script_path) and os.name == "nt":
        temp_dir = tempfile.mkdtemp(prefix="pptx_img_")
        try:
            temp_pptx = os.path.join(temp_dir, "input.pptx")
            with open(temp_pptx, "wb") as f:
                f.write(file_bytes)
            
            temp_out = os.path.join(temp_dir, "slides_out")
            os.makedirs(temp_out, exist_ok=True)

            proc = subprocess.run([
                "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass",
                "-File", script_path,
                "-PptxPath", temp_pptx,
                "-OutputDir", temp_out
            ], capture_output=True, text=True, timeout=30)

            if "SUCCESS" in proc.stdout and os.path.exists(temp_out):
                exported_files = os.listdir(temp_out)
                slide_files = [f for f in exported_files if re.match(r"^Slide\d+\.(png|jpg|jpeg)$", f, re.IGNORECASE)]
                slide_files.sort(key=lambda x: int(re.search(r"\d+", x).group()) if re.search(r"\d+", x) else 0)
                
                limit = min(len(slide_files), max_slides)
                for idx, fname in enumerate(slide_files[:limit]):
                    src_path = os.path.join(temp_out, fname)
                    target_name = f"pptx_{uid}_{clean_base}_slide_{idx + 1}.webp"
                    dest_path = os.path.join(uploads_dir, target_name)
                    
                    w, h = 1280, 720
                    try:
                        with Image.open(src_path) as im:
                            if im.mode not in ("RGB", "RGBA"):
                                im = im.convert("RGB")
                            w, h = im.size
                            im.save(dest_path, format="WEBP", quality=82, method=4)
                    except Exception:
                        ext = os.path.splitext(fname)[1].lower()
                        fallback_name = f"pptx_{uid}_{clean_base}_slide_{idx + 1}{ext}"
                        dest_path = os.path.join(uploads_dir, fallback_name)
                        shutil.copy2(src_path, dest_path)
                        target_name = fallback_name
                    
                    slides_images.append({
                        "page_number": idx + 1,
                        "image_url": f"/uploads/{target_name}",
                        "width": w,
                        "height": h,
                    })
                if slides_images:
                    return slides_images
        except Exception as com_err:
            print(f"Warning: PowerPoint COM export failed, trying fallback: {com_err}")
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    # Method 2: Fallback extracting embedded slide pictures using python-pptx
    if HAS_PPTX:
        try:
            prs = Presentation(io.BytesIO(file_bytes))
            limit = min(len(prs.slides), max_slides)
            for idx in range(limit):
                slide = prs.slides[idx]
                for s_idx, shape in enumerate(slide.shapes):
                    if hasattr(shape, "image") and shape.image:
                        img_bytes = shape.image.blob
                        target_name = f"pptx_{uid}_{clean_base}_slide_{idx + 1}_img_{s_idx + 1}.webp"
                        dest_path = os.path.join(uploads_dir, target_name)
                        try:
                            with Image.open(io.BytesIO(img_bytes)) as im:
                                if im.mode not in ("RGB", "RGBA"):
                                    im = im.convert("RGB")
                                im.save(dest_path, format="WEBP", quality=82, method=4)
                        except Exception:
                            img_ext = shape.image.ext or "png"
                            target_name = f"pptx_{uid}_{clean_base}_slide_{idx + 1}_img_{s_idx + 1}.{img_ext}"
                            dest_path = os.path.join(uploads_dir, target_name)
                            with open(dest_path, "wb") as f:
                                f.write(img_bytes)
                        slides_images.append({
                            "page_number": idx + 1,
                            "image_url": f"/uploads/{target_name}",
                            "width": 1024,
                            "height": 768,
                        })
                        break
        except Exception as pptx_err:
            print(f"Warning: python-pptx image extraction fallback failed: {pptx_err}")

    return slides_images


def extract_from_pptx(file_bytes: bytes) -> Dict[str, Any]:
    """
    Extract structured Markdown from a PowerPoint (.pptx) presentation.
    Captures slide titles, bullet points, numbered lists, tables, and speaker notes.
    """
    if not HAS_PPTX:
        return {
            "text": "PowerPoint support library not installed. Please install python-pptx.",
            "total_slides": 0,
        }
    
    prs = Presentation(io.BytesIO(file_bytes))
    slides_content = []
    total_slides = len(prs.slides)
    
    for idx, slide in enumerate(prs.slides):
        slide_texts = []
        title = ""
        try:
            if slide.shapes.title and slide.shapes.title.text.strip():
                title = slide.shapes.title.text.strip()
        except Exception:
            pass
        
        for shape in slide.shapes:
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    t = paragraph.text.strip()
                    if not t or t == title:
                        continue
                    level = getattr(paragraph, 'level', 0)
                    bullet = "  " * level + "- " if level > 0 else "- "
                    slide_texts.append(f"{bullet}{t}")
            elif shape.has_table:
                table = shape.table
                table_rows = []
                for r_idx, row in enumerate(table.rows):
                    cells = [c.text.replace("\n", " ").strip() for c in row.cells]
                    table_rows.append("| " + " | ".join(cells) + " |")
                    if r_idx == 0:
                        table_rows.append("| " + " | ".join(["---"] * len(cells)) + " |")
                if table_rows:
                    slide_texts.append("\n".join(table_rows))
        
        notes_text = ""
        try:
            if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                nt = slide.notes_slide.notes_text_frame.text.strip()
                if nt:
                    notes_text = f"\n\n> 💡 **Speaker Notes:** {nt}"
        except Exception:
            pass
        
        slide_header = f"## Slide {idx + 1}: {title}" if title else f"## Slide {idx + 1}"
        slide_body = "\n".join(slide_texts) if slide_texts else "*[Visual slide with illustrations or figures]*"
        slides_content.append(f"{slide_header}\n\n{slide_body}{notes_text}")
    
    full_text = "\n\n---\n\n".join(slides_content)
    return {
        "text": clean_extracted_text(full_text),
        "total_slides": total_slides,
    }


def convert_file_to_markdown(file_bytes: bytes, filename: str, mode: str = "auto", pages_as_images: bool = False) -> Dict[str, Any]:
    """
    Main conversion dispatcher supporting Images (Handwritten & Printed OCR), PDFs (Text & Sequential Images),
    Word DOCX, PowerPoint PPTX, and Text files.
    """
    ext = os.path.splitext(filename)[1].lower()

    result = {
        "filename": filename,
        "extension": ext,
        "file_type": "unknown",
        "text": "",
        "suggested_title": "",
        "word_count": 0,
        "reading_time": 1,
        "metadata": {},
        "page_images": [],
    }

    image_extensions = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}

    if ext in image_extensions:
        result["file_type"] = "image"
        extracted = extract_from_image(file_bytes, mode=mode)
        result["text"] = extracted["text"]
        result["metadata"] = {
            "width": extracted.get("width"),
            "height": extracted.get("height"),
            "ocr_engine": extracted.get("ocr_engine"),
            "preprocessing": extracted.get("preprocessing"),
        }
    elif ext == ".pdf":
        result["file_type"] = "pdf"
        # Generate sequential page images for PDFs
        page_images = render_pdf_to_images(file_bytes, filename)
        result["page_images"] = page_images
        
        extracted = extract_from_pdf(file_bytes)
        text_content = extracted.get("text", "").strip()

        if mode == "pages_as_images" or pages_as_images or (not text_content and page_images):
            # Format note with sequential page images
            clean_title = derive_title(filename)
            img_blocks = []
            for p in page_images:
                img_blocks.append(f"### Page {p['page_number']}\n\n![Page {p['page_number']}]({p['image_url']})")
            
            result["text"] = f"# {clean_title}\n\n> 📑 **Document Pages Archive:** {len(page_images)} sequential page images extracted.\n\n" + "\n\n---\n\n".join(img_blocks)
        else:
            result["text"] = text_content
            
        result["metadata"] = {
            "total_pages": extracted.get("total_pages") or len(page_images),
            "rendered_images_count": len(page_images),
        }
    elif ext in {".docx", ".doc"}:
        result["file_type"] = "docx"
        if ext == ".docx":
            extracted = extract_from_docx(file_bytes)
            result["text"] = extracted["text"]
            result["metadata"] = {
                "paragraphs": extracted.get("paragraphs_count"),
                "tables": extracted.get("tables_count"),
            }
        else:
            try:
                raw_text = file_bytes.decode("utf-8", errors="ignore")
                printable = "".join(ch for ch in raw_text if ch.isprintable() or ch in "\n\t")
                result["text"] = clean_extracted_text(printable)
            except Exception:
                result["text"] = "Unable to parse legacy binary .doc format directly. Please save as .docx or PDF."
    elif ext in {".pptx", ".ppt"}:
        result["file_type"] = "pptx"
        # Generate sequential slide images for presentations
        slide_images = render_pptx_to_images(file_bytes, filename)
        result["page_images"] = slide_images

        text_content = ""
        total_slides_count = len(slide_images)
        if ext == ".pptx":
            extracted = extract_from_pptx(file_bytes)
            text_content = extracted.get("text", "").strip()
            total_slides_count = extracted.get("total_slides") or total_slides_count
        else:
            try:
                raw_text = file_bytes.decode("utf-8", errors="ignore")
                printable = "".join(ch for ch in raw_text if ch.isprintable() or ch in "\n\t")
                text_content = clean_extracted_text(printable)
            except Exception:
                text_content = "Unable to parse legacy binary .ppt format directly. Please save as .pptx or PDF."

        if mode == "pages_as_images" or pages_as_images or (not text_content and slide_images):
            clean_title = derive_title(filename)
            img_blocks = []
            for s in slide_images:
                img_blocks.append(f"### Slide {s['page_number']}\n\n![Slide {s['page_number']}]({s['image_url']})")
            result["text"] = f"# {clean_title}\n\n> 📑 **Presentation Slide Archive:** {len(slide_images)} sequential slide images extracted.\n\n" + "\n\n---\n\n".join(img_blocks)
        else:
            result["text"] = text_content

        result["metadata"] = {
            "total_slides": total_slides_count,
            "rendered_images_count": len(slide_images),
        }
    elif ext in {".txt", ".md", ".markdown", ".csv", ".json", ".log"}:
        result["file_type"] = "text"
        try:
            result["text"] = clean_extracted_text(file_bytes.decode("utf-8"))
        except UnicodeDecodeError:
            result["text"] = clean_extracted_text(file_bytes.decode("latin-1", errors="replace"))
    else:
        try:
            result["text"] = clean_extracted_text(file_bytes.decode("utf-8"))
            result["file_type"] = "text"
        except Exception:
            raise ValueError(f"Unsupported file format: '{ext}'. Supported formats: PNG, JPG, WEBP, PDF, DOCX, PPTX, TXT, MD.")

    # Calculate word count & reading time
    words = len(result["text"].split()) if result["text"] else 0
    result["word_count"] = words
    result["reading_time"] = max(1, (words + 199) // 200)

    # Derive suggested title
    first_line = result["text"].split("\n")[0] if result["text"] else ""
    first_heading = first_line if first_line.startswith("#") else None
    result["suggested_title"] = derive_title(filename, first_heading)

    # Save original file copy to uploads/ directory so users can retain original format
    try:
        import uuid
        import base64
        safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", filename)
        stored_name = f"{uuid.uuid4().hex[:12]}_{safe_name}"
        uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
        os.makedirs(uploads_dir, exist_ok=True)
        stored_path = os.path.join(uploads_dir, stored_name)
        with open(stored_path, "wb") as f:
            f.write(file_bytes)
        
        result["file_url"] = f"/uploads/{stored_name}"
        result["file_size"] = len(file_bytes)

        if result["file_type"] == "image":
            mime_type = "image/png" if ext == ".png" else "image/jpeg" if ext in {".jpg", ".jpeg"} else "image/webp"
            b64_str = base64.b64encode(file_bytes).decode("ascii")
            result["data_url"] = f"data:{mime_type};base64,{b64_str}"
    except Exception as save_err:
        print(f"Warning: could not store file copy in uploads: {save_err}")

    return result
