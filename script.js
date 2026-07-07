let weights = [];
let bias = 0;
let epoch = 0;
let isTraining = false;
let animationId;
let lossHistory = [];

let dataset = [];
let editIndex = -1;

const learningRate = 0.001; 
const alphabet = ['A', 'B', 'C', 'D', 'E', 'F'];

const varCountSelect = document.getElementById('variable-count');
const speedSlider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');
const dynamicInputForm = document.getElementById('dynamic-input-form');
const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');
const noDataMsg = document.getElementById('no-data-msg');
const dynamicEquation = document.getElementById('dynamic-equation');

const epochEl = document.getElementById('epoch-count');
const lossTextEl = document.getElementById('loss-text');
const canvasLoss = document.getElementById('lossChart');
const ctxLoss = canvasLoss.getContext('2d');

const resultPanel = document.getElementById('result-panel');
const ruleDesc = document.getElementById('rule-description');
const canvasVisual = document.getElementById('visual-canvas');
const ctxVisual = canvasVisual.getContext('2d');
const visualCaption = document.getElementById('visual-caption');
const predictInputsContainer = document.getElementById('predict-inputs');
const predictAnswer = document.getElementById('predict-answer');

speedSlider.addEventListener('input', (e) => { speedVal.innerText = e.target.value; });

// サンプル問題を読み込む機能
document.getElementById('loadSampleBtn').addEventListener('click', () => {
    const type = document.getElementById('sample-select').value;
    if (!type) return alert("試したいルールを選んでね！");

    // 全て2変数のサンプルなので、セレクトボックスを「2つ(AとB)」に強制変更
    varCountSelect.value = "2";
    rebuildUI();

    dataset = [];
    if (type === 'add') {
        dataset.push([1, 2, 3], [5, 5, 10], [0, 8, 8], [-2, 4, 2], [10, -5, 5]);
    } else if (type === 'double_a') {
        dataset.push([3, 5, 6], [10, 1, 20], [0, 8, 0], [-4, 2, -8], [5, 100, 10]);
    } else if (type === 'complex') {
        dataset.push([1, 1, 6], [2, 0, 9], [0, 2, 3], [5, 5, 10], [10, 10, 15]); // 2A - B + 5
    } else if (type === 'average') {
        dataset.push([4, 6, 5], [10, 0, 5], [2, 2, 2], [-4, 4, 0], [100, 50, 75]); // (A+B)/2
    }
    
    renderTable();
    calculateCurrentLoss();
});

function getVarCount() { return parseInt(varCountSelect.value); }

function rebuildUI() {
    const count = getVarCount();
    let formHTML = '';
    for (let i = 0; i < count; i++) {
        formHTML += `<div class="input-group"><label>${alphabet[i]} = </label><input type="number" id="input-var-${i}" placeholder="0" required></div>`;
    }
    formHTML += `<div class="input-group target-group"><label>答え = </label><input type="number" id="input-target" placeholder="0" required></div><button type="button" id="submitDataBtn">登録する！</button>`;
    dynamicInputForm.innerHTML = formHTML;
    document.getElementById('submitDataBtn').addEventListener('click', handleDataSubmit);

    let headerHTML = '';
    for (let i = 0; i < count; i++) { headerHTML += `<th>手がかり ${alphabet[i]}</th>`; }
    headerHTML += `<th>正解（答え）</th><th style="width:110px;">操作</th>`;
    tableHeader.innerHTML = headerHTML;

    dataset = []; editIndex = -1; renderTable(); initBrain();
}

function initBrain() {
    const count = getVarCount();
    weights = [];
    for (let i = 0; i < count; i++) { weights.push(Math.random() * 2 - 1); }
    bias = Math.random() * 2 - 1;
    epoch = 0; lossHistory = [];
    resultPanel.classList.add('hidden');
    updateEquationUI(); drawLossGraph();
}

function renderTable() {
    const count = getVarCount();
    if (dataset.length === 0) {
        tableBody.innerHTML = '';
        noDataMsg.classList.remove('hidden');
        return;
    }
    noDataMsg.classList.add('hidden');
    let bodyHTML = '';
    dataset.forEach((row, rowIndex) => {
        bodyHTML += `<tr>`;
        for (let i = 0; i < count; i++) { bodyHTML += `<td>${row[i]}</td>`; }
        bodyHTML += `<td style="font-weight:bold; color:var(--primary-color);">${row[count]}</td>`;
        bodyHTML += `<td><button class="action-btn edit-btn" onclick="editData(${rowIndex})">✎</button><button class="action-btn del-btn" onclick="deleteData(${rowIndex})">✖</button></td></tr>`;
    });
    tableBody.innerHTML = bodyHTML;
}

function handleDataSubmit() {
    const count = getVarCount();
    const rowData = [];
    for (let i = 0; i < count; i++) {
        const val = parseFloat(document.getElementById(`input-var-${i}`).value);
        if (isNaN(val)) return alert(`${alphabet[i]} に数字を入れてね！`);
        rowData.push(val);
    }
    const targetVal = parseFloat(document.getElementById('input-target').value);
    if (isNaN(targetVal)) return alert(`「答え」に数字を入れてね！`);
    rowData.push(targetVal);

    if (editIndex === -1) { dataset.push(rowData); } 
    else { dataset[editIndex] = rowData; editIndex = -1; document.getElementById('submitDataBtn').innerText = '登録する！'; }

    for (let i = 0; i < count; i++) { document.getElementById(`input-var-${i}`).value = ''; }
    document.getElementById('input-target').value = '';
    resultPanel.classList.add('hidden'); renderTable(); calculateCurrentLoss();
}

window.deleteData = function(index) {
    if (isTraining) return alert("AIが考え中です。一時停止してね！");
    dataset.splice(index, 1);
    if (editIndex === index) { editIndex = -1; document.getElementById('submitDataBtn').innerText = '登録する！'; }
    else if (editIndex > index) { editIndex--; }
    renderTable(); calculateCurrentLoss();
};

window.editData = function(index) {
    if (isTraining) return alert("AIが考え中です。一時停止してね！");
    const count = getVarCount();
    const rowData = dataset[index];
    for (let i = 0; i < count; i++) { document.getElementById(`input-var-${i}`).value = rowData[i]; }
    document.getElementById('input-target').value = rowData[count];
    editIndex = index; document.getElementById('submitDataBtn').innerText = `直す！`;
};

function calculateCurrentLoss() {
    if (dataset.length === 0) { lossTextEl.textContent = '0.00000'; return; }
    const count = getVarCount();
    let totalLoss = 0;
    dataset.forEach(row => {
        let pred = bias;
        for (let i = 0; i < count; i++) { pred += weights[i] * row[i]; }
        totalLoss += Math.pow(pred - row[count], 2);
    });
    lossTextEl.textContent = (totalLoss / dataset.length).toFixed(5);
}

function updateEquationUI() {
    const count = getVarCount();
    let html = ``;
    for (let i = 0; i < count; i++) {
        const w = weights[i];
        if (isNaN(w)) continue;
        const isDimmed = Math.abs(w) < 0.05;
        const className = isDimmed ? 'dimmed' : '';
        if (i > 0) html += `<span>＋</span>`;
        let operation = w >= 0 ? `× <span class="math-w">${w.toFixed(2)}</span>` : `× <span class="math-w" style="color:#ff5252">(${w.toFixed(2)})</span>`;
        html += `<div class="term-badge ${className}"><span class="math-var">${alphabet[i]}</span> ${operation}</div>`;
    }
    const isBDimmed = Math.abs(bias) < 0.05;
    html += `<span>＋</span>`;
    html += `<div class="term-badge ${isBDimmed ? 'dimmed' : ''}"><span style="font-size:0.8rem; color:#aaa">基本点</span> <span class="math-b">${bias >= 0 ? '+' : ''}${bias.toFixed(2)}</span></div>`;
    html += `<span>＝</span> <div class="math-y">答え</div>`;
    dynamicEquation.innerHTML = html;
    epochEl.textContent = epoch;
}

function drawLossGraph() {
    ctxLoss.clearRect(0, 0, canvasLoss.width, canvasLoss.height);
    if (lossHistory.length === 0) return;
    ctxLoss.beginPath(); ctxLoss.strokeStyle = '#00e5ff'; ctxLoss.lineWidth = 2;
    const maxLoss = Math.max(...lossHistory.filter(v => !isNaN(v)), 1);
    const stepX = canvasLoss.width / Math.max(lossHistory.length - 1, 1);
    lossHistory.forEach((loss, index) => {
        if(isNaN(loss)) return;
        const x = index * stepX;
        const y = canvasLoss.height - (loss / maxLoss) * canvasLoss.height;
        if (index === 0) ctxLoss.moveTo(x, y); else ctxLoss.lineTo(x, y);
    });
    ctxLoss.stroke();
}

function trainLoop() {
    if (!isTraining) return;
    if (dataset.length === 0) { alert("手がかり（データ）がないと、AIは考えられません！"); isTraining = false; return; }

    const count = getVarCount();
    const speed = parseInt(speedSlider.value);

    for (let step = 0; step < speed; step++) {
        const sample = dataset[Math.floor(Math.random() * dataset.length)];
        let pred = bias;
        for (let i = 0; i < count; i++) { pred += weights[i] * sample[i]; }
        const error = pred - sample[count];
        const clippedError = Math.max(-10, Math.min(10, error));

        for (let i = 0; i < count; i++) {
            let delta = learningRate * clippedError * sample[i];
            weights[i] -= Math.max(-0.5, Math.min(0.5, delta));
        }
        bias -= Math.max(-0.5, Math.min(0.5, learningRate * clippedError));
        epoch++;
    }

    if (isNaN(weights[0])) {
        isTraining = false; alert("数字が大きすぎてAIがパニックになりました！記憶をリセットします。"); initBrain(); return;
    }

    let totalLoss = 0;
    dataset.forEach(row => {
        let p = bias;
        for (let i = 0; i < count; i++) { p += weights[i] * row[i]; }
        totalLoss += Math.pow(p - row[count], 2);
    });
    const mse = totalLoss / dataset.length;

    updateEquationUI();
    lossTextEl.textContent = mse.toFixed(5);
    
    if (epoch % Math.max(1, Math.floor(speed / 5)) === 0) {
        lossHistory.push(mse);
        if (lossHistory.length > 120) lossHistory.shift();
        drawLossGraph();
    }

    if (mse < 0.00005) {
        isTraining = false;
        lossTextEl.textContent = "0.00000 (カンペキ！)";
        lossTextEl.style.color = "#00e5ff";
        generateAnalysisReport();
        return;
    } else {
        lossTextEl.style.color = "var(--text-color)";
    }
    animationId = requestAnimationFrame(trainLoop);
}

function generateAnalysisReport() {
    resultPanel.classList.remove('hidden');
    const count = getVarCount();
    
    let desc = "";
    for (let i = 0; i < count; i++) {
        const w = weights[i];
        const isPositive = w >= 0;
        const actionText = isPositive ? "増える" : "減る";
        
        // 【修正】「約」を追加しました！
        desc += `
        <div class="rule-item">
            <span>✨ 手がかり <strong>${alphabet[i]}</strong> が 1 増えると、答えは</span>
            <span>約 <span class="big-num">${Math.abs(w).toFixed(2)}</span> ${actionText}</span>
        </div>`;
    }
    
    desc += `
    <div class="rule-item rule-item-base">
        <span>🎁 なにも手がかりがない時（全部0の時）、最初から</span>
        <span>約 <span class="big-num big-num-base">${bias.toFixed(2)}</span> からスタートする</span>
    </div>`;
    
    ruleDesc.innerHTML = desc;
    drawDynamicVisualization();
    buildPredictUI(); // テスト入力欄を作る
    
    setTimeout(() => { resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
}

// AIにテストを出すUIを生成
function buildPredictUI() {
    const count = getVarCount();
    let html = '';
    for(let i = 0; i < count; i++) {
        html += `<div>${alphabet[i]} = <input type="number" id="pred-var-${i}" value="10"></div>`;
    }
    predictInputsContainer.innerHTML = html;
    predictAnswer.innerText = '???';
}

// AIにテストを解かせる計算ボタン
document.getElementById('predictBtn').addEventListener('click', () => {
    const count = getVarCount();
    let ans = bias;
    for(let i = 0; i < count; i++) {
        const val = parseFloat(document.getElementById(`pred-var-${i}`).value) || 0;
        ans += weights[i] * val;
    }
    predictAnswer.innerText = ans.toFixed(2);
});

function drawDynamicVisualization() {
    const count = getVarCount();
    const w = canvasVisual.width;
    const h = canvasVisual.height;
    ctxVisual.clearRect(0, 0, w, h);

    if (count === 1) {
        visualCaption.innerText = "📈 横軸が「A」、縦軸が「答え」だよ。水色の線がAIの見つけたルール！";
        ctxVisual.strokeStyle = '#444'; ctxVisual.beginPath();
        ctxVisual.moveTo(0, h/2); ctxVisual.lineTo(w, h/2); ctxVisual.moveTo(w/2, 0); ctxVisual.lineTo(w/2, h); ctxVisual.stroke();
        const scaleX = x => (x + 10) / 20 * w; const scaleY = y => h - ((y + 10) / 20 * h);
        ctxVisual.strokeStyle = 'rgba(0, 229, 255, 0.8)'; ctxVisual.lineWidth = 3; ctxVisual.beginPath();
        for (let xVal = -10; xVal <= 10; xVal += 1) {
            let yVal = weights[0] * xVal + bias;
            if (xVal === -10) ctxVisual.moveTo(scaleX(xVal), scaleY(yVal)); else ctxVisual.lineTo(scaleX(xVal), scaleY(yVal));
        }
        ctxVisual.stroke();
        dataset.forEach(row => {
            ctxVisual.beginPath(); ctxVisual.arc(scaleX(row[0]), scaleY(row[1]), 6, 0, Math.PI*2);
            ctxVisual.fillStyle = '#fff'; ctxVisual.fill(); ctxVisual.strokeStyle = '#000'; ctxVisual.stroke();
        });
    } else if (count === 2) {
        visualCaption.innerText = "🗺️ 横が「A」、縦が「B」。赤いエリアが答えが大きく、青いエリアが答えが小さい場所だよ！";
        const range = 10;
        for (let x = 0; x < w; x += 5) {
            for (let y = 0; y < h; y += 5) {
                const a_val = ((x / w) * range * 2) - range; const b_val = (((h - y) / h) * range * 2) - range;
                const ans = (weights[0] * a_val) + (weights[1] * b_val) + bias;
                const colorValue = Math.max(-255, Math.min(255, ans * 15));
                if (ans > 0) ctxVisual.fillStyle = `rgb(${Math.floor(colorValue)}, 40, 60)`;
                else ctxVisual.fillStyle = `rgb(40, 60, ${Math.floor(Math.abs(colorValue))})`;
                ctxVisual.fillRect(x, y, 5, 5);
            }
        }
        dataset.forEach(row => {
            const px = ((row[0] + range) / (range * 2)) * w; const py = h - (((row[1] + range) / (range * 2)) * h);
            ctxVisual.beginPath(); ctxVisual.arc(px, py, 6, 0, Math.PI*2);
            ctxVisual.fillStyle = '#fff'; ctxVisual.fill(); ctxVisual.strokeStyle = '#000'; ctxVisual.stroke();
        });
    } else {
        visualCaption.innerText = "📊 どの手がかりが一番結果に影響を与えているかのランキングだよ！";
        ctxVisual.fillStyle = '#131520'; ctxVisual.fillRect(0, 0, w, h);
        ctxVisual.strokeStyle = '#444'; ctxVisual.beginPath(); ctxVisual.moveTo(w/2, 0); ctxVisual.lineTo(w/2, h); ctxVisual.stroke();
        const barHeight = 28; const totalItems = count + 1; const spacing = (h - (totalItems * barHeight)) / (totalItems + 1);
        let items = [];
        for (let i = 0; i < count; i++) { items.push({ label: `A`, name: alphabet[i], val: weights[i], color: '#b388ff' }); }
        items.push({ label: '基本', name: '最初から', val: bias, color: '#ffb300' });
        items.forEach((item, index) => {
            const y = spacing + index * (barHeight + spacing); const maxW = Math.max(2.0, ...items.map(i=>Math.abs(i.val)));
            const barWidth = (item.val / maxW) * (w / 2 - 20);
            ctxVisual.fillStyle = item.color; ctxVisual.fillRect(w/2, y, barWidth, barHeight);
            ctxVisual.fillStyle = '#fff'; ctxVisual.font = 'bold 12px sans-serif'; ctxVisual.textAlign = item.val >= 0 ? 'right' : 'left';
            ctxVisual.fillText(`${item.name} (${item.val.toFixed(1)})`, item.val >= 0 ? w/2 - 10 : w/2 + 10, y + 18);
        });
    }
}

varCountSelect.addEventListener('change', rebuildUI);
document.getElementById('startBtn').addEventListener('click', () => { if (!isTraining) { isTraining = true; trainLoop(); } });
document.getElementById('pauseBtn').addEventListener('click', () => { isTraining = false; cancelAnimationFrame(animationId); });
document.getElementById('resetBtn').addEventListener('click', () => { isTraining = false; cancelAnimationFrame(animationId); initBrain(); });

rebuildUI();