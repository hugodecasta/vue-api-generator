#!/usr/bin/env node

const fs = require('fs')
const inq = require('./inq_utils')
const is_git_dirty = require('is-git-dirty')
require('colors')

// ---- templates
const template_path = `${__dirname}/templates`
const templates = Object.fromEntries(fs.readdirSync(template_path)
    .map(name => [name.replace('.js', ''), fs.readFileSync(`${template_path}/${name}`, 'utf8')]))

// ---- text replacer
function replacer(data, file_text) {
    return file_text
        .replace(/( *)\/\*----(.*?)----\*\//gm, (_, before, data_name) => {
            before = (before ?? '').replace(/\n/g, '')
            const text_replacement = before + data[data_name].replace(/\n/gm, '\n' + before)
            return text_replacement
        })
        .replace(/ENV:(\w*)/g, (_, group) => {
            const env_str = `process.env.${group}`
            return `" + ${env_str} + "`
        })
        .replace(/"" ?\+ ?/g, '').replace(/ ?\+ ?""/g, '')
        .replace(/, ""/g, '')
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
    return Array.from(arguments).filter(e => e !== undefined).join('", "')
    return Array.from(arguments).filter(e => e != null).join('/').replace(/\/\//g, '/').replace(':/', '://')
}

function args_from_url(url) {
    const matches = url.matchAll(/:(\w*)/g)
    return Array.from(matches).map(m => m[1])
}

// ---- execution data
async function generate(configuration_arg, use_command_line = false, verbose = false) {

    const home_dir = process.cwd()


    // ---- configuration file
    const conf_arg_is_abs = configuration_arg?.[0] == '/'
    const configuration_path = conf_arg_is_abs ? configuration_arg : `${home_dir}/${configuration_arg ?? 'configuration.json'}`
    const configuration_file = fs.readFileSync(configuration_path)
    const configuration = JSON.parse(configuration_file)

    // ---- API name
    const { name: api_name = "api", is_fake } = configuration
    const api_filename = `${api_name}.js`

    if (verbose) inq.info(`Generating API ${api_name}`)

    // ---- credential file
    const { credentials_path: credentials_arg = null } = configuration
    const credentials_path = credentials_arg ? `${home_dir}/${credentials_arg}` : null
    const credentials = credentials_path ? fs.readFileSync(credentials_path, 'utf8') : 'null'

    // ---- check dirtyness
    const { vue_src_directory: src_arg = "./src" } = configuration
    const src_path = `${home_dir}/${src_arg}`
    const is_dirty = is_git_dirty(src_path)
    if (is_dirty && use_command_line)
        await inq.warn_and_proceed(
            "There are uncommitted changes in the current repository, it's recommended to commit or stash them first.")

    // ---- check vue main
    const vue_main_path = `${src_path}/main.js`
    let act_on_main = fs.existsSync(vue_main_path)
    if (!act_on_main && use_command_line)
        await inq.warn_and_proceed('vue main file is missing (you will have to manualy link the api).')

    // ---- check generating path
    const generation_dir = `${src_path}/plugins`
    if (!fs.existsSync(generation_dir)) {
        fs.mkdirSync(generation_dir, { recursive: true })
    }
    const generation_path = `${generation_dir}/${api_filename}`
    if (fs.existsSync(generation_path) && use_command_line)
        await inq.warn_and_override(`Plugin path for API ${api_name} already exist`)

    // ---- handlers
    function handle_credentials(credentials) {
        if (!credentials) return 'null'
        const { header_type, token_type, options } = credentials
        const args_to_add = []
        const header = {
            custom: () => options.header,
            Bearer: () => 'Authorization',
        }[header_type]()
        const pre_token = ({
            Bearer: () => '"Bearer " + ',
        }[header_type] ?? (() => ''))()
        const token = ({
            argument: () => { args_to_add.push(options.argument); return options.argument },
            cookie: () => `this.__get_cookies("${options.cookie_key}")`,
            absolute: () => `this.credentials["${options.cred_key}"]`,
            session: () => `sessionStorage.getItem("${options.cred_key}")`,
            local: () => `localStorage.getItem("${options.cred_key}")`,
            local_session: () => `(localStorage.getItem("${options.cred_key}") ?? sessionStorage.getItem("${options.cred_key}"))`,
        }[token_type] ?? (() => ''))()
        return { args_to_add, text: `{ "${header}": ${pre_token}${token} }` }
    }
    function handle_endpoint(api_name, endpoint_config) {
        const {
            name, url, method = 'GET', credentials, data_needed,
            default: def_arg, defaults = {}, data_format = 'json',
            fake_code, fake_response
        } = endpoint_config
        const args_array = args_from_url(url)
            .map(arg =>
                def_arg !== undefined || arg in defaults ? `${arg} = ${JSON.stringify(defaults[arg] ?? def_arg)}` : arg)
            .concat(data_needed ? ['data = null'] : [])
        const data = data_needed ? 'data' : 'null'
        const endpoint = ('"' + url.replace(/:(\w*)/g, (_, g, ender) => `" + ${g} + "`) + '"')
        const format = JSON.stringify(data_needed ? data_format : null)
        const { args_to_add = [], text: headers } = handle_credentials(credentials)
        args_array.unshift(...args_to_add)
        const args = args_array.join(', ')
        const text_data = {
            api_name,
            name,
            args,
            endpoint,
            method,
            data,
            format,
            fake_response: JSON.stringify(fake_response ?? {}),
            fake_code: JSON.stringify(fake_code ?? { status: 200 }),
            headers
        }
        const template = templates[(api_name ? 'endpoint' : 'endpoint_root') + (is_fake ? '_fake' : '')]
        const endpoint_text = replacer(text_data, template)
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
        const host = make_url(from_api?.full_host, given_host)
        api_config.full_host = host

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
        const api_data = { name: given_name, endpoints: merge_texts([endpoints_text, sub_apis_ret.externals]) }
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
    const api_replacer_data = { name: api_name, ...handle_apis(apis), credentials }
    if (!credentials_path && verbose) inq.info('no credentials detected')

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
            if (verbose) inq.info('api already imported in main.js')
        } else {
            const lines = main_file_text.split('\n')
            const last_import_line = lines.map((l, i) => ({ l, i })).filter(({ l }) => l.includes('import')).pop().i ?? 0
            lines.splice(last_import_line + 1, 0, main_import_text)
            const new_main_text = lines.join('\n')
            fs.writeFileSync(vue_main_path, new_main_text)
        }
    } else {
        if (verbose) inq.warning('main.js not updated')
    }

    if (verbose) inq.success(`API ${api_name} generated !\n`)

}

async function main() {
    try {
        await generate(...arguments)
    } catch (e) {
        inq.error(e.stack)
    }
}

if (require.main === module) {
    main(process.argv[2], true, true)
} else {
    module.exports = generate
}