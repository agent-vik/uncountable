/* === Uncountable — Interactive Logic === */
(function () {
    'use strict';

    // --- Config ---
    const TABLE_ROWS = 8;         // visible rows in diagonal table (must equal DECIMAL_PLACES for square diagonal)
    const DECIMAL_PLACES = 8;     // decimal places shown
    const INFINITE_TABLE_ROWS = 50; // rows in gallery 2 scrollable table

    // --- State ---
    let userNumbers = [];
    let tableData = [];           // the "assumed complete" list
    let diagonalDigits = [];      // extracted diagonal digits
    let flippedDigits = [];       // after flipping
    let currentDiagStep = 0;
    let currentCheckRow = 0;

    // --- Helpers ---
    function randDigit() { return Math.floor(Math.random() * 10); }
    function randDecimal() {
        let s = '0.';
        for (let i = 0; i < DECIMAL_PLACES; i++) s += randDigit();
        return s;
    }
    function flipDigit(d) { return (d + 1) % 10; }
    function $(id) { return document.getElementById(id); }
    function el(tag, cls, html) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    }

    // --- Init table data (deterministic for diagonal clarity) ---
    function initTableData() {
        tableData = [];
        for (let i = 0; i < TABLE_ROWS; i++) {
            let digits = [];
            for (let j = 0; j < DECIMAL_PLACES; j++) digits.push(randDigit());
            tableData.push(digits);
        }
    }

    // --- Gallery 1: Number Input ---
    function initGallery1() {
        const input = $('numberInput');
        const addBtn = $('addNumber');
        const list = $('numberList');
        const counter = $('counter');
        const proceed = $('proceed1');

        function addNumber() {
            let val = input.value.trim();
            if (!val) return;
            // Normalize: ensure starts with 0.
            if (!val.startsWith('0.') && !val.startsWith('.')) {
                if (val.startsWith('0')) val = val.replace(/^0/, '0.');
                else val = '0.' + val;
            }
            if (val.startsWith('.')) val = '0' + val;

            userNumbers.push(val);
            input.value = '';
            renderList();
        }

        function renderList() {
            if (userNumbers.length === 0) {
                list.innerHTML = '<p class="empty-hint">你的列表是空的。开始写吧。</p>';
                counter.textContent = '你已收集了 0 个数字';
                proceed.classList.add('hidden');
            } else {
                list.innerHTML = '';
                userNumbers.forEach((num, i) => {
                    const chip = el('span', 'number-chip');
                    chip.textContent = num;
                    const rm = el('span', 'remove', '×');
                    rm.onclick = () => { userNumbers.splice(i, 1); renderList(); };
                    chip.appendChild(rm);
                    list.appendChild(chip);
                });
                counter.textContent = `你已收集了 ${userNumbers.length} 个数字`;
                if (userNumbers.length >= 1) proceed.classList.remove('hidden');
            }
        }

        addBtn.onclick = addNumber;
        input.addEventListener('keydown', e => { if (e.key === 'Enter') addNumber(); });
        proceed.onclick = () => $('gallery-2').scrollIntoView({ behavior: 'smooth' });

        renderList();
    }

    // --- Gallery 2: Infinite Table ---
    function initGallery2() {
        const container = $('infiniteTable');
        let rowsShown = 0;

        function addRows(count) {
            for (let i = 0; i < count && rowsShown < INFINITE_TABLE_ROWS; i++) {
                const row = el('div', 'table-row');
                const num = el('span', 'row-num', `第 ${rowsShown + 1} 行`);
                const val = el('span', 'row-val', randDecimal() + '…');
                row.appendChild(num);
                row.appendChild(val);
                container.appendChild(row);
                rowsShown++;
            }
            // Add ellipsis row at the bottom to indicate infinity
            if (rowsShown >= INFINITE_TABLE_ROWS && !container.querySelector('.ellipsis-row')) {
                // Row N (ellipsis content)
                const er = el('div', 'table-row ellipsis-row');
                er.appendChild(el('span', 'row-num', '第 N 行'));
                er.appendChild(el('span', 'row-val ellipsis-val', '0. …'));
                container.appendChild(er);
                // Final ellipsis row (infinite continuation)
                const fr = el('div', 'table-row ellipsis-row final-ellipsis');
                fr.appendChild(el('span', 'row-num', '…'));
                fr.appendChild(el('span', 'row-val ellipsis-val', '…'));
                container.appendChild(fr);
            }
        }

        addRows(20);
        container.addEventListener('scroll', () => {
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
                addRows(10);
            }
        });

        $('proceed2').onclick = () => $('gallery-3').scrollIntoView({ behavior: 'smooth' });
    }

    // --- Gallery 3: Diagonal ---
    function initGallery3() {
        initTableData();
        buildDiagonalTable();
        $('nextDiag').onclick = stepNextDiag;
        $('autoDiag').onclick = autoPlayDiag;
        $('proceed3b').onclick = () => showStep('step-3c', 'step-3b');
        $('flipAll').onclick = flipAllDigits;
        $('proceed3c').onclick = () => showStep('step-3d', 'step-3c');
        $('checkNext').onclick = () => checkNextRow();
        $('checkAll').onclick = () => checkAllRows();
        $('proceed3d').onclick = () => $('gallery-4').scrollIntoView({ behavior: 'smooth' });
    }

    function buildDiagonalTable() {
        const table = $('diagonalTable');
        table.innerHTML = '';

        for (let i = 0; i < TABLE_ROWS; i++) {
            const tr = document.createElement('tr');

            // Row label
            const label = document.createElement('td');
            label.className = 'row-label';
            label.textContent = `第 ${i + 1} 行`;
            tr.appendChild(label);

            // "0." prefix
            const prefix = document.createElement('td');
            prefix.className = 'decimal-prefix';
            prefix.textContent = '0.';
            tr.appendChild(prefix);

            for (let j = 0; j < DECIMAL_PLACES; j++) {
                const td = document.createElement('td');
                td.textContent = tableData[i][j];
                td.dataset.row = i;
                td.dataset.col = j;
                td.id = `cell-${i}-${j}`;
                tr.appendChild(td);
            }

            // Trailing ellipsis column (infinite decimal places)
            const ellipsisCol = document.createElement('td');
            ellipsisCol.className = 'ellipsis-cell';
            ellipsisCol.textContent = '…';
            tr.appendChild(ellipsisCol);

            table.appendChild(tr);
        }

        // Ellipsis row: 第 N 行 (ellipsis content)
        const ellipsisRow = document.createElement('tr');
        const elLabel = document.createElement('td');
        elLabel.className = 'row-label';
        elLabel.textContent = '第 N 行';
        ellipsisRow.appendChild(elLabel);
        const elPrefix = document.createElement('td');
        elPrefix.className = 'decimal-prefix';
        ellipsisRow.appendChild(elPrefix);
        for (let j = 0; j < DECIMAL_PLACES; j++) {
            const td = document.createElement('td');
            td.className = 'ellipsis-cell';
            td.textContent = '…';
            ellipsisRow.appendChild(td);
        }
        const elTail = document.createElement('td');
        elTail.className = 'ellipsis-cell';
        elTail.textContent = '…';
        ellipsisRow.appendChild(elTail);
        table.appendChild(ellipsisRow);

        // Final ellipsis row (infinite continuation, pure dots)
        const finalRow = document.createElement('tr');
        const fLabel = document.createElement('td');
        fLabel.className = 'row-label';
        fLabel.textContent = '…';
        finalRow.appendChild(fLabel);
        const fPrefix = document.createElement('td');
        fPrefix.className = 'decimal-prefix';
        finalRow.appendChild(fPrefix);
        for (let j = 0; j < DECIMAL_PLACES; j++) {
            const td = document.createElement('td');
            td.className = 'ellipsis-cell';
            td.textContent = '…';
            finalRow.appendChild(td);
        }
        const fTail = document.createElement('td');
        fTail.className = 'ellipsis-cell';
        fTail.textContent = '…';
        finalRow.appendChild(fTail);
        table.appendChild(finalRow);
        }
    }

    function stepNextDiag() {
        if (currentDiagStep >= TABLE_ROWS) {
            $('diagHint').textContent = '所有对角线数字已框出。继续下一步。';
            $('step-3b').classList.remove('hidden');
            extractDiagonal();
            return;
        }
        const i = currentDiagStep;
        const cell = $(`cell-${i}-${i}`);
        if (cell) {
            cell.classList.add('diagonal-highlight');
            // Also mark as extracted after a delay
            setTimeout(() => cell.classList.add('diagonal-extracted'), 600);
        }
        currentDiagStep++;
        if (currentDiagStep >= TABLE_ROWS) {
            $('diagHint').textContent = '对角线全部框出完毕。继续下一步。';
            $('step-3b').classList.remove('hidden');
            extractDiagonal();
        }
    }

    function autoPlayDiag() {
        const interval = setInterval(() => {
            if (currentDiagStep >= TABLE_ROWS) {
                clearInterval(interval);
                return;
            }
            stepNextDiag();
        }, 800);
    }

    function extractDiagonal() {
        const container = $('diagonalExtract');
        container.innerHTML = '';
        diagonalDigits = [];
        for (let i = 0; i < TABLE_ROWS; i++) {
            diagonalDigits.push(tableData[i][i]);
            const card = el('div', 'extract-card', tableData[i][i]);
            card.style.animationDelay = (i * 0.1) + 's';
            container.appendChild(card);
        }
    }

    function showStep(showId, hideId) {
        $(hideId).classList.add('hidden');
        $(showId).classList.remove('hidden');
        if (showId === 'step-3c') initFlipZone();
        if (showId === 'step-3d') {
            // Copy the new number to the pinned display
            $('newNumberPinned').textContent = $('newNumber').textContent;
            initCheckTable();
        }
    }

    function initFlipZone() {
        const zone = $('flipZone');
        zone.innerHTML = '';
        flippedDigits = [];
        let allFlipped = true;

        diagonalDigits.forEach((d, i) => {
            const card = el('div', 'flip-card');
            const inner = el('div', 'flip-card-inner');
            const front = el('div', 'flip-card-front', d);
            const back = el('div', 'flip-card-back', flipDigit(d));
            inner.appendChild(front);
            inner.appendChild(back);
            card.appendChild(inner);
            card.onclick = () => {
                if (!card.classList.contains('flipped')) {
                    card.classList.add('flipped');
                    flippedDigits.push({ index: i, original: d, flipped: flipDigit(d) });
                    updateNewNumber();
                    checkAllFlipped();
                }
            };
            zone.appendChild(card);
        });

        function checkAllFlipped() {
            if (flippedDigits.length === diagonalDigits.length) {
                $('proceed3c').classList.remove('hidden');
            }
        }
    }

    function flipAllDigits() {
        const cards = document.querySelectorAll('.flip-card');
        cards.forEach((card, i) => {
            if (!card.classList.contains('flipped')) {
                setTimeout(() => {
                    card.classList.add('flipped');
                    flippedDigits.push({ index: i, original: diagonalDigits[i], flipped: flipDigit(diagonalDigits[i]) });
                    updateNewNumber();
                    if (flippedDigits.length === diagonalDigits.length) {
                        $('proceed3c').classList.remove('hidden');
                    }
                }, i * 150);
            }
        });
    }

    function updateNewNumber() {
        const sorted = flippedDigits.slice().sort((a, b) => a.index - b.index);
        let str = '0.';
        sorted.forEach(d => str += d.flipped);
        $('newNumber').textContent = str;
    }

    function initCheckTable() {
        const container = $('checkTable');
        container.innerHTML = '';
        currentCheckRow = 0;

        const sorted = flippedDigits.slice().sort((a, b) => a.index - b.index);
        const newDigits = sorted.map(d => d.flipped);

        for (let i = 0; i < TABLE_ROWS; i++) {
            const row = el('div', 'check-row');
            row.id = `check-row-${i}`;

            const num = el('span', 'check-num', `第 ${i + 1} 行`);
            row.appendChild(num);

            const digits = el('span', 'check-digits');
            let html = '0.';
            for (let j = 0; j < DECIMAL_PLACES; j++) {
                if (j === i) {
                    html += `<span class="highlight-digit">${tableData[i][j]}</span>`;
                } else {
                    html += tableData[i][j];
                }
            }
            digits.innerHTML = html;
            row.appendChild(digits);

            const result = el('span', 'check-result');
            row.appendChild(result);

            container.appendChild(row);
        }

        // Store new digits for comparison
        container.dataset.newDigits = JSON.stringify(newDigits);
    }

    function checkNextRow() {
        if (currentCheckRow >= TABLE_ROWS) return;
        checkRow(currentCheckRow);
        currentCheckRow++;
        if (currentCheckRow >= TABLE_ROWS) {
            $('checkConclusion').classList.remove('hidden');
            $('proceed3d').classList.remove('hidden');
        }
    }

    function checkAllRows() {
        const interval = setInterval(() => {
            if (currentCheckRow >= TABLE_ROWS) {
                clearInterval(interval);
                $('checkConclusion').classList.remove('hidden');
                $('proceed3d').classList.remove('hidden');
                return;
            }
            checkRow(currentCheckRow);
            currentCheckRow++;
        }, 400);
    }

    function checkRow(i) {
        const row = $(`check-row-${i}`);
        if (!row || row.classList.contains('checked')) return;
        row.classList.add('checked');
        const result = row.querySelector('.check-result');
        // The new number's i-th digit differs from table's i-th diagonal digit
        result.textContent = `第 ${i + 1} 位不同 → ✗`;
        result.className = 'check-result nomatch';
    }

    // --- Gallery 4: Reveal on Scroll ---
    function initGallery4() {
        const lines = document.querySelectorAll('.conclusion-line.reveal');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Reveal lines sequentially
                    lines.forEach((line, idx) => {
                        setTimeout(() => line.classList.add('visible'), idx * 600);
                    });
                    observer.disconnect();
                }
            });
        }, { threshold: 0.1 });

        const gallery = $('gallery-4');
        if (gallery) observer.observe(gallery);
    }

    // --- Nav Progress ---
    function initNavProgress() {
        const galleries = document.querySelectorAll('.gallery');
        const nav = $('navProgress');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    const num = id.split('-')[1];
                    nav.textContent = `展厅 ${num} / 4`;
                }
            });
        }, { threshold: 0.3 });

        galleries.forEach(g => observer.observe(g));
    }

    // --- Init All ---
    document.addEventListener('DOMContentLoaded', () => {
        initGallery1();
        initGallery2();
        initGallery3();
        initGallery4();
        initNavProgress();
    });

})();
