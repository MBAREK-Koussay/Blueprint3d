
// Main Application

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the blueprint editor
    BlueprintEditor.initialize();
    
    // Switch to 3D view button
    document.getElementById('switch-to-3d').addEventListener('click', function() {
        // Get the blueprint data
        const blueprintData = BlueprintEditor.getBlueprintData();
        
        // Check if there are elements in the blueprint
        if (blueprintData.elements.length === 0) {
            alert("Veuillez d'abord créer un blueprint de l'entrepôt");
            return;
        }
        
        // Hide blueprint editor and show 3D view
        document.getElementById('blueprintEditor').style.display = 'none';
        document.getElementById('threeD-container').style.display = 'block';
        
        // Initialize 3D viewer (if not already)
        ThreeDViewer.initialize();
        
        // Convert blueprint to 3D
        ThreeDViewer.convertBlueprintTo3D(blueprintData);
        
        // Show itemsList in 3D mode
        document.getElementById('itemsList').style.display = 'block';
    });
    
    // Switch back to blueprint button
    document.getElementById('switch-to-blueprint').addEventListener('click', function() {
        // Hide 3D view and show blueprint editor
        document.getElementById('threeD-container').style.display = 'none';
        document.getElementById('blueprintEditor').style.display = 'block';
    });
});