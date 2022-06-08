// Copyright Yifei Chen - University of Tokyo Creative Informatics
// For Computer Graphics homework assignment 1

let container, stats, controls;
let camera, scene, renderer, light;
let totalSlice, t, step;
let line, line2, line3;
let draggableObjects = [];
let control1, control2, control3, control4;
let current_sample;
let samplePoint = [];

let dis_table = [];
let t_table = [];

const material_line = new THREE.LineBasicMaterial({ color: 0x000000 });
const params = {
  Samples: 30,
  tension: 0.5,
};

init();
animate();

// function remap(x, a, b, c, d) {
//   if (x < a || x > b) {
//     return false;
//   }
//   return ((x - a) / (b - a)) * (d - c) + c;
// }

function Remap(value, from1, to1, from2, to2) {
  return ((value - from1) / (to1 - from1)) * (to2 - from2) + from2;
}

function distance(p0x, p0y, p1x, p1y) {
  var a = p1x - p0x;
  var b = p1y - p0y;
  return Math.sqrt(a * a + b * b);
}

// ===================== Implementation of Adaptive bezier curve - Equal length distributed ============================
// I used Look-Up-table to find the new t of equal distance points. 
function adaptive_curve() {
  let copy_arr = [];
  for (let i = 0; i < t_table.length; i++) {
    copy_arr.push(t_table[i]);
  }

  let sum_length = dis_table[dis_table.length - 1];
  let n = dis_table.length;
  let d = sum_length / (dis_table.length - 1);
  for (let i = 1; i < copy_arr.length - 1; i++) {
    dis = i * d;
    for (let j = 0; j < dis_table.length - 1; j++) {
      if (dis > dis_table[j] && dis < dis_table[j + 1]) {
        t_table[i] = Remap(
          dis,
          dis_table[j],
          dis_table[j + 1],
          copy_arr[j],
          copy_arr[j + 1]
        );
      }
    }
  }
// ------------------------ Implementation ----------------------------
  p0x = control1.position.x;
  p1x = control2.position.x;
  p2x = control3.position.x;
  p3x = control4.position.x;
  p0y = control1.position.y;
  p1y = control2.position.y;
  p2y = control3.position.y;
  p3y = control4.position.y;

  const positions = line.geometry.attributes.position.array;
  let x, y, z, index;
  x = y = z = index = 0;
  t_index = 0;
  // console.log(t_table);
  for (let i = 0; i <= current_sample * 3; i += 3) {
    update_x = bezier_curve_compute(t_table[t_index], p0x, p1x, p2x, p3x);
    update_y = bezier_curve_compute(t_table[t_index], p0y, p1y, p2y, p3y);
    if (i == current_sample * 3) {
      positions[i] = p3x;
      positions[i + 1] = p3y;
      positions[i + 2] = 0;
    } else {
      positions[i] = update_x;
      positions[i + 1] = update_y;
      positions[i + 2] = 0;
    }
    const sample_idx = Math.floor(i / 3);
    if (i == current_sample * 3) {
      samplePoint[sample_idx].position.set(p3x, p3y, 0);
    } else {
      samplePoint[sample_idx].position.set(update_x, update_y, 0);
    }
    t_index++;
  }
}

function updatePositions() {
  if (typeof line != "undefined" && samplePoint.length != 0) {
    t_table = [];
    dis_table = [];
    t = 0;
    p0x = control1.position.x;
    p1x = control2.position.x;
    p2x = control3.position.x;
    p3x = control4.position.x;
    p0y = control1.position.y;
    p1y = control2.position.y;
    p2y = control3.position.y;
    p3y = control4.position.y;

    const positions = line.geometry.attributes.position.array;
    let x, y, z, index;
    x = y = z = index = 0;
    let [pre_x, pre_y] = [p0x, p0y];
    let cumulative_len = 0;
    for (let i = 0; i <= current_sample * 3; i += 3) {
      update_x = bezier_curve_compute(t, p0x, p1x, p2x, p3x);
      update_y = bezier_curve_compute(t, p0y, p1y, p2y, p3y);
      if (i == current_sample * 3) {
        positions[i] = p3x;
        positions[i + 1] = p3y;
        positions[i + 2] = 0;
      } else {
        positions[i] = update_x;
        positions[i + 1] = update_y;
        positions[i + 2] = 0;
      }
      const sample_idx = Math.floor(i / 3);
      if (i == current_sample * 3) {
        samplePoint[sample_idx].position.set(p3x, p3y, 0);
        t_table.push(1);
      } else {
        t_table.push(t);
        samplePoint[sample_idx].position.set(update_x, update_y, 0);
      }
      if (i != 0) {
        if (i == current_sample * 3) {
          cumulative_len += distance(pre_x, pre_y, p3x, p3y);
          dis_table.push(cumulative_len);
        } else {
          cumulative_len += distance(pre_x, pre_y, update_x, update_y);
          dis_table.push(cumulative_len);
        }
        // dis_table.push(distance(pre_x, pre_y, update_x, update_y));
      } else {
        dis_table.push(cumulative_len);
      }
      pre_x = update_x;
      pre_y = update_y;
      t += step;
    }
  }
  // console.log(t_table);
  // console.log(dis_table);
  adaptive_curve();
  const positions2 = line2.geometry.attributes.position.array;
  positions2[0] = p0x;
  positions2[1] = p0y;
  positions2[3] = p1x;
  positions2[4] = p1y;

  const positions3 = line3.geometry.attributes.position.array;
  positions3[0] = p3x;
  positions3[1] = p3y;
  positions3[3] = p2x;
  positions3[4] = p2y;
}

function creatControl(color, size) {
  const geometry = new THREE.CircleGeometry(size, 32);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(geometry, material);
  return plane;
}

function creatSample(color, size) {
  const geometry = new THREE.CircleGeometry(size, 32);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(geometry, material);
  return plane;
}

function update_samples() {
  scene.remove(line);
  for (let i = 0; i <= current_sample; i++) {
    scene.remove(samplePoint[i]);
  }
  samplePoint = [];
  points = [];
  p0x = control1.position.x;
  p1x = control2.position.x;
  p2x = control3.position.x;
  p3x = control4.position.x;
  p0y = control1.position.y;
  p1y = control2.position.y;
  p2y = control3.position.y;
  p3y = control4.position.y;
  current_sample = params.Samples;
  step = 1 / current_sample;
  t = 0;
  for (let i = 0; i < current_sample; i++) {
    let x = bezier_curve_compute(t, p0x, p1x, p2x, p3x);
    let y = bezier_curve_compute(t, p0y, p1y, p2y, p3y);
    points.push(new THREE.Vector3(x, y, 0));
    new_sample = creatSample(0x4989bb, 0.5);
    new_sample.position.x = x;
    new_sample.position.y = y;
    samplePoint.push(new_sample);
    t += step;
    if (i == current_sample - 1) {
      let last_x = p3x;
      let last_y = p3y;
      points.push(new THREE.Vector3(last_x, last_y, 0));
      last_sample = creatSample(0x4989bb, 0.5);
      last_sample.position.x = last_x;
      last_sample.position.y = last_y;
      samplePoint.push(last_sample);
    }
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  line = new THREE.Line(geometry, material_line);
  scene.add(line);
  for (let i = 0; i <= current_sample; i++) {
    scene.add(samplePoint[i]);
  }
  updatePositions();
}

// -------------implementation of cubie bezier curve-------------------
function bezier_curve_compute(t, p1, p2, p3, p4) {
  const t1 = 1 - t;
  const t1_3 = Math.pow(t1, 3);
  const t1_2 = Math.pow(t1, 2);
  const t3 = Math.pow(t, 3);
  const t2 = Math.pow(t, 2);
  return t1_3 * p1 + 3 * t1_2 * t * p2 + 3 * t1 * t2 * p3 + t3 * p4;
}
// ------------------------ Implementation ----------------------------

function init() {
  current_sample = params.Samples;
  step = 1 / current_sample;
  t = 0;
  container = document.getElementById("maincanvas");
  document.body.appendChild(container);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // renderer.shadowMap.enabled = true;
  document.body.style.margin = 0;
  document.body.style.padding = 0;
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  container.appendChild(renderer.domElement);

  const gui = new dat.GUI();
  gui.domElement.id = "gui";
  const cubeFolder = gui.addFolder("Sampled Line");
  cubeFolder.add(params, "Samples", 10, 60).step(1).onChange(update_samples);
  cubeFolder.open();

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    500
  );
  controls = new THREE.OrbitControls(camera);
  controls.target.set(0, 45, 0);
  controls.enablePan = false;
  controls.enableRotate = false;
  controls.enableZoom = false;
  controls.update();
  camera.position.set(0, 0, 100);
  camera.lookAt(0, 0, 0);
  camera.position.set(0, 0, 100);
  camera.lookAt(0, 0, 0);

  scene = new THREE.Scene();

  //create a blue LineBasicMaterial
  const material = new THREE.LineBasicMaterial({ color: 0x000000 });

  control1 = creatControl(0x333333, 1.5);
  control2 = creatControl(0xf7474b, 1.0);
  control3 = creatControl(0xf7474b, 1.0);
  control4 = creatControl(0x333333, 1.5);
  control1.position.set(-20, -3, 0);
  control2.position.set(40, -20, 0);
  control3.position.set(-30, 20, 0);
  control4.position.set(35, 3, 0);

  const points = [];

  p0x = control1.position.x;
  p1x = control2.position.x;
  p2x = control3.position.x;
  p3x = control4.position.x;
  p0y = control1.position.y;
  p1y = control2.position.y;
  p2y = control3.position.y;
  p3y = control4.position.y;

  for (let i = 0; i < current_sample; i++) {
    x = bezier_curve_compute(t, p0x, p1x, p2x, p3x);
    y = bezier_curve_compute(t, p0y, p1y, p2y, p3y);
    points.push(new THREE.Vector3(x, y, 0));
    sample = creatSample(0x4989bb, 0.5);
    sample.position.x = x;
    sample.position.y = y;
    samplePoint.push(sample);
    t += step;
    if (i == current_sample - 1) {
      let last_x = p3x;
      let last_y = p3y;
      points.push(new THREE.Vector3(last_x, last_y, 0));
      let last_sample = creatSample(0x4989bb, 0.5);
      last_sample.position.x = last_x;
      last_sample.position.y = last_y;
      samplePoint.push(last_sample);
    }
  }

  const points2 = [];
  const material2 = new THREE.LineBasicMaterial({
    color: 0xf7474b,
    linewidth: 1,
  });
  points2.push(new THREE.Vector3(p0x, p0y, -0.1));
  points2.push(new THREE.Vector3(p1x, p1y, -0.1));

  const points3 = [];
  const material3 = new THREE.LineBasicMaterial({
    color: 0xf7474b,
    linewidth: 1,
  });
  points3.push(new THREE.Vector3(p3x, p3y, -0.1));
  points3.push(new THREE.Vector3(p2x, p2y, -0.1));

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  line = new THREE.Line(geometry, material);

  const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);
  line2 = new THREE.Line(geometry2, material2);

  const geometry3 = new THREE.BufferGeometry().setFromPoints(points3);
  line3 = new THREE.Line(geometry3, material3);

  const size = 200;
  const divisions = 30;

  const gridHelper = new THREE.GridHelper(size, divisions);
  gridHelper.rotateOnAxis(new THREE.Vector3(1, 0, 0), 1.5708);
  gridHelper.position.z = -1;
  scene.add(gridHelper);
  scene.add(line);
  scene.add(line2);
  scene.add(line3);
  scene.add(control1);
  scene.add(control2);
  scene.add(control3);
  scene.add(control4);

  for (let i = 0; i <= current_sample; i++) {
    scene.add(samplePoint[i]);
  }
  draggableObjects.push(control1);
  draggableObjects.push(control2);
  draggableObjects.push(control3);
  draggableObjects.push(control4);

  let dragControls = new THREE.DragControls(
    draggableObjects,
    camera,
    renderer.domElement
  );
  dragControls.addEventListener("dragstart", function () {
    controls.enabled = false;
  });
  dragControls.addEventListener("dragend", function () {
    controls.enabled = true;
  });
}

function animate() {
  requestAnimationFrame(animate);
  // update_samples();
  updatePositions();
  line.geometry.attributes.position.needsUpdate = true;
  line2.geometry.attributes.position.needsUpdate = true;
  line3.geometry.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
}

var hamburger = document.querySelector(".hamburger");
hamburger.addEventListener("click", function () {
  document.querySelector("body").classList.toggle("active");
});
