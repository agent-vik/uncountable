/* Uncountable — Interactive Logic */
(function () {
    'use strict';

    // Config
    let currentLang = 'zh';

    // i18n
    function t(key, params) {
        const dict = I18N[currentLang] || I18N['zh'];
        let str = dict[key] || key;
        if (params) {
            Object.keys(params).forEach(k => {
                str = str.replace('{' + k + '}', params[k]);
            });
        }
        return str;
    }

    function applyLang(lang) {
        currentLang = lang;
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.innerHTML = t(key);
        });
        document.querySelectorAll('[data-i18n-ph]').forEach(el => {
            const key = el.getAttribute('data-i18n-ph');
            el.placeholder = t(key);
        });
        // Update lang toggle button
        const toggle = $('langToggle');
        if (toggle) {
            toggle.textContent = lang === 'zh' ? 'EN' : '中文';
            toggle.dataset.lang = lang;
        }
        // Update nav progress
        updateNavProgress();
        // Re-render dynamic text
        updateDynamicText();
        // Update URL
        const url = new URL(window.location);
        if (lang === 'zh') url.searchParams.delete('lang');
        else url.searchParams.set('lang', lang);
        window.history.replaceState({}, '', url);
    }

    function updateNavProgress() {
        // Nav text is updated by IntersectionObserver in initNavProgress
    }

    let ratioUpdater = null;

    function updateDynamicText() {
        // Only update if elements have been initialized
        // Re-render ratio summary if visible
        if (ratioUpdater && $('ratioDemo') && !$('ratioDemo').classList.contains('hidden')) {
            ratioUpdater();
        }
        // Re-render counter
        const counterEl = $('counter');
        if (counterEl && userNumbers.length >= 0) {
            counterEl.textContent = t('g3.counter', { n: userNumbers.length });
        }
        // Re-render table row labels if table is visible
        const tableEl = $('infiniteTable');
        if (tableEl && tableEl.children.length > 0) {
            let idx = 0;
            tableEl.querySelectorAll('.table-row').forEach(row => {
                const numEl = row.querySelector('.row-num');
                if (numEl && !row.classList.contains('ellipsis-row')) {
                    numEl.textContent = t('g3.row', { n: idx + 1 });
                } else if (numEl && row.classList.contains('ellipsis-row') && idx === 0) {
                    numEl.textContent = t('g3.rowN');
                }
                idx++;
            });
        }
        // Re-render diagonal table labels if initialized
        const diagTable = $('diagonalTable');
        if (diagTable && diagTable.children.length > 0 && tableData.length > 0) {
            buildDiagonalTable();
            for (let i = 0; i < currentDiagStep; i++) {
                const cell = $(`cell-${i}-${i}`);
                if (cell) {
                    cell.classList.add('diagonal-highlight', 'diagonal-extracted');
                }
            }
        }
        // Re-render check table if visible
        const checkTable = $('checkTable');
        if (checkTable && checkTable.children.length > 0 && typeof initCheckTable === 'function') {
            initCheckTable();
            for (let i = 0; i < currentCheckRow; i++) {
                const row = $(`check-row-${i}`);
                if (row && !row.classList.contains('checked')) {
                    row.classList.add('checked');
                    const result = row.querySelector('.check-result');
                    if (result) {
                        result.textContent = t('g4.checkResult', { n: i + 1 });
                        result.className = 'check-result nomatch';
                    }
                }
            }
        }
    }

    const TABLE_ROWS = 8;
    const DECIMAL_PLACES = 8;
    const INFINITE_TABLE_ROWS = 50;
    const SEQUENCE_DISPLAY_COUNT = 10;

    // State
    let userNumbers = [];
    let tableData = [];
    let diagonalDigits = [];
    let incrementedDigits = [];
    let currentDiagStep = 0;
    let currentCheckRow = 0;

    // Helpers
    function randDigit() { return Math.floor(Math.random() * 10); }
    function randDecimal() {
        let s = '0.';
        for (let i = 0; i < DECIMAL_PLACES; i++) s += randDigit();
        return s;
    }
    function incrementDigit(d) { return (d + 1) % 10; }
    function $(id) {
        const el = document.getElementById(id);
        if (!el) console.warn('[Uncountable] Element not found:', id);
        return el;
    }
    function el(tag, cls, html) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    }

    // Parse a decimal string into an array of digits (padded/truncated to DECIMAL_PLACES)
    function parseDecimalDigits(str) {
        let s = str.replace(/^0\./, '').replace(/\.$/, '');
        let digits = [];
        for (let i = 0; i < DECIMAL_PLACES; i++) {
            digits.push(i < s.length ? parseInt(s[i], 10) || 0 : 0);
        }
        return digits;
    }

    function initTableData() {
        tableData = [];
        // User numbers first
        userNumbers.forEach(num => {
            tableData.push(parseDecimalDigits(num));
        });
        // Fill with random
        for (let i = tableData.length; i < TABLE_ROWS; i++) {
            let digits = [];
            for (let j = 0; j < DECIMAL_PLACES; j++) digits.push(randDigit());
            tableData.push(digits);
        }
    }

    // Gallery 1: Intuition
    let count = 0;
    function initGallery1() {
        const display = $('countDisplay');
        const hint = $('countHint');

        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.onclick = () => {
                const add = parseInt(btn.dataset.add, 10);
                count += add;
                display.textContent = count.toLocaleString(currentLang === 'zh' ? 'zh-CN' : 'en-US');
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

    // Gallery 2: Paradox
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

        for (let i = 1; i <= SEQUENCE_DISPLAY_COUNT; i++) {
            const nEl = el('span', 'pair-num', i);
            nEl.id = `nat-${i}`;
            naturalContainer.appendChild(nEl);

            const sEl = el('span', 'pair-num', i * i);
            sEl.id = `sq-${i}`;
            squareContainer.appendChild(sEl);
        }

        naturalContainer.appendChild(el('span', 'pair-num', '…'));
        squareContainer.appendChild(el('span', 'pair-num', '…'));

        // Angle 1
        initNumberGrid();

        // Ratio slider
        const slider = $('rangeSlider');
        const label = $('ratioLabel');
        const fill = $('ratioFill');
        const skip = $('ratioSkip');
        const summary = $('ratioSummary');
        function updateRatio() {
            const n = parseInt(slider.value, 10);
            const squares = Math.floor(Math.sqrt(n));
            const pct = (squares / n) * 100;
            fill.style.width = pct + '%';
            skip.style.width = (100 - pct) + '%';
            const locale = currentLang === 'zh' ? 'zh-CN' : 'en-US';
            const nStr = n.toLocaleString(locale);
            if (label) label.innerHTML = t('a1.ratio.label', { n: nStr });
            summary.innerHTML = t('a1.ratio.summary', { n: nStr, s: squares.toLocaleString(locale), m: (n - squares).toLocaleString(locale) });
        }
        slider.addEventListener('input', updateRatio);
        ratioUpdater = updateRatio;
        updateRatio();

        // Navigation
        $('toAngle2').onclick = () => {
            $('angle-1').classList.add('hidden');
            $('angle-2').classList.remove('hidden');
            $('angle-2').scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        $('checkGrid').onclick = checkGrid;

        // Angle 2
        $('pairTest').onclick = tryPair;
        $('pairInput').addEventListener('keydown', e => { if (e.key === 'Enter') tryPair(); });
        $('toCollision').onclick = () => {
            $('angle-2').classList.add('hidden');
            $('collision').classList.remove('hidden');
            $('collision').scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        $('proceed2').onclick = () => $('gallery-3').scrollIntoView({ behavior: 'smooth' });
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

        // Update label to 'missed' after checking
        const missedLabel = $('statMissedLabel');
        if (missedLabel) {
            missedLabel.textContent = t('a1.stat.missed');
            missedLabel.setAttribute('data-i18n', 'a1.stat.missed');
        }

        $('checkGrid').classList.add('hidden');
        $('angle1Result').classList.remove('hidden');
        $('ratioDemo').classList.remove('hidden');
        $('angle1Conclusion').classList.remove('hidden');
        $('toAngle2').classList.remove('hidden');
    }

    function formatNumber(n) {
        const locale = currentLang === 'zh' ? 'zh-CN' : 'en-US';
        if (n === 0) return '0';
        const str = n.toString();
        if (str.length <= 12) return n.toLocaleString(locale);
        // Large numbers
        const exp = Math.floor(Math.log10(Math.abs(n)));
        const mantissa = n / Math.pow(10, exp);
        return `${mantissa.toFixed(4)} × 10^${exp}`;
    }

    function tryPair() {
        const input = $('pairInput');
        const result = $('pairTestResult');
        let val = input.value.trim();
        if (!val) return;
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 1 || !Number.isInteger(n)) {
            result.innerHTML = '<p style="color:var(--error)">' + t('a2.error') + '</p>';
            return;
        }

        const sq = n * n;
        pairAttempts.push({ n, sq });

        result.innerHTML = `<div class="pair-card"><span class="natural">${formatNumber(n)}</span><span class="arrow">→</span><span class="square">${formatNumber(sq)}</span></div>`;

        const hist = $('pairHistory');
        hist.innerHTML = '';
        pairAttempts.slice(-12).forEach(a => {
            const item = el('span', 'pair-history-item', `${formatNumber(a.n)}→${formatNumber(a.sq)}`);
            hist.appendChild(item);
        });

        input.value = '';
        input.focus();

        // Show result
        if (pairAttempts.length >= 1) {
            $('attemptCount').textContent = pairAttempts.length;
            $('angle2Result').classList.remove('hidden');
            $('angle2Conclusion').classList.remove('hidden');
            $('toCollision').classList.remove('hidden');
        }
    }

    // Gallery 3: Question
    function initGallery3() {
        const input = $('numberInput');
        const addBtn = $('addNumber');
        const list = $('numberList');
        const counter = $('counter');
        const proceed = $('proceed3');

        function addNumber() {
            let val = input.value.trim();
            if (!val) return;
            // Normalize: ensure it's a 0.xxx format
            if (val.startsWith('.')) val = '0' + val;
            if (!val.startsWith('0.')) {
                if (val.startsWith('0')) val = '0.' + val.slice(1);
                else val = '0.' + val;
            }
            // Validate: must be 0. followed by at least one digit
            if (!/^0\.\d+$/.test(val)) {
                input.value = '';
                return;
            }
            userNumbers.push(val);
            input.value = '';
            renderList();
        }

        function renderList() {
            if (userNumbers.length === 0) {
                list.innerHTML = '<p class="empty-hint">' + t('g3.empty') + '</p>';
                counter.textContent = t('g3.counter', { n: 0 });
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
                counter.textContent = t('g3.counter', { n: userNumbers.length });
                if (userNumbers.length >= 1) proceed.classList.remove('hidden');
            }
        }

        addBtn.onclick = addNumber;
        input.addEventListener('keydown', e => { if (e.key === 'Enter') addNumber(); });
        proceed.onclick = showTable;

        renderList();
    }

    function showTable() {
        // Hide input area
        const inputZone = $('numberInput').closest('.input-zone');
        if (inputZone) inputZone.classList.add('hidden');
        $('tableContainer').classList.remove('hidden');
        $('proceed3b').classList.remove('hidden');
        buildInfiniteTable();
    }

    let tableScrollHandler = null;
    function buildInfiniteTable() {
        const container = $('infiniteTable');
        container.innerHTML = '';
        let rowsShown = 0;

        // Remove previous handler
        if (tableScrollHandler) {
            container.removeEventListener('scroll', tableScrollHandler);
        }

        function formatRow(num) {
            let s = num.replace(/^0\./, '');
            while (s.length < DECIMAL_PLACES) s += '0';
            return '0.' + s.substring(0, DECIMAL_PLACES) + '…';
        }

        function addRows(count) {
            for (let i = 0; i < count && rowsShown < INFINITE_TABLE_ROWS; i++) {
                const row = el('div', 'table-row');
                row.appendChild(el('span', 'row-num', t('g3.row', { n: rowsShown + 1 })));
                const val = rowsShown < userNumbers.length
                    ? formatRow(userNumbers[rowsShown])
                    : randDecimal() + '…';
                const valEl = el('span', 'row-val', val);
                if (rowsShown < userNumbers.length) valEl.style.color = 'var(--gold-bright)';
                row.appendChild(valEl);
                container.appendChild(row);
                rowsShown++;
            }
            if (rowsShown >= INFINITE_TABLE_ROWS && !container.querySelector('.ellipsis-row')) {
                const er = el('div', 'table-row ellipsis-row');
                er.appendChild(el('span', 'row-num', t('g3.rowN')));
                er.appendChild(el('span', 'row-val ellipsis-val', '0. …'));
                container.appendChild(er);
                const fr = el('div', 'table-row ellipsis-row');
                fr.appendChild(el('span', 'row-num', '…'));
                fr.appendChild(el('span', 'row-val ellipsis-val', '…'));
                container.appendChild(fr);
            }
        }

        addRows(20);
        tableScrollHandler = () => {
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
                addRows(10);
            }
        };
        container.addEventListener('scroll', tableScrollHandler);

        $('proceed3b').onclick = () => {
            // Re-initialize diagonal
            initTableData();
            buildDiagonalTable();

            // Populate infinity comparison with user's actual numbers
            const seqEl = $('infSeqRight');
            if (seqEl) {
                if (userNumbers.length >= 3) {
                    seqEl.textContent = userNumbers.slice(0, 3).join(', ') + ', …';
                } else if (userNumbers.length > 0) {
                    seqEl.textContent = userNumbers.join(', ') + ', …';
                }
            }
            // Reset diagonal steps
            currentDiagStep = 0;
            incrementedDigits = [];
            currentCheckRow = 0;
            ['step-4b', 'step-4d'].forEach(id => { if ($(id)) $(id).classList.add('hidden'); });
            if ($('step-4a')) $('step-4a').classList.remove('hidden');
            if ($('diagHint')) $('diagHint').textContent = t('g4.hint');
            if ($('newNumber')) $('newNumber').textContent = '0.';
            if ($('checkConclusion')) $('checkConclusion').classList.add('hidden');
                if ($('finiteNote')) $('finiteNote').classList.add('hidden');
            if ($('proceed4b')) $('proceed4b').classList.add('hidden');
            if ($('proceed4d')) $('proceed4d').classList.add('hidden');
            $('gallery-4').scrollIntoView({ behavior: 'smooth' });
        };
    }

    // Gallery 4: Diagonal
    function initGallery4() {
        initTableData();
        buildDiagonalTable();
        $('nextDiag').onclick = stepNextDiag;
        $('autoDiag').onclick = autoPlayDiag;
        $('proceed4b').onclick = () => showStep('step-4d', 'step-4b');
        $('incrementAll').onclick = incrementAllDigits;
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
            label.textContent = t('g3.row', { n: i + 1 });
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

        // Ellipsis row
        const ellipsisRow = document.createElement('tr');
        const elLabel = document.createElement('td');
        elLabel.className = 'row-label';
        elLabel.textContent = t('g3.rowN');
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
        if (currentDiagStep >= TABLE_ROWS) return;
        const i = currentDiagStep;
        const cell = $(`cell-${i}-${i}`);
        if (cell) {
            cell.classList.add('diagonal-highlight');
            setTimeout(() => cell.classList.add('diagonal-extracted'), 600);
        }
        currentDiagStep++;
        if (currentDiagStep >= TABLE_ROWS) {
            $('diagHint').textContent = t('g4.hintDone');
            $('step-4b').classList.remove('hidden');
            extractDiagonal();
            initIncrementZone();
        }
    }

    let autoPlayInterval = null;
    function autoPlayDiag() {
        if (autoPlayInterval) return;
        autoPlayInterval = setInterval(() => {
            if (currentDiagStep >= TABLE_ROWS) { clearInterval(autoPlayInterval); autoPlayInterval = null; return; }
            stepNextDiag();
        }, 800);
    }

    function extractDiagonal() {
        diagonalDigits = [];
        for (let i = 0; i < TABLE_ROWS; i++) {
            diagonalDigits.push(tableData[i][i]);
        }
    }

    function showStep(showId, hideId) {
        $(hideId).classList.add('hidden');
        $(showId).classList.remove('hidden');
        if (showId === 'step-4d') {
            $('newNumberPinned').textContent = $('newNumber').textContent;
            initCheckTable();
        }
    }

    function initIncrementZone() {
        const zone = $('incrementZone');
        zone.innerHTML = '';
        incrementedDigits = [];

        diagonalDigits.forEach((d, i) => {
            const card = el('div', 'increment-card');
            const oldNum = el('div', 'increment-card-num old', d);
            const newNum = el('div', 'increment-card-num new', incrementDigit(d));
            card.appendChild(oldNum);
            card.appendChild(newNum);
            card.onclick = () => {
                if (!card.classList.contains('incremented')) {
                    card.classList.add('incremented');
                    incrementedDigits.push({ index: i, original: d, incremented: incrementDigit(d) });
                    updateNewNumber();
                    if (incrementedDigits.length === diagonalDigits.length) {
                        $('proceed4b').classList.remove('hidden');
                    }
                }
            };
            zone.appendChild(card);
        });
    }

    let incrementAllInProgress = false;
    function incrementAllDigits() {
        if (incrementAllInProgress) return;
        incrementAllInProgress = true;
        const cards = document.querySelectorAll('#incrementZone .increment-card');
        let pending = 0;
        cards.forEach((card, i) => {
            if (!card.classList.contains('incremented')) {
                pending++;
                setTimeout(() => {
                    card.classList.add('incremented');
                    incrementedDigits.push({ index: i, original: diagonalDigits[i], incremented: incrementDigit(diagonalDigits[i]) });
                    updateNewNumber();
                    if (incrementedDigits.length === diagonalDigits.length) {
                        $('proceed4b').classList.remove('hidden');
                    }
                    pending--;
                    if (pending === 0) incrementAllInProgress = false;
                }, i * 150);
            }
        });
        if (pending === 0) incrementAllInProgress = false;
    }

    function updateNewNumber() {
        const sorted = incrementedDigits.slice().sort((a, b) => a.index - b.index);
        let str = '0.';
        sorted.forEach(d => str += d.incremented);
        $('newNumber').textContent = str;
    }

    function initCheckTable() {
        const container = $('checkTable');
        container.innerHTML = '';
        currentCheckRow = 0;

        for (let i = 0; i < TABLE_ROWS; i++) {
            const row = el('div', 'check-row');
            row.id = `check-row-${i}`;
            row.appendChild(el('span', 'check-num', t('g3.row', { n: i + 1 })));
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
            $('finiteNote').classList.remove('hidden');
            $('proceed4d').classList.remove('hidden');
        }
    }

    function checkAllRows() {
        const interval = setInterval(() => {
            if (currentCheckRow >= TABLE_ROWS) {
                clearInterval(interval);
                $('checkConclusion').classList.remove('hidden');
                $('finiteNote').classList.remove('hidden');
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
        if (result) {
            result.textContent = t('g4.checkResult', { n: i + 1 });
            result.className = 'check-result nomatch';
        }
    }

    // Gallery 5 & 6: Reveal
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
        const exhibitEnd = document.querySelector('.exhibit-end');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    items.forEach((item, idx) => {
                        setTimeout(() => item.classList.add('visible'), idx * 1500);
                    });
                    // Show the restart button after all epitaphs
                    if (exhibitEnd) {
                        setTimeout(() => exhibitEnd.classList.add('visible'), items.length * 1500 + 2000);
                    }
                    observer.disconnect();
                }
            });
        }, { threshold: 0.1 });
        observer.observe($('gallery-6'));
    }

    // Nav
    function initNavProgress() {
        const galleries = document.querySelectorAll('.gallery');
        const nav = $('navProgress');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    const num = id.split('-')[1];
                    nav.textContent = t('nav.progress', { n: num });
                }
            });
        }, { threshold: 0.3 });
        galleries.forEach(g => observer.observe(g));
    }

    // Init
    document.addEventListener('DOMContentLoaded', () => {
        // Detect language from URL
        const params = new URLSearchParams(window.location.search);
        const langParam = params.get('lang');
        if (langParam === 'en') {
            applyLang('en');
        } else {
            applyLang('zh');
        }

        // Language toggle
        $('langToggle').onclick = () => {
            const newLang = currentLang === 'zh' ? 'en' : 'zh';
            applyLang(newLang);
        };

        initGallery1();
        initGallery2();
        initGallery3();
        initGallery4();
        initGallery5();
        initGallery6();
        initNavProgress();

        // Reset
        const resetLink = document.querySelector('.exhibit-end a[href="#gallery-1"]');
        if (resetLink) {
            resetLink.addEventListener('click', (e) => {
                // Reset Gallery 1 counter
                count = 0;
                if ($('countDisplay')) $('countDisplay').textContent = '0';
                if ($('countHint')) $('countHint').classList.add('hidden');

                // Reset Gallery 2
                gridSelected.clear();
                gridChecked = false;
                pairAttempts = [];
                initNumberGrid();
                ['angle1Result', 'ratioDemo', 'angle1Conclusion', 'angle2Result', 'angle2Conclusion'].forEach(id => {
                    const el = $(id);
                    if (el) el.classList.add('hidden');
                });
                if ($('angle-1')) $('angle-1').classList.remove('hidden');
                if ($('angle-2')) $('angle-2').classList.add('hidden');
                if ($('collision')) $('collision').classList.add('hidden');
                if ($('toAngle2')) $('toAngle2').classList.add('hidden');
                if ($('toCollision')) $('toCollision').classList.add('hidden');
                if ($('pairTestResult')) $('pairTestResult').innerHTML = '';
                if ($('pairHistory')) $('pairHistory').innerHTML = '';
                if ($('pairInput')) $('pairInput').value = '';

                // Reset Gallery 3
                userNumbers = [];
                const iz = $('numberInput') ? $('numberInput').closest('.input-zone') : null;
                if (iz) iz.classList.remove('hidden');
                if ($('tableContainer')) $('tableContainer').classList.add('hidden');
                if ($('proceed3')) $('proceed3').classList.add('hidden');
                if ($('proceed3b')) $('proceed3b').classList.add('hidden');
                if ($('numberList')) $('numberList').innerHTML = '<p class="empty-hint">' + t('g3.empty') + '</p>';
                if ($('counter')) $('counter').textContent = t('g3.counter', { n: 0 });

                // Reset Gallery 4
                currentDiagStep = 0;
                incrementedDigits = [];
                currentCheckRow = 0;
                initTableData();
                buildDiagonalTable();
                ['step-4b', 'step-4d'].forEach(id => { if ($(id)) $(id).classList.add('hidden'); });
                if ($('step-4a')) $('step-4a').classList.remove('hidden');
                if ($('diagHint')) $('diagHint').textContent = t('g4.hint');
                if ($('newNumber')) $('newNumber').textContent = '0.';
                if ($('checkConclusion')) $('checkConclusion').classList.add('hidden');
                if ($('finiteNote')) $('finiteNote').classList.add('hidden');
                if ($('proceed4b')) $('proceed4b').classList.add('hidden');
                if ($('proceed4d')) $('proceed4d').classList.add('hidden');

                // Reset Gallery 5 & 6 reveal
                document.querySelectorAll('#gallery-5 .reveal, #gallery-6 .reveal').forEach(el => el.classList.remove('visible'));
            });
        }
    });

})();
