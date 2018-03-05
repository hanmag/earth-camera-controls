import * as THREE from 'three';

var EarthControls = EarthControls = function (object, domElement, options) {

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

    validateOptions(options);
    this.earthRadius = (options !== undefined) ? options.radius : 6371;
    this.coord = (options.coord !== undefined) ? new THREE.Vector2(options.coord[0], options.coord[1]) : new THREE.Vector2(0, HALFPI);
    this.zoom = (options.zoom !== undefined) ? options.zoom : 10;
    this.pitch = (options.pitch !== undefined) ? options.pitch : 0;
    this.bearing = (options.bearing !== undefined) ? options.bearing : 0;

    this.coordEnd = this.coord.clone();
    this.zoomEnd = this.zoom;
    this.pitchEnd = this.pitch;
    this.bearingEnd = this.bearing;

    this.minZoom = (options.minZoom !== undefined) ? options.minZoom : 1;
    this.maxZoom = (options.maxZoom !== undefined) ? options.maxZoom : 18;
    this.globeZoom = 10;
    this.maxPitch = 80;

    var EPS = 0.000001;
    var PITCHEPS = 0.000001;

    var _state = STATE.NONE,
        _dragPrev = new THREE.Vector2(),
        _dragCurr = new THREE.Vector2();


    // events

    var changeEvent = {
        type: 'change'
    };

    // methods

    var validateOptions = function (options) {
        options = options || {};
    };

    var dispatchEvent = function (type) {
        if (type === 'end' && !changeEvent.type)
            return;

        changeEvent.type = type;
        _this.dispatchEvent(changeEvent);

        if (type === 'end')
            changeEvent.type = null;
    };

    this.jumpTo = function (cameraOpts) {
        validateOptions(cameraOpts);
        this.coordEnd = (cameraOpts.coord !== undefined) ? new THREE.Vector2(cameraOpts.coord[0], cameraOpts.coord[1]) : _this.coordEnd;
        this.zoomEnd = (cameraOpts.zoom !== undefined) ? cameraOpts.zoom : _this.zoomEnd;
        this.pitchEnd = (cameraOpts.pitch !== undefined) ? cameraOpts.pitch : _this.pitchEnd;
        this.bearingEnd = (cameraOpts.bearing !== undefined) ? cameraOpts.bearing : _this.bearingEnd;
    };

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
        var zoomDistance = Math.pow(1.9, _this.zoom - 1) * _this.earthRadius / 30000;
        var origin = new THREE.Vector3().setFromSpherical(target);
        target.phi -= EPS;
        var normal = new THREE.Vector3().setFromSpherical(target).sub(origin).normalize();
        normal.applyAxisAngle(origin.clone().normalize(), _this.bearing + PI);
        if (_this.pitch < PITCHEPS)
            _this.pitch = PITCHEPS;
        var eye0 = origin.normalize().multiplyScalar(Math.tan((90 - _this.pitch) / 180 * PI));
        return eye0.clone().add(normal).normalize().multiplyScalar(zoomDistance);
    }
    // listeners

    var mousedown = function (event) {

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

    };

    var mousemove = function (event) {

        if (_this.enabled === false) return;

        event.preventDefault();
        event.stopPropagation();

        _dragCurr.copy(getMouseOnScreen(event.pageX, event.pageY));

        var _dragDelta = _dragCurr.clone().sub(_dragPrev);

        _dragPrev.copy(_dragCurr);

        if (_state === STATE.ROTATE && !_this.noRotate) {

            if (Math.abs(_dragDelta.y) < 0.01 && Math.abs(_dragDelta.x) > 0.02)
                _dragDelta.y = 0;
            if (Math.abs(_dragDelta.x) < 0.01 && Math.abs(_dragDelta.y) > 0.02)
                _dragDelta.x = 0;
            var offset = getRotateOffset(_dragDelta);
            _this.coordEnd.x = _this.coord.x - offset.x;
            _this.coordEnd.y = THREE.Math.clamp(_this.coord.y - offset.y, 0, PI);

        } else if (_state === STATE.ZOOM && !_this.noZoom) {

            _this.zoomEnd = THREE.Math.clamp(_this.zoom + (_dragDelta.y * _this.zoomSpeed * 32), _this.minZoom, _this.maxZoom);

            if (_this.zoomEnd > _this.globeZoom) {
                _this.bearingEnd = 0;
            }

        } else if (_state === STATE.PAN && !_this.noPan) {

            if (_this.zoom < _this.globeZoom) {
                if ((Math.abs(_dragDelta.y) > 0.05 && Math.abs(_dragDelta.x) > 0.05) ||
                    (Math.abs(_dragDelta.y) < Math.abs(_dragDelta.x))) {
                    if (_dragCurr.y < 0.5)
                        _this.bearingEnd = _this.bearing + (_dragDelta.x * _this.panSpeed * 24);
                    else
                        _this.bearingEnd = _this.bearing - (_dragDelta.x * _this.panSpeed * 24);
                }
            } else {
                _this.bearingEnd = 0;
            }

            if ((Math.abs(_dragDelta.y) > 0.05 && Math.abs(_dragDelta.x) > 0.05) ||
                (Math.abs(_dragDelta.x) < Math.abs(_dragDelta.y)))
                _this.pitchEnd = THREE.Math.clamp(_this.pitch - (_dragDelta.y * _this.panSpeed * 320), 0, _this.maxPitch);

        }

    };

    var mouseup = function (event) {

        if (_this.enabled === false) return;

        event.preventDefault();
        event.stopPropagation();

        _state = STATE.NONE;

        document.removeEventListener('mousemove', mousemove);
        document.removeEventListener('mouseup', mouseup);

    };

    var mousewheel = function (event) {

        if (_this.enabled === false) return;

        event.preventDefault();
        event.stopPropagation();

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

        if (_this.zoomEnd > _this.globeZoom) {
            _this.bearingEnd = 0;
        }

    };

    var contextmenu = function (event) {

        if (_this.enabled === false) return;

        event.preventDefault();

    };

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
            while (_this.coordEnd.x < 0) _this.coordEnd.x += PI2;
            _this.coordEnd.x = _this.coordEnd.x % PI2;
            _this.coord.copy(_this.coordEnd);
            _this.zoom = _this.zoomEnd;
            while (_this.bearingEnd < 0) _this.bearingEnd += PI2;
            _this.bearing = _this.bearingEnd = _this.bearingEnd % PI2;
            _this.pitch = _this.pitchEnd;
        }

        if (!_this.needsUpdate) {
            dispatchEvent('end');
            return;
        }

        var target = new THREE.Spherical(_this.earthRadius, _this.coord.y, _this.coord.x);
        target.makeSafe();
        var targetPos = new THREE.Vector3().setFromSpherical(target);

        var eye = getEyeVector(target);
        _this.object.position.copy(targetPos.clone().add(eye));

        if (_this.pitch < PITCHEPS)
            _this.pitch = PITCHEPS;
        var targetUp = targetPos.clone().normalize().multiplyScalar(eye.length() / Math.cos(_this.pitch / 180 * PI));
        _this.object.up = targetUp.sub(eye).normalize();

        _this.object.lookAt(targetPos);

        dispatchEvent('change');
        _this.needsUpdate = false;
    };

    // force an update at start
    this.needsUpdate = true;
    this.update();
};

EarthControls.prototype = Object.create(THREE.EventDispatcher.prototype);

export default EarthControls;