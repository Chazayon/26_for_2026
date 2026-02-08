"""FastAPI REST API for Novel Automation Studio."""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import (
    get_session, Project, Book, Chapter, VoiceCallsheet, WorkflowRun, ModelConfig, gen_id,
)
from app.llm_providers import get_llm_for_role, list_ollama_models, OPENROUTER_POPULAR_MODELS
from app.rag import index_document, query_documents, query_all_types, delete_project_collections
from app.workflow import build_brainstorm_graph, build_chapter_graph

logger = logging.getLogger(__name__)
router = APIRouter()

# Active workflow tasks (in-memory tracker)
_active_runs: dict[str, asyncio.Task] = {}
_cancelled_runs: set[str] = set()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    series_name: str = ""
    genre: str = "romance fantasy"
    input_type: str = "idea"
    idea_text: str = ""
    story_bible: str = ""
    ship_vibes: str = ""

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    series_name: Optional[str] = None
    genre: Optional[str] = None
    idea_text: Optional[str] = None
    story_bible: Optional[str] = None
    ship_vibes: Optional[str] = None
    status: Optional[str] = None

class BookCreate(BaseModel):
    title: str
    book_number: int = 1
    outline: str = ""

class ChapterCreate(BaseModel):
    chapter_number: int
    title: str = ""
    pov_character: str = ""
    plot_summary: str = ""
    character_list: str = ""
    location: str = ""

class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    pov_character: Optional[str] = None
    plot_summary: Optional[str] = None
    character_list: Optional[str] = None
    location: Optional[str] = None
    scene_brief: Optional[str] = None
    prose: Optional[str] = None

class CallsheetCreate(BaseModel):
    character_name: str
    content: str

class ModelConfigCreate(BaseModel):
    name: str
    provider: str
    model_id: str
    role: str
    temperature: str = "0.7"
    max_tokens: int = 4096
    is_default: int = 0

class ModelConfigUpdate(BaseModel):
    name: Optional[str] = None
    provider: Optional[str] = None
    model_id: Optional[str] = None
    role: Optional[str] = None
    temperature: Optional[str] = None
    max_tokens: Optional[int] = None
    is_default: Optional[int] = None

class RunBrainstormRequest(BaseModel):
    project_id: str

class RunChapterRequest(BaseModel):
    project_id: str
    book_id: str
    chapter_id: str

class RunBookRequest(BaseModel):
    project_id: str
    book_id: str


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

@router.get("/projects")
async def list_projects(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Project).order_by(Project.created_at.desc()))
    projects = result.scalars().all()
    return [_project_dict(p) for p in projects]

@router.post("/projects")
async def create_project(data: ProjectCreate, session: AsyncSession = Depends(get_session)):
    project = Project(id=gen_id(), **data.model_dump())
    session.add(project)
    await session.commit()
    await session.refresh(project)

    # Index story bible and ship vibes into RAG if provided
    if data.story_bible:
        index_document(project.id, "series_bible", "main_bible", data.story_bible)
    if data.ship_vibes:
        index_document(project.id, "series_bible", "ship_vibes", data.ship_vibes)

    return _project_dict(project)

@router.get("/projects/{project_id}")
async def get_project(project_id: str, session: AsyncSession = Depends(get_session)):
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return _project_dict(project)

@router.patch("/projects/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, session: AsyncSession = Depends(get_session)):
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(project, k, v)
    project.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(project)

    if data.story_bible:
        index_document(project_id, "series_bible", "main_bible", data.story_bible)

    return _project_dict(project)

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, session: AsyncSession = Depends(get_session)):
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    await session.delete(project)
    await session.commit()
    delete_project_collections(project_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Books
# ---------------------------------------------------------------------------

@router.get("/projects/{project_id}/books")
async def list_books(project_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Book).where(Book.project_id == project_id).order_by(Book.book_number)
    )
    return [_book_dict(b) for b in result.scalars().all()]

@router.post("/projects/{project_id}/books")
async def create_book(project_id: str, data: BookCreate, session: AsyncSession = Depends(get_session)):
    book = Book(id=gen_id(), project_id=project_id, **data.model_dump())
    session.add(book)
    await session.commit()
    await session.refresh(book)

    if data.outline:
        index_document(project_id, "outline", book.id, data.outline)

    return _book_dict(book)

@router.get("/projects/{project_id}/books/{book_id}")
async def get_book(project_id: str, book_id: str, session: AsyncSession = Depends(get_session)):
    book = await session.get(Book, book_id)
    if not book:
        raise HTTPException(404, "Book not found")
    return _book_dict(book)

@router.delete("/projects/{project_id}/books/{book_id}")
async def delete_book(project_id: str, book_id: str, session: AsyncSession = Depends(get_session)):
    book = await session.get(Book, book_id)
    if not book:
        raise HTTPException(404, "Book not found")
    await session.delete(book)
    await session.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Chapters
# ---------------------------------------------------------------------------

@router.get("/projects/{project_id}/books/{book_id}/chapters")
async def list_chapters(project_id: str, book_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Chapter).where(Chapter.book_id == book_id).order_by(Chapter.chapter_number)
    )
    return [_chapter_dict(c) for c in result.scalars().all()]

@router.post("/projects/{project_id}/books/{book_id}/chapters")
async def create_chapter(project_id: str, book_id: str, data: ChapterCreate, session: AsyncSession = Depends(get_session)):
    chapter = Chapter(id=gen_id(), book_id=book_id, **data.model_dump())
    session.add(chapter)
    await session.commit()
    await session.refresh(chapter)
    return _chapter_dict(chapter)

@router.get("/projects/{project_id}/books/{book_id}/chapters/{chapter_id}")
async def get_chapter(project_id: str, book_id: str, chapter_id: str, session: AsyncSession = Depends(get_session)):
    chapter = await session.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(404, "Chapter not found")
    return _chapter_dict(chapter)

@router.patch("/projects/{project_id}/books/{book_id}/chapters/{chapter_id}")
async def update_chapter(project_id: str, book_id: str, chapter_id: str, data: ChapterUpdate, session: AsyncSession = Depends(get_session)):
    chapter = await session.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(404, "Chapter not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(chapter, k, v)
    chapter.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(chapter)
    return _chapter_dict(chapter)

@router.delete("/projects/{project_id}/books/{book_id}/chapters/{chapter_id}")
async def delete_chapter(project_id: str, book_id: str, chapter_id: str, session: AsyncSession = Depends(get_session)):
    chapter = await session.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(404, "Chapter not found")
    await session.delete(chapter)
    await session.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Voice Callsheets
# ---------------------------------------------------------------------------

@router.get("/projects/{project_id}/callsheets")
async def list_callsheets(project_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(VoiceCallsheet).where(VoiceCallsheet.project_id == project_id)
    )
    return [{"id": c.id, "character_name": c.character_name, "content": c.content} for c in result.scalars().all()]

@router.post("/projects/{project_id}/callsheets")
async def create_callsheet(project_id: str, data: CallsheetCreate, session: AsyncSession = Depends(get_session)):
    cs = VoiceCallsheet(id=gen_id(), project_id=project_id, **data.model_dump())
    session.add(cs)
    await session.commit()
    index_document(project_id, "voice_callsheet", cs.id, data.content, {"character_name": data.character_name})
    return {"id": cs.id, "character_name": cs.character_name}

@router.delete("/projects/{project_id}/callsheets/{callsheet_id}")
async def delete_callsheet(project_id: str, callsheet_id: str, session: AsyncSession = Depends(get_session)):
    cs = await session.get(VoiceCallsheet, callsheet_id)
    if not cs:
        raise HTTPException(404, "Callsheet not found")
    await session.delete(cs)
    await session.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Model Configuration
# ---------------------------------------------------------------------------

@router.get("/models/configs")
async def list_model_configs(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ModelConfig).order_by(ModelConfig.role))
    return [_model_config_dict(m) for m in result.scalars().all()]

@router.post("/models/configs")
async def create_model_config(data: ModelConfigCreate, session: AsyncSession = Depends(get_session)):
    mc = ModelConfig(id=gen_id(), **data.model_dump())
    session.add(mc)
    await session.commit()
    return _model_config_dict(mc)

@router.patch("/models/configs/{config_id}")
async def update_model_config(config_id: str, data: ModelConfigUpdate, session: AsyncSession = Depends(get_session)):
    mc = await session.get(ModelConfig, config_id)
    if not mc:
        raise HTTPException(404, "Model config not found")

    # If setting as default, unset other defaults for same role
    update_data = data.model_dump(exclude_none=True)
    if update_data.get("is_default") == 1:
        role = update_data.get("role", mc.role)
        await session.execute(
            update(ModelConfig).where(ModelConfig.role == role, ModelConfig.id != config_id).values(is_default=0)
        )

    for k, v in update_data.items():
        setattr(mc, k, v)
    await session.commit()
    await session.refresh(mc)
    return _model_config_dict(mc)

@router.delete("/models/configs/{config_id}")
async def delete_model_config(config_id: str, session: AsyncSession = Depends(get_session)):
    mc = await session.get(ModelConfig, config_id)
    if not mc:
        raise HTTPException(404)
    await session.delete(mc)
    await session.commit()
    return {"ok": True}

@router.get("/models/available")
async def list_available_models():
    ollama_models = await list_ollama_models()
    return {
        "openrouter": OPENROUTER_POPULAR_MODELS,
        "ollama": ollama_models,
        "ollama_available": len(ollama_models) > 0,
    }


# ---------------------------------------------------------------------------
# Workflow Runs
# ---------------------------------------------------------------------------

@router.get("/runs")
async def list_runs(project_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    q = select(WorkflowRun).order_by(WorkflowRun.started_at.desc()).limit(50)
    if project_id:
        q = q.where(WorkflowRun.project_id == project_id)
    result = await session.execute(q)
    return [_run_dict(r) for r in result.scalars().all()]

@router.get("/runs/{run_id}")
async def get_run(run_id: str, session: AsyncSession = Depends(get_session)):
    run = await session.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    return _run_dict(run)


@router.post("/runs/{run_id}/cancel")
async def cancel_run(run_id: str, session: AsyncSession = Depends(get_session)):
    """Cancel a running workflow."""
    run = await session.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    if run.status != "running":
        raise HTTPException(400, f"Run is not running (status: {run.status})")

    _cancelled_runs.add(run_id)

    task = _active_runs.get(run_id)
    if task and not task.done():
        task.cancel()

    run.status = "cancelled"
    run.current_step = "cancelled_by_user"
    run.logs = (run.logs or []) + [f"Workflow cancelled by user"]
    run.completed_at = datetime.now(timezone.utc)
    await session.commit()

    _active_runs.pop(run_id, None)
    return _run_dict(run)


@router.post("/runs/brainstorm")
async def start_brainstorm(req: RunBrainstormRequest, session: AsyncSession = Depends(get_session)):
    project = await session.get(Project, req.project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    run = WorkflowRun(
        id=gen_id(),
        project_id=req.project_id,
        workflow_type="brainstorm",
        status="running",
        current_step="brainstorm_expand",
    )
    session.add(run)
    await session.commit()

    task = asyncio.create_task(_run_brainstorm(run.id, project))
    _active_runs[run.id] = task

    return _run_dict(run)


@router.post("/runs/chapter")
async def start_chapter_run(req: RunChapterRequest, session: AsyncSession = Depends(get_session)):
    project = await session.get(Project, req.project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    book = await session.get(Book, req.book_id)
    if not book:
        raise HTTPException(404, "Book not found")
    chapter = await session.get(Chapter, req.chapter_id)
    if not chapter:
        raise HTTPException(404, "Chapter not found")

    run = WorkflowRun(
        id=gen_id(),
        project_id=req.project_id,
        book_id=req.book_id,
        chapter_id=req.chapter_id,
        workflow_type="chapter",
        status="running",
        current_step="assemble_context",
    )
    session.add(run)
    await session.commit()

    task = asyncio.create_task(_run_chapter(run.id, project, book, chapter))
    _active_runs[run.id] = task

    return _run_dict(run)


@router.post("/runs/book")
async def start_book_run(req: RunBookRequest, session: AsyncSession = Depends(get_session)):
    """Run all chapters in a book sequentially."""
    project = await session.get(Project, req.project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    book = await session.get(Book, req.book_id)
    if not book:
        raise HTTPException(404, "Book not found")

    result = await session.execute(
        select(Chapter).where(Chapter.book_id == req.book_id).order_by(Chapter.chapter_number)
    )
    chapters = result.scalars().all()
    if not chapters:
        raise HTTPException(400, "No chapters found in book")

    run = WorkflowRun(
        id=gen_id(),
        project_id=req.project_id,
        book_id=req.book_id,
        workflow_type="full_book",
        status="running",
        current_step=f"chapter_1_of_{len(chapters)}",
    )
    session.add(run)
    await session.commit()

    task = asyncio.create_task(_run_full_book(run.id, project, book, chapters))
    _active_runs[run.id] = task

    return _run_dict(run)


# ---------------------------------------------------------------------------
# RAG / Document Upload
# ---------------------------------------------------------------------------

@router.post("/projects/{project_id}/documents")
async def upload_document(
    project_id: str,
    doc_type: str = Form(...),
    doc_name: str = Form(""),
    content: str = Form(""),
    file: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(get_session),
):
    """Upload a document to RAG index. Accepts text content or file upload."""
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    if file:
        raw = await file.read()
        content = raw.decode("utf-8", errors="replace")
        doc_name = doc_name or file.filename or "uploaded_doc"

    if not content.strip():
        raise HTTPException(400, "No content provided")

    doc_id = gen_id()
    index_document(project_id, doc_type, doc_id, content, {"name": doc_name})

    return {"ok": True, "doc_id": doc_id, "doc_type": doc_type, "name": doc_name}


@router.get("/projects/{project_id}/rag/search")
async def rag_search(project_id: str, query: str, doc_type: Optional[str] = None):
    if doc_type:
        results = query_documents(project_id, doc_type, query, n_results=10)
    else:
        results = query_all_types(project_id, query, n_results=5)
    return results


# ---------------------------------------------------------------------------
# Background workflow runners
# ---------------------------------------------------------------------------

def _is_cancelled(run_id: str) -> bool:
    """Check if a run has been cancelled."""
    return run_id in _cancelled_runs


async def _run_brainstorm(run_id: str, project: Project):
    try:
        if _is_cancelled(run_id):
            return
        graph = build_brainstorm_graph()
        initial_state = {
            "project_id": project.id,
            "idea_text": project.idea_text or "",
            "genre": project.genre or "romance fantasy",
            "ship_vibes": project.ship_vibes or "",
            "existing_story_bible": project.story_bible or "",
            "existing_outline": "",
            "model_config": project.model_config_json or {},
            "series_concept": "",
            "world_building": "",
            "character_profiles": "",
            "series_arc": "",
            "book_outlines": "",
            "story_bible": "",
            "status": "starting",
            "logs": [],
        }

        result = await graph.ainvoke(initial_state)

        async with get_session_direct() as session:
            run = await session.get(WorkflowRun, run_id)
            if run:
                run.status = "completed"
                run.current_step = "done"
                run.logs = result.get("logs", [])
                run.completed_at = datetime.now(timezone.utc)

            p = await session.get(Project, project.id)
            if p:
                p.story_bible = result.get("story_bible", "")
                p.status = "brainstormed"

                # Index the generated bible
                if result.get("story_bible"):
                    index_document(p.id, "series_bible", "generated_bible", result["story_bible"])

            await session.commit()

    except asyncio.CancelledError:
        logger.info(f"Brainstorm run {run_id} was cancelled")
    except Exception as e:
        logger.exception(f"Brainstorm run {run_id} failed")
        async with get_session_direct() as session:
            run = await session.get(WorkflowRun, run_id)
            if run:
                run.status = "failed"
                run.error = str(e)
                run.logs = (run.logs or []) + [f"ERROR: {str(e)}"]
                await session.commit()
    finally:
        _active_runs.pop(run_id, None)
        _cancelled_runs.discard(run_id)


async def _run_chapter(run_id: str, project: Project, book: Book, chapter: Chapter):
    try:
        graph = build_chapter_graph()

        # Fetch previous chapter for context
        async with get_session_direct() as session:
            result = await session.execute(
                select(Chapter).where(
                    Chapter.book_id == book.id,
                    Chapter.chapter_number == chapter.chapter_number - 1,
                )
            )
            prev_chapter = result.scalar_one_or_none()

        initial_state = {
            "project_id": project.id,
            "book_id": book.id,
            "chapter_id": chapter.id,
            "chapter_number": chapter.chapter_number,
            "pov_character": chapter.pov_character or "",
            "plot_summary": chapter.plot_summary or "",
            "character_list": chapter.character_list or "",
            "location": chapter.location or "",
            "model_config": project.model_config_json or {},
            "previous_chapter_prose": prev_chapter.prose if prev_chapter else "",
            "previous_chapter_summary": prev_chapter.context_summary if prev_chapter else "",
            "voice_callsheet": "",
            "series_bible_excerpt": "",
            "ship_vibes": project.ship_vibes or "",
            "book_outline_excerpt": book.outline[:3000] if book.outline else "",
            "character_knowledge": prev_chapter.character_knowledge if prev_chapter else {},
            "scene_brief": "",
            "scene_brief_approved": False,
            "scene_brief_revision_count": 0,
            "scene_brief_review": "",
            "prose": "",
            "prose_approved": False,
            "prose_revision_count": 0,
            "prose_review": "",
            "metadata_yaml": "",
            "production_log": "",
            "context_summary": "",
            "word_count": 0,
            "status": "starting",
            "logs": [],
        }

        result = await graph.ainvoke(initial_state)

        async with get_session_direct() as session:
            run = await session.get(WorkflowRun, run_id)
            if run:
                run.status = "completed"
                run.current_step = "done"
                run.logs = result.get("logs", [])
                run.completed_at = datetime.now(timezone.utc)

            ch = await session.get(Chapter, chapter.id)
            if ch:
                ch.scene_brief = result.get("scene_brief", "")
                ch.prose = result.get("prose", "")
                ch.metadata_yaml = result.get("metadata_yaml", "")
                ch.production_log = result.get("production_log", "")
                ch.word_count = result.get("word_count", 0)
                ch.context_summary = result.get("context_summary", "")
                ch.scene_brief_revisions = result.get("scene_brief_revision_count", 0)
                ch.prose_revisions = result.get("prose_revision_count", 0)
                ch.status = "completed"

            await session.commit()

    except asyncio.CancelledError:
        logger.info(f"Chapter run {run_id} was cancelled")
    except Exception as e:
        logger.exception(f"Chapter run {run_id} failed")
        async with get_session_direct() as session:
            run = await session.get(WorkflowRun, run_id)
            if run:
                run.status = "failed"
                run.error = str(e)
                run.logs = (run.logs or []) + [f"ERROR: {str(e)}"]
                await session.commit()
    finally:
        _active_runs.pop(run_id, None)
        _cancelled_runs.discard(run_id)


async def _run_full_book(run_id: str, project: Project, book: Book, chapters: list):
    try:
        for i, chapter in enumerate(chapters):
            if _is_cancelled(run_id):
                return

            async with get_session_direct() as session:
                run = await session.get(WorkflowRun, run_id)
                if run:
                    run.current_step = f"chapter_{i + 1}_of_{len(chapters)}"
                    run.logs = (run.logs or []) + [f"Starting Chapter {chapter.chapter_number}"]
                    await session.commit()

            await _run_chapter(f"{run_id}_ch{chapter.chapter_number}", project, book, chapter)

        async with get_session_direct() as session:
            run = await session.get(WorkflowRun, run_id)
            if run:
                run.status = "completed"
                run.current_step = "done"
                run.completed_at = datetime.now(timezone.utc)
                await session.commit()

            b = await session.get(Book, book.id)
            if b:
                b.status = "completed"
                await session.commit()

    except asyncio.CancelledError:
        logger.info(f"Book run {run_id} was cancelled")
    except Exception as e:
        logger.exception(f"Book run {run_id} failed")
        async with get_session_direct() as session:
            run = await session.get(WorkflowRun, run_id)
            if run:
                run.status = "failed"
                run.error = str(e)
                await session.commit()
    finally:
        _active_runs.pop(run_id, None)
        _cancelled_runs.discard(run_id)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def get_session_direct():
    from app.database import async_session
    return async_session()

def _project_dict(p: Project) -> dict:
    return {
        "id": p.id, "name": p.name, "description": p.description,
        "series_name": p.series_name, "genre": p.genre, "input_type": p.input_type,
        "idea_text": p.idea_text, "story_bible": p.story_bible,
        "ship_vibes": p.ship_vibes, "status": p.status,
        "model_config": p.model_config_json,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }

def _book_dict(b: Book) -> dict:
    return {
        "id": b.id, "project_id": b.project_id, "title": b.title,
        "book_number": b.book_number, "outline": b.outline,
        "status": b.status, "created_at": b.created_at.isoformat() if b.created_at else None,
    }

def _chapter_dict(c: Chapter) -> dict:
    return {
        "id": c.id, "book_id": c.book_id, "chapter_number": c.chapter_number,
        "title": c.title, "pov_character": c.pov_character,
        "plot_summary": c.plot_summary, "character_list": c.character_list,
        "location": c.location, "scene_brief": c.scene_brief, "prose": c.prose,
        "metadata_yaml": c.metadata_yaml, "production_log": c.production_log,
        "word_count": c.word_count, "status": c.status,
        "scene_brief_revisions": c.scene_brief_revisions,
        "prose_revisions": c.prose_revisions,
        "context_summary": c.context_summary,
        "character_knowledge": c.character_knowledge,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }

def _run_dict(r: WorkflowRun) -> dict:
    return {
        "id": r.id, "project_id": r.project_id, "book_id": r.book_id,
        "chapter_id": r.chapter_id, "workflow_type": r.workflow_type,
        "status": r.status, "current_step": r.current_step,
        "logs": r.logs or [], "error": r.error,
        "started_at": r.started_at.isoformat() if r.started_at else None,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        "cancellable": r.status == "running",
    }

def _model_config_dict(m: ModelConfig) -> dict:
    return {
        "id": m.id, "name": m.name, "provider": m.provider,
        "model_id": m.model_id, "role": m.role,
        "temperature": m.temperature, "max_tokens": m.max_tokens,
        "is_default": m.is_default,
    }
