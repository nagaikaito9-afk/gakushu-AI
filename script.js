let weights = [];
let bias = 0;
let epoch = 0;
let isTraining = false;
let animationId;
let lossHistory = [];

let dataset = [];
let editIndex = -1;

// 安全のために学習の基準歩幅を小さくしました
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
const ruleReason = document.getElementById('rule-reason');
const canvasVisual = document.getElementById('visual-canvas');
const ctxVisual = canvasVisual.getContext('2d');
const visualCaption = document.getElementById('visual-caption');

speedSlider.addEventListener('input', (e) => {
    speedVal.innerText = e.target.value;
});

function getVarCount() {
    return parseInt(varCountSelect.value);
}

function rebuildUI() {
    const count = getVarCount();
    
    let formHTML = '';
    for (let i = 0; i < count; i++) {
        formHTML += `<div class="input-group"><label>${alphabet[i]} = </label><input type="number" id="input-var-${i}" placeholder="0" required></div>`;
    }
    formHTML += `<div class="input-group target-group"><label>答え = </label><input type="number" id="input-target" placeholder="0" required></div><button type="button" id="submitDataBtn">データを登録</button>`;
    dynamicInputForm.innerHTML = formHTML;
    document.getElementById('submitDataBtn').addEventListener('click', handleDataSubmit);

    let headerHTML = '';
    for (let i = 0; i < count; i++) {
        headerHTML += `<th>変数 ${alphabet[i]}</th>`;
    }
    headerHTML += `<th>答え</th><th style="width:110px;">操作</th>`;
    tableHeader.innerHTML = headerHTML;

    dataset = [];
    editIndex = -1;
    renderTable();
    initBrain();
}

function initBrain() {
    const count = getVarCount();
    weights = [];
    for (let i = 0; i < count; i++) {
        weights.push(Math.random() * 2 - 1);
    }
    bias = Math.random() * 2 - 1;
    epoch = 0;
    lossHistory = [];
    resultPanel.classList.add('hidden');
    updateEquationUI();
    drawLossGraph();
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
        bodyHTML += `<td><button class="action-btn edit-btn" onclick="editData(${rowIndex})">編集</button><button class="action-btn del-btn" onclick="deleteData(${rowIndex})">削除</button></td></tr>`;
    });
    tableBody.innerHTML = bodyHTML;
}

function handleDataSubmit() {
    const count = getVarCount();
    const rowData = [];
    for (let i = 0; i < count; i++) {
        const val = parseFloat(document.getElementById(`input-var-${i}`).value);
        if (isNaN(val)) return alert(`${alphabet[i]} に数値を入力してください。`);
        rowData.push(val);
    }
    const targetVal = parseFloat(document.getElementById('input-target').value);
    if (isNaN(targetVal)) return alert(`「答え」に数値を入力してください。`);
    rowData.push(targetVal);

    if (editIndex === -1) { dataset.push(rowData); } 
    else { dataset[editIndex] = rowData; editIndex = -1; document.getElementById('submitDataBtn').innerText = 'データを登録'; }

    for (let i = 0; i < count; i++) { document.getElementById(`input-var-${i}`).value = ''; }
    document.getElementById('input-target').value = '';
    resultPanel.classList.add('hidden');
    renderTable();
    calculateCurrentLoss();
}

window.deleteData = function(index) {
    if (isTraining) return alert("一時停止してください。");
    dataset.splice(index, 1);
    if (editIndex === index) { editIndex = -1; document.getElementById('submitDataBtn').innerText = 'データを登録'; }
    else if (editIndex > index) { editIndex--; }
    renderTable();
    calculateCurrentLoss();
};

window.editData = function(index) {
    if (isTraining) return alert("一時停止してください。");
    const count = getVarCount();
    const rowData = dataset[index];
    for (let i = 0; i < count; i++) { document.getElementById(`input-var-${i}`).value = rowData[i]; }
    document.getElementById('input-target').value = rowData[count];
    editIndex = index;
    document.getElementById('submitDataBtn').innerText = `更新`;
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
    let html = `<span class="math-y">答え</span> = `;
    for (let i = 0; i < count; i++) {
        const w = weights[i];
        if (isNaN(w)) continue; // NaNバグ発生時は表示回避
        const absW = Math.abs(w);
        const isDimmed = absW < 0.02;
        const className = isDimmed ? 'dimmed' : '';
        if (i === 0) { if (w < 0) html += `<span class="${className} math-sign">-</span>`; }
        else { html += `<span class="${className} math-sign">${w < 0 ? '-' : '+'}</span>`; }
        html += `<span class="${className} math-w">${absW.toFixed(2)}</span><span class="${className} math-var">${alphabet[i]}</span>`;
    }
    const isBDimmed = Math.abs(bias) < 0.02;
    html += `<span class="${isBDimmed ? 'dimmed' : ''} math-sign">${bias < 0 ? '-' : '+'}</span>`;
    html += `<span class="${isBDimmed ? 'dimmed' : ''} math-b">${Math.abs(bias || 0).toFixed(2)}</span>`;
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
    if (dataset.length === 0) {
        alert("データがありません。");
        isTraining = false;
        return;
    }

    const count = getVarCount();
    const speed = parseInt(speedSlider.value); // スライダーの値でループ回数を制御

    for (let step = 0; step < speed; step++) {
        const sample = dataset[Math.floor(Math.random() * dataset.length)];
        let pred = bias;
        for (let i = 0; i < count; i++) {
            pred += weights[i] * sample[i];
        }

        const error = pred - sample[count];
        
        // 🚨【安全装置（クリッピング）】🚨
        // エラーが大きすぎると勾配爆発（NaN）が起きるため、最大・最小値を制限する
        const clippedError = Math.max(-10, Math.min(10, error));

        for (let i = 0; i < count; i++) {
            // 変数ごとの更新量も念のため制限する
            let delta = learningRate * clippedError * sample[i];
            delta = Math.max(-0.5, Math.min(0.5, delta)); 
            weights[i] -= delta;
        }
        let biasDelta = learningRate * clippedError;
        biasDelta = Math.max(-0.5, Math.min(0.5, biasDelta));
        bias -= biasDelta;
        
        epoch++;
    }

    // NaNバグ検知処理（もし発生したら自動リセット）
    if (isNaN(weights[0])) {
        isTraining = false;
        alert("入力データが極端すぎたため計算が爆発（NaN）しました。脳をリセットします。");
        initBrain();
        return;
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
    
    // 描画負荷を減らすため、履歴は間引いて追加
    if (epoch % Math.max(1, Math.floor(speed / 5)) === 0) {
        lossHistory.push(mse);
        if (lossHistory.length > 120) lossHistory.shift();
        drawLossGraph();
    }

    if (mse < 0.00002) {
        isTraining = false;
        lossTextEl.textContent = "0.00000 (完全収束)";
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
    let desc = "AIは与えられたデータから、以下の「倍率ルール」を特定しました。<br><br>";
    for (let i = 0; i < count; i++) {
        const w = weights[i];
        desc += `・変数 <strong>${alphabet[i]}</strong> が1増えると、答えは <strong>${w > 0 ? 'プラス' : 'マイナス'}へ約 ${Math.abs(w).toFixed(2)}</strong> 変化します。<br>`;
    }
    desc += `・全ての変数が 0 のとき、ベース値は <strong>${bias.toFixed(2)}</strong> になります。`;
    ruleDesc.innerHTML = desc;
    ruleReason.innerHTML = "<strong>【AIがこの結論に至った理由】</strong><br>AIは人間の演算概念を最初から持っていません。ただ、例題群において、各変数に上記の『重み（倍率）』を掛け合わせたときに、すべてのつじつまが完全に合う唯一のルートを、数学的な傾きのみを頼りに自力で見つけ出しました。";
    drawDynamicVisualization();
}

function drawDynamicVisualization() {
    const count = getVarCount();
    const w = canvasVisual.width;
    const h = canvasVisual.height;
    ctxVisual.clearRect(0, 0, w, h);

    if (count === 1) {
        visualCaption.innerText = "横軸:変数A / 縦軸:答え。白丸がデータ、水色の線がAIモデル。";
        ctxVisual.strokeStyle = '#444'; ctxVisual.beginPath();
        ctxVisual.moveTo(0, h/2); ctxVisual.lineTo(w, h/2); ctxVisual.moveTo(w/2, 0); ctxVisual.lineTo(w/2, h); ctxVisual.stroke();
        const scaleX = x => (x + 10) / 20 * w; const scaleY = y => h - ((y + 10) / 20 * h);
        ctxVisual.strokeStyle = 'rgba(0, 229, 255, 0.8)'; ctxVisual.lineWidth = 2; ctxVisual.beginPath();
        for (let xVal = -10; xVal <= 10; xVal += 1) {
            let yVal = weights[0] * xVal + bias;
            if (xVal === -10) ctxVisual.moveTo(scaleX(xVal), scaleY(yVal)); else ctxVisual.lineTo(scaleX(xVal), scaleY(yVal));
        }
        ctxVisual.stroke();
        dataset.forEach(row => {
            ctxVisual.beginPath(); ctxVisual.arc(scaleX(row[0]), scaleY(row[1]), 5, 0, Math.PI*2);
            ctxVisual.fillStyle = '#fff'; ctxVisual.fill(); ctxVisual.strokeStyle = '#000'; ctxVisual.stroke();
        });
    } else if (count === 2) {
        visualCaption.innerText = "横軸:A / 縦軸:B。色が答えの大きさ（赤＝大、青＝小）。";
        const range = 10;
        for (let x = 0; x < w; x += 4) {
            for (let y = 0; y < h; y += 4) {
                const a_val = ((x / w) * range * 2) - range; const b_val = (((h - y) / h) * range * 2) - range;
                const ans = (weights[0] * a_val) + (weights[1] * b_val) + bias;
                const colorValue = Math.max(-255, Math.min(255, ans * 15));
                if (ans > 0) ctxVisual.fillStyle = `rgb(${Math.floor(colorValue)}, 30, 40)`;
                else ctxVisual.fillStyle = `rgb(30, 40, ${Math.floor(Math.abs(colorValue))})`;
                ctxVisual.fillRect(x, y, 4, 4);
            }
        }
        dataset.forEach(row => {
            const px = ((row[0] + range) / (range * 2)) * w; const py = h - (((row[1] + range) / (range * 2)) * h);
            ctxVisual.beginPath(); ctxVisual.arc(px, py, 5, 0, Math.PI*2);
            ctxVisual.fillStyle = '#fff'; ctxVisual.fill(); ctxVisual.strokeStyle = '#000'; ctxVisual.stroke();
        });
    } else {
        visualCaption.innerText = "各変数の影響度（重み）の強さ（右＝プラス、左＝マイナス）。";
        ctxVisual.fillStyle = '#131520'; ctxVisual.fillRect(0, 0, w, h);
        ctxVisual.strokeStyle = '#444'; ctxVisual.beginPath(); ctxVisual.moveTo(w/2, 0); ctxVisual.lineTo(w/2, h); ctxVisual.stroke();
        const barHeight = 25; const totalItems = count + 1; const spacing = (h - (totalItems * barHeight)) / (totalItems + 1);
        let items = [];
        for (let i = 0; i < count; i++) { items.push({ label: `変数 ${alphabet[i]}`, val: weights[i], color: '#b388ff' }); }
        items.push({ label: 'ベースズレ', val: bias, color: '#ffb300' });
        items.forEach((item, index) => {
            const y = spacing + index * (barHeight + spacing); const maxW = Math.max(2.0, ...items.map(i=>Math.abs(i.val)));
            const barWidth = (item.val / maxW) * (w / 2 - 20);
            ctxVisual.fillStyle = item.color; ctxVisual.fillRect(w/2, y, barWidth, barHeight);
            ctxVisual.fillStyle = '#fff'; ctxVisual.font = '11px sans-serif'; ctxVisual.textAlign = item.val >= 0 ? 'right' : 'left';
            ctxVisual.fillText(`${item.label} (${item.val.toFixed(2)})`, item.val >= 0 ? w/2 - 8 : w/2 + 8, y + 16);
        });
    }
}

varCountSelect.addEventListener('change', rebuildUI);
document.getElementById('startBtn').addEventListener('click', () => { if (!isTraining) { isTraining = true; trainLoop(); } });
document.getElementById('pauseBtn').addEventListener('click', () => { isTraining = false; cancelAnimationFrame(animationId); });
document.getElementById('resetBtn').addEventListener('click', () => { isTraining = false; cancelAnimationFrame(animationId); initBrain(); });

rebuildUI();