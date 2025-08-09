// Fichier contenant les fonctions de tooltip 3D pour le visualiseur

// Afficher le tooltip
function showTooltip(x, y) {
    const tooltip3D = document.getElementById('tooltip3D');
    if (!tooltip3D) return;
    
    // Positionner le tooltip près du curseur
    updateTooltipPosition(tooltip3D, x, y);
    
    // Afficher le tooltip
    tooltip3D.style.display = 'block';
    tooltip3D.style.opacity = '1';
}

// Cacher le tooltip
function hideTooltip() {
    const tooltip3D = document.getElementById('tooltip3D');
    if (!tooltip3D) return;
    
    // Cacher le tooltip
    tooltip3D.style.opacity = '0';
    setTimeout(() => {
        tooltip3D.style.display = 'none';
    }, 300); // Attendre la fin de l'animation
}

// Mettre à jour la position du tooltip
function updateTooltipPosition(tooltip, x, y) {
    if (!tooltip) return;
    
    // Ajouter un décalage pour que le tooltip ne soit pas sous le curseur
    const offsetX = 15;
    const offsetY = 10;
    
    // Vérifier si le tooltip dépasse de la fenêtre
    const tooltipRect = tooltip.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Ajuster la position pour éviter de sortir de l'écran
    let posX = x + offsetX;
    let posY = y + offsetY;
    
    if (posX + tooltipRect.width > windowWidth) {
        posX = x - tooltipRect.width - offsetX;
    }
    
    if (posY + tooltipRect.height > windowHeight) {
        posY = y - tooltipRect.height - offsetY;
    }
    
    // Appliquer la position
    tooltip.style.left = posX + 'px';
    tooltip.style.top = posY + 'px';
}

// Exporter les fonctions
window.Tooltip3D = {
    show: showTooltip,
    hide: hideTooltip,
    updatePosition: updateTooltipPosition
};
