// --- VARIABLER ---
// Vi bruker "Chess" fra biblioteket vi importerte
const game = new Chess(); 
let boardOrientation = 'white'; // Hvem ser vi brettet fra?
let selectedSquare = null; // Hvilken rute har spilleren klikket på?
let aiThinking = false;

// Brikke-symboler (Unicode)
const PIECES = {
    'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚', // Svart
    'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'  // Hvit
};

// HTML Elementer
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const modeSelect = document.getElementById('game-mode');
const showHintsCheckbox = document.getElementById('show-hints');

// --- OPPSTART ---
function initGame() {
    game.reset();
    selectedSquare = null;
    renderBoard();
    updateStatus();
}

// --- RENDERING (TEGNE BRETTET) ---
function renderBoard() {
    boardEl.innerHTML = ''; // Tøm brettet
    const isWhiteOriented = boardOrientation === 'white';

    // Sjakkbrett er 8x8. Vi må løkke gjennom rader og kolonner.
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            // Hvis brettet er snudd (svart nederst), må vi snu indeksene
            const row = isWhiteOriented ? r : 7 - r;
            const col = isWhiteOriented ? c : 7 - c;
            
            // Konverter rad/kolonne til sjakk-notasjon (f.eks. 0,0 -> "a8")
            // chess.js bruker a-h og 1-8.
            const file = 'abcdefgh'[col];
            const rank = 8 - row;
            const squareId = file + rank;

            // Lag HTML-elementet for ruten
            const squareDiv = document.createElement('div');
            squareDiv.classList.add('square');
            // Annenhver farge
            squareDiv.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
            squareDiv.dataset.square = squareId;
            squareDiv.addEventListener('click', () => onSquareClick(squareId));

            // Sjekk om det står en brikke her
            const piece = game.get(squareId);
            if (piece) {
                const pieceSpan = document.createElement('span');
                pieceSpan.classList.add('piece');
                pieceSpan.classList.add(piece.color === 'w' ? 'white' : 'black');
                // Hent riktig symbol. Store bokstaver for hvit i objektet vårt
                const symbolKey = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
                pieceSpan.innerText = PIECES[symbolKey];
                squareDiv.appendChild(pieceSpan);
            }

            // HVIS ruten er valgt, legg til klasse
            if (selectedSquare === squareId) {
                squareDiv.classList.add('selected');
            }

            // HVIS hint er på, vis prikker for gyldige trekk
            if (showHintsCheckbox.checked && selectedSquare) {
                const moves = game.moves({ square: selectedSquare, verbose: true });
                const move = moves.find(m => m.to === squareId);
                if (move) {
                    squareDiv.classList.add(move.captured ? 'hint-capture' : 'hint-dot');
                }
            }

            boardEl.appendChild(squareDiv);
        }
    }
}

// --- SPILL-LOGIKK ---

function onSquareClick(squareId) {
    if (aiThinking) return; // Ikke forstyrr datamaskinen
    
    const pieceObj = game.get(squareId);
    const isPlayerTurn = (game.turn() === 'w') || (modeSelect.value === 'pvp');

    // 1. Hvis vi klikker på en av våre egne brikker -> Velg den
    if (pieceObj && pieceObj.color === game.turn() && isPlayerTurn) {
        selectedSquare = squareId;
        renderBoard();
        return;
    }

    // 2. Hvis vi har valgt en brikke, og klikker et annet sted -> Prøv å flytt
    if (selectedSquare) {
        const move = {
            from: selectedSquare,
            to: squareId,
            promotion: 'q' // Automatisk forvandling til dronning (forenkling)
        };

        // Prøv trekket i chess.js (returnerer null hvis ugyldig)
        try {
            const result = game.move(move);
            if (result) {
                // Trekket var gyldig!
                selectedSquare = null;
                renderBoard();
                updateStatus();
                
                // Sjekk om PC skal gjøre trekk
                if (!game.game_over() && modeSelect.value === 'pvc') {
                    aiThinking = true;
                    setTimeout(makeComputerMove, 500); // Liten forsinkelse så det ser ut som den tenker
                }
            } else {
                // Ugyldig trekk (f.eks klikket på tomt felt som ikke kan nås)
                selectedSquare = null;
                renderBoard();
            }
        } catch (e) {
            selectedSquare = null;
            renderBoard();
        }
    }
}

// --- AI / DATAMASKIN ---
function makeComputerMove() {
    if (game.game_over()) return;

    const moves = game.moves({ verbose: true });
    
    // Enkel AI: Prøv å slå brikker hvis mulig. Hvis ikke, tilfeldig.
    let bestMove = null;
    let bestValue = -9999;

    // Verdier for brikker: p=1, n/b=3, r=5, q=9
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

    for (let move of moves) {
        let value = 0;
        
        // Er dette et slag?
        if (move.captured) {
            value = values[move.captured] * 10; // Prioriter slag høyt
            // Er det trygt? (Veldig forenklet: sjekk om brikken vi slår med er mindre verdt)
            if (values[move.piece] < values[move.captured]) value += 5; 
        }
        
        // Legg til litt tilfeldighet så den ikke spiller likt hver gang
        value += Math.random() * 2;

        if (value > bestValue) {
            bestValue = value;
            bestMove = move;
        }
    }

    game.move(bestMove);
    aiThinking = false;
    renderBoard();
    updateStatus();
}

// --- HJELPEFUNKSJONER ---
function updateStatus() {
    let status = '';
    const turnColor = game.turn() === 'w' ? "Hvit" : "Svart";

    if (game.in_checkmate()) {
        status = `Spillet er slutt! ${turnColor} er sjakk matt.`;
    } else if (game.in_draw()) {
        status = 'Uavgjort (Patt eller trekkgjentakelse).';
    } else {
        status = `${turnColor} sin tur`;
        if (game.in_check()) {
            status += " (SJAKK!)";
        }
    }
    statusEl.innerText = status;
}

// --- KNAPPER ---
document.getElementById('reset-btn').addEventListener('click', initGame);
document.getElementById('flip-btn').addEventListener('click', () => {
    boardOrientation = boardOrientation === 'white' ? 'black' : 'white';
    selectedSquare = null;
    renderBoard();
});
document.getElementById('show-hints').addEventListener('change', renderBoard);

// Start
initGame();
