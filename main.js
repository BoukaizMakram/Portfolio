import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// Debug command - expose immediately
window.debug = () => {
    const cam = document.getElementById('camera-info');
    const ctrl = document.getElementById('controls-panel');
    if (cam) cam.style.display = cam.style.display === 'none' ? 'block' : 'none';
    if (ctrl) ctrl.style.display = ctrl.style.display === 'none' ? 'block' : 'none';
    console.log('Toggled:', cam?.style.display, ctrl?.style.display);
};
window.toggleDebug = window.debug;
console.log('Type debug() to toggle panels');

// Container dimensions for OS interface
let containerWidth = 1890;
let containerHeight = 1280;

// Base UI values for 3D interface positioning
let baseScale = 0.0007;
let baseOffsetX = 0;
let baseOffsetY = 0.23;
let baseOffsetZ = 0.05;
let baseRotationX = 0;
let baseRotationY = 0;
let baseRotationZ = 0;

// Renderer setup
const canvas = document.querySelector('#webgl');
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;  // PCF for better quality
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;  // Increased to make HDR background more visible
renderer.outputColorSpace = THREE.SRGBColorSpace;

// CSS3D Renderer for UI in 3D space
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.position = 'absolute';
cssRenderer.domElement.style.top = '0';
cssRenderer.domElement.style.left = '0';
cssRenderer.domElement.style.pointerEvents = 'none';
cssRenderer.domElement.style.zIndex = '500';
document.body.appendChild(cssRenderer.domElement);

// These will be set from the GLTF file
let scene = null;
let camera = null;
let controls = null;
let glassObject = null;

// Light references for controls
let keyLight = null;
let fillLight = null;
let ambientLight = null;
let rimLight = null;

// Light helper references
let keyLightHelper = null;
let fillLightHelper = null;
let rimLightHelper = null;

const loadingScreen = document.getElementById('loading-screen');
const loadingBarFill = document.getElementById('loading-bar-fill');

// Load GLB scene
const gltfLoader = new GLTFLoader();
gltfLoader.load(
    './model/portfolio.glb',
    (gltf) => {
        console.log('GLB loaded, now loading HDR...');
        loadHDREnvironment(gltf);
    },
    (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        loadingBarFill.style.width = (percent * 0.5) + '%';
    },
    (error) => {
        console.error('Error loading GLB:', error);
        loadingScreen.innerHTML = '<p style="color: red;">Error loading 3D scene</p>';
    }
);

// TEMPORARY: Test scene with box (commented out)
// setupSimpleTestScene();

// Simple test scene setup
function setupSimpleTestScene() {
    console.log('Setting up simple test scene with box...');

    // Create a new scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Create camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 2, 5);

    // Create box geometry - this will be our "glass" object
    const boxGeometry = new THREE.BoxGeometry(2, 2, 0.1);
    const boxMaterial = new THREE.MeshStandardMaterial({
        color: 0x4488ff,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.8
    });

    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(0, 1.5, 0);
    box.rotation.y = -Math.PI / 2; // Rotate -90 degrees (270 degrees)
    box.name = 'test-box';
    scene.add(box);

    // Set this box as the glassObject for UI positioning
    glassObject = box;
    console.log('Created test box as glassObject');

    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Add grid helper for reference
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    // Setup orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.5, 0);
    controls.update();

    // Hide loading screen
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 500);

    console.log('Simple test scene ready!');
}

// Function to load HDR after GLTF
function loadHDREnvironment(gltf) {
    const exrLoader = new EXRLoader();

    exrLoader.load(
        './model/2k.exr',
        (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.needsUpdate = true;

            console.log('HDR environment loaded successfully');
            console.log('HDR texture details:', {
                width: texture.image?.width,
                height: texture.image?.height,
                type: texture.type,
                format: texture.format
            });

            // Setup scene with both GLTF and HDR
            setupScene(gltf, texture);
        },
        (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            loadingBarFill.style.width = (50 + percent * 0.5) + '%';
        },
        (error) => {
            console.error('Error loading HDR:', error);
            // Setup scene without HDR
            setupScene(gltf, null);
        }
    );
}

// Function to setup the complete scene
function setupScene(gltf, envTexture) {
    // Use the entire scene from GLTF
    scene = gltf.scene;

            // Apply HDR environment map
            if (envTexture) {
                // Use HDR for environment lighting and reflections only
                scene.environment = envTexture;
                console.log('HDR environment applied (no background)');
            } else {
                console.warn('HDR not loaded');
            }

            // No background - transparent
            scene.background = null;

            // Check if materials need environment map updates and debug them
            let materialsNeedingEnv = 0;
            scene.traverse((child) => {
                if (child.isMesh && child.material) {
                    const mat = child.material;

                    // Log material properties that could block background
                    if (mat.name) {
                        console.log(`Material "${mat.name}":`, {
                            type: mat.type,
                            transparent: mat.transparent,
                            opacity: mat.opacity,
                            side: mat.side,
                            depthWrite: mat.depthWrite,
                            colorSpace: mat.colorSpace
                        });
                    }

                    // Ensure materials can receive environment lighting
                    if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                        materialsNeedingEnv++;
                        mat.needsUpdate = true;
                    }
                }
            });
            console.log(`Materials that can use environment: ${materialsNeedingEnv}`);

            // Add lights for proper scene illumination
            // Key Light (main directional light from top-front-right)
            keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
            keyLight.position.set(5, 10, 8);
            keyLight.castShadow = false;  // Disabled by default
            keyLight.shadow.mapSize.width = 4096;
            keyLight.shadow.mapSize.height = 4096;
            keyLight.shadow.camera.near = 0.1;
            keyLight.shadow.camera.far = 50;
            // Larger shadow camera area = larger light source = softer shadows
            keyLight.shadow.camera.left = -20;
            keyLight.shadow.camera.right = 20;
            keyLight.shadow.camera.top = 20;
            keyLight.shadow.camera.bottom = -20;
            keyLight.shadow.bias = -0.00001;  // Very small bias for tight contact shadows
            keyLight.shadow.radius = 8;  // Blur radius for soft edges
            scene.add(keyLight);

            // Fill Light (from opposite side)
            fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
            fillLight.position.set(-5, 8, -3);
            fillLight.castShadow = false;
            fillLight.shadow.mapSize.width = 2048;
            fillLight.shadow.mapSize.height = 2048;
            fillLight.shadow.camera.near = 0.1;
            fillLight.shadow.camera.far = 50;
            fillLight.shadow.camera.left = -40;
            fillLight.shadow.camera.right = 40;
            fillLight.shadow.camera.top = 40;
            fillLight.shadow.camera.bottom = -40;
            fillLight.shadow.bias = -0.001;
            fillLight.shadow.radius = 10;
            scene.add(fillLight);

            // Ambient Light (overall base illumination)
            ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
            scene.add(ambientLight);

            // Rim Light (from behind to add depth)
            rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
            rimLight.position.set(0, 5, -10);
            rimLight.castShadow = false;
            rimLight.shadow.mapSize.width = 2048;
            rimLight.shadow.mapSize.height = 2048;
            rimLight.shadow.camera.near = 0.1;
            rimLight.shadow.camera.far = 50;
            rimLight.shadow.camera.left = -40;
            rimLight.shadow.camera.right = 40;
            rimLight.shadow.camera.top = 40;
            rimLight.shadow.camera.bottom = -40;
            rimLight.shadow.bias = -0.001;
            rimLight.shadow.radius = 10;
            scene.add(rimLight);

            // Add light helpers (visual gizmos)
            keyLightHelper = new THREE.DirectionalLightHelper(keyLight, 2, 0xff0000);
            keyLightHelper.visible = false; // Hidden by default
            scene.add(keyLightHelper);

            fillLightHelper = new THREE.DirectionalLightHelper(fillLight, 2, 0x00ff00);
            fillLightHelper.visible = false; // Hidden by default
            scene.add(fillLightHelper);

            rimLightHelper = new THREE.DirectionalLightHelper(rimLight, 2, 0x0000ff);
            rimLightHelper.visible = false; // Hidden by default
            scene.add(rimLightHelper);

            console.log('Added professional 4-light setup');

            // Setup light controls
            setupLightControls();

            // Debug info
            console.log('Scene background:', scene.background);
            console.log('Scene environment:', scene.environment);
            console.log('Renderer exposure:', renderer.toneMappingExposure);

        // Find objects in the GLTF scene and debug
        let meshCount = 0;
        let materialCount = 0;
        scene.traverse((child) => {
            // Disable shadows on meshes by default (can be enabled via controls)
            if (child.isMesh) {
                meshCount++;
                child.castShadow = false;
                child.receiveShadow = false;
                if (child.material) {
                    materialCount++;
                }
            }
        });

        console.log(`Total meshes: ${meshCount}, materials: ${materialCount}`);

        // Create a custom camera with fixed starting position
        camera = new THREE.PerspectiveCamera(
            50,
            window.innerWidth / window.innerHeight,
            0.1,
            10000
        );

        // Set camera to exact starting position
        camera.position.set(5.77, 3.75, 6.42);

        console.log('Created custom camera');
        console.log('Camera position:', camera.position);

        // Setup OrbitControls with the canvas (disabled for locked parallax view)
        controls = new OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 0.5;
        controls.maxDistance = 20;

        // Set controls target (what camera is looking at)
        controls.target.set(-0.42, 1.33, -0.24);

        // Enable camera bounds
        controls.minPolarAngle = Math.PI * 0.1;  // Prevent going too high
        controls.maxPolarAngle = Math.PI * 0.85; // Prevent going below ground

        controls.update();
        console.log('Controls target set to:', controls.target);

        // Setup parallax mouse tracking (listener only, not active yet)
        setupParallax();

        // Create invisible boundary box with beveled edges
        createBoundaryBox();

        // Hide loading screen
        loadingBarFill.style.width = '100%';
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 600);
        }, 400);

        console.log('GLB scene loaded successfully');
        console.log('Scene has', scene.children.length, 'objects');

        // List all cameras and lights in the scene
        const cameras = [];
        const lights = [];
        scene.traverse((child) => {
            if (child.isCamera) cameras.push(child.name || 'Unnamed Camera');
            if (child.isLight) lights.push(`${child.type} - ${child.name || 'Unnamed'}`);
        });
        console.log('Cameras:', cameras);
        console.log('Lights:', lights);
}

// Handle window resize
window.addEventListener('resize', () => {
    if (camera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
});

// Camera info display
function updateCameraInfo() {
    if (!camera || !controls) return;

    const camPos = document.getElementById('cam-pos');
    const camRot = document.getElementById('cam-rot');
    const camTarget = document.getElementById('cam-target');

    if (camPos) {
        camPos.textContent = `(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`;
    }
    if (camRot) {
        camRot.textContent = `(${(camera.rotation.x * 180 / Math.PI).toFixed(1)}°, ${(camera.rotation.y * 180 / Math.PI).toFixed(1)}°, ${(camera.rotation.z * 180 / Math.PI).toFixed(1)}°)`;
    }
    if (camTarget) {
        camTarget.textContent = `(${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)})`;
    }
}

// Camera boundary constraints
const cameraBounds = {
    minX: -15,
    maxX: 15,
    minY: 1,
    maxY: 15,
    minZ: -15,
    maxZ: 15,
    softZone: 2  // Soft boundary zone for smooth easing
};

// Function to constrain camera position with smooth easing
function constrainCamera() {
    if (!camera || !controls) return;

    // Smooth boundary constraint with easing
    const easeOutOfBounds = (value, min, max, softZone) => {
        if (value < min) {
            const distance = min - value;
            const damping = Math.min(distance / softZone, 1);
            return value + distance * damping * 0.15;  // Smooth push back
        } else if (value > max) {
            const distance = value - max;
            const damping = Math.min(distance / softZone, 1);
            return value - distance * damping * 0.15;  // Smooth push back
        }
        return value;
    };

    // Apply smooth constraints to each axis
    camera.position.x = easeOutOfBounds(camera.position.x, cameraBounds.minX, cameraBounds.maxX, cameraBounds.softZone);
    camera.position.y = easeOutOfBounds(camera.position.y, cameraBounds.minY, cameraBounds.maxY, cameraBounds.softZone);
    camera.position.z = easeOutOfBounds(camera.position.z, cameraBounds.minZ, cameraBounds.maxZ, cameraBounds.softZone);
}

// Parallax effect state
let baseCameraPosition = null;
let baseControlsTarget = null;
let parallaxMouseX = 0;
let parallaxMouseY = 0;
let currentParallaxX = 0;
let currentParallaxY = 0;
const parallaxStrength = 0.02; // How much the look-target shifts
const parallaxSmoothing = 0.015; // Lerp factor for smooth movement

function setupParallax() {
    window.addEventListener('mousemove', (event) => {
        // Normalize mouse to -1 to 1
        parallaxMouseX = (event.clientX / window.innerWidth) * 2 - 1;
        parallaxMouseY = (event.clientY / window.innerHeight) * 2 - 1;
    });
}

let experienceActive = false;

function enterExperience() {
    experienceActive = true;
    controls.enabled = false;
    baseCameraPosition = camera.position.clone();
    baseControlsTarget = controls.target.clone();
    canvas.style.cursor = 'pointer';

    // Hide start button if visible
    const startBtn = document.getElementById('start-experience');
    if (startBtn) startBtn.style.display = 'none';
}

function exitExperience() {
    experienceActive = false;
    baseCameraPosition = null;
    baseControlsTarget = null;
    currentParallaxX = 0;
    currentParallaxY = 0;
    controls.enabled = true;
    canvas.style.cursor = 'default';

    // Show start button again
    const startBtn = document.getElementById('start-experience');
    if (startBtn) startBtn.style.display = '';
}

// Start Experience button
const startExperienceBtn = document.getElementById('start-experience');
if (startExperienceBtn) {
    startExperienceBtn.addEventListener('click', () => {
        // Animate camera to the monitor view
        animateCameraTo(
            { x: -0.25, y: 1.7, z: 1.2 },
            { x: -0.25, y: 1.62, z: -0.07 }
        );

        // After animation: lock view, enable parallax, open OS
        setTimeout(() => {
            enterExperience();
            openOSInterface();
        }, 1600);
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (scene && camera) {
        if (controls) controls.update();

        // Apply parallax by shifting the look-target (no camera tilt)
        if (baseCameraPosition && baseControlsTarget) {
            currentParallaxX += (parallaxMouseX - currentParallaxX) * parallaxSmoothing;
            currentParallaxY += (parallaxMouseY - currentParallaxY) * parallaxSmoothing;

            controls.target.x = baseControlsTarget.x + currentParallaxX * parallaxStrength;
            controls.target.y = baseControlsTarget.y - currentParallaxY * parallaxStrength;
        }

        constrainCamera();  // Apply camera bounds
        updateCameraInfo();
        renderer.render(scene, camera);
        cssRenderer.render(scene, camera);
    }
}

animate();

// Raycaster for click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Camera animation state
let cameraAnimating = false;
let animationProgress = 0;
let startPosition = new THREE.Vector3();
let startTarget = new THREE.Vector3();
let endPosition = new THREE.Vector3();
let endTarget = new THREE.Vector3();

// Function to smoothly animate camera to target position
function animateCameraTo(targetPos, targetLookAt, duration = 1.5) {
    if (cameraAnimating) return; // Prevent overlapping animations

    cameraAnimating = true;
    animationProgress = 0;

    // Store start positions
    startPosition.copy(camera.position);
    startTarget.copy(controls.target);

    // Set end positions
    endPosition.set(targetPos.x, targetPos.y, targetPos.z);
    endTarget.set(targetLookAt.x, targetLookAt.y, targetLookAt.z);

    const startTime = performance.now();

    function updateAnimation() {
        const elapsed = (performance.now() - startTime) / 1000;
        animationProgress = Math.min(elapsed / duration, 1);

        // Easing function (easeInOutCubic)
        const t = animationProgress < 0.5
            ? 4 * animationProgress * animationProgress * animationProgress
            : 1 - Math.pow(-2 * animationProgress + 2, 3) / 2;

        // Interpolate camera position
        camera.position.lerpVectors(startPosition, endPosition, t);
        controls.target.lerpVectors(startTarget, endTarget, t);

        if (animationProgress < 1) {
            requestAnimationFrame(updateAnimation);
        } else {
            cameraAnimating = false;
        }
    }

    controls.enabled = false; // Disable controls during animation
    updateAnimation();
}

// OS Interface state
let osInterfaceActive = false;
let cssObject = null;
let osContainer = null;

// Test button for OS interface
const testOsBtn = document.getElementById('test-os');
if (testOsBtn) {
    testOsBtn.addEventListener('click', () => {
        console.log('Test OS button clicked');
        if (osInterfaceActive) {
            closeOSInterface();
        } else {
            openOSInterface();
        }
    });
}

// Listen for messages from OS iframe
window.addEventListener('message', (event) => {
    if (event.data === 'closeOS') {
        closeOSInterface();
    }
    // Forward iframe mousemove to parallax
    if (event.data && event.data.type === 'mousemove') {
        parallaxMouseX = (event.data.clientX / event.data.iframeWidth) * 2 - 1;
        parallaxMouseY = (event.data.clientY / event.data.iframeHeight) * 2 - 1;
    }
});

function closeOSInterface() {
    osInterfaceActive = false;

    // Remove CSS3D object from scene
    if (cssObject && cssObject.parent) {
        cssObject.parent.remove(cssObject);
        cssObject = null;
    }

    // Remove iframe container from DOM
    if (osContainer) {
        osContainer.remove();
        osContainer = null;
    }

    // Reset pointer events
    cssRenderer.domElement.style.pointerEvents = 'none';

    // Exit experience - restore orbit controls, disable parallax
    exitExperience();
}

// Open OS interface
function openOSInterface() {
    console.log('openOSInterface called, glassObject:', glassObject);

    if (!glassObject) {
        console.warn('Plane.026 object not found, searching for it...');
        scene.traverse((child) => {
            if (child.name && (child.name === 'Plane.026' || child.name === 'Plane026' || child.name.toLowerCase().includes('plane.026'))) {
                glassObject = child;
            }
        });

        if (!glassObject) {
            console.error('Could not find Plane.026 object in scene!');
            glassObject = {
                position: new THREE.Vector3(0, 1.5, 0),
                quaternion: new THREE.Quaternion(),
                matrixWorld: new THREE.Matrix4(),
                updateMatrixWorld: function() {
                    this.matrixWorld.compose(this.position, this.quaternion, new THREE.Vector3(1, 1, 1));
                }
            };
        }
    }

    osInterfaceActive = true;

    // Create iframe container
    osContainer = document.createElement('div');
    osContainer.style.width = `${containerWidth}px`;
    osContainer.style.height = `${containerHeight}px`;
    osContainer.style.overflow = 'hidden';
    osContainer.style.borderRadius = '20px';
    osContainer.style.pointerEvents = 'auto';

    const iframe = document.createElement('iframe');
    iframe.src = 'os.html';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.pointerEvents = 'auto';
    osContainer.appendChild(iframe);

    // Keep CSS renderer transparent to pointer events so OrbitControls work
    cssRenderer.domElement.style.pointerEvents = 'none';

    // Wait for next frame to ensure DOM is updated
    requestAnimationFrame(() => {
        // Create CSS3D object from the iframe container
        cssObject = new CSS3DObject(osContainer);

        // Position using glassObject
        let basePosition = new THREE.Vector3(0, 1.5, 0);
        if (glassObject) {
            glassObject.updateMatrixWorld(true);
            const glassPos = new THREE.Vector3();
            const glassQuat = new THREE.Quaternion();
            const glassScale = new THREE.Vector3();
            glassObject.matrixWorld.decompose(glassPos, glassQuat, glassScale);
            basePosition.copy(glassPos);
        }

        cssObject.position.copy(basePosition);

        // Set rotation
        const rotationEuler = new THREE.Euler(
            THREE.MathUtils.degToRad(baseRotationX),
            THREE.MathUtils.degToRad(baseRotationY),
            THREE.MathUtils.degToRad(baseRotationZ),
            'XYZ'
        );
        cssObject.quaternion.setFromEuler(rotationEuler);

        // Set scale
        cssObject.scale.set(baseScale, baseScale, baseScale);

        // Apply offset in local space
        const offset = new THREE.Vector3(baseOffsetX, baseOffsetY, baseOffsetZ);
        offset.applyQuaternion(cssObject.quaternion);
        cssObject.position.add(offset);

        // Add CSS3D object to main scene
        scene.add(cssObject);

        // Configure pointer events after CSS3D is added to scene
        requestAnimationFrame(() => {
            let parent = osContainer.parentElement;
            while (parent && parent !== document.body && parent !== cssRenderer.domElement) {
                parent.style.pointerEvents = 'none';
                parent = parent.parentElement;
            }
        });
    });
}

// Hover detection for glass.001
canvas.addEventListener('mousemove', (event) => {
    if (osInterfaceActive || cameraAnimating) return;

    // Calculate mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    let isHoveringGlass = false;

    if (intersects.length > 0) {
        const hoveredObj = intersects[0].object;

        // Check if hovering glass.001 or test-box
        let targetObj = hoveredObj;
        while (targetObj) {
            if (targetObj.name === 'glass.001' || targetObj.name === 'glass001' || targetObj.name === 'test-box') {
                isHoveringGlass = true;

                // Change cursor
                canvas.style.cursor = 'pointer';

                // Store glass object for effects
                if (!glassObject) {
                    glassObject = targetObj;
                }

                // Add subtle glow effect
                if (glassObject.material && !glassObject.userData.originalEmissive) {
                    glassObject.userData.originalEmissive = glassObject.material.emissive?.clone();
                    glassObject.userData.originalEmissiveIntensity = glassObject.material.emissiveIntensity || 0;
                }

                if (glassObject.material && glassObject.material.emissive) {
                    glassObject.material.emissive.setHex(0x4466ff);
                    glassObject.material.emissiveIntensity = 0.3;
                }

                break;
            }
            targetObj = targetObj.parent;
        }
    }

    // Reset if not hovering
    if (!isHoveringGlass) {
        canvas.style.cursor = 'default';

        if (glassObject && glassObject.material && glassObject.userData.originalEmissive) {
            glassObject.material.emissive.copy(glassObject.userData.originalEmissive);
            glassObject.material.emissiveIntensity = glassObject.userData.originalEmissiveIntensity;
        }
    }
});

// Click handler for object interaction
canvas.addEventListener('click', (event) => {
    if (cameraAnimating || osInterfaceActive) return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersected objects
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;

        // Check if clicked object is glass.001 or Plane.026 or test-box or their parent
        let targetObject = clickedObject;
        while (targetObject) {
            if (targetObject.name === 'glass.001' || targetObject.name === 'glass001' ||
                targetObject.name === 'Plane.026' || targetObject.name === 'Plane026' ||
                targetObject.name === 'test-box') {
                console.log(`Clicked on ${targetObject.name}! Animating camera and opening OS...`);

                // Animate to the target position
                animateCameraTo(
                    { x: -0.25, y: 1.7, z: 1.2 },
                    { x: -0.25, y: 1.62, z: -0.07 }
                );

                // After animation: lock view, enable parallax, open OS
                setTimeout(() => {
                    enterExperience();
                    openOSInterface();
                }, 1600);

                return;
            }
            targetObject = targetObject.parent;
        }

        console.log('Clicked object:', clickedObject.name || 'Unnamed');
    }
});

// Function to create invisible boundary box
function createBoundaryBox() {
    // Create beveled box edges (visual guide - can be made invisible)
    const boxSize = 30;
    const bevelRadius = 2;

    // We'll use a rounded box geometry
    const shape = new THREE.Shape();
    const x = -boxSize/2, y = -boxSize/2;
    const width = boxSize, height = boxSize;
    const radius = bevelRadius;

    shape.moveTo(x, y + radius);
    shape.lineTo(x, y + height - radius);
    shape.quadraticCurveTo(x, y + height, x + radius, y + height);
    shape.lineTo(x + width - radius, y + height);
    shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    shape.lineTo(x + width, y + radius);
    shape.quadraticCurveTo(x + width, y, x + width - radius, y);
    shape.lineTo(x + radius, y);
    shape.quadraticCurveTo(x, y, x, y + radius);

    const extrudeSettings = {
        depth: boxSize,
        bevelEnabled: true,
        bevelThickness: bevelRadius,
        bevelSize: bevelRadius,
        bevelSegments: 5
    };

    console.log('Boundary box created (camera constraints active)');
}

// Function to setup light control event listeners
function setupLightControls() {
    // Key Light Controls
    const keyIntensity = document.getElementById('key-intensity');
    const keyIntensityVal = document.getElementById('key-intensity-val');
    keyIntensity.addEventListener('input', (e) => {
        keyLight.intensity = parseFloat(e.target.value);
        keyIntensityVal.textContent = e.target.value;
    });

    const keyX = document.getElementById('key-x');
    const keyXVal = document.getElementById('key-x-val');
    keyX.addEventListener('input', (e) => {
        keyLight.position.x = parseFloat(e.target.value);
        keyXVal.textContent = e.target.value;
    });

    const keyY = document.getElementById('key-y');
    const keyYVal = document.getElementById('key-y-val');
    keyY.addEventListener('input', (e) => {
        keyLight.position.y = parseFloat(e.target.value);
        keyYVal.textContent = e.target.value;
    });

    const keyZ = document.getElementById('key-z');
    const keyZVal = document.getElementById('key-z-val');
    keyZ.addEventListener('input', (e) => {
        keyLight.position.z = parseFloat(e.target.value);
        keyZVal.textContent = e.target.value;
    });

    const keyRadius = document.getElementById('key-radius');
    const keyRadiusVal = document.getElementById('key-radius-val');
    keyRadius.addEventListener('input', (e) => {
        keyLight.shadow.radius = parseFloat(e.target.value);
        keyRadiusVal.textContent = e.target.value;
    });

    const keyShadow = document.getElementById('key-shadow');
    keyShadow.addEventListener('change', (e) => {
        keyLight.castShadow = e.target.checked;
    });

    // Fill Light Controls
    const fillIntensity = document.getElementById('fill-intensity');
    const fillIntensityVal = document.getElementById('fill-intensity-val');
    fillIntensity.addEventListener('input', (e) => {
        fillLight.intensity = parseFloat(e.target.value);
        fillIntensityVal.textContent = e.target.value;
    });

    const fillVisible = document.getElementById('fill-visible');
    fillVisible.addEventListener('change', (e) => {
        fillLight.visible = e.target.checked;
        fillLightHelper.visible = e.target.checked;
    });

    const fillShadow = document.getElementById('fill-shadow');
    fillShadow.addEventListener('change', (e) => {
        fillLight.castShadow = e.target.checked;
    });

    // Ambient Light Controls
    const ambientIntensity = document.getElementById('ambient-intensity');
    const ambientIntensityVal = document.getElementById('ambient-intensity-val');
    ambientIntensity.addEventListener('input', (e) => {
        ambientLight.intensity = parseFloat(e.target.value);
        ambientIntensityVal.textContent = e.target.value;
    });

    // Rim Light Controls
    const rimIntensity = document.getElementById('rim-intensity');
    const rimIntensityVal = document.getElementById('rim-intensity-val');
    rimIntensity.addEventListener('input', (e) => {
        rimLight.intensity = parseFloat(e.target.value);
        rimIntensityVal.textContent = e.target.value;
    });

    const rimVisible = document.getElementById('rim-visible');
    rimVisible.addEventListener('change', (e) => {
        rimLight.visible = e.target.checked;
        rimLightHelper.visible = e.target.checked;
    });

    const rimShadow = document.getElementById('rim-shadow');
    rimShadow.addEventListener('change', (e) => {
        rimLight.castShadow = e.target.checked;
    });

    // Helper visibility toggle
    const showHelpers = document.getElementById('show-helpers');
    showHelpers.addEventListener('change', (e) => {
        keyLightHelper.visible = e.target.checked;
        fillLightHelper.visible = e.target.checked && fillLight.visible;
        rimLightHelper.visible = e.target.checked && rimLight.visible;
    });

    console.log('Light controls setup complete');
}

// 3D UI Controls
function setupUIControls() {
    const uiScale = document.getElementById('ui-scale');
    const uiScaleVal = document.getElementById('ui-scale-val');
    const uiOffsetX = document.getElementById('ui-offset-x');
    const uiOffsetXVal = document.getElementById('ui-offset-x-val');
    const uiOffsetY = document.getElementById('ui-offset-y');
    const uiOffsetYVal = document.getElementById('ui-offset-y-val');
    const uiOffsetZ = document.getElementById('ui-offset-z');
    const uiOffsetZVal = document.getElementById('ui-offset-z-val');

    const uiWidth = document.getElementById('ui-width');
    const uiWidthVal = document.getElementById('ui-width-val');
    const uiHeight = document.getElementById('ui-height');
    const uiHeightVal = document.getElementById('ui-height-val');
    const uiMaintainRatio = document.getElementById('ui-maintain-ratio');

    const uiRotationX = document.getElementById('ui-rotation-x');
    const uiRotationXVal = document.getElementById('ui-rotation-x-val');
    const uiRotationY = document.getElementById('ui-rotation-y');
    const uiRotationYVal = document.getElementById('ui-rotation-y-val');
    const uiRotationZ = document.getElementById('ui-rotation-z');
    const uiRotationZVal = document.getElementById('ui-rotation-z-val');

    // Scale control - slider
    uiScale.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        uiScaleVal.value = value.toFixed(4);
        baseScale = value;
        updateUITransform();
    });

    // Scale control - text input
    uiScaleVal.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value >= 0.0005 && value <= 0.005) {
            uiScale.value = value;
            baseScale = value;
            updateUITransform();
        }
    });

    // Offset X control - slider
    uiOffsetX.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        uiOffsetXVal.value = value.toFixed(2);
        baseOffsetX = value;
        updateUITransform();
    });

    // Offset X control - text input
    uiOffsetXVal.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value >= -1 && value <= 1) {
            uiOffsetX.value = value;
            baseOffsetX = value;
            updateUITransform();
        }
    });

    // Offset Y control - slider
    uiOffsetY.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        uiOffsetYVal.value = value.toFixed(2);
        baseOffsetY = value;
        updateUITransform();
    });

    // Offset Y control - text input
    uiOffsetYVal.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value >= -1 && value <= 1) {
            uiOffsetY.value = value;
            baseOffsetY = value;
            updateUITransform();
        }
    });

    // Offset Z control - slider
    uiOffsetZ.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        uiOffsetZVal.value = value.toFixed(2);
        baseOffsetZ = value;
        updateUITransform();
    });

    // Offset Z control - text input
    uiOffsetZVal.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value >= -1 && value <= 2) {
            uiOffsetZ.value = value;
            baseOffsetZ = value;
            updateUITransform();
        }
    });

    // Rotation X control - slider
    uiRotationX.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        uiRotationXVal.value = value;
        baseRotationX = value;
        updateUIRotation();
        updateUITransform();
    });

    // Rotation X control - text input
    uiRotationXVal.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value >= 0 && value <= 360) {
            uiRotationX.value = value;
            baseRotationX = value;
            updateUIRotation();
            updateUITransform();
        }
    });

    // Rotation Y control - slider
    uiRotationY.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        uiRotationYVal.value = value;
        baseRotationY = value;
        updateUIRotation();
        updateUITransform();
    });

    // Rotation Y control - text input
    uiRotationYVal.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value >= 0 && value <= 360) {
            uiRotationY.value = value;
            baseRotationY = value;
            updateUIRotation();
            updateUITransform();
        }
    });

    // Rotation Z control - slider
    uiRotationZ.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        uiRotationZVal.value = value;
        baseRotationZ = value;
        updateUIRotation();
        updateUITransform();
    });

    // Rotation Z control - text input
    uiRotationZVal.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value >= 0 && value <= 360) {
            uiRotationZ.value = value;
            baseRotationZ = value;
            updateUIRotation();
            updateUITransform();
        }
    });

    function updateUIRotation() {
        if (!osContainer) return;
        const rotationTransform = `rotateX(${baseRotationX}deg) rotateY(${baseRotationY}deg) rotateZ(${baseRotationZ}deg)`;
        osContainer.style.transform = rotationTransform;
    }

    // Width control - slider
    uiWidth.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        uiWidthVal.value = value;

        if (uiMaintainRatio.checked) {
            // Maintain 16:9 ratio
            const newHeight = Math.round(value * (9/16));
            containerHeight = newHeight;
            uiHeight.value = newHeight;
            uiHeightVal.value = newHeight;
        }

        containerWidth = value;
        updateContainerSize();
    });

    // Width control - text input
    uiWidthVal.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value >= 800 && value <= 3840) {
            uiWidth.value = value;

            if (uiMaintainRatio.checked) {
                const newHeight = Math.round(value * (9/16));
                containerHeight = newHeight;
                uiHeight.value = newHeight;
                uiHeightVal.value = newHeight;
            }

            containerWidth = value;
            updateContainerSize();
        }
    });

    // Height control - slider
    uiHeight.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        uiHeightVal.value = value;

        if (uiMaintainRatio.checked) {
            // Maintain 16:9 ratio
            const newWidth = Math.round(value * (16/9));
            containerWidth = newWidth;
            uiWidth.value = newWidth;
            uiWidthVal.value = newWidth;
        }

        containerHeight = value;
        updateContainerSize();
    });

    // Height control - text input
    uiHeightVal.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value >= 450 && value <= 2160) {
            uiHeight.value = value;

            if (uiMaintainRatio.checked) {
                const newWidth = Math.round(value * (16/9));
                containerWidth = newWidth;
                uiWidth.value = newWidth;
                uiWidthVal.value = newWidth;
            }

            containerHeight = value;
            updateContainerSize();
        }
    });

    function updateContainerSize() {
        if (osContainer) {
            osContainer.style.width = `${containerWidth}px`;
            osContainer.style.height = `${containerHeight}px`;
        }

        if (cssObject) {
            const scaleMultiplier = containerWidth / 1910;
            const newScale = baseScale * scaleMultiplier;
            cssObject.scale.set(newScale, newScale, newScale);
        }
    }

    function updateUITransform() {
        if (!cssObject || !glassObject) return;

        // Update world matrices
        glassObject.updateMatrixWorld(true);

        // Get glass object world position and rotation
        const glassPosition = new THREE.Vector3();
        const glassQuaternion = new THREE.Quaternion();
        const glassScale = new THREE.Vector3();
        glassObject.matrixWorld.decompose(glassPosition, glassQuaternion, glassScale);

        // Apply scale
        cssObject.scale.set(baseScale, baseScale, baseScale);

        // Position at glass with offset
        cssObject.position.copy(glassPosition);

        // Apply rotation using values from controls (convert degrees to radians)
        const euler = new THREE.Euler().setFromQuaternion(glassQuaternion);
        const correctedEuler = new THREE.Euler(
            euler.x + THREE.MathUtils.degToRad(baseRotationX),
            euler.y + THREE.MathUtils.degToRad(baseRotationY),
            euler.z + THREE.MathUtils.degToRad(baseRotationZ),
            'XYZ'
        );
        cssObject.quaternion.setFromEuler(correctedEuler);

        // Apply offset in local space (use corrected quaternion)
        const offset = new THREE.Vector3(baseOffsetX, baseOffsetY, baseOffsetZ);
        offset.applyQuaternion(cssObject.quaternion);
        cssObject.position.add(offset);
    }

    console.log('UI controls setup complete');
}

// Initialize UI controls when scene is ready
setupUIControls();

