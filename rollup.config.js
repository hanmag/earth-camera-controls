export default {
    input: 'index.js',
    indent: '\t',
    // sourceMap: true,
    output: [{
        format: 'umd',
        name: 'MapControls',
        file: 'build/map-camera-controls.js'
    }]
};