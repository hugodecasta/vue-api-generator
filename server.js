const generator = require('./index')
const fs = require('fs')
const inq = require('./inq_utils')

module.exports = function (configuration_path, verbose = false) {
    if (verbose) inq.info('serving vue-api-generator on file', configuration_path)
    async function re_generate() {
        try {
            await generator(configuration_path, false, verbose)
        } catch (e) {
            if (verbose) inq.error(e)
        }
    }
    re_generate()
    fs.watchFile(configuration_path, re_generate)
}