"""LangGraph workflow for novel production.

Supports multiple entry points:
- Full pipeline: idea → brainstorm → outline → chapters
- From outline: outline → chapters  
- Single chapter: chapter outline → scene brief → prose
"""
import json
import logging
from datetime import datetime, timezone
from typing import TypedDict, Annotated, Optional, Literal
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage
from app.prompts import (
    BRAINSTORMER_SYSTEM,
    ORCHESTRATOR_SYSTEM,
    SCENE_BRIEF_CREATOR_SYSTEM,
    PROSE_WRITER_SYSTEM,
)
from app.llm_providers import get_llm_for_role
from app.rag import query_documents, query_all_types, index_document

logger = logging.getLogger(__name__)

# Configurable max revision limits
MAX_BRIEF_REVISIONS = 3
MAX_PROSE_REVISIONS = 3


# ---------------------------------------------------------------------------
# State definitions
# ---------------------------------------------------------------------------

class BrainstormState(TypedDict):
    project_id: str
    idea_text: str
    genre: str
    ship_vibes: str
    existing_story_bible: str
    existing_outline: str
    model_config: dict
    # outputs
    series_concept: str
    world_building: str
    character_profiles: str
    series_arc: str
    book_outlines: str
    story_bible: str
    status: str
    logs: list[str]


class ChapterState(TypedDict):
    project_id: str
    book_id: str
    chapter_id: str
    chapter_number: int
    pov_character: str
    plot_summary: str
    character_list: str
    location: str
    model_config: dict
    # context
    previous_chapter_prose: str
    previous_chapter_summary: str
    voice_callsheet: str
    series_bible_excerpt: str
    ship_vibes: str
    book_outline_excerpt: str
    character_knowledge: dict
    # outputs
    scene_brief: str
    scene_brief_approved: bool
    scene_brief_revision_count: int
    scene_brief_review: str
    prose: str
    prose_approved: bool
    prose_revision_count: int
    prose_review: str
    metadata_yaml: str
    production_log: str
    context_summary: str
    word_count: int
    status: str
    logs: list[str]


# ---------------------------------------------------------------------------
# Brainstorm workflow nodes
# ---------------------------------------------------------------------------

async def brainstorm_expand(state: BrainstormState) -> dict:
    """Take an idea and expand it into a full series concept."""
    llm = await get_llm_for_role("brainstormer", state.get("model_config"))

    has_bible = bool(state.get("existing_story_bible", "").strip())
    has_outline = bool(state.get("existing_outline", "").strip())

    if has_bible and has_outline:
        prompt = f"""The author already has a detailed story bible and outline. Review and enhance them, filling any gaps.

## EXISTING STORY BIBLE:
{state['existing_story_bible']}

## EXISTING OUTLINE:
{state['existing_outline']}

## SHIP VIBES / INSPIRATION:
{state.get('ship_vibes', 'Not specified')}

## GENRE:
{state.get('genre', 'romance fantasy')}

Please review for completeness and produce:
1. A refined SERIES CONCEPT with logline
2. Any WORLD-BUILDING gaps to fill
3. CHARACTER PROFILES for all main characters (with voice notes for writing)
4. A SERIES ARC overview
5. Enhanced BOOK OUTLINES with chapter-by-chapter breakdown (chapter number, POV character, plot summary, characters present, location)

Maintain the author's creative vision. Fill gaps, don't override."""
    elif has_bible:
        prompt = f"""The author has a story bible but needs outlines generated.

## STORY BIBLE:
{state['existing_story_bible']}

## SHIP VIBES / INSPIRATION:
{state.get('ship_vibes', 'Not specified')}

## GENRE:
{state.get('genre', 'romance fantasy')}

Produce:
1. SERIES CONCEPT with logline
2. CHARACTER PROFILES with voice notes
3. SERIES ARC overview
4. Detailed BOOK OUTLINES with chapter-by-chapter breakdown (chapter number, POV character, plot summary, characters present, location)"""
    elif has_outline:
        prompt = f"""The author has outlines but needs world-building and character development.

## EXISTING OUTLINE:
{state['existing_outline']}

## SHIP VIBES / INSPIRATION:
{state.get('ship_vibes', 'Not specified')}

## GENRE:
{state.get('genre', 'romance fantasy')}

Produce:
1. SERIES CONCEPT with logline
2. WORLD-BUILDING foundation (magic system, politics, geography, cultures)
3. CHARACTER PROFILES with voice notes for each POV character
4. SERIES ARC overview
5. Enhanced BOOK OUTLINES preserving the existing structure"""
    else:
        prompt = f"""Expand this idea into a complete romance fantasy series:

## IDEA:
{state.get('idea_text', 'No idea provided')}

## SHIP VIBES / INSPIRATION:
{state.get('ship_vibes', 'Not specified')}

## GENRE:
{state.get('genre', 'romance fantasy')}

Produce a COMPLETE package:
1. SERIES CONCEPT — title, logline, genre blend, target audience, series length (aim for 4-5 books)
2. WORLD-BUILDING — magic system (rules, costs, limits), political structure, geography, cultures, economy
3. CHARACTER PROFILES — for each main couple and key supporting characters: name, role, backstory, personality, arc, voice notes
4. SERIES ARC — overarching plot across all books, escalation, thematic progression
5. BOOK OUTLINES — for each book: title, main couple, plot summary, then chapter-by-chapter breakdown with: chapter number, POV character, plot summary, characters present, location

Be bold and creative. Make this series feel fresh, compelling, and deeply romantic."""

    messages = [SystemMessage(content=BRAINSTORMER_SYSTEM), HumanMessage(content=prompt)]
    response = await llm.ainvoke(messages)
    content = response.content

    return {
        "story_bible": content,
        "book_outlines": content,
        "status": "brainstormed",
        "logs": state.get("logs", []) + [f"[{_now()}] Brainstorm complete"],
    }


async def brainstorm_refine(state: BrainstormState) -> dict:
    """Second pass: ensure outlines have chapter-level detail."""
    llm = await get_llm_for_role("brainstormer", state.get("model_config"))

    prompt = f"""Review the following brainstorm output and ensure every book has a DETAILED chapter-by-chapter outline.

Each chapter entry MUST have:
- Chapter number
- POV character  
- Plot summary (2-3 sentences)
- Characters present
- Location
- Key emotional beat

If any book is missing chapter-level detail, generate it now.

## BRAINSTORM OUTPUT:
{state.get('story_bible', '')}

Output the COMPLETE, refined story bible with all chapter outlines included."""

    messages = [SystemMessage(content=BRAINSTORMER_SYSTEM), HumanMessage(content=prompt)]
    response = await llm.ainvoke(messages)

    return {
        "story_bible": response.content,
        "book_outlines": response.content,
        "status": "refined",
        "logs": state.get("logs", []) + [f"[{_now()}] Brainstorm refined with chapter details"],
    }


# ---------------------------------------------------------------------------
# Chapter workflow nodes
# ---------------------------------------------------------------------------

async def assemble_context(state: ChapterState) -> dict:
    """Orchestrator: assemble context package for chapter production."""
    logs = list(state.get("logs", []))
    logs.append(f"[{_now()}] Assembling context for Chapter {state['chapter_number']}")

    # Pull relevant context from RAG
    project_id = state["project_id"]
    pov = state.get("pov_character", "")
    query = f"{pov} chapter {state['chapter_number']} {state.get('plot_summary', '')[:200]}"

    rag_context = query_all_types(project_id, query, n_results=3)
    extra_context_parts = []
    for doc_type, hits in rag_context.items():
        for hit in hits:
            extra_context_parts.append(f"[{doc_type}] {hit['content']}")

    # Build voice callsheet from RAG if not already provided
    voice = state.get("voice_callsheet", "")
    if not voice and pov:
        voice_hits = query_documents(project_id, "voice_callsheet", pov, n_results=5)
        if voice_hits:
            voice = "\n\n".join(h["content"] for h in voice_hits)

    # Build series bible excerpt from RAG if not provided
    bible = state.get("series_bible_excerpt", "")
    if not bible:
        bible_hits = query_documents(project_id, "series_bible", query, n_results=5)
        if bible_hits:
            bible = "\n\n".join(h["content"] for h in bible_hits)

    logs.append(f"[{_now()}] Context assembled: voice={'yes' if voice else 'no'}, bible={'yes' if bible else 'no'}, RAG chunks={len(extra_context_parts)}")

    return {
        "voice_callsheet": voice,
        "series_bible_excerpt": bible,
        "status": "context_assembled",
        "logs": logs,
    }


async def generate_scene_brief(state: ChapterState) -> dict:
    """Scene Brief Creator: generate the scene brief from chapter outline + context."""
    llm = await get_llm_for_role("scene_brief_creator", state.get("model_config"))

    context_parts = []
    context_parts.append(f"## Chapter {state['chapter_number']}")
    context_parts.append(f"**POV Character:** {state.get('pov_character', 'TBD')}")
    context_parts.append(f"**Plot Summary:** {state.get('plot_summary', 'TBD')}")
    context_parts.append(f"**Characters:** {state.get('character_list', 'TBD')}")
    context_parts.append(f"**Location:** {state.get('location', 'TBD')}")

    if state.get("previous_chapter_summary"):
        context_parts.append(f"\n## Previous Chapter Summary:\n{state['previous_chapter_summary']}")
    if state.get("previous_chapter_prose"):
        # Include last 500 chars of previous prose for continuity
        prev = state["previous_chapter_prose"]
        context_parts.append(f"\n## Previous Chapter Closing:\n...{prev[-2000:]}")
    if state.get("voice_callsheet"):
        context_parts.append(f"\n## Character Voice Callsheet:\n{state['voice_callsheet']}")
    if state.get("series_bible_excerpt"):
        context_parts.append(f"\n## Series Bible Excerpts:\n{state['series_bible_excerpt']}")
    if state.get("ship_vibes"):
        context_parts.append(f"\n## Ship Vibes:\n{state['ship_vibes']}")
    if state.get("book_outline_excerpt"):
        context_parts.append(f"\n## Book Outline Context:\n{state['book_outline_excerpt']}")
    if state.get("character_knowledge"):
        context_parts.append(f"\n## Character Knowledge Tracker:\n{json.dumps(state['character_knowledge'], indent=2)}")

    revision_note = ""
    if state.get("scene_brief_review") and state.get("scene_brief_revision_count", 0) > 0:
        revision_note = f"\n\n## REVISION REQUESTED — Address these issues:\n{state['scene_brief_review']}\n\n## PREVIOUS BRIEF (revise, don't start from scratch):\n{state.get('scene_brief', '')}"

    prompt = f"""Generate a COMPLETE scene brief for this chapter.{revision_note}

{'## CONTEXT:' if not revision_note else '## ORIGINAL CONTEXT:'}
{chr(10).join(context_parts)}

Generate the full scene brief now. ALL sections must be complete with specific, concrete content. No placeholders."""

    messages = [SystemMessage(content=SCENE_BRIEF_CREATOR_SYSTEM), HumanMessage(content=prompt)]
    response = await llm.ainvoke(messages)

    logs = list(state.get("logs", []))
    rev = state.get("scene_brief_revision_count", 0)
    logs.append(f"[{_now()}] Scene brief generated (revision {rev})")

    return {
        "scene_brief": response.content,
        "status": "brief_generated",
        "logs": logs,
    }


async def review_scene_brief(state: ChapterState) -> dict:
    """Orchestrator: review the scene brief for completeness and quality."""
    llm = await get_llm_for_role("orchestrator", state.get("model_config"))

    prompt = f"""Review this scene brief for Chapter {state['chapter_number']} ({state.get('pov_character', 'unknown')} POV).

## SCENE BRIEF:
{state.get('scene_brief', '')}

## CHAPTER OUTLINE:
POV: {state.get('pov_character', '')}
Plot: {state.get('plot_summary', '')}
Location: {state.get('location', '')}

## PREVIOUS CHAPTER SUMMARY:
{state.get('previous_chapter_summary', 'N/A (first chapter)')}

## SHIP VIBES:
{state.get('ship_vibes', 'Not specified')}

Revision count so far: {state.get('scene_brief_revision_count', 0)}

Review against ALL checklist items. Output your review as JSON:
{{
  "approved": true/false,
  "score": 0-100,
  "issues": ["list of specific issues found"],
  "suggestions": ["list of improvement suggestions"],
  "continuity_notes": "notes on continuity handling"
}}

If revision count is already 2+, approve with notes rather than requesting another revision."""

    messages = [SystemMessage(content=ORCHESTRATOR_SYSTEM), HumanMessage(content=prompt)]
    response = await llm.ainvoke(messages)

    content = response.content
    approved = False
    rev_count = state.get("scene_brief_revision_count", 0)

    # Force approve after max revisions
    if rev_count >= MAX_BRIEF_REVISIONS:
        approved = True
    else:
        try:
            # Try to parse JSON from response
            json_str = content
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            review_data = json.loads(json_str.strip())
            approved = review_data.get("approved", False)
        except (json.JSONDecodeError, IndexError):
            # If we can't parse, check for keywords
            approved = "approved" in content.lower() and "not approved" not in content.lower()

    logs = list(state.get("logs", []))
    logs.append(f"[{_now()}] Scene brief review: {'APPROVED' if approved else 'REVISION NEEDED'} (rev {rev_count})")

    return {
        "scene_brief_review": content,
        "scene_brief_approved": approved,
        "scene_brief_revision_count": rev_count + (0 if approved else 1),
        "status": "brief_approved" if approved else "brief_revision_needed",
        "logs": logs,
    }


def route_after_brief_review(state: ChapterState) -> str:
    """Route based on scene brief review result."""
    if state.get("scene_brief_approved", False):
        return "generate_prose"
    return "generate_scene_brief"


async def generate_prose(state: ChapterState) -> dict:
    """Prose Writer: generate prose from approved scene brief."""
    llm = await get_llm_for_role("prose_writer", state.get("model_config"))

    context_parts = []
    context_parts.append(f"## Approved Scene Brief:\n{state.get('scene_brief', '')}")

    if state.get("voice_callsheet"):
        context_parts.append(f"\n## Character Voice Callsheet ({state.get('pov_character', '')}):\n{state['voice_callsheet']}")
    if state.get("previous_chapter_prose"):
        prev = state["previous_chapter_prose"]
        context_parts.append(f"\n## Previous Chapter Prose (last section for continuity):\n...{prev[-3000:]}")
    if state.get("series_bible_excerpt"):
        context_parts.append(f"\n## Series Bible Reference:\n{state['series_bible_excerpt']}")
    if state.get("ship_vibes"):
        context_parts.append(f"\n## Ship Vibes to Honor:\n{state['ship_vibes']}")

    revision_note = ""
    if state.get("prose_review") and state.get("prose_revision_count", 0) > 0:
        revision_note = f"\n\n## REVISION REQUESTED — Address these issues:\n{state['prose_review']}\n\n## PREVIOUS PROSE (revise flagged sections, keep working parts):\n{state.get('prose', '')}"

    prompt = f"""Write the complete prose for Chapter {state['chapter_number']}, {state.get('pov_character', '')} POV.{revision_note}

{chr(10).join(context_parts)}

Write the FULL scene now. First person present tense. Deep POV. Minimum 1500-2500 words.
Follow the scene brief structure. Make this publication-ready."""

    messages = [SystemMessage(content=PROSE_WRITER_SYSTEM), HumanMessage(content=prompt)]
    response = await llm.ainvoke(messages)

    prose = response.content
    word_count = len(prose.split())

    logs = list(state.get("logs", []))
    rev = state.get("prose_revision_count", 0)
    logs.append(f"[{_now()}] Prose generated: {word_count} words (revision {rev})")

    return {
        "prose": prose,
        "word_count": word_count,
        "status": "prose_generated",
        "logs": logs,
    }


async def review_prose(state: ChapterState) -> dict:
    """Orchestrator: review prose for voice consistency and quality."""
    llm = await get_llm_for_role("orchestrator", state.get("model_config"))

    prompt = f"""Review this prose for Chapter {state['chapter_number']} ({state.get('pov_character', '')} POV).

## PROSE:
{state.get('prose', '')}

## SCENE BRIEF (requirements to verify):
{state.get('scene_brief', '')[:3000]}

## CHARACTER VOICE CALLSHEET:
{state.get('voice_callsheet', 'Not available')[:2000]}

## SHIP VIBES:
{state.get('ship_vibes', 'Not specified')}

Word count: {state.get('word_count', 0)}
Revision count so far: {state.get('prose_revision_count', 0)}

Review against ALL prose checklist items. Output as JSON:
{{
  "approved": true/false,
  "score": 0-100,
  "issues": ["specific issues with line references"],
  "suggestions": ["improvement suggestions"],
  "voice_consistency": "assessment of voice match",
  "continuity_notes": "continuity assessment",
  "summary": "2-3 sentence summary of this chapter for next chapter context"
}}

If revision count is 2+, approve with notes."""

    messages = [SystemMessage(content=ORCHESTRATOR_SYSTEM), HumanMessage(content=prompt)]
    response = await llm.ainvoke(messages)

    content = response.content
    approved = False
    summary = ""
    rev_count = state.get("prose_revision_count", 0)

    if rev_count >= MAX_PROSE_REVISIONS:
        approved = True

    try:
        json_str = content
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0]
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0]
        review_data = json.loads(json_str.strip())
        approved = approved or review_data.get("approved", False)
        summary = review_data.get("summary", "")
    except (json.JSONDecodeError, IndexError):
        if not approved:
            approved = "approved" in content.lower() and "not approved" not in content.lower()

    logs = list(state.get("logs", []))
    logs.append(f"[{_now()}] Prose review: {'APPROVED' if approved else 'REVISION NEEDED'} (rev {rev_count})")

    return {
        "prose_review": content,
        "prose_approved": approved,
        "prose_revision_count": rev_count + (0 if approved else 1),
        "context_summary": summary,
        "status": "prose_approved" if approved else "prose_revision_needed",
        "logs": logs,
    }


def route_after_prose_review(state: ChapterState) -> str:
    """Route based on prose review result."""
    if state.get("prose_approved", False):
        return "finalize_chapter"
    return "generate_prose"


async def finalize_chapter(state: ChapterState) -> dict:
    """Orchestrator: finalize chapter with metadata and storage."""
    now = _now()

    metadata = {
        "chapter": state["chapter_number"],
        "pov": state.get("pov_character", ""),
        "book_id": state.get("book_id", ""),
        "project_id": state["project_id"],
        "production_date": now,
        "status": "final",
        "scene_brief": {
            "revision_count": state.get("scene_brief_revision_count", 0),
            "status": "approved",
        },
        "prose": {
            "word_count": state.get("word_count", 0),
            "revision_count": state.get("prose_revision_count", 0),
            "status": "final",
        },
    }

    import yaml
    metadata_yaml = yaml.dump(metadata, default_flow_style=False)

    production_log = f"""## Chapter {state['chapter_number']} - {state.get('pov_character', 'Unknown')}

**Production Date**: {now}
**Status**: Finalized

### Scene Brief
- Revisions: {state.get('scene_brief_revision_count', 0)}
- Status: Approved

### Prose
- Word Count: {state.get('word_count', 0)}
- Revisions: {state.get('prose_revision_count', 0)}
- Status: Final

### Context Summary
{state.get('context_summary', 'No summary generated.')}
"""

    # Index into RAG for future chapter context
    project_id = state["project_id"]
    chapter_id = state.get("chapter_id", f"ch_{state['chapter_number']}")

    if state.get("prose"):
        index_document(project_id, "chapter_prose", chapter_id, state["prose"], {
            "chapter_number": state["chapter_number"],
            "pov_character": state.get("pov_character", ""),
        })
    if state.get("scene_brief"):
        index_document(project_id, "chapter_brief", chapter_id, state["scene_brief"], {
            "chapter_number": state["chapter_number"],
            "pov_character": state.get("pov_character", ""),
        })

    logs = list(state.get("logs", []))
    logs.append(f"[{now}] Chapter {state['chapter_number']} FINALIZED — {state.get('word_count', 0)} words")

    return {
        "metadata_yaml": metadata_yaml,
        "production_log": production_log,
        "status": "completed",
        "logs": logs,
    }


# ---------------------------------------------------------------------------
# Graph builders
# ---------------------------------------------------------------------------

def build_brainstorm_graph() -> StateGraph:
    """Build the brainstorm workflow graph."""
    graph = StateGraph(BrainstormState)

    graph.add_node("brainstorm_expand", brainstorm_expand)
    graph.add_node("brainstorm_refine", brainstorm_refine)

    graph.set_entry_point("brainstorm_expand")
    graph.add_edge("brainstorm_expand", "brainstorm_refine")
    graph.add_edge("brainstorm_refine", END)

    return graph.compile()


def build_chapter_graph() -> StateGraph:
    """Build the chapter production workflow graph."""
    graph = StateGraph(ChapterState)

    graph.add_node("assemble_context", assemble_context)
    graph.add_node("generate_scene_brief", generate_scene_brief)
    graph.add_node("review_scene_brief", review_scene_brief)
    graph.add_node("generate_prose", generate_prose)
    graph.add_node("review_prose", review_prose)
    graph.add_node("finalize_chapter", finalize_chapter)

    graph.set_entry_point("assemble_context")
    graph.add_edge("assemble_context", "generate_scene_brief")
    graph.add_edge("generate_scene_brief", "review_scene_brief")
    graph.add_conditional_edges(
        "review_scene_brief",
        route_after_brief_review,
        {"generate_prose": "generate_prose", "generate_scene_brief": "generate_scene_brief"},
    )
    graph.add_edge("generate_prose", "review_prose")
    graph.add_conditional_edges(
        "review_prose",
        route_after_prose_review,
        {"finalize_chapter": "finalize_chapter", "generate_prose": "generate_prose"},
    )
    graph.add_edge("finalize_chapter", END)

    return graph.compile()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
