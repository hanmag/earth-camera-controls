const width = window.innerWidth;
const height = window.innerHeight;
const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xcccccc));
const camera = new THREE.PerspectiveCamera(60, width / height, 0.00001, 1000000000);
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    stencil: false
});
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

const earthControls = new EarthControls(camera, renderer.domElement, {
    "radius": 6371,
    "coord": [0.5, 0.8]
});

var update = function () {
    document.getElementById('coordinate').innerText = earthControls.coord['x'].toFixed(4) + ', ' + earthControls.coord['y'].toFixed(4);
    document.getElementById('zoom').innerText = earthControls.zoom.toFixed(4);
    document.getElementById('pitch').innerText = earthControls.pitch.toFixed(4);
    document.getElementById('bearing').innerText = earthControls.bearing.toFixed(4);
};

earthControls.globeZoom = 20;
earthControls.addEventListener('change', update);
earthControls.addEventListener('end', update);

const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(6371, 512, 512),
    new THREE.MeshPhongMaterial({
        shininess: 10
    })
);
new THREE.TextureLoader().load('img/earth4.jpg', function (t) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    mesh.material.map = t;
    scene.add(mesh);
});

function jump() {
    earthControls.jumpTo({
        "coord": [0, 0],
        "bearing": 0.5
    });
}

renderer.render(scene, camera);

(function anim() {

    earthControls.update();

    requestAnimationFrame(anim);

    renderer.render(scene, camera);

})();