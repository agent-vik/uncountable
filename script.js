/* === Uncountable v2 — Interactive Logic === */
(function () {
    'use strict';

    // --- Config ---
    const TABLE_ROWS = 8;
    const DECIMAL_PLACES = 8;
    const INFINITE_TABLE_ROWS = 50;
    const PAIR_COUNT = 10; // Galileo pairing demo

    // --- State ---
    let userNumbers = [];
    let tableData = [];
    let diagonalDigits = [];
    let flippedDigits = [];
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

    function initTableData() {
        tableData = [];
        for (let i = 0; i < TABLE_ROWS; i++) {
            let digits = [];
            for (let j = 0; j < DECIMAL_PLACES; j++) digits.push(randDigit());
            tableData.push(digits);
        }
    }

    // --- Gallery 1: Intuition (counting interaction + fade-in) ---
    function initGallery1() {
        let count = 0;
        const display = $('countDisplay');
        const hint = $('countHint');

        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.onclick = () => {
                const add = parseInt(btn.dataset.add, 10);
                count += add;
                display.textContent = count.toLocaleString('zh-CN');
                display.classList.add('bump');
                setTimeout(() => display.classList.remove('bump'), 150);
                if (count >= 10 && hint.classList.contains('hidden')) {
                    hint.classList.remove('hidden');
                }
            };
        });

        const fadeEls = document.querySelectorAll('#gallery-1 .fade-in');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    fadeEls.forEach((el, i) => {
                        setTimeout(() => el.classList.add('visible'), i * 1200 + 800);
                    });
                    observer.disconnect();
                }
            });
        }, { threshold: 0.3 });
        observer.observe($('gallery-1'));
    }

    // --- Gallery 2: Galileo's Paradox ---
    const GRID_SIZE = 50;
    let gridSelected = new Set();
    let gridChecked = false;
    let pairAttempts = [];

    function isPerfectSquare(n) {
        if (n < 1) return false;
        const s = Math.round(Math.sqrt(n));
        return s * s === n;
    }

    function initGallery2() {
        // Render two sequences
        const naturalContainer = $('naturalNums');
        const squareContainer = $('squareNums');
        naturalContainer.innerHTML = '';
        squareContainer.innerHTML = '';

        for (let i = 1; i <= PAIR_COUNT; i++) {
            const nEl = el('span', 'pair-num', i);
            nEl.id = `nat-${i}`;
            naturalContainer.appendChild(nEl);

            const sEl = el('span', 'pair-num', i * i);
            sEl.id = `sq-${i}`;
            squareContainer.appendChild(sEl);
        }

        naturalContainer.appendChild(el('span', 'pair-num', '…'));
        squareContainer.appendChild(el('span', 'pair-num', '…'));

        // Angle 1: Number grid
        initNumberGrid();

        // Ratio slider
        const slider = $('rangeSlider');
        const rangeVal = $('rangeVal');
        const fill = $('ratioFill');
        const skip = $('ratioSkip');
        const summary = $('ratioSummary');
        function updateRatio() {
            const n = parseInt(slider.value, 10);
            const squares = Math.floor(Math.sqrt(n));
            const pct = (squares / n) * 100;
            fill.style.width = pct + '%';
            skip.style.width = (100 - pct) + '%';
            rangeVal.textContent = n.toLocaleString('zh-CN');
            summary.innerHTML = `前 ${n.toLocaleString('zh-CN')} 个自然数中，只有 <strong style="color:var(--gold-bright)">${squares.toLocaleString('zh-CN')}</strong> 个平方数，跳过了 <strong style="color:var(--text-dim)">${(n - squares).toLocaleString('zh-CN')}</strong> 个。`;
        }
        slider.addEventListener('input', updateRatio);
        updateRatio();

        // Angle navigation
        $('toAngle2').onclick = () => {
            $('angle-1').classList.add('hidden');
            $('angle-2').classList.remove('hidden');
        };
        $('checkGrid').onclick = checkGrid;

        // Angle 2: Pair test
        $('pairTest').onclick = tryPair;
        $('pairInput').addEventListener('keydown', e => { if (e.key === 'Enter') tryPair(); });
        $('toCollision').onclick = () => {
            $('angle-2').classList.add('hidden');
            $('collision').classList.remove('hidden');
        };
    }

    function initNumberGrid() {
        const grid = $('numberGrid');
        grid.innerHTML = '';
        gridSelected.clear();
        gridChecked = false;

        for (let i = 1; i <= GRID_SIZE; i++) {
            const cell = el('div', 'grid-cell', i);
            cell.dataset.num = i;
            cell.onclick = () => {
                if (gridChecked) return;
                if (cell.classList.contains('selected')) {
                    cell.classList.remove('selected');
                    gridSelected.delete(i);
                } else {
                    cell.classList.add('selected');
                    gridSelected.add(i);
                }
                updateGridStats();
            };
            grid.appendChild(cell);
        }
        updateGridStats();
    }

    function updateGridStats() {
        $('statFound').textContent = gridSelected.size;
        $('statMissed').textContent = GRID_SIZE - gridSelected.size;
        $('statWrong').textContent = '—';
        if (gridSelected.size > 0 && !$('checkGrid').classList.contains('hidden') === false) {
            $('checkGrid').classList.remove('hidden');
        }
        if (gridSelected.size > 0) {
            $('checkGrid').classList.remove('hidden');
        }
    }

    function checkGrid() {
        gridChecked = true;
        let correct = 0, wrong = 0, missed = 0;

        document.querySelectorAll('.grid-cell').forEach(cell => {
            const num = parseInt(cell.dataset.num, 10);
            const selected = cell.classList.contains('selected');
            const isSquare = isPerfectSquare(num);

            cell.classList.remove('selected');

            if (selected && isSquare) {
                cell.classList.add('correct');
                correct++;
            } else if (selected && !isSquare) {
                cell.classList.add('wrong');
                wrong++;
            } else if (!selected && isSquare) {
                cell.classList.add('missed');
                missed++;
            }
        });

        $('statFound').textContent = correct;
        $('statMissed').textContent = missed;
        $('statWrong').textContent = wrong;

        $('checkGrid').classList.add('hidden');
        $('angle1Result').classList.remove('hidden');
        $('ratioDemo').classList.remove('hidden');
        $('angle1Conclusion').classList.remove('hidden');
        $('toAngle2').classList.remove('hidden');
    }

    function tryPair() {
        const input = $('pairInput');
        const result = $('pairTestResult');
        let val = input.value.trim();
        if (!val) return;
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 1 || !Number.isInteger(n)) {
            result.innerHTML = '<p style="color:var(--error)">请输入一个正整数。</p>';
            return;
        }

        const sq = n * n;
        pairAttempts.push({ n, sq: n * n });

        result.innerHTML = `<div class="pair-card"><span class="natural">${n.toLocaleString('zh-CN')}</span><span class="arrow">→</span><span class="square">${sq.toLocaleString('zh-CN')}</span></div>`;

        const hist = $('pairHistory');
        hist.innerHTML = '';
        pairAttempts.slice(-12).forEach(a => {
            const item = el('span', 'pair-history-item', `${a.n}→${a.sq}`);
            hist.appendChild(item);
        });

        input.value = '';
        input.focus();

        // Show result after 3 attempts
        if (pairAttempts.length >= 3) {
            $('attemptCount').textContent = pairAttempts.length;
            $('angle2Result').classList.remove('hidden');
            $('angle2Conclusion').classList.remove('hidden');
            $('toCollision').classList.remove('hidden');
        }
    }

    // --- Gallery 3: The Question (input + table) ---
    function initGallery3() {
        const input = $('numberInput');
        const addBtn = $('addNumber');
        const list = $('numberList');
        const counter = $('counter');
        const proceed = $('proceed3');

        function addNumber() {
            let val = input.value.trim();
            if (!val) return;
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
        proceed.onclick = showTable;

        renderList();
    }

    function showTable() {
        // Fade out the input area, keep the table visible
        const inputZone = $('numberInput').closest('.input-zone');
        if (inputZone) {
            inputZone.style.opacity = '0.25';
            inputZone.style.pointerEvents = 'none';
        }
        $('tableContainer').classList.remove('hidden');
        $('proceed3b').classList.remove('hidden');
        buildInfiniteTable();
    }

    function buildInfiniteTable() {
        const container = $('infiniteTable');
        container.innerHTML = '';
        let rowsShown = 0;

        function addRows(count) {
            for (let i = 0; i < count && rowsShown < INFINITE_TABLE_ROWS; i++) {
                const row = el('div', 'table-row');
                row.appendChild(el('span', 'row-num', `第 ${rowsShown + 1} 行`));
                row.appendChild(el('span', 'row-val', randDecimal() + '…'));
                container.appendChild(row);
                rowsShown++;
            }
            if (rowsShown >= INFINITE_TABLE_ROWS && !container.querySelector('.ellipsis-row')) {
                const er = el('div', 'table-row ellipsis-row');
                er.appendChild(el('span', 'row-num', '第 N 行'));
                er.appendChild(el('span', 'row-val ellipsis-val', '0. …'));
                container.appendChild(er);
                const fr = el('div', 'table-row ellipsis-row');
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

        $('proceed3b').onclick = () => $('gallery-4').scrollIntoView({ behavior: 'smooth' });
    }

    // --- Gallery 4: The Diagonal ---
    function initGallery4() {
        initTableData();
        buildDiagonalTable();
        $('nextDiag').onclick = stepNextDiag;
        $('autoDiag').onclick = autoPlayDiag;
        $('proceed4b').onclick = () => showStep('step-4c', 'step-4b');
        $('flipAll').onclick = flipAllDigits;
        $('proceed4c').onclick = () => showStep('step-4d', 'step-4c');
        $('checkNext').onclick = () => checkNextRow();
        $('checkAll').onclick = () => checkAllRows();
        $('proceed4d').onclick = () => $('gallery-5').scrollIntoView({ behavior: 'smooth' });
    }

    function buildDiagonalTable() {
        const table = $('diagonalTable');
        table.innerHTML = '';

        for (let i = 0; i < TABLE_ROWS; i++) {
            const tr = document.createElement('tr');
            const label = document.createElement('td');
            label.className = 'row-label';
            label.textContent = `第 ${i + 1} 行`;
            tr.appendChild(label);
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
            const ellipsisCol = document.createElement('td');
            ellipsisCol.className = 'ellipsis-cell';
            ellipsisCol.textContent = '…';
            tr.appendChild(ellipsisCol);
            table.appendChild(tr);
        }

        // Ellipsis row: 第 N 行
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

        // Final ellipsis row
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

    function stepNextDiag() {
        if (currentDiagStep >= TABLE_ROWS) {
            $('diagHint').textContent = '对角线全部框出完毕。';
            $('step-4b').classList.remove('hidden');
            extractDiagonal();
            return;
        }
        const i = currentDiagStep;
        const cell = $(`cell-${i}-${i}`);
        if (cell) {
            cell.classList.add('diagonal-highlight');
            setTimeout(() => cell.classList.add('diagonal-extracted'), 600);
        }
        currentDiagStep++;
        if (currentDiagStep >= TABLE_ROWS) {
            $('diagHint').textContent = '对角线全部框出完毕。';
            $('step-4b').classList.remove('hidden');
            extractDiagonal();
        }
    }

    function autoPlayDiag() {
        const interval = setInterval(() => {
            if (currentDiagStep >= TABLE_ROWS) { clearInterval(interval); return; }
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
        if (showId === 'step-4c') initFlipZone();
        if (showId === 'step-4d') {
            $('newNumberPinned').textContent = $('newNumber').textContent;
            initCheckTable();
        }
    }

    function initFlipZone() {
        const zone = $('flipZone');
        zone.innerHTML = '';
        flippedDigits = [];

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
                    if (flippedDigits.length === diagonalDigits.length) {
                        $('proceed4c').classList.remove('hidden');
                    }
                }
            };
            zone.appendChild(card);
        });
    }

    function flipAllDigits() {
        const cards = document.querySelectorAll('#flipZone .flip-card');
        cards.forEach((card, i) => {
            if (!card.classList.contains('flipped')) {
                setTimeout(() => {
                    card.classList.add('flipped');
                    flippedDigits.push({ index: i, original: diagonalDigits[i], flipped: flipDigit(diagonalDigits[i]) });
                    updateNewNumber();
                    if (flippedDigits.length === diagonalDigits.length) {
                        $('proceed4c').classList.remove('hidden');
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
            row.appendChild(el('span', 'check-num', `第 ${i + 1} 行`));
            const digits = el('span', 'check-digits');
            let html = '0.';
            for (let j = 0; j < DECIMAL_PLACES; j++) {
                if (j === i) html += `<span class="highlight-digit">${tableData[i][j]}</span>`;
                else html += tableData[i][j];
            }
            digits.innerHTML = html;
            row.appendChild(digits);
            row.appendChild(el('span', 'check-result'));
            container.appendChild(row);
        }
    }

    function checkNextRow() {
        if (currentCheckRow >= TABLE_ROWS) return;
        checkRow(currentCheckRow);
        currentCheckRow++;
        if (currentCheckRow >= TABLE_ROWS) {
            $('checkConclusion').classList.remove('hidden');
            $('proceed4d').classList.remove('hidden');
        }
    }

    function checkAllRows() {
        const interval = setInterval(() => {
            if (currentCheckRow >= TABLE_ROWS) {
                clearInterval(interval);
                $('checkConclusion').classList.remove('hidden');
                $('proceed4d').classList.remove('hidden');
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
        result.textContent = `第 ${i + 1} 位不同 → ✗`;
        result.className = 'check-result nomatch';
    }

    // --- Gallery 5 & 6: Reveal on Scroll ---
    function initGallery5() {
        const lines = document.querySelectorAll('#gallery-5 .reveal');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    lines.forEach((line, idx) => {
                        setTimeout(() => line.classList.add('visible'), idx * 600);
                    });
                    observer.disconnect();
                }
            });
        }, { threshold: 0.1 });
        observer.observe($('gallery-5'));
    }

    function initGallery6() {
        const items = document.querySelectorAll('#gallery-6 .reveal');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    items.forEach((item, idx) => {
                        setTimeout(() => item.classList.add('visible'), idx * 1500);
                    });
                    observer.disconnect();
                }
            });
        }, { threshold: 0.1 });
        observer.observe($('gallery-6'));
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
                    nav.textContent = `展厅 ${num} / 6`;
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
        initGallery5();
        initGallery6();
        initNavProgress();
    });

})();
