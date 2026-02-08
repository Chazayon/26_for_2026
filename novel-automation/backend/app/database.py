import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, relationship
from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def gen_id():
    return str(uuid.uuid4())


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    series_name = Column(String, default="")
    genre = Column(String, default="romance fantasy")
    input_type = Column(String, default="idea")  # idea | outline | story_bible
    idea_text = Column(Text, default="")
    story_bible = Column(Text, default="")
    ship_vibes = Column(Text, default="")
    model_config_json = Column(JSON, default=dict)
    status = Column(String, default="created")  # created | brainstorming | outlining | writing | completed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    books = relationship("Book", back_populates="project", cascade="all, delete-orphan")


class Book(Base):
    __tablename__ = "books"

    id = Column(String, primary_key=True, default=gen_id)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    book_number = Column(Integer, default=1)
    outline = Column(Text, default="")
    series_bible_excerpt = Column(Text, default="")
    status = Column(String, default="created")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="books")
    chapters = relationship("Chapter", back_populates="book", cascade="all, delete-orphan")


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(String, primary_key=True, default=gen_id)
    book_id = Column(String, ForeignKey("books.id"), nullable=False)
    chapter_number = Column(Integer, nullable=False)
    title = Column(String, default="")
    pov_character = Column(String, default="")
    plot_summary = Column(Text, default="")
    character_list = Column(Text, default="")
    location = Column(String, default="")
    scene_brief = Column(Text, default="")
    prose = Column(Text, default="")
    metadata_yaml = Column(Text, default="")
    production_log = Column(Text, default="")
    word_count = Column(Integer, default=0)
    status = Column(String, default="pending")  # pending | brief_generating | brief_review | prose_generating | prose_review | completed
    scene_brief_revisions = Column(Integer, default=0)
    prose_revisions = Column(Integer, default=0)
    context_summary = Column(Text, default="")
    character_knowledge = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    book = relationship("Book", back_populates="chapters")


class VoiceCallsheet(Base):
    __tablename__ = "voice_callsheets"

    id = Column(String, primary_key=True, default=gen_id)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    character_name = Column(String, nullable=False)
    content = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id = Column(String, primary_key=True, default=gen_id)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    book_id = Column(String, nullable=True)
    chapter_id = Column(String, nullable=True)
    workflow_type = Column(String, nullable=False)  # brainstorm | outline | chapter | full_book
    status = Column(String, default="running")  # running | completed | failed | paused
    current_step = Column(String, default="")
    logs = Column(JSON, default=list)
    error = Column(Text, default="")
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)


class ModelConfig(Base):
    __tablename__ = "model_configs"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False, unique=True)
    provider = Column(String, nullable=False)  # openrouter | ollama
    model_id = Column(String, nullable=False)
    role = Column(String, nullable=False)  # brainstormer | orchestrator | scene_brief_creator | prose_writer
    temperature = Column(String, default="0.7")
    max_tokens = Column(Integer, default=4096)
    is_default = Column(Integer, default=0)


class ProviderConfig(Base):
    __tablename__ = "provider_configs"

    provider_name = Column(String, primary_key=True)  # openai | anthropic | gemini | openrouter | ollama | etc.
    api_key = Column(String, nullable=True)
    base_url = Column(String, nullable=True)
    model_list = Column(JSON, default=list)  # Cache of available models
    is_enabled = Column(Integer, default=1)



async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        from sqlalchemy import select
        result = await session.execute(select(ModelConfig).limit(1))
        if result.scalar_one_or_none() is None:
            defaults = [
                ModelConfig(
                    id=gen_id(),
                    name="Brainstormer (OpenRouter)",
                    provider="openrouter",
                    model_id="anthropic/claude-sonnet-4",
                    role="brainstormer",
                    temperature="0.8",
                    max_tokens=8192,
                    is_default=1,
                ),
                ModelConfig(
                    id=gen_id(),
                    name="Orchestrator (OpenRouter)",
                    provider="openrouter",
                    model_id="anthropic/claude-sonnet-4",
                    role="orchestrator",
                    temperature="0.5",
                    max_tokens=4096,
                    is_default=1,
                ),
                ModelConfig(
                    id=gen_id(),
                    name="Scene Brief Creator (OpenRouter)",
                    provider="openrouter",
                    model_id="anthropic/claude-sonnet-4",
                    role="scene_brief_creator",
                    temperature="0.7",
                    max_tokens=8192,
                    is_default=1,
                ),
                ModelConfig(
                    id=gen_id(),
                    name="Prose Writer (OpenRouter)",
                    provider="openrouter",
                    model_id="anthropic/claude-sonnet-4",
                    role="prose_writer",
                    temperature="0.85",
                    max_tokens=8192,
                    is_default=1,
                ),
            ]
            session.add_all(defaults)
            
            # Initialize default providers
            providers = [
                ProviderConfig(provider_name="openrouter", is_enabled=1),
                ProviderConfig(provider_name="ollama", base_url="http://localhost:11434", is_enabled=1),
                ProviderConfig(provider_name="openai", is_enabled=0),
                ProviderConfig(provider_name="anthropic", is_enabled=0),
                ProviderConfig(provider_name="gemini", is_enabled=0),
            ]
            session.add_all(providers)
            
            await session.commit()


async def get_session():
    async with async_session() as session:
        yield session
