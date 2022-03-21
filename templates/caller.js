async __/*----name----*/_api(endpoint, method, data, headers, data_format = 'json') {
    headers = headers ?? {}
    const options = { method, headers }
    if (data) {
        headers['Content-type'] = {
            'json': 'application/json',
            'text': 'text/plain'
        }[data_format] ?? data_format
        options.body = data_format == 'json' ? JSON.stringify(data) : data
    }
    const url = ["/*----host----*/", endpoint].join('/')
    const resp = await fetch(url, options)
    if (!resp.ok) throw new Error(`response error ${resp.status} calling ${url} "${resp.statusText}"`)
    if (resp.headers.get('content-type').includes('application/json')) return await resp.json()
    return await resp.text()
}