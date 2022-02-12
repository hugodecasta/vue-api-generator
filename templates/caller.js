async __/*----name----*/_api(endpoint, method, data, headers) {
    const options = { method }
    if (data) {
        headers['Content-type'] = 'application/json'
        options.body = JSON.stringify(data)
    }
    options.headers = header
    const url = [/*----host----*/, endpoint]
    const resp = await fetch(url, options)
    if (!resp.ok) throw new Error(`response error ${resp.status} calling ${url} "${resp.statusText}"`)
    const json = await resp.json()
    return json
}