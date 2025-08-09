// filepath: c:\Users\MKoussay\Desktop\3dtry\blueprint.js
// Blueprint Editor Module
const BlueprintEditor = (function() {
    let canvas, ctx;
    let isDrawing = false;
    let isDragging = false;
    let currentTool = 'wall';
    let startX, startY;
    let dragOffsetX = 0, dragOffsetY = 0;
    let selectedElementIndex = -1;
    let elements = [];
    let gridSize = 20;
    let scale = 1; // 1 unit = 1 meter in real world
    let hoverElementIndex = -1;
    let bpTooltipEl = null;
    
    // Element types and their properties
    const elementTypes = {
        wall: { color: '#333', thickness: 3 },
        door: { color: '#8B4513', thickness: 2 },
        window: { color: '#87CEEB', thickness: 2 },
        column: { color: '#666', thickness: 4 },
        shelf: { color: '#4A4A4A', thickness: 3 },
        pallet: { color: '#B5651D', thickness: 2, size: { w: 1.2, d: 0.8 } },
        forklift: { color: '#FFB300', thickness: 2, size: { w: 2.5, d: 1.0 } }
    };

    // Calculate distance between two points
    function calculateDistance(x1, y1, x2, y2) {
        return Math.hypot(x2 - x1, y2 - y1);
    }

    // Convert pixels to meters
    function pixelsToMeters(pixels) {
        return (pixels / gridSize) * scale;
    }
    
    // Initialize the blueprint editor
    function initialize() {
        canvas = document.getElementById('blueprintCanvas');
        ctx = canvas.getContext('2d');
        bpTooltipEl = document.getElementById('bpTooltip');
        
        // Set canvas size to window size
        resizeCanvas();
        
        // Add event listeners
        window.addEventListener('resize', resizeCanvas);
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mouseleave', onMouseUp);
        
        // Tool selection
        document.querySelectorAll('.tool').forEach(button => {
            button.addEventListener('click', function() {
                // Remove selected class from all tools
                document.querySelectorAll('.tool').forEach(btn => btn.classList.remove('tool-selected'));
                
                // Add selected class to current tool
                this.classList.add('tool-selected');
                
                // Set current tool
                currentTool = this.id.split('-')[0];
            });
        });

        document.getElementById('apply-scale').addEventListener('click', function() {
            scale = parseFloat(document.getElementById('scale-input').value) || 1;
            redraw();
        });
        
        // Select tool by default
        const defaultToolBtn = document.getElementById('select-tool') || document.getElementById('wall-tool');
        defaultToolBtn.classList.add('tool-selected');
        currentTool = defaultToolBtn.id.split('-')[0];
        
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

    // Resize canvas
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        redraw();
    }

    // Hit test for elements (returns index or -1)
    function hitTest(x, y) {
        // Check items (rectangles): shelf, pallet, forklift
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i];
            if (el.type === 'shelf' || el.type === 'pallet' || el.type === 'forklift') {
                if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.depth) {
                    return i;
                }
            } else if (el.type === 'column') {
                const r = el.radius;
                if (calculateDistance(x, y, el.x, el.y) <= r) return i;
            } else {
                // line (wall/door/window) - simple bbox hit test
                const minX = Math.min(el.x1, el.x2) - 5;
                const maxX = Math.max(el.x1, el.x2) + 5;
                const minY = Math.min(el.y1, el.y2) - 5;
                const maxY = Math.max(el.y1, el.y2) + 5;
                if (x >= minX && x <= maxX && y >= minY && y <= maxY) return i;
            }
        }
        return -1;
    }

    // Mouse events
    function onMouseDown(e) {
        const x = snapToGrid(e.clientX);
        const y = snapToGrid(e.clientY);
        startX = x; startY = y;

        // Always allow selection (even if another tool) with CTRL or right-click
        const isAltSelect = e.button === 2 || e.ctrlKey;
        if (currentTool === 'select' || isAltSelect) {
            selectedElementIndex = hitTest(x, y);
            if (selectedElementIndex !== -1) {
                const el = elements[selectedElementIndex];
                isDragging = true;
                dragOffsetX = x - (el.x ?? el.x1 ?? 0);
                dragOffsetY = y - (el.y ?? el.y1 ?? 0);
                // No prompt here anymore
            }
            redraw();
            return;
        }

        isDrawing = true;
    }

    // Draw dimension label helper (meters based on scale)
    function drawDimensionLabel(x1, y1, x2, y2, prefix = '') {
        const pixelDistance = calculateDistance(x1, y1, x2, y2);
        const meterDistance = pixelsToMeters(pixelDistance);
        const text = `${prefix}${meterDistance.toFixed(2)} m`;

        ctx.save();
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(midX - textWidth / 2 - 3, midY - 8, textWidth + 6, 16);
        ctx.fillStyle = '#000';
        ctx.fillText(text, midX, midY);
        ctx.restore();
    }

    function formatElementInfo(el) {
        if (!el) return '';
        // Common dimension helpers
        const mW = (pixelsToMeters(el.width || 0)).toFixed(2);
        const mD = (pixelsToMeters(el.depth || 0)).toFixed(2);
        if (el.type === 'shelf') {
            // Replicate sidebar tooltip style
            return `<h4 style="margin:0 0 4px 0;font-size:13px;">Étagère Industrielle</h4>
<ul style="margin:0;padding:0 0 0 14px;list-style:disc;">
<li>Largeur: ${mW} m</li>
<li>Hauteur: 4.00 m</li>
<li>Profondeur: ${mD} m</li>
<li>Capacité: 1000 kg / niveau</li>
<li>Niveaux: 3</li>
</ul>`;
        }
        if (el.type === 'pallet') {
            return `<strong>Palette EUR</strong><br/>Largeur: ${mW} m<br/>Profondeur: ${mD} m`;
        }
        if (el.type === 'forklift') {
            return `<strong>Chariot élévateur</strong><br/>Empreinte L: ${mW} m<br/>P: ${mD} m`;
        }
        if (el.type === 'column') {
            return `<strong>Colonne</strong><br/>Rayon: ${(pixelsToMeters(el.radius)).toFixed(2)} m`;
        }
        if (el.x1 !== undefined) {
            const dist = pixelsToMeters(calculateDistance(el.x1, el.y1, el.x2, el.y2)).toFixed(2);
            const label = el.type === 'wall' ? 'Mur' : el.type === 'door' ? 'Porte' : el.type === 'window' ? 'Fenêtre' : 'Ligne';
            return `<strong>${label}</strong><br/>Longueur: ${dist} m`;
        }
        return '<em>Élément</em>';
    }

    function onMouseMove(e) {
        const x = snapToGrid(e.clientX);
        const y = snapToGrid(e.clientY);
        const rawX = e.clientX;
        const rawY = e.clientY;

        if (isDragging && selectedElementIndex !== -1) {
            const el = elements[selectedElementIndex];
            if (el.type === 'shelf' || el.type === 'pallet' || el.type === 'forklift') {
                el.x = x - dragOffsetX;
                el.y = y - dragOffsetY;
            } else if (el.type === 'column') {
                el.x = x - dragOffsetX;
                el.y = y - dragOffsetY;
            } else {
                const dx = (el.x2 - el.x1);
                const dy = (el.y2 - el.y1);
                el.x1 = x - dragOffsetX;
                el.y1 = y - dragOffsetY;
                el.x2 = el.x1 + dx;
                el.y2 = el.y1 + dy;
            }
            redraw();
            return;
        }

        if (!isDrawing) {
            // Hover detection (when not dragging/drawing)
            const previousHover = hoverElementIndex;
            hoverElementIndex = hitTest(x, y);
            if (hoverElementIndex !== -1) {
                const el = elements[hoverElementIndex];
                if (bpTooltipEl) {
                    bpTooltipEl.style.display = 'block';
                    bpTooltipEl.innerHTML = formatElementInfo(el); // switched to innerHTML for rich content
                    const offset = 12;
                    let ttX = rawX + offset;
                    let ttY = rawY + offset;
                    const rect = bpTooltipEl.getBoundingClientRect();
                    if (ttX + rect.width > window.innerWidth) ttX = rawX - rect.width - offset;
                    if (ttY + rect.height > window.innerHeight) ttY = rawY - rect.height - offset;
                    bpTooltipEl.style.left = ttX + 'px';
                    bpTooltipEl.style.top = ttY + 'px';
                }
            } else if (bpTooltipEl) {
                bpTooltipEl.style.display = 'none';
            }
            if (previousHover !== hoverElementIndex) redraw();
        }

        if (!isDrawing) return;

        // Preview drawing
        redraw();
        ctx.beginPath();
        ctx.strokeStyle = elementTypes[currentTool]?.color || '#000';
        ctx.lineWidth = elementTypes[currentTool]?.thickness || 2;

        const showDims = document.getElementById('show-dimensions')?.checked;

        if (currentTool === 'column') {
            const radius = gridSize / 2;
            ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
            ctx.fill();
            if (showDims) {
                // Show radius
                drawDimensionLabel(startX, startY, startX + radius, startY, 'Rayon: ');
            }
        } else if (currentTool === 'shelf' || currentTool === 'pallet' || currentTool === 'forklift') {
            const size = currentTool === 'shelf' ? { w: 2.8, d: 1.2 } : elementTypes[currentTool].size;
            const width = size.w * gridSize;
            const depth = size.d * gridSize;
            ctx.strokeRect(startX, startY, width, depth);
            if (currentTool === 'shelf') {
                ctx.setLineDash([5, 5]);
                for (let i = 1; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(startX, startY + (depth * i/3));
                    ctx.lineTo(startX + width, startY + (depth * i/3));
                    ctx.stroke();
                }
                ctx.setLineDash([]);
            }
            if (showDims) {
                drawDimensionLabel(startX, startY, startX + width, startY, 'Largeur: ');
                drawDimensionLabel(startX, startY, startX, startY + depth, 'Profondeur: ');
            }
        } else {
            ctx.moveTo(startX, startY);
            ctx.lineTo(x, y);
            ctx.stroke();
            if (showDims) {
                drawDimensionLabel(startX, startY, x, y);
            }
        }
    }

    function onMouseUp(e) {
        const x = snapToGrid(e.clientX);
        const y = snapToGrid(e.clientY);

        if (isDragging) {
            isDragging = false;
            openPropertiesFor(selectedElementIndex);
            return;
        }

        if (!isDrawing) return;
        isDrawing = false;

        const endX = x;
        const endY = y;

        if (currentTool === 'column') {
            elements.push({ type: 'column', x: startX, y: startY, radius: gridSize / 2, _configured:false });
            selectedElementIndex = elements.length -1;
        } else if (currentTool === 'shelf') {
            elements.push({ type: 'shelf', x: startX, y: startY, width: 2.8 * gridSize, depth: 1.2 * gridSize, meta:{height:4, levels:3, capacity:1000}, _configured:false });
            selectedElementIndex = elements.length -1;
        } else if (currentTool === 'pallet') {
            elements.push({ type: 'pallet', x: startX, y: startY, width: elementTypes.pallet.size.w * gridSize, depth: elementTypes.pallet.size.d * gridSize, _configured:false });
            selectedElementIndex = elements.length -1;
        } else if (currentTool === 'forklift') {
            elements.push({ type: 'forklift', x: startX, y: startY, width: elementTypes.forklift.size.w * gridSize, depth: elementTypes.forklift.size.d * gridSize, _configured:false });
            selectedElementIndex = elements.length -1;
        } else {
            if (startX !== endX || startY !== endY) {
                elements.push({ type: currentTool, x1: startX, y1: startY, x2: endX, y2: endY, _configured:false });
                selectedElementIndex = elements.length -1;
            }
        }

        if(selectedElementIndex !== -1) {
            editElementPrompts(elements[selectedElementIndex]);
            openPropertiesFor(selectedElementIndex);
        }
        redraw();
    }

    // Clear the blueprint
    function clearBlueprint() {
        if (confirm('Êtes-vous sûr de vouloir effacer le blueprint?')) {
            elements = [];
            selectedElementIndex = -1;
            redraw();
        }
    }

    // Draw grid
    function drawGrid() {
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= canvas.width; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
        for (let y = 0; y <= canvas.height; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    }

    // Redraw everything
    function redraw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        const showDims = document.getElementById('show-dimensions')?.checked;
        elements.forEach((el, idx) => {
            ctx.beginPath();
            const isSelected = idx === selectedElementIndex;
            const isHover = idx === hoverElementIndex && !isDrawing && !isDragging;

            if (el.type === 'column') {
                ctx.fillStyle = elementTypes.column.color;
                ctx.arc(el.x, el.y, el.radius, 0, 2 * Math.PI);
                ctx.fill();
                if (isSelected) drawSelection(el.x - el.radius, el.y - el.radius, el.radius * 2, el.radius * 2);
                if (showDims) {
                    drawDimensionLabel(el.x, el.y, el.x + el.radius, el.y, 'Rayon: ');
                }
            } else if (el.type === 'shelf' || el.type === 'pallet' || el.type === 'forklift') {
                ctx.strokeStyle = elementTypes[el.type].color;
                ctx.lineWidth = elementTypes[el.type].thickness;
                ctx.strokeRect(el.x, el.y, el.width, el.depth);

                if (el.type === 'shelf') {
                    ctx.setLineDash([5, 5]);
                    for (let i = 1; i < 3; i++) {
                        ctx.beginPath();
                        ctx.moveTo(el.x, el.y + (el.depth * i/3));
                        ctx.lineTo(el.x + el.width, el.y + (el.depth * i/3));
                        ctx.stroke();
                    }
                    ctx.setLineDash([]);
                }
                if (isSelected) drawSelection(el.x, el.y, el.width, el.depth);
                if (showDims) {
                    drawDimensionLabel(el.x, el.y, el.x + el.width, el.y, 'Largeur: ');
                    drawDimensionLabel(el.x, el.y, el.x, el.y + el.depth, 'Profondeur: ');
                }
            } else {
                ctx.strokeStyle = elementTypes[el.type].color;
                ctx.lineWidth = elementTypes[el.type].thickness;
                ctx.moveTo(el.x1, el.y1);
                ctx.lineTo(el.x2, el.y2);
                ctx.stroke();
                if (isSelected) drawSelection(Math.min(el.x1, el.x2), Math.min(el.y1, el.y2), Math.abs(el.x2 - el.x1), Math.abs(el.y2 - el.y1));
                if (showDims) {
                    drawDimensionLabel(el.x1, el.y1, el.x2, el.y2);
                }
            }
            // After drawing shape, optional hover outline
            if (isHover && !isSelected) {
                // Determine bounds
                if (el.type === 'column') {
                    drawSelection(el.x - el.radius, el.y - el.radius, el.radius * 2, el.radius * 2);
                } else if (el.width !== undefined) {
                    drawSelection(el.x, el.y, el.width, el.depth);
                } else if (el.x1 !== undefined) {
                    drawSelection(Math.min(el.x1, el.x2), Math.min(el.y1, el.y2), Math.abs(el.x2 - el.x1), Math.abs(el.y2 - el.y1));
                }
            }
        });
    }

    function drawSelection(x, y, w, d) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#2196f3';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 3, y - 3, w + 6, d + 6);
        ctx.restore();
    }

    // Snap to grid
    function snapToGrid(value) { return Math.round(value / gridSize) * gridSize; }

    // Save blueprint as JSON
    function saveBlueprint() {
        const blueprintData = { elements, gridSize, scale };
        const blob = new Blob([JSON.stringify(blueprintData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'entrepot_blueprint.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Load blueprint from JSON
    function loadBlueprint(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const blueprintData = JSON.parse(event.target.result);
                elements = (blueprintData.elements || []).map(el=>{ el._configured = true; return el; });
                gridSize = blueprintData.gridSize || gridSize;
                scale = blueprintData.scale || scale;
                selectedElementIndex = -1;
                redraw();
            } catch (err) {
                alert('Erreur lors de la lecture du fichier: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    // Get blueprint data for 3D conversion
    function getBlueprintData() { return { elements, gridSize, scale }; }

    // ---- Property Panel Elements (lazy get) ----
    function ui(id){ return document.getElementById(id); }
    function show(el, flag){ if(el) el.style.display = flag? 'block':'none'; }
    function metersToPixels(m){ return m * (gridSize/scale); }

    function openPropertiesFor(index){
        const panel = ui('elementProperties');
        if(index < 0 || index >= elements.length){ if(panel) panel.style.display='none'; return; }
        const el = elements[index];
        if(!panel) return;
        panel.style.display='block';
        ui('prop-type-label').textContent = 'Type: ' + el.type;
        // Hide all groups first
        ['prop-group-width','prop-group-depth','prop-group-radius','prop-group-length','prop-group-height','prop-group-levels','prop-group-capacity']
            .forEach(id=> show(ui(id), false));
        // Populate values depending on type
        if(el.type === 'shelf' || el.type === 'pallet' || el.type === 'forklift') {
            show(ui('prop-group-width'), true);
            show(ui('prop-group-depth'), true);
            ui('prop-width').value = (pixelsToMeters(el.width)).toFixed(2);
            ui('prop-depth').value = (pixelsToMeters(el.depth)).toFixed(2);
            if(el.type === 'shelf') {
                // custom fields (store if absent)
                el.meta = el.meta || { height:4, levels:3, capacity:1000 };
                show(ui('prop-group-height'), true);
                show(ui('prop-group-levels'), true);
                show(ui('prop-group-capacity'), true);
                ui('prop-height').value = el.meta.height;
                ui('prop-levels').value = el.meta.levels;
                ui('prop-capacity').value = el.meta.capacity;
            }
        } else if(el.type === 'column') {
            show(ui('prop-group-radius'), true);
            ui('prop-radius').value = (pixelsToMeters(el.radius)).toFixed(2);
        } else { // line types
            show(ui('prop-group-length'), true);
            const lenPx = calculateDistance(el.x1, el.y1, el.x2, el.y2);
            ui('prop-length').value = pixelsToMeters(lenPx).toFixed(2);
        }
    }

    function applyProperties(){
        if(selectedElementIndex === -1) return;
        const el = elements[selectedElementIndex];
        try {
            if(el.type === 'shelf' || el.type === 'pallet' || el.type === 'forklift') {
                const w = parseFloat(ui('prop-width').value);
                const d = parseFloat(ui('prop-depth').value);
                if(!isNaN(w) && w>0){ el.width = metersToPixels(w); }
                if(!isNaN(d) && d>0){ el.depth = metersToPixels(d); }
                if(el.type === 'shelf') {
                    el.meta = el.meta || {};
                    const h = parseFloat(ui('prop-height').value);
                    const lv = parseInt(ui('prop-levels').value);
                    const cap = parseFloat(ui('prop-capacity').value);
                    if(!isNaN(h) && h>0) el.meta.height = h;
                    if(!isNaN(lv) && lv>0) el.meta.levels = lv;
                    if(!isNaN(cap) && cap>=0) el.meta.capacity = cap;
                }
            } else if(el.type === 'column') {
                const r = parseFloat(ui('prop-radius').value);
                if(!isNaN(r) && r>0){ el.radius = metersToPixels(r); }
            } else { // line types
                const L = parseFloat(ui('prop-length').value);
                if(!isNaN(L) && L>0){
                    const currentLenPx = calculateDistance(el.x1, el.y1, el.x2, el.y2);
                    if(currentLenPx > 0){
                        const targetLenPx = metersToPixels(L);
                        const scaleFac = targetLenPx / currentLenPx;
                        el.x2 = el.x1 + (el.x2 - el.x1)*scaleFac;
                        el.y2 = el.y1 + (el.y2 - el.y1)*scaleFac;
                    }
                }
            }
            redraw();
        } catch(err){ console.warn(err); }
    }

    function deleteSelected(){
        if(selectedElementIndex === -1) return;
        elements.splice(selectedElementIndex,1);
        selectedElementIndex = -1;
        const panel = ui('elementProperties');
        if(panel) panel.style.display='none';
        redraw();
    }

    // Hook property panel buttons once DOM exists
    window.addEventListener('DOMContentLoaded', () => {
        const applyBtn = ui('prop-apply');
        const cancelBtn = ui('prop-cancel');
        const delBtn = ui('prop-delete');
        if(applyBtn) applyBtn.addEventListener('click', applyProperties);
        if(cancelBtn) cancelBtn.addEventListener('click', () => openPropertiesFor(selectedElementIndex));
        if(delBtn) delBtn.addEventListener('click', deleteSelected);
    });

    function editElementPrompts(el){
        if(!el) return;
        // Do not prompt for walls
        if(el.type === 'wall') { el._configured = true; return; }
        // Only prompt if not already configured (first time)
        if(el._configured) return;
        try {
            if(el.type === 'shelf' || el.type === 'pallet' || el.type === 'forklift') {
                const currentW = pixelsToMeters(el.width || 0).toFixed(2);
                const currentD = pixelsToMeters(el.depth || 0).toFixed(2);
                let wStr = prompt('Largeur (m)', currentW); if(wStr === null) { el._configured = true; redraw(); return; }
                let dStr = prompt('Profondeur (m)', currentD); if(dStr === null) { el._configured = true; redraw(); return; }
                const w = parseFloat(wStr); if(!isNaN(w) && w>0) el.width = metersToPixels(w);
                const d = parseFloat(dStr); if(!isNaN(d) && d>0) el.depth = metersToPixels(d);
                if(el.type === 'shelf') {
                    el.meta = el.meta || {height:4, levels:3, capacity:1000};
                    let hStr = prompt('Hauteur (m)', el.meta.height); if(hStr !== null){ const h = parseFloat(hStr); if(!isNaN(h) && h>0) el.meta.height = h; }
                    let lvStr = prompt('Niveaux', el.meta.levels); if(lvStr !== null){ const lv = parseInt(lvStr); if(!isNaN(lv) && lv>0) el.meta.levels = lv; }
                    let capStr = prompt('Capacité (kg / niveau)', el.meta.capacity); if(capStr !== null){ const cap = parseFloat(capStr); if(!isNaN(cap) && cap>=0) el.meta.capacity = cap; }
                }
            } else if(el.type === 'column') {
                const currentR = pixelsToMeters(el.radius || 0).toFixed(2);
                let rStr = prompt('Rayon (m)', currentR); if(rStr !== null){ const r = parseFloat(rStr); if(!isNaN(r) && r>0) el.radius = metersToPixels(r); }
            } else if(el.x1 !== undefined) { // line (door/window)
                const currentLenPx = calculateDistance(el.x1, el.y1, el.x2, el.y2);
                const currentLenM = pixelsToMeters(currentLenPx).toFixed(2);
                let LStr = prompt('Longueur (m)', currentLenM); if(LStr !== null){
                    const L = parseFloat(LStr);
                    if(!isNaN(L) && L>0 && currentLenPx>0){
                        const targetLenPx = metersToPixels(L);
                        const scaleFac = targetLenPx / currentLenPx;
                        el.x2 = el.x1 + (el.x2 - el.x1)*scaleFac;
                        el.y2 = el.y1 + (el.y2 - el.y1)*scaleFac;
                    }
                }
            }
        } catch(err){ console.warn('Edit prompt error', err); }
        el._configured = true; // mark so we do not prompt again
        redraw();
    }

    // Public methods
    return { initialize, getBlueprintData };
})();