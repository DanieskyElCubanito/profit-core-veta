// depositSystem.js

const DepositSystem = {
    // Configuración de tu wallet BEP20
    walletBEP20: "0x7795D827df7bcB264c4F0851FbAab5f5f00710F2",
    minAmount: 0.1,

    openModal: function() {
        const amountInput = document.getElementById('invest-amount');
        const amount = parseFloat(amountInput.value) || 0;

        // Minimum investment check (English)
        if (amount < this.minAmount) {
            alert(`⚠️ The minimum investment amount is ${this.minAmount} USDT`);
            return;
        }

        // Fill data instantly
        document.getElementById('pay-amount-display').textContent = amount.toFixed(2) + " USDT";
        document.getElementById('wallet-address-display').textContent = this.walletBEP20;

        // Generate QR code without lag using the public API
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${this.walletBEP20}&margin=0`;
        document.getElementById('qr-image').src = qrUrl;

        // Show the modal
        document.getElementById('payModal').style.display = "flex";
    },

    closeModal: function() {
        document.getElementById('payModal').style.display = "none";
    },

    copyAddress: function() {
        // Usa la variable de la wallet directamente en lugar de leer el DOM
        navigator.clipboard.writeText(this.walletBEP20).then(() => {
            // Success alert in English
            alert("Address copied successfully!");
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }
};

// Exponer las funciones globalmente si usas onclick="openPayModal()" en tu HTML
window.openPayModal = () => DepositSystem.openModal();
window.closePayModal = () => DepositSystem.closeModal();
window.copyAddress = () => DepositSystem.copyAddress();
