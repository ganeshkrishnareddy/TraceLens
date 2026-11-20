from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health():
    return {"status": "healthy", "service": "TraceLens", "version": "2.0.0"}
