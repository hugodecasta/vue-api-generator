#!/usr/bin/env node

const fs = require('fs')
const inq = require('./inq_utils')
const is_git_dirty = require('is-git-dirty')
require('colors')

const home_dir = process.cwd()

// ---- API name
const api_name = (inq.arg_value('--api-name') ?? 'api').replace('.js', '')
const api_filename = `${api_name}.js`

// ---- configuration file
const configuration_arg = inq.arg_value('--config-path')
const configuration_path = `${home_dir}/${configuration_arg ?? 'configuration.json'}`
const configuration_file = fs.readFileSync(configuration_path)
const configuration = JSON.parse(configuration_file)

// ---- credential file
const credentials_arg = inq.arg_value('--creds-path')
const credentials_path = credentials_arg ? `${home_dir}/${credentials_arg}` : null
const credentials = credentials_path ? fs.readFileSync(credentials_path, 'utf8') : 'null'

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

function merge_texts(texts) {
    return merge_replace_data(texts.map(t => ({ t }))).t
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

    const src_path = `${home_dir}/${configuration.vue_src_directory}`

    inq.info(`Generating API ${api_name}`)

    // ---- check dirtyness
    const is_dirty = is_git_dirty(src_path)
    if (is_dirty)
        await inq.warn_and_proceed(
            "There are uncommitted changes in the current repository, it's recommended to commit or stash them first.")

    // ---- check vue main
    const vue_main_path = `${src_path}/main.js`
    let act_on_main = fs.existsSync(vue_main_path)
    if (!act_on_main)
        await inq.warn_and_proceed('vue main file is missing (you will have to manualy link the api).')

    // ---- check generating path
    const generation_dir = `${src_path}/plugins`
    if (!fs.existsSync(generation_dir)) {
        fs.mkdirSync(generation_dir, { recursive: true })
    }
    const generation_path = `${generation_dir}/${api_filename}`
    if (fs.existsSync(generation_path))
        await inq.warn_and_override(`Plugin path for API ${api_name} already exist`)

    // ---- handlers
    function handle_credentials(credentials) {
        if (!credentials) return 'null'
        const { header_type, token_type, options } = credentials
        const header = {
            custom: () => options.header,
            Bearer: () => 'Authorization',
        }[header_type]()
        const pre_token = ({
            Bearer: () => '"Bearer " + ',
        }[header_type] ?? (() => ''))()
        const token = ({
            cookie: () => `this.__get_cookies("${options.cookie_key}")`,
            absolute: () => `this.credentials["${options.cred_key}"]`
        }[token_type] ?? (() => ''))()
        return `{ "${header}": ${pre_token}${token} }`
    }
    function handle_endpoint(api_name, endpoint_config) {
        const { name, url, method = 'GET', credentials, data_needed } = endpoint_config
        const args = args_from_url(url).concat(data_needed ? ['data'] : []).join(', ')
        const data = data_needed ? 'data' : 'null'
        const endpoint = ('"' + url.replace(/:(.*?)(\/|$)/g, (_, g, ender) => `" + ${g} + "${ender}`) + '"')
            .replace(' + ""', '').replace('"" + ', '')
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
        return merge_texts(ep_replacers)
    }

    function handle_api(api_config, from_api = null) {
        const { name: given_name, host: given_host, endpoints, apis } = api_config
        const name = [from_api?.name, given_name].filter(e => e).join('_')
        console.log('generating api', `"${name}"...`)
        const host = make_url(from_api?.host, given_host)

        const has_endpoints = endpoints && Object.keys(endpoints).length > 0

        let ret = { callers: '', externals: '' }

        // -- handeling sub apis
        const sub_apis_ret = apis ? handle_apis(apis, api_config) : { callers: '', externals: '' }
        ret = merge_replace_data([ret, { callers: sub_apis_ret.callers }])

        // -- making callers
        const caller_data = { host, name }
        const caller_text = has_endpoints ? replacer(caller_data, templates.caller) : ''
        ret = merge_replace_data([ret, { callers: caller_text }])

        // -- making endpoints
        const endpoints_text = has_endpoints ? handle_endpoints(name, endpoints) ?? '' : ''
        const api_data = { name, endpoints: merge_texts([endpoints_text, sub_apis_ret.externals]) }
        const api_text = name ? replacer(api_data, from_api ? templates.api_sub : templates.api) : endpoints_text
        ret = merge_replace_data([ret, { externals: api_text }])

        return ret
    }

    function handle_apis(apis, from_api = null) {
        const api_replacers = Object.entries(apis).map(([name, config]) => handle_api({ name, ...config }, from_api))
        return merge_replace_data(api_replacers)
    }

    // ---- base data
    const { apis } = configuration
    const api_replacer_data = { ...handle_apis(apis), credentials }
    if (!credentials_path) inq.info('no credentials detected')

    // ---- save api text file
    console.log('generating API text...')
    const api_text_file = replacer(api_replacer_data, templates.main)
    fs.writeFileSync(generation_path, api_text_file)

    // ---- main adding
    if (act_on_main) {
        console.log('updating main.js ...')
        const main_file_text = fs.readFileSync(vue_main_path, 'utf8')
        const main_import_text = `import './plugins/${api_filename}'`
        const api_already_imported = main_file_text.includes(main_import_text)
        if (api_already_imported) {
            inq.info('api already imported in main.js')
        } else {
            const lines = main_file_text.split('\n')
            const last_import_line = lines.map((l, i) => ({ l, i })).filter(({ l }) => l.includes('import')).pop().i ?? 0
            lines.splice(last_import_line + 1, 0, main_import_text)
            const new_main_text = lines.join('\n')
            fs.writeFileSync(vue_main_path, new_main_text)
        }
    } else {
        inq.warning('main.js not updated')
    }

    inq.success(`API ${api_name} generated !\n`)

}

async function main() {
    try {
        await generate()
    } catch (e) {
        inq.error(e.stack)
    }
}
main()