// ==========================================
// CFG DERIVATION GENERATOR
// ==========================================


// Check whether a symbol is a non-terminal
function isDerivationNonTerminal(symbol) {

    return (
        symbol.length === 1 &&
        symbol >= "A" &&
        symbol <= "Z"
    );

}


// ==========================================
// Parse Grammar
// ==========================================

function parseDerivationGrammar(grammarText) {

    const productions = {};

    const lines = grammarText.split(/\r?\n/);

    for (let line of lines) {

        line = line.trim();

        if (line === "") {
            continue;
        }

        if (!line.includes("->")) {
            continue;
        }

        const parts = line.split("->");

        const leftSide = parts[0].trim();
        const rightSide = parts.slice(1).join("->").trim();

        if (leftSide === "") {
            continue;
        }

        const nonTerminal = leftSide[0];

        if (!productions[nonTerminal]) {
            productions[nonTerminal] = [];
        }

        const alternatives = rightSide.split("|");

        for (let alternative of alternatives) {

            alternative = alternative.trim();

            // Epsilon
            if (
                alternative === "^" ||
                alternative === "ε" ||
                alternative === "epsilon" ||
                alternative === "eps"
            ) {
                alternative = "";
            }

            productions[nonTerminal].push(alternative);
        }
    }

    return productions;
}


// ==========================================
// Check if current form can still
// possibly generate the input
// ==========================================

function derivationPossible(current, input) {

    // If there are more symbols than the input,
    // this state cannot produce the input.
    if (current.length > input.length) {
        return false;
    }


    // Find first non-terminal
    let first = -1;

    for (let i = 0; i < current.length; i++) {

        if (isDerivationNonTerminal(current[i])) {

            first = i;
            break;

        }
    }


    // Find last non-terminal
    let last = -1;

    for (let i = current.length - 1; i >= 0; i--) {

        if (isDerivationNonTerminal(current[i])) {

            last = i;
            break;

        }
    }


    // No non-terminal
    if (first === -1) {
        return current === input;
    }


    // --------------------------------------
    // Check terminal prefix
    // --------------------------------------

    const prefix =
        current.substring(0, first);


    if (!input.startsWith(prefix)) {
        return false;
    }


    // --------------------------------------
    // Check terminal suffix
    // --------------------------------------

    const suffix =
        current.substring(last + 1);


    if (!input.endsWith(suffix)) {
        return false;
    }


    return true;
}


// ==========================================
// Generate Leftmost Derivation
// ==========================================

function generateLeftmostDerivation(
    grammarText,
    startSymbol,
    inputString
) {

    const grammar =
        parseDerivationGrammar(grammarText);


    return searchDerivation(
        grammar,
        startSymbol,
        inputString,
        "left"
    );
}


// ==========================================
// Generate Rightmost Derivation
// ==========================================

function generateRightmostDerivation(
    grammarText,
    startSymbol,
    inputString
) {

    const grammar =
        parseDerivationGrammar(grammarText);


    return searchDerivation(
        grammar,
        startSymbol,
        inputString,
        "right"
    );
}


// ==========================================
// Search for Derivation
// ==========================================

function searchDerivation(
    grammar,
    startSymbol,
    inputString,
    mode
) {

    const queue = [];


    queue.push({

        current: startSymbol,

        steps: [
            startSymbol
        ]

    });


    const visited = new Set();

    visited.add(startSymbol);


    const MAX_STATES = 50000;

    let statesChecked = 0;


    while (
        queue.length > 0 &&
        statesChecked < MAX_STATES
    ) {

        const state = queue.shift();

        const current = state.current;

        statesChecked++;


        // ----------------------------------
        // Check whether current is complete
        // ----------------------------------

        let nonTerminalPositions = [];


        for (let i = 0; i < current.length; i++) {

            if (
                isDerivationNonTerminal(
                    current[i]
                )
            ) {

                nonTerminalPositions.push(i);

            }
        }


        // ----------------------------------
        // No non-terminals
        // ----------------------------------

        if (nonTerminalPositions.length === 0) {

            if (current === inputString) {

                return {

                    found: true,

                    steps: state.steps

                };

            }

            continue;
        }


        // ----------------------------------
        // Check whether state is possible
        // ----------------------------------

        if (
            !derivationPossible(
                current,
                inputString
            )
        ) {

            continue;

        }


        // ----------------------------------
        // Select non-terminal
        // ----------------------------------

        let position;


        if (mode === "left") {

            // Leftmost
            position =
                nonTerminalPositions[0];

        }
        else {

            // Rightmost
            position =
                nonTerminalPositions[
                    nonTerminalPositions.length - 1
                ];

        }


        const nonTerminal =
            current[position];


        // ----------------------------------
        // Get productions
        // ----------------------------------

        const rules =
            grammar[nonTerminal];


        if (!rules) {
            continue;
        }


        // ----------------------------------
        // Try every production
        // ----------------------------------

        for (let rule of rules) {


            const nextString =

                current.substring(
                    0,
                    position
                )

                +

                rule

                +

                current.substring(
                    position + 1
                );


            // Avoid impossible states
            if (
                nextString.length >
                inputString.length
            ) {

                continue;

            }


            // Avoid duplicate states
            if (visited.has(nextString)) {

                continue;

            }


            visited.add(nextString);


            queue.push({

                current: nextString,

                steps: [
                    ...state.steps,
                    nextString
                ]

            });

        }

    }


    // --------------------------------------
    // No derivation found
    // --------------------------------------

    return {

        found: false,

        steps: []

    };
}