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
    if (m <= 2) {
      return {
        answer: "1. Definition & Core Concept\n" + concept.short_answer,
        key_points: [
          "[1 Mark] Definition & Scope: " + (concept.key_points[0] || 'Core theoretical concept'),
          "[1 Mark] Key Property: " + (concept.key_points[1] || 'Technical mechanism & syntax')
        ]
      };
    } else if (m <= 5) {
      return {
        answer: "1. Definition & Core Concept\n" + concept.short_answer + "\n\n2. Key Functional Architecture & Properties\n" + (concept.long_answer ? concept.long_answer.slice(0, 350) : concept.short_answer),
        key_points: [
          "[1 Mark] Core definition and technical scope",
          "[2 Marks] Working principle and functional components",
          `[${m - 3 || 2} Marks] System properties, reliability, and exam evaluation`
        ]
      };
    } else if (m <= 8) {
      return {
        answer: "1. Theoretical Foundation & Definition\n" + concept.short_answer + "\n\n2. Architectural Principles & Operation\n" + concept.long_answer + "\n\n3. Practical Applications & Case Analysis\nDemonstrates critical technical capabilities across high-availability engineering implementations.",
        key_points: [
          "[2 Marks] Comprehensive definition and technical classification",
          "[3 Marks] Structural architecture and operational workflow",
          "[3 Marks] Practical implementation, advantages, and exam criteria"
        ]
      };
    } else {
      return {
        answer: "1. Comprehensive Introduction & Formal Definition\n" + concept.short_answer + "\n\n2. In-Depth Architectural & Operational Principles\n" + concept.long_answer + "\n\n3. Methodological Workflow & Diagrammatic Formulation\nExplores modular dependencies, state transitions, and deterministic execution pipelines.\n\n4. Real-World Applications & Strategic Trade-offs\nAnalyzes engineering implementations, scalability benchmarks, and reliability assurance.",
        key_points: [
          "[2 Marks] Formal definition, scope, and theoretical classification",
          "[4 Marks] Comprehensive architecture, workflow, and operational dynamics",
          "[3 Marks] Implementation details, formulas, and diagrams representation",
          `[${Math.max(1, m - 9)} Marks] Comparative analysis, practical use cases, and conclusion`
        ]
      };
    }
  }

  const topic = clean.replace(/^(define|explain|what\s+is|describe|discuss|list\s+out|illustrate|compare)\s+/i, '').replace(/[\.?\s]+$/, '');
  if (m <= 2) {
    return {
      answer: "1. Definition & Core Concept\n" + topic + " represents a key conceptual topic in the university curriculum. It defines the formal technical specification, structural architecture, and operational principles required for robust engineering implementations.\n\n2. Essential Properties\nOperates under established engineering standards with strict operational integrity and error mitigation.",
      key_points: [
        "[1 Mark] Core definition and technical scope of " + topic.slice(0, 45),
        "[1 Mark] Key operational properties, deterministic execution, and constraints"
      ]
    };
  } else if (m <= 5) {
    return {
      answer: "1. Definition & Core Concept\n" + topic + " represents a key conceptual topic in the university curriculum. It defines the formal technical specification, structural architecture, and operational principles required for robust engineering implementations.\n\n2. Essential Properties & Evaluation\n- Foundational Principles: Operates under established engineering standards and functional modular workflows.\n- Performance & Reliability: Ensures strict operational integrity, determinism, and error mitigation.\n- Examination Relevance: Demonstrates foundational conceptual understanding of " + topic + ".\n\n3. Functional Characteristics\nDemonstrates clear modularity, deterministic workflows, and high adaptability in practical systems.",
      key_points: [
        "[1 Mark] Core definition and technical scope of " + topic.slice(0, 45),
        "[2 Marks] Architectural mechanisms and operational workflows",
        `[${m - 3 || 2} Marks] System properties, reliability, and examination criteria`
      ]
    };
  } else if (m <= 8) {
    return {
      answer: "1. Formal Definition & Overview\n" + topic + " represents an essential topic in the university curriculum, establishing the theoretical foundations and functional specifications for technical design.\n\n2. Architectural Breakdown & Working Principles\n- Modular Organization: Implements structured subsystems to manage data and control flow efficiently.\n- Operational Determinism: Guarantees correctness, exception handling, and fault tolerance across executions.\n\n3. Step-by-Step Methodology\nExamines the lifecycle progression from initialization to execution and validation.\n\n4. Advantages & Real-World Use Cases\nProvides high scalability, robust fault containment, and widespread adoption in modern academic and industry frameworks.",
      key_points: [
        "[2 Marks] Formal definition and fundamental classification of " + topic.slice(0, 45),
        "[3 Marks] Architectural framework, core components, and operational flow",
        "[3 Marks] Step-by-step methodology, practical advantages, and evaluation"
      ]
    };
  } else {
    return {
      answer: "1. Comprehensive Introduction & Formal Definition\n" + topic + " represents an advanced academic topic in the curriculum, establishing the theoretical foundations, architectural standards, and operational criteria for mission-critical systems.\n\n2. Detailed Architectural Principles & Mathematical/Structural Models\n- Foundational Architecture: Organizes modular abstractions into high-cohesion, low-coupling structures.\n- State Transitions & Workflows: Manages transitions through verified protocols, guaranteeing consistency and deterministic behavior.\n\n3. In-Depth Operational Mechanism & Diagrammatic Representation\nDetailed execution flow illustrates how inputs are ingested, processed through intermediary pipelines, and verified before state commitment.\n\n4. Real-World Applications & Implementation Guidelines\nWidely adopted in enterprise and academic systems requiring high availability, rigorous performance benchmarks, and fault resilience.\n\n5. Comparative Evaluation & Summary\nBalances computational efficiency against complexity, providing balanced performance and strict adherence to university evaluation benchmarks.",
      key_points: [
        "[2 Marks] In-depth definition, academic context, and theoretical scope",
        "[4 Marks] Comprehensive architectural breakdown, mechanisms, and workflow",
        "[3 Marks] Diagrammatic representation, implementation methodology, and formulas",
        `[${Math.max(1, m - 9)} Marks] Real-world applications, trade-off analysis, and conclusions`
      ]
    };
  }
}

export function parseClientQuestionPaperText(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/);
  const extracted = [];
  let currentSection = 'General';
  let sectionMarks = 2;
  let currentQNum = null;
  let currentQText = [];
  let currentQMarks = null;
  let currentQSec = 'General';

  const secPattern = /^(?:(?:section|part|module|unit)\s*[-_:]?\s*([a-z0-9]+)|(\d+)\s*marks?\s*(?:questions?|each)?|questions?\s*carrying\s*(\d+)\s*marks?)/i;
  const secMarksCalc = /(\d+)\s*x\s*(\d+)\s*=\s*(\d+)\s*(?:marks?)?/i;
  const qStartPattern = /^(?:q(?:uestion)?\s*[\.:\-]?\s*)?(\d+|[a-z]|[ivxIVX]+)[\.\)\:\-]\s+(.*)/i;
  const marksExplicitPattern = /[\(\[]\s*(\d+)\s*(?:marks?|m)?\s*[\)\]]\s*$/i;
  const skipHeaders = /^(university|department|b\.?tech|m\.?tech|semester|time\s*:|max(?:imum)?\s*marks|register\s*no|roll\s*no|instructions?\s*:|answer\s*all|answer\s*any|note\s*:|course\s*code|subject\s*code|page\s*\d+)/i;

  const flushQ = () => {
    if (currentQText.length > 0) {
      let rawText = currentQText.join(' ').trim();
      let finalMarks = currentQMarks || sectionMarks;
      const mMatch = rawText.match(marksExplicitPattern);
      if (mMatch) {
        finalMarks = parseInt(mMatch[1], 10);
        rawText = rawText.slice(0, mMatch.index).trim();
      } else {
        const inlineM = rawText.match(/[\(\[]\s*(\d+)\s*(?:marks?|m)\s*[\)\]]/i);
        if (inlineM) {
          finalMarks = parseInt(inlineM[1], 10);
          rawText = rawText.replace(inlineM[0], '').trim();
        }
      }
      let cleanText = rawText.replace(/^(?:q(?:uestion)?\s*[\.:\-]?\s*)?(?:\d+|[a-z]|[ivxIVX]+)[\.\)\:\-]\s*/i, '').trim();
      if (cleanText.length >= 5) {
        extracted.push({
          number: extracted.length + 1,
          original_label: currentQNum || String(extracted.length + 1),
          section: currentQSec,
          question_text: cleanText,
          marks: finalMarks || 2
        });
      }
    }
    currentQNum = null;
    currentQText = [];
    currentQMarks = null;
  };

  for (let rawLine of lines) {
    const line = rawLine.trim().replace(/^\ufeff/, '');
    if (!line) continue;
    if (skipHeaders.test(line)) continue;

    const secM = line.match(secPattern);
    if (secM) {
      flushQ();
      const matchedSec = secM[1] || '';
      const calcM = line.match(secMarksCalc);
      if (calcM) {
        sectionMarks = parseInt(calcM[2], 10);
        currentSection = `Section ${matchedSec.toUpperCase() || 'A'}`;
      } else if (secM[2]) {
        sectionMarks = parseInt(secM[2], 10);
        currentSection = `${sectionMarks} Marks Section`;
      } else if (secM[3]) {
        sectionMarks = parseInt(secM[3], 10);
        currentSection = `${sectionMarks} Marks Section`;
      } else {
        currentSection = `Section ${matchedSec.toUpperCase() || 'A'}`;
        const low = matchedSec.toLowerCase();
        if (['a', '1', 'one'].includes(low)) sectionMarks = 2;
        else if (['b', '2', 'two'].includes(low)) sectionMarks = 8;
        else if (['c', '3', 'three'].includes(low)) sectionMarks = 16;
      }
      continue;
    }

    const qM = line.match(qStartPattern);
    if (qM) {
      flushQ();
      currentQNum = qM[1];
      currentQSec = currentSection;
      currentQMarks = sectionMarks;
      currentQText.push(line);
    } else {
      if (currentQText.length > 0) {
        currentQText.push(line);
      } else {
        const inlineM = line.match(marksExplicitPattern);
        if (inlineM && line.length > 15) {
          currentQNum = String(extracted.length + 1);
          currentQSec = currentSection;
          currentQMarks = parseInt(inlineM[1], 10);
          currentQText.push(line);
          flushQ();
        }
      }
    }
  }

  flushQ();
  return extracted;
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

