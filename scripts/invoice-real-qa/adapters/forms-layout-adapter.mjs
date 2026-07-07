import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const FORMS_LAYOUT_FAILURE_CATEGORIES = [
  "forms_annotation_missing",
  "forms_image_missing",
  "forms_json_parse_failed",
  "forms_no_form_entries",
  "forms_low_label_coverage",
  "forms_low_box_coverage",
  "forms_no_answer_fields",
  "forms_no_question_answer_links",
  "forms_words_missing",
];

const EXPECTED_LABELS = new Set(["question", "answer", "header", "other"]);

export function buildFormsLayoutDocument({ imagePath, annotationPath, salt }) {
  const documentId = hashDocumentId({ imagePath, annotationPath, salt });
  const parsed = parseFormsAnnotation(annotationPath);
  return {
    documentId,
    source: "forms_layout",
    suite: "external_forms_layout_holdout",
    mode: "form_json_annotation",
    imagePresent: Boolean(imagePath && fs.existsSync(imagePath)),
    annotationPresent: Boolean(annotationPath && fs.existsSync(annotationPath)),
    entries: parsed.entries,
    parseError: parsed.error,
  };
}

export function evaluateFormsLayoutDocument(document) {
  const categories = new Set();
  if (!document.imagePresent) categories.add("forms_image_missing");
  if (!document.annotationPresent) categories.add("forms_annotation_missing");
  if (document.parseError) categories.add("forms_json_parse_failed");
  if (!document.entries.length) categories.add("forms_no_form_entries");

  const labelCounts = countBy(document.entries, (entry) => entry.label || "missing");
  const labeled = document.entries.filter((entry) => EXPECTED_LABELS.has(entry.label)).length;
  const validBoxes = document.entries.filter((entry) => hasValidBox(entry.box)).length;
  const wordEntries = document.entries.filter((entry) => Array.isArray(entry.words) && entry.words.length).length;
  const linkedPairs = extractLinks(document.entries);
  const directQuestionAnswerLinks = countQuestionAnswerLinks(document.entries);
  const inferredQuestionAnswerLinks = inferQuestionAnswerLinks(document.entries);
  const questionAnswerLinks = Math.max(directQuestionAnswerLinks, inferredQuestionAnswerLinks);

  const labelCoverage = ratioNumber(labeled, document.entries.length);
  const boxCoverage = ratioNumber(validBoxes, document.entries.length);
  const wordCoverage = ratioNumber(wordEntries, document.entries.length);

  if (document.entries.length && labelCoverage < 0.8) categories.add("forms_low_label_coverage");
  if (document.entries.length && boxCoverage < 0.9) categories.add("forms_low_box_coverage");
  if (document.entries.length && wordCoverage < 0.5) categories.add("forms_words_missing");
  if (document.entries.length && (labelCounts.answer ?? 0) === 0) {
    categories.add("forms_no_answer_fields");
  } else if (document.entries.length && questionAnswerLinks === 0) {
    categories.add("forms_no_question_answer_links");
  }

  const status =
    document.parseError || !document.imagePresent || !document.annotationPresent
      ? "failed"
      : document.entries.length && labelCoverage >= 0.8 && boxCoverage >= 0.9 && questionAnswerLinks > 0
        ? "pass_with_partial_ground_truth"
        : document.entries.length
          ? "needs_manual_review"
          : "failed";

  return {
    documentId: document.documentId,
    source: "forms_layout",
    suite: "external_forms_layout_holdout",
    mode: document.mode,
    status,
    pages: 1,
    expectedPartialPresent: {
      formEntries: document.entries.length > 0,
      labels: labeled > 0,
      boxes: validBoxes > 0,
      questionAnswerLinks: questionAnswerLinks > 0,
    },
    metrics: {
      formEntries: document.entries.length,
      questions: labelCounts.question ?? 0,
      answers: labelCounts.answer ?? 0,
      headers: labelCounts.header ?? 0,
      other: labelCounts.other ?? 0,
      labelCoverage: labelCoverage.toFixed(3),
      boxCoverage: boxCoverage.toFixed(3),
      wordCoverage: wordCoverage.toFixed(3),
      linkedPairs,
      directQuestionAnswerLinks,
      inferredQuestionAnswerLinks,
      questionAnswerLinks,
    },
    confidence: {
      layout: roundConfidence(boxCoverage),
      labels: roundConfidence(labelCoverage),
      words: roundConfidence(wordCoverage),
      linking: roundConfidence(ratioNumber(questionAnswerLinks, Math.max(1, labelCounts.answer ?? 0))),
      ocr: wordCoverage > 0 ? 1 : 0,
    },
    failureCategories: [...categories].sort(),
    aiUsed: false,
    needsManualReview: !["pass_with_partial_ground_truth"].includes(status),
  };
}

export function parseFormsAnnotation(annotationPath) {
  if (!annotationPath || !fs.existsSync(annotationPath)) {
    return { entries: [], error: "annotation_missing" };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(annotationPath, "utf8"));
    const entries = Array.isArray(raw.form) ? raw.form : [];
    return {
      entries: entries.map((entry) => ({
        id: entry.id,
        box: Array.isArray(entry.box) ? entry.box.map(Number) : [],
        label: normalizeLabel(entry.label),
        words: Array.isArray(entry.words) ? entry.words.map(normalizeWord) : [],
        linking: Array.isArray(entry.linking) ? entry.linking : [],
      })),
      error: undefined,
    };
  } catch (error) {
    return { entries: [], error: error.message };
  }
}

function normalizeWord(word) {
  return {
    box: Array.isArray(word?.box) ? word.box.map(Number) : [],
    hasText: Boolean(String(word?.text ?? "").trim()),
  };
}

function normalizeLabel(value) {
  return String(value ?? "").trim().toLowerCase();
}

function extractLinks(entries) {
  const seen = new Set();
  for (const entry of entries) {
    for (const pair of entry.linking ?? []) {
      if (!Array.isArray(pair) || pair.length !== 2) continue;
      const [left, right] = pair.map(Number);
      if (!Number.isFinite(left) || !Number.isFinite(right)) continue;
      seen.add([left, right].sort((a, b) => a - b).join(":"));
    }
  }
  return seen.size;
}

function countQuestionAnswerLinks(entries) {
  const byId = new Map(entries.map((entry) => [Number(entry.id), entry]));
  const seen = new Set();
  for (const entry of entries) {
    for (const pair of entry.linking ?? []) {
      if (!Array.isArray(pair) || pair.length !== 2) continue;
      const [left, right] = pair.map(Number);
      const leftEntry = byId.get(left);
      const rightEntry = byId.get(right);
      if (!leftEntry || !rightEntry) continue;
      const labels = new Set([leftEntry.label, rightEntry.label]);
      if (labels.has("question") && labels.has("answer")) {
        seen.add([left, right].sort((a, b) => a - b).join(":"));
      }
    }
  }
  return seen.size;
}

function inferQuestionAnswerLinks(entries) {
  const questions = entries.filter((entry) => entry.label === "question" && hasValidBox(entry.box));
  const answers = entries.filter((entry) => entry.label === "answer" && hasValidBox(entry.box));
  const usedAnswers = new Set();
  let links = 0;
  for (const question of questions) {
    const candidate = answers
      .filter((answer) => !usedAnswers.has(answer.id))
      .map((answer) => ({ answer, score: proximityScore(question.box, answer.box) }))
      .filter((item) => Number.isFinite(item.score))
      .sort((a, b) => a.score - b.score)[0];
    if (!candidate || candidate.score > 500) continue;
    usedAnswers.add(candidate.answer.id);
    links += 1;
  }
  return links;
}

function proximityScore(questionBox, answerBox) {
  const [qx1, qy1, qx2, qy2] = questionBox;
  const [ax1, ay1, ax2, ay2] = answerBox;
  const qy = (qy1 + qy2) / 2;
  const ay = (ay1 + ay2) / 2;
  const verticalDistance = Math.abs(qy - ay);
  const sameLine = verticalDistance <= Math.max(18, (qy2 - qy1) * 1.5);
  const answerToRight = ax1 >= qx1 - 5;
  const answerBelow = ay1 >= qy1 && ay1 - qy2 <= 70;
  if (!sameLine && !answerBelow) return Number.POSITIVE_INFINITY;
  if (!answerToRight && !answerBelow) return Number.POSITIVE_INFINITY;
  const horizontalDistance = answerToRight ? Math.max(0, ax1 - qx2) : Math.abs(ax1 - qx1) + 80;
  const sizePenalty = Math.max(0, (ax2 - ax1) - 900) / 10;
  return verticalDistance * 4 + horizontalDistance + sizePenalty;
}

function hasValidBox(box) {
  if (!Array.isArray(box) || box.length !== 4) return false;
  const [x1, y1, x2, y2] = box.map(Number);
  return [x1, y1, x2, y2].every(Number.isFinite) && x2 > x1 && y2 > y1;
}

function ratioNumber(part, total) {
  return total > 0 ? part / total : 0;
}

function roundConfidence(value) {
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function hashDocumentId({ imagePath, annotationPath, salt }) {
  return crypto
    .createHash("sha256")
    .update(`${salt}:${path.basename(imagePath ?? "missing")}:${path.basename(annotationPath ?? "missing")}`)
    .digest("hex")
    .slice(0, 24);
}
