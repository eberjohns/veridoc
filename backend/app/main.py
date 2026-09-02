import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from .schemas import AnalyzeResponse
from .orchestrator import orchestrate_analysis
from .sample_cases import CASE_DETAILS, SAMPLE_DOCUMENTS_INFO

app = FastAPI(
    title="Veridoc Forensic Analysis API",
    description="Automated document fraud detection and forensic verification engine",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SAMPLE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_data")

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Veridoc Forensic Engine", "version": "1.0.0"}

@app.get("/api/cases/{case_id}")
async def get_case_details(case_id: str):
    return CASE_DETAILS

@app.get("/api/sample-docs")
async def list_sample_documents():
    return {"documents": SAMPLE_DOCUMENTS_INFO}

@app.get("/api/sample-docs/{filename}")
async def analyze_sample_document(filename: str):
    file_path = os.path.join(SAMPLE_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Sample document '{filename}' not found")
    
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    result = await orchestrate_analysis(file_bytes, filename, case_id="Fraud Investigation #1047")
    return result

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_document(file: UploadFile = File(...)):
    """
    Accepts multipart file upload (PDF, PNG, JPG, JPEG) and routes it asynchronously
    to Metadata, Visual (ELA/Cloning/Splicing), and OCR/Semantic Math modules.
    """
    allowed_extensions = (".pdf", ".png", ".jpg", ".jpeg")
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Please upload a PDF, PNG, or JPG file."
        )

    try:
        content = await file.read()
        analysis = await orchestrate_analysis(content, file.filename)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forensic analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
