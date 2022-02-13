#!/usr/bin/env node

const fs = require('fs')
const inq = require('./inq_utils')
const is_git_dirty = require('is-git-dirty')
require('colors')

// ---- configuration file
const configuration_path = `${__dirname}/${process.argv[2] ?? 'configuration.json'}`
const configuration_file = fs.readFileSync(configuration_path)
const configuration = JSON.parse(configuration_file)

// ---- templates
const template_path = `${__dirname}/templates`
const templates = Object.fromEntries(fs.readdirSync(template_path)
    .map(name => [name.replace('.js', ''), fs.readFileSync(`${template_path}/${name}`, 'utf8')]))

// ---- text replacer
function replacer(data, file_text) {
    return file_text.replace(/( *)\/\*----(.*?)----\*\//gm, (_, before, data_name) => {
        before = (before ?? '').replace(/\n/g, '')
        const text_replacement = before + data[data_name].replace(/\n/gm, '\n' + before)
        return text_replacement
    })
}

// ---- replacers merger
function merge_replace_data(replacers) {
    return replacers.reduce((acc, cur) => {
        const data_names = Object.keys(cur)
        data_names.forEach(name => name in acc ? acc[name] += `\n${cur[name]}` : acc[name] = cur[name])
        return acc
    }, {})
}

function make_url() {
    return Array.from(arguments).filter(e => e != null).join('/').replace(/\/\//g, '/').replace(':/', '://')
}

function args_from_url(url) {
    const matches = url.matchAll(/:(.*?)(?:\/|$)/g)
    return Array.from(matches).map(m => m[1])
}

// ---- execution data
async function generate() {

    const src_path = `${__dirname}/${configuration.vue_src_directory}`

    // ---- check dirtyness
    const is_dirty = is_git_dirty(src_path)
    // if (is_dirty) {
    //     await inq.warn_and_proceed(
    //         "There are uncommitted changes in the current repository, it's recommended to commit or stash them first.")
    // }

    // ---- check vue main
    const vue_main = `${src_path}/main.js`
    if (!fs.existsSync(vue_main)) {
        await inq.warn_and_proceed('vue main file is missing (you will have to manualy link the api)')
    }

    // ---- check generating path
    const generation_dir = `${src_path}/plugins`
    if (!fs.existsSync(generation_dir)) {
        fs.mkdirSync(generation_dir, { recursive: true })
    }
    const generation_path = `${generation_dir}/api.js`

    // ---- handlers
    function handle_credentials(credentials) {
        if (!credentials) return 'null'
        const { header_type, token_type, options } = credentials
        console.log(header_type)
        const header = {
            custom: () => options.header,
            Bearer: () => 'Authorization',
        }[header_type]()
        const pre_token = ({
            Bearer: () => '"Bearer " + ',
        }[header_type] ?? (() => ''))()
        const token = ({
            cookie: () => `this.__get_cookies("${options.cookie_key}")`,
            absolute: () => `this.credentials["${options.token}"]`
        }[token_type] ?? (() => ''))()
        return `{ "${header}": ${pre_token}${token} }`
    }
    function handle_endpoint(api_name, endpoint_config) {
        const { name, url, method, credentials, data_needed } = endpoint_config
        const args = args_from_url(url).concat(data_needed ? ['data'] : []).join(', ')
        const data = data_needed ? 'data' : 'null'
        const endpoint = ('"' + url.replace(/:(.*?)(\/|$)/g, (_, g, ender) => `" + ${g} + "${ender}`) + '"')
            .replace(' + ""', '')
        const text_data = {
            api_name,
            name,
            args,
            endpoint,
            method,
            data,
            headers: handle_credentials(credentials)
        }
        const endpoint_text = replacer(text_data, api_name ? templates.endpoint : templates.endpoint_root)
        return endpoint_text
    }

    function handle_endpoints(api_name, endpoints) {
        const ep_replacers = Object.entries(endpoints).map(([name, config]) => handle_endpoint(api_name, { name, ...config }))
        return merge_replace_data(ep_replacers.map(ep => ({ ep }))).ep
    }

    function handle_api(api_config, from_api = null) {
        const { name: given_name, host: given_host, endpoints, apis } = api_config
        const name = [from_api?.name, given_name].filter(e => e).join('_')
        const host = make_url(from_api?.host, given_host)

        const has_endpoints = Object.keys(endpoints).length > 0

        let ret = { callers: '', externals: '' }

        // -- handeling sub apis
        if (apis) {
            const sub_apis_ret = handle_apis(apis, api_config)
            ret = merge_replace_data([ret, sub_apis_ret])
        }

        // -- making callers
        const caller_data = { host, name }
        const caller_text = has_endpoints ? replacer(caller_data, templates.caller) : ''
        ret = merge_replace_data([ret, { callers: caller_text }])

        // -- making endpoints
        const endpoints_text = handle_endpoints(name, endpoints) ?? ''
        const api_data = { name, endpoints: endpoints_text }
        const api_text = has_endpoints ? name ? replacer(api_data, templates.api) : endpoints_text : ''
        ret = merge_replace_data([ret, { externals: api_text }])

        return ret
    }

    function handle_apis(apis, from_api = null) {
        const api_replacers = Object.entries(apis).map(([name, config]) => handle_api({ name, ...config }, from_api))
        return merge_replace_data(api_replacers)
    }

    // ---- base data
    const { apis } = configuration
    const api_replacer_data = handle_apis(apis)

    // ---- save api text file
    const api_text_file = replacer(api_replacer_data, templates.main)
    fs.writeFileSync(generation_path, api_text_file)

}

generate()