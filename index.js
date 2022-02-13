#!/usr/bin/env node

const fs = require('fs')
const inq = require('./inq_utils')
const is_git_dirty = require('is-git-dirty')

// ---- configuration file
const configuration_path = `${__dirname}/${process.argv[2] ?? 'configuration.json'}`
const configuration_file = fs.readFileSync(configuration_path)
const configuration = JSON.parse(configuration_file)

// ---- template paths
const template_path = `${__dirname}/templates`
const template_sub_paths = {
    'main': `${template_path}/main.js`,
    'endpoint': `${template_path}/endpoint.js`,
    'caller': `${template_path}/caller.js`,
}

// ---- execution data
async function generate() {

    const src_path = `${__dirname}/${configuration.vue_src_directory}`

    // ---- check dirtyness
    const is_dirty = is_git_dirty(src_path)
    console.log(is_dirty)

    // ---- check vue main
    const vue_main = `${__dirname}/${configuration.vue_src_directory}/main.js`
    if (!fs.existsSync(vue_main)) {
        const proceed = await inq.create_yes_no_question(
            'vue main file is missing, proceed ? (you will have to manualy link the api)', false)
        if (!proceed) process.exit(1)
    }

    // ---- check generating path
    const generation_dir = `${__dirname}/${configuration.vue_src_directory}/plugins`
    if (!fs.existsSync(generation_dir)) {
        const generate = await inq.create_yes_no_question('generation directory does not exist, create ?', true)
        console.log(generate)
        if (generate) fs.mkdirSync(generation_dir, { recursive: true })
    }
    const generation_path = `${generation_dir}/api.js`

}

generate()