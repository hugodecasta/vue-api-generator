async __/*----name----*/_api(endpoint, method, data, headers) {
    headers = headers ?? {}
    const options = { method, headers }
    if (data) {
        headers['Content-type'] = 'application/json'
        options.body = JSON.stringify(data)
    }
    const url = ["/*----host----*/", endpoint].join('/')
    const resp = await fetch(url, options)
    if (!resp.ok) throw new Error(`response error ${resp.status} calling ${url} "${resp.statusText}"`)
    if (resp.headers.get('content-type') == 'application/json') return await resp.json()
    return await resp.text()
}