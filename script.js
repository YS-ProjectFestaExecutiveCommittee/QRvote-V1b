// 【重要】ここにGASのウェブアプリURLを貼り付けてください
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwW6XyiAJp5I_0v6cdHRTGNhYOdXiaUbAq-7gPifszxNCADNw4hbUfglKYSs8F8jT3E7A/exec";

document.addEventListener('DOMContentLoaded', async () => {
    const loadingScreen = document.getElementById('loading-screen');
    const successScreen = document.getElementById('success-screen');
    const errorScreen = document.getElementById('error-screen');
    const errorMessage = document.getElementById('error-message');

    // 画面切り替え関数
    const showScreen = (screenId) => {
        [loadingScreen, successScreen, errorScreen].forEach(el => el.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
    };

    // 1. URLパラメータからブースIDを取得
    const urlParams = new URLSearchParams(window.location.search);
    const boothId = urlParams.get('booth');

    if (!boothId) {
        errorMessage.textContent = "QRコードの読み取りに失敗しました。ブースIDが見つかりません。";
        showScreen('error-screen');
        return;
    }

    // 2. 投票処理の実行
    try {
        // FingerprintJSのロード
        const fpPromise = FingerprintJS.load();
        const fp = await fpPromise;
        const result = await fp.get();
        
        // 端末固有IDを取得 (これがキャッシュ削除対策の鍵になります)
        const visitorId = result.visitorId;

        // 演出用ウェイト（最低1.5秒待機）
        await new Promise(resolve => setTimeout(resolve, 1500));

        // GASへ送信
        // mode: 'cors' で送信し、サーバーからの重複判定結果を受け取ります
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', 
            },
            body: JSON.stringify({
                boothId: boothId,
                visitorId: visitorId // 端末IDを送信
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const jsonResponse = await response.json();

        // 3. 結果による分岐
        if (jsonResponse.result === 'success') {
            showScreen('success-screen');
        } else if (jsonResponse.result === 'duplicate') {
            errorMessage.innerHTML = "この端末からは既に投票済みです。<br><span style='font-size:0.8em; color:#666;'>※不正防止のため再投票はできません</span>";
            showScreen('error-screen');
        } else {
            errorMessage.textContent = "システムエラーが発生しました: " + (jsonResponse.message || "不明なエラー");
            showScreen('error-screen');
        }

    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = "通信エラーが発生しました。電波の良い場所でもう一度お試しください。";
        showScreen('error-screen');
    }
});
