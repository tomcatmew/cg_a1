// Copyright Yifei Chen - University of Tokyo Creative Informatics
// For Computer Graphics homework assignment A1

var container, stats, controls;
var camera, scene, renderer, light;
var draggableObjects = [];
var endEffector = null;
var IKJointsList = [];
var targetSphereGeometry = new THREE.SphereGeometry(60, 32, 16);
var sphereGeometry = new THREE.SphereGeometry(35, 32, 16);
var boxGeometry = new THREE.BoxBufferGeometry(10, 10, 10);
var white = new THREE.MeshLambertMaterial({ color: 0x888888 });
var colorIndex = [0x888888, 0x888888, 0x888888, 0x888888, 0x888888, 0x888888]
var settings = { messageOne: "No limit", messageTwo: "No limit", messageThree: "No limit", messageFour: "No limit", messageFive: "No limit" };
init();
animate();
function init() {

  container = document.getElementById("maincanvas");
  document.body.appendChild(container);
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
  camera.position.set(170, 100, 150);
  controls = new THREE.OrbitControls(camera);
  controls.target.set(0, 45, 0);
  controls.update();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  light = new THREE.HemisphereLight(0xffffff, 0x444444);
  light.position.set(0, 200, 0);
  scene.add(light);
  light = new THREE.DirectionalLight(0xbbbbbb);
  light.position.set(0, 200, 100);
  light.castShadow = true;
  light.shadow.camera.top = 180;
  light.shadow.camera.bottom = - 100;
  light.shadow.camera.left = - 120;
  light.shadow.camera.right = 120;
  scene.add(light);

  const gui = new dat.GUI();
  gui.domElement.id = "gui";
  const cubeFolder = gui.addFolder("Joints Hinge and Limits");
  cubeFolder.add(settings, "messageOne").name("Joint 1 (grey)");
  cubeFolder.add(settings, "messageTwo").name("Joint 2 (grey)");
  cubeFolder.add(settings, "messageThree").name("Joint 3 (grey)");
  cubeFolder.add(settings, "messageFour").name("Joint 4 (grey)");
  cubeFolder.add(settings, "messageFive").name("Joint 5 (grey)");
  cubeFolder.open();

  //scene.add(new THREE.CameraHelper(light.shadow.camera));
  // ground
  var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000, 2000), new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }));
  mesh.rotation.x = - Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);
  var grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
  grid.material.opacity = 0.2;
  grid.material.transparent = true;
  scene.add(grid);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.style.margin = 0;
  document.body.style.padding = 0;
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  container.appendChild(renderer.domElement);
  window.addEventListener('resize', onWindowResize, false);

  //Initialize the Joints
  var base = addJoint(scene, [0, 0, 0], [0, 0, 0], [-180, 180], [0.5, 2, 0.5], [0, 10, 0]);
  var firstJoint = addJoint(base, [0, 20, 0], [0, 0, 0], [-90, 90], [0.5, 2, 0.5], [0, 10, 0]);
  var secondJoint = addJoint(firstJoint, [0, 20, 0], [0, 0, 0], [-90, 90], [0.5, 2, 0.5], [0, 10, 0]);
  var thirdJoint = addJoint(secondJoint, [0, 20, 0], [0, 0, 0], [-180, 180], [0.5, 2, 0.5], [0, 10, 0]);
  var fourthJoint = addJoint(thirdJoint, [0, 20, 0], [0, 0, 0], [-180, 180], [0.5, 2, 0.5], [0, 10, 0]);
  endEffector = new THREE.Group();
  var endSpere = new THREE.Mesh(sphereGeometry, new THREE.MeshLambertMaterial({ color: 0x43ae06 }));
  endEffector.add(endSpere);
  fourthJoint.add(endEffector);
  endEffector.position.set(0.0, 20, 0.0);
  endEffector.scale.set(0.075, 0.075, 0.075);

  // Initialize the target 
  var target = new THREE.Mesh(targetSphereGeometry, new THREE.MeshLambertMaterial({ color: 0xf7474b }));
  target.transparent = true;
  target.opacity = 0.5;
  target.castShadow = true;
  target.receiveShadow = true;
  target.position.set(25, 110, 0);
  target.scale.set(0.075, 0.075, 0.075);
  scene.add(target);
  draggableObjects.push(target);

  var dragControls = new THREE.DragControls(draggableObjects, camera, renderer.domElement);
  dragControls.addEventListener('dragstart', function () {
    controls.enabled = false;
  });
  dragControls.addEventListener('dragend', function () {
    controls.enabled = true;
  });
}

function addJoint(parentBone, position, axis, limits, size, graphicsOffset) {
  var joint = new THREE.Group();
  parentBone.add(joint);
  joint.position.set(position[0], position[1], position[2]);
  joint.axis = new THREE.Vector3(axis[0], axis[1], axis[2]);

  // Convert degree to radian

  joint.minLimit = limits[0] * 0.01745;
  joint.maxLimit = limits[1] * 0.01745;
  IKJointsList.push(joint);
  var box = new THREE.Mesh(boxGeometry, new THREE.MeshLambertMaterial({ color: colorIndex[IKJointsList.length] }));
  joint.add(box);
  box.scale.set(size[0], size[1], size[2]);
  box.position.set(graphicsOffset[0], graphicsOffset[1], graphicsOffset[2]);
  box.castShadow = true;
  return joint;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ----------------------------------------------------------- CCD Implementation here -----------------------------------------------------
//CCDIK Solver
function solveCCDIK(targetPosition) {
  var jointPosition = new THREE.Vector3();
  for (var i = IKJointsList.length - 1; i >= 0; i--) {
    IKJointsList[i].updateMatrixWorld();
    endEffector.getWorldPosition(jointPosition);

    // find the direction 
    var jointDirection = IKJointsList[i].worldToLocal(jointPosition.clone()).normalize();
    var targetDirection = IKJointsList[i].worldToLocal(targetPosition.clone()).normalize();
    var angleBetweenVecs = new THREE.Quaternion(0, 0, 0, 1).setFromUnitVectors(jointDirection, targetDirection);
    IKJointsList[i].quaternion.multiply(angleBetweenVecs);

    // adding hinges 
    var invRot = IKJointsList[i].quaternion.clone().inverse();
    var parentAxis = IKJointsList[i].axis.clone().applyQuaternion(invRot);
    angleBetweenVecs.setFromUnitVectors(IKJointsList[i].axis, parentAxis);
    IKJointsList[i].quaternion.multiply(angleBetweenVecs);

    // adding constraints
    var clampRotation = IKJointsList[i].rotation.toVector3().clampScalar(IKJointsList[i].minLimit, IKJointsList[i].maxLimit);
    IKJointsList[i].rotation.setFromVector3(clampRotation);

    IKJointsList[i].updateMatrixWorld();
  }
}
// ----------------------------------------------------------- CCD Implementation here -----------------------------------------------------

function animate() {
  solveCCDIK(draggableObjects[0].position);
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}