// Copyright Yifei Chen - University of Tokyo Creative Informatics
// For Computer Graphics homework assignment A1

var container, stats, controls;
var camera, scene, renderer, light;
var draggableObjects = [];
var endEffector = null;
var IKJointsList = [];
var IKJointsOffset = [];
var targetSphereGeometry = new THREE.SphereGeometry(60, 32, 16);
var sphereGeometry = new THREE.SphereGeometry(35, 32, 16);
var boxGeometry = new THREE.BoxBufferGeometry(10, 10, 10);
var white = new THREE.MeshLambertMaterial({ color: 0x888888 });
var colorIndex = [0x888888, 0x3e75b3, 0x658b42, 0x658b42, 0x888888, 0x888888]
var settings = { messageOne: "Y axis (-180, +180)", messageTwo: "X axis (-90, +90)", messageThree: "X axis (-90, +90)", messageFour: "No limit", messageFive: "No limit" };
init();
animate();
function init() {
  var a = new THREE.Vector3(1, 1, 1);
  var b = new THREE.Vector3(4, 4, 4);
  var c = a.sub(b);
  console.log(a);
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
  cubeFolder.add(settings, "messageOne").name("Joint 1 (blue)");
  cubeFolder.add(settings, "messageTwo").name("Joint 2 (green)");
  cubeFolder.add(settings, "messageThree").name("Joint 3 (green)");
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
  var base = addJoint(scene, [0, 0, 0], [0, 1, 0], [-180, 180], [0.5, 2, 0.5], [0, 10, 0]);
  var firstJoint = addJoint(base, [0, 20, 0], [1, 0, 0], [-90, 90], [0.5, 2, 0.5], [0, 10, 0]);
  var secondJoint = addJoint(firstJoint, [0, 20, 0], [1, 0, 0], [-90, 90], [0.5, 2, 0.5], [0, 10, 0]);
  var thirdJoint = addJoint(secondJoint, [0, 20, 0], [0, 0, 0], [-180, 180], [0.5, 2, 0.5], [0, 10, 0]);
  var fourthJoint = addJoint(thirdJoint, [0, 20, 0], [0, 0, 0], [-180, 180], [0.5, 2, 0.5], [0, 10, 0]);
  IKJointsOffset = [20, 20, 20, 20, 20];
  endEffector = new THREE.Group();
  var endSpere = new THREE.Mesh(sphereGeometry, new THREE.MeshLambertMaterial({ color: 0x43ae06 }));
  endEffector.add(endSpere);
  fourthJoint.add(endEffector);
  endEffector.position.set(0.0, 20, 0.0);
  endEffector.scale.set(0.075, 0.075, 0.075);

  // Initialize the target 
  var target = new THREE.Mesh(targetSphereGeometry, new THREE.MeshLambertMaterial({ color: 0xf7474b }));
  target.position.set(15, 120, 0);
  target.scale.set(0.075, 0.075, 0.075);
  target.transparent = true;
  target.opacity = 0.5;
  target.castShadow = true;
  target.receiveShadow = true;
  scene.add(target);
  draggableObjects.push(target);

  var dragControls = new THREE.DragControls(draggableObjects, camera, renderer.domElement);
  dragControls.addEventListener('dragstart', function () {
    controls.enabled = false;
  });
  dragControls.addEventListener('dragend', function () {
    controls.enabled = true;
  });

  // for (var i = 0; i <= IKJointsList.length - 1; i++) {
  //   var tempt = new THREE.Mesh(targetSphereGeometry, new THREE.MeshLambertMaterial({ color: 0xf0a219 }));
  //   // console.log(IKJointsList[i].matrixWorld.elements);
  //   var temptpos = new THREE.Vector3();
  //   IKJointsList[i].getWorldPosition(temptpos);
  //   tempt.position.set(temptpos.x, temptpos.y, temptpos.z);
  //   tempt.scale.set(0.075, 0.075, 0.075);
  //   scene.add(tempt);
  // }
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

function backward(IKglobalPositions, target) {
  IKglobalPositions[IKglobalPositions.length - 1] = new THREE.Vector3(target.x, target.y, target.z);
  for (var i = IKJointsList.length - 2; i >= 0; i--) {
    let dirBack = new THREE.Vector3();
    dirBack.subVectors(IKglobalPositions[i].clone(), IKglobalPositions[i + 1].clone());
    dirBack.normalize();
    let newPos = new THREE.Vector3();
    newPos.addVectors(IKglobalPositions[i + 1].clone(), dirBack.multiplyScalar(IKJointsOffset[i]));
    IKglobalPositions[i].x = newPos.x;
    IKglobalPositions[i].y = newPos.y;
    IKglobalPositions[i].z = newPos.z;
  }
}

function forward(IKglobalPositions, origin) {
  IKglobalPositions[0] = new THREE.Vector3(origin.x, origin.y, origin.z);
  for (var i = 1; i <= IKJointsList.length - 1; i++) {
    let dirForard = new THREE.Vector3();
    dirForard.subVectors(IKglobalPositions[i].clone(), IKglobalPositions[i - 1].clone());
    dirForard.normalize();
    let newPos = new THREE.Vector3();
    newPos.addVectors(IKglobalPositions[i - 1].clone(), dirForard.multiplyScalar(IKJointsOffset[i]));
    IKglobalPositions[i].x = newPos.x;
    IKglobalPositions[i].y = newPos.y;
    IKglobalPositions[i].z = newPos.z;
  }
}

//FABRIK Solver
function solveFABRIK(targetPosition) {
  let numIterations = 3
  let origin = new THREE.Vector3(0, 0, 0);
  let IKpositions = []
  for (var i = 0; i <= IKJointsList.length - 1; i++) {
    let jointWorldPos = new THREE.Vector3();
    IKJointsList[i].getWorldPosition(jointWorldPos);
    IKpositions.push(jointWorldPos);
  }
  endEffectorGlobalPos = new THREE.Vector3();
  endEffector.getWorldPosition(endEffectorGlobalPos);
  IKpositions.push(endEffectorGlobalPos)

  // for (var i = 0; i <= IKpositions.length - 1; i++) {
  //   var tempt = new THREE.Mesh(targetSphereGeometry, new THREE.MeshLambertMaterial({ color: 0xf0a219 }));
  //   tempt.position.set(IKpositions[i].x, IKpositions[i].y, IKpositions[i].z);
  //   tempt.scale.set(0.075, 0.075, 0.075);
  //   scene.add(tempt);
  // }

  backward(IKpositions, targetPosition);
  forward(IKpositions, origin);


  // for (var i = 0; i <= IKpositions.length - 1; i++) {
  //   var tempt = new THREE.Mesh(targetSphereGeometry, new THREE.MeshLambertMaterial({ color: 0xf0a219 }));
  //   tempt.position.set(IKpositions[i].x, IKpositions[i].y, IKpositions[i].z);
  //   tempt.scale.set(0.075, 0.075, 0.075);
  //   scene.add(tempt);
  // }



  // Forward Kinematic
  // for (var i = 0; i <= IKJointsList.length - 1; i++) {
  //   var childGlobal = new THREE.Vector3();
  //   if (i == IKJointsList.length - 1) {
  //     endEffector.getWorldPosition(childGlobal);
  //   }
  //   else {
  //     IKJointsList[i + 1].getWorldPosition(childGlobal);
  //   }
  //   var jointDirection = IKJointsList[i].worldToLocal(childGlobal.clone()).normalize();
  //   var targetDirection = IKJointsList[i].worldToLocal(IKpositions[i].clone()).normalize();
  //   var angelBetweenVectors = new THREE.Quaternion(0, 0, 0, 1).setFromUnitVectors(jointDirection, targetDirection);
  //   IKJointsList[i].quaternion.multiply(angelBetweenVectors);
  // }

}
//CCDIK Solver
function solveCCDIK(targetPosition) {
  var jointPosition = new THREE.Vector3();
  for (var i = IKJointsList.length - 1; i >= 0; i--) {
    IKJointsList[i].updateMatrixWorld();
    endEffector.getWorldPosition(jointPosition);

    // find the direction 
    var jointDirection = IKJointsList[i].worldToLocal(jointPosition.clone()).normalize();
    var targetDirection = IKJointsList[i].worldToLocal(targetPosition.clone()).normalize();
    var angelBetweenVectors = new THREE.Quaternion(0, 0, 0, 1).setFromUnitVectors(jointDirection, targetDirection);
    IKJointsList[i].quaternion.multiply(angelBetweenVectors);

    // adding hinges 
    var invRot = IKJointsList[i].quaternion.clone().inverse();
    var parentAxis = IKJointsList[i].axis.clone().applyQuaternion(invRot);
    angelBetweenVectors.setFromUnitVectors(IKJointsList[i].axis, parentAxis);
    IKJointsList[i].quaternion.multiply(angelBetweenVectors);

    // adding constraints
    var clampedRot = IKJointsList[i].rotation.toVector3().clampScalar(IKJointsList[i].minLimit, IKJointsList[i].maxLimit);
    IKJointsList[i].rotation.setFromVector3(clampedRot);

    IKJointsList[i].updateMatrixWorld();
  }
}

function animate() {
  solveFABRIK(draggableObjects[0].position);
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}