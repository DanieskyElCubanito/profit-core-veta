export function calculateROI() {
    const amountInput = document.getElementById('invest-amount');
    const powerDisplay = document.getElementById('calc-power');
    const hashDisplay = document.getElementById('calc-hash');

    if (!amountInput) return;
    const amount = parseFloat(amountInput.value) || 0;

    // Validación basada en tu nuevo mínimo operativo de 0.1 USDT
    if (amount < 0.1) {
        if (powerDisplay) powerDisplay.innerText = "0.0 GH/s";
        if (hashDisplay) hashDisplay.innerText = "0 HASH";
        return;
    }

    // 1. Potencia equivalente (Multiplicador de potencia de red)
    const totalGHs = (amount * 1000).toFixed(1);

    // 2. Tu nuevo sistema unificado: 5% diario fijo (0.05)
    const dailyPercentage = 0.05; 
    
    // 3. Ganancia diaria en USDT y su conversión equivalente a tu métrica HASH
    const dailyProfitUSDT = amount * dailyPercentage;
    const dailyHash = (dailyProfitUSDT * 1000).toFixed(0);

    // Renderizado en la interfaz con validación de existencia por seguridad
    if (powerDisplay) powerDisplay.innerText = `${totalGHs} GH/s`;
    if (hashDisplay) hashDisplay.innerText = `${dailyHash} HASH`;
}

// Lo exponemos al objeto window para mantener compatibilidad con los inputs HTML (oninput)
window.calculateROI = calculateROI;