// --- AIの初期パラメータ ---
let w1, w2, b;
let epoch = 0;
let isTraining = false;
let animationId;
let lossHistory = []; // グラフ描画用

// DOM要素
const w1El = document.getElementById('w1-val');
const w2El = document.getElementById('w2-val');
const bEl = document.getElementById('b-val');
const epochEl = document.getElementById('epoch-count');
const lossTextEl = document.getElementById('loss-text');
const logContainer = document.getElementById('log-container');
const canvas = document.getElementById('lossChart');
const ctx = canvas.getContext('2d');

const opSelect = document.getElementById('operation-select');
const speedSlider = document.getElementById('speed-slider');
const lrSlider = document.getElementById('lr-slider');
const speedVal = document.getElementById('speed-val');
const lrVal = document.getElementById('lr-val');

// パラメータの初期化関数
function initBrain() {
    w1 = Math.random() * 2 - 1;
    w2 = Math.random() * 2 - 1;
    b = Math.random() * 2 - 1;
    epoch = 0;
    lossHistory = [];
    logContainer.innerHTML = '';
    updateUI(0, 0, 0, 0, 0);
    drawGraph();
}

// ユーザーが選択した「学習内容」の正解を計算する
function getTarget(a, b_val, operation) {
    switch (operation) {
        case 'add': return a + b_val;          // 足し算 (理想: w1=1.0, w2=1.0, b=0)
        case 'sub': return a - b_val;          // 引き算 (理想: w1=1.0, w2=-1.0, b=0)
        case 'avg': return (a + b_val) / 2;    // 平均値 (理想: w1=0.5, w2=0.5, b=0)
        default: return a + b_val;
    }
}

// UIの更新
function updateUI(loss, a, b_val, target, pred) {
    w1El.textContent = w1.toFixed(3);
    w2El.textContent = w2.toFixed(3);
    bEl.textContent = b.toFixed(3);
    epochEl.textContent = epoch;
    lossTextEl.textContent = loss.toFixed(4);

    // ログの追加（スピードに合わせて間引く）
    const speed = parseInt(speedSlider.value);
    const logInterval = speed < 10 ? 1 : Math.floor(speed / 2);
    
    if (epoch % logInterval === 0 || epoch < 20) {
        const log = document.createElement('div');
        log.className = 'log-entry ' + (Math.abs(target - pred) < 0.5 ? 'good' : 'bad');
        
        let opSymbol = opSelect.value === 'add' ? '+' : opSelect.value === 'sub' ? '-' : 'の平均';
        let message = `[${epoch}回] 問題: A=${a}, B=${b_val} (${opSymbol})\n`;
        message += `👉 AI回答: ${(pred).toFixed(2)} (正解: ${target})\n`;
        message += `   誤差: ${(Math.abs(target - pred)).toFixed(2)} → 学習中...`;
        
        log.innerText = message;
        logContainer.insertBefore(log, logContainer.firstChild);

        if (logContainer.children.length > 30) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }
}

// 誤差グラフの描画
function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (lossHistory.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;

    const maxLoss = Math.max(...lossHistory, 1); // グラフの高さスケール
    const stepX = canvas.width / Math.max(lossHistory.length - 1, 1);

    lossHistory.forEach((loss, index) => {
        const x = index * stepX;
        // 誤差をキャンバスの高さに合わせて描画（上が誤差大、下がゼロ）
        const y = canvas.height - (loss / maxLoss) * canvas.height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

// AIの学習サイクル
function trainLoop() {
    if (!isTraining) return;

    const operation = opSelect.value;
    const learningRate = parseFloat(lrSlider.value);
    const stepsPerFrame = parseInt(speedSlider.value); // スライダーの値で1フレームあたりの学習回数を変える

    let currentLoss = 0;

    for (let i = 0; i < stepsPerFrame; i++) {
        // 1. ランダムな問題を生成 (-10 ～ 10)
        const a = Math.floor(Math.random() * 21) - 10;
        const b_val = Math.floor(Math.random() * 21) - 10;
        const target = getTarget(a, b_val, operation);

        // 2. 予測と誤差計算
        const pred = (w1 * a) + (w2 * b_val) + b;
        const error = pred - target;
        currentLoss = error * error;

        // 3. 脳内アップデート（勾配降下法）
        w1 -= learningRate * error * a;
        w2 -= learningRate * error * b_val;
        b -= learningRate * error;

        epoch++;
        
        // 最後のステップだけ画面に反映
        if (i === stepsPerFrame - 1) {
            updateUI(currentLoss, a, b_val, target, pred);
            
            // グラフ用のデータを保存（最大100件）
            lossHistory.push(currentLoss);
            if (lossHistory.length > 100) lossHistory.shift();
            drawGraph();
        }
    }

    animationId = requestAnimationFrame(trainLoop);
}

// --- イベントリスナー ---
document.getElementById('startBtn').addEventListener('click', () => {
    if (!isTraining) { isTraining = true; trainLoop(); }
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    isTraining = false; cancelAnimationFrame(animationId);
});

document.getElementById('resetBtn').addEventListener('click', () => {
    isTraining = false; cancelAnimationFrame(animationId); initBrain();
});

// スライダーの表示更新
speedSlider.addEventListener('input', (e) => speedVal.textContent = e.target.value);
lrSlider.addEventListener('input', (e) => lrVal.textContent = parseFloat(e.target.value).toFixed(3));

// 学習内容を変えたらリセットする
opSelect.addEventListener('change', () => {
    isTraining = false; cancelAnimationFrame(animationId); initBrain();
});

// 初期化
initBrain();