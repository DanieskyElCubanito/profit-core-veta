// ui.js - Sistema de navegación blindado y modales visuales

window.switchTab = function(tabId, button) {
    // 1. Ocultar todas las vistas
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    // 2. Mostrar la vista seleccionada
    const targetView = document.getElementById(tabId);
    if(targetView) targetView.classList.add('active');

    // 3. Quitar el estado activo de todos los botones de la barra inferior
    document.querySelectorAll('.fixed-nav-btn').forEach(b => b.classList.remove('active'));

    // 4. Activar el botón correcto
    if(button) {
        button.classList.add('active');
    } else {
        // Si el cambio de pestaña se hizo desde otro lado (ej. un botón en el dashboard)
        const navBtn = document.querySelector(`.fixed-nav-btn[onclick*="${tabId}"]`);
        if(navBtn) navBtn.classList.add('active');
    }
};

// Funciones básicas para el Modal de Pago
window.openPayModal = function() { 
    document.getElementById('payModal').style.display = 'flex'; 
};

window.closePayModal = function() { 
    document.getElementById('payModal').style.display = 'none'; 
};
