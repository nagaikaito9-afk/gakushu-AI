// --- AIの初期パラメータと状態 ---
let w1, w2, b;
let epoch = 0;
let isTraining = false;
let animationId;
let lossHistory = [];
let dataset = []; // ユーザーが入力したデータを保存する配列

// --- DOM要素 ---
const inputA = document.getElementById('input-a');
const inputB = document.getElementById('input-b');
const inputAns = document.getElementById('input-ans');
const datasetList = document.getElementById('dataset-list');

const w1El = document.getElementById('w1-val');
const w2El = document.getElementById('w2-val');
const bEl = document.getElementById('b-val');
const epochEl = document.getElementById('epoch-count');
const lossTextEl = document.getElementById('loss-text');
const canvas = document.getElementById('lossChart');
const ctx = canvas.getContext('2d');

const learningRate = 0.01;

// --- データの追加処理 ---
document.getElementById('addDataBtn').addEventListener('click', () => {
    const a = parseFloat(inputA.value);
    const b_val = parseFloat(inputB.value);
    const ans = parseFloat(inputAns.value);

    // 入力チェック
    if (isNaN(a) || isNaN(b_val) || isNaN(ans)) {
        alert("A、B、答えのすべてに数字を入力してください。");
        return;
    }

    // データセットに保存
    dataset.push({ a: a, b: b_val, ans: ans });

    // 画面のリストに追加
    const li = document.createElement('li');
    li.innerText = `A = ${a}, B = ${b_val} ➡️ 答え = ${ans}`;
    datasetList.appendChild(li);

    // 入力欄をクリア
    inputA.value = '';
    inputB.value = '';
    inputAns.value = '';
});

// --- パラメータの初期化 ---
function initBrain() {
    w1 = Math.random() * 2 - 1;
    w2 = Math.random() * 2 - 1;
    b = Math.random() * 2 - 1;
    epoch = 0;
    lossHistory = [];
    updateUI(0);
    drawGraph();
}

// --- UIの更新 ---
function updateUI(loss) {
    w1El.textContent = w1.toFixed(2);
    w2El.textContent = w2.toFixed(2);
    bEl.textContent = b.toFixed(2);
    epochEl.textContent = epoch;
    lossTextEl.textContent = loss.toFixed(5);
}

// --- グラフの描画 ---
function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (lossHistory.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = '#bb86fc';
    ctx.lineWidth = 2;

    const maxLoss = Math.max(...lossHistory, 1);
    const stepX = canvas.width / Math.max(lossHistory.length - 1, 1);

    lossHistory.forEach((loss, index) => {
        const x = index * stepX;
        const y = canvas.height - (loss / maxLoss) * canvas.height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

// --- AIの推理サイクル（データからの学習） ---
function trainLoop() {
    if (!isTraining) return;

    if (dataset.length === 0) {
        alert("学習させるデータがありません。先にデータを入力してください。");
        isTraining = false;
        return;
    }

    // 1フレームあたり50回の学習を回す（高速化のため）
    for (let i = 0; i < 50; i++) {
        // AIが持つすべてのデータからランダムに1つ選んで学習する（確率的勾配降下法）
        const sample = dataset[Math.floor(Math.random() * dataset.length)];
        
        // 現在の脳内数式で予測を立てる
        const pred = (w1 * sample.a) + (w2 * sample.b) + b;
        
        // 実際の答えとのズレ（誤差）を計算
        const error = pred - sample.ans;
        
        // 誤差を元に脳内の数式（重みとバイアス）を修正
        w1 -= learningRate * error * sample.a;
        w2 -= learningRate * error * sample.b;
        b -= learningRate * error;
        
        epoch++;
    }

    // 全てのデータに対して、現在の数式がどれくらいズレているか（平均二乗誤差）を計算
    let totalLoss = 0;
    dataset.forEach(d => {
        const p = (w1 * d.a) + (w2 * d.b) + b;
        totalLoss += Math.pow(p - d.ans, 2);
    });
    const mse = totalLoss / dataset.length;

    updateUI(mse);
    
    // グラフ用に保存
    lossHistory.push(mse);
    if (lossHistory.length > 100) lossHistory.shift(); // 古い履歴を消す
    drawGraph();

    // ズレがほぼ無くなったら（法則を完全に見つけたら）自動でストップ
    if (mse < 0.00001) {
        isTraining = false;
        lossTextEl.textContent = "0.0000 (法則を発見しました！)";
        lossTextEl.style.color = "#00ffcc";
        return;
    } else {
        lossTextEl.style.color = "#e0e0e0";
    }

    animationId = requestAnimationFrame(trainLoop);
}

// --- ボタンの操作 ---
document.getElementById('startBtn').addEventListener('click', () => {
    if (!isTraining) {
        isTraining = true;
        trainLoop();
    }
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    isTraining = false;
    cancelAnimationFrame(animationId);
});

document.getElementById('resetBtn').addEventListener('click', () => {
    isTraining = false;
    cancelAnimationFrame(animationId);
    initBrain();
});

// 起動時の初期化
initBrain();