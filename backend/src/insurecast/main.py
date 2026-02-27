from fastapi import FastAPI

app = FastAPI(
    title="Insurecast",
    description="Time-series models applied to insurance data",
    version="0.1.0",
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
