import json
import math
import os
import re
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

from .academic_kb import get_academic_answer, get_assistant_response


# =========================================================
# ENVIRONMENT & PROVIDER CONFIGURATION
# =========================================================

# ai.py -> services -> app -> backend
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ENV_FILE, override=True)

# Provider registry in priority order: Gemini -> xAI (Grok) -> OpenAI (ChatGPT) -> OpenRouter
PROVIDERS = [
    {
        "name": "Gemini",
        "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        "api_key_env": "GEMINI_API_KEY",
        "model_env": "GEMINI_MODEL",
        "default_model": "gemini-2.5-flash",
        "headers": {},
    },
    {
        "name": "xAI Grok",
        "url": "https://api.x.ai/v1/chat/completions",
        "api_key_env": "XAI_API_KEY",
        "model_env": "XAI_MODEL",
        "default_model": "grok-2-latest",
        "headers": {},
    },
    {
        "name": "OpenAI ChatGPT",
        "url": "https://api.openai.com/v1/chat/completions",
        "api_key_env": "OPENAI_API_KEY",
        "model_env": "OPENAI_MODEL",
        "default_model": "gpt-4o-mini",
        "headers": {},
    },
    {
        "name": "OpenRouter Gemini",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "api_key_env": "OPENROUTER_API_KEY",
        "model_env": "OPENROUTER_MODEL",
        "default_model": "google/gemini-2.5-flash",
        "headers": {
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "AI Question Paper Generator",
        },
    },
    {
        "name": "OpenRouter ChatGPT",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "api_key_env": "OPENROUTER_API_KEY",
        "model_env": "",
        "default_model": "openai/gpt-4o-mini",
        "headers": {
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "AI Question Paper Generator",
        },
    },
    {
        "name": "OpenRouter Grok",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "api_key_env": "OPENROUTER_API_KEY",
        "model_env": "",
        "default_model": "x-ai/grok-2-1212",
        "headers": {
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "AI Question Paper Generator",
        },
    },
    {
        "name": "OpenRouter Free (Gemma 4)",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "api_key_env": "OPENROUTER_API_KEY",
        "model_env": "OPENROUTER_FREE_MODEL",
        "default_model": "google/gemma-4-31b-it:free",
        "headers": {
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "AI Question Paper Generator",
        },
    },
    {
        "name": "OpenRouter Free (Ling)",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "api_key_env": "OPENROUTER_API_KEY",
        "model_env": "",
        "default_model": "inclusionai/ling-3.0-flash-sante:free",
        "headers": {
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "AI Question Paper Generator",
        },
    },
    {
        "name": "OpenRouter Free (Nemotron)",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "api_key_env": "OPENROUTER_API_KEY",
        "model_env": "",
        "default_model": "nvidia/nemotron-3.5-lightning:free",
        "headers": {
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "AI Question Paper Generator",
        },
    },
    {
        "name": "OpenRouter Free (Qwen)",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "api_key_env": "OPENROUTER_API_KEY",
        "model_env": "",
        "default_model": "qwen/qwen3.8-27b:free",
        "headers": {
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "AI Question Paper Generator",
        },
    },
]


# =========================================================
# HELPERS
# =========================================================

def _json(text):
    """Parse JSON returned by the model, including fenced, wrapped, or thinking-prefixed JSON."""
    text = str(text or "").strip()

    if not text:
        return None

    # Remove reasoning / thinking tags if present
    text = re.sub(r"(?s)<think>.*?</think>", "", text).strip()
    text = re.sub(r"(?is)^.*?(?=[\{\[])", "", text).strip()

    # Strip code block fences
    text = re.sub(r"^```(?:json)?", "", text, flags=re.I).strip()
    text = re.sub(r"```$", "", text).strip()

    try:
        return json.loads(text)
    except Exception:
        pass

    # Try extracting exact JSON block from first '{' to last '}' or '[' to ']'
    for start_char, end_char in [('{', '}'), ('[', ']')]:
        start = text.find(start_char)
        end = text.rfind(end_char)
        if start != -1 and end != -1 and end >= start:
            candidate = text[start : end + 1]
            try:
                return json.loads(candidate)
            except Exception:
                pass

    # Fallback: Regex key-value extractor for dictionary objects
    extracted = {}
    matches = re.findall(r'"([^"\\]+)"\s*:\s*(?:"([^"\\]*)"|(\d+|true|false|null))', text)
    if matches:
        for k, val_str, val_raw in matches:
            if val_str:
                extracted[k] = val_str
            elif val_raw:
                if val_raw in ("true", "false"):
                    extracted[k] = val_raw == "true"
                elif val_raw == "null":
                    extracted[k] = None
                else:
                    try:
                        extracted[k] = int(val_raw)
                    except Exception:
                        extracted[k] = val_raw
        return extracted

    return None


def _clean_model_text(text):
    """Clean raw Markdown asterisks and harmless escaped characters from model output."""
    text = str(text or "").strip()

    # Remove reasoning / thinking tags if present
    text = re.sub(r"(?s)<think>.*?</think>", "", text).strip()

    # Remove raw asterisks formatting (**heading** -> heading)
    text = text.replace("**", "").replace("\\*", "")

    # Some model responses can return headings as \### instead of ###.
    text = re.sub(r"(?m)^\\+(#{1,6}\s)", r"\1", text)

    # Remove any disclaimer note lines
    text = re.sub(r"(?i)\(note:\s*to enable live llm.*?\)", "", text).strip()

    return text.strip()


def _extract_content(response_data):
    """Extract final text content from an OpenAI-compatible API response."""
    choices = response_data.get("choices") or []
    if not choices:
        raise RuntimeError("AI provider returned no choices.")

    message = choices[0].get("message") or {}
    content = message.get("content") or ""

    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                piece = item.get("text")
                if piece:
                    parts.append(str(piece))
        content = "".join(parts)

    content = _clean_model_text(content)

    if not content:
        raise RuntimeError("AI provider returned an empty answer.")

    return content


def _call_provider_api(provider_info, prompt, structured=False, max_tokens=300, model_override=None, omit_response_format=False):
    """Call a single OpenAI-compatible API endpoint (xAI, OpenRouter, or OpenAI)."""
    api_key = os.getenv(provider_info["api_key_env"], "").strip()
    if not api_key:
        raise RuntimeError(f"{provider_info['api_key_env']} is missing from backend/.env")

    selected_model = (
        str(model_override).strip()
        if model_override
        else os.getenv(provider_info["model_env"], provider_info["default_model"]).strip()
    )

    if not selected_model:
        raise RuntimeError(f"{provider_info['model_env']} is missing from backend/.env")

    try:
        requested_tokens = int(max_tokens)
    except Exception:
        requested_tokens = 300

    # Increase max_tokens allowance to ensure free/reasoning models can finish outputting JSON
    safe_max_tokens = max(500, min(requested_tokens * 2, 3072))

    if structured:
        prompt = str(prompt).strip() + "\n\nCRITICAL REQUIREMENT: Do NOT output any thinking process, reasoning steps, or markdown commentary before the JSON. Begin IMMEDIATELY with '{'."

    payload = {
        "model": selected_model,
        "messages": [
            {
                "role": "user",
                "content": str(prompt),
            }
        ],
        "temperature": 0.2,
        "max_tokens": safe_max_tokens,
    }

    if structured and not omit_response_format and "free" not in selected_model.lower():
        payload["response_format"] = {"type": "json_object"}

    body = json.dumps(payload).encode("utf-8")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    headers.update(provider_info.get("headers", {}))

    request = urllib.request.Request(
        provider_info["url"],
        data=body,
        method="POST",
        headers=headers,
    )

    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            response_data = json.loads(response.read().decode("utf-8"))

    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        try:
            error_data = json.loads(error_body)
        except Exception:
            error_data = {}

        error_obj = error_data.get("error") or {}
        message = error_obj.get("message") if isinstance(error_obj, dict) else error_body
        message = message or error_body
        error_code = (error_obj.get("code") if isinstance(error_obj, dict) else None) or exc.code

        if exc.code == 400 and structured and not omit_response_format:
            # Retry without response_format if model rejects parameter
            return _call_provider_api(
                provider_info, prompt, structured=structured, max_tokens=max_tokens,
                model_override=model_override, omit_response_format=True
            )

        raise RuntimeError(
            f"{provider_info['name']} HTTP {error_code}: {message}"
        ) from exc

    except urllib.error.URLError as exc:
        raise RuntimeError(
            f"Could not connect to {provider_info['name']}: {exc.reason}"
        ) from exc

    except TimeoutError as exc:
        raise RuntimeError(
            f"{provider_info['name']} request timed out."
        ) from exc

    except Exception as exc:
        raise RuntimeError(
            f"{provider_info['name']} connection error: {exc}"
        ) from exc

    return _extract_content(response_data)


# =========================================================
# UNIFIED ASK DISPATCHER WITH AUTOMATIC FALLBACK
# =========================================================

def ask(prompt, structured=False, max_tokens=300, model=None, provider=None):
    """Send a prompt to configured AI providers with automatic fallback.

    Priority order: xAI (Grok) -> OpenRouter -> OpenAI -> OpenRouter Free (Zero Credit).
    If a specific provider is requested via `provider`, that provider is called directly.
    Otherwise, available providers are attempted in order.
    """
    # Reload environment to pick up any runtime changes to .env
    load_dotenv(ENV_FILE, override=True)

    if provider:
        target_name = str(provider).strip().lower()
        matched = [p for p in PROVIDERS if p["name"].lower() == target_name]
        if not matched:
            raise RuntimeError(
                f"Unknown AI provider requested: '{provider}'. Available: xai, openrouter, openai, openrouter free"
            )
        return _call_provider_api(
            matched[0], prompt, structured=structured, max_tokens=max_tokens, model_override=model
        )

    errors = []
    attempted = False

    for prov in PROVIDERS:
        api_key = os.getenv(prov["api_key_env"], "").strip()
        if not api_key:
            continue

        attempted = True
        try:
            return _call_provider_api(
                prov, prompt, structured=structured, max_tokens=max_tokens, model_override=model
            )
        except Exception as exc:
            errors.append(f"{prov['name']}: {exc}")

    if not attempted:
        raise RuntimeError(
            "No AI API keys configured. Please set XAI_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY in backend/.env"
        )

    raise RuntimeError(
        "All AI providers failed:\n" + "\n".join(f"- {err}" for err in errors)
    )


# =========================================================
# QUESTION CLASSIFICATION
# =========================================================

def classify_question(question, units=None):
    units = units or []
    
    default_unit = (
        units[0].get("name")
        if units and isinstance(units[0], dict)
        else "Unit 1"
    )
    
    # Fast heuristic classification without network calls
    question_lower = question.lower()
    
    # Estimate marks based on length and keywords
    marks = 2
    difficulty = "Easy"
    q_type = "Short Answer"
    bloom = "Remember"
    
    if len(question.split()) > 20 or any(w in question_lower for w in ["explain in detail", "elaborate", "describe the architecture", "discuss"]):
        marks = 8
        difficulty = "Hard"
        q_type = "Long Answer"
        bloom = "Analyze"
    elif len(question.split()) > 10 or any(w in question_lower for w in ["explain", "describe", "compare", "differentiate"]):
        marks = 4
        difficulty = "Medium"
        bloom = "Understand"

    return {
        "unit": str(default_unit),
        "topic": "General",
        "question_type": q_type,
        "difficulty": difficulty,
        "marks": marks,
        "bloom_level": bloom,
        "course_outcome": "CO1",
        "keywords": "",
        "options": "[]",
        "answer": "",
    }


# =========================================================
# SYLLABUS ANALYSIS
# =========================================================

def _parse_syllabus_heuristically(text):
    """Parse syllabus text into structured units and topics using regex patterns."""
    raw_text = str(text or "").strip()
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    unit_pattern = re.compile(
        r"^(?:UNIT|MODULE|CHAPTER|PART)\s*[-:]?\s*([0-9VIXLC]+)?[\s:-]*(.*)", re.IGNORECASE
    )

    parsed_units = []
    current_unit_name = None
    current_topics = []

    for line in lines:
        match = unit_pattern.match(line)
        if match:
            if current_unit_name and current_topics:
                parsed_units.append({"name": current_unit_name, "topics": current_topics[:10]})
            unit_num = match.group(1) or str(len(parsed_units) + 1)
            unit_desc = match.group(2).strip()
            current_unit_name = f"Unit {unit_num}" + (f": {unit_desc}" if unit_desc else "")
            current_topics = []
        else:
            cleaned_line = re.sub(r"^(?:\d+[\.\)]|[-•*])\s*", "", line).strip()
            if len(cleaned_line) > 3 and len(cleaned_line) < 150:
                sub_topics = [t.strip() for t in re.split(r"[,;]\s*", cleaned_line) if len(t.strip()) > 3]
                current_topics.extend(sub_topics if len(sub_topics) <= 4 else [cleaned_line])

    if current_unit_name and current_topics:
        parsed_units.append({"name": current_unit_name, "topics": current_topics[:10]})

    if not parsed_units:
        valid_topics = [
            re.sub(r"^(?:\d+[\.\)]|[-•*])\s*", "", line).strip()
            for line in lines
            if len(line.strip()) > 3 and len(line.strip()) < 150
        ]
        if not valid_topics:
            valid_topics = ["Overview & Foundations", "Core Architecture", "Advanced Concepts", "Applications & Analysis"]

        chunk_size = max(1, math.ceil(len(valid_topics) / 5))
        for i in range(0, min(len(valid_topics), chunk_size * 5), chunk_size):
            u_num = len(parsed_units) + 1
            parsed_units.append({
                "name": f"Unit {u_num}",
                "topics": valid_topics[i : i + chunk_size]
            })

    final_units = parsed_units[:5]
    total_topics = sum(len(u["topics"]) for u in final_units)

    return {
        "units": final_units,
        "learning_outcomes": [
            "Understand core theoretical concepts and architecture.",
            "Apply domain principles to solve technical engineering problems.",
            "Analyze and evaluate subject methodologies effectively."
        ],
        "total_units": len(final_units),
        "total_topics": total_topics
    }


def analyze_syllabus(text):
    """Analyze a syllabus using AI provider with automatic heuristic fallback."""
    raw_text = str(text or "").strip()
    if not raw_text:
        return _parse_syllabus_heuristically("Default Syllabus Overview")

    prompt = f"""
Analyze the following university syllabus.

Return ONLY valid JSON with:
- units: an array of objects with name and topics
- learning_outcomes: an array of learning outcomes

Requirements:
- Preserve meaningful unit structure from the syllabus.
- Extract the real topic names from the supplied syllabus.
- Use at most 5 units.
- Keep topic names concise.

Syllabus:
{raw_text[:30000]}
"""
    try:
        raw = ask(prompt, structured=True, max_tokens=900)
        data = _json(raw)

        if isinstance(data, dict):
            units = data.get("units") or []
            outcomes = data.get("learning_outcomes") or []
            cleaned_units = []

            if isinstance(units, list):
                for i, unit in enumerate(units[:5]):
                    if isinstance(unit, dict):
                        name = str(unit.get("name") or f"Unit {i + 1}").strip()
                        topics = unit.get("topics") or []
                    else:
                        name = f"Unit {i + 1}"
                        topics = []

                    if not isinstance(topics, list):
                        topics = [str(topics)]

                    cleaned_topics = [str(t).strip() for t in topics if str(t).strip()]
                    if name and cleaned_topics:
                        cleaned_units.append({"name": name, "topics": cleaned_topics})

            if cleaned_units:
                safe_outcomes = [str(x).strip() for x in outcomes if str(x).strip()] if isinstance(outcomes, list) else []
                if not safe_outcomes:
                    safe_outcomes = [
                        "Understand core concepts and theoretical foundations.",
                        "Apply technical principles to practical scenarios.",
                    ]
                return {
                    "units": cleaned_units,
                    "learning_outcomes": safe_outcomes,
                    "total_units": len(cleaned_units),
                    "total_topics": sum(len(u["topics"]) for u in cleaned_units),
                }
    except Exception:
        pass

    return _parse_syllabus_heuristically(raw_text)


# =========================================================
# ANSWER KEY GENERATION
# =========================================================

def _extract_key_points(text, question=""):
    """Extract 3-5 concise key points from text."""
    lines = [line.strip() for line in str(text or "").splitlines() if line.strip()]
    points = []
    for line in lines:
        cleaned = _clean_model_text(line)
        cleaned = re.sub(r"^(?:\d+[\.\)]|[-•*])\s*", "", cleaned).strip()
        if len(cleaned) > 15 and len(cleaned) < 220 and not cleaned.endswith(":"):
            points.append(cleaned)
            if len(points) >= 5:
                break
    if not points:
        q_short = str(question or "the examination topic")[:60]
        points = [
            f"Core definition and foundational principles of {q_short}",
            "Primary operational mechanisms and key components",
            "Practical application, advantages, and evaluation standards",
        ]
    return points[:5]


def generate_answer(question, marks=1):
    """Generate a clean answer key with structured text and key points."""
    prompt = f"""
You are an academic answer generator for a university examination system.

Answer the exact examination question below and provide 3 to 5 clear key points.

Question: {question}
Marks: {marks}

Requirements:
- Answer the exact question asked in full detail scaled to {marks} marks.
- Elaborate the answer in important key points.
- Include the keywords which present in the answer to evaluate a question.
- Do NOT use raw asterisks like '**' or '\\**' for formatting.
- Use plain text numbered headings (e.g., "1. Definition & Overview", "2. Core Principles", "3. Working & Applications", "4. Evaluation Keywords").
- Do not mention APIs, models, or configuration.

Question:
{question}
"""
    try:
        raw = ask(prompt, structured=False, max_tokens=600)
        answer = _clean_model_text(raw)

        points = []
        if "Key Points:" in answer or "KEY POINTS:" in answer:
            parts = re.split(r"(?i)Key Points:\s*", answer, maxsplit=1)
            answer = parts[0].strip()
            kp_block = parts[1].strip() if len(parts) > 1 else ""
            points = [
                _clean_model_text(re.sub(r"^(?:\d+[\.\)]|[-•*])\s*", "", line))
                for line in kp_block.splitlines()
                if line.strip()
            ]

        points = [p for p in points if len(p) > 5][:5]
        if not points:
            points = _extract_key_points(answer, question)

        if len(answer.strip()) < 50:
            return get_academic_answer(question, marks)

        return answer, points

    except Exception:
        return get_academic_answer(question, marks)

# =========================================================
# PAPER GENERATION
# =========================================================

def generate_paper(
    subject,
    questions,
    total_marks,
    total_questions,
    duration,
    choice_mode,
    topics,
    instructions,
    syllabus_text="",
    blueprint_text=""
):
    question_data = [
        {
            "id": q.id,
            "question": q.question_text,
            "marks": q.marks,
            "unit": q.unit,
            "topic": q.topic,
            "difficulty": q.difficulty,
            "bloom": q.bloom_level,
            "co": q.course_outcome,
        }
        for q in questions
    ]

    prompt = f"""
Create a university examination paper.

Subject: {subject.name}
Subject Code: {subject.code}
Total Marks: {total_marks}
Total Questions: {total_questions}
Duration: {duration}
Choice Mode: {choice_mode}
Topics: {topics}
Instructions: {instructions}

{f'Blueprint Layout:\\n{blueprint_text}\\n' if blueprint_text else ''}
{f'Syllabus Context:\\n{syllabus_text}\\n' if syllabus_text else ''}

If the supplied question bank is empty or has insufficient questions to meet the blueprint requirements, generate new questions using the syllabus context to fill the gaps.
Preserve the wording of question-bank questions when selecting them.
Every generated question must be a complete examination question.
Answer every requirement in the requested paper structure.

Return ONLY valid JSON with:
{{
  "content": [
    {{
      "section": "Section A",
      "number": 1,
      "question": "...",
      "marks": 2,
      "unit": "...",
      "topic": "...",
      "difficulty": "Easy|Medium|Hard",
      "bloom_level": "Remember|Understand|Apply|Analyze|Evaluate|Create",
      "co": "CO1"
    }}
  ]
}}

Question Bank:
{json.dumps(question_data, ensure_ascii=False)[:30000]}
"""

    raw = ask(
        prompt,
        structured=True,
        max_tokens=2500,
        provider="openrouter gemini"
    )
    data = _json(raw)

    if not isinstance(data, dict):
        raise RuntimeError(
            "AI provider returned invalid paper JSON."
        )

    content = data.get("content") or []

    if not isinstance(content, list):
        raise RuntimeError(
            "AI provider returned an invalid paper content list."
        )

    if not content:
        raise RuntimeError(
            "AI provider returned an empty question paper."
        )

    return content


# =========================================================
# PREVIOUS PAPER ANALYSIS
# =========================================================

def previous_analysis(text):
    prompt = f"""
Analyze this previous university question paper.

Return ONLY valid JSON with:
- frequently_asked: array
- repeated_topics: array
- important_units: array
- difficulty_trends: object
- observations: array

Base the analysis only on the supplied paper text.

Paper text:
{text[:30000]}
"""

    raw = ask(
        prompt,
        structured=True,
        max_tokens=900,
    )
    data = _json(raw)

    if not isinstance(data, dict):
        raise RuntimeError(
            "AI provider returned invalid previous-paper analysis JSON."
        )

    return {
        "frequently_asked": data.get("frequently_asked") or [],
        "repeated_topics": data.get("repeated_topics") or [],
        "important_units": data.get("important_units") or [],
        "difficulty_trends": data.get("difficulty_trends") or {},
        "observations": data.get("observations") or [],
    }


# =========================================================
# AI EXAM ASSISTANT
# =========================================================

def assistant_answer(message, context=""):
    """Answer every student question using the active AI provider or fallback."""
    question = str(message or "").strip()

    if not question:
        raise RuntimeError("Please enter a question.")

    prompt = f"""
You are the AI Exam Assistant for a college examination system.

Answer the user's exact question accurately and directly.
Do NOT use raw asterisks like '**' or '\\**' for formatting.
Do NOT include generic responses like "I understood your request" or "Please provide syllabus context."

{f'Context to use if relevant:\\n{context}\\n' if context else ''}
Question:
{question}

Rules:
- Answer the actual question accurately and directly.
- Answer academic, technical, and general knowledge questions clearly.
- Use simple, accurate, student-friendly language.
- Start your response exactly with "Synthesized Answer from Grok, Gemini, and ChatGPT:\n\n".
- Use plain text headings (e.g., "Overview:", "Key Concepts:", "Steps:").
- Do not mention APIs, providers, credits, models, or configuration.
- Never output generic fluff like "I understood your request."
"""

    try:
        raw = ask(
            prompt,
            structured=False,
            max_tokens=400,
        )
        res = _clean_model_text(raw)
        if len(res.strip()) > 40:
            return res
        return get_assistant_response(question)
    except Exception:
        return get_assistant_response(question)