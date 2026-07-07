let w1, w2, b;
let epoch = 0;
let isTraining = false;
let animationId;
let lossHistory = [];
let dataset = [];

const inputA = document.getElementById('input-a');
const inputB = document.getElementById('input-b');
const inputAns = document.getElementById('input-ans');
const datasetList = document.getElementById('dataset-list');

// 数式表示用要素
const eqW1 = document.getElementById('eq-w1');
const eqW2 = document.getElementById('eq-w2');
const eqB = document.getElementById('eq-b');
const eqSignW2 = document.getElementById('eq-sign-w2');
const eqSignB = document.getElementById('eq-sign-b');

const epochEl = document.getElementById('epoch-count');
const lossTextEl = document.getElementById('loss-text');
const canvasLoss = document.getElementById('lossChart');
const ctxLoss = canvasLoss.getContext('2d');

const resultPanel = document.getElementById('result-panel');
const ruleDesc = document.getElementById('rule-description');
const ruleReason = document.getElementById('rule-reason');
const canvasRule = document.getElementById('rule-canvas');
const ctxRule = canvasRule.getContext('2d');

const learningRate = 0.01;

// データ追加
document.getElementById('addDataBtn').addEventListener('click', () => {
    const a = parseFloat(inputA.value);
    const b_val = parseFloat(inputB.value);
    const ans = parseFloat(inputAns.value);
    if (isNaN(a) || isNaN(b_val) || isNaN(ans)) return alert("数字を入力してください。");
    
    dataset.push({ a, b: b_val, ans });
    const li = document.createElement('li');
    li.innerText = `A=${a}, B=${b_val} ➡️ 答え=${ans}`;
    datasetList.appendChild(li);
    inputA.value = ''; inputB.value = ''; inputAns.value = '';
    resultPanel.classList.add('hidden');
});

function initBrain() {
    w1 = Math.random() * 2 - 1;
    w2 = Math.random() * 2 - 1;
    b = Math.random() * 2 - 1;
    epoch = 0;
    lossHistory = [];
    resultPanel.classList.add('hidden');
    updateEquationUI();
    drawLossGraph();
}

// 直感的な数式へのフォーマット
function updateEquationUI() {
    // 係数がほぼ0の場合は薄く表示する（0.05未満）
    eqW1.className = Math.abs(w1) < 0.05 ? 'dimmed' : '';
    eqW2.className = Math.abs(w2) < 0.05 ? 'dimmed' : '';
    eqB.className = Math.abs(b) < 0.05 ? 'dimmed' : '';

    eqW1.innerText = Math.abs(w1).toFixed(2);
    eqW2.innerText = Math.abs(w2).toFixed(2);
    eqB.innerText = Math.abs(b).toFixed(2);

    // マイナスの場合は「+ -」ではなく「-」と表示
    eqSignW2.innerText = w2 < 0 ? '-' : '+';
    eqSignB.innerText = b < 0 ? '-' : '+';
    
    epochEl.textContent = epoch;
}

function drawLossGraph() {
    ctxLoss.clearRect(0, 0, canvasLoss.width, canvasLoss.height);
    if (lossHistory.length === 0) return;
    ctxLoss.beginPath();
    ctxLoss.strokeStyle = '#bb86fc';
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

// 法則の解釈と解説
function analyzeAndVisualizeRule() {
    resultPanel.classList.remove('hidden');

    // 四捨五入して、どんな法則かを判定
    const rw1 = Math.round(w1 * 10) / 10;
    const rw2 = Math.round(w2 * 10) / 10;
    const rb = Math.round(b * 10) / 10;

    let desc = "";
    if (rw1 === 1 && rw2 === 1 && rb === 0) desc = "【足し算】ですね！ AとBをそのまま足し合わせています。";
    else if (rw1 === 1 && rw2 === -1 && rb === 0) desc = "【引き算】ですね！ AからBを引いています。";
    else if (rw1 === 0.5 && rw2 === 0.5 && rb === 0) desc = "【平均値】ですね！ AとBを足して2で割っています。";
    else if (rw1 > 0 && rw2 === 0) desc = `【Aのみに依存】 Bは関係なく、Aを約 ${rw1} 倍する法則です。`;
    else if (rw1 === 0 && rw2 > 0) desc = `【Bのみに依存】 Aは関係なく、Bを約 ${rw2} 倍する法則です。`;
    else if (rw1 === 0 && rw2 === 0) desc = `【定数】 AやBに関係なく、常に答えは ${rb} になる法則です。`;
    else desc = `【複合ルール】 Aを約 ${rw1} 倍し、Bを約 ${rw2} 倍して足し合わせる法則です。`;

    ruleDesc.innerText = desc;
    ruleReason.innerText = `あなたが入力したデータすべてに対して、「答え = A×${w1.toFixed(2)} + B×${w2.toFixed(2)} + ${b.toFixed(2)}」という計算を当てはめると、すべてのデータで誤差がほぼゼロ（完璧に一致）になるため、AIはこの数式を「隠された法則」だと断定しました。`;

    drawHeatmap();
}

// 法則を空間図（ヒートマップ）として描画
function drawHeatmap() {
    const width = canvasRule.width;
    const height = canvasRule.height;
    // AとBの表示範囲 (-10 から 10)
    const range = 10; 
    
    // 背景のヒートマップを描画
    for (let x = 0; x < width; x += 5) {
        for (let y = 0; y < height; y += 5) {
            // ピクセル座標を AとBの値に変換
            const a_val = ((x / width) * range * 2) - range;
            const b_val = (((height - y) / height) * range * 2) - range; // Y軸は下がプラスになるよう反転
            
            // 現在の数式で答えを計算
            const ans = (w1 * a_val) + (w2 * b_val) + b;
            
            // 答えの大きさに応じて色を変える（赤＝大、青＝小）
            const colorValue = Math.max(-255, Math.min(255, ans * 10)); // 適当にスケーリング
            if (ans > 0) {
                ctxRule.fillStyle = `rgb(${colorValue}, 50, 50)`;
            } else {
                ctxRule.fillStyle = `rgb(50, 50, ${Math.abs(colorValue)})`;
            }
            ctxRule.fillRect(x, y, 5, 5);
        }
    }

    // ユーザーが入力したデータ（白丸）をグラフ上にプロット
    dataset.forEach(d => {
        // A, Bの値をピクセル座標に戻す
        const px = ((d.a + range) / (range * 2)) * width;
        const py = height - (((d.b + range) / (range * 2)) * height);
        
        ctxRule.beginPath();
        ctxRule.arc(px, py, 4, 0, Math.PI * 2);
        ctxRule.fillStyle = '#ffffff';
        ctxRule.fill();
        ctxRule.strokeStyle = '#000000';
        ctxRule.stroke();
    });
}

function trainLoop() {
    if (!isTraining) return;
    if (dataset.length === 0) { alert("データを入力してください。"); isTraining = false; return; }

    for (let i = 0; i < 50; i++) {
        const sample = dataset[Math.floor(Math.random() * dataset.length)];
        const pred = (w1 * sample.a) + (w2 * sample.b) + b;
        const error = pred - sample.ans;
        w1 -= learningRate * error * sample.a;
        w2 -= learningRate * error * sample.b;
        b -= learningRate * error;
        epoch++;
    }

    let totalLoss = 0;
    dataset.forEach(d => { totalLoss += Math.pow(((w1 * d.a) + (w2 * d.b) + b) - d.ans, 2); });
    const mse = totalLoss / dataset.length;

    updateEquationUI();
    lossTextEl.textContent = mse.toFixed(5);
    
    lossHistory.push(mse);
    if (lossHistory.length > 100) lossHistory.shift();
    drawLossGraph();

    // ズレがほぼ無くなったら自動ストップして解説を表示
    if (mse < 0.00001) {
        isTraining = false;
        lossTextEl.textContent = "0.0000 (法則を発見！)";
        lossTextEl.style.color = "#00ffcc";
        analyzeAndVisualizeRule(); // 解説と図解を実行！
        return;
    } else {
        lossTextEl.style.color = "#e0e0e0";
    }
    animationId = requestAnimationFrame(trainLoop);
}

document.getElementById('startBtn').addEventListener('click', () => { if (!isTraining) { isTraining = true; trainLoop(); }});
document.getElementById('pauseBtn').addEventListener('click', () => { isTraining = false; cancelAnimationFrame(animationId); });
document.getElementById('resetBtn').addEventListener('click', () => { isTraining = false; cancelAnimationFrame(animationId); initBrain(); });

initBrain();