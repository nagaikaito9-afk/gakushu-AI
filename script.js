// --- AIの内部状態とパラメータ（完全に可変、四則演算の知識ゼロ） ---
let weights = []; // 各入力変数に対する重み(倍率)
let bias = 0;     // ベースとなるズレ
let epoch = 0;
let isTraining = false;
let animationId;
let lossHistory = [];

// データセット：二次元配列 [[x1, x2, ..., target], ...]
let dataset = [];
// 編集中のインデックス (-1は新規登録)
let editIndex = -1;

// 定数
const learningRate = 0.01;
const alphabet = ['A', 'B', 'C', 'D', 'E', 'F'];

// DOM要素の参照
const varCountSelect = document.getElementById('variable-count');
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

// --- 初期化とUI動的構築 ---

function getVarCount() {
    return parseInt(varCountSelect.value);
}

// フォームとテーブルヘッダーの再構築
function rebuildUI() {
    const count = getVarCount();
    
    // 1. 入力フォームの生成
    let formHTML = '';
    for (let i = 0; i < count; i++) {
        formHTML += `
            <div class="input-group">
                <label>${alphabet[i]} = </label>
                <input type="number" id="input-var-${i}" placeholder="0" required>
            </div>
        `;
    }
    formHTML += `
        <div class="input-group target-group">
            <label>答え = </label>
            <input type="number" id="input-target" placeholder="0" required>
        </div>
        <button type="button" id="submitDataBtn">データを登録</button>
    `;
    dynamicInputForm.innerHTML = formHTML;

    // ボタンのイベントリスナー再登録
    document.getElementById('submitDataBtn').addEventListener('click', handleDataSubmit);

    // 2. テーブルヘッダーの生成
    let headerHTML = '';
    for (let i = 0; i < count; i++) {
        headerHTML += `<th>変数 ${alphabet[i]}</th>`;
    }
    headerHTML += `<th>答え (Target)</th>`;
    headerHTML += `<th style="width:110px;">操作</th>`;
    tableHeader.innerHTML = headerHTML;

    // データリセットと脳の初期化
    dataset = [];
    editIndex = -1;
    renderTable();
    initBrain();
}

// 脳のパラメータの初期化（完全にランダムな状態からスタート）
function initBrain() {
    const count = getVarCount();
    weights = [];
    for (let i = 0; i < count; i++) {
        weights.push(Math.random() * 2 - 1); // -1.0 〜 1.0 のランダム
    }
    bias = Math.random() * 2 - 1;
    epoch = 0;
    lossHistory = [];
    resultPanel.classList.add('hidden');
    updateEquationUI();
    drawLossGraph();
}

// テーブルの描画
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
        for (let i = 0; i < count; i++) {
            bodyHTML += `<td>${row[i]}</td>`;
        }
        // 答えカラム (最後の要素)
        bodyHTML += `<td style="font-weight:bold; color:var(--primary-color);">${row[count]}</td>`;
        // 操作ボタン
        bodyHTML += `
            <td>
                <button class="action-btn edit-btn" onclick="editData(${rowIndex})">編集</button>
                <button class="action-btn del-btn" onclick="deleteData(${rowIndex})">削除</button>
            </td>
        `;
        bodyHTML += `</tr>`;
    });
    tableBody.innerHTML = bodyHTML;
}

// --- データ管理のアクション ---

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

    if (editIndex === -1) {
        // 新規追加
        dataset.push(rowData);
    } else {
        // 既存の編集
        dataset[editIndex] = rowData;
        editIndex = -1;
        document.getElementById('submitDataBtn').innerText = 'データを登録';
    }

    // フォームクリア
    for (let i = 0; i < count; i++) {
        document.getElementById(`input-var-${i}`).value = '';
    }
    document.getElementById('input-target').value = '';

    resultPanel.classList.add('hidden');
    renderTable();
    // データの変更に伴い全体のズレを再計算表示
    calculateCurrentLoss();
}

// グローバルスコープに関数を公開 (onclick用)
window.deleteData = function(index) {
    if (isTraining) return alert("学習中はデータを削除できません。一時停止してください。");
    dataset.splice(index, 1);
    if (editIndex === index) {
        editIndex = -1;
        document.getElementById('submitDataBtn').innerText = 'データを登録';
    } else if (editIndex > index) {
        editIndex--;
    }
    renderTable();
    resultPanel.classList.add('hidden');
    calculateCurrentLoss();
};

window.editData = function(index) {
    if (isTraining) return alert("学習中はデータを編集できません。一時停止してください。");
    const count = getVarCount();
    const rowData = dataset[index];
    
    for (let i = 0; i < count; i++) {
        document.getElementById(`input-var-${i}`).value = rowData[i];
    }
    document.getElementById('input-target').value = rowData[count];
    
    editIndex = index;
    const btn = document.getElementById('submitDataBtn');
    btn.innerText = `データ行 #${index + 1} を更新`;
    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

// 現在の全データに対するMSEの計算表示
function calculateCurrentLoss() {
    if (dataset.length === 0) {
        lossTextEl.textContent = '0.00000';
        return;
    }
    const count = getVarCount();
    let totalLoss = 0;
    dataset.forEach(row => {
        let pred = bias;
        for (let i = 0; i < count; i++) {
            pred += weights[i] * row[i];
        }
        totalLoss += Math.pow(pred - row[count], 2);
    });
    const mse = totalLoss / dataset.length;
    lossTextEl.textContent = mse.toFixed(5);
}

// --- AIモデルのUI更新 ---

function updateEquationUI() {
    const count = getVarCount();
    let html = `<span class="math-y">答え</span> = `;

    for (let i = 0; i < count; i++) {
        const w = weights[i];
        const absW = Math.abs(w);
        const isDimmed = absW < 0.02; // ほぼ0なら薄く
        const className = isDimmed ? 'dimmed' : '';

        // 符号の決定
        if (i === 0) {
            if (w < 0) html += `<span class="${className} math-sign">-</span>`;
        } else {
            html += `<span class="${className} math-sign">${w < 0 ? '-' : '+'}</span>`;
        }

        html += `<span id="w-${i}" class="${className} math-w">${absW.toFixed(2)}</span><span class="${className} math-var">${alphabet[i]}</span>`;
    }

    // バイアス部分
    const isBDimmed = Math.abs(bias) < 0.02;
    html += `<span class="${isBDimmed ? 'dimmed' : ''} math-sign">${bias < 0 ? '-' : '+'}</span>`;
    html += `<span id="b-val" class="${isBDimmed ? 'dimmed' : ''} math-b">${Math.abs(bias).toFixed(2)}</span>`;

    dynamicEquation.innerHTML = html;
    epochEl.textContent = epoch;
}

function drawLossGraph() {
    ctxLoss.clearRect(0, 0, canvasLoss.width, canvasLoss.height);
    if (lossHistory.length === 0) return;
    ctxLoss.beginPath();
    ctxLoss.strokeStyle = '#00e5ff';
    ctxLoss.lineWidth = 2;
    const maxLoss = Math.max(...lossHistory, 1);
    const stepX = canvasLoss.width / Math.max(lossHistory.length - 1, 1);
    lossHistory.forEach((loss, index) => {
        const x = index * stepX;
        const y = canvasLoss.height - (loss / maxLoss) * canvasLoss.height;
        if (index === 0) ctxLoss.moveTo(x, y); else ctxLoss.lineTo(x, y);
    });
    ctxLoss.stroke();
}

// --- 学習のメインループ ---

function trainLoop() {
    if (!isTraining) return;
    if (dataset.length === 0) {
        alert("データがありません。先にデータを登録してください。");
        isTraining = false;
        return;
    }

    const count = getVarCount();

    // 高速化のため、1フレームで50回のデータ微調整ステップを実行
    for (let step = 0; step < 50; step++) {
        // データセットからランダムに1件選択
        const sample = dataset[Math.floor(Math.random() * dataset.length)];
        
        // 予測の計算
        let pred = bias;
        for (let i = 0; i < count; i++) {
            pred += weights[i] * sample[i];
        }

        // 誤差 (予測 - 実際)
        const error = pred - sample[count];

        // 各パラメータの微調整（誤差逆伝播 / 勾配降下法）
        for (let i = 0; i < count; i++) {
            weights[i] -= learningRate * error * sample[i];
        }
        bias -= learningRate * error;
        
        epoch++;
    }

    // 全データに対する平均二乗誤差 (MSE) を計算
    let totalLoss = 0;
    dataset.forEach(row => {
        let pred = bias;
        for (let i = 0; i < count; i++) {
            pred += weights[i] * row[i];
        }
        totalLoss += Math.pow(pred - row[count], 2);
    });
    const mse = totalLoss / dataset.length;

    updateEquationUI();
    lossTextEl.textContent = mse.toFixed(5);
    
    lossHistory.push(mse);
    if (lossHistory.length > 120) lossHistory.shift();
    drawLossGraph();

    // 誤差が十分に小さくなったら自動停止
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

// --- 学習完了後の純粋な数学的レポート & 動的グラフ ---

function generateAnalysisReport() {
    resultPanel.classList.remove('hidden');
    const count = getVarCount();
    
    // 1. 解説文の生成 (四則演算の名前は一切使わない)
    let desc = "AIは与えられたデータから、以下の「倍率ルール」を特定しました。<br><br>";
    for (let i = 0; i < count; i++) {
        const w = weights[i];
        desc += `・変数 <strong>${alphabet[i]}</strong> の数値が1増えるごとに、答えは <strong>${w > 0 ? 'プラス' : 'マイナス'}へ約 ${Math.abs(w).toFixed(2)}</strong> 変化します。<br>`;
    }
    desc += `・全ての変数が 0 のとき、ベースとなる初期値（答え）は <strong>${bias.toFixed(2)}</strong> になります。`;
    ruleDesc.innerHTML = desc;

    let reason = "<strong>【AIがこの結論に至った理由】</strong><br>";
    reason += "AIは「足し算」や「引き算」といった人間の言葉や演算概念を最初から全く持っていません。ただ、あなたが提示した例題群において、各変数に上記の『重み（倍率）』を掛け合わせて足し合わせたときに、すべてのつじつまが完全に合う（誤差が実質ゼロになる）唯一のルートを数学的な傾き（勾配）のみを頼りに自力で見つけ出しました。";
    ruleReason.innerHTML = reason;

    // 2. 変数の数に応じた動的な視覚化グラフの描画
    drawDynamicVisualization();
}

function drawDynamicVisualization() {
    const count = getVarCount();
    const w = canvasVisual.width;
    const h = canvasVisual.height;
    ctxVisual.clearRect(0, 0, w, h);

    if (count === 1) {
        // 変数1つの場合: 2D散布図 + 回帰直線
        visualCaption.innerText = "※ 横軸が変数A、縦軸が答え。白丸がデータ、水色の線がAIが導き出した直線モデルです。";
        
        ctxVisual.strokeStyle = '#444';
        ctxVisual.beginPath();
        ctxVisual.moveTo(0, h/2); ctxVisual.lineTo(w, h/2);
        ctxVisual.moveTo(w/2, 0); ctxVisual.lineTo(w/2, h);
        ctxVisual.stroke();

        const scaleX = x => (x + 10) / 20 * w;
        const scaleY = y => h - ((y + 10) / 20 * h);

        ctxVisual.strokeStyle = 'rgba(0, 229, 255, 0.8)';
        ctxVisual.lineWidth = 2;
        ctxVisual.beginPath();
        for (let xVal = -10; xVal <= 10; xVal += 1) {
            let yVal = weights[0] * xVal + bias;
            if (xVal === -10) ctxVisual.moveTo(scaleX(xVal), scaleY(yVal));
            else ctxVisual.lineTo(scaleX(xVal), scaleY(yVal));
        }
        ctxVisual.stroke();

        dataset.forEach(row => {
            ctxVisual.beginPath();
            ctxVisual.arc(scaleX(row[0]), scaleY(row[1]), 5, 0, Math.PI*2);
            ctxVisual.fillStyle = '#fff';
            ctxVisual.fill();
            ctxVisual.strokeStyle = '#000';
            ctxVisual.stroke();
        });

    } else if (count === 2) {
        // 変数2つの場合: 2D空間のヒートマップ
        visualCaption.innerText = "※ 横軸がA、縦軸がB。色が答えの数値の大きさを表します（赤＝プラスに大、青＝マイナスに大）。白丸がデータです。";
        const range = 10;
        
        for (let x = 0; x < w; x += 4) {
            for (let y = 0; y < h; y += 4) {
                const a_val = ((x / w) * range * 2) - range;
                const b_val = (((h - y) / h) * range * 2) - range;
                
                const ans = (weights[0] * a_val) + (weights[1] * b_val) + bias;
                const colorValue = Math.max(-255, Math.min(255, ans * 15));
                
                if (ans > 0) {
                    ctxVisual.fillStyle = `rgb(${Math.floor(colorValue)}, 30, 40)`;
                } else {
                    ctxVisual.fillStyle = `rgb(30, 40, ${Math.floor(Math.abs(colorValue))})`;
                }
                ctxVisual.fillRect(x, y, 4, 4);
            }
        }

        dataset.forEach(row => {
            const px = ((row[0] + range) / (range * 2)) * w;
            const py = h - (((row[1] + range) / (range * 2)) * h);
            ctxVisual.beginPath();
            ctxVisual.arc(px, py, 5, 0, Math.PI*2);
            ctxVisual.fillStyle = '#fff';
            ctxVisual.fill();
            ctxVisual.strokeStyle = '#000';
            ctxVisual.stroke();
        });

    } else {
        // 変数3つ以上の場合: 各パラメータの影響度（重み）の棒グラフ表示
        visualCaption.innerText = "※ 各変数の影響度（重み）の強さを表すグラフです。右に伸びるほどプラスの影響、左に伸びるほどマイなすの影響が大きいです。";
        
        ctxVisual.fillStyle = '#131520';
        ctxVisual.fillRect(0, 0, w, h);
        
        ctxVisual.strokeStyle = '#444';
        ctxVisual.beginPath();
        ctxVisual.moveTo(w/2, 0); ctxVisual.lineTo(w/2, h);
        ctxVisual.stroke();

        const barHeight = 25;
        const totalItems = count + 1;
        const spacing = (h - (totalItems * barHeight)) / (totalItems + 1);

        let items = [];
        for (let i = 0; i < count; i++) {
            items.push({ label: `変数 ${alphabet[i]}`, val: weights[i], color: '#b388ff' });
        }
        items.push({ label: 'ベースズレ', val: bias, color: '#ffb300' });

        items.forEach((item, index) => {
            const y = spacing + index * (barHeight + spacing);
            const maxW = 2.0;
            const barWidth = (item.val / maxW) * (w / 2 - 20);
            
            ctxVisual.fillStyle = item.color;
            ctxVisual.fillRect(w/2, y, barWidth, barHeight);

            ctxVisual.fillStyle = '#fff';
            ctxVisual.font = '11px sans-serif';
            ctxVisual.textAlign = item.val >= 0 ? 'right' : 'left';
            const textX = item.val >= 0 ? w/2 - 8 : w/2 + 8;
            ctxVisual.fillText(`${item.label} (${item.val.toFixed(2)})`, textX, y + 16);
        });
    }
}

// --- イベントリスナー登録 ---

varCountSelect.addEventListener('change', rebuildUI);

document.getElementById('startBtn').addEventListener('click', () => {
    if (!isTraining) { isTraining = true; trainLoop(); }
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    isTraining = false; cancelAnimationFrame(animationId);
});

document.getElementById('resetBtn').addEventListener('click', () => {
    isTraining = false; cancelAnimationFrame(animationId); initBrain();
});

// 起動時に構築
rebuildUI();