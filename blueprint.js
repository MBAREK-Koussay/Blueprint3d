// filepath: c:\Users\MKoussay\Desktop\3dtry\blueprint.js
// Blueprint Editor Module
const BlueprintEditor = (function() {
    let canvas, ctx;
    let isDrawing = false;
    let currentTool = 'wall';
    let startX, startY;
    let elements = [];
    let gridSize = 20;
    let scale = 1; // 1 unit = 1 meter in real world
    
    // Element types and their properties
    const elementTypes = {
        wall: { color: '#333', thickness: 3 },
        door: { color: '#8B4513', thickness: 2 },
        window: { color: '#87CEEB', thickness: 2 },
        column: { color: '#666', thickness: 4 }
    };
    
    // Initialize the blueprint editor
    function initialize() {
        canvas = document.getElementById('blueprintCanvas');
        ctx = canvas.getContext('2d');
        
        // Set canvas size to window size
        resizeCanvas();
        
        // Add event listeners
        window.addEventListener('resize', resizeCanvas);
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', endDrawing);
        canvas.addEventListener('mouseleave', endDrawing);
        
        // Tool selection
        document.querySelectorAll('.tool').forEach(button => {
            button.addEventListener('click', function() {
                // Remove selected class from all tools
                document.querySelectorAll('.tool').forEach(btn => {
                    btn.classList.remove('tool-selected');
                });
                
                // Add selected class to current tool
                this.classList.add('tool-selected');
                
                // Set current tool
                currentTool = this.id.split('-')[0];
            });
        });
        
        // Select wall tool by default
        document.getElementById('wall-tool').classList.add('tool-selected');
        
        // Clear blueprint
        document.getElementById('clear-blueprint').addEventListener('click', clearBlueprint);
        
        // Save blueprint
        document.getElementById('save-blueprint').addEventListener('click', saveBlueprint);
        
        // Load blueprint
        document.getElementById('load-blueprint').addEventListener('click', () => {
            document.getElementById('blueprint-file-input').click();
        });
        
        document.getElementById('blueprint-file-input').addEventListener('change', loadBlueprint);
        
        // Draw initial grid
        drawGrid();
    }
    
    // Resize canvas on window resize
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        redraw();
    }
    
    // Start drawing
    function startDrawing(e) {
        isDrawing = true;
        startX = snapToGrid(e.clientX);
        startY = snapToGrid(e.clientY);
    }
    
    // Draw while moving mouse
    function draw(e) {
        if (!isDrawing) return;
        
        // Redraw everything
        redraw();
        
        // Draw current element
        const currentX = snapToGrid(e.clientX);
        const currentY = snapToGrid(e.clientY);
        
        ctx.beginPath();
        ctx.strokeStyle = elementTypes[currentTool].color;
        ctx.lineWidth = elementTypes[currentTool].thickness;
        
        if (currentTool === 'column') {
            // Draw a circle for columns
            const radius = gridSize / 2;
            ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
            ctx.fill();
        } else {
            // Draw a line for walls, doors, windows
            ctx.moveTo(startX, startY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
        }
    }
    
    // End drawing
    function endDrawing(e) {
        if (!isDrawing) return;
        isDrawing = false;
        
        const endX = snapToGrid(e.clientX);
        const endY = snapToGrid(e.clientY);
        
        // Add element to list
        if (currentTool === 'column') {
            elements.push({
                type: currentTool,
                x: startX,
                y: startY,
                radius: gridSize / 2
            });
        } else {
            // Only add if it's not just a click (has some length)
            if (startX !== endX || startY !== endY) {
                elements.push({
                    type: currentTool,
                    x1: startX,
                    y1: startY,
                    x2: endX,
                    y2: endY
                });
            }
        }
        
        // Redraw everything
        redraw();
    }
    
    // Snap to grid
    function snapToGrid(value) {
        return Math.round(value / gridSize) * gridSize;
    }
    
    // Clear the blueprint
    function clearBlueprint() {
        if (confirm('Êtes-vous sûr de vouloir effacer le blueprint?')) {
            elements = [];
            redraw();
        }
    }
    
    // Save blueprint as JSON
    function saveBlueprint() {
        const blueprintData = {
            elements: elements,
            gridSize: gridSize,
            scale: scale
        };
        
        const blob = new Blob([JSON.stringify(blueprintData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'entrepot_blueprint.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Load blueprint from JSON
    function loadBlueprint(e) {
        const file = e.target.files[0];
        
        if (file) {
            const reader = new FileReader();
            
            reader.onload = function(event) {
                try {
                    const blueprintData = JSON.parse(event.target.result);
                    elements = blueprintData.elements;
                    gridSize = blueprintData.gridSize || gridSize;
                    scale = blueprintData.scale || scale;
                    redraw();
                } catch (error) {
                    alert('Erreur lors de la lecture du fichier: ' + error.message);
                }
            };
            
            reader.readAsText(file);
        }
    }
    
    // Draw grid
    function drawGrid() {
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;
        
        // Draw vertical lines
        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    
    // Redraw everything
    function redraw() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        drawGrid();
        
        // Draw all elements
        elements.forEach(element => {
            ctx.beginPath();
            
            if (element.type === 'column') {
                ctx.fillStyle = elementTypes[element.type].color;
                ctx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI);
                ctx.fill();
            } else {
                ctx.strokeStyle = elementTypes[element.type].color;
                ctx.lineWidth = elementTypes[element.type].thickness;
                ctx.moveTo(element.x1, element.y1);
                ctx.lineTo(element.x2, element.y2);
                ctx.stroke();
            }
        });
    }
    
    // Get blueprint data for 3D conversion
    function getBlueprintData() {
        return {
            elements: elements,
            gridSize: gridSize,
            scale: scale
        };
    }
    
    // Public methods
    return {
        initialize: initialize,
        getBlueprintData: getBlueprintData
    };
})();