import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
import json
import uuid
import base64
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from .schemas import AnalyzeResponse
from .orchestrator import orchestrate_analysis
from .sample_cases import CASE_DETAILS, SAMPLE_DOCUMENTS_INFO
from .routers.agent import router as agent_router

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

app.include_router(agent_router)


BASE_DIR = os.path.dirname(os.path.dirname(__file__))
SAMPLE_DIR = os.path.join(BASE_DIR, "sample_data")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
MANIFEST_PATH = os.path.join(UPLOADS_DIR, "manifest.json")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(SAMPLE_DIR, exist_ok=True)

def load_manifest():
    if os.path.exists(MANIFEST_PATH):
        try:
            with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_manifest(manifest):
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Veridoc Forensic Engine", "version": "1.0.0"}

@app.get("/api/documents")
async def list_all_documents():
    """Returns all stored/uploaded documents."""
    manifest = load_manifest()
    return {"documents": manifest}

@app.get("/api/documents/{doc_id}")
async def get_document_analysis(doc_id: str):
    """Retrieves stored analysis for a specific document ID or filename."""
    # Check uploads directory first
    analysis_file = os.path.join(UPLOADS_DIR, f"{doc_id}.json")
    if os.path.exists(analysis_file):
        with open(analysis_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            # If cached result lacks ocr_analysis or ai_generation, regenerate from stored source file
            if not data.get("ocr_analysis") or not data.get("layers", {}).get("ai_generation"):
                for ext in [".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg", ".txt"]:
                    src = os.path.join(UPLOADS_DIR, f"{doc_id}{ext}")
                    if os.path.exists(src):
                        with open(src, "rb") as sf:
                            f_bytes = sf.read()
                        manifest = load_manifest()
                        res = await orchestrate_analysis(f_bytes, data.get("filename", f"{doc_id}{ext}"), manifest=manifest)
                        with open(analysis_file, "w", encoding="utf-8") as wf:
                            json.dump(res.model_dump(), wf, indent=2)
                        return res.model_dump()
            return data

    # Check manifest for matching filename
    manifest = load_manifest()
    for item in manifest:
        if item.get("id") == doc_id or item.get("filename") == doc_id:
            item_file = os.path.join(UPLOADS_DIR, f"{item.get('id')}.json")
            if os.path.exists(item_file):
                with open(item_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if not data.get("ocr_analysis") or not data.get("layers", {}).get("ai_generation"):
                        for ext in [".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg", ".txt"]:
                            src = os.path.join(UPLOADS_DIR, f"{item.get('id')}{ext}")
                            if os.path.exists(src):
                                with open(src, "rb") as sf:
                                    f_bytes = sf.read()
                                res = await orchestrate_analysis(f_bytes, item.get("filename", f"{doc_id}{ext}"), manifest=manifest)
                                with open(item_file, "w", encoding="utf-8") as wf:
                                    json.dump(res.model_dump(), wf, indent=2)
                                return res.model_dump()
                    return data

    # Check sample files fallback
    sample_path = os.path.join(SAMPLE_DIR, doc_id)
    if os.path.exists(sample_path):
        with open(sample_path, "rb") as f:
            file_bytes = f.read()
        result = await orchestrate_analysis(file_bytes, doc_id, case_id="Fraud Investigation #1047")
        return result

    raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")

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
    Accepts multipart file upload (PDF, PNG, JPG, JPEG), analyzes with forensic modules,
    and persists the document and analysis result to disk so it survives page reloads.
    """
    allowed_extensions = (".pdf", ".png", ".jpg", ".jpeg", ".docx", ".xlsx", ".txt")
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF, DOCX, XLSX, TXT, PNG, or JPG file."
        )

    try:
        content = await file.read()
        manifest = load_manifest()
        analysis = await orchestrate_analysis(content, file.filename, manifest=manifest)
        
        # Persist original file and analysis JSON to uploads directory
        doc_id = analysis.document_id
        file_ext = os.path.splitext(file.filename)[1]
        saved_file_path = os.path.join(UPLOADS_DIR, f"{doc_id}{file_ext}")
        with open(saved_file_path, "wb") as f:
            f.write(content)
            
        analysis_json_path = os.path.join(UPLOADS_DIR, f"{doc_id}.json")
        with open(analysis_json_path, "w", encoding="utf-8") as f:
            json.dump(analysis.model_dump(), f, indent=2)

        # Update manifest index
        manifest = load_manifest()
        # Remove existing if duplicate id
        manifest = [m for m in manifest if m.get("id") != doc_id]
        manifest.insert(0, {
            "id": doc_id,
            "filename": file.filename,
            "title": file.filename,
            "status": "flagged" if analysis.risk_level == "CRITICAL" else "verified",
            "risk_level": analysis.risk_level,
            "trust_score": analysis.trust_score,
            "findings_count": len(analysis.findings),
            "type": "uploaded",
            "filesize_bytes": len(content),
            "file_sha256": analysis.metadata.file_sha256,
            "file_phash": analysis.metadata.file_phash,
            "file_simhash": analysis.metadata.file_simhash,
            "metadata": {
                "file_sha256": analysis.metadata.file_sha256,
                "file_phash": analysis.metadata.file_phash,
                "file_simhash": analysis.metadata.file_simhash
            },
            "uploaded_at": analysis.processed_at
        })
        save_manifest(manifest)

        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forensic analysis failed: {str(e)}")

@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Deletes an uploaded document and its cached analysis."""
    manifest = load_manifest()
    manifest = [m for m in manifest if m.get("id") != doc_id]
    save_manifest(manifest)
    
    # Remove files if they exist
    for f in os.listdir(UPLOADS_DIR):
        if f.startswith(doc_id):
            try:
                os.remove(os.path.join(UPLOADS_DIR, f))
            except Exception:
                pass
    return {"status": "deleted", "id": doc_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
