import PyPDF2
import pytesseract
from PIL import Image
import warnings

# Suppress warnings related to CropBox
warnings.filterwarnings("ignore", message="CropBox missing from /Page, defaulting to MediaBox")
def extract_text_from_file(uploaded_file):
    text = ""
    try:
        if uploaded_file.type == "application/pdf":
            # Use PyPDF2 to read the PDF file
            reader = PyPDF2.PdfReader(uploaded_file)
            for page in reader.pages:
                text += page.extract_text() or ''
        else:
            # For image files, use OCR
            image = Image.open(uploaded_file)
            text = pytesseract.image_to_string(image)
    except Exception as e:
        text = f"Error extracting text: {e}"

    return text.strip() or "No readable text found."
