export const CLIENT_ACADEMIC_KB = {};

export const CLIENT_PATTERNS = [
];

export function cleanQuestion(text) {
  let t = String(text || '').trim();
  t = t.replace(/^(?:(?:\d+|[a-zA-Z]|[ivxIVX]+)[\.\)\:\-]\s*)+/, '').trim();
  t = t.replace(/\s*(?:\(\s*\d+\s*(?:marks?|m)\s*\)|\[\s*\d+\s*(?:marks?|m)\s*\])\s*$/i, '').trim();
  t = t.replace(/\s*(?:L[1-6]|CO[1-6]|[0-9,\s])+$/i, '').trim();
  return t;
}

export function findClientConcept(questionText) {
  const clean = cleanQuestion(questionText);
  for (const [re, key] of CLIENT_PATTERNS) {
    if (re.test(clean)) return CLIENT_ACADEMIC_KB[key];
  }
  for (const key of Object.keys(CLIENT_ACADEMIC_KB)) {
    const item = CLIENT_ACADEMIC_KB[key];
    const words = item.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const count = words.filter(w => clean.toLowerCase().includes(w)).length;
    if (count >= 2) return item;
  }
  return null;
}

export function generateLocalAcademicAnswer(questionText, marks = 2) {
  const clean = cleanQuestion(questionText);
  const concept = findClientConcept(clean);
  const m = Number(marks) || 2;

  if (concept) {
    const answer = m <= 2 ? "1. Definition & Core Concept\n" + concept.short_answer : concept.long_answer;
    return {
      answer,
      key_points: concept.key_points,
    };
  }

  const topic = clean.replace(/^(define|explain|what\s+is|describe|discuss|list\s+out|illustrate|compare)\s+/i, '').replace(/[\.?\s]+$/, '');
  if (m <= 2) {
    return {
      answer: "1. Definition & Core Concept\n" + topic + " represents a key conceptual topic in the university curriculum. It defines the formal technical specification, structural architecture, and operational principles required for robust engineering implementations.\n\n2. Essential Properties & Evaluation\n- Foundational Principles: Operates under established engineering standards and functional modular workflows.\n- Performance & Reliability: Ensures strict operational integrity, determinism, and error mitigation.\n- Examination Relevance: Demonstrates foundational conceptual understanding of " + topic + ".",
      key_points: [
        "Core definition and technical scope of " + topic.slice(0, 50),
        'Key operational mechanisms and architectural principles',
        'Demonstrated competence in university examination standards'
      ]
    };
  } else {
    return {
      answer: "1. Definition & Core Concept\n" + topic + " represents a key conceptual topic in the university curriculum. It defines the formal technical specification, structural architecture, and operational principles required for robust engineering implementations.\n\n2. Essential Properties & Evaluation\n- Foundational Principles: Operates under established engineering standards and functional modular workflows.\n- Performance & Reliability: Ensures strict operational integrity, determinism, and error mitigation.\n- Examination Relevance: Demonstrates foundational conceptual understanding of " + topic + ".\n\n3. Detailed Architectural Principles\nThis involves studying the complete hierarchical structure and its modular interdependencies.",
      key_points: [
        "Core definition and technical scope of " + topic.slice(0, 50),
        'Key operational mechanisms and architectural principles',
        'Hierarchical structure and modular dependencies',
        'Demonstrated competence in university examination standards'
      ]
    };
  }
}

export function generateLocalAssistantResponse(questionText) {
  const clean = cleanQuestion(questionText);
  const concept = findClientConcept(clean);

  if (concept) {
    return "Topic: " + concept.title + "\n\n1. Core Definition\n" + concept.short_answer + "\n\n2. Detailed Explanation\n" + concept.long_answer + "\n\n3. Key Exam Revision Points:\n" + concept.key_points.map(p => "- " + p).join('\n');
  }

  const { answer, key_points } = generateLocalAcademicAnswer(clean, 5);
  return "Regarding: " + clean + "\n\n1. Overview & Academic Scope\n" + answer + "\n\n2. Key Points for Examination:\n" + key_points.map(p => "- " + p).join('\n');
}

export function generateLocalPaper(params) {
  const { section_a_questions = 5, section_a_marks = 2, section_b_questions = 5, section_b_marks = 8 } = params;
  
  const content = [];
  let currentNum = 1;

  const kbKeys = Object.keys(CLIENT_ACADEMIC_KB);

  for (let i = 0; i < Number(section_a_questions); i++) {
    const key = kbKeys.length > 0 ? kbKeys[i % kbKeys.length] : null;
    const title = key ? CLIENT_ACADEMIC_KB[key].title : "Topic " + (i + 1);
    content.push({
      section: 'Section A',
      number: currentNum++,
      question: "Explain " + title + ".",
      marks: Number(section_a_marks),
      unit: 1,
      topic: title,
      difficulty: 'Easy',
      bloom_level: 'L1',
      co: 'CO1'
    });
  }

  for (let i = 0; i < Number(section_b_questions); i++) {
    const key = kbKeys.length > 0 ? kbKeys[(i + Number(section_a_questions)) % kbKeys.length] : null;
    const title = key ? CLIENT_ACADEMIC_KB[key].title : "Topic " + (i + 1 + Number(section_a_questions));
    content.push({
      section: 'Section B',
      number: currentNum++,
      question: "Discuss in detail about " + title + " covering its core architecture and operational principles.",
      marks: Number(section_b_marks),
      unit: 2,
      topic: title,
      difficulty: 'Medium',
      bloom_level: 'L2',
      co: 'CO2'
    });
  }

  return {
    content,
    message: 'Paper generated via Offline Resilience Mode.'
  };
}

