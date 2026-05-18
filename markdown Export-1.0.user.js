// ==UserScript==
// @name         Google AI Mode Chat → Markdown Export
// @namespace    https://tampermonkey.net/
// @version      1.0
// @description  Export Google AI Mode chats to Markdown with one click
// @match        https://www.google.com/search*
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const querySelector = 'span.VndcI.veK2kb';
  const responseSelector = 'div.mZJni';
  const timestampSelector = 'p.kwdzO';
  const codeBlockSelector = 'div.r1PmQe';

  const findTimestampBefore = (node, timestamps) => {
    let ts = '';
    for (const t of timestamps) {
      if (node.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_PRECEDING) {
        ts = t.innerText.trim();
      }
    }
    return ts;
  };


const EXCLUDED_CLASSES = ['DBd2Wb'];
const TAG_WRAPPERS = {
  'STRONG': t => `**${t}**`,
  'EM': t => `*${t}*`,
};
const CLASS_WRAPPERS = {
  'otQkpb': t => `## ${t}`,
  'uJ19be': () => `\n\n`,
  'notranslate': () => `\n\n`,
};
const TAG_BLOCK = {
  'LI': true,
  'UL': true,
  'OL': true,
};
const extractResponseText = (responseEl) => {
  const parts = [];
  const walk = (node, depth = 0) => {
    if (node.nodeType === 3) {
      const t = node.textContent?.trim();
      if (t) parts.push(t);
      return;
    }
    if (node.nodeType !== 1) return;
    const className = typeof node.className === 'string' ? node.className : '';
    if (EXCLUDED_CLASSES.some(c => className.split(' ').includes(c))) return;
    const preview = (node.innerText || '').trim().slice(0, 80).replace(/\n/g, '↵');
    console.log(`${'  '.repeat(depth)}[${node.tagName}] class="${className}" | "${preview}"`);
    const classWrapper = CLASS_WRAPPERS[className.split(' ').find(c => CLASS_WRAPPERS[c])];
    const tagWrapper = TAG_WRAPPERS[node.tagName];
    const wrapper = classWrapper || tagWrapper;
    if (wrapper) {
      const t = node.innerText;
      if (t) parts.push(wrapper(t));
      return;
    }
    const isCode = node.matches(codeBlockSelector) || node.querySelector?.(codeBlockSelector);
    if (isCode) {
      parts.push(`\n\`\`\`\n${node.innerText}\n\`\`\`\n`);
      return;
    }
    if (TAG_BLOCK[node.tagName]) {
      if (node.tagName === 'LI') {
        const liParts = [];
        const liWalk = (n) => {
          if (n.nodeType === 3) { const t = n.textContent; if (t) liParts.push(t); return; }
          if (n.nodeType !== 1) return;
          const cn = typeof n.className === 'string' ? n.className : '';
          if (EXCLUDED_CLASSES.some(c => cn.split(' ').includes(c))) return;
          const cw = CLASS_WRAPPERS[cn.split(' ').find(c => CLASS_WRAPPERS[c])];
          const tw = TAG_WRAPPERS[n.tagName];
          const w = cw || tw;
          if (w) { const t = n.innerText; if (t) liParts.push(w(t)); return; }
          [...n.childNodes].forEach(liWalk);
        };
        [...node.childNodes].forEach(liWalk);
        parts.push(`- ${liParts.join('')}`);
        return;
      }
      [...node.childNodes].forEach(child => walk(child, depth + 1));
      return;
    }
    [...node.childNodes].forEach(child => walk(child, depth + 1));
  };
  [...responseEl.childNodes].forEach(child => walk(child));
  return parts.length ? parts.join('\n') : responseEl.innerText;
};


    const exportMarkdown = () => {
    const queries = [...document.querySelectorAll(querySelector)]
      .map(el => ({ el, text: el.innerText }))
      .filter(q => q.text.length > 0);

    const responses = [...document.querySelectorAll(responseSelector)];
    const timestamps = [...document.querySelectorAll(timestampSelector)];

    if (!queries.length || !responses.length) {
      alert("No chats found. Scroll to load all content first.");
      return;
    }

    const chats = [];

    for (let i = 0; i < queries.length; i++) {
      const qEl = queries[i].el;
      const qText = queries[i].text;
      const nextQEl = queries[i + 1]?.el || null;

      const matchedResponses = responses.filter(r => {
        const afterCurrent = qEl.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING;
        const beforeNext = nextQEl
          ? r.compareDocumentPosition(nextQEl) & Node.DOCUMENT_POSITION_FOLLOWING
          : true;
        return afterCurrent && beforeNext;
      });

      let prefixResponses = [];
      if (i === 0) {
        prefixResponses = responses.filter(r =>
          r.compareDocumentPosition(qEl) & Node.DOCUMENT_POSITION_FOLLOWING
        );
      }

      const allResponses = [...prefixResponses, ...matchedResponses];

      const responseText = allResponses
        .map(extractResponseText)
        .filter(Boolean)
        .join('\n\n---\n\n');

      chats.push({
        id: i + 1,
        query: qText,
        response: responseText,
        timestamp: findTimestampBefore(qEl, timestamps),
      });
    }

    const md = chats.map(c => {
      const ts = c.timestamp ? `\n\n> **Timestamp:** ${c.timestamp}` : '';
      return `## Question:\n${c.query}\n\n## Answer:\n${c.response}\n`;
    }).join('\n---\n\n');

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = document.title.replace(/ - Google Search$/, "").replace(/[<>:"/\\|?*]/g, "_") + ".md"; // 'google_ai_chats.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const addButton = () => {
    if (document.getElementById('ai-export-md-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'ai-export-md-btn';
    btn.textContent = '⬇ Export AI Chat (MD)';
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '999999';
    btn.style.padding = '10px 14px';
    btn.style.background = '#1a73e8';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.fontSize = '14px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    btn.onclick = exportMarkdown;

    document.body.appendChild(btn);
  };

  // Add button after page load
  window.addEventListener('load', addButton);
})();