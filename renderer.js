const editor = document.getElementById("editor");

let translations = {};

function loadTranslations(language = "en") {
  const translationData = {
    en: {
      words: "words",
      chars: "chars",
      read: "read",
      sec: "sec",
      min: "min",
      normal: "Normal",
      header1: "Header 1",
      header2: "Header 2",
      header3: "Header 3",
      header4: "Header 4",
      header5: "Header 5",
      header6: "Header 6",
    },
    ca: {
      words: "paraules",
      chars: "caràcters",
      read: "de lectura",
      sec: "seg",
      min: "min",
      normal: "Normal",
      header1: "Títol 1",
      header2: "Títol 2",
      header3: "Títol 3",
      header4: "Títol 4",
      header5: "Títol 5",
      header6: "Títol 6",
    },
  };

  translations = translationData[language] || translationData["en"];
}

function updateUITranslations() {
  const headerSelect = document.getElementById("header-select");
  if (headerSelect) {
    const options = headerSelect.options;
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const key = option.getAttribute("data-i18n");
      if (key && translations[key]) {
        option.text = translations[key];
      }
    }
  }
}

window.api.onLanguageChanged((language) => {
  loadTranslations(language);
  updateUITranslations();
  updateStatistics();
});

function updateStatistics() {
  const text = editor.textContent.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const charCount = text.length;
  const readingTime = calculateReadingTime(wordCount);

  document.getElementById("word-count").textContent =
    `${wordCount} ${translations.words || "words"} - ${charCount} ${translations.chars || "chars"} - ${readingTime} ${translations.read || "read"}`;
}

function calculateReadingTime(wordCount) {
  // Average reading speed: 200 words per minute
  const wordsPerMinute = 200;
  const minutes = wordCount / wordsPerMinute;
  const seconds = Math.round(minutes * 60);

  if (seconds < 60) {
    return `${seconds} sec`;
  } else {
    const mins = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${mins} min ${remainingSeconds} sec`
      : `${mins} min`;
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseInlineMarkdown(text) {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function parseMarkdownToHtml(text) {
  if (/^######\s+/.test(text)) {
    return `<h6>${parseInlineMarkdown(text.replace(/^######\s+/, ""))}</h6>`;
  }
  if (/^#####\s+/.test(text)) {
    return `<h5>${parseInlineMarkdown(text.replace(/^#####\s+/, ""))}</h5>`;
  }
  if (/^####\s+/.test(text)) {
    return `<h4>${parseInlineMarkdown(text.replace(/^####\s+/, ""))}</h4>`;
  }
  if (/^###\s+/.test(text)) {
    return `<h3>${parseInlineMarkdown(text.replace(/^###\s+/, ""))}</h3>`;
  }
  if (/^##\s+/.test(text)) {
    return `<h2>${parseInlineMarkdown(text.replace(/^##\s+/, ""))}</h2>`;
  }
  if (/^#\s+/.test(text)) {
    return `<h1>${parseInlineMarkdown(text.replace(/^#\s+/, ""))}</h1>`;
  }
  return `<div>${parseInlineMarkdown(text) || "<br>"}</div>`;
}

window.api.onFileOpened((content) => {
  const html = content
    .split("\n")
    .map((line) => parseMarkdownToHtml(line))
    .join("");
  editor.innerHTML = html;
});

function htmlToMarkdown(html) {
  const container = document.createElement("div");
  container.innerHTML = html;

  container.querySelectorAll("strong, b").forEach((el) => {
    el.replaceWith(document.createTextNode(`**${el.textContent}**`));
  });
  container.querySelectorAll("em, i").forEach((el) => {
    el.replaceWith(document.createTextNode(`*${el.textContent}*`));
  });
  container.querySelectorAll("u").forEach((el) => {
    el.replaceWith(document.createTextNode(`__${el.textContent}__`));
  });

  const blockElements = container.querySelectorAll(
    "h1, h2, h3, h4, h5, h6, div",
  );
  blockElements.forEach((el) => {
    let prefix = "";
    if (el.tagName === "H1") prefix = "# ";
    else if (el.tagName === "H2") prefix = "## ";
    else if (el.tagName === "H3") prefix = "### ";
    else if (el.tagName === "H4") prefix = "#### ";
    else if (el.tagName === "H5") prefix = "##### ";
    else if (el.tagName === "H6") prefix = "###### ";

    const textNode = document.createTextNode(prefix + el.textContent + "\n");
    el.replaceWith(textNode);
  });

  return container.innerText.replace(/\r/g, "").trim();
}

window.getEditorContent = () => {
  const html = editor.innerHTML;
  return htmlToMarkdown(html);
};

editor.addEventListener("input", updateStatistics);

loadTranslations("en");
updateUITranslations();
updateStatistics();

function isSelectionInsideEditor() {
  const selection = window.getSelection();
  if (!selection.rangeCount || selection.isCollapsed) return false;

  const range = selection.getRangeAt(0);
  return editor.contains(range.commonAncestorContainer);
}

function toggleCommand(command) {
  if (!isSelectionInsideEditor()) return false;

  document.execCommand(command);
  return true;
}

function getSelectedBlockElement() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  let node = selection.getRangeAt(0).startContainer;
  while (node && node !== editor && node.nodeType !== Node.ELEMENT_NODE) {
    node = node.parentNode;
  }
  while (
    node &&
    node !== editor &&
    !["DIV", "H1", "H2", "H3", "H4", "H5", "H6"].includes(node.nodeName)
  ) {
    node = node.parentNode;
  }
  return node === editor ? null : node;
}

function getCurrentBlockLevel() {
  const block = getSelectedBlockElement();
  if (!block) return "";
  if (block.nodeName === "H1") return "1";
  if (block.nodeName === "H2") return "2";
  if (block.nodeName === "H3") return "3";
  if (block.nodeName === "H4") return "4";
  if (block.nodeName === "H5") return "5";
  if (block.nodeName === "H6") return "6";
  return "";
}

function updateHeaderSelect() {
  const headerSelect = document.getElementById("header-select");
  if (!headerSelect) return;
  headerSelect.value = getCurrentBlockLevel();
}

function applyHeader(level) {
  const blockType = level ? `h${level}` : "div";
  document.execCommand("formatBlock", false, blockType);
  updateHeaderSelect();
  return true;
}

document.getElementById("bold-btn").addEventListener("click", () => {
  if (toggleCommand("bold")) editor.focus();
});

document.getElementById("italic-btn").addEventListener("click", () => {
  if (toggleCommand("italic")) editor.focus();
});

document.getElementById("underline-btn").addEventListener("click", () => {
  if (toggleCommand("underline")) editor.focus();
});

document.getElementById("header-select").addEventListener("change", (event) => {
  const value = event.target.value;
  const level = value ? Number(value) : null;
  if (applyHeader(level)) {
    editor.focus();
  }
});

document.addEventListener("selectionchange", () => {
  if (document.activeElement === editor) {
    updateHeaderSelect();
  }
});

editor.addEventListener("click", updateHeaderSelect);
editor.addEventListener("keyup", updateHeaderSelect);
