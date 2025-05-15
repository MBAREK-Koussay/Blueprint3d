// 3D Viewer Module
const ThreeDViewer = (function() {
      let scene, camera, renderer, controls, raycaster, mouse;
    let blueprintPlane;
    let selectedObject = null;
    let objects = [];
    let isInitialized = false;
    let gridSize = 20; // Ajoutez cette ligne pour définir gridSize
    
    // Initialize the 3D viewer
    var ViewerFloorplanner = function(blueprint3d) {

  var canvasWrapper = '#floorplanner';

  // buttons
  var move = '#move';
  var remove = '#delete';
  var draw = '#draw';

  var activeStlye = 'btn-primary disabled';

  this.floorplanner = blueprint3d.floorplanner;

  var scope = this;

  function init() {

    $( window ).resize( scope.handleWindowResize );
    scope.handleWindowResize();

    // mode buttons
    scope.floorplanner.modeResetCallbacks.add(function(mode) {
      $(draw).removeClass(activeStlye);
      $(remove).removeClass(activeStlye);
      $(move).removeClass(activeStlye);
      if (mode == scope.floorplanner.modes.MOVE) {
          $(move).addClass(activeStlye);
      } else if (mode == scope.floorplanner.modes.DRAW) {
          $(draw).addClass(activeStlye);
      } else if (mode == scope.floorplanner.modes.DELETE) {
          $(remove).addClass(activeStlye);
      }

      if (mode == scope.floorplanner.modes.DRAW) {
        $("#draw-walls-hint").show();
        scope.handleWindowResize();
      } else {
        $("#draw-walls-hint").hide();
      }
    });

    $(move).click(function(){
      scope.floorplanner.setMode(scope.floorplanner.modes.MOVE);
    });

    $(draw).click(function(){
      scope.floorplanner.setMode(scope.floorplanner.modes.DRAW);
    });

    $(remove).click(function(){
      scope.floorplanner.setMode(scope.floorplanner.modes.DELETE);
    });
  }

  this.updateFloorplanView = function() {
    scope.floorplanner.reset();
  }

  this.handleWindowResize = function() {
    $(canvasWrapper).height(window.innerHeight - $(canvasWrapper).offset().top);
    scope.floorplanner.resizeView();
  };

  init();
}; 
    function initialize() {
        if (isInitialized) return;
        
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        
        // Create camera
        camera = new THREE.PerspectiveCamera(60   , window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 15, 20);
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        document.getElementById('threeD-container').appendChild(renderer.domElement);
        
        // Add orbit controls
       controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;

        // Par ceux-ci avec plus d'options:
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1; // Valeur plus faible pour des mouvements plus fluides
        controls.screenSpacePanning = true;
        controls.minDistance = 5; // Distance minimale plus grande
        controls.maxDistance = 100;
        controls.maxPolarAngle = Math.PI / 2.1; // Légèrement moins que 90° pour éviter de passer sous le sol
        controls.keyPanSpeed = 25;
        controls.rotateSpeed = 0.7; // Vitesse de rotation plus lente pour plus de stabilité
        controls.zoomSpeed = 0.8; // Vitesse de zoom plus lente
        controls.panSpeed = 0.8; // Vitesse de déplacement plus lente
        controls.target.set(0, 0, 0); // Plus rapide pour les déplacements au clavier
        
        // Raycaster for object selection
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();
        function updateSelectedObjectPositionX() {
    if (selectedObject) {
        const posX = parseFloat(document.getElementById('positionXSlider').value);
        selectedObject.position.x = posX;
        
        // Mettre à jour l'outline
        if (selectedObject.userData.outlineMesh) {
            scene.remove(selectedObject.userData.outlineMesh);
            createSelectionOutline(selectedObject);
        }
    }
}
// Dans initialize(), après avoir ajouté la grille
// Ajouter des axes X et Z pour faciliter l'orientation
let axesHelper = new THREE.AxesHelper(50);
axesHelper.visible = false; // Les axes sont créés mais invisibles
scene.add(axesHelper);

// Ajouter un texte d'instruction
const instructionDiv = document.createElement('div');
instructionDiv.style.position = 'absolute';
instructionDiv.style.bottom = '20px';
instructionDiv.style.left = '20px';
instructionDiv.style.color = 'white';
instructionDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
instructionDiv.style.padding = '10px';
instructionDiv.style.borderRadius = '5px';
instructionDiv.innerHTML = 'Glisser-déposer: Positionnez les objets<br>Clic: Sélectionnez un objet';
document.getElementById('threeD-container').appendChild(instructionDiv);

function updateSelectedObjectPositionZ() {
    if (selectedObject) {
        const posZ = parseFloat(document.getElementById('positionZSlider').value);
        selectedObject.position.z = posZ;
        
        // Mettre à jour l'outline
        if (selectedObject.userData.outlineMesh) {
            scene.remove(selectedObject.userData.outlineMesh);
            createSelectionOutline(selectedObject);
        }
    }
}
// Ajoutez ces variables en haut de votre module ThreeDViewer
let isDragging = false;
let dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let dragOffset = new THREE.Vector3();

// Ajoutez ces event listeners dans initialize()
renderer.domElement.addEventListener('mousedown', onMouseDown);
renderer.domElement.addEventListener('mousemove', onMouseMove);
renderer.domElement.addEventListener('mouseup', onMouseUp);

// Ajoutez ces fonctions dans votre module
function onMouseDown(event) {
    // Ne pas traiter si on clique sur les contrôles
    if (event.target !== renderer.domElement) return;
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(objects, true);
    
    if (intersects.length > 0) {
        // Trouver l'objet parent si c'est un groupe
        let selectedObj = intersects[0].object;
        while(selectedObj.parent && !objects.includes(selectedObj)) {
            selectedObj = selectedObj.parent;
        }
        
        if (objects.includes(selectedObj)) {
            isDragging = true;
            selectObject(selectedObj);
            
            // Calculer l'intersection avec le plan du sol
            raycaster.ray.intersectPlane(dragPlane, dragOffset);
            // Calculer le décalage entre la position du clic et la position de l'objet
            dragOffset.sub(selectedObject.position);
        }
    }
}

function onMouseMove(event) {
    if (!isDragging || !selectedObject) return;
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Trouver l'intersection avec le plan du sol
    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, intersectionPoint);
    
    // Mettre à jour la position de l'objet (en conservant sa hauteur Y)
    const oldY = selectedObject.position.y;
    selectedObject.position.copy(intersectionPoint.sub(dragOffset));
    selectedObject.position.y = oldY;
    
    // Mettre à jour les sliders de position
    document.getElementById('positionXSlider').value = selectedObject.position.x;
    document.getElementById('positionZSlider').value = selectedObject.position.z;
    
    // Mettre à jour l'outline
    if (selectedObject.userData.outlineMesh) {
        scene.remove(selectedObject.userData.outlineMesh);
        createSelectionOutline(selectedObject);
    }
}

function onMouseUp() {
    isDragging = false;
}
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 15);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        // Add ground plane
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
        
        
       
        
        // Event listeners
        window.addEventListener('resize', onWindowResize);
        renderer.domElement.addEventListener('click', onMouseClick);
        
        // Item buttons
        const itemButtons = document.querySelectorAll('[data-item]');
        itemButtons.forEach(button => {
            button.addEventListener('click', () => addItem(button.getAttribute('data-item')));
        });
        
        // Object controls
        document.getElementById('deleteObject').addEventListener('click', deleteSelectedObject);
        document.getElementById('scaleSlider').addEventListener('input', updateSelectedObjectScale);
        document.getElementById('rotationSlider').addEventListener('input', updateSelectedObjectRotation);
        document.getElementById('heightSlider').addEventListener('input', updateSelectedObjectHeight);
        document.getElementById('positionXSlider').addEventListener('input', updateSelectedObjectPositionX);
document.getElementById('positionZSlider').addEventListener('input', updateSelectedObjectPositionZ);
        // Start animation loop
        animate();
        
        isInitialized = true;
    }
    
    // Convert blueprint to 3D
   function convertBlueprintTo3D(blueprintData) {
    // Clear any existing blueprint elements
    clearBlueprintElements();
    
    const elements = blueprintData.elements;
    const scale = blueprintData.scale || 1;
    
    // Récupérer la taille de la grille du blueprint
    gridSize = blueprintData.gridSize || 20;
    
    elements.forEach(element => {
        switch(element.type) {
            case 'wall':
                createWall(element, scale);
                break;
            case 'door':
                createDoor(element, scale);
                break;
            case 'window':
                createWindow(element, scale);
                break;
            case 'column':
                createColumn(element, scale);
                break;
        }
    });
}
    
    // Clear existing blueprint elements
    function clearBlueprintElements() {
        // Find and remove blueprint elements
        scene.children.forEach(child => {
            if (child.userData && child.userData.isBlueprintElement) {
                scene.remove(child);
            }
        });
    }
    
    // Create a wall
function createWall(element, scale) {
    const start = new THREE.Vector3(element.x1 / gridSize, 0, element.y1 / gridSize);
    const end = new THREE.Vector3(element.x2 / gridSize, 0, element.y2 / gridSize);
    
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    
    // Skip very short walls
    if (length < 0.1) return;
    
    const wallHeight = 3;
    const wallThickness = 0.2;
    
    // Create wall geometry - IMPORTANT: We need to create the box along the right axis
    // BoxGeometry creates a box along the x-axis by default
    const wallGeometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.7,
        metalness: 0.2
    });
    
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.castShadow = true;
    wall.receiveShadow = true;
    
    // Position the wall at the midpoint between start and end
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    wall.position.set(midpoint.x, wallHeight / 2, midpoint.z);
    
    // Calculate rotation based on direction
    const angle = Math.atan2(direction.x, direction.z);
    wall.rotation.y = angle;
    
    // Apply a rotation to fix the wall orientation
    // This ensures the wall's length is along the direction vector
    wall.rotateY(Math.PI / 2); // Rotate 90 degrees to align with the direction
    
    // Mark as blueprint element
    wall.userData.isBlueprintElement = true;
    
    scene.add(wall);
}
    
    // Create a door
    function createDoor(element, scale) {
        const start = new THREE.Vector3(element.x1 / gridSize, 0, element.y1 / gridSize);
    const end = new THREE.Vector3(element.x2 / gridSize, 0, element.y2 / gridSize);
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        
        // Skip very short doors
        if (length < 0.1) return;
        
        direction.normalize();
        
        const doorHeight = 2.2;
        const doorThickness = 0.05;
        
        // Create door frame
        const frameGeometry = new THREE.BoxGeometry(length, doorHeight, doorThickness);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const door = new THREE.Mesh(frameGeometry, frameMaterial);
        door.castShadow = true;
        door.receiveShadow = true;
        
        // Position and orient the door
        door.position.copy(start).add(direction.multiplyScalar(length / 2));
        door.position.y = doorHeight / 2;
        
        // Calculate rotation based on direction
        const angle = Math.atan2(direction.x, direction.z);
        door.rotation.y = angle;
        
        // Mark as blueprint element
        door.userData.isBlueprintElement = true;
        
        scene.add(door);
    }
    
    // Create a window
    function createWindow(element, scale) {
        const start = new THREE.Vector3(element.x1 / 50, 0, element.y1 / 50);
        const end = new THREE.Vector3(element.x2 / 50, 0, element.y2 / 50);
        
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        
        // Skip very short windows
        if (length < 0.1) return;
        
        direction.normalize();
        
        const windowHeight = 1.2;
        const windowThickness = 0.05;
        const windowBottom = 1.0; // Height from ground to bottom of window
        
        // Create window
        const windowGeometry = new THREE.BoxGeometry(length, windowHeight, windowThickness);
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.5,
            roughness: 0.2,
            metalness: 0.8
        });
        
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.castShadow = false;
        window.receiveShadow = false;
        
        // Position and orient the window
        window.position.copy(start).add(direction.multiplyScalar(length / 2));
        window.position.y = windowBottom + windowHeight / 2;
        
        // Calculate rotation based on direction
        const angle = Math.atan2(direction.x, direction.z);
        window.rotation.y = angle;
        
        // Mark as blueprint element
        window.userData.isBlueprintElement = true;
        
        scene.add(window);
    }
    
    // Create a column
    function createColumn(element, scale) {
        const position = new THREE.Vector3(element.x / 50, 0, element.y / 50);
        
        const columnHeight = 3.2;
        const columnRadius = element.radius / 50;
        
        // Create column
        const columnGeometry = new THREE.CylinderGeometry(columnRadius, columnRadius, columnHeight, 16);
        const columnMaterial = new THREE.MeshStandardMaterial({
            color: 0x777777,
            roughness: 0.5,
            metalness: 0.5
        });
        
        const column = new THREE.Mesh(columnGeometry, columnMaterial);
        column.castShadow = true;
        column.receiveShadow = true;
        
        // Position the column
        column.position.copy(position);
        column.position.y = columnHeight / 2;
        
        // Mark as blueprint element
        column.userData.isBlueprintElement = true;
        
        scene.add(column);
    }
    
    // Add warehouse item
    function addItem(itemType) {
        let mesh;
        
        switch(itemType) {
            case 'pallet':
                mesh = createPallet();
                break;
            case 'rack':
                mesh = createRack();
                break;
            case 'forklift':
                mesh = createForklift();
                break;
            case 'box':
                mesh = createBox();
                break;
            case 'barrel':
                mesh = createBarrel();
                break;
            default:
                return;
        }
        
        // Position object on ground
        mesh.position.y = 0;
        
        // Add object to scene and our list
        scene.add(mesh);
        objects.push(mesh);
        
        // Select the new object
        selectObject(mesh);
    }
    
    // Create a pallet
    function createPallet() {
        const pallet = new THREE.Group();
        pallet.userData.type = 'pallet';
        
        // Create the base
        const baseGeometry = new THREE.BoxGeometry(1.2, 0.12, 0.8);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.2
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.06;
        base.castShadow = true;
        base.receiveShadow = true;
        pallet.add(base);
        
        // Create the slats
        const slatGeometry = new THREE.BoxGeometry(1.2, 0.05, 0.1);
        for (let i = -0.3; i <= 0.3; i += 0.3) {
            const slat = new THREE.Mesh(slatGeometry, baseMaterial);
            slat.position.set(0, 0.18, i);
            slat.castShadow = true;
            slat.receiveShadow = true;
            pallet.add(slat);
        }
        
        return pallet;
    }
    
    // Create a storage rack
   // Create an industrial rack
function createRack() {
    const rack = new THREE.Group();
    rack.userData.type = 'rack';
    
    // Matériaux
    const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.5,
        metalness: 0.7
    });
    
    const shelfMaterial = new THREE.MeshStandardMaterial({
        color: 0xCC8844,
        roughness: 0.8,
        metalness: 0.2
    });
    
    // Dimensions
    const rackWidth = 2.8;
    const rackHeight = 4.0;
    const rackDepth = 1.2;
    const postWidth = 0.08;
    const levelHeight = 1.0;
    const beamHeight = 0.12;
    const beamWidth = 0.08;
    const shelfThickness = 0.03;
    
    // Montants verticaux (posts)
    const postGeometry = new THREE.BoxGeometry(postWidth, rackHeight, postWidth);
    const postPositions = [
        { x: -rackWidth/2, z: -rackDepth/2 },
        { x: rackWidth/2, z: -rackDepth/2 },
        { x: -rackWidth/2, z: rackDepth/2 },
        { x: rackWidth/2, z: rackDepth/2 }
    ];
    
    postPositions.forEach(pos => {
        const post = new THREE.Mesh(postGeometry, metalMaterial);
        post.position.set(pos.x, rackHeight/2, pos.z);
        post.castShadow = true;
        post.receiveShadow = true;
        rack.add(post);
    });
    
    // Traverses horizontales (beams) - Face avant et arrière
    const frontBeamGeometry = new THREE.BoxGeometry(rackWidth, beamHeight, beamWidth);
    
    // Créer des traverses à chaque niveau
    for (let level = 1; level <= 3; level++) {
        const y = level * levelHeight;
        
        // Traverses avant et arrière
        [-rackDepth/2, rackDepth/2].forEach(z => {
            const beam = new THREE.Mesh(frontBeamGeometry, metalMaterial);
            beam.position.set(0, y, z);
            beam.castShadow = true;
            beam.receiveShadow = true;
            rack.add(beam);
        });
        
        // Traverses latérales (côtés)
        const sideBeamGeometry = new THREE.BoxGeometry(beamWidth, beamHeight, rackDepth);
        [-rackWidth/2, rackWidth/2].forEach(x => {
            const beam = new THREE.Mesh(sideBeamGeometry, metalMaterial);
            beam.position.set(x, y, 0);
            beam.castShadow = true;
            beam.receiveShadow = true;
            rack.add(beam);
        });
        
        // Étagères (shelves)
        const shelfGeometry = new THREE.BoxGeometry(rackWidth - 0.1, shelfThickness, rackDepth - 0.1);
        const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
        shelf.position.set(0, y + beamHeight/2 + shelfThickness/2, 0);
        shelf.castShadow = true;
        shelf.receiveShadow = true;
        rack.add(shelf);
    }
    
    // Diagonales (bracing) pour la stabilité
    function createDiagonal(startX, startY, startZ, endX, endY, endZ) {
        const length = Math.sqrt(
            Math.pow(endX - startX, 2) + 
            Math.pow(endY - startY, 2) + 
            Math.pow(endZ - startZ, 2)
        );
        
        const diagonalGeometry = new THREE.BoxGeometry(length, 0.04, 0.02);
        const diagonal = new THREE.Mesh(diagonalGeometry, metalMaterial);
        
        // Positionner à mi-chemin entre les points
        diagonal.position.set(
            (startX + endX) / 2,
            (startY + endY) / 2,
            (startZ + endZ) / 2
        );
        
        // Orienter la diagonale
        diagonal.lookAt(new THREE.Vector3(endX, endY, endZ));
        
        diagonal.castShadow = true;
        diagonal.receiveShadow = true;
        rack.add(diagonal);
    }
    
    // Diagonales sur les côtés
    createDiagonal(-rackWidth/2, 0, -rackDepth/2, -rackWidth/2, rackHeight, rackDepth/2);
    createDiagonal(rackWidth/2, 0, -rackDepth/2, rackWidth/2, rackHeight, rackDepth/2);
    createDiagonal(-rackWidth/2, 0, rackDepth/2, -rackWidth/2, rackHeight, -rackDepth/2);
    createDiagonal(rackWidth/2, 0, rackDepth/2, rackWidth/2, rackHeight, -rackDepth/2);
    
    // Diagonales sur l'arrière
    createDiagonal(-rackWidth/2, 0, -rackDepth/2, rackWidth/2, rackHeight, -rackDepth/2);
    createDiagonal(rackWidth/2, 0, -rackDepth/2, -rackWidth/2, rackHeight, -rackDepth/2);
    
    // Ajuster la position pour que la base soit au niveau du sol
    rack.position.y = 0;
    
    return rack;
}
    
    // Create a forklift
    function createForklift() {
        const forklift = new THREE.Group();
        forklift.userData.type = 'forklift';
        
        // Main body
        const bodyGeometry = new THREE.BoxGeometry(1.2, 1, 2);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xffcc00,
            roughness: 0.7,
            metalness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        body.receiveShadow = true;
        forklift.add(body);
        
        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Wheel positions
        const wheelPositions = [
            { x: -0.5, y: 0.3, z: 0.6 },
            { x: 0.5, y: 0.3, z: 0.6 },
            { x: -0.5, y: 0.3, z: -0.6 },
            { x: 0.5, y: 0.3, z: -0.6 }
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.rotation.x = Math.PI / 2;
            wheel.castShadow = true;
            wheel.receiveShadow = true;
            forklift.add(wheel);
        });
        
        // Forks
        const forkGeometry = new THREE.BoxGeometry(0.1, 0.05, 1);
        const forkMaterial = new THREE.MeshStandardMaterial({
            color: 0x777777,
            roughness: 0.5,
            metalness: 0.5
        });
        
        // Fork positions
        const forkPositions = [
            { x: -0.3, y: 0.2, z: -1.2 },
            { x: 0.3, y: 0.2, z: -1.2 }
        ];
        
        forkPositions.forEach(pos => {
            const fork = new THREE.Mesh(forkGeometry, forkMaterial);
            fork.position.set(pos.x, pos.y, pos.z);
            fork.castShadow = true;
            fork.receiveShadow = true;
            forklift.add(fork);
        });
        
        // Lifting mast
        const mastGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.1);
        const mastMaterial = new THREE.MeshStandardMaterial({
            color: 0x777777,
            roughness: 0.5,
            metalness: 0.5
        });
        
        const mast = new THREE.Mesh(mastGeometry, mastMaterial);
        mast.position.set(0, 0.9, -0.9);
        mast.castShadow = true;
        mast.receiveShadow = true;
        forklift.add(mast);
        
        // Seat
        const seatGeometry = new THREE.BoxGeometry(0.6, 0.1, 0.6);
        const seatMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const seat = new THREE.Mesh(seatGeometry, seatMaterial);
        seat.position.set(0, 1.1, 0.3);
        seat.castShadow = true;
        seat.receiveShadow = true;
        forklift.add(seat);
        
        // Steering wheel
        const steeringGeometry = new THREE.TorusGeometry(0.2, 0.03, 16, 24);
        const steeringMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.7,
            metalness: 0.3
        });
        
        const steering = new THREE.Mesh(steeringGeometry, steeringMaterial);
        steering.position.set(0, 1.2, 0.7);
        steering.rotation.x = Math.PI / 2;
        steering.castShadow = true;
        steering.receiveShadow = true;
        forklift.add(steering);
        
        return forklift;
    }
    
    // Create a box
    function createBox() {
        const boxGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const boxMaterial = new THREE.MeshStandardMaterial({
            color: 0xA52A2A,
            roughness: 0.7,
            metalness: 0.3
        });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.y = 0.3; // Half height
        box.castShadow = true;
        box.receiveShadow = true;
        box.userData.type = 'box';
        
        return box;
    }
    
    // Create a barrel
    function createBarrel() {
        const barrelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 24);
        const barrelMaterial = new THREE.MeshStandardMaterial({
            color: 0x1E90FF,
            roughness: 0.6,
            metalness: 0.4
        });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.position.y = 0.4; // Half height
        barrel.castShadow = true;
        barrel.receiveShadow = true;
        barrel.userData.type = 'barrel';
        
        return barrel;
    }
    
    // Select an object
    function selectObject(object) {
        // Deselect previous object
        if (selectedObject) {
            if (selectedObject.userData.outlineMesh) {
                scene.remove(selectedObject.userData.outlineMesh);
                delete selectedObject.userData.outlineMesh;
            }
        }
        
        selectedObject = object;
        
        if (selectedObject) {
            // Show object controls
            document.getElementById('objectControls').style.display = 'block';
            
            // Update sliders
            document.getElementById('scaleSlider').value = selectedObject.scale.x;
            document.getElementById('rotationSlider').value = (selectedObject.rotation.y * 180 / Math.PI) % 360;
            document.getElementById('heightSlider').value = selectedObject.position.y;
            
            // Add outline to selected object
            createSelectionOutline(selectedObject);
        } else {
            // Hide controls if no object selected
            document.getElementById('objectControls').style.display = 'none';
        }
    }
    
    // Create a selection outline
    function createSelectionOutline(object) {
        const boxHelper = new THREE.BoxHelper(object, 0xffff00);
        scene.add(boxHelper);
        object.userData.outlineMesh = boxHelper;
    }
    
    // Mouse click for selection
    function onMouseClick(event) {
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the raycaster
        raycaster.setFromCamera(mouse, camera);
        
        // Find intersected objects
        const intersects = raycaster.intersectObjects(objects, true);
        
        if (intersects.length > 0) {
            // Find the parent object if it's a group
            let selectedObj = intersects[0].object;
            while(selectedObj.parent && !objects.includes(selectedObj)) {
                selectedObj = selectedObj.parent;
            }
            
            if (objects.includes(selectedObj)) {
                selectObject(selectedObj);
            }
        } else {
            // Deselect if clicking elsewhere
            selectObject(null);
        }
    }
    
    // Update object scale
    function updateSelectedObjectScale() {
        if (selectedObject) {
            const scale = parseFloat(document.getElementById('scaleSlider').value);
            selectedObject.scale.set(scale, scale, scale);
            
            // Update outline
            if (selectedObject.userData.outlineMesh) {
                scene.remove(selectedObject.userData.outlineMesh);
                createSelectionOutline(selectedObject);
            }
        }
    }
    
    // Update object rotation
    function updateSelectedObjectRotation() {
        if (selectedObject) {
            const rotation = parseFloat(document.getElementById('rotationSlider').value) * Math.PI / 180;
            selectedObject.rotation.y = rotation;
            
            // Update outline
            if (selectedObject.userData.outlineMesh) {
                scene.remove(selectedObject.userData.outlineMesh);
                createSelectionOutline(selectedObject);
            }
        }
    }
    
    // Update object height
    function updateSelectedObjectHeight() {
        if (selectedObject) {
            const height = parseFloat(document.getElementById('heightSlider').value);
            selectedObject.position.y = height;
            
            // Update outline
            if (selectedObject.userData.outlineMesh) {
                scene.remove(selectedObject.userData.outlineMesh);
                createSelectionOutline(selectedObject);
            }
        }
    }
    
    // Delete selected object
    function deleteSelectedObject() {
        if (selectedObject) {
            // Remove outline
            if (selectedObject.userData.outlineMesh) {
                scene.remove(selectedObject.userData.outlineMesh);
            }
            
            // Remove from scene
            scene.remove(selectedObject);
            
            // Remove from our list
            const index = objects.indexOf(selectedObject);
            if (index > -1) {
                objects.splice(index, 1);
            }
            
            // Deselect
            selectedObject = null;
            document.getElementById('objectControls').style.display = 'none';
        }
    }
    
    // Window resize handler
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
        
        // Update outlines to follow objects
        objects.forEach(object => {
            if (object.userData.outlineMesh) {
                object.userData.outlineMesh.update();
            }
        });
    }
    
    // Public methods
    return {
        initialize: initialize,
        convertBlueprintTo3D: convertBlueprintTo3D
    };
})();