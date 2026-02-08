"""RAG system using ChromaDB for local vector storage.

Stores and retrieves: series bibles, voice callsheets, previous chapters, outlines.
"""
import os
import hashlib
from typing import Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.config import settings

_client: Optional[chromadb.ClientAPI] = None


def get_chroma_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        os.makedirs(settings.chroma_persist_dir, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _client


def _collection_name(project_id: str, doc_type: str) -> str:
    raw = f"{project_id}_{doc_type}"
    if len(raw) > 63:
        raw = hashlib.md5(raw.encode()).hexdigest()
    return raw.replace("-", "_")[:63]


def _chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks


def index_document(project_id: str, doc_type: str, doc_id: str, content: str, metadata: Optional[dict] = None):
    """Index a document into the project's RAG collection.
    
    doc_type: series_bible | voice_callsheet | chapter_prose | chapter_brief | outline
    """
    client = get_chroma_client()
    col_name = _collection_name(project_id, doc_type)
    collection = client.get_or_create_collection(name=col_name)

    # Remove old entries for this doc_id
    try:
        existing = collection.get(where={"doc_id": doc_id})
        if existing and existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception:
        pass

    chunks = _chunk_text(content)
    if not chunks:
        return

    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {**(metadata or {}), "doc_id": doc_id, "chunk_index": i, "doc_type": doc_type}
        for i in range(len(chunks))
    ]

    collection.add(documents=chunks, ids=ids, metadatas=metadatas)


def query_documents(project_id: str, doc_type: str, query: str, n_results: int = 5) -> list[dict]:
    """Query the RAG collection for relevant chunks."""
    client = get_chroma_client()
    col_name = _collection_name(project_id, doc_type)

    try:
        collection = client.get_collection(name=col_name)
    except Exception:
        return []

    results = collection.query(query_texts=[query], n_results=n_results)

    output = []
    if results and results["documents"]:
        for i, doc in enumerate(results["documents"][0]):
            output.append({
                "content": doc,
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "distance": results["distances"][0][i] if results["distances"] else 0,
            })
    return output


def query_all_types(project_id: str, query: str, n_results: int = 3) -> dict[str, list[dict]]:
    """Query across all document types for a project."""
    doc_types = ["series_bible", "voice_callsheet", "chapter_prose", "chapter_brief", "outline"]
    results = {}
    for dt in doc_types:
        hits = query_documents(project_id, dt, query, n_results)
        if hits:
            results[dt] = hits
    return results


def delete_project_collections(project_id: str):
    """Delete all RAG collections for a project."""
    client = get_chroma_client()
    doc_types = ["series_bible", "voice_callsheet", "chapter_prose", "chapter_brief", "outline"]
    for dt in doc_types:
        col_name = _collection_name(project_id, dt)
        try:
            client.delete_collection(name=col_name)
        except Exception:
            pass
