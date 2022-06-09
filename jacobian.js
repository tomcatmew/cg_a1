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
var colorIndex = [0x888888, 0x658b42, 0x658b42, 0x658b42, 0x888888, 0x888888]
var settings = { messageOne: "No limit", messageTwo: "No limit", messageThree: "No limit" };
init();
animate();
function init() {

  container = document.getElementById("maincanvas");
  document.body.appendChild(container);
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
  // camera = new THREE.OrthographicCamera(500 / - 2, 500 / 2, 1200 / 2, 1200 / - 2, 1, 5000);
  camera.position.set(0, 0, 300);
  controls = new THREE.OrbitControls(camera);
  controls.target.set(0, 0, 0);
  controls.update();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  light = new THREE.HemisphereLight(0xffffff, 0x444444);
  light.position.set(0, 200, 0);
  scene.add(light);
  light = new THREE.DirectionalLight(0xbbbbbb);
  light.position.set(0, 200, 100);
  light.shadow.camera.top = 185;
  light.shadow.camera.bottom = - 110;
  light.shadow.camera.left = - 110;
  light.shadow.camera.right = 110;
  light.castShadow = true;
  scene.add(light);

  const axesHelper = new THREE.AxesHelper(100);
  scene.add(axesHelper);

  const gui = new dat.GUI();
  gui.domElement.id = "gui";
  const cubeFolder = gui.addFolder("Joints Hinge and Limits");
  cubeFolder.add(settings, "messageOne").name("Joint 1 (green)");
  cubeFolder.add(settings, "messageTwo").name("Joint 2 (green)");
  cubeFolder.add(settings, "messageThree").name("Joint 3 (green)");
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
  endEffector = new THREE.Group();
  var endSpere = new THREE.Mesh(sphereGeometry, new THREE.MeshLambertMaterial({ color: 0x43ae06 }));
  endEffector.add(endSpere);
  secondJoint.add(endEffector);
  endEffector.position.set(0.0, 20, 0.0);
  endEffector.scale.set(0.075, 0.075, 0.075);

  // Initialize the target 
  var target = new THREE.Mesh(targetSphereGeometry, new THREE.MeshLambertMaterial({ color: 0xf7474b }));
  target.position.set(65, 50, 0);
  target.scale.set(0.075, 0.075, 0.075);
  // target.castShadow = true;
  // target.receiveShadow = true;
  scene.add(target);
  draggableObjects.push(target);

  var dragControls = new THREE.DragControls(draggableObjects, camera, renderer.domElement);
  dragControls.addEventListener('dragstart', function () {
    controls.enabled = false;
  });
  dragControls.addEventListener('drag', function (event) {
    event.object.position.z = 0;
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
  var box = new THREE.Mesh(boxGeometry, new THREE.MeshPhongMaterial({ color: colorIndex[IKJointsList.length], opacity: 0.6, transparent: true, }));
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

//---------------------------------------------------------Jacobian IK implementation here ---------------------------------
//Jacobian IK Solver
function solveJacobian(targetPosition) {
  // @endEffector -> end effector group
  // @IKJointsList -> joints group
  // set a small iteration so we can clear see the change
  const iteration = 2;

  for (var i = 0; i < iteration; i++) {
    var beta = 0.001;
    var endEffectorGlobalPos = new THREE.Vector3();
    endEffectorGlobalPos = endEffector.getWorldPosition(endEffectorGlobalPos);

    var targetGlobalPos = targetPosition.clone();

    var distanceMove = new THREE.Vector3();
    distanceMove.subVectors(targetGlobalPos, endEffectorGlobalPos);
    var deltaDistance = distanceMove.multiplyScalar(beta);

    // Current this is 2D example, so we only rotate around Z axis 
    var axis = new THREE.Vector3(0, 0, 1);

    // positions of bone0,1,2
    var p0 = new THREE.Vector3();
    var p1 = new THREE.Vector3();
    var p2 = new THREE.Vector3();
    IKJointsList[0].getWorldPosition(p0);
    IKJointsList[1].getWorldPosition(p1);
    IKJointsList[2].getWorldPosition(p2);

    //vector between end effector to bone 0,1,2
    var v0 = new THREE.Vector3();
    var v1 = new THREE.Vector3();
    var v2 = new THREE.Vector3();
    v0.subVectors(endEffectorGlobalPos, p0);
    v1.subVectors(endEffectorGlobalPos, p1);
    v2.subVectors(endEffectorGlobalPos, p2);

    // construct the Jacobian matrix rows 
    var j0 = new THREE.Vector3();
    var j1 = new THREE.Vector3();
    var j2 = new THREE.Vector3();
    j0.crossVectors(axis, v0);
    j1.crossVectors(axis, v1);
    j2.crossVectors(axis, v2);

    var jacoM = new THREE.Matrix3();

    jacoM.set(j0.x, j1.x, j2.x,
      j0.y, j1.y, j2.y,
      j0.z, j1.z, j2.z);

    jacoM.transpose();
    var thetaAngle = deltaDistance.applyMatrix3(jacoM);
    thetaAngle = thetaAngle.multiplyScalar(0.1);

    const q0 = new THREE.Quaternion();
    const q1 = new THREE.Quaternion();
    const q2 = new THREE.Quaternion();
    q0.setFromAxisAngle(axis, thetaAngle.x);
    q1.setFromAxisAngle(axis, thetaAngle.y);
    q2.setFromAxisAngle(axis, thetaAngle.z);

    qList = [q0, q1, q2];

    for (var i = 0; i <= IKJointsList.length - 1; i++) {
      IKJointsList[i].updateMatrixWorld();
      IKJointsList[i].quaternion.multiply(qList[i]);
      IKJointsList[i].updateMatrixWorld();
    }
  }
}
//---------------------------------------------------------Jacobian IK implementation here ---------------------------------


function animate() {
  solveJacobian(draggableObjects[0].position);
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}