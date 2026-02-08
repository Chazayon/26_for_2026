# Novel Automation Studio

A **LangGraph-powered** novel production pipeline with a beautiful web UI. Takes your book idea — from a single sentence to a full story bible — and automates the journey to a finished novel.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│  Dashboard → Project → Books → Chapters → Prose      │
│  Settings: Model configs per agent role               │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────┴──────────────────────────────┐
│                  Backend (FastAPI)                     │
│  ┌─────────────────────────────────────────────┐     │
│  │           LangGraph Workflows                │     │
│  │                                              │     │
│  │  Brainstorm ─→ Outline ─→ Scene Brief ─→ Prose   │
│  │       ↑              ↑ review loop    ↑ review    │
│  │  Brainstormer    Orchestrator    Orchestrator     │
│  └─────────────────────────────────────────────┘     │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  SQLite   │  │ ChromaDB │  │  LLM Providers   │   │
│  │ (projects │  │  (RAG)   │  │ OpenRouter+Ollama│   │
│  │  chapters)│  │          │  │                  │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Features

- **Versatile Input**: Start from a one-sentence idea, an outline, or a complete story bible
- **Multi-Agent LangGraph Pipeline**:
  - **Brainstormer**: Expands ideas into series concepts, world-building, character profiles, and chapter outlines
  - **Orchestrator**: Manages quality control, continuity, and workflow coordination
  - **Scene Brief Creator**: Transforms outlines into detailed 25+ beat scene briefs
  - **Prose Writer**: Generates publication-ready first-person present tense prose
- **Review Loops**: Orchestrator reviews scene briefs and prose with automatic revision cycles
- **Flexible Model Selection**: Use different AI models for different agent roles
  - **OpenRouter**: Access Claude, GPT-4o, Gemini, Llama, Mistral, DeepSeek, etc.
  - **Ollama**: Run local models for privacy and cost savings
- **RAG System**: ChromaDB-powered retrieval for series bibles, voice callsheets, and chapter context
- **Continuity Management**: Previous chapter context flows automatically to the next
- **Character Voice Callsheets**: Maintain distinct character voices across the entire novel
- **Beautiful Web UI**: Modern React dashboard with project management, chapter reader/editor, workflow monitoring
- **100% Local**: SQLite database, local ChromaDB, local file output — your data stays on your machine

## Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- An **OpenRouter API key** ([get one here](https://openrouter.ai/keys)) and/or **Ollama** running locally

### 1. Backend Setup

```bash
cd novel-automation/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY

# Start the server
python main.py
```

The API will be running at `http://localhost:8000`.

### 2. Frontend Setup

```bash
cd novel-automation/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The UI will be at `http://localhost:3000`.

### 3. (Optional) Ollama for Local Models

```bash
# Install Ollama: https://ollama.ai
# Pull a model
ollama pull llama3.1:8b

# Ollama runs on http://localhost:11434 by default
# The app will auto-detect available models
```

## Workflow

### From a One-Sentence Idea

1. **Create Project** → choose "Start from an Idea" → enter your concept
2. **Brainstorm** → AI generates series concept, world-building, characters, and chapter outlines
3. **Add Books & Chapters** from the generated outlines
4. **Run Chapter** or **Run Book** → generates scene briefs and prose with quality reviews
5. **Read & Edit** the generated prose in the chapter viewer

### From an Existing Outline

1. **Create Project** → choose "I Have an Outline"
2. **Add Books** → paste your chapter-by-chapter outline
3. **Add Chapters** with POV character, plot summary, location
4. **Upload** your story bible and voice callsheets
5. **Run** → the pipeline handles scene briefs, reviews, and prose generation

### Model Configuration

Go to **Settings** to configure which model powers each agent:

| Agent Role | Recommended Temperature | Best For |
|---|---|---|
| Brainstormer | 0.8 | Creative, expansive models |
| Orchestrator | 0.5 | Precise, analytical models |
| Scene Brief Creator | 0.7 | Balanced creativity + structure |
| Prose Writer | 0.85 | Creative, literary models |

## Project Structure

```
novel-automation/
├── backend/
│   ├── app/
│   │   ├── api.py          # FastAPI REST endpoints
│   │   ├── config.py       # Settings and environment
│   │   ├── database.py     # SQLite models (SQLAlchemy)
│   │   ├── llm_providers.py # OpenRouter + Ollama abstraction
│   │   ├── prompts.py      # Agent system prompts
│   │   ├── rag.py          # ChromaDB RAG system
│   │   └── workflow.py     # LangGraph state machines
│   ├── main.py             # FastAPI entry point
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api.js          # API client
│   │   ├── App.jsx         # Router
│   │   ├── components/
│   │   │   └── Layout.jsx  # Sidebar layout
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── NewProject.jsx
│   │       ├── ProjectView.jsx
│   │       ├── ChapterView.jsx
│   │       ├── Settings.jsx
│   │       └── WorkflowRuns.jsx
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/:id` | Get project details |
| POST | `/api/projects/:id/books` | Add a book |
| POST | `/api/projects/:pid/books/:bid/chapters` | Add a chapter |
| POST | `/api/projects/:id/callsheets` | Add voice callsheet |
| POST | `/api/projects/:id/documents` | Upload to RAG index |
| GET | `/api/models/configs` | List model configurations |
| GET | `/api/models/available` | List available models |
| POST | `/api/runs/brainstorm` | Start brainstorm workflow |
| POST | `/api/runs/chapter` | Generate a single chapter |
| POST | `/api/runs/book` | Generate all chapters in a book |
| GET | `/api/runs/:id` | Get workflow run status + logs |

## Extending

- **RAG**: Upload any document (series bible, research, reference prose) via the documents endpoint
- **New Agent Roles**: Add entries to `prompts.py` and `workflow.py`
- **Custom Workflows**: Build new LangGraph state machines in `workflow.py`
- **Export**: Chapters are stored in the database and can be exported as markdown files
