var THREE = window.THREE || require('three');

var MapControls = MapControls = function (object, domElement, options) {

    var PI = 3.141592653589793;
    var HALFPI = PI / 2;
    var PI2 = PI * 2;

    var _this = this;
    var STATE = {
        NONE: -1,
        ROTATE: 0,
        ZOOM: 1,
        PAN: 2
    };

    this.object = object;
    this.domElement = (domElement !== undefined) ? domElement : document;
    this.mapRadius = (options !== undefined) ? options.radius : 6371;

    // API

    this.enabled = true;

    this.screen = {
        left: 0,
        top: 0,
        width: 0,
        height: 0
    };

    this.rotateSpeed = 1.0;
    this.zoomSpeed = 1.0;
    this.panSpeed = 1.0;

    this.noRotate = false;
    this.noZoom = false;
    this.noPan = false;

    this.dynamicDampingFactor = 0.2;

    this.coord = new THREE.Vector2(0, HALFPI);
    this.zoom = 10;
    this.pitch = 0;
    this.bearing = 0;

    this.coordEnd = new THREE.Vector2(0, HALFPI);
    this.zoomEnd = 10;
    this.pitchEnd = 0;
    this.bearingEnd = 0;

    this.minZoom = 1;
    this.maxZoom = 18;
    this.maxPitch = 80;

    var EPS = 0.000001;

    var _state = STATE.NONE,
        _dragPrev = new THREE.Vector2(),
        _dragCurr = new THREE.Vector2();


    // events

    var changeEvent = {
        type: 'change'
    };
    var startEvent = {
        type: 'start'
    };
    var endEvent = {
        type: 'end'
    };


    // methods

    this.handleResize = function () {

        if (this.domElement === document) {

            this.screen.left = 0;
            this.screen.top = 0;
            this.screen.width = window.innerWidth;
            this.screen.height = window.innerHeight;

        } else {

            var box = this.domElement.getBoundingClientRect();
            // adjustments come from similar code in the jquery offset() function
            var d = this.domElement.ownerDocument.documentElement;
            this.screen.left = box.left + window.pageXOffset - d.clientLeft;
            this.screen.top = box.top + window.pageYOffset - d.clientTop;
            this.screen.width = box.width;
            this.screen.height = box.height;

        }

    };

    var getMouseOnScreen = (function () {

        var vector = new THREE.Vector2();

        return function getMouseOnScreen(pageX, pageY) {

            vector.set(
                (pageX - _this.screen.left) / _this.screen.width,
                (pageY - _this.screen.top) / _this.screen.height
            );

            return vector;

        };

    }());

    var getRotateOffset = function (delta) {
        var speed = Math.pow(2, _this.zoom - 1) * _this.rotateSpeed * 0.0001;
        return delta.clone().rotateAround(new THREE.Vector2(0, 0), -_this.bearing).multiplyScalar(speed);
    };

    var getEyeVector = function (target) {
        var zoomDistance = Math.pow(2, _this.zoom - 1) * _this.mapRadius / 100000;
        var origin = new THREE.Vector3().setFromSpherical(target);
        target.phi -= 0.00001;
        var normal = new THREE.Vector3().setFromSpherical(target).sub(origin).normalize();
        normal.applyAxisAngle(origin.clone().normalize(), _this.bearing + PI);
        if (_this.pitch > 0.1) {
            var eye0 = origin.normalize().multiplyScalar(Math.tan((90 - _this.pitch) / 180 * PI));
            return eye0.clone().add(normal).normalize().multiplyScalar(zoomDistance);
        } else {
            return origin.clone().normalize().multiplyScalar(zoomDistance);
        }
    };

    // listeners

    function mousedown(event) {

        if (_this.enabled === false) return;

        event.preventDefault();
        event.stopPropagation();

        if (_state === STATE.NONE) {

            _state = event.button;

        }

        if ((_state === STATE.ROTATE && !_this.noRotate) ||
            (_state === STATE.ZOOM && !_this.noZoom) ||
            (_state === STATE.PAN && !_this.noPan)) {

            _dragCurr.copy(getMouseOnScreen(event.pageX, event.pageY));
            _dragPrev.copy(_dragCurr);

        }

        document.addEventListener('mousemove', mousemove, false);
        document.addEventListener('mouseup', mouseup, false);

        _this.dispatchEvent(startEvent);

    }

    function mousemove(event) {

        if (_this.enabled === false) return;

        event.preventDefault();
        event.stopPropagation();

        _dragCurr.copy(getMouseOnScreen(event.pageX, event.pageY));

        var _dragDelta = _dragCurr.clone().sub(_dragPrev);

        _dragPrev.copy(_dragCurr);

        if (_state === STATE.ROTATE && !_this.noRotate) {

            var offset = getRotateOffset(_dragDelta);
            _this.coordEnd.x = _this.coord.x - offset.x;
            _this.coordEnd.y = THREE.Math.clamp(_this.coord.y - offset.y, 0, PI);

        } else if (_state === STATE.ZOOM && !_this.noZoom) {

            _this.zoomEnd = THREE.Math.clamp(_this.zoom + (_dragDelta.y * _this.zoomSpeed * 32), _this.minZoom, _this.maxZoom);

        } else if (_state === STATE.PAN && !_this.noPan) {

            console.log(_dragDelta);
            if ((Math.abs(_dragDelta.y) > 0.01 && Math.abs(_dragDelta.x) > 0.01) || Math.abs(_dragDelta.y) < 0.01) {
                if (_dragCurr.y < 0.5)
                    _this.bearingEnd = _this.bearing + (_dragDelta.x * _this.panSpeed * 24);
                else
                    _this.bearingEnd = _this.bearing - (_dragDelta.x * _this.panSpeed * 24);
            }

            if ((Math.abs(_dragDelta.y) > 0.01 && Math.abs(_dragDelta.x) > 0.01) || Math.abs(_dragDelta.x) < 0.01)
                _this.pitchEnd = THREE.Math.clamp(_this.pitch - (_dragDelta.y * _this.panSpeed * 320), 0, _this.maxPitch);

        }

    }

    function mouseup(event) {

        if (_this.enabled === false) return;

        event.preventDefault();
        event.stopPropagation();

        _state = STATE.NONE;

        document.removeEventListener('mousemove', mousemove);
        document.removeEventListener('mouseup', mouseup);
        _this.dispatchEvent(endEvent);

    }

    function mousewheel(event) {

        if (_this.enabled === false) return;

        event.preventDefault();
        event.stopPropagation();

        _this.dispatchEvent(startEvent);

        switch (event.deltaMode) {

            case 2:
                // Zoom in pages
                _this.zoomEnd = THREE.Math.clamp(_this.zoom + (event.deltaY * 0.025 * _this.zoomSpeed * 32), _this.minZoom, _this.maxZoom);
                break;

            case 1:
                // Zoom in lines
                _this.zoomEnd = THREE.Math.clamp(_this.zoom + (event.deltaY * 0.01 * _this.zoomSpeed * 32), _this.minZoom, _this.maxZoom);
                break;

            default:
                // undefined, 0, assume pixels
                _this.zoomEnd = THREE.Math.clamp(_this.zoom + (event.deltaY * 0.00025 * _this.zoomSpeed * 32), _this.minZoom, _this.maxZoom);
                break;

        }

        _this.dispatchEvent(endEvent);

    }

    function contextmenu(event) {

        if (_this.enabled === false) return;

        event.preventDefault();

    }

    this.dispose = function () {

        this.domElement.removeEventListener('contextmenu', contextmenu, false);
        this.domElement.removeEventListener('mousedown', mousedown, false);
        this.domElement.removeEventListener('wheel', mousewheel, false);

        document.removeEventListener('mousemove', mousemove, false);
        document.removeEventListener('mouseup', mouseup, false);
    };

    this.domElement.addEventListener('contextmenu', contextmenu, false);
    this.domElement.addEventListener('mousedown', mousedown, false);
    this.domElement.addEventListener('wheel', mousewheel, false);

    this.handleResize();

    this.update = function () {

        var dampingFactor = _this.dynamicDampingFactor;
        var deltaCoord = _this.coordEnd.clone().sub(_this.coord);
        var deltaZoom = _this.zoomEnd - _this.zoom;
        var deltaBearing = _this.bearingEnd - _this.bearing;
        var deltaPitch = _this.pitchEnd - _this.pitch;
        if (
            Math.abs(deltaCoord.x) > EPS ||
            Math.abs(deltaCoord.y) > EPS ||
            Math.abs(deltaZoom) > EPS ||
            Math.abs(deltaBearing) > EPS ||
            Math.abs(deltaPitch) > EPS
        ) {
            _this.coord.x += deltaCoord.x * dampingFactor;
            _this.coord.y += deltaCoord.y * dampingFactor;
            _this.zoom += deltaZoom * dampingFactor;
            _this.bearing += deltaBearing * dampingFactor;
            _this.pitch += deltaPitch * dampingFactor;

            _this.needsUpdate = true;
        } else {
            _this.coord.copy(_this.coordEnd);
            _this.zoom = _this.zoomEnd;
            _this.bearing = _this.bearingEnd;
            _this.pitch = _this.pitchEnd;
        }

        if (!_this.needsUpdate) return;

        var target = new THREE.Spherical(_this.mapRadius, _this.coord.y, _this.coord.x);
        target.makeSafe();
        var targetPos = new THREE.Vector3().setFromSpherical(target);

        var eye = getEyeVector(target);
        _this.object.position.copy(targetPos.clone().add(eye));

        if (_this.pitch > 0.1) {
            var targetUp = targetPos.clone().normalize().multiplyScalar(eye.length() / Math.cos(_this.pitch / 180 * PI));
            _this.object.up = targetUp.sub(eye).normalize();
        } else {
            _this.object.up = new THREE.Vector3(Math.cos(HALFPI + _this.bearing), Math.sin(HALFPI + _this.bearing), 0);
        }

        _this.object.lookAt(targetPos);

        _this.needsUpdate = false;
    };

    // force an update at start
    this.needsUpdate = true;
    this.update();
};

MapControls.prototype = Object.create(THREE.EventDispatcher.prototype);

export default MapControls;