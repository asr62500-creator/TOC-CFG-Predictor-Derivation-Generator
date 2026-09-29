// ==========================================
// CONTEXT-FREE GRAMMAR VALIDATOR
// ==========================================


// Check whether a symbol is a non-terminal
function isNonTerminal(symbol) {

    return (
        symbol.length === 1 &&
        symbol >= "A" &&
        symbol <= "Z"
    );

}


// ==========================================
// Parse Grammar
// ==========================================

function parseGrammar(grammarText) {

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

        const left = parts[0].trim();
        const right = parts.slice(1).join("->").trim();


        if (left === "") {
            continue;
        }


        const nonTerminal = left[0];


        if (!productions[nonTerminal]) {
            productions[nonTerminal] = [];
        }


        // Handle A -> B | C
        const alternatives = right.split("|");


        for (let alternative of alternatives) {

            alternative = alternative.trim();


            // Convert epsilon representations to ""
            if (
                alternative === "^" ||
                alternative === "ε" ||
                alternative === "epsilon" ||
                alternative === "eps" ||
                alternative === ""
            ) {

                alternative = "";

            }


            productions[nonTerminal].push(alternative);

        }

    }


    return productions;
}


// ==========================================
// Validate CFG
// ==========================================

function validateCFG(
    grammarText,
    startSymbol,
    inputString
) {

    const grammar = parseGrammar(grammarText);


    // Check start symbol
    if (!grammar[startSymbol]) {

        return {

            valid: false,

            message:
                "Start symbol '" +
                startSymbol +
                "' does not exist.",

            derivation: []

        };

    }


    // ------------------------------------------------
    // Recursive parser
    //
    // parseSymbol(N, position)
    //
    // means:
    // Can non-terminal N generate input starting
    // from this position?
    // ------------------------------------------------


    const memo = new Map();


    function parseNonTerminal(
        nonTerminal,
        position
    ) {


        const key =
            nonTerminal + "|" + position;


        // Already calculated
        if (memo.has(key)) {

            return memo.get(key);

        }


        const results = [];


        // Get productions
        const rules = grammar[nonTerminal] || [];


        for (let rule of rules) {


            // ----------------------------------------
            // Epsilon production
            // ----------------------------------------

            if (rule === "") {

                results.push({

                    position: position,

                    rule: rule,

                    children: []

                });

                continue;

            }


            // ----------------------------------------
            // Try to match complete RHS
            // ----------------------------------------

            const matches =
                matchRule(rule, position);


            for (let match of matches) {

                results.push({

                    position: match.position,

                    rule: rule,

                    children: match.children

                });

            }

        }


        memo.set(key, results);

        return results;
    }


    // ==========================================
    // Match RHS of a production
    // ==========================================

    function matchRule(
        rule,
        startPosition
    ) {


        // Each state represents how much of
        // the RHS has been matched.
        let states = [

            {

                position: startPosition,

                children: []

            }

        ];


        // Process every symbol in RHS
        for (let i = 0; i < rule.length; i++) {


            const symbol = rule[i];


            const newStates = [];


            for (let state of states) {


                // --------------------------------
                // Terminal symbol
                // --------------------------------

                if (!isNonTerminal(symbol)) {


                    if (
                        state.position < inputString.length &&
                        inputString[state.position] === symbol
                    ) {


                        newStates.push({

                            position:
                                state.position + 1,

                            children: [
                                ...state.children,

                                {

                                    type: "terminal",

                                    symbol: symbol

                                }

                            ]

                        });

                    }


                }


                // --------------------------------
                // Non-terminal symbol
                // --------------------------------

                else {


                    const matches =
                        parseNonTerminal(
                            symbol,
                            state.position
                        );


                    for (let match of matches) {


                        newStates.push({

                            position:
                                match.position,

                            children: [

                                ...state.children,

                                {

                                    type: "nonTerminal",

                                    symbol: symbol,

                                    rule: match.rule,

                                    children:
                                        match.children

                                }

                            ]

                        });

                    }

                }

            }


            states = newStates;


            // No possible match
            if (states.length === 0) {

                break;

            }

        }


        return states;
    }


    // ==========================================
    // Start parsing from start symbol
    // ==========================================

    const possibleParses =
        parseNonTerminal(
            startSymbol,
            0
        );


    // ==========================================
    // Find parse that consumes entire input
    // ==========================================

    let successfulParse = null;


    for (let parse of possibleParses) {

        if (
            parse.position === inputString.length
        ) {

            successfulParse = parse;

            break;

        }

    }


    // ==========================================
    // INVALID
    // ==========================================

    if (!successfulParse) {

        return {

            valid: false,

            message:
                "String cannot be derived from the grammar.",

            derivation: []

        };

    }


    // ==========================================
    // VALID
    // ==========================================

    const derivation = [];


    derivation.push(startSymbol);


    // Build leftmost derivation
    buildLeftmostDerivation(
        startSymbol,
        successfulParse,
        derivation
    );


    return {

        valid: true,

        message: "String is valid.",

        derivation: derivation

    };


    // ==========================================
    // Build Leftmost Derivation
    // ==========================================

    function buildLeftmostDerivation(
        symbol,
        node,
        steps
    ) {


        if (isNonTerminal(symbol)) {


            const rule =
                node.rule;


            // ----------------------------------
            // Epsilon
            // ----------------------------------

            if (rule === "") {


                const current =
                    steps[steps.length - 1];


                const newString =
                    current.replace(
                        symbol,
                        ""
                    );


                steps.push(newString);

                return;

            }


            // ----------------------------------
            // Replace first occurrence
            // ----------------------------------

            let current =
                steps[steps.length - 1];


            const replacement =
                rule;


            const index =
                current.indexOf(symbol);


            if (index !== -1) {


                const newString =
                    current.substring(0, index) +
                    replacement +
                    current.substring(
                        index + symbol.length
                    );


                steps.push(newString);

            }


            // ----------------------------------
            // Process children
            // ----------------------------------

            for (
                let i = 0;
                i < node.children.length;
                i++
            ) {


                const child =
                    node.children[i];


                if (
                    child.type === "nonTerminal"
                ) {


                    buildLeftmostDerivation(
                        child.symbol,
                        child,
                        steps
                    );

                }

            }

        }

    }

}