# AUTOMATED BOOK PRODUCTION WORKFLOW

## System Overview

This automated workflow produces complete romance fantasy chapters using three cooperating agents:

1. **Orchestrator** — Manages workflow, ensures quality and continuity
2. **Scene Brief Creator** — Transforms outlines into detailed scene briefs  
3. **Prose Writer** — Converts scene briefs into publication-ready prose

**Key Feature:** Each completed chapter becomes context for the next, ensuring **continuity throughout the book**.

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     INPUT: Chapter Outline                   │
│   (from book outline: plot summary, POV, characters)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR                             │
│   • Loads previous chapter (if exists)                       │
│   • Retrieves character voice call sheet                     │
│   • Assembles context package                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 SCENE BRIEF CREATOR                          │
│INPUT:                                                         │
│   • Chapter outline                                           │
│   • Previous chapter summary                                  │
│   • Character voice call sheet                                │
│   • Series Bible excerpts                                     │
│                                                               │
│OUTPUT:                                                        │
│   • Complete scene brief (all sections filled)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                              │
│   • Reviews scene brief for completeness                      │
│   • Checks continuity references                              │
│   • Approves or requests revision                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     PROSE WRITER                             │
│INPUT:                                                         │
│   • Approved scene brief                                      │
│   • Character voice call sheet                                │
│   • Previous chapter prose (full text)                        │
│   • Ship vibes reference                                      │
│                                                               │
│OUTPUT:                                                        │
│   • Published-ready prose (1500-2500+ words)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                              │
│   • Reviews prose for voice consistency                       │
│   • Verifies scene brief requirements met                     │
│   • Checks continuity maintained                              │
│   • Approves or requests revision                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  OUTPUT: Completed Chapter                    │
│   • Stored in Production_Context/Series/Book/Chapter/        │
│   • Available as context for next chapter                     │
│   • Production log updated                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
Series_Bucket_1/
├─ Automation/
│  ├─ ORCHESTRATOR_AGENT.md
│  ├─ SCENE_BRIEF_CREATOR_AGENT.md
│  ├─ PROSE_WRITER_AGENT.md
│  └─ CHARACTER_VOICE_CALLSHEET_SYSTEM.md
│
├─ Character_Voice_Callsheets/
│  ├─ Series_1_Sanctuary/
│  │  ├─ VoiceCallSheet_KaelDarkhaven_Sanctuary.md
│  │  ├─ VoiceCallSheet_LyraMoonshadow_Sanctuary.md
│  │  └─ [Additional character call sheets]
│  ├─ Series_2_Pactbound/
│  ├─ Series_3_GildedShadows/
│  ├─ Series_4_CourtsOfAsh/
│  └─ Series_5_RescueMage/
│
├─ Production_Context/
│  ├─ Sanctuary_of_the_Damned/
│  │  ├─ Book_1_Healer_and_Warden/
│  │  │  ├─ Chapter_01/
│  │  │  │  ├─ scene_brief.md
│  │  │  │  ├─ prose.md
│  │  │  │  ├─ metadata.yaml
│  │  │  │  └─ production_log.md
│  │  │  ├─ Chapter_02/
│  │  │  └─ [etc.]
│  │  ├─ Book_2_Assassin_and_Archivist/
│  │  └─ [etc.]
│  └─ [Other series]
│
├─ Sancturay_of_the_Damned/
│  ├─ sanctuary_damned_series_bible.md
│  ├─ sanctuary_damned_drafting_toolkit.md
│  ├─ book_1_npe_outline.md
│  └─ [etc.]
│
└─ Idea.md
```

---

## Context Management System

### How Continuity Is Maintained

#### Previous Chapter Context Package

For each new chapter, the Orchestrator assembles:

```yaml
previous_chapter:
  chapter_number: [N-1]
  pov_character: [Name]
  
  closing_moment:
    emotional_state: [How character felt at end]
    physical_state: [Injuries, location, etc.]
    relationship_status: [What changed between characters]
    unresolved_tensions: [What threads continue]
  
  plot_threads:
    resolved: [What was settled]
    ongoing: [What's still active  
    planted: [Seeds for future]
  
  revelations:
    to_pov_character: [What they learned]
    to_reader_only: [What reader knows but character doesn't]
  
  full_prose: [Attached as file or text]
```

#### Character Knowledge Tracker

Tracks what each character knows across chapters:

```yaml
character_knowledge:
  Kael:
    chapter_1: [List of knowledge]
    chapter_2: [Added knowledge]
    chapter_3: [Added knowledge]
  
  Lyra:
    chapter_1: [List of knowledge]
    chapter_2: [Added knowledge]
```

This prevents characters magically knowing things they shouldn't.

---

## Production Process: Step-by-Step

### Phase 1: Initialization

**Orchestrator Tasks:**
1. Load chapter outline from book outline file
2. Identify POV character
3. Load character voice call sheet
4. Retrieve previous chapter (if exists)  
5. Extract relevant Series Bible sections
6. Create context package

**Deliverables:**
- Context package assembled
- Ready for Scene Brief Creator

---

### Phase 2: Scene Brief Generation

**Scene Brief Creator Tasks:**
1. Read chapter outline
2. Review previous chapter context
3. Reference character voice call sheet
4. Reference ship vibes from Idea.md
5. Generate complete scene brief per structure

**Required Sections (Must All Be Complete):**
- Core Identifiers
- Plot & Structure (with 3 opening hook options)
- Action Beats (10-15, plot only)
- Emotional Architecture (5-8 beats)
- Character Details (outfits, states, goals)
- Setting & Atmosphere (5 senses minimum)
- Daily Life Details (meal/food element required)
- Conflict & Stakes
- Narrative Function & Style
- World-Building Integration
- Symbolism & Theme
- Reveals & Information
- Continuity & Connections (callbacks to previous)
- Technical Considerations
- Other Notes

**Quality Checks:**
- All sections filled (no placeholders)
- Action beats are pure action (no dialogue)
- Sensory environment engages 3+ senses
- Ticking clock established
- Continuity callbacks present
- Ship vibes honored

**Deliverables:**
- Complete scene brief document
- Saved to Production_Context/[Series]/[Book]/[Chapter]/scene_brief.md

---

### Phase 3: Scene Brief Review

**Orchestrator Tasks:**
1. Review scene brief against checklist
2. Verify all required sections present
3. Check continuity references
4. Confirm ship vibes honored
5. Approve OR flag gaps and request revision

**If Revision Needed:**
- Specify missing sections
- Note continuity gaps
- Return to Scene Brief Creator

**If Approved:**
- Mark scene brief as approved
- Proceed to prose generation

---

### Phase 4: Prose Generation

**Prose Writer Tasks:**
1. Read approved scene brief
2. Read character voice call sheet
3. Read previous chapter prose (full)
4. Reference ship vibes
5. Write scene in character voice

**Requirements:**
- First person present tense, deep POV
- 1500-2500+ words (2500-3750 for spice scenes)
- Scene opening grounds reader + references previous chapter
- Emotional journey follows scene brief
- Voice matches call sheet markers
- Scene closing has maximum impact
- Seeds next scene/POV

**Voice Consistency Markers (Every 2-3 Paragraphs):**

**For Kael:**
- Sensory hyperawareness
- Threat assessment
- Shadow/cold imagery
- Sparse language
- Self-denial patterns

**For Lyra:**
- Sensory details (touch/warmth)
- Emotional awareness
- Healing metaphors
- Gentle firmness
- "I see you" energy

**Deliverables:**
- Complete prose document
- Saved to Production_Context/[Series]/[Book]/[Chapter]/prose.md

---

### Phase 5: Prose Review

**Orchestrator Tasks:**
1. Review prose against character voice call sheet
2. Check scene brief requirements met
3. Verify continuity maintained
4. Confirm word count appropriate
5. Approve OR flag voice drift and request revision

**Voice Drift Indicators:**
- Could swap character name and still work
- Missing characteristic metaphors
- Generic instead of specific
- Sentence rhythm wrong
- Emotional processing doesn't match

**If Revision Needed:**
- Flag specific passages
- Reference call sheet sections
- Provide examples
- Return to Prose Writer

**If Approved:**
- Mark prose as final
- Proceed to storage and logging

---

### Phase 6: Finalization & Storage

**Orchestrator Tasks:**
1. Create metadata file
2. Update production log
3. Store chapter for future context
4. Prepare summary for next chapter

**Metadata File (metadata.yaml):**
```yaml
chapter: 1
pov: Kael Darkhaven
book: The Healer & The Warden
series: Sanctuary of the Damned
production_date: 2026-02-03
status: final

scene_brief:
  file: scene_brief.md
  revision_count: 0
  status: approved

prose:
  file: prose.md
  word_count: 2347
  revision_count: 1
  status: final

continuity:
  previous_chapter: none (first chapter)
  references_planted: ["Lyra's illegal clinic", "Kael's shadow corruption"]
  
quality_checks:
  voice_consistency: passed
  continuity: passed
  scene_objectives: passed
  all_requirements: passed
```

**Production Log Entry:**
```markdown
## Chapter 1 - Kael Darkhaven

**Production Date**: 2026-02-03
**Status**: Finalized

### Scene Brief
- Created: 2026-02-03 10:23
- Revisions: 0
- Status: Approved

### Prose
- Created: 2026-02-03 11:45
- Revisions: 1 (voice tightening in paragraphs 12-15)
- Word Count: 2,347
- Status: Final

### Notes
Strong opening. Kael's voice consistent. Shadow imagery effective. Continuity N/A (first chapter). Seeds planted for Chapter 2 (Lyra POV).
```

**Context Package for Next Chapter:**
Extract and save summary for handoff to Chapter 2.

---

## Using the System: Practical Guide

### To Produce a Chapter

#### Step 1: Prepare Input

```markdown
CHAPTER INPUT:
- Chapter Number: 1
- POV Character: Kael Darkhaven
- Plot Summary: [From book_1_npe_outline.md]
- Character List: Kael, Lyra, Warden-Commander (mentioned)
- Location: Underground clinic, Vein Markets
- Previous Chapter: None (first chapter)
```

#### Step 2: Invoke Orchestrator

Orchestrator loads:
- book_1_npe_outline.md (chapter 1 section)
- VoiceCallSheet_KaelDarkhaven_Sanctuary.md
- sanctuary_damned_series_bible.md (relevant excerpts)
- Idea.md (Astarion × Tav + Husk × Angel Dust vibes)
- Previous chapter: N/A

Orchestrator assembles context package and sends to Scene Brief Creator.

#### Step 3: Scene Brief Creator Generates Brief

Input received, processed, scene brief generated per structure.

Output: `scene_brief.md` with all sections filled.

#### Step 4: Orchestrator Reviews

Checks completeness → Approved → Send to Prose Writer

#### Step 5: Prose Writer Generates Prose

Input received:
- Approved scene brief
- Kael's voice call sheet
- Previous chapter prose: N/A
- Ship vibes: Astarion × Tav, Husk × Angel Dust

Output: `prose.md`, 2,347 words, first person present tense, Kael's voice

#### Step 6: Orchestrator Reviews

Voice check → Approved → Finalize

#### Step 7: Storage

Files created:
```
Production_Context/Sanctuary_of_the_Damned/Book_1_Healer_and_Warden/Chapter_01/
├─ scene_brief.md
├─ prose.md
├─ metadata.yaml
└─ production_log.md
```

Chapter 1 complete. Ready for Chapter 2.

---

## Continuity in Action: Example

### Chapter 1 (Kael POV) Closing:
*"I close the door behind her. My shadows are still trembling. And I know—absolutely know—I'm going to see her again. Even if it destroys us both."*

**Orchestrator extracts:**
- Emotional state: Kael is rattled, attracted, terrified
- Plot thread: Will see Lyra again
- Relationship: Mutual attraction acknowledged (by him)
- Seed: "destroys us both" = foreshadowing

### Chapter 2 (Lyra POV) Opening Hook Options (from Scene Brief):

1. *"Three days since the Warden showed up bleeding in my clinic. Three days, and I can still feel the cold of his skin under my palms."*

2. *"I tell myself I'm not waiting to see him again. I tell myself I'm just doing my work, healing the people who need me. I'm very good at lying to myself."*

3. *"When he walks back through my clinic door, I'm not surprised. Terrified, yes. Surprised, no. I knew he'd come back. I just didn't know it would feel like coming home."*

**All three options:**
- Reference the previous scene (Kael in clinic)
- Show emotional carryover (can't stop thinking about him)
- Lyra's voice (sensory, honest, gentle)
- Continue plot thread (he returns)

---

## Quality Assurance Across the System

### Orchestrator Checkpoints:

**Scene Brief Review:**
- [ ] All required sections present
- [ ] Action beats pure plot
- [ ] Emotional beats mapped
- [ ] Sensory environment detailed (5 senses)
- [ ] Continuity callbacks included
- [ ] Ship vibes honored

**Prose Review:**
- [ ] First person present tense maintained
- [ ] POV voice matches call sheet
- [ ] Scene objectives met
- [ ] Continuity references present
- [ ] Word count appropriate
- [ ] Closing impact strong

---

## Scaling to 26 Books

### Series-Level Tracking

For multi-book series, Orchestrator maintains:

**Series Continuity Tracker:**
```yaml
series: Sanctuary of the Damned
books: 5

world_state:
  book_1: Contract system intact, resistance underground
  book_2: Archive fire, evidence leaking
  book_3: Open revolt beginning
  book_4: Civil war
  book_5: New order established

character_arcs:
  Kael_and_Lyra:
    book_1: Falling in love, first HEA
    book_2: Resistance leaders (supporting roles)
    book_3: Mentors (cameo)
    book_4: Military strategists
    book_5: Council founders

magic_reveals:
  book_1: Wild magic disrupts Obedience Marks
  book_2: Contract forgery widespread
  book_3: Noble contracts exist
  book_4: Gods created the system
  book_5: Consensual bonds stronger
```

This ensures book-to-book consistency even with new main couples.

---

## Emergency Procedures

### If Scene Brief Is Incomplete

1. Orchestrator flags missing sections
2. Lists specifically what's needed
3. Returns to Scene Brief Creator with notes
4. DO NOT proceed to prose until complete

### If Prose Voice Drifts

1. Orchestrator flags specific passages
2. References call sheet sections that were missed
3. Provides examples of what voice should sound like
4. Returns to Prose Writer for revision
5. Re-reviews after revision

### If Continuity Breaks

1. Orchestrator identifies contradiction
2. References previous chapter specifics
3. Requests specific additions/changes
4. Verifies fix before approving

---

## Success Metrics

A well-functioning automation produces chapters that:

✅ Voice is unmistakably character-specific  
✅ Continuity is seamless (no forgotten threads)  
✅ Ship vibes are authentically honored  
✅ Scene briefs are complete and actionable  
✅ Prose is publication-ready (minimal editing needed)  
✅ Readers can't tell it was systematized  

**Goal:** Consistent quality at high volume = 26 books in 2026

---

## Summary

This automated workflow transforms:
- **Outlines** → Scene Briefs → Prose
- With **quality control** at each stage
- Using **character voice call sheets** for consistency
- Maintaining **continuity** through context management
- Honoring **ship vibes** from media inspirations

**The result:** A production system capable of generating 26 romance fantasy books with distinct character voices, consistent world-building, and authentic emotional resonance.
