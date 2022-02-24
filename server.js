const generator = require('./index')
const fs = require('fs')
const inq = require('./inq_utils')

module.exports = function (configuration_path, verbose = false) {
    if (verbose) inq.info('serving vue-api-generator on file', configuration_path)
    function re_generate() {
        generator(process.argv[2], false, verbose)
    }
    re_generate()
    fs.watchFile(configuration_path, re_generate)
}