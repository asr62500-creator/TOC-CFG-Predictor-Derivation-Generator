const $ = id => document.getElementById(id);
const EPSILON = new Set(["", "ε", "ϵ", "λ", "^", "eps", "epsilon"]);
const MAX_INPUT = 40;
const MAX_WORK = 3000000;          // safety limit so a pathological grammar cannot freeze the tab

const examples = {
    anbn: {
        grammar: "S -> aSb\nS -> ε",
        start: "S",
        input: "aaabbb"
    },

    parentheses: {
        grammar: "S -> (S)S\nS -> ε",
        start: "S",
        input: "(()())"
    },

    palindrome: {
        grammar: "S -> aSa | bSb | a | b | ε",
        start: "S",
        input: "abba"
    },

    arithmetic: {
        grammar: "E -> E+T | T\nT -> T*F | F\nF -> (E) | i",
        start: "E",
        input: "i+i*(i+i)"
    },

    equalAnyOrder: {
        grammar: "S -> aSbS | bSaS | ε",
        start: "S",
        input: "abba"
    },

    oddAs: {
        grammar: "S -> bS | aT | ε\nT -> bT | aS",
        start: "S",
        input: "abb"
    },

    evenAs: {
        grammar: "S -> bS | aT | ε\nT -> bT | aS",
        start: "T",
        input: "abba"
    },

    endsInA: {
        grammar: "S -> aS | bS | a",
        start: "S",
        input: "bba"
    },

    containsAB: {
        grammar: "S -> XabX\nX -> aX | bX | ε",
        start: "S",
        input: "baab"
    },

    onlyAs: {
        grammar: "S -> aS | ε",
        start: "S",
        input: "aaaa"
    },

    startsWithA: {
        grammar: "S -> aX\nX -> aX | bX | ε",
        start: "S",
        input: "abba"
    },

    noConsecutiveAs: {
        grammar: "S -> bS | aT | ε\nT -> bS | ε",
        start: "S",
        input: "abab"
    }
};

// ---------- events ----------
$("examples").addEventListener("change", () => {
  const ex = examples[$("examples").value];
  if (!ex) return;
  $("grammar").value = ex.grammar;
  $("startSymbol").value = ex.start;
  $("inputString").value = ex.input;
  resetResults();
});

$("epsBtn").addEventListener("click", () => {            // NEW: ε is hard to type on most keyboards
  const box = $("grammar"), a = box.selectionStart, b = box.selectionEnd;
  box.value = box.value.slice(0, a) + "ε" + box.value.slice(b);
  box.focus();
  box.setSelectionRange(a + 1, a + 1);
});

$("validateBtn").addEventListener("click", validate);
for (const id of ["inputString", "startSymbol"])         // NEW: Enter key validates
  $(id).addEventListener("keydown", e => { if (e.key === "Enter") validate(); });

$("clearBtn").addEventListener("click", () => {
  $("grammar").value = "";
  $("startSymbol").value = "S";
  $("inputString").value = "";
  $("examples").value = "";
  resetResults();
});

function resetResults() {
  $("result").className = "output";
  $("result").textContent = "Enter a grammar and input string, then select Validate String.";
  $("leftmostDerivation").textContent = "Leftmost derivation will appear here.";
  $("rightmostDerivation").textContent = "Rightmost derivation will appear here.";
  $("parseTree").textContent = "The parse tree will appear here.";
}

// ---------- grammar parsing ----------
function parseGrammar(source) {
  const grammar = {};
  // FIX 1: was /\\r?\\n/ (double backslash) - that matches the typed characters "\n", not a line break,
  //        so a multi-line grammar was never split into rules.
  const lines = source.split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) return;
    // FIX 2: was \\s* (a literal backslash) - every rule failed to match, so every grammar was rejected.
    const match = line.match(/^([A-Z])\s*(?:->|→)\s*(.*)$/);
    if (!match) throw new Error(`Line ${idx + 1}: "${line}" is not a valid rule. Use the form  S -> aSb | ε`);
    const lhs = match[1];
    if (!grammar[lhs]) grammar[lhs] = [];                 // FIX 3: replaced "??=" (fails on older browsers)
    for (let alt of match[2].split("|")) {
      alt = alt.replace(/\s+/g, "");                      // FIX 4: was /\\s+/g - spaces were never removed
      if (EPSILON.has(alt)) alt = "";
      else if (/[ελϵ]/.test(alt)) throw new Error(`Line ${idx + 1}: write ε as its own alternative, for example  ${lhs} -> aSb | ε`);
      if (!grammar[lhs].includes(alt)) grammar[lhs].push(alt);
    }
    // FIX 5: removed the empty "if (...) { }" block that did nothing.
  });
  if (!Object.keys(grammar).length) throw new Error("No valid production rules found.");
  return grammar;
}

// ---------- validate ----------
function validate() {
  resetResults();
  try {
    const grammarText = $("grammar").value.trim();
    if (!grammarText) throw new Error("Please enter production rules.");
    const grammar = parseGrammar(grammarText);

    const start = ($("startSymbol").value.trim() || Object.keys(grammar)[0]).toUpperCase();   // NEW: accepts "s" too
    if (!/^[A-Z]$/.test(start)) throw new Error("Start symbol must be one uppercase letter, such as S.");
    if (!grammar[start]) throw new Error(`No production rules are defined for start symbol ${start}.`);

    // FIX 6: spaces were kept in the input, but rules never contain spaces, so "a b" could never be accepted
    //        (and an accidental trailing space rejected valid strings). Spaces are now ignored.
    const raw = $("inputString").value.replace(/\s+/g, "");
    const input = EPSILON.has(raw) ? "" : raw;
    if (input.length > MAX_INPUT) throw new Error(`For this project, input strings are limited to ${MAX_INPUT} characters.`);

    const missing = new Set();
    for (const rules of Object.values(grammar))          // FIX 7: removed unused variable "lhs"
      for (const rhs of rules) for (const ch of rhs) if (/[A-Z]/.test(ch) && !grammar[ch]) missing.add(ch);
    if (missing.size) throw new Error("Missing production rules for non-terminal(s): " + [...missing].join(", ") + ".");

    const tree = findParseTree(grammar, start, input);
    if (!tree) {
      $("result").className = "output failure";
      $("result").textContent = `REJECTED — "${input || "ε"}" cannot be derived from this grammar.`;
      $("leftmostDerivation").textContent = "No derivation exists.";
      $("rightmostDerivation").textContent = "No derivation exists.";
      $("parseTree").textContent = "No parse tree because the string is not in the language.";
      return;
    }

    const left = makeDerivation(tree, "left"), right = makeDerivation(tree, "right");
    $("result").className = "output success";
    $("result").textContent = `ACCEPTED — "${input || "ε"}" can be derived from ${start} (${left.length - 1} derivation steps).`;
    renderDerivation($("leftmostDerivation"), left);
    renderDerivation($("rightmostDerivation"), right);
    renderTree(tree);
  } catch (error) {
    $("result").className = "output failure";
    $("result").textContent = error.message || "Something went wrong while validating the grammar.";
  }
}

// Dynamic-programming membership test that also builds a parse tree.
// Handles epsilon rules, alternatives, recursion and left recursion.
function findParseTree(grammar, start, input) {
  const n = input.length, table = new Map();
  const key = (nt, i, j) => `${nt}|${i}|${j}`;
  let work = 0;

  function matchRule(rhs, k, i, j, children) {
    if (++work > MAX_WORK) throw new Error("This grammar is too complex for this input. Try a shorter string or a simpler grammar.");
    if (k === rhs.length) return i === j ? children : null;
    const symbol = rhs[k];
    if (!/[A-Z]/.test(symbol)) {
      return i < j && input[i] === symbol ? matchRule(rhs, k + 1, i + 1, j, [...children, { symbol, terminal: true }]) : null;
    }
    for (let m = i; m <= j; m++) {
      const child = table.get(key(symbol, i, m));
      if (!child) continue;
      const result = matchRule(rhs, k + 1, m, j, [...children, child]);
      if (result) return result;
    }
    return null;
  }

  for (let len = 0; len <= n; len++) {
    for (let i = 0; i + len <= n; i++) {
      const j = i + len;
      let changed = true;
      while (changed) {                                    // repeat until nothing new (needed for ε and unit rules)
        changed = false;
        for (const nt of Object.keys(grammar)) {
          if (table.has(key(nt, i, j))) continue;
          for (const rhs of grammar[nt]) {
            const children = rhs === "" ? (i === j ? [{ symbol: "ε", terminal: true }] : null) : matchRule(rhs, 0, i, j, []);
            if (children) { table.set(key(nt, i, j), { symbol: nt, rule: rhs, children }); changed = true; break; }
          }
        }
      }
    }
  }
  // FIX 8: the table re-uses one node object everywhere the same (non-terminal, span) occurs, e.g. S -> AA with A -> ε.
  //        The tree drawing then placed those nodes on top of each other. Return a fresh copy instead.
  const root = table.get(key(start, 0, n));
  return root ? cloneTree(root) : null;
}
const cloneTree = node => ({ ...node, children: node.children && node.children.map(cloneTree) });

// ---------- derivations ----------
function makeDerivation(tree, mode) {
  const text = nodes => nodes.map(n => n.symbol).filter(s => s !== "ε").join("");
  let form = [tree];
  const steps = [{ pre: "", mid: text(form), post: "", mark: false, rule: "Start symbol" }];
  // FIX 9: the old "safety++ < 100" limit silently cut long derivations short. The loop always ends
  //        because the tree is finite, so no limit is needed.
  while (form.some(n => !n.terminal)) {
    const open = form.map((n, i) => (n.terminal ? -1 : i)).filter(i => i >= 0);
    const i = mode === "left" ? open[0] : open[open.length - 1];
    const node = form[i], before = form.slice(0, i), after = form.slice(i + 1);
    form = [...before, ...node.children, ...after];
    steps.push({ pre: text(before), mid: text(node.children), post: text(after), mark: true, rule: `${node.symbol} → ${node.rule || "ε"}` });
  }
  return steps;
}

function formHTML(s) {
  if (!(s.pre + s.mid + s.post)) return "ε";
  const mid = escapeHTML(s.mid);
  return escapeHTML(s.pre) + (s.mark && mid ? `<mark>${mid}</mark>` : mid) + escapeHTML(s.post);
}

function renderDerivation(container, steps) {
  const chain = steps.map(formHTML).join('<span class="arrow">⇒</span>');
  const rows = steps.map((s, i) =>
    `<tr><td>${i}</td><td class="mono">${formHTML(s)}</td><td class="mono">${escapeHTML(s.rule)}</td></tr>`).join("");
  container.innerHTML = `<div class="chain">${chain}</div><div class="steps-wrap"><table><thead><tr><th>Step</th><th>Sentential form</th><th>Rule applied</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// ---------- parse tree ----------
function renderTree(root) {
  const nodes = [], edges = [];
  let leafCount = 0, maxDepth = 0;
  (function layout(node, depth) {
    node.depth = depth;
    maxDepth = Math.max(maxDepth, depth);
    if (!node.children || node.terminal) node.x = leafCount++;
    else {
      node.children.forEach(child => layout(child, depth + 1));
      node.x = node.children.reduce((sum, child) => sum + child.x, 0) / node.children.length;
    }
    nodes.push(node);
  })(root, 0);

  const pad = 30, gapX = 48, gapY = 62;
  const x = n => pad + n.x * gapX, y = n => pad + n.depth * gapY;
  (function collect(node) {
    for (const child of node.children || []) {
      edges.push(`<line x1="${x(node)}" y1="${y(node)}" x2="${x(child)}" y2="${y(child)}"/>`);
      collect(child);
    }
  })(root);

  const drawn = nodes.map(n =>
    `<g class="${n.terminal ? (n.symbol === "ε" ? "terminal eps" : "terminal") : "nonterminal"}"><circle cx="${x(n)}" cy="${y(n)}" r="16"/>` +
    `<text x="${x(n)}" y="${y(n)}">${escapeHTML(n.symbol)}</text></g>`).join("");
  const width = Math.max(120, pad * 2 + Math.max(0, leafCount - 1) * gapX);
  const height = pad * 2 + maxDepth * gapY;
  // FIX 10 (in style.css): the SVG used to shrink to fit the screen, so wide trees became unreadably small.
  //         It now keeps its real size and the box scrolls sideways.
  $("parseTree").innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Parse tree">${edges.join("")}${drawn}</svg>`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}