import os
import json
import re
from collections import defaultdict
from typing import Any, Dict, List, Optional

import requests


from dotenv import load_dotenv

load_dotenv()

# ============================================================
# CONFIGURATION
# ============================================================

# We prioritize OpenAI > Gemini > xAI based on available keys
if os.getenv("OPENAI_API_KEY"):
    AI_API_KEY = os.getenv("OPENAI_API_KEY")
    AI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    AI_URL = "https://api.openai.com/v1/chat/completions"
    AUTH_HEADER = f"Bearer {AI_API_KEY}"
elif os.getenv("GEMINI_API_KEY"):
    AI_API_KEY = os.getenv("GEMINI_API_KEY")
    AI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
    # Using Google's OpenAI-compatible endpoint
    AI_URL = f"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    AUTH_HEADER = f"Bearer {AI_API_KEY}"
elif os.getenv("XAI_API_KEY"):
    AI_API_KEY = os.getenv("XAI_API_KEY")
    AI_MODEL = os.getenv("XAI_MODEL", "grok-beta")
    AI_URL = "https://api.x.ai/v1/chat/completions"
    AUTH_HEADER = f"Bearer {AI_API_KEY}"
else:
    # Fallback to Pollinations
    AI_API_KEY = "no-key-needed"
    AI_MODEL = "openai"
    AI_URL = "https://text.pollinations.ai/openai/chat/completions"
    AUTH_HEADER = "Bearer no-key-needed"

APP_NAME = "AI Question Paper Generator"


# ============================================================
# COMMON HELPERS
# ============================================================

def _require_api_key() -> None:
    """
    Check whether AI API key is configured.
    """
    if AI_API_KEY == "no-key-needed" and AI_URL != "https://text.pollinations.ai/openai/chat/completions":
        raise RuntimeError("No API key configured in .env")


def _clean_text(value: Any) -> str:
    """
    Convert a value into clean text.
    """
    if value is None:
        return ""

    return str(value).strip()


def _normalize_question(text: str) -> str:
    """
    Normalize question text for duplicate checking.
    """
    text = _clean_text(text).lower()

    # Remove question numbering
    text = re.sub(r"^\s*(q(?:uestion)?\s*)?\d+[\.\):\-]?\s*", "", text)

    # Remove extra spaces
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def _safe_int(value: Any, default: int = 0) -> int:
    """
    Safely convert value to integer.
    """
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


# ============================================================
# OPENROUTER CALL
# ============================================================

def _call_openrouter(
    prompt: str,
    system_prompt: str = None,
    temperature: float = 0.1,
    max_tokens: int = 4000,
) -> str:
    if system_prompt is None:
        system_prompt = (
            "You are an AI assistant for an academic question paper generator. "
            "Follow the supplied instructions exactly."
        )

    providers = []
    
    if os.getenv("OPENAI_API_KEY"):
        providers.append({
            "url": "https://api.openai.com/v1/chat/completions",
            "auth": f"Bearer {os.getenv('OPENAI_API_KEY')}",
            "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        })
    if os.getenv("GEMINI_API_KEY"):
        providers.append({
            "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
            "auth": f"Bearer {os.getenv('GEMINI_API_KEY')}",
            "model": os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
        })
    elif os.getenv("OPENROUTER_API_KEY"):
        providers.append({
            "url": "https://openrouter.ai/api/v1/chat/completions",
            "auth": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
            "model": os.getenv("OPENROUTER_MODEL", "google/gemini-flash-1.5")
        })
    if os.getenv("XAI_API_KEY"):
        providers.append({
            "url": "https://api.x.ai/v1/chat/completions",
            "auth": f"Bearer {os.getenv('XAI_API_KEY')}",
            "model": os.getenv("XAI_MODEL", "grok-beta")
        })
        
    # Always append the free fallback at the end so it works even if provided keys are exhausted
    providers.append({
        "url": "https://text.pollinations.ai/openai/chat/completions",
        "auth": "Bearer no-key-needed",
        "model": "openai"
    })

    last_error = None
    
    for provider in providers:
        model = provider["model"]
        if "gpt-5.4" in model:
            model = "gpt-4o-mini"
            
        headers = {
            "Authorization": provider["auth"],
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": APP_NAME,
        }

        payload = {
            "model": model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
        }

        try:
            response = __import__('requests').post(
                provider["url"],
                headers=headers,
                json=payload,
                timeout=120,
            )
        except Exception as exc:
            last_error = f"Network Error: {exc}"
            continue

        if response.status_code == 200:
            try:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                if isinstance(content, list):
                    parts = []
                    for item in content:
                        if isinstance(item, dict) and item.get("type") == "text":
                            parts.append(str(item.get("text", "")))
                        elif isinstance(item, str):
                            parts.append(item)
                    return "".join(parts)
                return str(content)
            except Exception as exc:
                last_error = f"Invalid JSON response: {exc}"
                continue
        else:
            try:
                error_data = response.json()
            except:
                error_data = response.text
            last_error = f"API Error ({response.status_code}): {error_data}"
            continue

    raise RuntimeError(f"All AI providers failed. Last error: {last_error}")


def _extract_json(text: str) -> Any:
    """
    Extract JSON from an AI response.

    Supports:
    - plain JSON
    - ```json ... ```
    - JSON surrounded by normal text
    """

    text = _clean_text(text)

    # Remove markdown code fences
    text = re.sub(
        r"```json\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"```\s*",
        "",
        text,
    )

    text = text.strip()

    # First try the entire response
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Find JSON object
    object_start = text.find("{")
    object_end = text.rfind("}")

    if object_start != -1 and object_end > object_start:
        candidate = text[object_start:object_end + 1]

        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    # Find JSON array
    array_start = text.find("[")
    array_end = text.rfind("]")

    if array_start != -1 and array_end > array_start:
        candidate = text[array_start:array_end + 1]

        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    raise ValueError(
        "AI response does not contain valid JSON."
    )


# ============================================================
# QUESTION BANK NORMALIZATION
# ============================================================

def normalize_question_bank(
    questions: List[Any],
) -> List[Dict[str, Any]]:
    """
    Convert Question Bank records into a standard format.

    Accepted input can be:
        SQLAlchemy objects
        dictionaries

    Required:
        question text
        marks

    Optional:
        id
        difficulty
        bloom_level
        unit
        question_type
        subject
    """

    result = []

    for index, question in enumerate(questions):

        # ----------------------------------------------------
        # SQLAlchemy object
        # ----------------------------------------------------
        if not isinstance(question, dict):

            question_id = getattr(
                question,
                "id",
                index + 1,
            )

            question_text = getattr(
                question,
                "question_text",
                None,
            )

            # Some older models may use "text"
            if not question_text:
                question_text = getattr(
                    question,
                    "text",
                    None,
                )

            marks = getattr(
                question,
                "marks",
                None,
            )

            difficulty = getattr(
                question,
                "difficulty",
                None,
            )

            bloom_level = getattr(
                question,
                "bloom_level",
                None,
            )

            unit = getattr(
                question,
                "unit",
                None,
            )

            question_type = getattr(
                question,
                "question_type",
                None,
            )

            subject = getattr(
                question,
                "subject",
                None,
            )

        # ----------------------------------------------------
        # Dictionary
        # ----------------------------------------------------
        else:

            question_id = question.get(
                "id",
                index + 1,
            )

            question_text = (
                question.get("question_text")
                or question.get("text")
                or question.get("question")
            )

            marks = question.get(
                "marks",
                question.get("weightage", 0),
            )

            difficulty = question.get(
                "difficulty"
            )

            bloom_level = question.get(
                "bloom_level"
            )

            unit = question.get(
                "unit"
            )

            question_type = question.get(
                "question_type"
            )

            subject = question.get(
                "subject"
            )

        question_text = _clean_text(question_text)

        if not question_text:
            continue

        marks = _safe_int(marks)

        # A question without valid marks cannot be used
        # for weightage-based paper generation.
        if marks <= 0:
            continue

        result.append(
            {
                "id": question_id,
                "question_text": question_text,
                "marks": marks,
                "difficulty": _clean_text(difficulty),
                "bloom_level": _clean_text(bloom_level),
                "unit": _clean_text(unit),
                "question_type": _clean_text(question_type),
                "subject": _clean_text(subject),
            }
        )

    return result


# ============================================================
# DUPLICATE REMOVAL
# ============================================================

def remove_duplicate_questions(
    questions: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Remove duplicate questions from the Question Bank.
    """

    seen = set()
    result = []

    for question in questions:

        key = _normalize_question(
            question["question_text"]
        )

        if not key:
            continue

        if key in seen:
            continue

        seen.add(key)
        result.append(question)

    return result


# ============================================================
# GROUP QUESTIONS BY MARKS
# ============================================================

def group_questions_by_marks(
    questions: List[Dict[str, Any]],
) -> Dict[int, List[Dict[str, Any]]]:
    """
    Group Question Bank questions according to marks.

    Example:

    {
        2: [...],
        8: [...]
    }
    """

    groups = defaultdict(list)

    for question in questions:
        marks = _safe_int(question.get("marks"))

        if marks > 0:
            groups[marks].append(question)

    return dict(groups)


# ============================================================
# BUILD QUESTION BANK FOR AI
# ============================================================

def _build_question_bank_text(
    questions: List[Dict[str, Any]],
) -> str:
    """
    Convert questions into a strict AI input list.

    IMPORTANT:
    Only actual Question Bank questions are included.
    """

    lines = []

    for index, question in enumerate(questions, start=1):

        question_id = question["id"]
        text = question["question_text"]
        marks = question["marks"]

        metadata = []

        if question.get("difficulty"):
            metadata.append(
                f"difficulty={question['difficulty']}"
            )

        if question.get("bloom_level"):
            metadata.append(
                f"bloom={question['bloom_level']}"
            )

        if question.get("unit"):
            metadata.append(
                f"unit={question['unit']}"
            )

        metadata_text = ""

        if metadata:
            metadata_text = (
                " | " + ", ".join(metadata)
            )

        lines.append(
            f"{index}. "
            f"ID={question_id} | "
            f"MARKS={marks} | "
            f"QUESTION={text}"
            f"{metadata_text}"
        )

    return "\n".join(lines)


# ============================================================
# BLUEPRINT NORMALIZATION
# ============================================================

def normalize_blueprint(
    blueprint: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Normalize different blueprint formats.

    Example accepted input:

    {
        "total_marks": 20,
        "question_pattern": {
            "2": 2,
            "8": 2
        }
    }

    Or:

    {
        "total_marks": 20,
        "sections": [
            {
                "marks": 2,
                "count": 2
            },
            {
                "marks": 8,
                "count": 2
            }
        ]
    }
    """

    if not blueprint:
        raise ValueError(
            "Blueprint is required for paper generation."
        )

    total_marks = _safe_int(
        blueprint.get("total_marks")
    )

    pattern: Dict[int, int] = {}

    # --------------------------------------------------------
    # question_pattern
    # --------------------------------------------------------

    question_pattern = blueprint.get(
        "question_pattern"
    )

    if isinstance(question_pattern, dict):

        for marks, count in question_pattern.items():

            marks_int = _safe_int(marks)
            count_int = _safe_int(count)

            if marks_int > 0 and count_int > 0:
                pattern[marks_int] = count_int

    # --------------------------------------------------------
    # sections
    # --------------------------------------------------------

    sections = blueprint.get("sections")

    if isinstance(sections, list):

        for section in sections:

            if not isinstance(section, dict):
                continue

            marks = _safe_int(
                section.get(
                    "marks",
                    section.get("weightage", 0),
                )
            )

            count = _safe_int(
                section.get(
                    "count",
                    section.get("number", 0),
                )
            )

            if marks > 0 and count > 0:
                pattern[marks] = count

    # --------------------------------------------------------
    # question_pattern as list
    # --------------------------------------------------------

    if isinstance(question_pattern, list):

        for item in question_pattern:

            if not isinstance(item, dict):
                continue

            marks = _safe_int(
                item.get("marks")
            )

            count = _safe_int(
                item.get("count")
            )

            if marks > 0 and count > 0:
                pattern[marks] = count

    # --------------------------------------------------------
    # Calculate total marks if not supplied
    # --------------------------------------------------------

    calculated_total = sum(
        marks * count
        for marks, count in pattern.items()
    )

    if total_marks <= 0:
        total_marks = calculated_total

    if not pattern:
        raise ValueError(
            "Blueprint does not contain a valid question pattern."
        )

    if total_marks != calculated_total:
        raise ValueError(
            "Blueprint total marks do not match its question pattern. "
            f"Expected {calculated_total}, got {total_marks}."
        )

    return {
        "total_marks": total_marks,
        "question_pattern": pattern,
    }


# ============================================================
# LOCAL WEIGHTAGE VALIDATION
# ============================================================

def validate_question_availability(
    questions: List[Dict[str, Any]],
    blueprint: Dict[str, Any],
) -> None:
    """
    Check whether the Question Bank has enough questions
    for every required weightage.
    """

    groups = group_questions_by_marks(
        questions
    )

    missing = []

    for marks, required_count in blueprint[
        "question_pattern"
    ].items():

        available_count = len(
            groups.get(marks, [])
        )

        if available_count < required_count:

            missing.append(
                f"{marks}-mark: "
                f"need {required_count}, "
                f"available {available_count}"
            )

    if missing:

        raise ValueError(
            "Not enough questions in the Question Bank. "
            + "; ".join(missing)
        )


# ============================================================
# AI PAPER GENERATOR
# ============================================================

def generate_paper(
    questions: List[Any],
    blueprint: Dict[str, Any],
    subject: Optional[str] = None,
    title: Optional[str] = None,
    instructions: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate a question paper using ONLY Question Bank questions.

    The AI is NOT allowed to create new questions.

    Parameters
    ----------
    questions:
        Question Bank records.

    blueprint:
        Weightage/count requirements.

    subject:
        Subject name.

    title:
        Paper title.

    instructions:
        Optional formatting instructions.

    Returns
    -------
    dict
    """

    normalized_blueprint = normalize_blueprint(blueprint)
    
    # Check if we should invent questions (AI Mode)
    invent_mode = len(questions) == 0

    if not invent_mode:
        normalized_questions = normalize_question_bank(questions)
        if not normalized_questions:
            raise ValueError("No valid questions are available in the Question Bank.")

        normalized_questions = remove_duplicate_questions(normalized_questions)
        if not normalized_questions:
            raise ValueError("No usable questions are available in the Question Bank.")

        validate_question_availability(normalized_questions, normalized_blueprint)
        question_bank_text = _build_question_bank_text(normalized_questions)
    else:
        normalized_questions = []
        question_bank_text = "None. YOU MUST INVENT ALL QUESTIONS BASED ON THE SUBJECT."

    pattern = normalized_blueprint[
        "question_pattern"
    ]

    pattern_lines = []

    for marks, count in sorted(
        pattern.items()
    ):
        pattern_lines.append(
            f"- {count} question(s) × {marks} marks"
        )

    pattern_text = "\n".join(
        pattern_lines
    )

    subject_text = (
        subject.strip()
        if subject
        else "Not specified"
    )

    title_text = (
        title.strip()
        if title
        else "Question Paper"
    )

    extra_instructions = (
        instructions.strip()
        if instructions
        else "No additional instructions."
    )

    # --------------------------------------------------------
    # STRICT SYSTEM PROMPT
    # --------------------------------------------------------

    if invent_mode:
        system_prompt = """
You are an academic question paper generator.

Your most important rule is:
YOU MUST INVENT NEW, HIGH-QUALITY QUESTIONS BASED ON THE SUBJECT.

The marks attached to each question MUST EXACTLY MATCH the requested blueprint marks.

Return JSON only.
"""
    else:
        system_prompt = """
You are an academic question paper generator.

Your most important rule is:

YOU MUST NEVER INVENT, REWRITE, MODIFY, OR CREATE A NEW QUESTION.

You may ONLY select questions from the supplied Question Bank.

The Question Bank contains the only valid source of questions.

The marks attached to each question are authoritative.

You must preserve the exact question text and exact marks.

Do not use syllabus text.

Do not use learning outcomes.

Do not use unit descriptions.

Do not use topic descriptions.

Do not create questions from your own knowledge.

Do not paraphrase questions.

Do not combine two questions.

Do not split one question.

Do not change the meaning of a question.

Do not change its marks.

Return JSON only.

The selected question IDs must exactly match IDs from the supplied Question Bank.
"""

    # --------------------------------------------------------
    # USER PROMPT
    # --------------------------------------------------------

    if invent_mode:
        prompt = f"""
Generate a new question paper.

SUBJECT:
{subject_text}

PAPER TITLE:
{title_text}

TOTAL MARKS:
{normalized_blueprint["total_marks"]}

REQUIRED WEIGHTAGE:
{pattern_text}

ADDITIONAL INSTRUCTIONS:
{extra_instructions}

STRICT REQUIREMENTS:

1. Invent NEW questions relevant to the SUBJECT.
2. Select exactly the required number of questions for each mark category.
3. The final total must be exactly {normalized_blueprint["total_marks"]} marks.
4. Ensure appropriate difficulty and coverage.
5. Return JSON only.

EXPECTED JSON FORMAT:

{{
    "title": "{title_text}",
    "subject": "{subject_text}",
    "total_marks": {normalized_blueprint["total_marks"]},
    "sections": [
        {{
            "name": "Section A",
            "marks_each": 2,
            "questions": [
                {{
                    "id": 1,
                    "question_text": "invented question text",
                    "marks": 2
                }}
            ]
        }}
    ],
    "total_questions": 0
}}
"""
    else:
        prompt = f"""
Generate a question paper using ONLY the supplied Question Bank.

SUBJECT:
{subject_text}

PAPER TITLE:
{title_text}

TOTAL MARKS:
{normalized_blueprint["total_marks"]}

REQUIRED WEIGHTAGE:
{pattern_text}

ADDITIONAL INSTRUCTIONS:
{extra_instructions}

QUESTION BANK:

{question_bank_text}


STRICT REQUIREMENTS:

1. Select ONLY questions from the Question Bank.
2. Do NOT create any new question.
3. Do NOT use the syllabus.
4. Do NOT use information outside the Question Bank.
5. Preserve exact question text.
6. Preserve exact marks.
7. Select exactly the required number of questions for each mark category.
8. The final total must be exactly {normalized_blueprint["total_marks"]} marks.
9. Do not select the same question twice.
10. Every selected question ID must exist in the Question Bank.
11. The marks returned for a question must match the Question Bank.
12. Prefer balanced coverage of units/difficulty/Bloom level when possible, but NEVER violate the required marks pattern.
13. If several questions are suitable, select different questions rather than duplicating one.
14. Return JSON only.

EXPECTED JSON FORMAT:

{{
    "title": "{title_text}",
    "subject": "{subject_text}",
    "total_marks": {normalized_blueprint["total_marks"]},
    "sections": [
        {{
            "name": "Section A",
            "marks_each": 2,
            "questions": [
                {{
                    "id": 1,
                    "question_text": "exact question text",
                    "marks": 2
                }}
            ]
        }}
    ],
    "total_questions": 0
}}
"""

    # --------------------------------------------------------
    # Call AI
    # --------------------------------------------------------

    response_text = _call_openrouter(
        prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.0,
        max_tokens=6000,
    )

    # --------------------------------------------------------
    # Parse JSON
    # --------------------------------------------------------

    try:
        paper = _extract_json(
            response_text
        )
    except ValueError as exc:

        raise RuntimeError(
            "AI returned an invalid paper format. "
            f"Raw response: {response_text[:1000]}"
        ) from exc

    if not isinstance(paper, dict):

        raise RuntimeError(
            "AI paper response must be a JSON object."
        )

    # --------------------------------------------------------
    # Validate AI result
    # --------------------------------------------------------

    if invent_mode:
        validated = paper  # Trust AI when inventing
    else:
        validated = validate_generated_paper(
            paper,
            normalized_questions,
            normalized_blueprint,
        )

    # Add metadata
    validated["subject"] = subject_text
    validated["title"] = title_text
    validated["total_marks"] = normalized_blueprint[
        "total_marks"
    ]

    return validated


# ============================================================
# GENERATED PAPER VALIDATION
# ============================================================

def validate_generated_paper(
    paper: Dict[str, Any],
    question_bank: List[Dict[str, Any]],
    blueprint: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Validate the paper returned by AI.

    This is extremely important because the AI response
    must never be trusted blindly.
    """

    # --------------------------------------------------------
    # Build lookup tables
    # --------------------------------------------------------

    by_id = {}

    by_text = {}

    for question in question_bank:

        qid = str(
            question["id"]
        )

        by_id[qid] = question

        normalized_text = _normalize_question(
            question["question_text"]
        )

        by_text[
            normalized_text
        ] = question

    # --------------------------------------------------------
    # Get sections
    # --------------------------------------------------------

    sections = paper.get(
        "sections"
    )

    if not isinstance(sections, list):

        raise RuntimeError(
            "Generated paper does not contain valid sections."
        )

    selected = []

    seen_ids = set()

    # --------------------------------------------------------
    # Validate every question
    # --------------------------------------------------------

    for section in sections:

        if not isinstance(section, dict):
            continue

        section_questions = section.get(
            "questions",
            []
        )

        if not isinstance(
            section_questions,
            list
        ):
            continue

        for generated_question in section_questions:

            if not isinstance(
                generated_question,
                dict
            ):
                continue

            generated_id = generated_question.get(
                "id"
            )

            generated_text = _clean_text(
                generated_question.get(
                    "question_text"
                )
            )

            # -----------------------------------------------
            # Match by ID
            # -----------------------------------------------

            source_question = None

            if generated_id is not None:

                source_question = by_id.get(
                    str(generated_id)
                )

            # -----------------------------------------------
            # Fallback: exact normalized text
            # -----------------------------------------------

            if source_question is None and generated_text:

                source_question = by_text.get(
                    _normalize_question(
                        generated_text
                    )
                )

            # -----------------------------------------------
            # Reject unknown question
            # -----------------------------------------------

            if source_question is None:

                raise RuntimeError(
                    "AI generated or returned a question "
                    "that does not exist in the Question Bank."
                )

            source_id = str(
                source_question["id"]
            )

            # -----------------------------------------------
            # Reject duplicate
            # -----------------------------------------------

            if source_id in seen_ids:

                raise RuntimeError(
                    "AI selected the same question more than once."
                )

            seen_ids.add(
                source_id
            )

            # -----------------------------------------------
            # Exact question text
            # -----------------------------------------------

            if generated_text:

                if (
                    _normalize_question(
                        generated_text
                    )
                    !=
                    _normalize_question(
                        source_question[
                            "question_text"
                        ]
                    )
                ):

                    raise RuntimeError(
                        "AI modified a Question Bank question. "
                        f"Question ID: {source_id}"
                    )

            # -----------------------------------------------
            # Exact marks
            # -----------------------------------------------

            generated_marks = _safe_int(
                generated_question.get(
                    "marks"
                )
            )

            source_marks = _safe_int(
                source_question["marks"]
            )

            if generated_marks != source_marks:

                raise RuntimeError(
                    "Question marks do not match the "
                    f"Question Bank for question ID {source_id}. "
                    f"Expected {source_marks}, "
                    f"got {generated_marks}."
                )

            selected.append(
                {
                    "id": source_question["id"],
                    "question_text": source_question[
                        "question_text"
                    ],
                    "marks": source_marks,
                    "difficulty": source_question.get(
                        "difficulty"
                    ),
                    "bloom_level": source_question.get(
                        "bloom_level"
                    ),
                    "unit": source_question.get(
                        "unit"
                    ),
                    "question_type": source_question.get(
                        "question_type"
                    ),
                }
            )

    # --------------------------------------------------------
    # Validate required weightage
    # --------------------------------------------------------

    actual_counts = defaultdict(int)

    for question in selected:

        actual_counts[
            question["marks"]
        ] += 1

    required_pattern = blueprint[
        "question_pattern"
    ]

    for marks, required_count in required_pattern.items():

        actual_count = actual_counts.get(
            marks,
            0
        )

        if actual_count != required_count:

            raise RuntimeError(
                f"Weightage validation failed for "
                f"{marks}-mark questions. "
                f"Required {required_count}, "
                f"generated {actual_count}."
            )

    # --------------------------------------------------------
    # Ensure no unexpected marks
    # --------------------------------------------------------

    for marks, count in actual_counts.items():

        if marks not in required_pattern:

            raise RuntimeError(
                f"Generated paper contains an unexpected "
                f"{marks}-mark question."
            )

    # --------------------------------------------------------
    # Validate total marks
    # --------------------------------------------------------

    total_marks = sum(
        question["marks"]
        for question in selected
    )

    expected_total = blueprint[
        "total_marks"
    ]

    if total_marks != expected_total:

        raise RuntimeError(
            f"Total marks validation failed. "
            f"Expected {expected_total}, "
            f"got {total_marks}."
        )

    # --------------------------------------------------------
    # Rebuild clean sections from validated questions
    # --------------------------------------------------------
    #
    # We rebuild the output instead of trusting the AI's
    # question text/marks.
    # --------------------------------------------------------

    clean_sections = []

    for marks, required_count in sorted(
        required_pattern.items()
    ):

        section_questions = [
            question
            for question in selected
            if question["marks"] == marks
        ]

        section_name = (
            "Section A"
            if len(clean_sections) == 0
            else f"Section {chr(65 + len(clean_sections))}"
        )

        clean_sections.append(
            {
                "name": section_name,
                "marks_each": marks,
                "questions": section_questions,
                "question_count": len(
                    section_questions
                ),
            }
        )

    # --------------------------------------------------------
    # Final clean response
    # --------------------------------------------------------

    return {
        "title": paper.get(
            "title",
            "Question Paper"
        ),
        "subject": paper.get(
            "subject",
            ""
        ),
        "total_marks": total_marks,
        "total_questions": len(
            selected
        ),
        "sections": clean_sections,
    }


# ============================================================
# AI EXAM ASSISTANT
# ============================================================

def assistant_answer(
    question: str,
    subject: Optional[str] = None,
    context: Optional[str] = None,
) -> str:
    """
    AI Exam Assistant.

    This function is separate from paper generation.

    Paper generation uses ONLY Question Bank questions.
    The Exam Assistant can answer normal academic questions.
    """

    _require_api_key()

    question = _clean_text(
        question
    )

    if not question:

        raise ValueError(
            "Question is required."
        )

    subject_text = (
        _clean_text(subject)
        if subject
        else "Not specified"
    )

    context_text = (
        _clean_text(context)
        if context
        else "No additional context."
    )

    system_prompt = """
You are an AI Exam Assistant.

Answer the student's exact question.

Do not change the question into another topic.

If the student asks for a definition, give the definition.

If the student asks for a difference, give a comparison.

If the student asks for an explanation, explain that exact topic.

Give a clear academic answer suitable for a student.
"""

    prompt = f"""
SUBJECT:
{subject_text}

STUDENT QUESTION:
{question}

ADDITIONAL CONTEXT:
{context_text}

Answer the student's exact question.
"""

    return _call_openrouter(
        prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.2,
        max_tokens=2500,
    )


# ============================================================
# ANSWER GENERATOR
# ============================================================

def generate_answer(
    question: str,
    marks: Optional[int] = None,
    subject: Optional[str] = None,
) -> tuple[str, list[str]]:
    """
    Generate an answer for a supplied question.
    """

    _require_api_key()

    question = _clean_text(
        question
    )

    if not question:

        raise ValueError(
            "Question is required."
        )

    marks_text = (
        str(marks)
        if marks
        else "Not specified"
    )

    subject_text = (
        _clean_text(subject)
        if subject
        else "Not specified"
    )

    system_prompt = """
You are an academic answer generator.

Answer only the supplied question. Do not add unrelated information or assumptions.
The answer length and depth MUST match the allocated marks.
Provide the response strictly in JSON format matching this schema:
{
    "answer": "The detailed answer text formatted with numbered points or paragraphs.",
    "key_points": ["Keyword 1", "Key point 2", "Important metric 3"]
}
"""

    prompt = f"""
SUBJECT:
{subject_text}

QUESTION:
{question}

MARKS:
{marks_text}

Provide a clear student-friendly answer in the required JSON format.
"""

    try:
        response = _call_openrouter(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.2,
            max_tokens=3000,
        )
        data = _extract_json(response)
        return data.get("answer", "No answer provided."), data.get("key_points", [])
    except Exception as exc:
        raise RuntimeError(f"AI generation failed: {exc}")


# ============================================================
# QUESTION CLASSIFICATION
# ============================================================

def classify_question(
    question: str,
) -> Dict[str, Any]:
    """
    Classify a question using AI.

    This function does NOT generate paper questions.
    """

    _require_api_key()

    question = _clean_text(
        question
    )

    if not question:

        raise ValueError(
            "Question is required."
        )

    system_prompt = """
Classify the supplied academic question.

Return JSON only.

Possible difficulty values:
Easy
Medium
Hard

Bloom levels:
Remember
Understand
Apply
Analyze
Evaluate
Create
"""

    prompt = f"""
QUESTION:
{question}

Return:

{{
    "difficulty": "Easy/Medium/Hard",
    "bloom_level": "Remember/Understand/Apply/Analyze/Evaluate/Create"
}}
"""

    response = _call_openrouter(
        prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.0,
        max_tokens=500,
    )

    data = _extract_json(
        response
    )

    if not isinstance(data, dict):

        raise RuntimeError(
            "Invalid classification response."
        )

    return data


# ============================================================
# SYLLABUS ANALYZER
# ============================================================

def analyze_syllabus(
    syllabus_text: str,
) -> Dict[str, Any]:
    """
    Analyze syllabus structure.

    IMPORTANT:
    This function is for syllabus analysis only.

    It is NOT used to create paper questions.
    """

    _require_api_key()

    syllabus_text = _clean_text(
        syllabus_text
    )

    if not syllabus_text:

        raise ValueError(
            "Syllabus text is required."
        )

    system_prompt = """
You are a syllabus analysis assistant.

Analyze the supplied syllabus and identify:
- units
- topics
- learning outcomes

Do not generate examination questions.

Return JSON only.
"""

    prompt = f"""
SYLLABUS:

{syllabus_text}

Return JSON in this format:

{{
    "units": [
        {{
            "unit": "Unit I",
            "topics": [],
            "outcomes": []
        }}
    ]
}}
"""

    response = _call_openrouter(
        prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.1,
        max_tokens=4000,
    )

    data = _extract_json(
        response
    )

    if not isinstance(data, dict):

        raise RuntimeError(
            "Invalid syllabus analysis response."
        )

    return data


# ============================================================
# PREVIOUS PAPER ANALYSIS
# ============================================================

def previous_analysis(
    paper_text: str,
) -> Dict[str, Any]:
    """
    Analyze a previous question paper.
    """

    _require_api_key()

    paper_text = _clean_text(
        paper_text
    )

    if not paper_text:

        raise ValueError(
            "Previous paper text is required."
        )

    system_prompt = """
Analyze the supplied previous question paper.

Identify:
- question count
- marks distribution
- repeated topics
- difficulty distribution
- Bloom level patterns

Do not create a new question paper.

Return JSON only.
"""

    prompt = f"""
PREVIOUS QUESTION PAPER:

{paper_text}

Return a structured JSON analysis.
"""

    response = _call_openrouter(
        prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.1,
        max_tokens=4000,
    )

    data = _extract_json(
        response
    )

    if not isinstance(data, dict):

        raise RuntimeError(
            "Invalid previous paper analysis response."
        )

    return data


# ============================================================
# DUPLICATE QUESTION DETECTOR
# ============================================================

def detect_duplicates(
    questions: List[Any],
) -> List[Dict[str, Any]]:
    """
    Detect duplicate/similar questions.

    This does not generate new questions.
    """

    normalized = normalize_question_bank(
        questions
    )

    groups = defaultdict(list)

    for question in normalized:

        key = _normalize_question(
            question["question_text"]
        )

        groups[key].append(
            question
        )

    duplicates = []

    for key, items in groups.items():

        if len(items) > 1:

            duplicates.append(
                {
                    "question_text": items[0][
                        "question_text"
                    ],
                    "question_ids": [
                        item["id"]
                        for item in items
                    ],
                    "count": len(items),
                }
            )

    return duplicates


# ============================================================
# PAPER VALIDATION WITHOUT AI
# ============================================================

def validate_paper(
    paper: Dict[str, Any],
    questions: List[Any],
    blueprint: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Public helper for validating a generated paper.
    """

    normalized_questions = normalize_question_bank(
        questions
    )

    normalized_blueprint = normalize_blueprint(
        blueprint
    )

    return validate_generated_paper(
        paper,
        normalized_questions,
        normalized_blueprint,
    )


# ============================================================
# API STATUS
# ============================================================

def get_ai_status() -> Dict[str, Any]:
    """
    Return AI/OpenRouter configuration status.
    """

    return {
        "provider": "OpenRouter",
        "configured": bool(
            OPENROUTER_API_KEY
        ),
        "model": OPENROUTER_MODEL,
        "paper_generation_mode": (
            "Question Bank only"
        ),
        "allows_new_questions": False,
        "weightage_validation": True,
    }
