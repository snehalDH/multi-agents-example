# Generative AI for Beginners — Agent Demo

## Purpose

A focused, minimal exercise to build genuine understanding of the multi-agent pattern from first principles — strip away frameworks and abstractions and see exactly what happens under the hood: how an agent loop runs, how agents are spawned and coordinated, and how they share work without sharing context.

---

An agent-based system that reads the first 5 sections of Microsoft's [Generative AI for Beginners](https://github.com/microsoft/generative-ai-for-beginners) course and generates structured learning content using Google Gemini.

Built as a hands-on demonstration of single-agent and multi-agent architectures using the ReAct (Reason + Act) pattern.

---

## What It Does

| Agent                       | Reads                                      | Produces                                                                   |
| --------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| **Single Agent**            | All 5 sections sequentially                | Knowledge Map with summaries, concept connections, and 10 review questions |
| **Multi-Agent (3 workers)** | 5 sections split across 3 parallel workers | Structured question bank with 10 interval questions                        |

### Course Sections Covered

1. **00 — Course Setup** — Development environment with GitHub Codespaces
2. **01 — Introduction to Generative AI and LLMs** — How LLMs work, tokenization, capabilities
3. **02 — Exploring and Comparing Different LLMs** — Model categories, Foundation Models vs LLMs, open-source vs proprietary
4. **03 — Using Generative AI Responsibly** — Hallucinations, harms, and the 4-layer mitigation cycle
5. **04 — Prompt Engineering Fundamentals** — What prompts are, tokenization, instruction-tuned models

---

## Project Structure

```
generative-ai-for-beginners/
├── tools.js                        # fetch_url + write_output tool definitions
├── phase1_single_agent/
│   └── agent.js                    # Single agent — reads all 5 sections, writes Knowledge Map
├── phase2_multi_agent/
│   ├── worker.js                   # WorkerAgent class — reads N sections, returns JSON questions
│   └── run.js                      # Orchestrator — spawns 3 workers in parallel, formats output
├── outputs/
│   ├── single_agent_output.md      # Knowledge Map from single agent
│   └── multi_agent_output.md       # Question bank from multi-agent
├── .env                            # GOOGLE_GENERATIVE_AI_API_KEY
└── package.json
```

---

## Architecture

### Phase 1 — Single Agent

One Gemini instance handles the full task end-to-end:

```
Goal Prompt
    │
    ▼
fetch_url(section 00) → fetch_url(section 01) → ... → fetch_url(section 04)
    │
    ▼
write_output("single_agent_output.md")
```

- ReAct loop: up to 25 steps
- Fetches each section README from GitHub raw content
- Synthesizes a Knowledge Map with section summaries, concept dependency chain, and 2 review questions per section

### Phase 2 — Multi-Agent (3 Workers)

Three workers run in parallel, each with an isolated context window:

```
Orchestrator
   ├── Worker A (foundations)              → sections 00, 01
   ├── Worker B (selection_and_responsibility) → sections 02, 03
   └── Worker C (prompting)               → section 04
        │
        ▼ (Promise.all)
Orchestrator formats + writes multi_agent_output.md
```

- Workers only receive `fetch_url` (least privilege — no write access)
- Each worker returns structured JSON: `{ module, questions: [{question, type, expected_answer_points}] }`
- Orchestrator does pure formatting — no additional API call needed

---

## Setup

### Prerequisites

- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/) API key

### Install

```bash
cd generative-ai-for-beginners
npm install
```

### Configure

Create a `.env` file in the project root:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

---

## Run

```bash
# Single agent
node phase1_single_agent/agent.js

# Multi-agent (3 workers in parallel)
node phase2_multi_agent/run.js
```

Outputs are written to the `outputs/` directory.

---

## Output Examples

### single_agent_output.md

A Knowledge Map covering:

- Section-by-section summaries (key concepts, learning objectives, prerequisites)
- Concept dependency chain showing how sections build on each other
- 2 review questions per section (10 total) with detailed answer guides

### multi_agent_output.md

A question bank with 10 interval questions, each tagged with:

- **Type**: `conceptual` or `practical`
- **What a good answer covers**: 3 bullet points for self-assessment

---

## Key Concepts Demonstrated

| Concept                                            | Where                                              |
| -------------------------------------------------- | -------------------------------------------------- |
| ReAct loop (tool calls → feed results back)        | `agent.js`, `worker.js`                            |
| Tool definitions for Gemini function calling       | `tools.js`                                         |
| Parallel agent execution with `Promise.all`        | `run.js`                                           |
| Least privilege (workers can't write output)       | `worker.js`                                        |
| Orchestrator as pure formatter (no extra API call) | `run.js`                                           |
| Isolated context windows per agent                 | `worker.js` — each has its own `model.startChat()` |
