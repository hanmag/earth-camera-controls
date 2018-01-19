export default {
    input: 'index.js',
    indent: '\t',
    external: ['three'],
    globals: {
        'three': 'THREE'
    },
    // sourceMap: true,
    output: [{
        format: 'umd',
        name: 'MapControls',
        file: 'build/map-camera-controls.js'
    }]
};