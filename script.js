const validateButton =
    document.getElementById("validateBtn");

const clearButton =
    document.getElementById("clearBtn");

const grammarInput =
    document.getElementById("grammar");

const startSymbolInput =
    document.getElementById("startSymbol");

const inputStringInput =
    document.getElementById("inputString");

const resultBox =
    document.getElementById("result");

const leftmostDerivationBox =
    document.getElementById("leftmostDerivation");

const rightmostDerivationBox =
    document.getElementById("rightmostDerivation");

validateButton.addEventListener("click", function () {

    const grammar =
        grammarInput.value.trim();

    const startSymbol =
        startSymbolInput.value.trim();

    const inputString =
        inputStringInput.value.trim();


    // -------------------------------
    // Check input
    // -------------------------------

    if (grammar === "") {

        resultBox.innerHTML =
            "Please enter the grammar.";

        return;

    }


    if (startSymbol === "") {

        resultBox.innerHTML =
            "Please enter the start symbol.";

        return;

    }


    if (inputString === "") {

        resultBox.innerHTML =
            "Please enter an input string.";

        return;

    }


    // -------------------------------
    // Validate CFG
    // -------------------------------

    const result =
        validateCFG(
            grammar,
            startSymbol,
            inputString
        );


    // -------------------------------
    // Valid
    // -------------------------------

    if (result.valid) {


        resultBox.innerHTML =
            "✓ String is VALID.";


        // Generate Leftmost
        const leftmost =
            generateLeftmostDerivation(
                grammar,
                startSymbol,
                inputString
            );


        // Generate Rightmost
        const rightmost =
            generateRightmostDerivation(
                grammar,
                startSymbol,
                inputString
            );


        showDerivation(
            leftmostDerivationBox,
            leftmost.steps
        );


        showDerivation(
            rightmostDerivationBox,
            rightmost.steps
        );


    }


    // -------------------------------
    // Invalid
    // -------------------------------

    else {


        resultBox.innerHTML =
            "✗ String is INVALID.";


        leftmostDerivationBox.innerHTML =
            "No derivation found.";


        rightmostDerivationBox.innerHTML =
            "No derivation found.";

    }

});

function showDerivation(box, steps) {

    if (
        !steps ||
        steps.length === 0
    ) {

        box.innerHTML =
            "No derivation found.";

        return;

    }


    let html = "";


    for (
        let i = 0;
        i < steps.length;
        i++
    ) {


        html += steps[i];


        if (
            i <
            steps.length - 1
        ) {

            html +=
                " &nbsp; ⇒ &nbsp; ";

        }

    }


    box.innerHTML = html;

}