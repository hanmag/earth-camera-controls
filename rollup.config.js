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
        name: 'EarthControls',
        file: 'build/earth-camera-controls.js'
    }]
};