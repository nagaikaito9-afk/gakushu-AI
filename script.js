// --- グローバル変数 ---
let mode = 'standard'; // 'standard' or 'complex'
let weights = [];
let bias = 0;
let epoch = 0;
let isTraining = false;
let animationId;

let dataset = [];
let savedCluesData = [];
let savedRulesData = [];
let currentTestRule = null; // 検証中のルール

// 複雑モード用のマッピング（記号と演算の推測）
let symbolMap = {}; 
const possibleOps = ['+', '-', '*', '/'];

const learningRate = 0.001; 
const alphabet = ['A', 'B', 'C', 'D'];

// UI要素の取得
const modeSelect = document.getElementById('mode-select');
const varCountContainer = document.getElementById('var-count-container');
const varCountSelect = document.getElementById('variable-count');
const speedSlider = document.getElementById('speed-slider');
const dynamicInputForm = document.getElementById('dynamic-input-form');
const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');
const epochEl = document.getElementById('epoch-count');
const lossTextEl = document.getElementById('loss-text');
const dynamicEquation = document.getElementById('dynamic-equation');
const resultPanel = document.getElementById('result-panel');
const ruleDesc = document.getElementById('rule-description');
const testRoom = document.getElementById('test-room');
const chatLog = document.getElementById('test-chat-log');
const rulesList = document.getElementById('saved-rules-list');

// --- モード切替とUI構築 ---
modeSelect.addEventListener('change', (e) => {
    mode = e.target.value;
    varCountContainer.style.display = mode === 'complex' ? 'none' : 'flex';
    rebuildUI();
});
varCountSelect.addEventListener('change', rebuildUI);
document.getElementById('speed-slider').addEventListener('input', (e) => { document.getElementById('speed-val').innerText = e.target.value; });

function rebuildUI() {
    isTraining = false; cancelAnimationFrame(animationId);
    dataset = [];
    
    let formHTML = '';
    let headerHTML = '';

    if (mode === 'standard') {
        const count = parseInt(varCountSelect.value);
        for (let i = 0; i < count; i++) {
            formHTML += `<div class="input-group"><label>${alphabet[i]} = </label><input type="number" id="in-${i}" required></div>`;
            headerHTML += `<th>手がかり ${alphabet[i]}</th>`;
        }
    } else {
        // 複雑モード（文字列入力）
        formHTML += `<div class="input-group"><label>文字列 = </label><input type="text" id="in-str" placeholder="例: 1+3121+18" style="width:150px;" required></div>`;
        headerHTML += `<th>文字列 (式)</th>`;
    }
    
    formHTML += `<div class="input-group target-group"><label>答え = </label><input type="number" id="in-ans" required></div><button type="button" id="submitDataBtn">登録する！</button>`;
    headerHTML += `<th>正解（答え）</th><th style="width:60px;">操作</th>`;
    
    dynamicInputForm.innerHTML = formHTML;
    tableHeader.innerHTML = headerHTML;
    document.getElementById('submitDataBtn').addEventListener('click', handleDataSubmit);

    renderTable();
    initBrain();
}

function initBrain() {
    weights = [];
    bias = Math.random() * 2 - 1;
    symbolMap = {}; // 複雑モード用
    epoch = 0;
    
    if (mode === 'standard') {
        const count = parseInt(varCountSelect.value);
        for (let i = 0; i < count; i++) weights.push(Math.random() * 2 - 1);
    }
    resultPanel.classList.add('hidden');
    updateEquationUI();
}

// --- データ管理 ---
function handleDataSubmit() {
    let rowData = [];
    if (mode === 'standard') {
        const count = parseInt(varCountSelect.value);
        for (let i = 0; i < count; i++) {
            const val = parseFloat(document.getElementById(`in-${i}`).value);
            if(isNaN(val)) return alert("数値を入力してね！");
            rowData.push(val);
        }
    } else {
        const str = document.getElementById('in-str').value.trim();
        if(!str) return alert("文字列を入力してね！");
        rowData.push(str);
        
        // 文字列から未知の記号を抽出して初期化
        const symbols = str.replace(/[0-9\s]/g, '').split('');
        symbols.forEach(s => { if(!symbolMap[s]) symbolMap[s] = possibleOps[Math.floor(Math.random()*possibleOps.length)]; });
    }
    
    const ans = parseFloat(document.getElementById('in-ans').value);
    if(isNaN(ans)) return alert("答えを入力してね！");
    rowData.push(ans);
    dataset.push(rowData);
    
    // 入力欄クリア
    if(mode==='standard') { for (let i = 0; i < parseInt(varCountSelect.value); i++) document.getElementById(`in-${i}`).value = ''; }
    else { document.getElementById('in-str').value = ''; }
    document.getElementById('in-ans').value = '';
    
    renderTable();
}

window.deleteData = function(index) { dataset.splice(index, 1); renderTable(); };

function renderTable() {
    let html = '';
    dataset.forEach((row, i) => {
        html += `<tr>`;
        for (let j = 0; j < row.length - 1; j++) html += `<td>${row[j]}</td>`;
        html += `<td style="color:var(--primary-color); font-weight:bold;">${row[row.length-1]}</td>`;
        html += `<td><button class="action-btn del-btn" onclick="deleteData(${i})">✖</button></td></tr>`;
    });
    tableBody.innerHTML = html;
}

// 💾 手がかりの保存と復元
document.getElementById('saveCluesBtn').addEventListener('click', () => {
    if(dataset.length === 0) return alert("保存するデータがありません！");
    savedCluesData = JSON.parse(JSON.stringify(dataset));
    alert("手がかりを保存しました！");
});
document.getElementById('loadCluesBtn').addEventListener('click', () => {
    if(savedCluesData.length === 0) return alert("保存された手がかりがありません！");
    dataset = JSON.parse(JSON.stringify(savedCluesData));
    renderTable();
    alert("手がかりを復元しました！");
});


// --- 学習ループ ---
function trainLoop() {
    if (!isTraining) return;
    if (dataset.length === 0) { isTraining = false; return alert("データがありません！"); }

    const speed = parseInt(speedSlider.value);
    
    if (mode === 'standard') {
        const count = parseInt(varCountSelect.value);
        for (let step = 0; step < speed; step++) {
            const sample = dataset[Math.floor(Math.random() * dataset.length)];
            let pred = bias;
            for (let i = 0; i < count; i++) pred += weights[i] * sample[i];
            const error = pred - sample[count];
            const clip = Math.max(-10, Math.min(10, error));
            for (let i = 0; i < count; i++) weights[i] -= Math.max(-0.5, Math.min(0.5, learningRate * clip * sample[i]));
            bias -= Math.max(-0.5, Math.min(0.5, learningRate * clip));
            epoch++;
        }
        
        let mse = 0;
        dataset.forEach(r => { let p=bias; for(let i=0;i<count;i++) p+=weights[i]*r[i]; mse += Math.pow(p - r[count], 2); });
        mse /= dataset.length;
        lossTextEl.textContent = mse.toFixed(5);
        updateEquationUI();

        if (mse < 0.0001) { finishTraining(); return; }

    } else {
        // 複雑モード: 文字列の記号の意味をランダムにテストする（総当たり推論）
        epoch++;
        // ランダムに1つの記号の割り当てを変更してみる
        const symbols = Object.keys(symbolMap);
        if(symbols.length > 0) {
            const targetSym = symbols[Math.floor(Math.random() * symbols.length)];
            symbolMap[targetSym] = possibleOps[Math.floor(Math.random() * possibleOps.length)];
        }

        // 全データでテスト
        let allCorrect = true;
        let totalError = 0;
        dataset.forEach(row => {
            const str = row[0];
            const target = row[1];
            // 記号をJSの演算子に置き換えて評価 (簡易eval)
            let parsedStr = str;
            symbols.forEach(sym => { parsedStr = parsedStr.split(sym).join(symbolMap[sym]); });
            
            try {
                const result = eval(parsedStr); // ※ブラウザシミュレーター上の簡易実装
                totalError += Math.abs(result - target);
                if(result !== target) allCorrect = false;
            } catch(e) { allCorrect = false; totalError+=999; }
        });
        
        lossTextEl.textContent = allCorrect ? "0.00000" : totalError.toFixed(2);
        updateEquationUI();

        if (allCorrect) { finishTraining(); return; }
    }

    animationId = requestAnimationFrame(trainLoop);
}

function updateEquationUI() {
    let html = '';
    if (mode === 'standard') {
        weights.forEach((w, i) => {
            html += `<div class="term-badge"><span class="math-var">${alphabet[i]}</span> × ${w.toFixed(2)}</div> ＋ `;
        });
        html += `<div class="term-badge">基本点 ${bias.toFixed(2)}</div> ＝ 答え`;
    } else {
        html = `<div>解読中... `;
        Object.keys(symbolMap).forEach(sym => {
            html += `<span class="term-badge">「${sym}」は ${symbolMap[sym]} かな？</span>`;
        });
        html += `</div>`;
    }
    dynamicEquation.innerHTML = html;
    epochEl.textContent = epoch;
}

function finishTraining() {
    isTraining = false;
    lossTextEl.style.color = "#00e5ff";
    resultPanel.classList.remove('hidden');
    
    let desc = "";
    if (mode === 'standard') {
        weights.forEach((w, i) => { desc += `<div class="rule-item">手がかり ${alphabet[i]} が 1 増えると答えは約 ${Math.abs(w).toFixed(2)} ${w>=0?'増える':'減る'}</div>`; });
        desc += `<div class="rule-item">全部0の時は 約 ${bias.toFixed(2)} からスタート</div>`;
    } else {
        Object.keys(symbolMap).forEach(sym => {
            let opStr = "";
            if(symbolMap[sym]==='+') opStr = "足し算する（前の数字と次の数字を足す）";
            if(symbolMap[sym]==='-') opStr = "引き算する";
            if(symbolMap[sym]==='*') opStr = "掛け算する";
            if(symbolMap[sym]==='/') opStr = "割り算する";
            desc += `<div class="rule-item">💡 AIは記号「<strong>${sym}</strong>」が <strong>${opStr}</strong> という法則を完全に見破りました！</div>`;
        });
    }
    ruleDesc.innerHTML = desc;
}

// 💾 ルールの保存と検証ルーム
document.getElementById('saveRuleBtn').addEventListener('click', () => {
    const ruleObj = {
        id: Date.now(),
        mode: mode,
        weights: [...weights],
        bias: bias,
        symbolMap: {...symbolMap},
        name: `ルール ${savedRulesData.length + 1} (${mode === 'standard' ? '通常' : '複雑'})`
    };
    savedRulesData.push(ruleObj);
    updateSavedRulesList();
    alert("ルールを保存しました！検証ルームに追加されました。");
});

function updateSavedRulesList() {
    if(savedRulesData.length === 0) return;
    let html = '';
    savedRulesData.forEach(r => {
        html += `<div class="rule-card" onclick="openTestRoom(${r.id})">${r.name}</div>`;
    });
    rulesList.innerHTML = html;
}

window.openTestRoom = function(id) {
    currentTestRule = savedRulesData.find(r => r.id === id);
    testRoom.classList.remove('hidden');
    document.getElementById('test-room-info').innerText = `現在テスト中: ${currentTestRule.name}`;
    chatLog.innerHTML = `<div class="chat-msg chat-ai">AI: 「${currentTestRule.name}」の法則に基づきスタンバイOKです！出題してみてね。</div>`;
    
    if(currentTestRule.mode === 'standard') {
        document.getElementById('chat-input-q').placeholder = "例: 2, 3 (AとBの数値をカンマ区切りで)";
    } else {
        document.getElementById('chat-input-q').placeholder = "例: 5+10 (数式文字列を入力)";
    }
};

// 🤖 AIチャット検証機能（矛盾の指摘）
document.getElementById('chatSendBtn').addEventListener('click', () => {
    if(!currentTestRule) return;
    const q = document.getElementById('chat-input-q').value.trim();
    const a = parseFloat(document.getElementById('chat-input-a').value);
    
    if(!q || isNaN(a)) return alert("問題と予想する答えを両方入力してね！");
    
    // ユーザーの発言を表示
    chatLog.innerHTML += `<div class="chat-msg chat-user">私: 問題「${q}」なら、答えは「${a}」だよね？</div>`;
    
    // AIの計算
    let aiAnswer = 0;
    
    if(currentTestRule.mode === 'standard') {
        const inputs = q.split(',').map(n => parseFloat(n.trim()));
        aiAnswer = currentTestRule.bias;
        for(let i=0; i<currentTestRule.weights.length; i++) {
            if(inputs[i] !== undefined && !isNaN(inputs[i])) aiAnswer += currentTestRule.weights[i] * inputs[i];
        }
    } else {
        let parsedStr = q;
        Object.keys(currentTestRule.symbolMap).forEach(sym => {
            parsedStr = parsedStr.split(sym).join(currentTestRule.symbolMap[sym]);
        });
        try { aiAnswer = eval(parsedStr); } catch(e) { aiAnswer = NaN; }
    }
    
    setTimeout(() => {
        if(isNaN(aiAnswer)) {
            chatLog.innerHTML += `<div class="chat-msg chat-ai error">AI: うーん、その入力だと私が覚えたルールでは計算できないみたいです…。</div>`;
        } else if (Math.abs(aiAnswer - a) < 0.1) {
            chatLog.innerHTML += `<div class="chat-msg chat-ai">AI: 大正解！私のルール通り、ぴったり「${aiAnswer.toFixed(2)}」になります！</div>`;
        } else {
            // 矛盾の指摘！
            chatLog.innerHTML += `<div class="chat-msg chat-ai error">AI: ちょっと待って！あなたが「${a}」だと言っているのは、私が導き出したルールと矛盾しています！私の法則では「${aiAnswer.toFixed(2)}」になるはずです！ルールを破っていませんか？</div>`;
        }
        chatLog.scrollTop = chatLog.scrollHeight;
    }, 500);
});

document.getElementById('startBtn').addEventListener('click', () => { if (!isTraining) { isTraining = true; trainLoop(); } });
document.getElementById('pauseBtn').addEventListener('click', () => { isTraining = false; cancelAnimationFrame(animationId); });
document.getElementById('resetBtn').addEventListener('click', () => { isTraining = false; cancelAnimationFrame(animationId); rebuildUI(); });

rebuildUI();